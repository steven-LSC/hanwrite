"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  type Node,
  type Edge,
  ReactFlow,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from "@xyflow/react";
import { createId } from "@paralleldrive/cuid2";
import "@xyflow/react/dist/style.css";
import { MindmapNode } from "./mindmap-node";
import {
  findRootNode,
  calculateTreePositions,
  findClosestParentForInsert,
  findInsertIndex,
} from "@/lib/mindmap-utils";
import { generateEdges, findAllDescendants } from "./mindmap-utils";
import { useFocus } from "@/app/(main)/focus-context";

interface MindmapProps {
  initialNodes?: Node[];
  mapId?: string;
  onNodesChange?: (nodes: Node[]) => void;
  onCanvasClick?: () => void;
  readonly?: boolean;
}

export function Mindmap({
  initialNodes = [],
  mapId,
  onNodesChange,
  onCanvasClick,
  readonly = false,
}: MindmapProps) {
  const { screenToFlowPosition, fitView, setCenter } = useReactFlow();
  const { checkAndSetMindmapEditingState } = useFocus();
  const [nodes, setNodes, onNodesChangeInternal] =
    useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevInitialNodesRef = useRef<Node[]>(initialNodes);
  const isInternalUpdateRef = useRef(false);
  const prevNodesRef = useRef<Node[]>([]);
  const hasInitializedViewRef = useRef(false);
  const prevMapIdRef = useRef<string | undefined>(mapId);

  // 處理節點 label 變更
  const handleLabelChange = useCallback(
    (nodeId: string, newLabel: string) => {
      checkAndSetMindmapEditingState();
      isInternalUpdateRef.current = true;
      setNodes((nds) => {
        const updated = nds.map((node) =>
          node.id === nodeId
            ? {
              ...node,
              data: {
                ...node.data,
                label: newLabel,
                isNew: false,
              },
            }
            : node
        );
        // 重新計算位置
        const root = findRootNode(updated);
        if (root) {
          return calculateTreePositions(updated, root.id);
        }
        return updated;
      });
    },
    [setNodes, checkAndSetMindmapEditingState]
  );

  // 處理在節點下新增子節點
  const handleAddChild = useCallback(
    (parentId: string) => {
      checkAndSetMindmapEditingState();
      isInternalUpdateRef.current = true;
      setNodes((nds) => {
        const parentNode = nds.find((n) => n.id === parentId);
        if (!parentNode) return nds;

        // 繼承父節點的 direction，如果父節點沒有 direction（是 root），預設向右
        const direction =
          (parentNode.data.direction as "left" | "right") || "right";

        const newNodeId = createId();
        const newNode: Node = {
          id: newNodeId,
          position: { x: 0, y: 0 }, // 位置會由 calculateTreePositions 計算
          data: {
            label: "",
            parentId: parentId,
            direction: direction,
            isNew: true,
            onLabelChange: (newLabel: string) =>
              handleLabelChange(newNodeId, newLabel),
            onAddChild: handleAddChild,
          },
        };

        const updated = [...nds, newNode];
        const root = findRootNode(updated);
        if (root) {
          return calculateTreePositions(updated, root.id);
        }
        return updated;
      });
    },
    [setNodes, handleLabelChange, checkAndSetMindmapEditingState]
  );

  // 同步外部 nodes 變化，並為它們添加 callbacks
  useEffect(() => {
    // 使用深度比較來檢查 initialNodes 是否真的改變了
    // 使用 Map 來比較，避免索引順序問題
    const prevNodesMap = new Map(
      prevInitialNodesRef.current.map((node) => [node.id, node])
    );
    const nodesChanged =
      initialNodes.length !== prevInitialNodesRef.current.length ||
      initialNodes.some((node) => {
        const prevNode = prevNodesMap.get(node.id);
        if (!prevNode) return true;
        return (
          node.data.label !== prevNode.data.label ||
          node.data.parentId !== prevNode.data.parentId ||
          node.selected !== prevNode.selected
        );
      });

    // 如果只有 selected 狀態改變，直接更新 selected，不需要重新計算位置
    const onlySelectedChanged =
      initialNodes.length === prevInitialNodesRef.current.length &&
      initialNodes.every((node) => {
        const prevNode = prevNodesMap.get(node.id);
        if (!prevNode) return false;
        return (
          node.data.label === prevNode.data.label &&
          node.data.parentId === prevNode.data.parentId &&
          node.selected !== prevNode.selected
        );
      });

    if (onlySelectedChanged && !isInternalUpdateRef.current) {
      // 只更新 selected 狀態，不重新計算位置
      setNodes((nds) =>
        nds.map((node) => {
          const initialNode = initialNodes.find((n) => n.id === node.id);
          return {
            ...node,
            selected: initialNode?.selected ?? false,
          };
        })
      );
      prevInitialNodesRef.current = initialNodes;
      return;
    }

    // 只有在外部傳入的 nodes 真的改變時才更新（不是內部更新導致的）
    if (nodesChanged && !isInternalUpdateRef.current) {
      // 為 nodes 添加 callbacks，保留 selected 狀態
      // 如果是 readonly 模式，不添加 callbacks
      const nodesWithCallbacks = initialNodes.map((node) => ({
        ...node,
        selected: node.selected,
        data: {
          ...node.data,
          ...(readonly
            ? {}
            : {
              onLabelChange: (newLabel: string) =>
                handleLabelChange(node.id, newLabel),
              onAddChild: handleAddChild,
            }),
        },
      }));

      // 重新計算位置
      const root = findRootNode(nodesWithCallbacks);
      const positionedNodes = root
        ? calculateTreePositions(nodesWithCallbacks, root.id)
        : nodesWithCallbacks;

      // 確保保留 selected 狀態（calculateTreePositions 可能會重新創建 nodes）
      const nodesWithPreservedSelection = positionedNodes.map((node) => {
        const originalNode = initialNodes.find((n) => n.id === node.id);
        return {
          ...node,
          selected: originalNode?.selected ?? false,
        };
      });

      setNodes(nodesWithPreservedSelection);
      prevInitialNodesRef.current = initialNodes;
      prevNodesRef.current = nodesWithPreservedSelection;
      // 只有當 mapId 改變時才重置視角初始化標記
      if (mapId !== prevMapIdRef.current) {
        hasInitializedViewRef.current = false;
        prevMapIdRef.current = mapId;
      }
      // 外部更新時，確保標記為 false
      isInternalUpdateRef.current = false;
    }
  }, [initialNodes, mapId, setNodes, handleLabelChange, handleAddChild, readonly]);

  // 註冊自訂 node types，傳遞 readonly prop
  const nodeTypes = useMemo(
    () => ({
      default: (props: any) => <MindmapNode {...props} readonly={readonly} />,
    }),
    [readonly]
  );

  // 初始化 prevNodesRef
  useEffect(() => {
    if (prevNodesRef.current.length === 0 && nodes.length > 0) {
      prevNodesRef.current = nodes;
    }
  }, [nodes]);

  // 設定初始視角：當 nodes 首次載入時，將 root node 置中
  useEffect(() => {
    if (nodes.length > 0 && !hasInitializedViewRef.current) {
      const root = findRootNode(nodes);
      if (root) {
        // 使用 setTimeout 確保 ReactFlow 已經完全渲染
        const timeoutId = setTimeout(() => {
          // 將視角中心設定到 root node 的位置
          setCenter(root.position.x, root.position.y, { zoom: 1 });
          hasInitializedViewRef.current = true;
        }, 150);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [nodes, setCenter]);

  // 當 nodes 變更時，自動更新 edges
  useEffect(() => {
    setEdges(generateEdges(nodes));
  }, [nodes, setEdges]);

  // 當 nodes 變更時，通知父元件（只在內部更新時通知）
  useEffect(() => {
    // 檢查 nodes 是否真的改變了（避免不必要的通知）
    const nodesChanged =
      nodes.length !== prevNodesRef.current.length ||
      nodes.some(
        (node, index) =>
          node.id !== prevNodesRef.current[index]?.id ||
          node.data.label !== prevNodesRef.current[index]?.data.label ||
          node.data.parentId !== prevNodesRef.current[index]?.data.parentId ||
          node.position.x !== prevNodesRef.current[index]?.position.x ||
          node.position.y !== prevNodesRef.current[index]?.position.y
      );

    if (nodesChanged) {
      if (onNodesChange && isInternalUpdateRef.current) {
        // 通知父組件前先重置標記，避免後續的 useEffect 誤判
        isInternalUpdateRef.current = false;
        onNodesChange(nodes);
      }
      // 更新 ref
      prevNodesRef.current = nodes;
    }
  }, [nodes, onNodesChange]);

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChangeInternal>[0]) => {
      onNodesChangeInternal(changes);
    },
    [onNodesChangeInternal]
  );

  // 處理刪除節點（包含所有子節點）
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      checkAndSetMindmapEditingState();
      isInternalUpdateRef.current = true;
      setNodes((nds) => {
        // 找出要刪除的節點
        const nodeToDelete = nds.find((n) => n.id === nodeId);
        if (!nodeToDelete) return nds;

        // 不允許刪除 root 節點
        if (!nodeToDelete.data.parentId) {
          return nds;
        }

        // 找出所有需要刪除的節點（包括子孫節點）
        const nodesToDelete = findAllDescendants(nodeId, nds);

        // 過濾掉要刪除的節點
        const updated = nds.filter((node) => !nodesToDelete.includes(node.id));

        // 重新計算位置
        const root = findRootNode(updated);
        if (root) {
          return calculateTreePositions(updated, root.id);
        }
        return updated;
      });
    },
    [setNodes, checkAndSetMindmapEditingState]
  );

  // 處理雙擊空白處新增 node
  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // 將螢幕座標轉換為 Flow 座標
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      isInternalUpdateRef.current = true;

      // 如果沒有任何節點，新增的第一個節點就是 root
      if (nodes.length === 0) {
        const newNodeId = createId();
        const newNode: Node = {
          id: newNodeId,
          position: { x: 0, y: 0 },
          data: {
            label: "",
            parentId: null,
            isNew: true,
            onLabelChange: (newLabel: string) =>
              handleLabelChange(newNodeId, newLabel),
            onAddChild: handleAddChild,
          },
        };
        setNodes([newNode]);
        return;
      }

      // 找出最近的父節點和方向
      const result = findClosestParentForInsert(nodes, position);
      if (!result) return;

      const { parent: parentNode, direction } = result;

      // 找出該父節點的所有子節點（相同 direction）
      const childrenNodes = nodes.filter(
        (node) =>
          node.data.parentId === parentNode.id &&
          node.data.direction === direction
      );

      // 找出應該插入的索引位置
      const insertIndex = findInsertIndex(childrenNodes, position.y);

      setNodes((nds) => {
        const newNodeId = createId();
        const newNode: Node = {
          id: newNodeId,
          position: { x: 0, y: 0 }, // 位置會由 calculateTreePositions 計算
          data: {
            label: "",
            parentId: parentNode.id,
            direction: direction,
            isNew: true,
            onLabelChange: (newLabel: string) =>
              handleLabelChange(newNodeId, newLabel),
            onAddChild: handleAddChild,
          },
        };

        // 在指定位置插入新節點
        // 先找出所有非該父節點且非相同方向的子節點
        const nonChildren = nds.filter(
          (node) =>
            node.data.parentId !== parentNode.id ||
            node.data.direction !== direction
        );
        // 找出所有子節點，按 Y 軸排序
        const sortedChildren = [...childrenNodes].sort(
          (a, b) => a.position.y - b.position.y
        );
        // 在指定索引位置插入新節點
        sortedChildren.splice(insertIndex, 0, newNode);
        // 合併節點
        const updated = [...nonChildren, ...sortedChildren];

        const root = findRootNode(updated);
        if (root) {
          return calculateTreePositions(updated, root.id);
        }
        return updated;
      });
    },
    [screenToFlowPosition, nodes, handleLabelChange, handleAddChild, setNodes]
  );

  // 使用 onPaneClick 配合 timer 來檢測雙擊
  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      onCanvasClick?.();
      if (clickTimeoutRef.current) {
        // 雙擊檢測到
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        handlePaneDoubleClick(event);
      } else {
        // 第一次點擊：等待看是否有第二次點擊
        clickTimeoutRef.current = setTimeout(() => {
          if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
          }
        }, 300); // 雙擊時間閾值：300ms
      }
    },
    [handlePaneDoubleClick, onCanvasClick]
  );

  // 清理 timeout
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={(changes) => {
        // 過濾掉刪除 edge 的操作，只允許其他操作
        const filteredChanges = changes.filter(
          (change) => change.type !== "remove"
        );
        onEdgesChange(filteredChanges);
      }}
      onNodesDelete={
        readonly
          ? undefined
          : (deleted) => {
            // 當用戶按下 Delete 鍵時，刪除選中的節點
            deleted.forEach((node) => handleDeleteNode(node.id));
          }
      }
      onPaneClick={readonly ? undefined : handlePaneClick}
      onNodeClick={() => onCanvasClick?.()}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={!readonly}
      edgesFocusable={false}
      elementsSelectable={!readonly}
      selectNodesOnDrag={false}
      deleteKeyCode={readonly ? null : ["Delete", "Backspace"]}
      proOptions={{ hideAttribution: true }}
      zoomOnDoubleClick={false}
      defaultEdgeOptions={{
        type: "smoothstep",
        animated: false,
        style: { stroke: "var(--color-text-tertiary)", strokeWidth: 2 },
      }}
    />
  );
}
