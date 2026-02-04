import { NextRequest, NextResponse } from "next/server";
import { GrammarErrorInput, VocabErrorInput } from "@/lib/types";
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
 * 移除替換字元 (U+FFFD) 和其他無效的 Unicode 字元
 */
function cleanText(text: string): string {
  if (!text) return text;
  
  // 移除替換字元 (�) 和其他無效的 Unicode 字元
  return text
    .replace(/\uFFFD/g, '') // 移除替換字元
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // 移除控制字元
    .trim();
}

/**
 * 從 Bareun API 回應中解析文法錯誤
 */
function parseGrammarErrors(
  bareunData: BareunApiResponse
): Array<{ type: "grammar"; data: GrammarErrorInput }> {
  const results: Array<{ type: "grammar"; data: GrammarErrorInput }> = [];

  if (bareunData.revisedBlocks && Array.isArray(bareunData.revisedBlocks)) {
    for (const block of bareunData.revisedBlocks) {
      // 檢查是否有 revisions
      if (!block.revisions || block.revisions.length === 0) {
        continue;
      }

      const firstRevision = block.revisions[0];
      const helpId = firstRevision.helpId;
      const category = firstRevision.category;

      // 如果沒有 helpId，跳過這個錯誤
      if (!helpId) {
        console.log(`[Error Detection] 跳過沒有 helpId 的錯誤: ${block.origin.content}`);
        continue;
      }

      // 只處理 GRAMMER, STANDARD, SPACING 類別的錯誤
      if (category !== "GRAMMER" && category !== "STANDARD" && category !== "SPACING") {
        console.log(`[Error Detection] 跳過 category 為 ${category} 的錯誤: ${block.origin.content}`);
        continue;
      }

      // 從 helps 中取得說明
      const help = bareunData.helps?.[helpId];
      if (!help) {
        console.log(`[Error Detection] 找不到 helpId 對應的說明: ${helpId}`);
        // 即使沒有 help，也建立錯誤記錄，使用預設值
      }

      // 建立 GrammarErrorInput（不包含 example，將由 enhancement function 生成）
      // 清理亂碼字元
      const grammarError: GrammarErrorInput = {
        grammarName: cleanText(helpId), // 直接使用 helpId
        grammarError: cleanText(block.origin.content), // origin.content
        correctSentence: cleanText(firstRevision.revised), // revisions[0].revised
        explanation: cleanText(help?.comment || ""), // helps[helpId].comment
        example: "", // 將由 enhancement function 生成
      };

      // 驗證必要欄位
      if (
        grammarError.grammarError &&
        grammarError.correctSentence &&
        grammarError.grammarName
      ) {
        results.push({
          type: "grammar",
          data: grammarError,
        });
      } else {
        console.log(`[Error Detection] 跳過缺少必要欄位的錯誤:`, grammarError);
      }
    }
  }

  return results;
}

/**
 * 增強文法錯誤資訊
 * 使用 LLM 將 grammar title 轉換成好讀的文法名稱、翻譯 explanation，
 * 並根據正確文法和文章內容生成 in-context 例句
 */
async function enhanceGrammarErrors(
  grammarErrors: GrammarErrorInput[],
  content: string,
  responseLanguage: string
): Promise<GrammarErrorInput[]> {
  // 如果沒有錯誤，直接返回
  if (!grammarErrors || grammarErrors.length === 0) {
    return grammarErrors;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn("[Grammar Enhancement] OpenAI API key 未配置，跳過增強");
    return grammarErrors;
  }

  // 使用配置檔的設定
  const config = AI_CONFIGS["grammar-enhancement"];
  const systemPrompt = config.systemPrompt(responseLanguage);

  // 構建用戶輸入
  const errorsData = grammarErrors.map((error) => ({
    grammarName: error.grammarName,
    grammarError: error.grammarError,
    correctSentence: error.correctSentence,
    explanation: error.explanation,
  }));

  const userPrompt = `請處理以下文法錯誤：

文章內容：
${content}

文法錯誤列表：
${JSON.stringify(errorsData, null, 2)}`;

  try {
    // 呼叫 OpenAI API
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

    console.log(`[Grammar Enhancement] 回應內容: ${responseContent}`);

    // 解析 JSON 回應
    let parsedResponse: { errors: Array<{ grammarName: string; explanation: string; example: string }> };
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("[Grammar Enhancement] Failed to parse OpenAI response:", responseContent);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // 驗證回應格式
    if (!Array.isArray(parsedResponse.errors) || parsedResponse.errors.length !== grammarErrors.length) {
      throw new Error("Invalid response format: errors array length mismatch");
    }

    // 合併增強後的資料
    const enhancedErrors: GrammarErrorInput[] = grammarErrors.map((error, index) => {
      const enhanced = parsedResponse.errors[index];
      if (!enhanced) {
        console.warn(`[Grammar Enhancement] 缺少第 ${index} 個錯誤的增強資料，使用原始資料`);
        return {
          ...error,
          example: "", // 原本的 example 已經移除，這裡設為空字串
        };
      }

      return {
        ...error,
        grammarName: cleanText(enhanced.grammarName || error.grammarName),
        explanation: cleanText(enhanced.explanation || error.explanation),
        example: cleanText(enhanced.example || ""),
      };
    });

    return enhancedErrors;
  } catch (error) {
    console.error("[Grammar Enhancement] 發生錯誤:", error);
    // 如果增強失敗，返回原始錯誤（但 example 設為空字串）
    return grammarErrors.map((error) => ({
      ...error,
      example: "",
    }));
  }
}

