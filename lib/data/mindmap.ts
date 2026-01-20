import { type Node } from "@xyflow/react";
import {
  type MindmapData,
  type MindmapMetadata,
} from "@/components/brainstorm/use-mindmap-data";

// 完整的假資料（包含 nodes）
const MOCK_MINDMAPS_DATA: MindmapData[] = [
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
      // Idea Partner 的三個 title 節點
      {
        id: "idea-photo",
        position: { x: 200, y: 100 },
        data: {
          label: "사진 찍기",
          parentId: "root-busan",
          direction: "right",
        },
      },
      {
        id: "idea-walk",
        position: { x: -200, y: 0 },
        data: {
          label: "산책",
          parentId: "root-busan",
          direction: "left",
        },
      },
      {
        id: "idea-market",
        position: { x: -200, y: 50 },
        data: {
          label: "자갈치 시장",
          parentId: "root-busan",
          direction: "left",
        },
      },
      // 模擬 title 重複的情況：另一個 "산책" 節點（但 nodeId 不同），放在不同位置
      {
        id: "busan-2-1-duplicate",
        position: { x: 400, y: -25 },
        data: {
          label: "산책",
          parentId: "busan-2",
          direction: "right",
        },
      },
    ],
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-25"),
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
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-18"),
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
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-12"),
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
    createdAt: new Date("2023-12-20"),
    updatedAt: new Date("2024-01-08"),
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
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
  },
];

/**
 * 取得使用者的所有心智圖 metadata（薄抽象層）
 * 未來會改成真正的 API 呼叫
 */
export async function getAllMindmaps(): Promise<MindmapMetadata[]> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 只回傳 metadata（不包含 nodes）
  return MOCK_MINDMAPS_DATA.map((map) => ({
    id: map.id,
    title: map.title,
    createdAt: map.createdAt || new Date(),
    updatedAt: map.updatedAt || new Date(),
  }));
}

/**
 * 根據 ID 取得單一心智圖的完整資料（薄抽象層）
 * 未來會改成真正的 API 呼叫
 */
export async function getMindmapById(mapId: string): Promise<MindmapData> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const mindmap = MOCK_MINDMAPS_DATA.find((map) => map.id === mapId);
  if (!mindmap) {
    throw new Error(`Mindmap with id ${mapId} not found`);
  }

  return mindmap;
}

/**
 * 建立新的心智圖（薄抽象層）
 * 未來會改成真正的 API 呼叫
 */
export async function createMindmap(
  title: string = "New Mind Map"
): Promise<MindmapMetadata> {
  // 模擬 API 延遲
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 產生新的 mindmap id
  const newId = `mindmap-${Date.now()}`;
  const now = new Date();

  // 建立空的 mindmap（只有空的 root node）
  const newMindmap: MindmapData = {
    id: newId,
    title: title,
    nodes: [
      {
        id: `root-${Date.now()}`,
        position: { x: 0, y: 0 },
        data: {
          label: "",
          parentId: null,
          isNew: true,
        },
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  // 將新的 mindmap 加入到 MOCK_MINDMAPS_DATA（模擬後端儲存）
  MOCK_MINDMAPS_DATA.push(newMindmap);

  // 回傳 metadata
  return {
    id: newId,
    title: title,
    createdAt: now,
    updatedAt: now,
  };
}
