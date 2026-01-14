"use client";

import React, { useState, useRef, useEffect } from "react";
import { ExpressionBuilder } from "./expression-builder";
import { ReferencePanel } from "./reference-panel";
import { AIAnalysis } from "./ai-analysis";
import { ReverseOutlining } from "./reverse-outlining";

type ToolType =
  | "reference-panel"
  | "expression-builder"
  | "ai-analysis"
  | "reverse-outlining";

interface ToolPanelProps {
  // 未來可以擴展其他工具
}

export function ToolPanel({}: ToolPanelProps) {
  const [currentTool, setCurrentTool] =
    useState<ToolType>("expression-builder");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 根據 currentTool 決定工具欄的標題和圖標
  const toolConfig = {
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
    },
    "reverse-outlining": {
      icon: "multiple_stop",
      title: "Reverse Outlining",
    },
  };

  const config = toolConfig[currentTool];

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
    switch (currentTool) {
      case "reference-panel":
        return <ReferencePanel />;
      case "expression-builder":
        return <ExpressionBuilder />;
      case "ai-analysis":
        return <AIAnalysis />;
      case "reverse-outlining":
        return <ReverseOutlining />;
      default:
        return null;
    }
  };

  // 處理工具選擇
  const handleToolSelect = (tool: ToolType) => {
    setCurrentTool(tool);
    setIsDropdownOpen(false);
  };

  // 工具選項資料結構
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
  ];

  return (
    <div className="w-[498px] h-[95%] my-auto flex flex-col">
      <div className="bg-white border border-(--color-border) rounded-[10px] flex flex-col overflow-hidden h-full">
        {/* 頂部工具欄（固定高度） */}
        <div className="px-[20px] py-[20px] border-b border-(--color-border) shrink-0 h-[60px] flex items-center">
          <div className="flex items-center justify-between w-full">
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
                  expand_circle_down
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
          </div>
        </div>

        {/* 工具畫面（佔據剩餘空間，設定最低高度） */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-[200px]">
          {renderTool()}
        </div>
      </div>
    </div>
  );
}
