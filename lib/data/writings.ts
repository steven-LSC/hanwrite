import {
  Writing,
  RecentWriting,
  ExpressionBuilderResult,
  ReverseOutliningResult,
  ProficiencyReport,
  ToolState,
} from "../types";

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
    createdAt: new Date("2024-01-15T14:32:18"),
    updatedAt: new Date("2024-01-15T14:32:18"),
  },
  "2": {
    id: "2",
    title: "나의 첫 번째 마라톤 완주 도전과 준비",
    content: "",
    characterCount: 0,
    createdAt: new Date("2024-01-14T09:15:42"),
    updatedAt: new Date("2024-01-14T09:15:42"),
  },
  "3": {
    id: "3",
    title: "첫 직장 이야기",
    content: "",
    characterCount: 0,
    createdAt: new Date("2024-01-13T16:48:27"),
    updatedAt: new Date("2024-01-13T16:48:27"),
  },
  "4": {
    id: "4",
    title: "나의 아침 루틴",
    content: "",
    characterCount: 0,
    createdAt: new Date("2024-01-12T07:23:55"),
    updatedAt: new Date("2024-01-12T07:23:55"),
  },
  "5": {
    id: "5",
    title: "도쿄 야경",
    content: "",
    characterCount: 0,
    createdAt: new Date("2024-01-11T20:41:33"),
    updatedAt: new Date("2024-01-11T20:41:33"),
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

// ID 生成器（簡單遞增）
let nextId = 6;

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

/**
 * 建立新文章（薄抽象層）
 * 未來會改成真正的 API 呼叫
 */
export async function createWriting(
  title: string,
  content: string
): Promise<string> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 生成新 ID
  const newId = String(nextId++);
  const now = new Date();

  // 建立新文章
  const newWriting: Writing = {
    id: newId,
    title: title || "Untitled",
    content,
    characterCount: content.length,
    createdAt: now,
    updatedAt: now,
  };

  // 加入 mockWritings
  mockWritings[newId] = newWriting;

  // 加入 mockRecentWritings 最前面
  mockRecentWritings.unshift({
    id: newId,
    title: newWriting.title,
  });

  return newId;
}

/**
 * 更新文章（薄抽象層）
 * 未來會改成真正的 API 呼叫
 */
export async function updateWriting(
  id: string,
  title: string,
  content: string
): Promise<void> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 100));

  const writing = mockWritings[id];
  if (!writing) {
    throw new Error(`Writing with id ${id} not found`);
  }

  // 更新文章內容
  writing.title = title || "Untitled";
  writing.content = content;
  writing.characterCount = content.length;
  writing.updatedAt = new Date();

  // 注意：更新現有文章時不改變 Recents 列表的順序
  // 只有在新增文章時才會更新 Recents 列表
}

/**
 * 將文章內容分段（薄抽象層）
 * 依空行將內容分割成段落陣列
 */
export function splitContentIntoParagraphs(content: string): string[] {
  // 使用雙換行符號分割段落
  const paragraphs = content.split("\n\n");
  
  // 過濾空字串和只含空白字元的段落，並去除前後空白
  return paragraphs
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * 取得 Reverse Outlining 分析結果（薄抽象層）
 * 未來會改成真正的 AI API 呼叫
 */
export async function getReverseOutliningResults(
  paragraphs: string[]
): Promise<ReverseOutliningResult> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 假資料：為 id:1 的文章設計四段假資料
  const mockResults: ReverseOutliningResult = [
    {
      outline: "지난 여름방학에 가족과 함께 부산 여행을 갔다.",
      reasons: [
        "Original includes anticipation, family reunion, and first-time excitement.",
        "Outline shows only the main fact of going on a trip with family.",
      ],
    },
    {
      outline: "첫날 해운대에서 산책하며 즐거운 시간을 보냈다.",
      reasons: [
        "Original describes the beach scenery, walking with sibling, taking photos, and parents' joy.",
        "Outline summarizes the first day activity at Haeundae in a concise way.",
      ],
    },
    {
      outline: "둘째 날 자갈치 시장을 구경하고 음식을 맛보았다.",
      reasons: [
        "Original details the market atmosphere, shopping, and specific food experiences.",
        "Outline captures the essence of visiting Jagalchi Market and tasting food.",
      ],
    },
    {
      outline: "부산 여행은 가족에게 특별한 추억으로 남았다.",
      reasons: [
        "Original mentions specific memories like wave sounds, market atmosphere, and family laughter.",
        "Outline expresses the overall sentiment that the trip became a special memory.",
      ],
    },
  ];

  // 如果段落數量與假資料不同，則根據段落數量回傳對應的結果
  // 目前只處理 id:1 的文章（4段），其他情況回傳空陣列或重複使用假資料
  if (paragraphs.length === 4) {
    return mockResults;
  }

  // 其他情況：為每個段落產生基本的大綱和解釋
  return paragraphs.map((paragraph, index) => ({
    outline: paragraph.split(".")[0] + ".", // 簡單取第一句作為大綱
    reasons: [
      `Original paragraph ${index + 1} contains detailed information.`,
      `Outline summarizes the main point of paragraph ${index + 1}.`,
    ],
  }));
}

