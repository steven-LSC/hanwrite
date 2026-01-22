import { Node } from "@xyflow/react";

// 固定節點高度
const NODE_HEIGHT = 40;
// 水平間距
const HORIZONTAL_SPACING = 250;
// 垂直間距
const VERTICAL_SPACING = 60;

/**
 * 找出根節點（parentId 為 null 或 undefined 的節點）
 */
export function findRootNode(nodes: Node[]): Node | null {
  const rootNode = nodes.find(
    (node) => !node.data.parentId || node.data.parentId === null
  );
  return rootNode || null;
}

/**
 * 建立父子關係映射
 */
function buildParentChildMap(nodes: Node[]): {
  parentMap: Map<string, string | null>;
  childrenMap: Map<string, string[]>;
} {
  const parentMap = new Map<string, string | null>();
  const childrenMap = new Map<string, string[]>();

  nodes.forEach((node) => {
    const parentId = node.data.parentId as string | null | undefined;
    parentMap.set(node.id, parentId || null);

    if (parentId) {
      const children = childrenMap.get(parentId) || [];
      children.push(node.id);
      childrenMap.set(parentId, children);
    }
  });

  return { parentMap, childrenMap };
}

/**
 * 遞迴計算子樹的總高度（包含所有子孫節點）
 */
function calculateSubtreeHeight(
  nodeId: string,
  childrenMap: Map<string, string[]>,
  resultNodes: Node[]
): number {
  const childrenIds = childrenMap.get(nodeId) || [];
  
  if (childrenIds.length === 0) {
    return NODE_HEIGHT;
  }

  // 遞迴計算所有子節點的高度總和
  let totalHeight = 0;
  childrenIds.forEach((childId) => {
    const childHeight = calculateSubtreeHeight(childId, childrenMap, resultNodes);
    totalHeight += childHeight;
  });

  // 加上子節點之間的間距
  totalHeight += (childrenIds.length - 1) * VERTICAL_SPACING;

  return totalHeight;
}

/**
 * 遞迴計算並設定子節點位置
 * @returns 子樹佔用的總高度
 */
function positionSubtree(
  nodeId: string,
  parentX: number,
  startY: number,
  direction: "left" | "right",
  childrenMap: Map<string, string[]>,
  resultNodes: Node[]
): number {
  const childrenIds = childrenMap.get(nodeId) || [];
  
  if (childrenIds.length === 0) {
    return NODE_HEIGHT;
  }

  // 按照方向過濾子節點，並保持插入順序
  const getNodeIndex = (id: string) => resultNodes.findIndex((n) => n.id === id);
  const filteredChildren = childrenIds
    .filter((id) => {
      const child = resultNodes.find((n) => n.id === id);
      if (!child) return false;
      const childDir = child.data.direction || "right";
      return childDir === direction;
    })
    .sort((a, b) => getNodeIndex(a) - getNodeIndex(b));

  let currentY = startY;
  
  // 為每個子節點計算位置
  filteredChildren.forEach((childId) => {
    const childNode = resultNodes.find((n) => n.id === childId);
    if (!childNode) return;

    // 計算子節點的子樹高度
    const subtreeHeight = calculateSubtreeHeight(childId, childrenMap, resultNodes);
    
    // 設定子節點位置（Y 軸位置在子樹的中心）
    const childX = direction === "right" 
      ? parentX + HORIZONTAL_SPACING 
      : parentX - HORIZONTAL_SPACING;
    const childY = currentY + subtreeHeight / 2 - NODE_HEIGHT / 2;
    
    childNode.position = { x: childX, y: childY };

    // 遞迴處理子節點的子節點
    positionSubtree(childId, childX, currentY, direction, childrenMap, resultNodes);

    // 更新 Y 軸位置，為下一個子節點預留空間
    currentY += subtreeHeight + VERTICAL_SPACING;
  });

  // 返回這一側子樹的總高度（不包含最後一個間距）
  const totalHeight = filteredChildren.reduce((sum, childId, index) => {
    const subtreeHeight = calculateSubtreeHeight(childId, childrenMap, resultNodes);
    return sum + subtreeHeight + (index < filteredChildren.length - 1 ? VERTICAL_SPACING : 0);
  }, 0);

  return totalHeight || NODE_HEIGHT;
}

/**
 * 計算樹狀結構中所有節點的位置
 * 基於 root 的絕對位置，其他節點都是計算得出的
 * 支持雙向展開：子節點可以在父節點的左側或右側
 */
