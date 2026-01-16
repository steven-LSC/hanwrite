"use client";

import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Mindmap } from "@/components/brainstorm/mindmap";
import {
  type MindmapData,
  prepareMindmapNodes,
} from "@/components/brainstorm/use-mindmap-data";
import { type OutlineData, type ReferencePanelData } from "@/lib/types";
import { getAllMindmaps } from "@/lib/data/mindmap";
import { getSavedOutline } from "@/lib/data/outline";

export interface ReferencePanelHandle {
  openModal: () => void;
}

interface ReferencePanelProps {
  initialData?: ReferencePanelData | null;
  onDataChange?: (data: ReferencePanelData) => void;
}

export const ReferencePanel = forwardRef<
  ReferencePanelHandle,
  ReferencePanelProps
>(({ initialData, onDataChange }, ref) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mindmaps, setMindmaps] = useState<MindmapData[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedOutline, setSelectedOutline] = useState<OutlineData | null>(
    null
  );
  const [isLoadingMindmaps, setIsLoadingMindmaps] = useState(false);
  const [isLoadingOutline, setIsLoadingOutline] = useState(false);
  // 已載入的資料（用於顯示在初始狀態）
  const [loadedData, setLoadedData] = useState<ReferencePanelData | null>(
    initialData || null
  );

  // 當 Modal 開啟時載入所有心智圖
  useEffect(() => {
    if (isModalOpen) {
      setIsLoadingMindmaps(true);
      getAllMindmaps()
        .then((data) => {
          setMindmaps(data);
          // 不預設選擇，讓使用者自己選擇
        })
        .catch((error) => {
          console.error("Failed to load mindmaps:", error);
        })
        .finally(() => {
          setIsLoadingMindmaps(false);
        });
    } else {
      // Modal 關閉時重置狀態
      setSelectedMapId(null);
      setSelectedOutline(null);
    }
  }, [isModalOpen]);

  // 當選擇心智圖時載入對應的 outline
  useEffect(() => {
    if (selectedMapId) {
      setIsLoadingOutline(true);
      getSavedOutline(selectedMapId)
        .then((outline) => {
          setSelectedOutline(outline);
        })
        .catch((error) => {
          console.error("Failed to load outline:", error);
          setSelectedOutline(null);
        })
        .finally(() => {
          setIsLoadingOutline(false);
        });
    } else {
      // 沒有選擇時，清空 outline
      setSelectedOutline(null);
      setIsLoadingOutline(false);
    }
  }, [selectedMapId]);

  const selectedMindmap = mindmaps.find((map) => map.id === selectedMapId);

  // 當 initialData 改變時同步狀態
  useEffect(() => {
    if (initialData !== undefined) {
      setLoadedData(initialData);
    }
  }, [initialData]);

  // 預處理選中的心智圖 nodes，確保位置正確計算
  const preparedNodes = selectedMindmap
    ? prepareMindmapNodes(
        selectedMindmap.nodes,
        () => {}, // 預覽模式下不需要 label change callback
        () => {} // 預覽模式下不需要 add child callback
      )
    : [];

  // 預處理已載入的心智圖 nodes
  const loadedPreparedNodes = loadedData?.mindmap
    ? prepareMindmapNodes(
        loadedData.mindmap.nodes,
        () => {},
        () => {}
      )
    : [];

  // 處理 Load 按鈕點擊
  const handleLoad = () => {
    if (selectedMindmap) {
      const dataToLoad: ReferencePanelData = {
        mindmap: {
          id: selectedMindmap.id,
          title: selectedMindmap.title,
          nodes: selectedMindmap.nodes,
        },
        outline: selectedOutline,
      };
      setLoadedData(dataToLoad);
      if (onDataChange) {
        onDataChange(dataToLoad);
      }
      setIsModalOpen(false);
    }
  };

  // 暴露方法給父元件
  useImperativeHandle(ref, () => ({
    openModal: () => setIsModalOpen(true),
  }));

  return (
    <>
      {/* 初始狀態：顯示已載入的資料或提示區塊 */}
      <div className="flex flex-col h-full px-[20px] py-[20px] gap-[20px]">
        {/* Mind Map 區塊 */}
        <div className="flex flex-col gap-[10px] h-[50%]">
          <h3 className="font-medium text-[16px] text-(--color-text-primary)">
            Mind Map
          </h3>
          <div className="bg-white border border-(--color-border) rounded-[10px] h-full overflow-hidden relative">
            {loadedData?.mindmap ? (
              <ReactFlowProvider key={loadedData.mindmap.id}>
                <Mindmap
                  initialNodes={loadedPreparedNodes}
                  onNodesChange={() => {}}
                />
              </ReactFlowProvider>
            ) : (
              <div className="flex items-center justify-center h-full p-[20px]">
                <p className="text-[14px] text-(--color-text-tertiary)">
                  Select a mind map to shape your essay structure.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Outline 區塊 */}
        <div className="flex flex-col gap-[10px] h-[50%]">
          <h3 className="font-medium text-[16px] text-(--color-text-primary)">
            Outline
          </h3>
          <div className="bg-white border border-(--color-border) rounded-[10px] p-[20px] h-full overflow-y-auto">
            {loadedData?.mindmap ? (
              loadedData.outline ? (
                <div className="flex flex-col gap-[30px]">
                  {loadedData.outline.sections.map((section) => (
                    <div
                      key={section.type}
                      className="flex flex-col gap-[10px]"
                    >
                      {/* 區塊標題 */}
                      <h4 className="font-medium text-[16px] text-(--color-text-primary)">
                        {section.type === "introduction"
                          ? "Introduction"
                          : section.type === "body"
                          ? "Body"
                          : "Conclusion"}
                      </h4>

                      {/* 描述文字 */}
                      <p className="text-[14px] text-(--color-text-highlight) font-medium">
                        {section.description}
                      </p>

                      {/* 關鍵字（只顯示，不可編輯） */}
                      <div className="bg-(--color-bg-secondary) border border-(--color-border) rounded-[5px] px-[10px] py-[5px]">
                        <span className="text-[14px] text-(--color-text-secondary) font-medium">
                          {
                            section.keywordsOptions[
                              section.selectedKeywordIndex
                            ]
                          }
                        </span>
                      </div>

                      {/* 範例句子 */}
                      <div className="flex flex-col gap-[5px]">
                        <p className="text-[14px] text-(--color-text-tertiary)">
                          Example sentence:
                        </p>
                        <p className="text-[14px] text-(--color-text-secondary) font-medium">
                          {section.exampleSentence}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[14px] text-(--color-text-tertiary)">
                    No outline saved.
                  </p>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-[14px] text-(--color-text-tertiary)">
                  Your model essay will be shown based on the selected mind map.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        closeOnBackdropClick={true}
      >
        <div className="bg-white rounded-[10px] w-[800px] h-[90vh] flex flex-col overflow-hidden p-[40px] gap-[20px]">
          {/* 第一列：標題區域 */}
          <div className="flex items-center justify-between shrink-0">
            <h2 className="font-medium text-[18px] text-(--color-text-primary)">
              My Mind Maps
            </h2>
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-black/10 transition-colors"
            >
              <span className="material-symbols-rounded text-[20px]">
                close
              </span>
            </button>
          </div>

          {/* 第二列：選擇欄位和預覽 */}
          <div className="flex-1 overflow-hidden flex min-h-0 gap-[20px]">
            {/* 左側：心智圖列表 */}
            <div className="w-[250px] border border-(--color-border) rounded-[10px] overflow-y-auto shrink-0 p-[20px]">
              {isLoadingMindmaps ? (
                <p className="text-[14px] text-(--color-text-tertiary)">
                  Loading...
                </p>
              ) : (
                <div className="flex flex-col gap-[5px]">
                  {mindmaps.map((map) => (
                    <button
                      key={map.id}
                      onClick={() => setSelectedMapId(map.id)}
                      className={`w-full text-left px-[10px] py-[8px] rounded-[8px] text-[14px] transition-colors ${
                        selectedMapId === map.id
                          ? "bg-blue-50 text-(--color-text-secondary) font-medium"
                          : "text-(--color-text-secondary) hover:bg-slate-50"
                      }`}
                    >
                      {map.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 右側：預覽區塊 */}
            <div className="flex-1 flex flex-col gap-[20px]">
              {/* Mind map preview */}
              <div className="flex flex-col gap-[10px] h-[50%]">
                <h3 className="font-medium text-[14px] text-(--color-text-tertiary)">
                  Mind map preview
                </h3>
                <div className="bg-white border border-(--color-border) rounded-[10px] w-full h-full overflow-hidden relative">
                  {selectedMindmap ? (
                    <ReactFlowProvider key={selectedMapId}>
                      <Mindmap
                        initialNodes={preparedNodes}
                        onNodesChange={() => {}}
                      />
                    </ReactFlowProvider>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-[14px] text-(--color-text-tertiary)">
                        Select a mind map to preview
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Outline preview */}
              <div className="flex flex-col gap-[10px] h-[50%]">
                <h3 className="font-medium text-[14px] text-(--color-text-tertiary)">
                  Outline preview
                </h3>
                <div className="bg-white border border-(--color-border) rounded-[10px] p-[20px] w-full h-full overflow-y-auto">
                  {!selectedMapId ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-[14px] text-(--color-text-tertiary)">
                        Select a mind map to preview
                      </p>
                    </div>
                  ) : isLoadingOutline ? (
                    <p className="text-[14px] text-(--color-text-tertiary)">
                      Loading...
                    </p>
                  ) : selectedOutline ? (
                    <div className="flex flex-col gap-[30px]">
                      {selectedOutline.sections.map((section) => (
                        <div
                          key={section.type}
                          className="flex flex-col gap-[10px]"
                        >
                          {/* 區塊標題 */}
                          <h4 className="font-medium text-[16px] text-(--color-text-primary)">
                            {section.type === "introduction"
                              ? "Introduction"
                              : section.type === "body"
                              ? "Body"
                              : "Conclusion"}
                          </h4>

                          {/* 描述文字 */}
                          <p className="text-[14px] text-(--color-text-highlight) font-medium">
                            {section.description}
                          </p>

                          {/* 關鍵字（只顯示，不可編輯） */}
                          <div className="bg-(--color-bg-secondary) border border-(--color-border) rounded-[5px] px-[10px] py-[5px]">
                            <span className="text-[14px] text-(--color-text-secondary) font-medium">
                              {
                                section.keywordsOptions[
                                  section.selectedKeywordIndex
                                ]
                              }
                            </span>
                          </div>

                          {/* 範例句子 */}
                          <div className="flex flex-col gap-[5px]">
                            <p className="text-[14px] text-(--color-text-tertiary)">
                              Example sentence:
                            </p>
                            <p className="text-[14px] text-(--color-text-secondary) font-medium">
                              {section.exampleSentence}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="flex items-center justify-center h-full text-[14px] text-(--color-text-tertiary)">
                      No outline saved.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 第三列：Load 按鈕 */}
          <div className="flex items-center justify-end shrink-0">
            <Button
              variant="primary"
              onClick={handleLoad}
              disabled={!selectedMindmap}
            >
              Load
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
});

ReferencePanel.displayName = "ReferencePanel";
