import { GrammarPracticeResult } from "../types";

/**
 * 檢查文法練習答案
 * @param sentence 使用者輸入的句子
 * @param grammarName 語法名稱
 * @param explanation 語法解釋
 * @returns 檢查結果
 */
export async function checkGrammarPractice(
  sentence: string,
  grammarName: string,
  explanation: string
): Promise<GrammarPracticeResult> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 目前先都回傳正確結果（方便測試正確 UI）
  // 未來可以根據 grammarName 或 sentence 內容來決定回傳正確或錯誤

  return {
    isCorrect: true,
    userSentence: sentence,
  };
}
