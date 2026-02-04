"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { type Node, ReactFlowProvider } from "@xyflow/react";
import { createId } from "@paralleldrive/cuid2";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { IdeaPartner } from "@/components/brainstorm/idea-partner";
import { Mindmap } from "@/components/brainstorm/mindmap";
import { OutlineGenerator } from "@/components/brainstorm/outline-generator";
import { type OutlineData } from "@/lib/types";
import { findRootNode, calculateTreePositions } from "@/lib/mindmap-utils";
import { getAllMindmaps, createMindmap, getMindmapById, updateMindmap } from "@/lib/data/mindmap";
import { type MindmapMetadata } from "@/components/brainstorm/use-mindmap-data";
import { logBehavior } from "@/lib/log-behavior";

const TEMP_MAP_ID = "new";

const createTempRootNode = (): Node => ({
  id: createId(),
  position: { x: 0, y: 0 },
  data: {
    label: "",
    parentId: null,
    isNew: true,
  },
});

function BrainstormPageContent() {
  const params = useParams();
  const router = useRouter();
  const mapId = params.mapId as string;

  const [nodes, setNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTitle, setCurrentTitle] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isIdeaPartnerOpen, setIsIdeaPartnerOpen] = useState(false);
  const [hasScannedIdeaPartner, setHasScannedIdeaPartner] = useState(false);
  const [currentIdeaPartnerMapId, setCurrentIdeaPartnerMapId] = useState<
    string | undefined
  >(undefined);
  const [isOutlineGeneratorOpen, setIsOutlineGeneratorOpen] = useState(false);
  const [savedOutline, setSavedOutline] = useState<OutlineData | null>(null);
  const [mapList, setMapList] = useState<MindmapMetadata[]>([]);
  const [isMapListLoaded, setIsMapListLoaded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const loadingRequestIdRef = useRef<string | null>(null);

  // 初始化：載入所有心智圖列表
  useEffect(() => {
    const loadMindmaps = async () => {
      try {
        const allMaps = await getAllMindmaps();
        setMapList(allMaps);
        setIsMapListLoaded(true);

        // 處理 "loading" 路由：載入後導向到最新的心智圖
        if (mapId === "loading") {
          if (allMaps.length > 0) {
            // 後端已按 updatedAt 降序排序，第一個就是最新的
            router.replace(`/brainstorm/${allMaps[0].id}`);
          } else {
            router.replace("/brainstorm/new");
          }
          return;
        }

        // 如果當前沒有 mapId，導向到 /new
        if (!mapId) {
          router.replace("/brainstorm/new");
        }
      } catch (error) {
        console.error("Failed to load mindmaps:", error);
        setMapList([]);
        setIsMapListLoaded(true);
        router.replace("/brainstorm/new");
      }
    };
    loadMindmaps();
  }, [mapId, router]);

  // 處理 "new" 路由：初始化空白狀態
  useEffect(() => {
    if (mapId === TEMP_MAP_ID) {
      setIsPickerOpen(false);
      const tempRootNode = createTempRootNode();
      setNodes([tempRootNode]);
      setCurrentTitle("New Mind Map");
    }
  }, [mapId]);

  // 載入現有心智圖資料
  useEffect(() => {
    if (!mapId || mapId === TEMP_MAP_ID || mapId === "loading") {
      return;
    }

    // 生成唯一的請求 ID，用於追蹤當前的載入請求
    const requestId = `${mapId}-${Date.now()}`;
    loadingRequestIdRef.current = requestId;

    // 先清空舊的狀態，避免顯示舊內容
    setNodes([]);
    setCurrentTitle("");

    setIsLoading(true);
    getMindmapById(mapId)
      .then((data) => {
        // 只有當前的請求才更新狀態，避免競態條件
        if (loadingRequestIdRef.current === requestId) {
          setNodes(data.nodes);
          setCurrentTitle(data.title);
          setSavedOutline(data.outline ?? null);
        }
      })
      .catch((error) => {
        // 只有當前的請求才處理錯誤
        if (loadingRequestIdRef.current === requestId) {
          console.error("Failed to load mindmap:", error);
        }
      })
      .finally(() => {
        // 只有當前的請求才關閉 loading
        if (loadingRequestIdRef.current === requestId) {
          setIsLoading(false);
          loadingRequestIdRef.current = null;
        }
      });
  }, [mapId]);

  useEffect(() => {
    if (mapId !== currentIdeaPartnerMapId) {
      setIsIdeaPartnerOpen(false);
      setHasScannedIdeaPartner(false);
      setCurrentIdeaPartnerMapId(mapId);
      setSelectedNodeId(null);
    }
  }, [mapId, currentIdeaPartnerMapId]);

  // 監聽 nodes 變化，當有新 node（isNew: true）時自動選中
  useEffect(() => {
    const newNode = nodes.find((node) => node.data.isNew === true);
    if (newNode && newNode.id !== selectedNodeId) {
      setSelectedNodeId(newNode.id);
    }
  }, [nodes, selectedNodeId]);

  // 根據 selectedNodeId 更新 nodes 的 selected 屬性
  const nodesWithSelection = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
    }));
  }, [nodes, selectedNodeId]);

  const handleNodeSelect = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  };

  // outline 會在載入 mindmap 時一起取得，不需要單獨載入

  const handleOutlineClose = async () => {
    setIsOutlineGeneratorOpen(false);
    if (mapId === TEMP_MAP_ID) {
      return;
    }
    // 重新載入 mindmap 以取得最新的 outline
    try {
      const data = await getMindmapById(mapId);
      setSavedOutline(data.outline ?? null);
    } catch (error) {
      console.error("Failed to reload mindmap:", error);
    }
  };

  // Title 輸入框改變時，同步更新 mapList（前端顯示）
  const handleTitleChange = (newTitle: string) => {
    setCurrentTitle(newTitle);

    // 如果是已存在的心智圖，同步更新 mapList
    if (mapId !== TEMP_MAP_ID) {
      setMapList((prev) =>
        prev.map((map) => (map.id === mapId ? { ...map, title: newTitle } : map))
      );
    }
  };

  // 新增或更新心智圖
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (mapId === TEMP_MAP_ID) {
        // 新增心智圖
        // 創建新心智圖（只設置 title）
        const newMindmap = await createMindmap(currentTitle);

        // 更新 nodes（需要先創建才能更新）
        const savedMindmap = await updateMindmap(newMindmap.id, { nodes });

        // 將新創建的心智圖插入到 mapList 的最前面（因為後端已按 updatedAt 降序排序）
        setMapList((prev) => [newMindmap, ...prev]);

        // 更新 title（確保與後端同步）
        setCurrentTitle(savedMindmap.title);

        // 更新 URL
        router.replace(`/brainstorm/${savedMindmap.id}`);
      } else {
        // 更新現有心智圖
        await updateMindmap(mapId, {
          title: currentTitle,
          nodes,
        });

        // 更新 mapList 中的 title（前端顯示）
        setMapList((prev) =>
          prev.map((map) => (map.id === mapId ? { ...map, title: currentTitle } : map))
        );
      }
    } catch (error) {
      console.error("Failed to save mindmap:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectMap = (nextId: string) => {
    if (nextId === mapId) {
      setIsPickerOpen(false);
      return;
    }
    setIsPickerOpen(false);
    router.push(`/brainstorm/${nextId}`);
  };

  const handleCreateNewMindmap = () => {
    setIsPickerOpen(false);
    router.push("/brainstorm/new");
  };

  const handleAddBlockFromIdeaPartner = async (
    nodeId: string,
    ideaText: string
  ): Promise<boolean> => {
    if (!ideaText || !ideaText.trim()) {
      return false;
    }

    const targetNode = nodes.find((node) => node.id === nodeId);
    if (!targetNode) {
      console.error(`Node with id ${nodeId} not found`);
      return false;
    }

    let direction: "left" | "right";
    const isRoot = !targetNode.data.parentId;
    if (isRoot) {
      direction = Math.random() < 0.5 ? "left" : "right";
    } else {
      direction =
        (targetNode.data.direction as "left" | "right") || "right";
    }

    const newNodeId = createId();
    const newNode: Node = {
      id: newNodeId,
      position: { x: 0, y: 0 },
      data: {
        label: ideaText.trim(),
        parentId: nodeId,
        direction: direction,
        isNew: false,
      },
    };

    const updatedNodes = [...nodes, newNode];
    const root = findRootNode(updatedNodes);
    const positionedNodes = root
      ? calculateTreePositions(updatedNodes, root.id)
      : updatedNodes;

    setNodes(positionedNodes);
    return true;
  };

  return (
    <div className="w-[1200px] h-[95%] bg-(--color-bg-card) my-auto rounded-[10px] border border-(--color-border) overflow-hidden relative">
      {/* 左上角按鈕組 */}
      <div className="absolute left-[20px] top-[20px] flex items-center gap-[10px] z-20">
        {/* Mind Map 選單 */}
        <div>
          <div className="h-[45px] bg-(--color-bg-card) border border-(--color-border) px-[12px] flex items-center gap-[6px] rounded-[5px]">
            <input
              value={currentTitle}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="New Mind Map"
              spellCheck={false}
              className="w-[160px] text-(--color-text-secondary) text-[14px] font-medium bg-transparent outline-none placeholder:text-(--color-text-tertiary)"
            />
            <button
              onClick={() => setIsPickerOpen((prev) => !prev)}
              disabled={isLoading || (isMapListLoaded && mapList.length === 0)}
              className={`h-[28px] w-[28px] flex items-center justify-center rounded-full transition-colors ${isLoading || (isMapListLoaded && mapList.length === 0) ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100"}`}
            >
              <span className="material-symbols-rounded text-(--color-text-secondary) text-[20px]">
                {isPickerOpen ? "expand_less" : "expand_more"}
              </span>
            </button>
          </div>
          {isPickerOpen && (
            <div className="absolute left-0 top-[calc(100%+6px)] w-[220px] bg-(--color-bg-card) border border-(--color-border) rounded-[10px] shadow-[0px_4px_10px_0px_rgba(0,0,0,0.08)] p-[6px] z-30 flex flex-col">
              {/* 可滾動的 mindmap 列表區域 */}
              <div className="overflow-y-auto scrollbar-hide max-h-[200px]">
                {mapList.map((map) => (
                  <button
                    key={map.id}
                    onClick={() => handleSelectMap(map.id)}
                    disabled={isLoading}
                    className={`w-full text-left px-[10px] py-[6px] rounded-[8px] text-[14px] transition-colors ${map.id === mapId
                      ? "bg-slate-100 text-(--color-text-secondary)"
                      : "text-(--color-text-secondary) hover:bg-slate-100"
                      } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {map.title}
                  </button>
                ))}
              </div>

              {/* 分隔線 */}
              <div className="border-t border-(--color-border) my-[6px]" />

              {/* 固定的 New MindMap 按鈕 */}
              <button
                onClick={handleCreateNewMindmap}
                disabled={isLoading}
                className={`w-full text-left px-[10px] py-[6px] rounded-[8px] text-[14px] text-(--color-text-secondary) transition-colors ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100"}`}
              >
                + New MindMap
              </button>
            </div>
          )}
        </div>

        {/* Save 按鈕 */}
        <Button
          variant="primary"
          icon="save"
          onClick={handleSave}
          disabled={isLoading || isSaving}
        >
          Save
        </Button>
        {isSaving && <StatusIndicator text="saving" />}
        {isLoading && <StatusIndicator text="loading" />}
      </div>

      {/* 右上角按鈕組 */}
      <div className="absolute right-[20px] top-[20px] z-20">
        <div className="h-[45px] bg-(--color-bg-card) border border-(--color-border) rounded-[5px] flex items-center px-[10px] py-[5px] gap-[10px]">
          {/* Outline 按鈕 */}
          <button
            onClick={() => setIsOutlineGeneratorOpen(true)}
            disabled={isLoading}
            className={`w-[135px] px-[10px] py-[5px] flex gap-[5px] items-center transition-colors ${isOutlineGeneratorOpen ? "bg-slate-50" : "hover:bg-slate-50"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="material-symbols-rounded text-(--color-text-secondary) text-[20px]">
              article
            </span>
            <span className="text-(--color-text-secondary) text-[14px] font-medium">
              Outline
            </span>
          </button>

          {/* Idea Partner 按鈕 */}
          <button
            onClick={() => setIsIdeaPartnerOpen((prev) => !prev)}
            disabled={isLoading}
            className={`w-[135px] px-[10px] py-[5px] flex gap-[5px] items-center transition-colors ${isIdeaPartnerOpen ? "bg-slate-50" : "hover:bg-slate-50"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="material-symbols-rounded text-(--color-text-secondary) text-[20px]">
              wb_incandescent
            </span>
            <span className="text-(--color-text-secondary) text-[14px] font-medium">
              Idea Partner
            </span>
          </button>
        </div>
      </div>

      <IdeaPartner
        isOpen={isIdeaPartnerOpen}
        hasScanned={hasScannedIdeaPartner}
        onScan={() => {
          logBehavior("idea-partner-scan");
          setHasScannedIdeaPartner(true);
        }}
        onAddBlock={handleAddBlockFromIdeaPartner}
        nodes={nodes}
        onNodeSelect={handleNodeSelect}
      />

      <OutlineGenerator
        isOpen={isOutlineGeneratorOpen}
        onClose={handleOutlineClose}
        title={currentTitle}
        nodes={nodes}
        mapId={mapId}
        savedOutline={savedOutline}
      />

      {/* 心智圖 */}
      <div className="relative w-full h-full">
        <div
          className={`w-full h-full ${isLoading || isSaving ? "pointer-events-none opacity-50" : ""
            }`}
        >
          <Mindmap
            initialNodes={nodesWithSelection}
            mapId={mapId}
            onNodesChange={(updatedNodes) => {
              const nodesWithPreservedSelection = updatedNodes.map((node) => ({
                ...node,
                selected: node.id === selectedNodeId,
              }));
              setNodes(nodesWithPreservedSelection);
            }}
            onCanvasClick={() => setIsPickerOpen(false)}
          />
        </div>
        {(isLoading || isSaving) && (
          <div className="absolute inset-0 bg-black/5 z-50 pointer-events-none" />
        )}
      </div>
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
