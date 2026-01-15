"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  type Node,
  type Edge,
  type NodeProps,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import {
  findRootNode,
  calculateTreePositions,
  findClosestParentForInsert,
  findInsertIndex,
} from "@/lib/mindmap-utils";

type MindmapData = {
  id: string;
  title: string;
  nodes: Node[];
};

const DEFAULT_MAP_ID = "new";

const MOCK_MINDMAPS: Record<string, MindmapData> = {
  new: {
    id: "new",
    title: "New Mindmap",
    nodes: [
      {
        id: "root",
        position: { x: 0, y: 0 },
        data: { label: "Main Topic", parentId: null },
      },
      {
        id: "idea-1",
        position: { x: 200, y: -25 },
        data: { label: "Idea 1", parentId: "root", direction: "right" },
      },
      {
        id: "idea-2",
        position: { x: 200, y: 25 },
        data: { label: "Idea 2", parentId: "root", direction: "right" },
      },
    ],
  },
  "map-1": {
    id: "map-1",
    title: "Study Plan",
    nodes: [
      {
        id: "root-1",
        position: { x: 0, y: 0 },
        data: { label: "Study Plan", parentId: null },
      },
      {
        id: "focus-1",
        position: { x: 200, y: -50 },
        data: { label: "Vocabulary", parentId: "root-1", direction: "right" },
      },
      {
        id: "focus-2",
        position: { x: 200, y: 0 },
        data: { label: "Grammar", parentId: "root-1", direction: "right" },
      },
      {
        id: "focus-3",
        position: { x: 200, y: 50 },
        data: { label: "Writing", parentId: "root-1", direction: "right" },
      },
    ],
  },
  "map-2": {
    id: "map-2",
    title: "Essay Outline",
    nodes: [
      {
        id: "root-2",
        position: { x: 400, y: 300 },
        data: { label: "Essay Outline", parentId: null },
      },
      {
        id: "left-1",
        position: { x: 200, y: 300 },
        data: { label: "Left 1", parentId: "root-2", direction: "left" },
      },
      {
        id: "right-1",
        position: { x: 600, y: 275 },
        data: { label: "Right 1", parentId: "root-2", direction: "right" },
      },
      {
        id: "right-2",
        position: { x: 600, y: 325 },
        data: { label: "Right 2", parentId: "root-2", direction: "right" },
      },
    ],
  },
};

const fetchMindmap = async (mapId: string): Promise<MindmapData> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const data = MOCK_MINDMAPS[mapId];
      if (!data) {
        reject(new Error("Mindmap not found"));
        return;
      }
      resolve(data);
    }, 200);
  });
};

// 根據 nodes 生成連接線
const generateEdges = (nodes: Node[]): Edge[] => {
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
        style: { stroke: "#94a3b8", strokeWidth: 2 },
        animated: false,
      });
    }
  });

  return edges;
};

// 找出節點的所有子孫節點（遞迴）
const findAllDescendants = (nodeId: string, nodes: Node[]): string[] => {
  const descendants: string[] = [nodeId];
  const children = nodes.filter((n) => n.data.parentId === nodeId);

  children.forEach((child) => {
    descendants.push(...findAllDescendants(child.id, nodes));
  });

  return descendants;
};

// 自訂 Node Component
function CustomNode({ data, selected, id }: NodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label as string);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 如果是新 node，自動進入編輯模式
  useEffect(() => {
    if (data.isNew) {
      setIsEditing(true);
    }
  }, [data.isNew]);

  const handleTextDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleNodeDoubleClick = (e: React.MouseEvent) => {
    // 如果雙擊的是文字區域（textarea 或顯示文字的 div），不處理（由 handleTextDoubleClick 處理）
    const target = e.target as HTMLElement;
    if (
      target.tagName === "TEXTAREA" ||
      (target.tagName === "DIV" && target.textContent !== null)
    ) {
      return;
    }

    // 雙擊節點其他區域，新增子節點
    if (data.onAddChild && typeof data.onAddChild === "function") {
      data.onAddChild(id);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onLabelChange && typeof data.onLabelChange === "function") {
      data.onLabelChange(label);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setLabel(data.label as string);
      setIsEditing(false);
    }
  };

  // 聚焦邏輯：當進入編輯模式時自動聚焦
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          if (data.isNew) {
            textareaRef.current.setSelectionRange(0, 0);
          } else {
            const length = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(length, length);
          }
        }
      });
    }
  }, [isEditing, data.isNew]);

  useEffect(() => {
    setLabel(data.label as string);
  }, [data.label]);

  return (
    <div
      onDoubleClick={handleNodeDoubleClick}
      className={`px-4 rounded-lg border transition-all cursor-pointer outline-none focus:outline-none focus-visible:outline-none relative h-[40px] w-[200px] flex items-center justify-center ${
        selected
          ? "bg-blue-50 border-blue-300"
          : "bg-white border-gray-300 hover:border-gray-400"
      }`}
    >
      {/* Handle 用於連接線 */}
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        style={{ opacity: 0 }}
      />
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        style={{ opacity: 0 }}
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        style={{ opacity: 0 }}
      />
      <Handle
        id="right"
        type="target"
        position={Position.Right}
        style={{ opacity: 0 }}
      />
      
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onDoubleClick={handleTextDoubleClick}
          className="bg-transparent outline-none text-[#475569] text-[14px] font-medium text-center resize-none w-full overflow-hidden whitespace-nowrap flex items-center"
          style={{
            lineHeight: "40px",
            height: "40px",
            pointerEvents: "auto",
          }}
        />
      ) : (
        <div
          onDoubleClick={handleTextDoubleClick}
          className="text-[#475569] text-[14px] font-medium text-center h-full flex items-center justify-center whitespace-nowrap overflow-hidden text-ellipsis w-full"
        >
          {label || "\u00A0"}
        </div>
      )}
    </div>
  );
}

