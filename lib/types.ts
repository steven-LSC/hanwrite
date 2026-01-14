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
