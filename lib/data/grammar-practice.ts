import { GrammarPracticeResult } from "../types";

/**
 * 生成翻譯題目
 * @param grammarName 文法名稱
 * @param grammarError 原本的錯誤
 * @param correctSentence 正確的寫法
 * @param explanation 解釋
 * @returns 翻譯題目
 */
export async function generateTranslationQuestion(
  grammarName: string,
  grammarError: string,
  correctSentence: string,
  explanation: string
): Promise<{ translationQuestion: string; duration?: number }> {
  const response = await fetch("/api/grammar-practice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      generateQuestion: true,
      grammarName,
      grammarError,
      correctSentence,
      explanation,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to generate translation question: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data;
}

/**
 * 檢查文法練習答案
 * @param sentence 使用者輸入的句子
 * @param grammarName 語法名稱
 * @param grammarError 原本的錯誤
 * @param correctSentence 正確的寫法
 * @param explanation 語法解釋
 * @returns 檢查結果
 */
export async function checkGrammarPractice(
  sentence: string,
  grammarName: string,
  grammarError: string,
  correctSentence: string,
  explanation: string
): Promise<GrammarPracticeResult & { duration?: number }> {
  const response = await fetch("/api/grammar-practice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sentence,
      grammarName,
      grammarError,
      correctSentence,
      explanation,
    }),
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
