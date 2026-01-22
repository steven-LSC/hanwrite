import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ReverseOutliningResult } from "@/lib/types";
import { RESPONSE_LANGUAGE, OPENAI_MODEL } from "@/lib/ai-config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Reverse Outlining API Route
 * 接收段落陣列，使用 OpenAI 為每個段落生成大綱和解釋
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { paragraphs } = await request.json();

    // 驗證輸入：確保 paragraphs 存在且是陣列
    if (!paragraphs || !Array.isArray(paragraphs)) {
      const duration = Date.now() - startTime;
      console.log(`[Reverse Outlining] 輸入驗證失敗：paragraphs 不是陣列，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "paragraphs 必須是一個陣列" },
        { status: 400 }
      );
    }

    // 驗證輸入：確保陣列不為空
    if (paragraphs.length === 0) {
      const duration = Date.now() - startTime;
      console.log(`[Reverse Outlining] 輸入驗證失敗：paragraphs 陣列為空，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "paragraphs 陣列不能為空" },
        { status: 400 }
      );
    }

    // 驗證每個段落都是字串
    if (!paragraphs.every((p) => typeof p === "string" && p.trim().length > 0)) {
      const duration = Date.now() - startTime;
      console.log(`[Reverse Outlining] 輸入驗證失敗：段落必須是非空字串，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "所有段落必須是非空字串" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      const duration = Date.now() - startTime;
      console.log(`[Reverse Outlining] API key 未配置，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // System prompt：使用繁體中文，說明任務和格式要求
    const systemPrompt = `你是一個韓文寫作分析助手，專門為文章段落生成反向大綱（reverse outline）。

**任務：**
為每個給定的韓文段落生成一個大綱和兩個解釋原因。

**輸出格式：**
請以 JSON 物件格式回傳，結構如下：
{
  "results": [
    {
      "outline": "段落大綱（必須是一句話）",
      "reasons": [
        "第一個原因：描述原本段落說了什麼（使用 ${RESPONSE_LANGUAGE}）",
        "第二個原因：說明為什麼決定這樣濃縮（使用 ${RESPONSE_LANGUAGE}）"
      ]
    }
  ]
}

**重要規則：**
1. **outline 必須是一句話**：每個段落的大綱必須濃縮成單一句話
2. **reasons 固定兩個元素**：
   - reasons[0]：描述原本段落的主要內容和細節（使用 ${RESPONSE_LANGUAGE}）
   - reasons[1]：說明為什麼決定這樣濃縮，解釋濃縮的邏輯和重點（使用 ${RESPONSE_LANGUAGE}）
3. 所有解釋文字必須使用 ${RESPONSE_LANGUAGE}
4. results 陣列的長度必須與輸入的段落數量相同
5. 每個段落對應一個結果物件

**格式範例（不包含實際內容）：**
輸入：段落陣列
輸出：
{
  "results": [
    {
      "outline": "(一句話的大綱)",
      "reasons": [
        "(描述原本段落說了什麼)",
        "(說明為什麼決定這樣濃縮)"
      ]
    }
  ]
}

請確保回傳的是有效的 JSON 格式，不要包含任何額外的文字或說明。`;

    // 構建 user message：將段落陣列格式化
    const paragraphsText = paragraphs
      .map((p, index) => `段落 ${index + 1}：\n${p}`)
      .join("\n\n");

    // 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `請為以下段落生成反向大綱：\n\n${paragraphsText}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    console.log(`[Reverse Outlining] 回應內容: ${responseContent}`);

    // 解析 JSON 回應
    let parsedResponse: { results?: ReverseOutliningResult };
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", responseContent);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // 驗證回應格式
    if (!parsedResponse.results || !Array.isArray(parsedResponse.results)) {
      throw new Error("Invalid response format: results must be an array");
    }

    const results = parsedResponse.results;

    // 驗證結果數量
    if (results.length !== paragraphs.length) {
      throw new Error(
        `Result count mismatch: expected ${paragraphs.length}, got ${results.length}`
      );
    }

    // 驗證每個結果的結構
    for (let i = 0; i < results.length; i++) {
      const item = results[i];
      if (!item.outline || typeof item.outline !== "string") {
        throw new Error(`Invalid outline at index ${i}`);
      }
      if (
        !item.reasons ||
        !Array.isArray(item.reasons) ||
        item.reasons.length !== 2
      ) {
        throw new Error(`Invalid reasons at index ${i}: must be array of 2 strings`);
      }
      if (
        typeof item.reasons[0] !== "string" ||
        typeof item.reasons[1] !== "string"
      ) {
        throw new Error(`Invalid reasons at index ${i}: must be strings`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Reverse Outlining] 分析完成，耗時: ${duration}ms`);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Reverse Outlining API error:", error);

    if (error instanceof Error) {
      const duration = Date.now() - startTime;
      console.log(`[Reverse Outlining] 發生錯誤: ${error.message}，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[Reverse Outlining] 發生錯誤，耗時: ${duration}ms`);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
