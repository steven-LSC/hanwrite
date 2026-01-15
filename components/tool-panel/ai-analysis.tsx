"use client";

import React, { useEffect } from "react";

interface AIAnalysisProps {
  writingId?: string;
  initialResults: any | null;
  onResultsChange: (results: any) => void;
}

export function AIAnalysis({
  writingId,
  initialResults,
  onResultsChange,
}: AIAnalysisProps) {
  // 當 writingId 或 initialResults 改變時，同步狀態（為未來實作預留）
  useEffect(() => {
    // 未來實作時可以在這裡處理狀態同步
  }, [writingId, initialResults]);

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-[14px] text-(--color-text-tertiary)">
        Click "Analyze" to check vocabulary & grammar in your sentence.
      </p>
    </div>
  );
}
