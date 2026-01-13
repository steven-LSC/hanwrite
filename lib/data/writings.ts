import { Writing, RecentWriting, ExpressionBuilderResult } from "../types";

// 假資料：文章內容
const mockWritings: Record<string, Writing> = {
  "1": {
    id: "1",
    title: "부산 여행",
    content: `지난 여름방학에 나는 부모님과 동생과 함께 부산 여행을 다녀왔다. 오랜만에 가족이 모두 모여서 여행을 가게 되어 출발하기 전부터 설레는 마음이 가득했다. 부모님은 예전에 부산에 가 본 적이 있으셨지만, 나는 처음이라 더 기대가 컸다.

부산에 도착한 첫날 우리는 해운대를 찾았다. 해운대는 바다가 넓고 파도가 시원하게 밀려와서 산책하기에 아주 좋았다. 동생이랑 바닷가를 걸으면서 파도를 구경했다. 그 순간을 사진으로 남겼다. 부모님도 우리 모습을 보며 즐거워하셨다. 해운대 근처에는 많은 사람들이 있었지만 바람이 시원해서 전혀 불편하지 않았다.

둘째 날에는 자갈치 시장에 갔다. 시장 안에는 다양한 해산물 가게들이 줄지어 있었고, 활기찬 분위기가 가득했다. 우리는 시장을 구경하면서 쇼핑을 하고, 신선한 회와 해산물을 맛보았다. 특히 부모님은 부산 특유의 음식 맛에 크게 만족하셨고, 나와 동생도 새로운 음식을 경험하면서 즐거운 시간을 보냈다.

이번 부산 여행은 가족 모두에게 특별한 추억이 되었다. 해운대의 파도 소리, 시장의 활기찬 분위기, 그리고 가족과 함께한 웃음이 아직도 마음속에 선명하다. 비록 짧은 시간이었지만, 부산에서의 경험은 오래도록 기억에 남을 것 같다.`,
    characterCount: 603,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
};

// 假資料：最近的文章列表
const mockRecentWritings: RecentWriting[] = [
  { id: "1", title: "부산 여행" },
  { id: "2", title: "나의 첫 번째 마라톤 완주 도전과 준비" },
  { id: "3", title: "첫 직장 이야기" },
  { id: "4", title: "나의 아침 루틴" },
  { id: "5", title: "도쿄 야경" },
];

// 假資料：Expression Builder 結果
const mockExpressionBuilderResults: ExpressionBuilderResult[] = [
  {
    type: "vocab",
    content: [
      { vocab: "내년", translate: "next year" },
      { vocab: "부산", translate: "Busan" },
      { vocab: "방문하다", translate: "to visit" },
    ],
  },
  {
    type: "grammar",
    content: {
      grammar: "V-고 싶다",
      explanation: "Expresses a desire to do an action.",
    },
  },
  {
    type: "example",
    content: "내년에 부산을 방문하고 싶다.",
  },
  {
    type: "connective",
    content: ["그리고", "또한", "게다가"],
  },
  {
    type: "vocab",
    content: [
      { vocab: "한국어", translate: "Korean language" },
      { vocab: "열심히", translate: "diligently" },
      { vocab: "공부하다", translate: "to study" },
    ],
  },
  {
    type: "grammar",
    content: {
      grammar: "V-기를 바라다",
      explanation: "Expresses hope or desire for doing something.",
    },
  },
  {
    type: "example",
    content: "한국어를 열심히 공부하기를 바란다.",
  },
];

/**
 * 取得文章資料（薄抽象層）
 * 未來會改成真正的 API 呼叫
 */
export async function getWriting(id: string): Promise<Writing> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  const writing = mockWritings[id];
  if (!writing) {
    throw new Error(`Writing with id ${id} not found`);
  }
  
  return writing;
}

/**
 * 取得最近的文章列表（薄抽象層）
 * 未來會改成真正的 API 呼叫
 */
export async function getRecentWritings(): Promise<RecentWriting[]> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  return mockRecentWritings;
}

/**
 * 取得 Expression Builder 分析結果（薄抽象層）
 * 未來會改成真正的 AI API 呼叫
 */
export async function getExpressionBuilderResults(
  inputText: string
): Promise<ExpressionBuilderResult[]> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // 目前回傳假資料，未來會根據 inputText 呼叫 AI API
  return mockExpressionBuilderResults;
}
