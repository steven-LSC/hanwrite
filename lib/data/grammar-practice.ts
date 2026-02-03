import { GrammarPracticeResult } from "../types";

/**
 * 檢查文法練習答案
 * @param sentence 使用者輸入的句子
 * @param grammarName 語法名稱（目前未使用，保留以維持 API 相容性）
 * @param explanation 語法解釋（目前未使用，保留以維持 API 相容性）
 * @returns 檢查結果
 */
export async function checkGrammarPractice(
  sentence: string,
  grammarName: string,
  explanation: string
): Promise<GrammarPracticeResult> {
  const response = await fetch("/api/grammar-practice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sentence }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to check grammar practice: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
}
