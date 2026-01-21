import { type Node } from "@xyflow/react";
import {
  type MindmapData,
  type MindmapMetadata,
} from "@/components/brainstorm/use-mindmap-data";

type MindmapMetadataResponse = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type MindmapDataResponse = {
  id: string;
  title: string;
  nodes: Node[];
  createdAt: string;
  updatedAt: string;
};

const parseMetadata = (map: MindmapMetadataResponse): MindmapMetadata => ({
  id: map.id,
  title: map.title,
  createdAt: new Date(map.createdAt),
  updatedAt: new Date(map.updatedAt),
});

const parseMindmap = (map: MindmapDataResponse): MindmapData => ({
  id: map.id,
  title: map.title,
  nodes: map.nodes ?? [],
  createdAt: new Date(map.createdAt),
  updatedAt: new Date(map.updatedAt),
});

const sanitizeDataValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitizeDataValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => typeof entryValue !== "function")
        .map(([key, entryValue]) => [key, sanitizeDataValue(entryValue)])
    );
  }
  if (typeof value === "function") {
    return undefined;
  }
  return value;
};

const sanitizeNodes = (nodes: Node[]): Node[] =>
  nodes.map((node) => {
    const { selected, data, ...rest } = node;
    return {
      ...rest,
      data: sanitizeDataValue(data) as Node["data"],
    };
  });

const parseResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      errorBody && typeof errorBody.error === "string"
        ? errorBody.error
        : "Request failed";
    throw new Error(message);
  }

  return (await response.json()) as T;
};

/**
 * 取得使用者的所有心智圖 metadata（薄抽象層）
 */
export async function getAllMindmaps(): Promise<MindmapMetadata[]> {
  const response = await fetch("/api/mindmaps");
  const data = await parseResponse<{
    mindmaps: MindmapMetadataResponse[];
  }>(response);

  return data.mindmaps.map(parseMetadata);
}

/**
 * 根據 ID 取得單一心智圖的完整資料（薄抽象層）
 */
export async function getMindmapById(mapId: string): Promise<MindmapData> {
  const response = await fetch(`/api/mindmaps/${mapId}`);
  const data = await parseResponse<{ mindmap: MindmapDataResponse }>(response);

  return parseMindmap(data.mindmap);
}

/**
 * 建立新的心智圖（薄抽象層）
 */
export async function createMindmap(
  title: string = "New Mind Map"
): Promise<MindmapMetadata> {
  const response = await fetch("/api/mindmaps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  const data = await parseResponse<{ mindmap: MindmapMetadataResponse }>(
    response
  );

  return parseMetadata(data.mindmap);
}

/**
 * 更新心智圖（薄抽象層）
 */
export async function updateMindmap(
  mapId: string,
  payload: { title?: string; nodes?: Node[] }
): Promise<MindmapData> {
  const body: { title?: string; nodes?: Node[] } = {};

  if (typeof payload.title === "string") {
    body.title = payload.title;
  }

  if (payload.nodes) {
    body.nodes = sanitizeNodes(payload.nodes);
  }

  const response = await fetch(`/api/mindmaps/${mapId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseResponse<{ mindmap: MindmapDataResponse }>(response);

  return parseMindmap(data.mindmap);
}
