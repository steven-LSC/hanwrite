import { type Node } from "@xyflow/react";
import { OutlineData } from "@/lib/types";

/**
 * 從 mindmap 生成 outline
 * 呼叫 AI API 根據心智圖生成文章大綱
 */
export async function generateOutline(
  title: string,
  nodes: Node[]
): Promise<OutlineData & { duration?: number }> {
  const response = await fetch("/api/outline-generator", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, nodes }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to generate outline: ${response.statusText}`
    );
  }

  const data = await response.json();
  const sections = data.sections || [];

  // 將 sections 轉換為 OutlineData
  const outlineData: OutlineData & { duration?: number } = {
    title,
    sections: sections,
    duration: data.duration,
  };

  return outlineData;
}

/**
 * 儲存 outline 到資料庫（薄抽象層）
 */
export async function saveOutline(
  mapId: string,
  outline: OutlineData
): Promise<void> {
  const response = await fetch(`/api/outline/${mapId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ outline }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to save outline: ${response.statusText}`
    );
  }
}

/**
 * 取得已儲存的 outline（薄抽象層）
 * 從 getMindmapById 取得的 mindmap 資料中取得 outline
 */
export async function getSavedOutline(
  mapId: string
): Promise<OutlineData | null> {
  // 這個函數保留作為向後相容的介面
  // 實際實作應該從 getMindmapById 取得，但為了不破壞現有呼叫，這裡直接呼叫 API
  const response = await fetch(`/api/mindmaps/${mapId}`);
  
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const mindmap = data.mindmap;
  
  return mindmap?.outline ?? null;
}
