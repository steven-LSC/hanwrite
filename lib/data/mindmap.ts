import { type Node } from "@xyflow/react";
import { type MindmapData } from "@/components/brainstorm/use-mindmap-data";

/**
 * 取得使用者的所有心智圖（薄抽象層）
 * 未來會改成真正的 API 呼叫
 */
export async function getAllMindmaps(): Promise<MindmapData[]> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 200));

  // 假資料：包含韓文標題的心智圖
  const mockMindmaps: MindmapData[] = [
    {
      id: "busan-travel",
      title: "부산 여행",
      nodes: [
        {
          id: "root-busan",
          position: { x: 0, y: 0 },
          data: { label: "부산 여행", parentId: null },
        },
        {
          id: "busan-1",
          position: { x: 200, y: -50 },
          data: { label: "동행", parentId: "root-busan", direction: "right" },
        },
        {
          id: "busan-2",
          position: { x: 200, y: 0 },
          data: { label: "활동", parentId: "root-busan", direction: "right" },
        },
        {
          id: "busan-3",
          position: { x: 200, y: 50 },
          data: { label: "장소", parentId: "root-busan", direction: "right" },
        },
        {
          id: "busan-1-1",
          position: { x: 400, y: -75 },
          data: { label: "모님", parentId: "busan-1", direction: "right" },
        },
        {
          id: "busan-1-2",
          position: { x: 400, y: -25 },
          data: { label: "동생", parentId: "busan-1", direction: "right" },
        },
        {
          id: "busan-2-1",
          position: { x: 400, y: -25 },
          data: { label: "산책", parentId: "busan-2", direction: "right" },
        },
        {
          id: "busan-2-2",
          position: { x: 400, y: 25 },
          data: { label: "쇼핑", parentId: "busan-2", direction: "right" },
        },
        {
          id: "busan-2-3",
          position: { x: 400, y: 75 },
          data: { label: "사진", parentId: "busan-2", direction: "right" },
        },
        {
          id: "busan-3-1",
          position: { x: 400, y: 25 },
          data: { label: "해운대", parentId: "busan-3", direction: "right" },
        },
        {
          id: "busan-3-2",
          position: { x: 400, y: 75 },
          data: {
            label: "자갈치 시장",
            parentId: "busan-3",
            direction: "right",
          },
        },
      ],
    },
    {
      id: "seoul-travel",
      title: "서울 여행",
      nodes: [
        {
          id: "root-seoul",
          position: { x: 0, y: 0 },
          data: { label: "서울 여행", parentId: null },
        },
        {
          id: "seoul-left-1",
          position: { x: -200, y: -25 },
          data: { label: "계획", parentId: "root-seoul", direction: "left" },
        },
        {
          id: "seoul-left-2",
          position: { x: -200, y: 25 },
          data: { label: "준비물", parentId: "root-seoul", direction: "left" },
        },
        {
          id: "seoul-1",
          position: { x: 200, y: -25 },
          data: { label: "명소", parentId: "root-seoul", direction: "right" },
        },
        {
          id: "seoul-2",
          position: { x: 200, y: 25 },
          data: { label: "음식", parentId: "root-seoul", direction: "right" },
        },
      ],
    },
    {
      id: "dream",
      title: "꿈",
      nodes: [
        {
          id: "root-dream",
          position: { x: 0, y: 0 },
          data: { label: "꿈", parentId: null },
        },
        {
          id: "dream-left-1",
          position: { x: -200, y: 0 },
          data: { label: "현재", parentId: "root-dream", direction: "left" },
        },
        {
          id: "dream-1",
          position: { x: 200, y: -25 },
          data: { label: "직업", parentId: "root-dream", direction: "right" },
        },
        {
          id: "dream-2",
          position: { x: 200, y: 25 },
          data: { label: "목표", parentId: "root-dream", direction: "right" },
        },
      ],
    },
    {
      id: "family",
      title: "가족",
      nodes: [
        {
          id: "root-family",
          position: { x: 0, y: 0 },
          data: { label: "가족", parentId: null },
        },
        {
          id: "family-1",
          position: { x: 200, y: -25 },
          data: { label: "부모님", parentId: "root-family", direction: "right" },
        },
        {
          id: "family-2",
          position: { x: 200, y: 25 },
          data: { label: "형제", parentId: "root-family", direction: "right" },
        },
      ],
    },
    {
      id: "school-life",
      title: "학교생활",
      nodes: [
        {
          id: "root-school",
          position: { x: 0, y: 0 },
          data: { label: "학교생활", parentId: null },
        },
        {
          id: "school-1",
          position: { x: 200, y: -25 },
          data: { label: "수업", parentId: "root-school", direction: "right" },
        },
        {
          id: "school-2",
          position: { x: 200, y: 25 },
          data: { label: "친구", parentId: "root-school", direction: "right" },
        },
      ],
    },
  ];

  return mockMindmaps;
}
