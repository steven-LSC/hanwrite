import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  ParaphraseResult,
  ParaphraseChangeInput,
  ParaphraseChange,
} from "@/lib/types";
import { RESPONSE_LANGUAGE, OPENAI_MODEL } from "@/lib/ai-config";

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

    // 生成 Native-like 風格的 system prompt
    const systemPrompt = `你是一個韓文學習助手，專門根據母語風格改寫韓文句子。

**任務：**
根據母語風格改寫給定的韓文句子，並以結構化格式回傳修改內容。

**風格指引：**
改成像母語者書寫出來的文章，加入母語者常用的語感，同時維持原文的意思。

**語體要求（嚴格遵守）：**
- **必須使用書面體（해라체/한다체）**，絕對不能使用口語體（例如：먹어요, 해요, 가요）
- 正確的書面體範例：먹는다, 한다, 간다, 먹었다, 했다, 갔다
- 如果原文是口語體，必須改為書面體（例如：사 먹어요 → 사 먹는다, 요리를 해요 → 요리를 한다）

**輸出格式：**
請以 JSON 物件格式回傳，結構如下：
{
  "changes": [
    {
      "original": "原始文字片段",
      "revised": "修改後的文字片段",
      "explanation": "簡短解釋（使用 ${RESPONSE_LANGUAGE}）",
      "insertAfter": "參考文字片段（僅新增時需要）"
    }
  ]
}

**重要規則：**
1. **語體檢查（最高優先級）**：所有 revised 內容必須是書面體，絕對不能使用口語體
2. 只列出需要修改的項目，不需要修改的不列出
3. 最多三個修改點（必須遵，不要超過三個）守
4. 所有解釋（explanation）必須使用 ${RESPONSE_LANGUAGE}
5. **關鍵：original 和 revised 必須只包含「實際被修改的最小文字單位」**
   - 如果是替換單詞，只提供該單詞（例如：original: "많이", revised: "자주"）
   - 如果是替換短語，只提供該短語（例如：original: "식비하고", revised: "식비랑"）
   - **絕對不要包含整個句子或過長的上下文**
   - 只提取並提供實際被修改的部分
5. 三種修改情況：
   - **替換**："original" 和 "revised" 都不為空，只需提供這兩個欄位（只包含被替換的詞或短語）
   - **刪除**："original" 不為空，"revised" 為空，只需提供 "original"（只包含被刪除的詞或短語）
   - **新增**："original" 為空，"revised" 不為空，必須提供 "insertAfter" 指定在哪個文字片段之後插入（只包含新增的內容）
6. changes 應按照在句子中出現的順序排列

**格式範例（不需要參考內容）：**
輸入："나는 바닷가를 걸으면서 파도를 구경했다."
輸出：
{
  "changes": [
    {
      "original": "나는",
      "revised": "",
      "explanation": "subject naturally omitted"
    },
    {
      "original": "",
      "revised": "한참 ",
      "insertAfter": "바닷가를",
      "explanation": "adds natural pacing and realism"
    }
  ]
}

**錯誤範例（不要這樣做）：**
❌ 錯誤：如果只將 "많이" 改為 "자주"，不要這樣寫：
{
  "original": "내가 많이 쓰는 소비 항목은",
  "revised": "내가 자주 쓰는 소비 항목은"
}
✅ 正確：應該這樣寫：
{
  "original": "많이",
  "revised": "자주"
}

請確保回傳的是有效的 JSON 格式，不要包含任何額外的文字或說明。`;

    // 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `請將以下韓文句子改寫為母語風格：\n\n${trimmedText}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
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
