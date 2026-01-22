"use client";

import React from "react";

interface SelectionErrorPanelProps {
  message: string;
}

export function SelectionErrorPanel({ message }: SelectionErrorPanelProps) {
  return (
    <div className="bg-white border border-(--color-border) rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-[20px] flex items-center gap-[10px]">
      <span className="material-symbols-rounded text-[20px] text-red-500 shrink-0">
        error
      </span>
      <span className="font-medium text-[14px] text-(--color-text-secondary)">
        {message}
      </span>
    </div>
  );
}
