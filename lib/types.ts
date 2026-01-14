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

// Paraphrase 相關型別（之後使用）
export interface Paraphrase {
  text: string;
}

// Context Menu 狀態
export type ContextMenuStage = "initial" | "expansion-hint" | "paraphrase";
