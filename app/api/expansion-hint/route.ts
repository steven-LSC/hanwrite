import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ExpansionHint } from "@/lib/types";
import { getResponseLanguage, AI_CONFIGS } from "@/lib/ai-config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Expansion Hint API Route
 * 接收使用者選取的句子/段落，使用 OpenAI 提供擴展建議和例句
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { selectedText } = await request.json();

    // 從 cookie 讀取設定
    const authCookie = request.cookies.get("auth-user");
    const cookieValue = authCookie?.value || "{}";
    const responseLanguage = getResponseLanguage(cookieValue);
    const config = AI_CONFIGS["expansion-hint"];

    // 基本輸入驗證
    if (!selectedText || typeof selectedText !== "string") {
      const duration = Date.now() - startTime;
      console.log(`[Expansion Hint] 輸入驗證失敗，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "請選擇一個完整的句子或段落" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      const duration = Date.now() - startTime;
      console.log(`[Expansion Hint] API key 未配置，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // 後端驗證邏輯：檢查是否為一個完整的句子/段落
    // 必須：以 . 結尾、開頭結尾不能有空白（中間可以有空格）
    // 允許包含多個句號，只要以句號結尾即可
    const trimmedText = selectedText.trim();
    const isValidSentence =
      selectedText &&
      selectedText.length > 0 &&
      trimmedText.length === selectedText.length &&
      trimmedText.endsWith(".");

    if (!isValidSentence) {
      const duration = Date.now() - startTime;
      console.log(trimmedText);
      console.log(selectedText);
      console.log(`[Expansion Hint] 選取文字不符合要求，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: "選取的文字必須是一個完整的句子或段落，且以句號結尾" },
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
          content: `請為以下韓文句子/段落提供三個擴展建議：\n\n${trimmedText}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: config.temperature,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    console.log(`[Expansion Hint] 回應內容: ${responseContent}`);

    // 解析 JSON 回應
    let parsedResponse: { hints: ExpansionHint[] };
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", responseContent);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // 驗證回應格式
    if (!Array.isArray(parsedResponse.hints)) {
      throw new Error("Invalid response format from OpenAI");
    }

    // 確保恰好有三個 hints（如果超過，只取前三個；如果不足，補足）
    const hints =
      parsedResponse.hints.length >= 3
        ? parsedResponse.hints.slice(0, 3)
        : parsedResponse.hints;

    const duration = Date.now() - startTime;
    console.log(`[Expansion Hint] 擴展建議生成完成，耗時: ${duration}ms`);

    return NextResponse.json({ hints });
  } catch (error) {
    console.error("Expansion Hint API error:", error);

    if (error instanceof Error) {
      const duration = Date.now() - startTime;
      console.log(`[Expansion Hint] 發生錯誤: ${error.message}，耗時: ${duration}ms`);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`[Expansion Hint] 發生錯誤，耗時: ${duration}ms`);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
