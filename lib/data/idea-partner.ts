import { type Node } from "@xyflow/react";

export interface IdeaPartnerCard {
  nodeId: string;
  title: string;
  description: string;
  idea: string;
}

/**
 * 根據心智圖 nodes 產生 Idea Partner 卡片資料（薄抽象層）
 * 未來會改成真正的 AI API 呼叫
 */
export async function getIdeaPartnerCards(
  nodes: Node[]
): Promise<IdeaPartnerCard[]> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 200));

  // 定義要查找的 nodeId 和對應的預設資料
  const cardConfigs = [
    {
      nodeId: "idea-photo",
      defaultTitle: "사진 찍기",
      description: "Try describing what appeared in the photo you took.",
    },
    {
      nodeId: "idea-walk",
      defaultTitle: "산책",
      description: "Describe a memorable walk you had during your Busan trip.",
    },
    {
      nodeId: "idea-market",
      defaultTitle: "자갈치 시장",
      description:
        "What was the most interesting thing you saw at Jagalchi Market?",
    },
  ];

  // 根據 nodes 產生卡片
  const cards: IdeaPartnerCard[] = cardConfigs.map((config) => {
    // 在 nodes 中尋找對應的 node
    const node = nodes.find((n) => n.id === config.nodeId);
    
    // 如果 node 存在，使用 node 的 label 作為 title；否則使用預設 title
    const title = node?.data?.label || config.defaultTitle;

    return {
      nodeId: config.nodeId,
      title,
      description: config.description,
      idea: "",
    };
  });

  return cards;
}
