import { Node, Edge } from "@xyflow/react";

// 節點寬度和高度的估算值
const ESTIMATED_NODE_WIDTH = 200;
const ESTIMATED_NODE_HEIGHT = 40;
const HORIZONTAL_SPACING = 220;
const VERTICAL_SPACING = 140;

export type TreeNode = {
  id: string;
  level: number; // 0 = root, 1 = 第一層, 2 = 第二層...
  side: "left" | "right" | "root"; // 相對於根節點的位置
  verticalOrder: number; // 同 level 中由上到下的順序
  parent: string | null;
  children: string[];
  position: { x: number; y: number };
};

export type TreeStructure = Map<string, TreeNode>;

/**
 * 找出根節點（ID 包含 'root'）
 */
export function findRootNode(nodes: Node[], edges: Edge[]): Node {
  const rootNode = nodes.find((node) => node.id.includes("root"));
  if (!rootNode) {
    throw new Error("Root node not found");
  }
  return rootNode;
}

/**
 * 計算節點的邊界（考慮節點寬度）
 */
export function getNodeBounds(node: Node) {
  const width = node.measured?.width || ESTIMATED_NODE_WIDTH;
  const height = node.measured?.height || ESTIMATED_NODE_HEIGHT;

  return {
    left: node.position.x - width / 2,
    right: node.position.x + width / 2,
    top: node.position.y - height / 2,
    bottom: node.position.y + height / 2,
    width,
    height,
  };
}

/**
 * 建立 tree 結構，計算每個節點的 level 和 side
 */
export function buildTreeStructure(
  nodes: Node[],
  edges: Edge[],
  rootId: string
): TreeStructure {
  const treeStructure: TreeStructure = new Map();
  const rootNode = nodes.find((n) => n.id === rootId);

  if (!rootNode) {
    throw new Error("Root node not found in nodes array");
  }

  // 建立 parent-child 關係圖
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();

  edges.forEach((edge) => {
    const children = childrenMap.get(edge.source) || [];
    children.push(edge.target);
    childrenMap.set(edge.source, children);
    parentMap.set(edge.target, edge.source);
  });

  // BFS 遍歷建立 tree 結構
  const queue: Array<{ nodeId: string; level: number; parent: string | null }> =
    [{ nodeId: rootId, level: 0, parent: null }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);

    const node = nodes.find((n) => n.id === current.nodeId);
    if (!node) continue;

    // 判斷節點的 side
    let side: "left" | "right" | "root" = "root";
    if (current.level > 0) {
      side = node.position.x >= rootNode.position.x ? "right" : "left";
    }

    const children = childrenMap.get(current.nodeId) || [];

    treeStructure.set(current.nodeId, {
      id: current.nodeId,
      level: current.level,
      side,
      verticalOrder: 0, // 稍後計算
      parent: current.parent,
      children,
      position: node.position,
    });

    // 將子節點加入隊列
    children.forEach((childId) => {
      queue.push({
        nodeId: childId,
        level: current.level + 1,
        parent: current.nodeId,
      });
    });
  }

  // 計算每個 level 的 verticalOrder
  const levelGroups = new Map<string, TreeNode[]>();
  treeStructure.forEach((treeNode) => {
    const key = `${treeNode.level}-${treeNode.side}`;
    const group = levelGroups.get(key) || [];
    group.push(treeNode);
    levelGroups.set(key, group);
  });

  levelGroups.forEach((group) => {
    group.sort((a, b) => a.position.y - b.position.y);
    group.forEach((treeNode, index) => {
      treeNode.verticalOrder = index;
    });
  });

  return treeStructure;
}

/**
 * 找出最近的父節點
 */