/**
 * 檢查並增強單字拼寫錯誤資訊
 * 使用 LLM 檢查韓文文章中的單字拼寫錯誤，並根據詞性提供相關學習資訊
 */
async function enhanceVocabErrors(
  content: string,
  responseLanguage: string
): Promise<VocabErrorInput[]> {
  if (!content || !content.trim()) {
    return [];
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn("[Vocab Enhancement] OpenAI API key 未配置，跳過單字檢查");
    return [];
  }

  // 使用配置檔的設定
  const config = AI_CONFIGS["vocab-enhancement"];
  const systemPrompt = config.systemPrompt(responseLanguage);

  const userPrompt = `請檢查以下韓文文章中的單字拼寫錯誤：

文章內容：
${content}`;

  try {
    // 呼叫 OpenAI API
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

    console.log(`[Vocab Enhancement] 回應內容: ${responseContent}`);

    // 解析 JSON 回應
    let parsedResponse: { vocabErrors: VocabErrorInput[] };
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("[Vocab Enhancement] Failed to parse OpenAI response:", responseContent);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // 驗證回應格式
    if (!Array.isArray(parsedResponse.vocabErrors)) {
      throw new Error("Invalid response format: vocabErrors should be an array");
    }

    // 驗證每個錯誤的必要欄位
    const validatedErrors: VocabErrorInput[] = parsedResponse.vocabErrors
      .map((error, index) => {
        // 驗證必要欄位
        if (
          !error.vocabError ||
          !error.correctWord ||
          !error.partOfSpeech ||
          !error.translation ||
          !error.example ||
          !Array.isArray(error.synonyms)
        ) {
          console.warn(`[Vocab Enhancement] 第 ${index} 個錯誤缺少必要欄位，跳過`);
          return null;
        }

        // 根據詞性驗證特定欄位
        const partOfSpeech = error.partOfSpeech.toLowerCase();
        if (partOfSpeech === "noun") {
          if (!error.relatedWords || !Array.isArray(error.relatedWords)) {
            console.warn(`[Vocab Enhancement] 名詞錯誤缺少 relatedWords，跳過`);
            return null;
          }
          if (!error.imageSearchKeyword) {
            console.warn(`[Vocab Enhancement] 名詞錯誤缺少 imageSearchKeyword，跳過`);
            return null;
          }
        } else if (partOfSpeech === "verb") {
          if (!error.relatedWords || !Array.isArray(error.relatedWords)) {
            console.warn(`[Vocab Enhancement] 動詞錯誤缺少 relatedWords，跳過`);
            return null;
          }
        } else if (partOfSpeech === "adjective" || partOfSpeech === "adverb") {
          if (!error.antonyms || !Array.isArray(error.antonyms)) {
            console.warn(`[Vocab Enhancement] ${partOfSpeech} 錯誤缺少 antonyms，跳過`);
            return null;
          }
        }

        // 確保陣列長度不超過3
        const vocabError: VocabErrorInput = {
          vocabError: error.vocabError,
          correctWord: error.correctWord,
          partOfSpeech: error.partOfSpeech,
          translation: error.translation,
          example: error.example,
          synonyms: error.synonyms.slice(0, 3),
          relatedWords: error.relatedWords ? error.relatedWords.slice(0, 3) : undefined,
          antonyms: error.antonyms ? error.antonyms.slice(0, 3) : undefined,
          imageSearchKeyword: error.imageSearchKeyword,
        };

        return vocabError;
      })
      .filter((error): error is VocabErrorInput => error !== null);

    return validatedErrors;
  } catch (error) {
    console.error("[Vocab Enhancement] 發生錯誤:", error);
    // 如果檢查失敗，返回空陣列
    return [];
  }
}

