"use client";

import React, { useState } from "react";
import { ExpressionBuilder } from "./expression-builder";

type ToolType = "expression-builder";

interface ToolPanelProps {
  // 未來可以擴展其他工具
}

export function ToolPanel({}: ToolPanelProps) {
  const [currentTool, setCurrentTool] =
    useState<ToolType>("expression-builder");

  // 根據 currentTool 決定工具欄的標題和圖標
  const toolConfig = {
    "expression-builder": {
      icon: "auto_awesome",
      title: "Expression Builder",
    },
  };

  const config = toolConfig[currentTool];

  // 根據 currentTool 渲染對應的工具
  const renderTool = () => {
    switch (currentTool) {
      case "expression-builder":
        return <ExpressionBuilder />;
      default:
        return null;
    }
  };

  return (
    <div className="w-[498px] h-[95%] my-auto flex flex-col">
      <div className="bg-white border border-(--color-border) rounded-[10px] flex flex-col overflow-hidden h-full">
        {/* 頂部工具欄（固定高度） */}
        <div className="px-[20px] py-[20px] border-b border-(--color-border) shrink-0 h-[60px] flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-[10px] bg-(--color-bg-secondary) px-[10px] py-[5px] rounded-[5px]">
              <div className="flex items-center gap-[5px]">
                <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary)">
                  {config.icon}
                </span>
                <span className="font-medium text-[14px] text-(--color-text-secondary)">
                  {config.title}
                </span>
              </div>
              <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary) cursor-pointer">
                expand_more
              </span>
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
