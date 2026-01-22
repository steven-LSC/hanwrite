import {
  ExpansionHint,
  ParaphraseResult,
} from "@/lib/types";

/**
 * 取得 Expansion Hints（真實 API 呼叫）
 */
export async function getExpansionHints(
  selectedText: string
): Promise<ExpansionHint[]> {
  try {
    const response = await fetch("/api/expansion-hint", {
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
      const error = new Error(errorData.error || "Failed to fetch expansion hints");
      // 如果是驗證錯誤（400），標記為預期錯誤，不需要 console.error
      if (response.status === 400) {
        (error as any).isValidationError = true;
      }
      throw error;
    }

    const result: { hints: ExpansionHint[] } = await response.json();
    return result.hints;
  } catch (error) {
    // 只有非驗證錯誤才記錄到 console
    if (!(error as any).isValidationError) {
      console.error("Failed to fetch expansion hints:", error);
    }
    throw error;
  }
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
