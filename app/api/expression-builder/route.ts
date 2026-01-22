import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ExpressionBuilderResult } from "@/lib/types";
import { getResponseLanguage, getOpenaiModel } from "@/lib/ai-config";

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
    const openaiModel = getOpenaiModel(cookieValue);

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

    // System prompt：固定指令，說明任務要求
    const systemPrompt = `你是一個韓文學習助手，專門分析韓文句子並提供結構化的學習內容。

**重要：這是一個學習工具**
你的目標是讓使用者能夠根據你回傳的暗示（詞彙、文法、連接詞）來組出完整的句子。因此，你需要將句子拆解成學習單元，讓使用者能夠逐步理解並組裝。

**分析原則：**
1. **子句結構分析**：仔細分析句子的子句結構
   - 如果句子有 N 個子句，就需要回傳 N 張 "vocab-grammar-example" 卡片
   - 每張卡片對應一個子句，包含該子句的詞彙、文法和範例句子
   - 如果子句之間有連接詞，需要在適當位置插入 "connective" 卡片

2. **卡片順序**：
   - 按照句子中出現的順序排列卡片
   - 例如：如果句子是「子句1 + 連接詞 + 子句2」，則回傳順序為：
     - vocab-grammar-example（子句1）
     - connective（連接詞）
     - vocab-grammar-example（子句2）

**回傳格式：**
請以 JSON 物件格式回傳，包含一個 "results" 鍵，值為結果陣列。結果陣列包含兩種類型的卡片：

1. **vocab-grammar-example** 類型（合併卡片）：
   - 包含該子句的重要詞彙、主要文法點和範例句子
   - 格式：
     {
       "type": "vocab-grammar-example",
       "vocab": [
         {"vocab": "韓文單字", "translate": "${responseLanguage}翻譯"}
       ],
       "grammar": {
         "grammar": "文法名稱",
         "explanation": "${responseLanguage}解釋"
       },
       "example": "範例句子（韓文）"
     }

2. **connective** 類型（連接詞卡片）：
   - 包含連接子句的連接詞或連接語
   - 格式：
     {
       "type": "connective",
       "content": ["連接詞1", "連接詞2"]
     }

**語言設定：**
所有翻譯和解釋都應該使用 ${responseLanguage}。

**語體要求（嚴格遵守）：**
- **必須使用書面體（해라체/한다체）**，絕對不能使用口語體（例如：먹어요, 해요, 가요）
- 正確的書面體範例：먹는다, 한다, 간다, 먹었다, 했다, 갔다
- 所有文法解釋中的例句和 example 欄位中的範例句子都必須是書面體

**範例（兩個子句的句子）：**
如果輸入句子是「내년에 부산을 방문하고 싶다. 그리고 한국어를 열심히 공부하기를 바란다.」
應該回傳：
{
  "results": [
    {
      "type": "vocab-grammar-example",
      "vocab": [
        {"vocab": "내년", "translate": "next year"},
        {"vocab": "부산", "translate": "Busan"},
        {"vocab": "방문하다", "translate": "to visit"}
      ],
      "grammar": {
        "grammar": "V-고 싶다",
        "explanation": "Expresses a desire to do an action."
      },
      "example": "내년에 부산을 방문하고 싶다."
    },
    {
      "type": "connective",
      "content": ["그리고"]
    },
    {
      "type": "vocab-grammar-example",
      "vocab": [
        {"vocab": "한국어", "translate": "Korean language"},
        {"vocab": "열심히", "translate": "diligently"},
        {"vocab": "공부하다", "translate": "to study"}
      ],
      "grammar": {
        "grammar": "V-기를 바라다",
        "explanation": "Expresses hope or desire for doing something."
      },
      "example": "한국어를 열심히 공부하기를 바란다."
    }
  ]
}

請確保回傳的是有效的 JSON 格式，不要包含任何額外的文字或說明。`;

    // 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: openaiModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `請分析以下句子：\n\n${inputText}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
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

    return NextResponse.json({ results });
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