export function findClosestParentNode(
  nodes: Node[],
  edges: Edge[],
  clickPosition: { x: number; y: number },
  rootNode: Node,
  isRightSide: boolean
): Node {
  const treeStructure = buildTreeStructure(nodes, edges, rootNode.id);

  // 過濾出正確側的節點
  const candidateNodes = Array.from(treeStructure.values()).filter((treeNode) => {
    if (treeNode.side === "root") return true;
    return isRightSide ? treeNode.side === "right" : treeNode.side === "left";
  });

  if (candidateNodes.length === 0) {
    return rootNode;
  }

  let closestNode: Node | null = null;
  let minDistance = Infinity;

  candidateNodes.forEach((treeNode) => {
    const node = nodes.find((n) => n.id === treeNode.id);
    if (!node) return;

    const bounds = getNodeBounds(node);

    // 檢查水平距離
    let horizontalValid = false;
    if (isRightSide) {
      // 右側：候選節點的最右邊要在新節點的最左邊的左邊
      horizontalValid = bounds.right < clickPosition.x;
    } else {
      // 左側：候選節點的最左邊要在新節點的最右邊的右邊
      horizontalValid = bounds.left > clickPosition.x;
    }

    if (!horizontalValid && treeNode.side !== "root") {
      return;
    }

    // 計算距離（考慮水平和垂直）
    const horizontalDistance = isRightSide
      ? clickPosition.x - bounds.right
      : bounds.left - clickPosition.x;
    const verticalDistance = Math.abs(node.position.y - clickPosition.y);

    // 綜合距離（水平距離權重較高）
    const distance = horizontalDistance * 2 + verticalDistance;

    if (distance < minDistance) {
      minDistance = distance;
      closestNode = node;
    }
  });

  return closestNode || rootNode;
}

/**
 * 計算新節點的位置
 */
export function calculateNodePosition(
  treeStructure: TreeStructure,
  parentNode: Node,
  clickPosition: { x: number; y: number },
  isRightSide: boolean,
  rootNode: Node
): { x: number; y: number } {
  const parentTreeNode = treeStructure.get(parentNode.id);
  if (!parentTreeNode) {
    throw new Error("Parent node not found in tree structure");
  }

  const newLevel = parentTreeNode.level + 1;

  // 計算水平位置
  const newX = isRightSide
    ? rootNode.position.x + newLevel * HORIZONTAL_SPACING
    : rootNode.position.x - newLevel * HORIZONTAL_SPACING;

  // 找出同 level、同 side 的所有節點
  const siblingsOnSameLevel = Array.from(treeStructure.values()).filter(
    (node) =>
      node.level === newLevel &&
      node.side === (isRightSide ? "right" : "left")
  );

  // 計算垂直位置
  let newY: number;

  if (siblingsOnSameLevel.length === 0) {
    // 如果是該 level 的第一個節點，使用點擊位置的 y
    newY = clickPosition.y;
  } else {
    // 找到應該插入的位置
    const sortedSiblings = [...siblingsOnSameLevel].sort(
      (a, b) => a.position.y - b.position.y
    );

    // 找到插入位置
    let insertIndex = sortedSiblings.findIndex(
      (node) => node.position.y > clickPosition.y
    );
    if (insertIndex === -1) {
      insertIndex = sortedSiblings.length;
    }

    // 計算新的 y 位置
    if (insertIndex === 0) {
      // 插入在最上面
      newY = sortedSiblings[0].position.y - VERTICAL_SPACING;
    } else if (insertIndex === sortedSiblings.length) {
      // 插入在最下面
      newY =
        sortedSiblings[sortedSiblings.length - 1].position.y + VERTICAL_SPACING;
    } else {
      // 插入在中間
      const prevY = sortedSiblings[insertIndex - 1].position.y;
      const nextY = sortedSiblings[insertIndex].position.y;
      newY = (prevY + nextY) / 2;
    }
  }

  return { x: newX, y: newY };
}

/**
 * 計算所有節點的邊界框
 */
export function calculateBoundingBox(nodes: Node[]) {
  if (nodes.length === 0) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      center: { x: 0, y: 0 },
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const bounds = getNodeBounds(node);
    minX = Math.min(minX, bounds.left);
    maxX = Math.max(maxX, bounds.right);
    minY = Math.min(minY, bounds.top);
    maxY = Math.max(maxY, bounds.bottom);
  });

  return {
    minX,
    maxX,
    minY,
    maxY,
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    },
  };
}

/**
 * 重新置中心智圖
 */
export function recenterMindmap(nodes: Node[], rootId: string): Node[] {
  if (nodes.length === 0) return nodes;

  const bounds = calculateBoundingBox(nodes);

  // 計算需要的偏移量（讓邊界框的中心移到原點）
  const offset = {
    x: -bounds.center.x,
    y: -bounds.center.y,
  };

  // 更新所有節點位置
  return nodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x + offset.x,
      y: node.position.y + offset.y,
    },
  }));
}
