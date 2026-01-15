"use client";

import { ToolPanel } from "@/components/tool-panel/tool-panel";
import { useFocus } from "../focus-context";

export default function WritingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isFocusMode, toolPanelRef } = useFocus();

  return (
    <>
      {/* Writing 內容區域 - 填滿高度以讓 Editor 的 h-[95%] 正確計算 */}
      <div className="shrink-0 flex items-center self-stretch">{children}</div>

      {/* 右側間隔 - 最小 20px，自動分配剩餘空間 */}
      <div className="flex-1 min-w-[20px]" />

      {/* 右側工具面板 - 固定 498px，Focus 模式下隱藏 */}
      {!isFocusMode && (
        <div className="shrink-0 flex items-center self-stretch">
          <ToolPanel ref={toolPanelRef} />
        </div>
      )}
    </>
  );
}
