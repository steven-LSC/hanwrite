import { type Node } from "@xyflow/react";
import {
  findRootNode,
  calculateTreePositions,
} from "@/lib/mindmap-utils";

export type MindmapMetadata = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MindmapData = {
  id: string;
  title: string;
  nodes: Node[];
  createdAt?: Date;
  updatedAt?: Date;
};

export interface UseMindmapDataOptions {
  mapId: string;
  onLabelChange: (nodeId: string, newLabel: string) => void;
  onAddChild: (parentId: string) => void;
}

export function prepareMindmapNodes(
  nodes: Node[],
  onLabelChange: (nodeId: string, newLabel: string) => void,
  onAddChild: (parentId: string) => void
): Node[] {
  // 將 nodes 資料加入 callback，並重新計算位置
  const nodesWithCallback = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onLabelChange: (newLabel: string) => onLabelChange(node.id, newLabel),
      onAddChild: onAddChild,
    },
  }));

  // 重新計算位置
  const root = findRootNode(nodesWithCallback);
  const positionedNodes = root
    ? calculateTreePositions(nodesWithCallback, root.id)
    : nodesWithCallback;

  return positionedNodes;
}
