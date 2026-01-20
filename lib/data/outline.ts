import { type Node } from "@xyflow/react";
import { OutlineData, OutlineSection } from "@/lib/types";

/**
 * 從 mindmap 生成 outline（薄抽象層）
 * 未來會改成真正的 AI API 呼叫
 */
export async function generateOutline(
  title: string,
  nodes: Node[]
): Promise<OutlineData> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock 資料：根據 Figma 設計
  const mockSections: OutlineSection[] = [
    {
      type: "introduction",
      description:
        "Describe who went on the trip, when it happened, and why you decided to go.",
      keywordsOptions: [
        "부모님, 동생, 부산 여행",
        "가족, 여름방학, 휴식",
        "부산, 여행, 계획",
      ],
      exampleSentences: [
        "나는 부모님과 동생과 함께 여름방학에 휴식을 위해 부산 여행을 떠났다.",
        "가족과 함께 여름방학 동안 휴식을 취하기로 결정했다.",
        "부산 여행을 계획하며 기대감이 높아졌다.",
      ],
    },
    {
      type: "body",
      description:
        "Describe what you did during the trip, what you saw, and how you felt.",
      keywordsOptions: [
        "해운대, 산책, 파도",
        "자갈치 시장, 쇼핑",
        "사진 찍기, 해운대, 파도",
      ],
      exampleSentences: [
        "해운대에서 산책을 하며 파도를 바라보니 마음이 편안해졌다.",
        "자갈치 시장에서 신선한 해산물을 쇼핑하며 즐거운 시간을 보냈다.",
        "해운대 해변에서 파도를 배경으로 사진을 찍으며 추억을 남겼다.",
      ],
    },
    {
      type: "conclusion",
      description:
        "Summarize what you learned or how the trip changed your feelings.",
      keywordsOptions: [
        "부산 여행, 부모님, 동생",
        "추억, 가족, 행복",
        "여행, 성장, 감사",
      ],
      exampleSentences: [
        "부산 여행을 통해 부모님과 동생과의 관계가 더욱 가까워졌음을 느꼈다.",
        "이번 여행으로 가족과 함께 만든 추억이 행복한 기억으로 남았다.",
        "여행을 통해 성장할 수 있었고, 가족에 대한 감사함을 다시 한 번 느꼈다.",
      ],
    },
  ];

  // 將 sections 轉換為 OutlineData，預設 selectedKeywordIndex 為 0
  const outlineData: OutlineData = {
    title,
    sections: mockSections.map((section) => ({
      ...section,
      selectedKeywordIndex: 0,
    })),
  };

  return outlineData;
}

/**
 * 儲存 outline 到資料庫（薄抽象層）
 * 未來會改成真正的 API 呼叫
 */
export async function saveOutline(
  mapId: string,
  outline: OutlineData
): Promise<void> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 目前使用 localStorage 作為暫時儲存
  if (typeof window !== "undefined") {
    localStorage.setItem(`outline_${mapId}`, JSON.stringify(outline));
  }
}

/**
 * 取得已儲存的 outline（薄抽象層）
 * 未來會改成真正的 API 呼叫
 */
export async function getSavedOutline(
  mapId: string
): Promise<OutlineData | null> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 50));

  // 從 localStorage 讀取
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(`outline_${mapId}`);
    if (saved) {
      try {
        return JSON.parse(saved) as OutlineData;
      } catch (error) {
        console.error("Failed to parse saved outline:", error);
        return null;
      }
    }
  }

  // 假資料：為 "busan-travel" 提供預設 outline
  if (mapId === "busan-travel") {
    const mockOutline: OutlineData = {
      title: "부산 여행",
      sections: [
        {
          type: "introduction",
          description:
            "Describe who went on the trip, when it happened, and why you decided to go.",
          keywordsOptions: [
            "부모님, 동생, 부산 여행",
            "가족, 여름방학, 휴식",
            "부산, 여행, 계획",
          ],
          selectedKeywordIndex: 0,
          exampleSentences: [
            "나는 부모님과 동생과 함께 여름방학에 휴식을 위해 부산 여행을 떠났다.",
            "가족과 함께 여름방학 동안 휴식을 취하기로 결정했다.",
            "부산 여행을 계획하며 기대감이 높아졌다.",
          ],
        },
        {
          type: "body",
          description:
            "Describe what you did during the trip, what you saw, and how you felt.",
          keywordsOptions: [
            "해운대, 산책, 파도",
            "자갈치 시장, 쇼핑",
            "사진 찍기, 해운대, 파도",
          ],
          selectedKeywordIndex: 1,
          exampleSentences: [
            "해운대에서 산책을 하며 파도를 바라보니 마음이 편안해졌다.",
            "자갈치 시장에서 신선한 해산물을 쇼핑하며 즐거운 시간을 보냈다.",
            "해운대 해변에서 파도를 배경으로 사진을 찍으며 추억을 남겼다.",
          ],
        },
        {
          type: "conclusion",
          description:
            "Summarize what you learned or how the trip changed your feelings.",
          keywordsOptions: [
            "부산 여행, 부모님, 동생",
            "추억, 가족, 행복",
            "여행, 성장, 감사",
          ],
          selectedKeywordIndex: 0,
          exampleSentences: [
            "부산 여행을 통해 부모님과 동생과의 관계가 더욱 가까워졌음을 느꼈다.",
            "이번 여행으로 가족과 함께 만든 추억이 행복한 기억으로 남았다.",
            "여행을 통해 성장할 수 있었고, 가족에 대한 감사함을 다시 한 번 느꼈다.",
          ],
        },
      ],
    };
    return mockOutline;
  }

  return null;
}
