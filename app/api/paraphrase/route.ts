import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  ParaphraseResult,
  ParaphraseChangeInput,
  ParaphraseChange,
} from "@/lib/types";
import { getResponseLanguage, AI_CONFIGS } from "@/lib/ai-config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 計算 Paraphrase 修改的位置
 * 根據字串匹配計算每個 change 的 position
 */
function calculatePositions(
  originalText: string,
  changes: ParaphraseChangeInput[]
): ParaphraseChange[] {
  const result: ParaphraseChange[] = [];
  let lastIndex = 0;

  for (const change of changes) {
    // 刪除或替換（original 不為空）
    if (change.original) {
      const index = originalText.indexOf(change.original, lastIndex);
      if (index !== -1) {
        result.push({
          position: {
            start: index,
            end: index + change.original.length,
          },
          original: change.original,
          revised: change.revised,
          explanation: change.explanation,
        });
        lastIndex = index + change.original.length;
      }
      // 找不到匹配，直接忽略該 change
    }
    // 新增（original 為空）
    else if (change.revised && change.insertAfter) {
      const index = originalText.indexOf(change.insertAfter, lastIndex);
      if (index !== -1) {
        const insertPosition = index + change.insertAfter.length;
        result.push({
          position: {
            start: insertPosition,
            end: insertPosition,
          },
          original: "",
          revised: change.revised,
          explanation: change.explanation,
        });
        lastIndex = insertPosition;
      }
      // 找不到匹配，直接忽略該 change
    }
    // 新增但沒有 insertAfter，忽略
  }

  return result;
}

/**
 * Paraphrase API Route
 * 接收使用者選取的句子，使用 OpenAI 進行改寫並回傳結構化結果
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { selectedText } = await request.json();

    // 從 cookie 讀取設定
    const authCookie = request.cookies.get("auth-user");
    const cookieValue = authCookie?.value || "{}";
    const responseLanguage = getResponseLanguage(cookieValue);
    const config = AI_CONFIGS.paraphrase;

    // 基本輸入驗證
    if (!selectedText || typeof selectedText !== "string") {
      const duration = Date.now() - startTime;
      console.log(`[Paraphrase] 輸入驗證失敗，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "請選擇一個完整的句子" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      const duration = Date.now() - startTime;
      console.log(`[Paraphrase] API key 未配置，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // 後端驗證邏輯：一次性檢查是否為一個完整的句子
    // 必須：以 . 結尾、開頭結尾不能有空白（中間可以有空格）、只能有一個 .（在結尾）
    const trimmedText = selectedText.trim();
    const isValidSentence =
      selectedText &&
      selectedText.length > 0 &&
      trimmedText.length === selectedText.length &&
      trimmedText.endsWith(".") &&
      trimmedText.match(/\./g)?.length === 1;

    if (!isValidSentence) {
      const duration = Date.now() - startTime;
      console.log(`[Paraphrase] 選取文字不符合要求，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "選取的文字必須是一個完整的句子，只能有一個句號且在結尾" },
        { status: 400 }
      );
    }

    // 使用配置檔的設定
    const systemPrompt = config.systemPrompt(responseLanguage);

    // 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `請將以下韓文句子改寫為母語風格：\n\n${trimmedText}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: config.temperature,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    console.log(`[Paraphrase] 回應內容: ${responseContent}`);

    // 解析 JSON 回應（LLM 只回傳 changes，不包含 position）
    let parsedResponse: { changes: ParaphraseChangeInput[] };
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", responseContent);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // 驗證回應格式
    if (!Array.isArray(parsedResponse.changes)) {
      throw new Error("Invalid response format from OpenAI");
    }

    // 如果超過三個修改點，只取前三個（作為備用保護）
    const changesInput =
      parsedResponse.changes.length > 3
        ? parsedResponse.changes.slice(0, 3)
        : parsedResponse.changes;

    // 後端計算位置
    const changesWithPosition = calculatePositions(trimmedText, changesInput);

    // 後端自己加上 originalText
    const result: ParaphraseResult = {
      originalText: trimmedText,
      changes: changesWithPosition,
    };

    const duration = Date.now() - startTime;
    console.log(`[Paraphrase] 改寫完成，耗時: ${duration}ms`);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Paraphrase API error:", error);

    if (error instanceof Error) {
      const duration = Date.now() - startTime;
      console.log(`[Paraphrase] 發生錯誤: ${error.message}，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[Paraphrase] 發生錯誤，耗時: ${duration}ms`);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
