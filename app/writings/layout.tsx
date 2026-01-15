"use client";

import React from "react";
import { Sidebar } from "@/components/sidebar";
import { ToolPanel } from "@/components/tool-panel/tool-panel";
import { FocusProvider, useFocus } from "./focus-context";
import { UnsavedProvider } from "./unsaved-context";

function WritingsLayoutContent({ children }: { children: React.ReactNode }) {
  const { isFocusMode, sidebarRef, toolPanelRef } = useFocus();

  return (
    <div
      className={`flex h-screen bg-(--color-bg-primary) overflow-x-auto transition-all duration-300 ${
        isFocusMode ? "min-w-[750px]" : "min-w-[1200px] mr-[40px]"
      }`}
    >
      {/* 左側導航 - 一般模式 192px，Focus 模式 40px */}
      <div className="shrink-0">
        <Sidebar ref={sidebarRef} />
      </div>

      {/* 左側間隔 - 最小 20px，自動分配剩餘空間 */}
      <div className="flex-1 min-w-[20px]" />

      {/* 中間內容區域 - 由 children 提供 */}
      <div className="shrink-0 flex items-center">{children}</div>

      {/* 右側間隔 - 最小 20px，自動分配剩餘空間 */}
      <div className="flex-1 min-w-[20px]" />

      {/* 右側工具面板 - 固定 498px，Focus 模式下隱藏 */}
      {!isFocusMode && (
        <div className="shrink-0 flex items-center">
          <ToolPanel ref={toolPanelRef} />
        </div>
      )}
    </div>
  );
}

export default function WritingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FocusProvider>
      <UnsavedProvider>
        <WritingsLayoutContent>{children}</WritingsLayoutContent>
      </UnsavedProvider>
    </FocusProvider>
  );
}
