"use client";

import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { ProficiencyReport } from "@/lib/types";
import { getProficiencyReport, getWriting } from "@/lib/data/writings";
import { logBehavior } from "@/lib/log-behavior";

export interface ProficiencyReportHandle {
  openModal: () => void;
}

interface ProficiencyReportProps {
  writingId?: string;
  initialResults: ProficiencyReport | null;
  onResultsChange: (results: ProficiencyReport) => void;
}

export const ProficiencyReportComponent = forwardRef<
  ProficiencyReportHandle,
  ProficiencyReportProps
>(({ writingId, initialResults, onResultsChange }, ref) => {
  const [report, setReport] = useState<ProficiencyReport | null>(
    initialResults
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // 當 writingId 或 initialResults 改變時，同步狀態
  useEffect(() => {
    setReport(initialResults);
    setExpandedItems(new Set());
  }, [writingId, initialResults]);

  // 暴露 openModal 方法給父元件
  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsModalOpen(true);
    },
  }));

  // Generate/Regenerate 功能
  const handleGenerate = async () => {
    if (!writingId || writingId === "new") {
      alert(
        "Please save your writing first before generating a proficiency report."
      );
      return;
    }

    setIsGenerating(true);
    try {
      // 先取得文章內容
      const writing = await getWriting(writingId);

      // 將文章標題和內容傳遞給 getProficiencyReport
      const { results: reportData, duration } = await getProficiencyReport(writing.title, writing.content);
      setReport(reportData);
      onResultsChange(reportData);
      setExpandedItems(new Set());
      // 收到結果後記錄
      logBehavior("proficiency-report-generate", { results: reportData, duration });
    } catch (error) {
      console.error("Failed to generate proficiency report:", error);
      alert("Failed to generate proficiency report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // 取得 Level 的顏色類別
  const getLevelColor = (level: number): string => {
    if (level >= 5) {
      return "text-green-600";
    } else if (level === 4) {
      return "text-yellow-600";
    } else {
      return "text-gray-600";
    }
  };

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      closeOnBackdropClick={true}
    >
      <div
        className="bg-white rounded-[10px] w-[600px] h-[80vh] flex flex-col overflow-hidden p-[40px] gap-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題區域 */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-[10px]">
            <span className="material-symbols-rounded text-[20px] text-(--color-text-primary)">
              content_paste
            </span>
            <h2 className="font-medium text-[18px] text-(--color-text-primary)">
              Proficiency Report
            </h2>
          </div>
          <button
            onClick={() => setIsModalOpen(false)}
            className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-black/10 transition-colors"
          >
            <span className="material-symbols-rounded text-[20px]">close</span>
          </button>
        </div>

        {/* 內容區域 */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-[20px] scrollbar-hide">
          {isGenerating ? (
            <Loading text="Generating report..." />
          ) : !report ? (
            // 沒有報告時的顯示
            <div className="flex flex-col items-center justify-center h-full gap-[20px]">
              <p className="text-[14px] text-(--color-text-tertiary)">
                No report found. Click "Generate" to create one.
              </p>
            </div>
          ) : (
            // 有報告時的顯示
            <div className="flex flex-col gap-[20px]">
              {report.map((item, index) => {
                const isExpanded = expandedItems.has(index);
                return (
                  <div
                    key={index}
                    className="bg-white border border-(--color-border) rounded-[10px] p-[20px] flex flex-col gap-[10px] shrink-0"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleItem(index)}
                    >
                      <h3 className="flex-1 font-medium text-[16px] text-(--color-text-primary)">
                        {item.category}
                      </h3>
                      <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary) shrink-0">
                        {isExpanded ? "expand_less" : "expand_more"}
                      </span>
                    </div>
                    <div className="flex items-center gap-[5px]">
                      <span
                        className={`font-medium text-[16px] ${getLevelColor(
                          item.level
                        )}`}
                      >
                        Level {item.level}
                      </span>
                    </div>
                    {isExpanded && (
                      <p className="text-[14px] text-(--color-text-secondary) whitespace-pre-wrap">
                        {item.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 免責聲明 - 只在有報告時顯示 */}
        {report && (
          <p className="text-[14px] text-red-600">
            The proficiency levels shown here are for reference only and may not
            represent a full assessment of your language ability.
          </p>
        )}

        {/* 按鈕區域 */}
        <div className="flex items-center justify-end gap-[10px] shrink-0">
          {report ? (
            <>
              <Button
                variant="cancel"
                onClick={(e?: React.MouseEvent<HTMLButtonElement>) => {
                  if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                  handleGenerate();
                }}
                disabled={isGenerating}
              >
                Regenerate
              </Button>
              <Button
                variant="cancel"
                onClick={(e?: React.MouseEvent<HTMLButtonElement>) => {
                  if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                  setIsModalOpen(false);
                }}
              >
                Close
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={(e?: React.MouseEvent<HTMLButtonElement>) => {
                if (e) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                handleGenerate();
              }}
              disabled={isGenerating}
            >
              Generate
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
});

ProficiencyReportComponent.displayName = "ProficiencyReportComponent";
