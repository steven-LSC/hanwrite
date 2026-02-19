import { type Node } from "@xyflow/react";

export interface IdeaPartnerCard {
  nodeId: string;
  title: string;
  description: string;
  example?: string;
  idea: string;
}

/**
 * 根據心智圖 nodes 產生 Idea Partner 卡片資料
 * 呼叫 AI API 分析哪些節點可以進一步展開，並產生引導問題
 */
export async function getIdeaPartnerCards(
  nodes: Node[],
  title?: string
): Promise<{ cards: IdeaPartnerCard[]; duration?: number }> {
  try {
    const response = await fetch("/api/idea-partner", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nodes,
        title,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to fetch idea partner cards");
    }

    const data = await response.json();
    const cards = data.cards || [];

    // 將 API 回傳的格式轉換成 IdeaPartnerCard 格式（加上 idea 欄位）
    const transformedCards = cards.map((card: { nodeId: string; title: string; description: string; example?: string }) => ({
      nodeId: card.nodeId,
      title: card.title,
      description: card.description,
      example: card.example ?? "",
      idea: "", // 使用者輸入，初始為空字串
    }));

    return { cards: transformedCards, duration: data.duration };
  } catch (error) {
    console.error("Failed to fetch idea partner cards:", error);
    throw error;
  }
}
