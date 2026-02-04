"use client";

import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import {
  splitContentIntoParagraphs,
  getReverseOutliningResults,
} from "@/lib/data/writings";
import { ReverseOutliningResult } from "@/lib/types";
import { Loading } from "../ui/loading";
import { ErrorMessage } from "../ui/error-message";
import { useEditor } from "@/app/(main)/editor-context";
import { logBehavior } from "@/lib/log-behavior";

export interface ReverseOutliningHandle {
  handleAnalyze: () => Promise<void>;
  isAnalyzing: boolean;
}

interface ReverseOutliningProps {
  writingId?: string;
  initialResults: ReverseOutliningResult | null;
  onResultsChange: (results: ReverseOutliningResult) => void;
  content?: string; // 當前編輯器中的文章內容
}

export const ReverseOutlining = forwardRef<
  ReverseOutliningHandle,
  ReverseOutliningProps
>(({ writingId, initialResults, onResultsChange, content }, ref) => {
  const { editorContentRef } = useEditor();
  const [results, setResults] = useState<ReverseOutliningResult | null>(
    initialResults
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set()); // 預設都不展開
  const [error, setError] = useState<string | null>(null);

  // 當 writingId 或 initialResults 改變時，同步狀態
  useEffect(() => {
    setResults(initialResults);
    // 重置展開狀態
    setExpandedCards(new Set());
    // 清除錯誤狀態
    setError(null);
  }, [writingId, initialResults]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null); // 清除之前的錯誤

    try {
      // 優先使用 prop 傳入的 content，否則從 context 取得當前編輯器內容
      const currentContent = content || editorContentRef.current?.getContent() || "";

      // 分段
      const paragraphs = splitContentIntoParagraphs(currentContent);

      // 檢查段落是否為空（在呼叫 API 前）
      if (paragraphs.length === 0) {
        setError("文章內容為空，無法進行分析");
        setIsAnalyzing(false);
        return;
      }

      // 取得分析結果
      const analysisResults = await getReverseOutliningResults(paragraphs);

      setResults(analysisResults);
      // 通知父元件更新狀態
      onResultsChange(analysisResults);
      // 收到結果後記錄
      logBehavior("reverse-outlining-generate", analysisResults);
      // 重置展開狀態，預設都不展開
      setExpandedCards(new Set());
      // 清除錯誤狀態
      setError(null);
    } catch (error) {
      console.error("Failed to analyze:", error);
      // 設定錯誤訊息
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("分析失敗，請稍後再試");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 暴露 handleAnalyze 和 isAnalyzing 給父元件
  useImperativeHandle(ref, () => ({
    handleAnalyze,
    isAnalyzing,
  }));

  // 切換卡片展開/收起狀態
  const toggleCard = (index: number) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // 載入中狀態
  if (isAnalyzing) {
    return <Loading />;
  }

  // 如果有錯誤，顯示錯誤訊息（優先於結果顯示）
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-[10px]">
          <ErrorMessage message={error} />
        </div>
      </div>
    );
  }

  // 未分析時顯示提示訊息
  if (!results) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[14px] text-(--color-text-tertiary)">
          Click "Analyze" to generate a reverse outline.
        </p>
      </div>
    );
  }

  // 顯示結果卡片
  return (
    <div className="flex flex-col h-full overflow-y-auto px-[20px] py-[20px] gap-[10px]">
      {results.map((item, index) => {
        const isExpanded = expandedCards.has(index);
        return (
          <div
            key={index}
            className="bg-white border border-(--color-border) rounded-[10px] p-[20px] flex flex-col gap-[10px] shrink-0"
          >
            {/* 標題區域 */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleCard(index)}
            >
              <p className="flex-1 font-medium text-[16px] text-(--color-text-primary) whitespace-pre-wrap">
                {item.outline}
              </p>
              <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary) shrink-0">
                {isExpanded ? "expand_less" : "expand_more"}
              </span>
            </div>

            {/* 展開內容 */}
            {isExpanded && (
              <ul className="list-disc font-normal leading-[normal] text-[14px] text-(--color-text-tertiary) whitespace-pre-wrap ms-[21px]">
                <li className="mb-[6px]">
                  <span className="leading-[normal]">{item.reasons[0]}</span>
                </li>
                <li>
                  <span className="leading-[normal]">{item.reasons[1]}</span>
                </li>
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
});

ReverseOutlining.displayName = "ReverseOutlining";
