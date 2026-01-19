"use client";

import { useState, useEffect, useRef } from "react";
import { type Node } from "@xyflow/react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { OutlineData, OutlineSectionType } from "@/lib/types";
import { generateOutline, saveOutline } from "@/lib/data/outline";

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
  const [openDropdown, setOpenDropdown] = useState<OutlineSectionType | null>(
    null
  );
  const dropdownRefs = useRef<
    Record<OutlineSectionType, HTMLDivElement | null>
  >({
    introduction: null,
    body: null,
    conclusion: null,
  });

  // 當 modal 開啟時，如果有 savedOutline 就使用它，否則清空
  useEffect(() => {
    if (isOpen) {
      if (savedOutline) {
        setOutline(savedOutline);
      } else {
        setOutline(null);
      }
      setOpenDropdown(null);
    }
  }, [isOpen, savedOutline]);

  // 點擊外部關閉 dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown];
        const target = event.target as HTMLElement;
        if (ref && target && !ref.contains(target)) {
          setOpenDropdown(null);
        }
      }
    };

    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateOutline(title, nodes);
      setOutline(generated);
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
    } catch (error) {
      console.error("Failed to regenerate outline:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!outline) return;

    try {
      await saveOutline(mapId, outline);
      onClose();
    } catch (error) {
      console.error("Failed to save outline:", error);
    }
  };

  const handleKeywordSelect = (
    sectionType: OutlineSectionType,
    index: number
  ) => {
    if (!outline) return;

    setOutline({
      ...outline,
      sections: outline.sections.map((section) =>
        section.type === sectionType
          ? { ...section, selectedKeywordIndex: index }
          : section
      ),
    });
    setOpenDropdown(null);
  };

  const toggleDropdown = (sectionType: OutlineSectionType) => {
    setOpenDropdown(openDropdown === sectionType ? null : sectionType);
  };

  const getSelectedKeyword = (sectionType: OutlineSectionType): string => {
    if (!outline) return "";
    const section = outline.sections.find((s) => s.type === sectionType);
    if (!section) return "";
    return section.keywordsOptions[section.selectedKeywordIndex] || "";
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
        <div className="flex-1 overflow-y-auto px-[30px] py-[20px]">
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

                  {/* 關鍵字下拉選單 */}
                  <div className="relative">
                    <button
                      onClick={() => toggleDropdown(section.type)}
                      className="w-full bg-(--color-bg-secondary) border border-(--color-border) rounded-[5px] px-[10px] py-[5px] flex items-center justify-between hover:bg-[#e2e8f0] transition-colors"
                    >
                      <span className="text-[14px] text-(--color-text-secondary) font-medium">
                        {getSelectedKeyword(section.type)}
                      </span>
                      <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary)">
                        {openDropdown === section.type
                          ? "expand_less"
                          : "expand_more"}
                      </span>
                    </button>

                    {/* Dropdown 選項列表 */}
                    {openDropdown === section.type && (
                      <div
                        ref={(el) => {
                          dropdownRefs.current[section.type] = el;
                        }}
                        className="absolute top-[calc(100%+5px)] left-0 w-full bg-white border border-(--color-border) rounded-[10px] shadow-lg z-50"
                      >
                        {section.keywordsOptions.map((keyword, index) => (
                          <button
                            key={index}
                            onClick={() =>
                              handleKeywordSelect(section.type, index)
                            }
                            className={`w-full text-left px-[10px] py-[8px] text-[14px] text-(--color-text-secondary) transition-colors ${section.selectedKeywordIndex === index
                                ? "bg-slate-100 font-medium"
                                : "hover:bg-slate-50"
                              } ${index === 0 ? "rounded-t-[10px]" : ""} ${index === section.keywordsOptions.length - 1
                                ? "rounded-b-[10px]"
                                : ""
                              }`}
                          >
                            {keyword}
                          </button>
                        ))}
                      </div>
                    )}
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
          )}
        </div>

        {/* 按鈕區域 */}
        {outline && (
          <div className="px-[30px] py-[20px] border-t border-(--color-border) flex items-center justify-end gap-[10px] shrink-0">
            <Button
              variant="cancel"
              icon="replay"
              onClick={handleRegenerate}
              disabled={isGenerating}
            >
              Regenerate
            </Button>
            <Button
              variant="primary"
              icon="save"
              onClick={handleSave}
              disabled={isGenerating}
            >
              Save
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
