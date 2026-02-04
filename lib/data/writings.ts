import {
  Writing,
  RecentWriting,
  ExpressionBuilderResult,
  ReverseOutliningResult,
  ProficiencyReport,
  ErrorDetectionResult,
  ToolState,
  GrammarErrorInput,
  VocabErrorInput,
} from "../types";

// 假資料：文章內容
const mockWritings: Record<string, Writing> = {
  "1": {
    id: "1",
    title: "부산 여행",
    content: `지난 여름방학에 나는 부모님과 동생과 함께 부산 여행을 다녀왔다. 오랜만에 가족이 모두 모여서 여행을 가게 되어 출발하기 전부터 설레는 마음이 가득했다. 부모님은 예전에 부산에 가 본 적이 있으셨지만, 나는 처음이라 더 기대가 컸다.

부산에 도착한 첫날 우리는 해운대를 찾았다. 해운대는 바다가 넓고 파도가 시원하게 밀려와서 산책하기에 아주 좋았다. 동생이랑 바닷가를 걸으면서 파도를 구경했다. 그 순간을 사진로 남겼다. 부모님도 우리 모습을 보며 즐거워하셨다. 해운대 근처에는 많은 사람들이 있었지만 바람이 시원해서 전혀 불편하지 않았다.

둘째 날에는 자갈치 시장에 갔다. 시장 안에는 다양한 해사물 가게들이 줄지어 있었고, 활기찬 분위기가 가득했다. 우리는 시장을 구경하면서 쇼핑을 하고, 신선한 회와 해산물을 맛보았다. 특히 부모님은 부산 특유의 음식 맛에 크게 만족하셨고, 나와 동생도 새로운 음식을 경험하면서 즐거운 시간을 보냈다.

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
    type: "vocab-grammar-example",
    vocab: [
      { vocab: "내년", translate: "next year" },
      { vocab: "부산", translate: "Busan" },
      { vocab: "방문하다", translate: "to visit" },
    ],
    grammar: {
      grammar: "V-고 싶다",
      explanation: "Expresses a desire to do an action.",
    },
    example: "내년에 부산을 방문하고 싶다.",
  },
  {
    type: "connective",
    content: ["그리고", "또한", "게다가"],
  },
  {
    type: "vocab-grammar-example",
    vocab: [
      { vocab: "한국어", translate: "Korean language" },
      { vocab: "열심히", translate: "diligently" },
      { vocab: "공부하다", translate: "to study" },
    ],
    grammar: {
      grammar: "V-기를 바라다",
      explanation: "Expresses hope or desire for doing something.",
    },
    example: "한국어를 열심히 공부하기를 바란다.",
  },
];

/**
 * 取得文章資料
 */
export async function getWriting(id: string): Promise<Writing> {
  const response = await fetch(`/api/writings/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Writing with id ${id} not found`);
    }
    throw new Error(`Failed to fetch writing: ${response.statusText}`);
  }

  const data = await response.json();
  const writing = data.writing;

  // 轉換日期字串為 Date 物件
  return {
    ...writing,
    createdAt: new Date(writing.createdAt),
    updatedAt: new Date(writing.updatedAt),
  };
}

/**
 * 取得最近的文章列表
 */
export async function getRecentWritings(): Promise<RecentWriting[]> {
  const response = await fetch("/api/writings");

  if (!response.ok) {
    throw new Error(`Failed to fetch recent writings: ${response.statusText}`);
  }

  const data = await response.json();
  const writings = data.writings || [];

  // 根據 updatedAt 降序排序（確保最新更新的在最上面）
  const sortedWritings = [...writings].sort((a, b) => {
    const dateA = new Date(a.updatedAt).getTime();
    const dateB = new Date(b.updatedAt).getTime();
    return dateB - dateA;
  });

  return sortedWritings.map((w) => ({
    id: w.id,
    title: w.title,
  }));
}

/**
 * 取得 Expression Builder 分析結果
 * 呼叫 AI API 分析韓文句子並回傳結構化結果
 */
export async function getExpressionBuilderResults(
  inputText: string
): Promise<{ results: ExpressionBuilderResult[]; duration?: number }> {
  const response = await fetch("/api/expression-builder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputText }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to analyze expression: ${response.statusText}`
    );
  }

  const data = await response.json();
  return { results: data.results || [], duration: data.duration };
}

/**
 * 建立新文章
 */
export async function createWriting(
  title: string,
  content: string
): Promise<string> {
  const response = await fetch("/api/writings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, content }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to create writing: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.writing.id;
}

/**
 * 更新文章
 */
export async function updateWriting(
  id: string,
  title: string,
  content: string
): Promise<void> {
  const response = await fetch(`/api/writings/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, content }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to update writing: ${response.statusText}`
    );
  }
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
 * 呼叫 AI API 分析段落並回傳結構化結果
 */
export async function getReverseOutliningResults(
  paragraphs: string[]
): Promise<{ results: ReverseOutliningResult; duration?: number }> {
  const response = await fetch("/api/reverse-outlining", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paragraphs }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to analyze reverse outline: ${response.statusText}`
    );
  }

  const data = await response.json();
  return { results: data.results || [], duration: data.duration };
}

/**
 * 取得 Proficiency Report 分析結果（薄抽象層）
 * 呼叫 AI API 分析韓語寫作文本並回傳結構化結果
 */
export async function getProficiencyReport(
  title: string,
  content: string
): Promise<{ results: ProficiencyReport; duration?: number }> {
  const response = await fetch("/api/proficiency-report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, content }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to generate proficiency report: ${response.statusText}`
    );
  }

  const data = await response.json();
  return { results: data.results || [], duration: data.duration };
}

/**
 * 取得 Error Detection & Correction 分析結果（薄抽象層）
 * 呼叫 AI API 分析韓語寫作文本並回傳結構化結果（不包含 errorPosition）
 */
export async function getErrorDetectionResults(
  content: string
): Promise<{ results: Array<{ type: "grammar"; data: GrammarErrorInput } | { type: "vocab"; data: VocabErrorInput }>; duration?: number }> {
  const response = await fetch("/api/error-detection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to detect errors: ${response.statusText}`
    );
  }

  const data = await response.json();
  // API 回傳的是不包含 errorPosition 的結果，前端需要計算位置
  return { results: data.results || [], duration: data.duration };
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
