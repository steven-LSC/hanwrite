"use client";

import { startTransition, useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { type Node, ReactFlowProvider } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { IdeaPartner } from "@/components/brainstorm/idea-partner";
import { Mindmap } from "@/components/brainstorm/mindmap";
import { OutlineGenerator } from "@/components/brainstorm/outline-generator";
import { type MindmapData } from "@/components/brainstorm/use-mindmap-data";
import { type OutlineData } from "@/lib/types";
import { getSavedOutline } from "@/lib/data/outline";
import { findRootNode, calculateTreePositions } from "@/lib/mindmap-utils";
import { getAllMindmaps, getMindmapById, createMindmap } from "@/lib/data/mindmap";
import { type MindmapMetadata } from "@/components/brainstorm/use-mindmap-data";

const fetchMindmap = async (mapId: string): Promise<MindmapData> => {
  // getMindmapById 內部已經有延遲，不需要在這裡再加延遲
  return getMindmapById(mapId);
};

function BrainstormPageContent() {
  const params = useParams();
  const router = useRouter();
  const mapId = params.mapId as string;

  const [nodes, setNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadedMapId, setLoadedMapId] = useState<string | null>(null);
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const loadingRequestIdRef = useRef<string | null>(null);
  const createRequestIdRef = useRef<string | null>(null);

  // 載入所有心智圖列表，並處理建立新 mindmap 的流程
  useEffect(() => {
    const loadAllMindmaps = async () => {
      try {
        const currentMapId = params.mapId as string;
        
        // 如果 mapId 是 "loading"，載入所有 mindmaps 並導向到最新的
        if (currentMapId === "loading") {
          setIsLoading(true);
          setIsPickerOpen(false);
          setMapList([]); // 清空列表，顯示為空
          
          try {
            const allMaps = await getAllMindmaps();
            setMapList(allMaps);
            
            if (allMaps.length > 0) {
              // 找到最新的（優先 updatedAt，沒有則用 createdAt）
              const latestMap = [...allMaps].sort((a, b) => {
                const aTime = a.updatedAt.getTime();
                const bTime = b.updatedAt.getTime();
                return bTime - aTime;
              })[0];
              router.replace(`/brainstorm/${latestMap.id}`);
            } else {
              // 如果沒有任何 mindmap，導向到 /new 建立第一個
              router.replace("/brainstorm/new");
            }
          } catch (error) {
            console.error("Failed to load mindmaps:", error);
            setIsLoading(false);
            setMapList([]);
            // 如果載入失敗，導向到 /new
            router.replace("/brainstorm/new");
          }
          return;
        }

        // 如果 mapId 是 "new"，建立新的 mindmap
        if (currentMapId === "new") {
          // 生成唯一的請求 ID，用於追蹤當前的創建請求
          const requestId = `create-${Date.now()}-${Math.random()}`;
          
          // 如果已經有正在進行的創建請求，直接返回
          if (createRequestIdRef.current) {
            return;
          }
          
          createRequestIdRef.current = requestId;
          setIsLoading(true);
          setIsPickerOpen(false);
          
          try {
            // 先建立新的 mindmap
            const newMindmap = await createMindmap();
            
            // 只有當前的請求才處理結果，避免競態條件
            if (createRequestIdRef.current === requestId) {
              // 重新載入所有 mindmaps（包含新創建的）
              const allMaps = await getAllMindmaps();
              setMapList(allMaps);
              // 清除創建請求 ID
              createRequestIdRef.current = null;
              // 導向到新的 mindmap
              router.replace(`/brainstorm/${newMindmap.id}`);
            }
          } catch (error) {
            // 只有當前的請求才處理錯誤
            if (createRequestIdRef.current === requestId) {
              console.error("Failed to create mindmap:", error);
              setIsLoading(false);
              createRequestIdRef.current = null;
              // 如果建立失敗，載入現有的 mindmaps
              try {
                const allMaps = await getAllMindmaps();
                setMapList(allMaps);
                if (allMaps.length > 0) {
                  const latestMap = [...allMaps].sort((a, b) => {
                    const aTime = a.updatedAt.getTime();
                    const bTime = b.updatedAt.getTime();
                    return bTime - aTime;
                  })[0];
                  router.replace(`/brainstorm/${latestMap.id}`);
                }
              } catch (loadError) {
                console.error("Failed to load mindmaps:", loadError);
                setMapList([]);
              }
            }
          }
          return;
        }

        // 正常載入所有 mindmaps（當 mapId 是有效的 mindmap id 時）
        const allMaps = await getAllMindmaps();
        setMapList(allMaps);

        // 如果 URL 沒有 mapId，自動導向到最新的心智圖
        if (!currentMapId) {
          if (allMaps.length > 0) {
            // 找到最新的（優先 updatedAt，沒有則用 createdAt）
            const latestMap = [...allMaps].sort((a, b) => {
              const aTime = a.updatedAt.getTime();
              const bTime = b.updatedAt.getTime();
              return bTime - aTime;
            })[0];
            router.replace(`/brainstorm/${latestMap.id}`);
          }
        }
      } catch (error) {
        console.error("Failed to load mindmaps:", error);
        setMapList([]);
      }
    };
    loadAllMindmaps();
  }, [params.mapId, router]);

  useEffect(() => {
    if (mapId !== currentIdeaPartnerMapId) {
      setIsIdeaPartnerOpen(false);
      setHasScannedIdeaPartner(false);
      setCurrentIdeaPartnerMapId(mapId);
      setSelectedNodeId(null); // 切換 mapId 時清除選中狀態
    }
  }, [mapId, currentIdeaPartnerMapId]);

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

  // 載入已儲存的 outline
  useEffect(() => {
    const loadSavedOutline = async () => {
      try {
        const outline = await getSavedOutline(mapId);
        setSavedOutline(outline);
      } catch (error) {
        console.error("Failed to load saved outline:", error);
        setSavedOutline(null);
      }
    };

    loadSavedOutline();
  }, [mapId]);

  // 當 mapId 改變時，立即更新 currentTitle（從 mapList 中取得）
  useEffect(() => {
    const existingMap = mapList.find((map) => map.id === mapId);
    if (existingMap) {
      setCurrentTitle(existingMap.title);
    }
  }, [mapId, mapList]);

  const handleOutlineClose = async () => {
    setIsOutlineGeneratorOpen(false);
    // 重新載入 savedOutline（因為 Save 後可能已更新）
    try {
      const outline = await getSavedOutline(mapId);
      setSavedOutline(outline);
    } catch (error) {
      console.error("Failed to reload saved outline:", error);
    }
  };

  useEffect(() => {
    if (!mapId || mapId === loadedMapId) {
      return;
    }

    // 如果 mapId 是特殊值（"loading" 或 "new"），不應該在這裡載入
    // 這些值應該由第一個 useEffect 處理
    if (mapId === "loading" || mapId === "new") {
      return;
    }

    // 生成唯一的請求 ID，用於追蹤當前的載入請求
    const requestId = `${mapId}-${Date.now()}`;
    loadingRequestIdRef.current = requestId;

    setIsLoading(true);
    fetchMindmap(mapId)
      .then((data) => {
        // 只有當前的請求才更新 nodes，避免競態條件
        if (loadingRequestIdRef.current === requestId) {
          setNodes(data.nodes);
          setCurrentTitle(data.title);
          setLoadedMapId(data.id);
        }
      })
      .catch((error) => {
        // 只有當前的請求才處理錯誤
        if (loadingRequestIdRef.current === requestId) {
          console.error("Failed to load mindmap:", error);
          // 如果載入失敗，導向到最新的心智圖
          if (mapList.length > 0) {
            const latestMap = [...mapList].sort((a, b) => {
              const aTime = a.updatedAt.getTime();
              const bTime = b.updatedAt.getTime();
              return bTime - aTime;
            })[0];
            router.replace(`/brainstorm/${latestMap.id}`);
          }
        }
      })
      .finally(() => {
        // 只有當前的請求才關閉 loading
        if (loadingRequestIdRef.current === requestId) {
          setIsLoading(false);
          loadingRequestIdRef.current = null;
        }
      });
  }, [mapId, loadedMapId, mapList, router]);

  const handleTitleChange = (nextTitle: string) => {
    setCurrentTitle(nextTitle);
    setMapList((prev) =>
      prev.map((map) =>
        map.id === mapId ? { ...map, title: nextTitle } : map
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    // 模擬儲存過程，延遲 1.5 秒
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSaving(false);
    // 這裡可以添加實際的儲存邏輯
    console.log("Saving mindmap:", { mapId, nodes, title: currentTitle });
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

  const handleCreateNewMindmap = () => {
    setIsPickerOpen(false);
    router.push("/brainstorm/new");
  };

  const handleAddBlockFromIdeaPartner = async (
    nodeId: string,
    ideaText: string
  ): Promise<boolean> => {
    // 驗證 idea text 不為空
    if (!ideaText || !ideaText.trim()) {
      return false;
    }

    // 根據 nodeId 找到對應的 node
    const targetNode = nodes.find((node) => node.id === nodeId);
    if (!targetNode) {
      console.error(`Node with id ${nodeId} not found`);
      return false;
    }

    // 判斷方向
    let direction: "left" | "right";
    const isRoot = !targetNode.data.parentId;
    if (isRoot) {
      // 如果是 root，隨機選擇 left 或 right
      direction = Math.random() < 0.5 ? "left" : "right";
    } else {
      // 如果不是 root，繼承其 direction
      direction =
        (targetNode.data.direction as "left" | "right") || "right";
    }

    // 新增子節點
    const newNodeId = `node-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      position: { x: 0, y: 0 }, // 位置會由 calculateTreePositions 計算
      data: {
        label: ideaText.trim(),
        parentId: nodeId,
        direction: direction,
        isNew: false,
      },
    };

    // 更新 nodes
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
              disabled={isLoading}
              className={`h-[28px] w-[28px] flex items-center justify-center rounded-full transition-colors ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100"}`}
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
        <Button variant="primary" icon="save" onClick={handleSave} disabled={isLoading}>
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
        onScan={() => setHasScannedIdeaPartner(true)}
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
        <div className={`w-full h-full ${isLoading ? "pointer-events-none opacity-50" : ""}`}>
          <Mindmap
            initialNodes={nodesWithSelection}
            onNodesChange={(updatedNodes) => {
              // 保留 selected 狀態
              const nodesWithPreservedSelection = updatedNodes.map((node) => ({
                ...node,
                selected: node.id === selectedNodeId,
              }));
              setNodes(nodesWithPreservedSelection);
            }}
          />
        </div>
        {isLoading && (
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
