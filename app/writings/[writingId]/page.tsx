"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Editor } from "@/components/editor/editor";
import { ToolPanel } from "@/components/tool-panel/tool-panel";
import { getWriting } from "@/lib/data/writings";
import { Writing } from "@/lib/types";

export default function WritingPage() {
  const params = useParams();
  const writingId = params.writingId as string;

  const [writing, setWriting] = useState<Writing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    if (writingId) {
      getWriting(writingId)
        .then(setWriting)
        .catch((error) => {
          console.error("Failed to load writing:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [writingId]);

  const handleSave = (title: string, content: string) => {
    console.log("Save:", { title, content });
    // TODO: 實作儲存功能
  };

  const handleToggleFocus = () => {
    setIsFocusMode((prev) => !prev);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-(--color-bg-primary)">
        <p className="text-(--color-text-secondary)">Loading...</p>
      </div>
    );
  }

  if (!writing) {
    return (
      <div className="flex items-center justify-center h-screen bg-(--color-bg-primary)">
        <p className="text-(--color-text-secondary)">Writing not found</p>
      </div>
    );
  }

  return (
    <div
      className={`flex h-screen bg-(--color-bg-primary) overflow-x-auto transition-all duration-300 ${
        isFocusMode ? "min-w-[750px]" : "min-w-[1200px] mr-[40px]"
      }`}
    >
      {/* 左側導航 - 一般模式 192px，Focus 模式 40px */}
      <div className="shrink-0">
        <Sidebar
          currentWritingId={writingId}
          isFocusMode={isFocusMode}
          onToggleFocus={handleToggleFocus}
        />
      </div>

      {/* 左側間隔 - 最小 20px，自動分配剩餘空間 */}
      <div className="flex-1 min-w-[20px]" />

      {/* 中間編輯器 - 固定 670px */}
      <div className="shrink-0 flex items-center">
        <Editor
          initialTitle={writing.title}
          initialContent={writing.content}
          onSave={handleSave}
          isFocusMode={isFocusMode}
          onToggleFocus={handleToggleFocus}
        />
      </div>

      {/* 右側間隔 - 最小 20px，自動分配剩餘空間 */}
      <div className="flex-1 min-w-[20px]" />

      {/* 右側工具面板 - 固定 498px，Focus 模式下隱藏 */}
      {!isFocusMode && (
        <div className="shrink-0 flex items-center">
          <ToolPanel />
        </div>
      )}
    </div>
  );
}
