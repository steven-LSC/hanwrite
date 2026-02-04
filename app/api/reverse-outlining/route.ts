import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ReverseOutliningResult } from "@/lib/types";
import { getResponseLanguage, AI_CONFIGS } from "@/lib/ai-config";

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

    // 從 cookie 讀取設定
    const authCookie = request.cookies.get("auth-user");
    const cookieValue = authCookie?.value || "{}";
    const responseLanguage = getResponseLanguage(cookieValue);
    const config = AI_CONFIGS["reverse-outlining"];

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

    // 使用配置檔的設定
    const systemPrompt = config.systemPrompt(responseLanguage);

    // 構建 user message：將段落陣列格式化
    const paragraphsText = paragraphs
      .map((p, index) => `段落 ${index + 1}：\n${p}`)
      .join("\n\n");

    // 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `請為以下段落生成反向大綱：\n\n${paragraphsText}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: config.temperature,
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

    return NextResponse.json({ results, duration });
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
