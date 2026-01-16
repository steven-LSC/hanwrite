"use client";

import { startTransition, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { type Node, ReactFlowProvider } from "@xyflow/react";
import { Button } from "@/components/ui/button";
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
    }, 200);
  });
};

function BrainstormPageContent() {
  const params = useParams();
  const router = useRouter();
  const mapId = (params.mapId as string) || DEFAULT_MAP_ID;

  const [nodes, setNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

    setIsLoading(true);
    fetchMindmap(mapId)
      .then((data) => {
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
      })
      .catch((error) => {
        console.error("Failed to load mindmap:", error);
        router.replace(`/brainstorm/${DEFAULT_MAP_ID}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [mapId, loadedMapId, mapList, router]);

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
    <div className="w-[1200px] h-[95%] bg-(--color-bg-card) my-auto rounded-[10px] border border-(--color-border) overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-(--color-bg-card)/80 z-10">
          <p className="text-(--color-text-secondary) text-[14px]">
            Loading...
          </p>
        </div>
      )}

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
                  className={`w-full text-left px-[10px] py-[6px] rounded-[8px] text-[14px] transition-colors ${
                    map.id === mapId
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
        <Button variant="primary" icon="save">
          Save
        </Button>
      </div>

      {/* 右上角按鈕組 */}
      <div className="absolute right-[20px] top-[20px] z-20">
        <div className="h-[45px] bg-(--color-bg-card) border border-(--color-border) rounded-[5px] flex items-center px-[10px] py-[5px] gap-[10px]">
          {/* Outline 按鈕 */}
          <button
            onClick={() => setIsOutlineGeneratorOpen(true)}
            className={`w-[135px] px-[10px] py-[5px] flex gap-[5px] items-center transition-colors ${
              isOutlineGeneratorOpen ? "bg-slate-50" : "hover:bg-slate-50"
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
            className={`w-[135px] px-[10px] py-[5px] flex gap-[5px] items-center transition-colors ${
              isIdeaPartnerOpen ? "bg-slate-50" : "hover:bg-slate-50"
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