function BrainstormPageContent() {
  const params = useParams();
  const router = useRouter();
  const mapId = (params.mapId as string) || DEFAULT_MAP_ID;
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedMapId, setLoadedMapId] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [mapList, setMapList] = useState<MindmapData[]>(() =>
    Object.values(MOCK_MINDMAPS)
  );
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 註冊自訂 node types
  const nodeTypes = useMemo(() => ({ default: CustomNode }), []);

  // 當 nodes 變更時，自動更新 edges
  useEffect(() => {
    setEdges(generateEdges(nodes));
  }, [nodes, setEdges]);

  const handleNodesChange = useCallback(
    (changes) => {
      // #region agent log
      fetch(
        "http://127.0.0.1:7243/ingest/4df6d733-e4bc-48a2-8417-81862552ed0c",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "app/(main)/brainstorm/[mapId]/page.tsx:279",
            message: "onNodesChange",
            data: {
              changeCount: changes.length,
              types: changes.map((c) => c.type),
              positionChanges: changes
                .filter((c) => c.type === "position")
                .map((c) => ({
                  id: c.id,
                  pos: c.position,
                  dragging: c.dragging,
                })),
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "pre-fix",
            hypothesisId: "B",
          }),
        }
      ).catch(() => {});
      // #endregion agent log
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/4df6d733-e4bc-48a2-8417-81862552ed0c", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "app/(main)/brainstorm/[mapId]/page.tsx:289",
        message: "nodes state",
        data: {
          count: nodes.length,
          tail: nodes.slice(-3).map((n) => ({
            id: n.id,
            parentId: n.data.parentId,
            dir: n.data.direction,
            pos: n.position,
          })),
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "D",
      }),
    }).catch(() => {});
    // #endregion agent log
  }, [nodes]);

  // 處理節點 label 變更
  const handleLabelChange = useCallback(
    (nodeId: string, newLabel: string) => {
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
    [setNodes]
  );

  // 處理在節點下新增子節點
  const handleAddChild = useCallback(
    (parentId: string) => {
      setNodes((nds) => {
        const parentNode = nds.find((n) => n.id === parentId);
        if (!parentNode) return nds;

        // 繼承父節點的 direction，如果父節點沒有 direction（是 root），預設向右
        const direction =
          (parentNode.data.direction as "left" | "right") || "right";

        const newNodeId = `node-${Date.now()}`;
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
    [setNodes, handleLabelChange]
  );

  // 處理刪除節點（包含所有子節點）
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
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
    [setNodes]
  );

  // 處理雙擊空白處新增 node
  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // 將螢幕座標轉換為 Flow 座標
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // 如果沒有任何節點，新增的第一個節點就是 root
      if (nodes.length === 0) {
        const newNodeId = `root-${Date.now()}`;
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
        // #region agent log
        fetch(
          "http://127.0.0.1:7243/ingest/4df6d733-e4bc-48a2-8417-81862552ed0c",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "app/(main)/brainstorm/[mapId]/page.tsx:421",
              message: "paneDoubleClick add node",
              data: {
                clickPos: position,
                parentId: parentNode.id,
                direction,
                childrenCount: childrenNodes.length,
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "pre-fix",
              hypothesisId: "C",
            }),
          }
        ).catch(() => {});
        // #endregion agent log
        const newNodeId = `node-${Date.now()}`;
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
    [handlePaneDoubleClick]
  );

  // 清理 timeout
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapId || mapId === loadedMapId) {
      return;
    }

    setIsLoading(true);
    fetchMindmap(mapId)
      .then((data) => {
        // 將 nodes 資料加入 callback，並重新計算位置
        const nodesWithCallback = data.nodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            onLabelChange: (newLabel: string) =>
              handleLabelChange(node.id, newLabel),
            onAddChild: handleAddChild,
          },
        }));

        // 重新計算位置
        const root = findRootNode(nodesWithCallback);
        const positionedNodes = root
          ? calculateTreePositions(nodesWithCallback, root.id)
          : nodesWithCallback;
        // #region agent log
        fetch(
          "http://127.0.0.1:7243/ingest/4df6d733-e4bc-48a2-8417-81862552ed0c",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "app/(main)/brainstorm/[mapId]/page.tsx:520",
              message: "loaded positionedNodes",
              data: {
                mapId: data.id,
                exampleNodes: positionedNodes.slice(0, 3).map((n) => ({
                  id: n.id,
                  pos: n.position,
                  dir: n.data.direction,
                  parentId: n.data.parentId,
                })),
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "pre-fix",
              hypothesisId: "A",
            }),
          }
        ).catch(() => {});
        // #endregion agent log

        setNodes(positionedNodes);
        setMapList((prev) => {
          const exists = prev.find((map) => map.id === data.id);
          if (!exists) {
            return [...prev, data];
          }
          return prev;
        });
        setCurrentTitle(() => {
          const existing = mapList.find((map) => map.id === data.id);
          return existing?.title || data.title;
        });
        setLoadedMapId(data.id);
      })
      .catch((error) => {
        console.error("Failed to load mindmap:", error);
        router.replace(`/brainstorm/${DEFAULT_MAP_ID}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [
    mapId,
    loadedMapId,
    mapList,
    router,
    setNodes,
    handleLabelChange,
    handleAddChild,
  ]);

  const handleTitleChange = (nextTitle: string) => {
    setCurrentTitle(nextTitle);
    setMapList((prev) =>
      prev.map((map) => (map.id === mapId ? { ...map, title: nextTitle } : map))
    );
  };

  const handleSelectMap = (nextId: string) => {
    if (nextId === mapId) {
      setIsPickerOpen(false);
      return;
    }
    setIsPickerOpen(false);
    startTransition(() => {
      router.push(`/brainstorm/${nextId}`);
    });
  };

  return (
    <div className="w-[1200px] h-[95%] bg-white my-auto rounded-[10px] border border-[#e2e8f0] overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <p className="text-[#475569] text-[14px]">Loading...</p>
        </div>
      )}

      {/* 左上角按鈕組 */}
      <div className="absolute left-[20px] top-[20px] flex items-center gap-[10px] z-20">
        {/* Mind Map 選單 */}
        <div>
          <div className="h-[45px] bg-white border border-[#E2E8F0] px-[12px] flex items-center gap-[6px] rounded-[5px]">
            <input
              value={currentTitle}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="New Mind Map"
              className="w-[160px] text-[#475569] text-[14px] font-medium bg-transparent outline-none placeholder:text-[#94a3b8]"
            />
            <button
              onClick={() => setIsPickerOpen((prev) => !prev)}
              className="h-[28px] w-[28px] flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-rounded text-[#475569] text-[20px]">
                {isPickerOpen ? "expand_less" : "expand_more"}
              </span>
            </button>
          </div>
          {isPickerOpen && (
            <div className="absolute left-0 top-[calc(100%+6px)] w-[220px] bg-white border border-[#e2e8f0] rounded-[10px] shadow-[0px_4px_10px_0px_rgba(0,0,0,0.08)] p-[6px] z-30">
              {mapList.map((map) => (
                <button
                  key={map.id}
                  onClick={() => handleSelectMap(map.id)}
                  className={`w-full text-left px-[10px] py-[6px] rounded-[8px] text-[14px] transition-colors ${
                    map.id === mapId
                      ? "bg-slate-100 text-[#475569]"
                      : "text-[#475569] hover:bg-slate-100"
                  }`}
                >
                  {map.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Save 按鈕 */}
        <Button variant="primary" icon="save">
          Save
        </Button>
      </div>

      {/* 右上角按鈕組 */}
      <div className="absolute right-[20px] top-[20px] z-20">
        <div className="h-[45px] bg-white border border-[#e2e8f0] rounded-[5px] flex items-center px-[10px] py-[5px] gap-[10px]">
          {/* Outline 按鈕 */}
          <button className="w-[135px] px-[10px] py-[5px] flex gap-[5px] items-center hover:bg-slate-50 transition-colors">
            <span className="material-symbols-rounded text-[#475569] text-[20px]">
              article
            </span>
            <span className="text-[#475569] text-[14px] font-medium">
              Outline
            </span>
          </button>

          {/* Idea Partner 按鈕 */}
          <button className="w-[135px] px-[10px] py-[5px] flex gap-[5px] items-center hover:bg-slate-50 transition-colors">
            <span className="material-symbols-rounded text-[#475569] text-[20px]">
              wb_incandescent
            </span>
            <span className="text-[#475569] text-[14px] font-medium">
              Idea Partner
            </span>
          </button>
        </div>
      </div>

      {/* ReactFlow 心智圖 */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={(changes) => {
          // 過濾掉刪除 edge 的操作，只允許其他操作
          const filteredChanges = changes.filter((change) => change.type !== 'remove');
          onEdgesChange(filteredChanges);
        }}
        onNodesDelete={(deleted) => {
          // 當用戶按下 Delete 鍵時，刪除選中的節點
          deleted.forEach((node) => handleDeleteNode(node.id));
        }}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={true}
        edgesFocusable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        deleteKeyCode={["Delete", "Backspace"]}
        proOptions={{ hideAttribution: true }}
        zoomOnDoubleClick={false}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
          style: { stroke: "#94a3b8", strokeWidth: 2 },
        }}
      />
    </div>
  );
}

export default function BrainstormPage() {
  return (
    <ReactFlowProvider>
      <BrainstormPageContent />
    </ReactFlowProvider>
  );
}
