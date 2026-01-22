import {
  ExpansionHint,
  ParaphraseResult,
} from "@/lib/types";

/**
 * 取得 Expansion Hints（假資料）
 * 之後會替換成真實 API 呼叫
 */
export async function getExpansionHints(
  selectedText: string
): Promise<ExpansionHint[]> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 回傳三個假的 Expansion Hints
  return [
    {
      explanation:
        "You could expand by reflecting on what you learned or felt through this family trip, connecting it to your personal growth or family relationships.",
      example: "이번 여행을 통해 가족의 소중함을 다시 한 번 느끼게 되었다.",
    },
    {
      explanation:
        "You could add a paragraph comparing this trip with another travel experience or a place you want to visit next.",
      example: "다음에는 제주도에 가서 부산과는 또 다른 매력을 느껴 보고 싶다.",
    },
    {
      explanation:
        "You could finish with a cultural or emotional reflection, such as how the trip changed your view of Korea or travel itself.",
      example: "부산에서의 경험은 한국 문화에 대한 이해를 깊게 해 주었다.",
    },
  ];
}

/**
 * 取得 Paraphrase 結果（真實 API 呼叫）
 */
export async function getParaphraseResult(
  selectedText: string
): Promise<ParaphraseResult> {
  try {
    const response = await fetch("/api/paraphrase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        selectedText,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error || "Failed to fetch paraphrase result");
      // 如果是驗證錯誤（400），標記為預期錯誤，不需要 console.error
      if (response.status === 400) {
        (error as any).isValidationError = true;
      }
      throw error;
    }

    const result: ParaphraseResult = await response.json();
    return result;
  } catch (error) {
    // 只有非驗證錯誤才記錄到 console
    if (!(error as any).isValidationError) {
      console.error("Failed to fetch paraphrase result:", error);
    }
    throw error;
  }
}