/**
 * 取得 Proficiency Report 分析結果（薄抽象層）
 * 未來會改成真正的 AI API 呼叫
 */
export async function getProficiencyReport(
  writingId: string
): Promise<ProficiencyReport> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 假資料：根據 Figma 設計的內容
  const mockReport: ProficiencyReport = [
    {
      category: "Content & Task Achievement",
      level: 5,
      description:
        "The content is complete and clearly conveys the travel experience with a coherent theme. However, some parts remain rather general. To reach the next level, try adding more vivid and specific descriptions to enhance realism.",
    },
    {
      category: "Organization & Coherence",
      level: 5,
      description:
        "The paragraph organization is clear and the overall flow is smooth. Yet, transition markers are still limited. Incorporating more discourse connectors can make the narrative more structured and cohesive.",
    },
    {
      category: "Language Use",
      level: 4,
      description:
        "Vocabulary and grammar are generally accurate and natural, showing fluent control of expression. However, sentence patterns remain repetitive. To improve, try using complex or varied sentence structures to enrich your writing style.",
    },
    {
      category: "Sociolinguistic Appropriateness",
      level: 3,
      description:
        "The tone is natural and appropriate for a personal narrative. Nonetheless, some expressions sound slightly conversational. Paying more attention to polite or formal sentence endings will make the text more suitable for academic writing contexts. The tone is natural and appropriate for a personal narrative. Nonetheless, some expressions sound slightly conversational. Paying more attention to polite or formal sentence endings will make the text more suitable for academic writing contextsThe tone is natural and appropriate for a personal narrative. Nonetheless, some expressions sound slightly conversational. Paying more attention to polite or formal sentence endings will make the text more suitable for academic writing contextsThe tone is natural and appropriate for a personal narrative. Nonetheless, some expressions sound slightly conversational. Paying more attention to polite or formal sentence endings will make the text more suitable for academic writing contexts The tone is natural and appropriate for a personal narrative. Nonetheless, some expressions sound slightly conversational. Paying more attention to polite or formal sentence endings will make the text more suitable for academic writing contextsThe tone is natural and appropriate for a personal narrative. Nonetheless, some expressions sound slightly conversational. Paying more attention to polite or formal sentence endings will make the text more suitable for academic writing contextsThe tone is natural and appropriate for a personal narrative. Nonetheless, some expressions sound slightly conversational. Paying more attention to polite or formal sentence endings will make the text more suitable for academic writing contextsThe tone is natural and appropriate for a personal narrative. Nonetheless, some expressions sound slightly conversational. Paying more attention to polite or formal sentence endings will make the text more suitable for academic writing contextsThe tone is natural and appropriate for a personal narrative. Nonetheless, some expressions sound slightly conversational. Paying more attention to polite or formal sentence endings will make the text more suitable for academic writing contextsThe tone is natural and appropriate for a personal narrative. Nonetheless, some expressions sound slightly conversational. Paying more attention to polite or formal sentence endings will make the text more suitable for academic writing contexts",
    },
  ];

  return mockReport;
}

/**
 * 儲存工具欄狀態（薄抽象層）
 * 未來會改成真正的 API 呼叫
 */
export async function saveToolPanelState(
  writingId: string,
  toolState: ToolState
): Promise<void> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 目前只是模擬儲存，未來會真正儲存到資料庫
  // 可以考慮使用 localStorage 作為暫時儲存
  if (typeof window !== "undefined") {
    localStorage.setItem(
      `toolState_${writingId}`,
      JSON.stringify(toolState)
    );
  }
}
