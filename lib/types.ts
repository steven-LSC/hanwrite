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
      type: "vocab";
      content: Array<{ vocab: string; translate: string }>;
    }
  | {
      type: "grammar";
      content: { grammar: string; explanation: string };
    }
  | {
      type: "connective";
      content: Array<string>;
    }
  | {
      type: "example";
      content: string;
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

// Paraphrase 風格選項
export type ParaphraseStyle = "formal" | "natural" | "native-like";

// 單一修改項目
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
}

// Context Menu 狀態
export type ContextMenuStage =
  | "initial"
  | "expansion-hint"
  | "paraphrase-style" // 選擇風格階段
  | "paraphrase-result"; // 顯示結果階段

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
export interface GrammarError {
  grammarName: string; // 文法名稱
  originalError: string; // 原本的錯誤
  errorPosition: { start: number; end: number }; // 錯誤位置
  correctSentence: string; // 正確的句子
  explanation: string; // 解釋
  example: string; // 例句
}

export interface VocabError {
  correctWord: string; // 正確單字的名稱
  wrongWord: string; // 錯誤的單字
  errorPosition: { start: number; end: number }; // 錯誤位置
  translation: string; // 翻譯
  synonyms: string[]; // 同義詞
  relatedWords: string[]; // 相關詞
  antonyms: string[]; // 反義詞
  partOfSpeech: string; // 詞性
  example: string; // 例句
}

export type ErrorDetectionResult = Array<
  | { type: "grammar"; data: GrammarError }
  | { type: "vocab"; data: VocabError }
>;

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

export interface ToolState {
  currentTool: ToolType;
  "reverse-outlining": ReverseOutliningResult | null;
  "ai-analysis": ProficiencyReport | null;
  "error-detection-correction": ErrorDetectionResult | null;
  "expression-builder": ExpressionBuilderResult[] | null;
  "reference-panel": ReferencePanelData | null;
}

// Outline Generator 相關型別
export type OutlineSectionType = "introduction" | "body" | "conclusion";

export interface OutlineSection {
  type: OutlineSectionType;
  description: string; // 描述性指引（英文）
  keywordsOptions: string[]; // 關鍵字選項陣列
  exampleSentence: string; // 範例句子（韓文）
}

export interface OutlineData {
  title: string; // 心智圖名稱
  sections: Array<OutlineSection & { selectedKeywordIndex: number }>; // 包含使用者選擇的關鍵字索引
}
