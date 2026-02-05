"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useParams } from "next/navigation";
import { ExpressionBuilder, ExpressionBuilderHandle } from "./expression-builder";
import { ReferencePanel, ReferencePanelHandle } from "./reference-panel";
import { AIAnalysis, AIAnalysisHandle } from "./ai-analysis";
import { ReverseOutlining, ReverseOutliningHandle } from "./reverse-outlining";
import { Usage } from "./usage";
import { Button } from "../ui/button";
import {
  ToolState,
} from "@/lib/types";
import { logBehavior } from "@/lib/log-behavior";
import { useFocus } from "@/app/(main)/focus-context";

type ToolType =
  | "reference-panel"
  | "expression-builder"
  | "ai-analysis"
  | "reverse-outlining"
  | "usage";

export interface ToolPanelRef {
  getToolState: () => ToolState;
}

interface ToolButton {
  icon: string;
  label: string;
  variant: "third" | "primary";
}

interface ToolConfig {
  icon: string;
  title: string;
  leftButtons?: ToolButton[];
  rightButton?: ToolButton;
}

interface ToolPanelProps {
  // 未來可以擴展其他工具
}

export const ToolPanel = forwardRef<ToolPanelRef, ToolPanelProps>(({ }, ref) => {
  const params = useParams();
  const writingId = params.writingId as string | undefined;
  const { setActivityState } = useFocus();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // 工具狀態管理（一次只記住一個文章的狀態）
  const [toolState, setToolState] = useState<ToolState>({
    currentTool: "reference-panel",
    "reverse-outlining": null,
    "ai-analysis": null,
    "error-detection-correction": null,
    "expression-builder": null,
    "reference-panel": null,
  });
  // 追蹤當前綁定的 writingId
  const [currentWritingId, setCurrentWritingId] = useState<string | undefined>(
    undefined
  );
  // 追蹤 session 狀態
  const [isSessionActive, setIsSessionActive] = useState(false);
  // Reverse Outlining 的 ref
  const reverseOutliningRef = useRef<ReverseOutliningHandle>(null);
  // Reference Panel 的 ref
  const referencePanelRef = useRef<ReferencePanelHandle>(null);
  // AI Analysis 的 ref
  const aiAnalysisRef = useRef<AIAnalysisHandle>(null);
  // Expression Builder 的 ref
  const expressionBuilderRef = useRef<ExpressionBuilderHandle>(null);

  // 暴露方法給父元件
  useImperativeHandle(ref, () => ({
    getToolState: () => toolState,
  }));

  // 檢查並監聽 session 狀態
  useEffect(() => {
    // 初始讀取 session 狀態
    const checkSessionStatus = () => {
      if (typeof window !== "undefined") {
        const sessionActive = localStorage.getItem("hanwrite-session-active") === "true";
        setIsSessionActive(sessionActive);
      }
    };

    checkSessionStatus();

    // 監聽 localStorage 變化（跨標籤頁）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "hanwrite-session-active") {
        setIsSessionActive(e.newValue === "true");
      }
    };

    // 監聽同標籤頁的 localStorage 變化
    const handleCustomStorageChange = () => {
      checkSessionStatus();
    };

    window.addEventListener("storage", handleStorageChange);
    // 使用自訂事件來監聽同標籤頁的變化
    window.addEventListener("session-status-change", handleCustomStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("session-status-change", handleCustomStorageChange);
    };
  }, []);

  // 當 writingId 改變時，清空所有工具狀態並重置為預設工具
  useEffect(() => {
    if (writingId !== currentWritingId) {
      setToolState({
        currentTool: "reference-panel",
        "reverse-outlining": null,
        "ai-analysis": null,
        "error-detection-correction": null,
        "expression-builder": null,
        "reference-panel": null,
      });
      setCurrentWritingId(writingId);
    }
  }, [writingId, currentWritingId]);

  // 當 session start 時，如果當前工具是 usage，切換到 reference-panel
  useEffect(() => {
    if (isSessionActive && toolState.currentTool === "usage") {
      setToolState((prev) => ({
        ...prev,
        currentTool: "reference-panel",
      }));
    }
  }, [isSessionActive]);

  const currentTool = toolState.currentTool;

  // 根據 currentTool 和 toolState 狀態決定工具欄的標題和圖標
  const getToolConfig = (tool: ToolType): ToolConfig => {
    const baseConfigs: Record<ToolType, Omit<ToolConfig, "rightButton">> = {
      "reference-panel": {
        icon: "folder_open",
        title: "Reference Panel",
      },
      "expression-builder": {
        icon: "build",
        title: "Expression Builder",
      },
      "ai-analysis": {
        icon: "wand_shine",
        title: "AI Analysis",
        leftButtons: [
          {
            icon: "content_paste",
            label: "Report",
            variant: "third",
          },
        ],
      },
      "reverse-outlining": {
        icon: "multiple_stop",
        title: "Reverse Outlining",
      },
      usage: {
        icon: "finance",
        title: "Usage",
      },
    };

    const baseConfig = baseConfigs[tool];

    // 處理右側按鈕
    let rightButton: ToolButton | undefined;

    if (tool === "reference-panel") {
      rightButton = {
        icon: "search",
        label: "Find",
        variant: "primary",
      };
    } else if (tool === "reverse-outlining") {
      // 檢查該工具是否有結果，決定顯示 Update 或 Analyze
      const hasResults =
        toolState[tool] !== null && toolState[tool] !== undefined;
      if (hasResults) {
        rightButton = {
          icon: "replay",
          label: "Update",
          variant: "primary",
        };
      } else {
        rightButton = {
          icon: "donut_large",
          label: "Analyze",
          variant: "primary",
        };
      }
    } else if (tool === "ai-analysis") {
      // 檢查 error-detection-correction 是否有結果，決定顯示 Update 或 Analyze
      const hasResults =
        toolState["error-detection-correction"] !== null &&
        toolState["error-detection-correction"] !== undefined;
      if (hasResults) {
        rightButton = {
          icon: "replay",
          label: "Update",
          variant: "primary",
        };
      } else {
        rightButton = {
          icon: "donut_large",
          label: "Analyze",
          variant: "primary",
        };
      }
    }

    return {
      ...baseConfig,
      ...(rightButton && { rightButton }),
    };
  };

  const config = getToolConfig(currentTool);

  // 追蹤 loading 狀態
  const [isLoading, setIsLoading] = useState(false);

  // 處理 loading 狀態變化
  const handleLoadingChange = (tool: ToolType, loading: boolean) => {
    // 只有當前工具才更新 loading 狀態
    if (currentTool === tool) {
      setIsLoading(loading);
    }
  };

  // 當工具切換時，重置 loading 狀態
  useEffect(() => {
    setIsLoading(false);
  }, [currentTool]);

  // 點擊外部關閉 dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // 根據 currentTool 渲染對應的工具
  const renderTool = () => {
    const currentWritingIdValue = writingId || undefined;
    switch (currentTool) {
      case "reference-panel":
        return (
          <ReferencePanel
            ref={referencePanelRef}
            initialData={toolState["reference-panel"]}
            onDataChange={(data) => {
              setToolState((prev) => ({
                ...prev,
                "reference-panel": data,
              }));
            }}
          />
        );
      case "expression-builder":
        return (
          <ExpressionBuilder
            ref={expressionBuilderRef}
            writingId={currentWritingIdValue}
            initialResults={toolState["expression-builder"]?.results || null}
            initialInputText={toolState["expression-builder"]?.inputText || ""}
            onResultsChange={(results) => {
              setToolState((prev) => ({
                ...prev,
                "expression-builder": {
                  results,
                  inputText: prev["expression-builder"]?.inputText || "",
                },
              }));
            }}
            onInputTextChange={(inputText) => {
              setToolState((prev) => ({
                ...prev,
                "expression-builder": {
                  results: prev["expression-builder"]?.results || null,
                  inputText,
                },
              }));
            }}
            onLoadingChange={(loading) => handleLoadingChange("expression-builder", loading)}
          />
        );
      case "ai-analysis":
        return (
          <AIAnalysis
            ref={aiAnalysisRef}
            writingId={currentWritingIdValue}
            initialResults={toolState["ai-analysis"]}
            onResultsChange={(results) => {
              setToolState((prev) => ({
                ...prev,
                "ai-analysis": results,
              }));
            }}
            errorDetectionInitialResults={toolState["error-detection-correction"]}
            onErrorDetectionResultsChange={(results) => {
              setToolState((prev) => ({
                ...prev,
                "error-detection-correction": results,
              }));
            }}
            onLoadingChange={(loading) => handleLoadingChange("ai-analysis", loading)}
          />
        );
      case "reverse-outlining":
        return (
          <ReverseOutlining
            ref={reverseOutliningRef}
            writingId={currentWritingIdValue}
            initialResults={toolState["reverse-outlining"]}
            onResultsChange={(results) => {
              setToolState((prev) => ({
                ...prev,
                "reverse-outlining": results,
              }));
            }}
            onLoadingChange={(loading) => handleLoadingChange("reverse-outlining", loading)}
          />
        );
      case "usage":
        return <Usage />;
      default:
        return null;
    }
  };

  // 處理工具選擇
  const handleToolSelect = (tool: ToolType) => {
    setToolState((prev) => ({
      ...prev,
      currentTool: tool,
    }));
    setIsDropdownOpen(false);
    // 記錄工具選擇行為
    logBehavior(`tool-select-${tool}`);
    setActivityState("tool-using");
  };

  // 工具選項資料結構（根據 session 狀態過濾 usage）
  const toolOptions = [
    {
      category: "Writing Support",
      tools: [
        {
          id: "reference-panel" as ToolType,
          icon: "folder_open",
          title: "Reference Panel",
        },
        {
          id: "expression-builder" as ToolType,
          icon: "build",
          title: "Expression Builder",
        },
      ],
    },
    {
      category: "Revision Support",
      tools: [
        {
          id: "ai-analysis" as ToolType,
          icon: "wand_shine",
          title: "AI Analysis",
        },
        {
          id: "reverse-outlining" as ToolType,
          icon: "multiple_stop",
          title: "Reverse Outlining",
        },
      ],
    },
    {
      category: "Other",
      tools: [
        // session start 時隱藏 usage 選項
        ...(isSessionActive
          ? []
          : [
            {
              id: "usage" as ToolType,
              icon: "finance",
              title: "Usage",
            },
          ]),
      ],
    },
  ].filter((group) => group.tools.length > 0); // 過濾掉空的類別

  return (
    <div className="w-[498px] h-[95%] my-auto flex flex-col">
      <div className="bg-white border border-(--color-border) rounded-[10px] flex flex-col overflow-hidden h-full">
        {/* 頂部工具欄（固定高度） */}
        <div className="px-[20px] py-[20px] border-b border-(--color-border) shrink-0 h-[70px] flex items-center">
          <div className="flex items-center justify-between w-full">
            {/* 左側：工具選擇按鈕 + 動態按鈕組 */}
            {config.leftButtons && config.leftButtons.length > 0 ? (
              <div className="flex items-center gap-[10px]">
                <div className="relative" ref={dropdownRef}>
                  {/* 工具選擇按鈕 */}
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center justify-between gap-[10px] bg-(--color-bg-secondary) px-[10px] py-[5px] rounded-[5px] cursor-pointer hover:bg-[#e2e8f0] transition-colors"
                  >
                    <div className="flex items-center gap-[5px]">
                      <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary)">
                        {config.icon}
                      </span>
                      <span className="font-medium text-[14px] text-(--color-text-secondary)">
                        {config.title}
                      </span>
                    </div>
                    <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary)">
                      {isDropdownOpen ? "expand_less" : "expand_more"}
                    </span>
                  </button>

                  {/* Dropdown 選單 */}
                  {isDropdownOpen && (
                    <div className="absolute top-[calc(100%+5px)] left-0 bg-white border border-[#e2e8f0] rounded-[10px] shadow-lg p-[20px] flex flex-col gap-[10px] z-50">
                      {toolOptions.map((group) => (
                        <React.Fragment key={group.category}>
                          <p className="font-medium text-[14px] text-[#475569]">
                            {group.category}
                          </p>
                          {group.tools.map((tool) => (
                            <button
                              key={tool.id}
                              onClick={() => handleToolSelect(tool.id)}
                              className="flex items-center gap-[5px] px-[10px] py-[5px] rounded-[5px] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-rounded text-[20px] text-[#475569]">
                                {tool.icon}
                              </span>
                              <span className="font-medium text-[14px] text-[#475569] whitespace-nowrap">
                                {tool.title}
                              </span>
                            </button>
                          ))}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                {/* 左側動態按鈕組 */}
                {config.leftButtons.map((button, index) => (
                  <Button
                    key={index}
                    variant={button.variant}
                    icon={button.icon}
                    onClick={() => {
                      // 如果是 AI Analysis 的 Report 按鈕
                      if (
                        currentTool === "ai-analysis" &&
                        button.label === "Report"
                      ) {
                        // 記錄 open 時把 report 資料帶進去
                        if (toolState["ai-analysis"]) {
                          logBehavior("proficiency-report-open", toolState["ai-analysis"]);
                        } else {
                          logBehavior("proficiency-report-open");
                        }
                        if (aiAnalysisRef.current) {
                          aiAnalysisRef.current.openReportModal();
                        }
                      }
                    }}
                  >
                    {button.label}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                {/* 工具選擇按鈕 */}
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between gap-[10px] bg-(--color-bg-secondary) px-[10px] py-[5px] rounded-[5px] cursor-pointer hover:bg-[#e2e8f0] transition-colors"
                >
                  <div className="flex items-center gap-[5px]">
                    <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary)">
                      {config.icon}
                    </span>
                    <span className="font-medium text-[14px] text-(--color-text-secondary)">
                      {config.title}
                    </span>
                  </div>
                  <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary)">
                    {isDropdownOpen ? "expand_less" : "expand_more"}
                  </span>
                </button>

                {/* Dropdown 選單 */}
                {isDropdownOpen && (
                  <div className="absolute top-[calc(100%+5px)] left-0 bg-white border border-[#e2e8f0] rounded-[10px] shadow-lg p-[20px] flex flex-col gap-[10px] z-50">
                    {toolOptions.map((group) => (
                      <React.Fragment key={group.category}>
                        <p className="font-medium text-[14px] text-[#475569]">
                          {group.category}
                        </p>
                        {group.tools.map((tool) => (
                          <button
                            key={tool.id}
                            onClick={() => handleToolSelect(tool.id)}
                            className="flex items-center gap-[5px] px-[10px] py-[5px] rounded-[5px] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-rounded text-[20px] text-[#475569]">
                              {tool.icon}
                            </span>
                            <span className="font-medium text-[14px] text-[#475569] whitespace-nowrap">
                              {tool.title}
                            </span>
                          </button>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 右側：主要操作按鈕 */}
            {config.rightButton && (
              <Button
                variant={config.rightButton.variant}
                icon={config.rightButton.icon}
                onClick={async () => {
                  // 如果是 Reference Panel，開啟 Modal
                  if (currentTool === "reference-panel") {
                    logBehavior("reference-panel-find");
                    if (referencePanelRef.current) {
                      referencePanelRef.current.openModal();
                    }
                  } else if (currentTool === "reverse-outlining") {
                    // 如果是 Reverse Outlining，呼叫元件的 handleAnalyze
                    // 記錄將在 handleAnalyze 中收到結果後進行
                    if (reverseOutliningRef.current) {
                      await reverseOutliningRef.current.handleAnalyze();
                    }
                  } else if (currentTool === "ai-analysis") {
                    // 呼叫 Error Detection & Correction 的 handleAnalyze
                    // 記錄將在 handleAnalyze 中收到結果後進行
                    if (aiAnalysisRef.current) {
                      await aiAnalysisRef.current.handleErrorDetectionAnalyze();
                    }
                  }
                }}
                disabled={isLoading}
              >
                {config.rightButton.label}
              </Button>
            )}
          </div>
        </div>

        {/* 工具畫面（佔據剩餘空間，設定最低高度） */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-[200px]">
          {renderTool()}
        </div>
      </div>
    </div>
  );
});

ToolPanel.displayName = "ToolPanel";
