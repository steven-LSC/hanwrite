import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ExpansionHint } from "@/lib/types";
import { getResponseLanguage, getOpenaiModel } from "@/lib/ai-config";

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
    const openaiModel = getOpenaiModel(cookieValue);

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

    // 生成 Expansion Hint 的 system prompt
    const systemPrompt = `你是一個韓文寫作助手，專門為學習者提供文章擴展建議。

**任務：**
根據使用者選取的韓文句子/段落，提供三個擴展建議，每個建議包含說明和一個韓文例句。

**目標：**
幫助學習者思考如何擴展文章內容，提供具體且實用的寫作方向。

**輸出格式：**
請以 JSON 物件格式回傳，結構如下：
{
  "hints": [
    {
      "explanation": "擴展建議說明（使用 ${responseLanguage}）",
      "example": "韓文例句（必須是完整的句子，以句號結尾）"
    }
  ]
}

**重要規則：**
1. 必須提供恰好三個擴展建議（hints 陣列必須包含三個元素）
2. 每個建議的 explanation 必須使用 ${responseLanguage}
3. 每個建議的 example 必須是完整的韓文句子，以句號結尾
4. 擴展建議應該：
   - 根據選取的句子/段落提供建議
   - 提供具體的寫作方向（例如：反思、比較、延伸、情感表達等）
   - 例句應該自然流暢，符合韓文寫作習慣
5. 三個建議應該從不同角度出發，避免重複

**格式範例：**
輸入："(句子/段落)"
輸出：
{
  "hints": [
    {
      "explanation": "${responseLanguage}的建議說明",
      "example": "(韓文例句)"
    },
    {
      "explanation": "${responseLanguage}的建議說明",
      "example": "(韓文例句)"
    },
    {
      "explanation": "${responseLanguage}的建議說明",
      "example": "(韓文例句)"
    }
  ]
}

請確保回傳的是有效的 JSON 格式，不要包含任何額外的文字或說明。`;

    // 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: openaiModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `請為以下韓文句子/段落提供三個擴展建議：\n\n${trimmedText}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
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
