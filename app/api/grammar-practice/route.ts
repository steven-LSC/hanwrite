import { NextRequest, NextResponse } from "next/server";
import { getResponseLanguage, AI_CONFIGS } from "@/lib/ai-config";
import OpenAI from "openai";
import https from "https";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 * 從 Bareun API 回應中取得第一個文法錯誤的原始韓文 comment
 */
function getFirstGrammarErrorComment(bareunData: BareunApiResponse): string | null {
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
    if (help && help.comment) {
      return cleanText(help.comment);
    }
  }

  return null;
}

/**
 * 使用 LLM 翻譯 explanation 並生成 corrective example
 */
async function generateCorrectionInfo(
  userSentence: string,
  koreanComment: string,
  responseLanguage: string
): Promise<{ detailedExplanation: string; correctiveExample: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const config = AI_CONFIGS["grammar-practice-correction"];
  const systemPrompt = config.systemPrompt(responseLanguage);

  const userPrompt = `使用者輸入的句子：
${userSentence}

錯誤的韓文解釋：
${koreanComment}`;

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

    return {
      detailedExplanation: cleanText(parsedResponse.detailedExplanation),
      correctiveExample: cleanText(parsedResponse.correctiveExample),
    };
  } catch (error) {
    console.error("[Grammar Practice] LLM generation failed:", error);
    throw error;
  }
}

/**
 * Grammar Practice API Route
 * 檢查使用者輸入的句子是否有文法錯誤
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { sentence } = await request.json();

    // 從 cookie 讀取設定
    const authCookie = request.cookies.get("auth-user");
    const cookieValue = authCookie?.value || "{}";
    const responseLanguage = getResponseLanguage(cookieValue);

    // 驗證輸入
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

    // 呼叫 Bareun API 檢查錯誤
    const requestBody = JSON.stringify({
      document: {
        content: sentence,
      },
    });

    const bareunData: BareunApiResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: "api.bareun.ai",
        path: "/bareun.RevisionService/CorrectError",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.BAREUN_API_KEY!,
          "Content-Length": Buffer.byteLength(requestBody),
        },
        rejectUnauthorized: process.env.NODE_ENV === "production",
      };

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsedData: BareunApiResponse = JSON.parse(data);
              resolve(parsedData);
            } catch (parseError) {
              console.error(`[Grammar Practice] 解析回應失敗:`, parseError);
              reject(new Error("Failed to parse Bareun API response"));
            }
          } else {
            console.error(`[Grammar Practice] Bareun API 錯誤: ${res.statusCode} - ${data}`);
            reject(new Error(`Bareun API error: ${res.statusCode}`));
          }
        });
      });

      req.on("error", (error) => {
        console.error(`[Grammar Practice] 請求錯誤:`, error);
        reject(error);
      });

      req.write(requestBody);
      req.end();
    });

    console.log(bareunData);
    
    // 檢查是否有文法錯誤
    const koreanComment = getFirstGrammarErrorComment(bareunData);

    if (!koreanComment) {
      // 沒有錯誤，回傳成功
      const duration = Date.now() - startTime;
      console.log(`[Grammar Practice] 檢查完成，沒有錯誤，耗時: ${duration}ms`);
      return NextResponse.json({
        isCorrect: true,
        userSentence: sentence,
        duration,
      });
    }

    // 有錯誤，使用 LLM 生成翻譯和 corrective example
    const { detailedExplanation, correctiveExample } = await generateCorrectionInfo(
      sentence,
      koreanComment,
      responseLanguage
    );

    const duration = Date.now() - startTime;
    console.log(`[Grammar Practice] 檢查完成，發現錯誤，耗時: ${duration}ms`);

    return NextResponse.json({
      isCorrect: false,
      userSentence: sentence,
      detailedExplanation,
      correctiveExample,
      duration,
    });
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
