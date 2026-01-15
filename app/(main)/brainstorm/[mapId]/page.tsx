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
  Background,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import {
  findRootNode,
  findClosestParentNode,
  calculateNodePosition,
  buildTreeStructure,
  recenterMindmap,
} from "@/lib/mindmap-utils";

type MindmapData = {
  id: string;
  title: string;
  nodes: Node[];
  edges: Edge[];
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
        data: { label: "Main Topic" },
      },
      {
        id: "idea-1",
        position: { x: 200, y: -100 },
        data: { label: "Idea 1" },
      },
      {
        id: "idea-2",
        position: { x: 200, y: 100 },
        data: { label: "Idea 2" },
      },
    ],
    edges: [
      {
        id: "edge-root-1",
        source: "root",
        target: "idea-1",
        type: "smoothstep",
      },
      {
        id: "edge-root-2",
        source: "root",
        target: "idea-2",
        type: "smoothstep",
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
        data: { label: "Study Plan" },
      },
      {
        id: "focus-1",
        position: { x: 220, y: -140 },
        data: { label: "Vocabulary" },
      },
      {
        id: "focus-2",
        position: { x: 220, y: 0 },
        data: { label: "Grammar" },
      },
      {
        id: "focus-3",
        position: { x: 220, y: 140 },
        data: { label: "Writing" },
      },
    ],
    edges: [
      {
        id: "edge-1-1",
        source: "root-1",
        target: "focus-1",
        type: "smoothstep",
      },
      {
        id: "edge-1-2",
        source: "root-1",
        target: "focus-2",
        type: "smoothstep",
      },
      {
        id: "edge-1-3",
        source: "root-1",
        target: "focus-3",
        type: "smoothstep",
      },
    ],
  },
  "map-2": {
    id: "map-2",
    title: "Essay Outline",
    nodes: [
      {
        id: "root-2",
        position: { x: 0, y: 0 },
        data: { label: "Essay Outline" },
      },
    ],
    edges: [],
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

// 自訂 Node Component
function CustomNode({ data, selected, id }: NodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label as string);
  const [isHovered, setIsHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { getEdges } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  // 檢查是否有連線
  const edges = getEdges();
  const hasIncomingEdgeLeft = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "target-left"
  );
  const hasIncomingEdgeRight = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "target-right"
  );
  const hasOutgoingEdgeLeft = edges.some(
    (edge) => edge.source === id && edge.sourceHandle === "source-left"
  );
  const hasOutgoingEdgeRight = edges.some(
    (edge) => edge.source === id && edge.sourceHandle === "source-right"
  );

  // 當 Handle 顯示狀態改變時，更新 node internals
  useEffect(() => {
    updateNodeInternals(id);
  }, [
    id,
    hasIncomingEdgeLeft,
    hasIncomingEdgeRight,
    hasOutgoingEdgeLeft,
    hasOutgoingEdgeRight,
    isHovered,
    updateNodeInternals,
  ]);

  // 如果是新 node，自動進入編輯模式
  useEffect(() => {
    if (data.isNew) {
      setIsEditing(true);
    }
  }, [data.isNew]);

  const handleDoubleClick = () => {
    setIsEditing(true);
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
      // 使用 requestAnimationFrame 確保 DOM 已經渲染
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // 如果是新 node，游標在開頭；否則在末尾
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

  // 調整 textarea 高度以適應內容
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = parseFloat(
        getComputedStyle(textareaRef.current).lineHeight
      );
      textareaRef.current.style.height = `${Math.max(
        scrollHeight,
        minHeight
      )}px`;
    }
  }, [label, isEditing]);

  // 處理 Handle 點擊，防止觸發 node 的雙擊事件
  const handleHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`px-4 py-2 rounded-lg border border-(--color-border) transition-all cursor-pointer outline-none focus:outline-none focus-visible:outline-none min-h-[1.5em] relative ${
        selected
          ? "bg-blue-50"
          : "bg-white border-gray-300 hover:border-gray-400"
      }`}
    >
      {/* 左邊 target Handle：有連線時顯示，或 hover 且沒有連線時顯示 */}
      {(hasIncomingEdgeLeft || (isHovered && !hasIncomingEdgeLeft)) && (
        <Handle
          id="target-left"
          type="target"
          position={Position.Left}
          onMouseDown={handleHandleMouseDown}
          className={hasIncomingEdgeLeft ? "" : "opacity-50"}
          style={{
            pointerEvents: "all",
            zIndex: 10,
          }}
        />
      )}
      {/* 右邊 target Handle：有連線時顯示，或 hover 且沒有連線時顯示 */}
      {(hasIncomingEdgeRight || (isHovered && !hasIncomingEdgeRight)) && (
        <Handle
          id="target-right"
          type="target"
          position={Position.Right}
          onMouseDown={handleHandleMouseDown}
          className={hasIncomingEdgeRight ? "" : "opacity-50"}
          style={{
            pointerEvents: "all",
            zIndex: 10,
          }}
        />
      )}
      {/* 左邊 source Handle：有連線時顯示，或 hover 且沒有連線時顯示 */}
      {(hasOutgoingEdgeLeft || (isHovered && !hasOutgoingEdgeLeft)) && (
        <Handle
          id="source-left"
          type="source"
          position={Position.Left}
          onMouseDown={handleHandleMouseDown}
          className={hasOutgoingEdgeLeft ? "" : "opacity-50"}
          style={{
            pointerEvents: "all",
            zIndex: 10,
          }}
        />
      )}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full max-w-[200px] bg-transparent outline-none text-[#475569] text-[14px] font-medium text-center resize-none overflow-hidden min-h-[1.5em]"
          rows={1}
          style={{
            lineHeight: "1.5",
            pointerEvents: "auto",
          }}
        />
      ) : (
        <div className="text-[#475569] text-[14px] font-medium text-center wrap-break-word max-w-[200px] min-h-[1.5em]">
          {label || "\u00A0"}
        </div>
      )}
      {/* 右邊 source Handle：有連線時顯示，或 hover 且沒有連線時顯示 */}
      {(hasOutgoingEdgeRight || (isHovered && !hasOutgoingEdgeRight)) && (
        <Handle
          id="source-right"
          type="source"
          position={Position.Right}
          onMouseDown={handleHandleMouseDown}
          className={hasOutgoingEdgeRight ? "" : "opacity-50"}
          style={{
            pointerEvents: "all",
            zIndex: 10,
          }}
        />
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

  // Edge 預設樣式設定
  const defaultEdgeOptions = useMemo(
    () => ({
      type: "smoothstep" as const,
      style: { strokeWidth: 1.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 15,
        height: 15,
      },
    }),
    []
  );

  // 處理節點 label 變更
  const handleLabelChange = useCallback(
    (nodeId: string, newLabel: string) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  label: newLabel,
                  isNew: false, // 移除 isNew 標記
                },
              }
            : node
        )
      );
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
          position: { x: 0, y: 0 }, // root 節點在原點
          data: {
            label: "",
            isNew: true,
            onLabelChange: (newLabel: string) =>
              handleLabelChange(newNodeId, newLabel),
          },
        };
        setNodes([newNode]);
        return;
      }

      // 1. 找出根節點
      const rootNode = findRootNode(nodes, edges);

      // 2. 判斷左右側
      const isRightSide = position.x > rootNode.position.x;

      // 3. 找出最近的父節點
      const parentNode = findClosestParentNode(
        nodes,
        edges,
        position,
        rootNode,
        isRightSide
      );

      // 4. 計算新節點位置（基於 tree 結構）
      const treeStructure = buildTreeStructure(nodes, edges, rootNode.id);
      const newPosition = calculateNodePosition(
        treeStructure,
        parentNode,
        position,
        isRightSide,
        rootNode
      );

      // 5. 生成新的 node ID（使用時間戳確保唯一性）
      const newNodeId = `node-${Date.now()}`;

      // 6. 創建新 node
      const newNode: Node = {
        id: newNodeId,
        position: newPosition,
        data: {
          label: "",
          isNew: true, // 標記為新 node，讓它自動進入編輯模式
          onLabelChange: (newLabel: string) =>
            handleLabelChange(newNodeId, newLabel),
        },
      };

      // 7. 建立連線（根據左右側決定 Handle）
      const newEdge: Edge = {
        id: `edge-${parentNode.id}-${newNodeId}-${Date.now()}`,
        source: parentNode.id,
        target: newNodeId,
        sourceHandle: isRightSide ? "source-right" : "source-left",
        targetHandle: isRightSide ? "target-left" : "target-right",
        type: "smoothstep",
      };

      // 8. 更新 nodes 和 edges
      setNodes((nds) => {
        const updatedNodes = [...nds, newNode];
        // 重新計算位置並置中
        return recenterMindmap(updatedNodes, rootNode.id);
      });
      setEdges((eds) => [...eds, newEdge]);
    },
    [screenToFlowPosition, nodes, edges, handleLabelChange, setNodes, setEdges]
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
        // 將 nodes 資料加入 onLabelChange callback
        const nodesWithCallback = data.nodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            onLabelChange: (newLabel: string) =>
              handleLabelChange(node.id, newLabel),
          },
        }));
        setNodes(nodesWithCallback);
        setEdges(data.edges);
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
    setEdges,
    setNodes,
    handleLabelChange,
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

  // 處理連線建立
  const handleConnect = useCallback(
    (params: {
      source: string;
      target: string;
      sourceHandle?: string | null;
      targetHandle?: string | null;
    }) => {
      // 驗證連線：確保是正確的 Handle 配對
      const validPairs = [
        { source: "source-right", target: "target-left" }, // 右側連線
        { source: "source-left", target: "target-right" }, // 左側連線
      ];

      const isValidPair = validPairs.some(
        (pair) =>
          params.sourceHandle === pair.source &&
          params.targetHandle === pair.target
      );

      if (!isValidPair) {
        return;
      }

      // 防止自己連自己
      if (params.source === params.target) {
        return;
      }

      // 檢查是否已經存在相同的連線
      const existingEdge = edges.find(
        (edge) => edge.source === params.source && edge.target === params.target
      );
      if (existingEdge) {
        return;
      }

      const newEdge: Edge = {
        id: `edge-${params.source}-${params.target}-${Date.now()}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        type: "smoothstep",
      };
      setEdges((eds) => [...eds, newEdge]);
    },
    [setEdges, edges]
  );

  // 連線驗證函數：確保連線方向正確
  const isValidConnection = useCallback(
    (connection: {
      source: string;
      target: string;
      sourceHandle?: string | null;
      targetHandle?: string | null;
    }) => {
      // 允許的 Handle 配對
      const validPairs = [
        { source: "source-right", target: "target-left" }, // 右側連線
        { source: "source-left", target: "target-right" }, // 左側連線
      ];

      const isValidPair = validPairs.some(
        (pair) =>
          connection.sourceHandle === pair.source &&
          connection.targetHandle === pair.target
      );

      if (!isValidPair) {
        return false;
      }

      // 防止自己連自己
      if (connection.source === connection.target) {
        return false;
      }

      // 防止重複連線
      const exists = edges.some(
        (edge) =>
          edge.source === connection.source && edge.target === connection.target
      );
      if (exists) {
        return false;
      }

      return true;
    },
    [edges]
  );

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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={handlePaneClick}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        nodesConnectable={true}
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        zoomOnDoubleClick={false}
      >
        <Background gap={16} color="#e2e8f0" />
        <Controls />
      </ReactFlow>
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
