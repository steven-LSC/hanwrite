"use client";

import React from "react";
import { ParaphraseStyle } from "@/lib/types";

interface ParaphraseStylePanelProps {
  onSelectStyle: (style: ParaphraseStyle) => void;
  editorRef: React.RefObject<HTMLDivElement | null>;
  selectionStart: number;
  selectionEnd: number;
}

export function ParaphraseStylePanel({
  onSelectStyle,
  editorRef,
  selectionStart,
  selectionEnd,
}: ParaphraseStylePanelProps) {
  const styles: Array<{ value: ParaphraseStyle; label: string; icon: string }> =
    [
      { value: "formal", label: "Formally", icon: "business_center" },
      { value: "natural", label: "Naturally", icon: "conversation" },
      { value: "native-like", label: "Native-like", icon: "group" },
    ];

  return (
    <div className="bg-white border border-(--color-border) rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-[20px] flex flex-col gap-[5px]">
      {styles.map((style) => (
        <button
          key={style.value}
          onClick={() => {
            onSelectStyle(style.value);
            // 保持反白效果（由 Editor 元件處理）
          }}
          className="flex items-center gap-[5px] px-[10px] py-[5px] rounded-[5px] hover:bg-(--color-bg-secondary) transition-colors duration-200"
        >
          <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary)">
            {style.icon}
          </span>
          <span className="font-medium text-[14px] text-(--color-text-secondary)">
            {style.label}
          </span>
        </button>
      ))}
    </div>
  );
}
