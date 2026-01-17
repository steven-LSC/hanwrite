"use client";

import React from "react";
import { ExpansionHint } from "@/lib/types";

interface ExpansionHintPanelProps {
  hints: ExpansionHint[];
  selectedIndex: number | null;
  onSelectHint: (index: number) => void;
  onDiscard: () => void;
  onInsert: () => void;
}

export function ExpansionHintPanel({
  hints,
  selectedIndex,
  onSelectHint,
  onDiscard,
  onInsert,
}: ExpansionHintPanelProps) {
  return (
    <div className="bg-white border border-(--color-border) rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-[20px] flex flex-col gap-[10px] w-[340px] max-h-[500px]">
      {/* 標題區 */}
      <div className="flex items-center gap-[5px] rounded-[10px] shrink-0">
        <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary)">
          lightbulb
        </span>
        <span className="font-medium text-[14px] text-(--color-text-secondary)">
          Expansion Hint
        </span>
      </div>

      {/* Hints 列表 - 可滾動 */}
      <div className="flex flex-col gap-[5px] overflow-y-auto flex-1 scrollbar-hide">
        {hints.map((hint, index) => (
          <button
            key={index}
            onClick={() => onSelectHint(index)}
            className={`flex flex-col gap-[5px] p-[10px] rounded-[10px] text-left transition-colors duration-200 border ${
              selectedIndex === index
                ? "bg-(--color-bg-secondary) border-(--color-border)"
                : "border-transparent hover:bg-(--color-bg-secondary)"
            }`}
          >
            {/* 說明文字 */}
            <p className="font-medium text-[14px] text-(--color-text-secondary)">
              {hint.explanation}
            </p>

            {/* Example sentence 標籤 */}
            <p className="font-normal text-[14px] text-(--color-text-tertiary)">
              Example sentence:
            </p>

            {/* 韓文例句 */}
            <p className="font-medium text-[14px] text-(--color-text-secondary)">
              {hint.example}
            </p>
          </button>
        ))}
      </div>

      {/* 底部按鈕 */}
      <div className="flex gap-[10px] justify-end shrink-0">
        {/* Discard 按鈕 */}
        <button
          onClick={onDiscard}
          className="bg-(--color-bg-secondary) flex items-center gap-[5px] px-[10px] py-[5px] rounded-[5px] hover:brightness-95 transition-colors duration-200"
        >
          <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary)">
            delete
          </span>
          <span className="font-medium text-[14px] text-(--color-text-secondary)">
            Discard
          </span>
        </button>

        {/* Insert 按鈕 */}
        <button
          onClick={onInsert}
          disabled={selectedIndex === null}
          className={`flex items-center gap-[5px] px-[10px] py-[5px] rounded-[5px] transition-colors duration-200 ${
            selectedIndex === null
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-(--color-primary) hover:brightness-110"
          }`}
        >
          <span
            className={`material-symbols-rounded text-[20px] ${
              selectedIndex === null ? "text-gray-500" : "text-white"
            }`}
          >
            check
          </span>
          <span
            className={`font-medium text-[14px] ${
              selectedIndex === null ? "text-gray-500" : "text-white"
            }`}
          >
            Insert
          </span>
        </button>
      </div>
    </div>
  );
}
