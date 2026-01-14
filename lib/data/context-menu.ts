import {
  ExpansionHint,
  ParaphraseResult,
  ParaphraseStyle,
} from "@/lib/types";

/**
 * 取得 Expansion Hints（假資料）
 * 之後會替換成真實 API 呼叫
 */
export async function getExpansionHints(
  selectedText: string
): Promise<ExpansionHint[]> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 300));

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
 * 取得 Paraphrase 結果（假資料）
 * 之後會替換成真實 API 呼叫
 */
export async function getParaphraseResult(
  selectedText: string,
  style: ParaphraseStyle
): Promise<ParaphraseResult> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 根據不同風格回傳不同的假資料
  const mockResults: Record<ParaphraseStyle, ParaphraseResult> = {
    formal: {
      originalText: selectedText,
      changes: [
        {
          position: { start: 0, end: 3 },
          original: "나는",
          revised: "저는",
          explanation: "formal first-person pronoun",
        },
        {
          position: { start: 10, end: 14 },
          original: "바닷가",
          revised: "해변",
          explanation: "more formal term for beach",
        },
        {
          position: { start: 18, end: 22 },
          original: "걸으면서",
          revised: "산책하면서",
          explanation: "formal expression for walking",
        },
      ],
    },
    natural: {
      originalText: selectedText,
      changes: [
        {
          position: { start: 10, end: 13 },
          original: "함께",
          revised: "같이",
          explanation: "more natural everyday term",
        },
        {
          position: { start: 18, end: 20 },
          original: "한참",
          revised: "오래",
          explanation: "adds natural pacing",
        },
        {
          position: { start: 28, end: 32 },
          original: "바라보았다",
          revised: "구경했다",
          explanation: "more conversational verb",
        },
      ],
    },
    "native-like": {
      originalText: selectedText,
      changes: [
        {
          position: { start: 0, end: 3 },
          original: "나는",
          revised: "",
          explanation: "subject naturally omitted",
        },
        {
          position: { start: 18, end: 18 },
          original: "",
          revised: "한참 ",
          explanation: "adds natural pacing and realism",
        },
        {
          position: { start: 28, end: 32 },
          original: "감상했고",
          revised: "바라보았다",
          explanation: "more native-like verb choice",
        },
      ],
    },
  };

  return mockResults[style];
}
