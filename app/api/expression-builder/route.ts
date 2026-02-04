import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ExpressionBuilderResult } from "@/lib/types";
import { getResponseLanguage, AI_CONFIGS } from "@/lib/ai-config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Expression Builder API Route
 * 接收使用者輸入的句子，使用 OpenAI 分析並回傳結構化結果
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { inputText } = await request.json();

    // 從 cookie 讀取設定
    const authCookie = request.cookies.get("auth-user");
    const cookieValue = authCookie?.value || "{}";
    const responseLanguage = getResponseLanguage(cookieValue);
    const config = AI_CONFIGS["expression-builder"];

    if (!inputText || typeof inputText !== "string" || !inputText.trim()) {
      const duration = Date.now() - startTime;
      console.log(`[Expression Builder] 輸入驗證失敗，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "Invalid input text" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      const duration = Date.now() - startTime;
      console.log(`[Expression Builder] API key 未配置，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // 使用配置檔的設定
    const systemPrompt = config.systemPrompt(responseLanguage);

    // 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `請分析以下句子：\n\n${inputText}` },
      ],
      response_format: { type: "json_object" },
      temperature: config.temperature,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    console.log(`[Expression Builder] 回應內容: ${responseContent}`);

    // 解析 JSON 回應
    let parsedResponse: { results?: ExpressionBuilderResult[] };
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", responseContent);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // 驗證並回傳結果
    const results = parsedResponse.results || [];

    // 基本驗證：確保結果符合 ExpressionBuilderResult 格式
    if (!Array.isArray(results)) {
      throw new Error("Results must be an array");
    }

    const duration = Date.now() - startTime;
    console.log(`[Expression Builder] 分析完成，耗時: ${duration}ms`);

    return NextResponse.json({ results, duration });
  } catch (error) {
    console.error("Expression Builder API error:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[Expression Builder] 發生錯誤，耗時: ${duration}ms`);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
