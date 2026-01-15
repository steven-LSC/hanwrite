"use client";

import React, { useState, useImperativeHandle, forwardRef, useEffect } from "react";
import {
  getWriting,
  splitContentIntoParagraphs,
  getReverseOutliningResults,
} from "@/lib/data/writings";
import { ReverseOutliningResult } from "@/lib/types";
import { Loading } from "../ui/loading";

export interface ReverseOutliningHandle {
  handleAnalyze: () => Promise<void>;
}

interface ReverseOutliningProps {
  writingId?: string;
  initialResults: ReverseOutliningResult | null;
  onResultsChange: (results: ReverseOutliningResult) => void;
}

export const ReverseOutlining = forwardRef<
  ReverseOutliningHandle,
  ReverseOutliningProps
>(({ writingId, initialResults, onResultsChange }, ref) => {
  const [results, setResults] = useState<ReverseOutliningResult | null>(
    initialResults
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set()); // 預設都不展開

  // 當 writingId 或 initialResults 改變時，同步狀態
  useEffect(() => {
    setResults(initialResults);
    // 重置展開狀態
    setExpandedCards(new Set());
  }, [writingId, initialResults]);

    const handleAnalyze = async () => {
      if (!writingId || writingId === "new") {
        return;
      }

      setIsAnalyzing(true);
      try {
        // 取得文章內容
        const writing = await getWriting(writingId);

        // 分段
        const paragraphs = splitContentIntoParagraphs(writing.content);

        // 取得分析結果
        const analysisResults = await getReverseOutliningResults(paragraphs);

        setResults(analysisResults);
        // 通知父元件更新狀態
        onResultsChange(analysisResults);
        // 重置展開狀態，預設都不展開
        setExpandedCards(new Set());
      } catch (error) {
        console.error("Failed to analyze:", error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    // 暴露 handleAnalyze 給父元件
    useImperativeHandle(ref, () => ({
      handleAnalyze,
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
  }
);

ReverseOutlining.displayName = "ReverseOutlining";
