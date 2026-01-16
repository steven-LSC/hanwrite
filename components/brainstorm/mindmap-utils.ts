import { type Node, type Edge } from "@xyflow/react";

// 根據 nodes 生成連接線
export function generateEdges(nodes: Node[]): Edge[] {
  const edges: Edge[] = [];

  nodes.forEach((node) => {
    const parentId = node.data.parentId as string | null | undefined;
    if (parentId && typeof parentId === "string") {
      const direction = node.data.direction as "left" | "right" | undefined;

      // 根據子節點的方向決定連接點
      // 左側子節點：父節點左側 -> 子節點右側
      // 右側子節點：父節點右側 -> 子節點左側
      const sourceHandle = direction === "left" ? "left" : "right";
      const targetHandle = direction === "left" ? "right" : "left";

      edges.push({
        id: `edge-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        sourceHandle: sourceHandle,
        targetHandle: targetHandle,
        type: "smoothstep",
        style: { stroke: "var(--color-text-tertiary)", strokeWidth: 2 },
        animated: false,
      });
    }
  });

  return edges;
}

// 找出節點的所有子孫節點（遞迴）
export function findAllDescendants(
  nodeId: string,
  nodes: Node[]
): string[] {
  const descendants: string[] = [nodeId];
  const children = nodes.filter((n) => n.data.parentId === nodeId);

  children.forEach((child) => {
    descendants.push(...findAllDescendants(child.id, nodes));
  });

  return descendants;
}
