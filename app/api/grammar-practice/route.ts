import { NextRequest, NextResponse } from "next/server";
import { getResponseLanguage, AI_CONFIGS } from "@/lib/ai-config";
import OpenAI from "openai";
import https from "node:https";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 強制使用 Node.js runtime，確保可使用 node:https 客製 TLS 設定
export const runtime = "nodejs";

async function callBareunApi(
  content: string,
  apiKey: string
): Promise<BareunApiResponse> {
  return requestBareunApi(content, apiKey);
}

function requestBareunApi(
  content: string,
  apiKey: string
): Promise<BareunApiResponse> {
  const requestBody = JSON.stringify({
    document: { content },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: "https:",
        hostname: "api.bareun.ai",
        path: "/bareun.RevisionService/CorrectError",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
          "Content-Length": Buffer.byteLength(requestBody),
        },
        rejectUnauthorized: false,
      },
      (res) => {
        let responseText = "";
        res.setEncoding("utf8");

        res.on("data", (chunk) => {
          responseText += chunk;
        });

        res.on("end", () => {
          const statusCode = res.statusCode ?? 500;
          if (statusCode < 200 || statusCode >= 300) {
            reject(
              new Error(
                `Bareun API error: ${statusCode} - ${
                  responseText || "No response body"
                }`
              )
            );
            return;
          }

          try {
            const parsed = JSON.parse(responseText) as BareunApiResponse;
            resolve(parsed);
          } catch {
            reject(new Error("Bareun API response is not valid JSON"));
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("Bareun API request timed out"));
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * Bareun API 回應型別
 */
interface BareunRevisedBlock {
  origin: {
    content: string;
    beginOffset: number;
    length: number;
  };
  revised: string;
  revisions: Array<{
    revised: string;
    score: number;
    category: string;
    helpId: string;
  }>;
  nested: any[];
  lemma: string;
  pos: string;
}

interface BareunHelp {
  id: string;
  category: string;
  comment: string;
  examples: string[];
  ruleArticle: string;
}

interface BareunApiResponse {
  origin: string;
  revised: string;
  revisedBlocks: BareunRevisedBlock[];
  whitespaceCleanupRanges: any[];
  revisedSentences: Array<{
    origin: string;
    revised: string;
  }>;
  helps: Record<string, BareunHelp>;
  language: string;
  tokensCount: number;
}

/**
 * 清理文字中的亂碼字元
 */
function cleanText(text: string): string {
  if (!text) return text;
  
  return text
    .replace(/\uFFFD/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .trim();
}

/**
 * 從 Bareun API 回應中取得第一個文法錯誤的完整資訊
 * 用於當使用者錯誤與目標文法無關時，以實際錯誤產生 corrective example
 */
function getFirstGrammarErrorInfo(bareunData: BareunApiResponse): {
  grammarError: string;
  correctSentence: string;
  explanation: string;
  helpId: string | null;
} | null {
  if (!bareunData.revisedBlocks || !Array.isArray(bareunData.revisedBlocks)) {
    return null;
  }

  for (const block of bareunData.revisedBlocks) {
    if (!block.revisions || block.revisions.length === 0) {
      continue;
    }

    const firstRevision = block.revisions[0];
    const helpId = firstRevision.helpId;
    const category = firstRevision.category;

    if (!helpId) {
      continue;
    }

    // 只處理 GRAMMER, STANDARD, SPACING 類別的錯誤
    if (category !== "GRAMMER" && category !== "STANDARD" && category !== "SPACING") {
      continue;
    }

    const help = bareunData.helps?.[helpId];
    if (!help || !help.comment) {
      continue;
    }

    return {
      grammarError: cleanText(block.origin?.content ?? block.revised ?? ""),
      correctSentence: cleanText(block.revised ?? ""),
      explanation: cleanText(help.comment),
      helpId,
    };
  }

  return null;
}

/**
 * 使用 LLM 生成翻譯題目
 */
async function generateTranslationQuestion(
  grammarName: string,
  grammarError: string,
  correctSentence: string,
  explanation: string,
  responseLanguage: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const config = AI_CONFIGS["grammar-practice-translation-question"];
  const systemPrompt = config.systemPrompt(responseLanguage);

  const userPrompt = `文法名稱：${grammarName}
原本的錯誤：${grammarError}
正確的寫法：${correctSentence}
解釋：${explanation}`;

  try {
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: config.temperature,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    const parsedResponse = JSON.parse(responseContent);
    
    if (!parsedResponse.translationQuestion) {
      throw new Error("Invalid response format");
    }

    return cleanText(parsedResponse.translationQuestion);
  } catch (error) {
    console.error("[Grammar Practice] Translation question generation failed:", error);
    throw error;
  }
}

/**
 * 使用 LLM 翻譯 explanation 並生成 corrective example
 */
async function generateCorrectionInfo(
  userSentence: string,
  grammarName: string,
  grammarError: string,
  correctSentence: string,
  explanation: string,
  responseLanguage: string
): Promise<{ 
  detailedExplanation: string; 
  correctiveExample: string;
  correctiveExampleHighlight?: string;
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const config = AI_CONFIGS["grammar-practice-correction"];
  const systemPrompt = config.systemPrompt(responseLanguage);

  const userPrompt = `使用者輸入的句子：
${userSentence}

文法名稱：${grammarName}
原始錯誤：${grammarError}
正確寫法：${correctSentence}
錯誤的韓文解釋：
${explanation}`;

  try {
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: config.temperature,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    const parsedResponse = JSON.parse(responseContent);
    
    if (!parsedResponse.detailedExplanation || !parsedResponse.correctiveExample) {
      throw new Error("Invalid response format");
    }

    const result: {
      detailedExplanation: string;
      correctiveExample: string;
      correctiveExampleHighlight?: string;
    } = {
      detailedExplanation: cleanText(parsedResponse.detailedExplanation),
      correctiveExample: cleanText(parsedResponse.correctiveExample),
    };

    // 如果有 highlight 資訊，驗證並加入
    if (parsedResponse.correctiveExampleHighlight) {
      const highlightText = cleanText(parsedResponse.correctiveExampleHighlight);
      // 驗證 highlight 文字是否在 correctiveExample 中存在
      if (highlightText && result.correctiveExample.includes(highlightText)) {
        result.correctiveExampleHighlight = highlightText;
      }
    }

    return result;
  } catch (error) {
    console.error("[Grammar Practice] LLM generation failed:", error);
    throw error;
  }
}

/**
 * Grammar Practice API Route
 * 檢查使用者輸入的句子是否有文法錯誤，或生成翻譯題目
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { 
      sentence, 
      generateQuestion, 
      grammarName, 
      grammarError, 
      correctSentence, 
      explanation 
    } = await request.json();

    // 從 cookie 讀取設定
    const authCookie = request.cookies.get("auth-user");
    const cookieValue = authCookie?.value || "{}";
    const responseLanguage = getResponseLanguage(cookieValue);

    // 如果是生成翻譯題目
    if (generateQuestion === true) {
      if (!grammarName || !grammarError || !correctSentence || !explanation) {
        const duration = Date.now() - startTime;
        console.log(`[Grammar Practice] 生成題目失敗：缺少必要參數，耗時: ${duration}ms`);
        return NextResponse.json(
          { error: "Missing required parameters for question generation" },
          { status: 400 }
        );
      }

      try {
        const translationQuestion = await generateTranslationQuestion(
          grammarName,
          grammarError,
          correctSentence,
          explanation,
          responseLanguage
        );

        const duration = Date.now() - startTime;
        console.log(`[Grammar Practice] 翻譯題目生成完成，耗時: ${duration}ms`);

        return NextResponse.json({
          translationQuestion,
          duration,
        });
      } catch (error) {
        console.error("[Grammar Practice] 生成翻譯題目失敗:", error);
        const duration = Date.now() - startTime;
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Failed to generate translation question" },
          { status: 500 }
        );
      }
    }

    // 驗證輸入（檢查句子時）
    if (!sentence || typeof sentence !== "string" || !sentence.trim()) {
      const duration = Date.now() - startTime;
      console.log(`[Grammar Practice] 輸入驗證失敗：內容無效，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "Invalid sentence" },
        { status: 400 }
      );
    }

    if (!process.env.BAREUN_API_KEY) {
      const duration = Date.now() - startTime;
      console.log(`[Grammar Practice] API key 未配置，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "Bareun API key not configured" },
        { status: 500 }
      );
    }

    let bareunData: BareunApiResponse;
    try {
      bareunData = await callBareunApi(sentence, process.env.BAREUN_API_KEY!);
    } catch (error) {
      console.error("[Grammar Practice][Stage: bareun-api] 呼叫失敗:", error);
      throw error;
    }

    // 檢查是否有文法錯誤
    const bareunErrorInfo = getFirstGrammarErrorInfo(bareunData);

    if (!bareunErrorInfo) {
      // 沒有錯誤，回傳成功
      const duration = Date.now() - startTime;
      console.log(`[Grammar Practice] 檢查完成，沒有錯誤，耗時: ${duration}ms`);
      return NextResponse.json({
        isCorrect: true,
        userSentence: sentence,
        duration,
      });
    }

    // 有錯誤，使用 LLM 生成 corrective example 和 explanation
    // 重要：一律使用 Bareun 偵測到的「實際錯誤」來產生回饋，而非目標文法
    // 這樣當使用者犯的錯與練習目標無關時（例如練 으로/로 卻寫錯 을/를），
    // 回饋會針對實際錯誤，而非錯誤地給出目標文法的範例
    const { detailedExplanation, correctiveExample, correctiveExampleHighlight } = await generateCorrectionInfo(
      sentence,
      bareunErrorInfo.helpId || "", // 可選，供 LLM 參考
      bareunErrorInfo.grammarError,
      bareunErrorInfo.correctSentence,
      bareunErrorInfo.explanation,
      responseLanguage
    );

    const duration = Date.now() - startTime;
    console.log(`[Grammar Practice] 檢查完成，發現錯誤，耗時: ${duration}ms`);

    const response: any = {
      isCorrect: false,
      userSentence: sentence,
      detailedExplanation,
      correctiveExample,
      duration,
    };

    // 如果有 highlight 資訊，加入回應
    if (correctiveExampleHighlight) {
      response.correctiveExampleHighlight = correctiveExampleHighlight;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Grammar Practice API error:", error);

    if (error instanceof Error) {
      const duration = Date.now() - startTime;
      console.log(`[Grammar Practice] 發生錯誤: ${error.message}，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[Grammar Practice] 發生錯誤，耗時: ${duration}ms`);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
