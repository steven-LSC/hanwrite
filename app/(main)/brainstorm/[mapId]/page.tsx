"use client";

import { startTransition, useEffect, useState, useRef } from "react";
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
    }, 2000); // 延長到 2 秒，方便測試效果
  });
};

function BrainstormPageContent() {
  const params = useParams();
  const router = useRouter();
  const mapId = (params.mapId as string) || DEFAULT_MAP_ID;

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
  const [mapList, setMapList] = useState<MindmapData[]>(() =>
    Object.values(MOCK_MINDMAPS)
  );
  const loadingRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (mapId !== currentIdeaPartnerMapId) {
      setIsIdeaPartnerOpen(false);
      setHasScannedIdeaPartner(false);
      setCurrentIdeaPartnerMapId(mapId);
    }
  }, [mapId, currentIdeaPartnerMapId]);

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

    // 生成唯一的請求 ID，用於追蹤當前的載入請求
    const requestId = `${mapId}-${Date.now()}`;
    loadingRequestIdRef.current = requestId;

    setIsLoading(true);
    fetchMindmap(mapId)
      .then((data) => {
        // 只有當前的請求才更新 nodes，避免競態條件
        if (loadingRequestIdRef.current === requestId) {
          setNodes(data.nodes);
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
        }
      })
      .catch((error) => {
        // 只有當前的請求才處理錯誤
        if (loadingRequestIdRef.current === requestId) {
          console.error("Failed to load mindmap:", error);
          router.replace(`/brainstorm/${DEFAULT_MAP_ID}`);
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
      prev.map((map) => (map.id === mapId ? { ...map, title: nextTitle } : map))
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
              className="w-[160px] text-(--color-text-secondary) text-[14px] font-medium bg-transparent outline-none placeholder:text-(--color-text-tertiary)"
            />
            <button
              onClick={() => setIsPickerOpen((prev) => !prev)}
              className="h-[28px] w-[28px] flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-rounded text-(--color-text-secondary) text-[20px]">
                {isPickerOpen ? "expand_less" : "expand_more"}
              </span>
            </button>
          </div>
          {isPickerOpen && (
            <div className="absolute left-0 top-[calc(100%+6px)] w-[220px] bg-(--color-bg-card) border border-(--color-border) rounded-[10px] shadow-[0px_4px_10px_0px_rgba(0,0,0,0.08)] p-[6px] z-30">
              {mapList.map((map) => (
                <button
                  key={map.id}
                  onClick={() => handleSelectMap(map.id)}
                  className={`w-full text-left px-[10px] py-[6px] rounded-[8px] text-[14px] transition-colors ${map.id === mapId
                      ? "bg-slate-100 text-(--color-text-secondary)"
                      : "text-(--color-text-secondary) hover:bg-slate-100"
                    }`}
                >
                  {map.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Save 按鈕 */}
        <Button variant="primary" icon="save" onClick={handleSave}>
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
            className={`w-[135px] px-[10px] py-[5px] flex gap-[5px] items-center transition-colors ${isOutlineGeneratorOpen ? "bg-slate-50" : "hover:bg-slate-50"
              }`}
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
            className={`w-[135px] px-[10px] py-[5px] flex gap-[5px] items-center transition-colors ${isIdeaPartnerOpen ? "bg-slate-50" : "hover:bg-slate-50"
              }`}
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
      <Mindmap initialNodes={nodes} onNodesChange={setNodes} />
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
