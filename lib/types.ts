// 文章資料
export interface Writing {
  id: string;
  title: string;
  content: string;
  characterCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Expression Builder 結果的區塊結構
export type ExpressionBuilderResult =
  | {
      type: "vocab-grammar-example";
      vocab: Array<{ vocab: string; translate: string }>;
      grammar: { grammar: string; explanation: string };
      example: string;
    }
  | {
      type: "connective";
      content: Array<string>;
    };

// 最近的文章（用於 Sidebar）
export interface RecentWriting {
  id: string;
  title: string;
}

// Expansion Hint 相關型別
export interface ExpansionHint {
  explanation: string; // 建議說明（英文）
  example: string; // 韓文例句
}

// LLM 回傳的中間型別（不包含 position）
export interface ParaphraseChangeInput {
  original: string; // 原本的文字（刪除時不為空，新增時為空）
  revised: string; // 修改後的文字（新增時不為空，刪除時為空）
  explanation: string; // 解釋
  insertAfter?: string; // 新增時使用：指定在哪個文字片段之後插入（可選）
}

// 單一修改項目（包含 position，由後端計算）
export interface ParaphraseChange {
  position: { start: number; end: number }; // 原句中的修改位置
  original: string; // 原本的文字
  revised: string; // 修改後的文字
  explanation: string; // 解釋（顯示在 checkbox 旁）
}

// Paraphrase 完整結果
export interface ParaphraseResult {
  originalText: string; // 原始句子
  changes: ParaphraseChange[]; // 所有修改項目
  noChange?: boolean; // 是否不需要修改
  message?: string; // 不需要修改時的訊息
}

// Context Menu 狀態
export type ContextMenuStage =
  | "initial"
  | "expansion-hint"
  | "expansion-hint-error" // 顯示錯誤階段
  | "paraphrase-result" // 顯示結果階段
  | "paraphrase-error"; // 顯示錯誤階段

// Reverse Outlining 相關型別
export interface ReverseOutliningItem {
  outline: string; // 段落大綱
  reasons: [string, string]; // 兩點解釋原因（固定兩點）
}

export type ReverseOutliningResult = ReverseOutliningItem[];

// Proficiency Report 相關型別
export interface ProficiencyReportItem {
  category: string; // 評估項目名稱
  level: number; // 等級 1-6
  description: string; // 描述文字
}

export type ProficiencyReport = ProficiencyReportItem[];

// Error Detection & Correction 相關型別

// API 回傳的中間型別（不包含 errorPosition）
export interface GrammarErrorInput {
  grammarName: string; // 文法名稱
  grammarError: string; // 錯誤文字（原 originalError）
  correctSentence: string; // 正確的句子
  explanation: string; // 解釋
  example: string; // 例句
}

export interface VocabErrorInput {
  correctWord: string; // 正確單字的名稱
  vocabError: string; // 錯誤文字（原 wrongWord）
  translation: string; // 翻譯
  partOfSpeech: string; // 詞性
  example: string; // 例句
  synonyms: string[]; // 同義詞（最多三個）
  relatedWords?: string[]; // 相關詞（最多三個，名詞和動詞必需，形容詞和副詞可選）
  antonyms?: string[]; // 反義詞（最多三個，僅形容詞和副詞）
  imageSearchKeyword?: string; // 圖片搜尋關鍵字（僅名詞需要）
}

// 前端使用的型別（包含 errorPosition）
export interface GrammarError {
  grammarName: string; // 文法名稱
  grammarError: string; // 錯誤文字（原 originalError）
  errorPosition: { start: number; end: number }; // 錯誤位置
  correctSentence: string; // 正確的句子
  explanation: string; // 解釋
  example: string; // 例句
}

export interface VocabError {
  correctWord: string; // 正確單字的名稱
  vocabError: string; // 錯誤文字（原 wrongWord）
  errorPosition: { start: number; end: number }; // 錯誤位置
  translation: string; // 翻譯
  synonyms: string[]; // 同義詞
  relatedWords?: string[]; // 相關詞（名詞和動詞必需，形容詞和副詞可選）
  antonyms?: string[]; // 反義詞（僅形容詞和副詞）
  partOfSpeech: string; // 詞性
  example: string; // 例句
  imageSearchKeyword?: string; // 圖片搜尋關鍵字（僅名詞需要）
}

export type ErrorDetectionResult = Array<
  | { type: "grammar"; data: GrammarError }
  | { type: "vocab"; data: VocabError }
>;

// Grammar Practice 相關型別
export interface GrammarPracticeResult {
  isCorrect: boolean; // 是否正確
  userSentence: string; // 使用者輸入的句子
  correctiveExample?: string; // 錯誤時的修正範例（僅錯誤時有）
  correctiveExampleHighlight?: string; // 需要 highlight 的關鍵文法文字（僅錯誤時有）
  detailedExplanation?: string; // 錯誤時的詳細解釋（僅錯誤時有）
  translationQuestion?: string; // 翻譯題目（使用 response language）
}

// Tool Panel 相關型別
export type ToolType =
  | "reference-panel"
  | "expression-builder"
  | "ai-analysis"
  | "reverse-outlining"
  | "usage";

export interface ReferencePanelData {
  mindmap: {
    id: string;
    title: string;
    nodes: any[];
  } | null;
  outline: OutlineData | null;
}

export interface ExpressionBuilderState {
  results: ExpressionBuilderResult[] | null;
  inputText: string;
}

export interface ToolState {
  currentTool: ToolType;
  "reverse-outlining": ReverseOutliningResult | null;
  "ai-analysis": ProficiencyReport | null;
  "error-detection-correction": ErrorDetectionResult | null;
  "expression-builder": ExpressionBuilderState | null;
  "reference-panel": ReferencePanelData | null;
}

// Outline Generator 相關型別
export type OutlineSectionType = "introduction" | "body" | "conclusion";

export interface OutlineSection {
  type: OutlineSectionType;
  description: string; // 描述性指引（英文），說明這個區塊應該往哪個方向寫
  exampleSentence: string; // 範例句子（韓文），必須包含心智圖上的節點內容
}

export interface OutlineData {
  title: string; // 心智圖名稱
  sections: OutlineSection[]; // 三個區塊：introduction、body、conclusion
}
