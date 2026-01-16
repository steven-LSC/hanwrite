"use client";

import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import { ProficiencyReportComponent, ProficiencyReportHandle } from "./proficiency-report";
import { ErrorDetectionCorrection } from "./error-detection-correction";
import { ProficiencyReport } from "@/lib/types";

export interface AIAnalysisHandle {
  openReportModal: () => void;
}

interface AIAnalysisProps {
  writingId?: string;
  initialResults: ProficiencyReport | null;
  onResultsChange: (results: ProficiencyReport) => void;
}

type AIAnalysisSubFeature = "error-detection" | "proficiency-report";

export const AIAnalysis = forwardRef<AIAnalysisHandle, AIAnalysisProps>(
  ({ writingId, initialResults, onResultsChange }, ref) => {
    const proficiencyReportRef = useRef<ProficiencyReportHandle>(null);

    // 暴露 openReportModal 方法給父元件
    useImperativeHandle(ref, () => ({
      openReportModal: () => {
        if (proficiencyReportRef.current) {
          proficiencyReportRef.current.openModal();
        }
      },
    }));

    return (
      <>
        {/* 主要內容區域：顯示 Error Detection & Correction */}
        <ErrorDetectionCorrection
          writingId={writingId}
          initialResults={null}
          onResultsChange={() => {}}
        />

        {/* Proficiency Report Modal（透過 ref 控制） */}
        <ProficiencyReportComponent
          ref={proficiencyReportRef}
          writingId={writingId}
          initialResults={initialResults}
          onResultsChange={onResultsChange}
        />
      </>
    );
  }
);

AIAnalysis.displayName = "AIAnalysis";
