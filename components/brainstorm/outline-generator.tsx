"use client";

import { useState, useEffect } from "react";
import { type Node } from "@xyflow/react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { OutlineData } from "@/lib/types";
import { generateOutline, saveOutline } from "@/lib/data/outline";
import { logBehavior } from "@/lib/log-behavior";

interface OutlineGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  nodes: Node[];
  mapId: string;
  savedOutline: OutlineData | null;
}

export function OutlineGenerator({
  isOpen,
  onClose,
  title,
  nodes,
  mapId,
  savedOutline,
}: OutlineGeneratorProps) {
  const [outline, setOutline] = useState<OutlineData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 當 modal 開啟時，如果有 savedOutline 就使用它，否則清空
  useEffect(() => {
    if (isOpen) {
      if (savedOutline) {
        setOutline(savedOutline);
      } else {
        setOutline(null);
      }
    }
  }, [isOpen, savedOutline]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateOutline(title, nodes);
      setOutline(generated);
      // 收到結果後記錄
      logBehavior("outline-generator-generate", generated);
    } catch (error) {
      console.error("Failed to generate outline:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateOutline(title, nodes);
      setOutline(generated);
      // 收到結果後記錄
      logBehavior("outline-generator-generate", generated);
    } catch (error) {
      console.error("Failed to regenerate outline:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!outline) return;
    // 記錄 save 時把 generate 時的資料帶進去
    logBehavior("outline-generator-save", outline);

    setIsSaving(true);
    try {
      await saveOutline(mapId, outline);
      // Save 後不關閉 modal，讓使用者可以繼續查看或修改
    } catch (error) {
      console.error("Failed to save outline:", error);
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={true}>
      <div className="bg-white rounded-[10px] w-[600px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* 標題區域 */}
        <div className="px-[30px] py-[20px] border-b border-(--color-border) flex items-center justify-between shrink-0">
          <h2 className="font-medium text-[18px] text-(--color-text-primary)">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-black/10 transition-colors"
          >
            <span className="material-symbols-rounded text-[20px]">close</span>
          </button>
        </div>

        {/* 內容區域 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-[30px] py-[20px]">
          {isGenerating ? (
            // Loading 狀態
            <div className="flex items-center justify-center h-[200px]">
              <Loading text="Generating..." className="w-full h-full" />
            </div>
          ) : !outline ? (
            // 初始狀態
            <div className="flex flex-col gap-[20px]">
              <p className="text-[14px] text-(--color-text-secondary)">
                No outline found. Click 'Generate' to create one.
              </p>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  icon="donut_large"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  Generate
                </Button>
              </div>
            </div>
          ) : (
            // 顯示狀態
            <div className="flex flex-col gap-[30px]">
              {outline.sections.map((section) => (
                <div key={section.type} className="flex flex-col gap-[10px]">
                  {/* 區塊標題 */}
                  <h3 className="font-medium text-[16px] text-(--color-text-primary)">
                    {section.type === "introduction"
                      ? "Introduction"
                      : section.type === "body"
                        ? "Body"
                        : "Conclusion"}
                  </h3>

                  {/* 描述文字 */}
                  <p className="text-[14px] text-(--color-text-highlight) font-medium">
                    {section.description}
                  </p>

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
          )}
        </div>

        {/* 按鈕區域 */}
        {outline && (
          <div className="px-[30px] py-[20px] border-t border-(--color-border) flex items-center justify-between shrink-0">
            <div className="flex items-center gap-[10px] ml-auto">
              {isSaving && <StatusIndicator text="saving" />}
              <Button
                variant="cancel"
                icon="replay"
                onClick={handleRegenerate}
                disabled={isGenerating || isSaving}
              >
                Regenerate
              </Button>
              <Button
                variant="primary"
                icon="save"
                onClick={handleSave}
                disabled={isGenerating || isSaving}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
