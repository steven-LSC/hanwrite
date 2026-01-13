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