/**
 * Error Detection API Route
 * 接收韓語寫作文本，使用 Bareun AI 分析錯誤並回傳結構化結果
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { content } = await request.json();

    // 從 cookie 讀取設定
    const authCookie = request.cookies.get("auth-user");
    const cookieValue = authCookie?.value || "{}";
    const responseLanguage = getResponseLanguage(cookieValue);

    // 驗證輸入
    if (!content || typeof content !== "string" || !content.trim()) {
      const duration = Date.now() - startTime;
      console.log(`[Error Detection] 輸入驗證失敗：內容無效，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "Invalid content" },
        { status: 400 }
      );
    }

    if (!process.env.BAREUN_API_KEY) {
      const duration = Date.now() - startTime;
      console.log(`[Error Detection] API key 未配置，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "Bareun API key not configured" },
        { status: 500 }
      );
    }

    // 使用 Node.js https 模組發送請求，處理 SSL 憑證問題
    const requestBody = JSON.stringify({
      document: {
        content: content,
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
        // 在開發環境中暫時放寬 SSL 驗證
        // 注意：生產環境應該使用正確的 CA 憑證
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
              console.error(`[Error Detection] 解析回應失敗:`, parseError);
              reject(new Error("Failed to parse Bareun API response"));
            }
          } else {
            console.error(`[Error Detection] Bareun API 錯誤: ${res.statusCode} - ${data}`);
            reject(new Error(`Bareun API error: ${res.statusCode}`));
          }
        });
      });

      req.on("error", (error) => {
        console.error(`[Error Detection] 請求錯誤:`, error);
        reject(error);
      });

      req.write(requestBody);
      req.end();
    });
    console.log(`[Error Detection] Bareun API 回應:`, JSON.stringify(bareunData, null, 2));

    // 解析文法錯誤
    const grammarResults = parseGrammarErrors(bareunData);

    // 提取文法錯誤資料進行增強（不需要先排序，最後會統一排序）
    const grammarErrorsToEnhance: GrammarErrorInput[] = grammarResults.map(
      (result) => result.data
    );

    // 使用 Promise.all 並行執行文法增強和單字檢查
    const [enhancedGrammarErrors, vocabErrors] = await Promise.all([
      enhanceGrammarErrors(
        grammarErrorsToEnhance,
        content,
        responseLanguage
      ).catch((error) => {
        console.error("[Error Detection] 文法增強失敗:", error);
        return grammarErrorsToEnhance.map((error) => ({
          ...error,
          example: "",
        }));
      }),
      enhanceVocabErrors(content, responseLanguage).catch((error) => {
        console.error("[Error Detection] 單字檢查失敗:", error);
        return [];
      }),
    ]);

    // 將增強後的文法錯誤轉換回原格式
    const enhancedGrammarResults = enhancedGrammarErrors.map((error) => ({
      type: "grammar" as const,
      data: error,
    }));

    // 將單字錯誤轉換為統一格式
    const vocabResults = vocabErrors.map((error) => ({
      type: "vocab" as const,
      data: error,
    }));

    // 合併所有錯誤
    const allResults = [...enhancedGrammarResults, ...vocabResults];

    // 統一排序：按照錯誤在文章中的出現順序
    const sortedAllResults = allResults.sort((a, b) => {
      // 取得錯誤文字
      const textA = a.type === "grammar" ? a.data.grammarError : a.data.vocabError;
      const textB = b.type === "grammar" ? b.data.grammarError : b.data.vocabError;

      // 找到錯誤文字在文章中的位置
      const indexA = content.indexOf(textA);
      const indexB = content.indexOf(textB);

      // 如果找不到，放在最後
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });

    const duration = Date.now() - startTime;
    console.log(
      `[Error Detection] 分析完成，找到 ${enhancedGrammarResults.length} 個文法錯誤和 ${vocabResults.length} 個單字錯誤，總計 ${sortedAllResults.length} 個錯誤，耗時: ${duration}ms`
    );

    return NextResponse.json({ results: sortedAllResults, duration });
  } catch (error) {
    console.error("Error Detection API error:", error);

    if (error instanceof Error) {
      const duration = Date.now() - startTime;
      console.log(`[Error Detection] 發生錯誤: ${error.message}，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[Error Detection] 發生錯誤，耗時: ${duration}ms`);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