export function calculateTreePositions(
  nodes: Node[],
  rootId: string | null
): Node[] {
  if (nodes.length === 0) return nodes;

  // 如果沒有指定 rootId，找第一個 parentId 為 null 的節點
  if (!rootId) {
    const root = findRootNode(nodes);
    if (!root) return nodes;
    rootId = root.id;
  }

  const rootNode = nodes.find((n) => n.id === rootId);
  if (!rootNode) return nodes;

  const { childrenMap } = buildParentChildMap(nodes);
  const resultNodes = nodes.map((node) => ({ ...node }));

  // Root 節點位置保持不變（或使用預設位置）
  const rootResult = resultNodes.find((n) => n.id === rootId);
  if (rootResult && !rootResult.position.x && !rootResult.position.y) {
    rootResult.position = { x: 0, y: 0 };
  }

  if (!rootResult) return resultNodes;

  const rootX = rootResult.position.x;
  const rootY = rootResult.position.y;

  // 獲取所有子節點
  const childrenIds = childrenMap.get(rootId) || [];
  
  // 分別處理左右兩側的子節點
  const getNodeIndex = (id: string) => resultNodes.findIndex((n) => n.id === id);
  const leftChildren = childrenIds
    .filter((id) => {
      const child = resultNodes.find((n) => n.id === id);
      return child && child.data.direction === "left";
    })
    .sort((a, b) => getNodeIndex(a) - getNodeIndex(b));
    
  const rightChildren = childrenIds
    .filter((id) => {
      const child = resultNodes.find((n) => n.id === id);
      const direction = child?.data.direction || "right";
      return child && (direction === "right" || !child.data.direction);
    })
    .sort((a, b) => getNodeIndex(a) - getNodeIndex(b));

  // 計算右側子樹的總高度
  let rightTotalHeight = 0;
  rightChildren.forEach((childId, index) => {
    const subtreeHeight = calculateSubtreeHeight(childId, childrenMap, resultNodes);
    rightTotalHeight += subtreeHeight;
    if (index < rightChildren.length - 1) {
      rightTotalHeight += VERTICAL_SPACING;
    }
  });

  // 計算左側子樹的總高度
  let leftTotalHeight = 0;
  leftChildren.forEach((childId, index) => {
    const subtreeHeight = calculateSubtreeHeight(childId, childrenMap, resultNodes);
    leftTotalHeight += subtreeHeight;
    if (index < leftChildren.length - 1) {
      leftTotalHeight += VERTICAL_SPACING;
    }
  });

  // 處理右側子節點
  if (rightChildren.length > 0) {
    const startY = rootY - rightTotalHeight / 2;
    positionSubtree(rootId, rootX, startY, "right", childrenMap, resultNodes);
  }

  // 處理左側子節點
  if (leftChildren.length > 0) {
    const startY = rootY - leftTotalHeight / 2;
    positionSubtree(rootId, rootX, startY, "left", childrenMap, resultNodes);
  }

  return resultNodes;
}

/**
 * 找出最適合的父節點（基於 X 軸位置和方向）
 * 支持雙向展開：根據點擊位置判斷是向左還是向右展開
 * 返回值包含父節點和方向信息
 */
export function findClosestParentForInsert(
  nodes: Node[],
  clickPosition: { x: number; y: number }
): { parent: Node; direction: "left" | "right" } | null {
  if (nodes.length === 0) return null;

  const root = findRootNode(nodes);
  if (!root) return null;

  const rootX = root.position.x;
  const clickX = clickPosition.x;
  const clickY = clickPosition.y;

  // 判斷方向
  const direction: "left" | "right" = clickX >= rootX ? "right" : "left";

  // 計算點擊位置相對於 root 的距離和層級
  // 使用四捨五入，以更貼近點擊位置的層級
  const relativeX = Math.abs(clickX - rootX);
  const level = Math.round(relativeX / HORIZONTAL_SPACING);

  // 如果在 root 層級（level 0），直接返回 root
  if (level === 0) {
    return { parent: root, direction };
  }

  // 計算父層級（level - 1）的 X 座標
  const parentLevelX =
    direction === "right"
      ? rootX + (level - 1) * HORIZONTAL_SPACING
      : rootX - (level - 1) * HORIZONTAL_SPACING;

  // 找出該層級且方向相同的所有節點
  const parentCandidates = nodes.filter((node) => {
    const isCorrectX = Math.abs(node.position.x - parentLevelX) < 1; // 考慮浮點數誤差
    const isCorrectDirection = node.data.direction === direction || (!node.data.direction && node.id === root.id);
    return isCorrectX && isCorrectDirection;
  });

  if (parentCandidates.length === 0) {
    // 如果找不到父層級的節點，返回 root
    return { parent: root, direction };
  }

  // 如果只有一個候選節點，直接返回
  if (parentCandidates.length === 1) {
    return { parent: parentCandidates[0], direction };
  }

  // 如果有多個候選節點，找出 Y 軸最接近的那個
  let closestParent = parentCandidates[0];
  let minYDistance = Math.abs(parentCandidates[0].position.y - clickY);

  parentCandidates.forEach((node) => {
    const yDistance = Math.abs(node.position.y - clickY);
    if (yDistance < minYDistance) {
      minYDistance = yDistance;
      closestParent = node;
    }
  });

  return { parent: closestParent, direction };
}

/**
 * 找出應該插入的索引位置（基於 Y 軸位置）
 */
export function findInsertIndex(
  childrenNodes: Node[],
  clickY: number
): number {
  if (childrenNodes.length === 0) return 0;

  // 按 Y 軸排序
  const sorted = [...childrenNodes].sort((a, b) => a.position.y - b.position.y);

  // 找到第一個 y > 點擊位置.y 的子節點索引
  const insertIndex = sorted.findIndex((node) => node.position.y > clickY);

  // 如果沒有找到，插入在最後
  return insertIndex === -1 ? sorted.length : insertIndex;
}

/**
 * Tree 節點結構（用於 API 傳遞）
 */
export interface TreeNode {
  id: string;
  label: string;
  parentId: string | null;
}

/**
 * 將 ReactFlow Node[] 轉換成扁平化 tree 結構
 * 此函數會被 outline-generator 和 idea-partner 共用
 */
export function convertNodesToTree(nodes: Node[]): TreeNode[] {
  return nodes
    .filter((node) => {
      // 過濾掉空 label 的節點
      const label = node.data.label as string | undefined;
      return label && label.trim().length > 0;
    })
    .map((node) => {
      const parentId = node.data.parentId as string | null | undefined;
      return {
        id: node.id,
        label: (node.data.label as string).trim(),
        parentId: parentId || null,
      };
    });
}
