"use client";

import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import { ProficiencyReportComponent, ProficiencyReportHandle } from "./proficiency-report";
import { ErrorDetectionCorrection, ErrorDetectionCorrectionHandle } from "./error-detection-correction";
import { ProficiencyReport, ErrorDetectionResult } from "@/lib/types";

export interface AIAnalysisHandle {
  openReportModal: () => void;
  handleErrorDetectionAnalyze: () => Promise<void>;
}

interface AIAnalysisProps {
  writingId?: string;
  initialResults: ProficiencyReport | null;
  onResultsChange: (results: ProficiencyReport) => void;
  errorDetectionInitialResults: ErrorDetectionResult | null;
  onErrorDetectionResultsChange: (results: ErrorDetectionResult) => void;
}

type AIAnalysisSubFeature = "error-detection" | "proficiency-report";

export const AIAnalysis = forwardRef<AIAnalysisHandle, AIAnalysisProps>(
  ({ 
    writingId, 
    initialResults, 
    onResultsChange,
    errorDetectionInitialResults,
    onErrorDetectionResultsChange,
  }, ref) => {
    const proficiencyReportRef = useRef<ProficiencyReportHandle>(null);
    const errorDetectionRef = useRef<ErrorDetectionCorrectionHandle>(null);

    // 暴露方法給父元件
    useImperativeHandle(ref, () => ({
      openReportModal: () => {
        if (proficiencyReportRef.current) {
          proficiencyReportRef.current.openModal();
        }
      },
      handleErrorDetectionAnalyze: async () => {
        if (errorDetectionRef.current) {
          await errorDetectionRef.current.handleAnalyze();
        }
      },
    }));

    return (
      <>
        {/* 主要內容區域：顯示 Error Detection & Correction */}
        <ErrorDetectionCorrection
          ref={errorDetectionRef}
          writingId={writingId}
          initialResults={errorDetectionInitialResults}
          onResultsChange={onErrorDetectionResultsChange}
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
