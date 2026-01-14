"use client";

import React from "react";

interface ContextMenuProps {
  onSelectParaphrase: () => void;
  onSelectExpansionHint: () => void;
}

export function ContextMenu({
  onSelectParaphrase,
  onSelectExpansionHint,
}: ContextMenuProps) {
  return (
    <div className="bg-white border border-(--color-border) rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-[20px] flex flex-col gap-[5px]">
      {/* Paraphrase 選項 */}
      <button
        onClick={onSelectParaphrase}
        className="flex items-center gap-[5px] px-[10px] py-[5px] rounded-[5px] hover:bg-(--color-bg-secondary) transition-colors duration-200"
      >
        <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary)">
          autorenew
        </span>
        <span className="font-medium text-[14px] text-(--color-text-secondary)">
          Paraphrase
        </span>
      </button>

      {/* Expansion Hint 選項 */}
      <button
        onClick={onSelectExpansionHint}
        className="flex items-center gap-[5px] px-[10px] py-[5px] rounded-[5px] hover:bg-(--color-bg-secondary) transition-colors duration-200"
      >
        <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary)">
          lightbulb
        </span>
        <span className="font-medium text-[14px] text-(--color-text-secondary)">
          Expansion Hint
        </span>
      </button>
    </div>
  );
}
