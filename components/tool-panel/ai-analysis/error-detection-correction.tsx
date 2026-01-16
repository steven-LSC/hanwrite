"use client";

import React from "react";

interface ErrorDetectionCorrectionProps {
  writingId?: string;
  initialResults: any | null;
  onResultsChange: (results: any) => void;
}

export function ErrorDetectionCorrection({
  writingId,
  initialResults,
  onResultsChange,
}: ErrorDetectionCorrectionProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-[14px] text-(--color-text-tertiary)">
        Error Detection & Correction feature coming soon.
      </p>
    </div>
  );
}
