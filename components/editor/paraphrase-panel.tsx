"use client";

import React from "react";

/**
 * Paraphrase Panel 元件
 * TODO: 之後實作 Paraphrase 功能
 * 目前只是預留元件架構
 */

interface ParaphrasePanelProps {
  // TODO: 之後定義 props
}

export function ParaphrasePanel({}: ParaphrasePanelProps) {
  return (
    <div className="bg-white border border-(--color-border) rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-[20px]">
      <p className="text-(--color-text-secondary) text-[14px]">
        Paraphrase 功能即將推出...
      </p>
    </div>
  );
}
