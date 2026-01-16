"use client";

import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import { getWriting, getErrorDetectionResults } from "@/lib/data/writings";
import { ErrorDetectionResult } from "@/lib/types";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";

export interface ErrorDetectionCorrectionHandle {
  handleAnalyze: () => Promise<void>;
}

interface ErrorDetectionCorrectionProps {
  writingId?: string;
  initialResults: ErrorDetectionResult | null;
  onResultsChange: (results: ErrorDetectionResult) => void;
}

export const ErrorDetectionCorrection = forwardRef<
  ErrorDetectionCorrectionHandle,
  ErrorDetectionCorrectionProps
>(({ writingId, initialResults, onResultsChange }, ref) => {
  const [results, setResults] = useState<ErrorDetectionResult | null>(
    initialResults
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAll, setShowAll] = useState(true); // 預設打開

  // 當 writingId 或 initialResults 改變時，同步狀態
  useEffect(() => {
    setResults(initialResults);
    // 分析完或 update 完後，預設打開 showAll
    if (initialResults) {
      setShowAll(true);
    }
  }, [writingId, initialResults]);

  const handleAnalyze = async () => {
    if (!writingId || writingId === "new") {
      return;
    }

    setIsAnalyzing(true);
    try {
      // 取得文章內容
      const writing = await getWriting(writingId);

      // 取得分析結果
      const analysisResults = await getErrorDetectionResults(writingId);

      setResults(analysisResults);
      // 通知父元件更新狀態
      onResultsChange(analysisResults);
      // 預設打開 showAll
      setShowAll(true);
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

  // 載入中狀態
  if (isAnalyzing) {
    return <Loading />;
  }

  // 未分析時顯示提示訊息
  if (!results) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[14px] text-(--color-text-tertiary)">
          Click "Analyze" to detect errors.
        </p>
      </div>
    );
  }

  // 處理按鈕點擊
  const handleApplyCorrection = (index: number) => {
    console.log("Apply correction for error", index);
  };

  const handlePractice = (index: number) => {
    console.log("Practice for error", index);
  };

  const handleSkip = (index: number) => {
    console.log("Skip error", index);
  };

  // 顯示結果卡片
  return (
    <div className="flex flex-col h-full overflow-y-auto px-[20px] py-[20px] gap-[10px]">
      {/* Show All 按鈕 */}
      <div className="shrink-0">
        <Button
          variant="third"
          icon="menu_book"
          onClick={() => setShowAll(!showAll)}
          className={showAll ? "bg-(--color-bg-secondary)!" : ""}
        >
          Show All
        </Button>
      </div>

      {/* 錯誤卡片列表 */}
      {results.map((error, index) => {
        if (error.type === "grammar") {
          const grammarError = error.data;
          return (
            <div
              key={index}
              className="bg-white border border-(--color-border) rounded-[10px] p-[20px] flex flex-col gap-[20px] shrink-0"
            >
              <div className="flex flex-col gap-[10px]">
                {/* 標題區域 */}
                <div className="flex items-center gap-[10px]">
                  <div className="size-[16px] rounded-full bg-(--color-grammar) shrink-0" />
                  <h3 className="font-medium text-[16px] text-(--color-text-primary)">
                    {grammarError.grammarName}
                  </h3>
                </div>

                {/* 錯誤 → 正確 */}
                <div className="bg-(--color-bg-secondary) rounded-[5px] px-[10px] py-[5px] flex items-center gap-[10px]">
                  <span className="text-[14px] font-medium text-red-500">
                    {grammarError.originalError}
                  </span>
                  <span className="text-[14px] font-medium text-(--color-text-primary)">
                    →
                  </span>
                  <span className="text-[14px] font-medium text-(--color-text-primary)">
                    {grammarError.correctSentence}
                  </span>
                </div>

                {/* 解釋 */}
                <div className="flex flex-col gap-[5px]">
                  <p className="text-[14px] text-(--color-text-tertiary)">
                    Explanation:
                  </p>
                  <p className="font-medium text-[14px] text-(--color-text-primary)">
                    {grammarError.explanation}
                  </p>
                </div>

                {/* 例句 */}
                <div className="flex flex-col gap-[5px]">
                  <p className="text-[14px] text-(--color-text-tertiary)">
                    In-context example:
                  </p>
                  <p className="text-[14px] font-medium text-(--color-text-primary)">
                    {grammarError.example}
                  </p>
                </div>
              </div>

              {/* 按鈕區域 */}
              <div className="flex items-center gap-[10px] pt-[5px]">
                <Button
                  variant="primary"
                  icon="check_circle"
                  onClick={() => handleApplyCorrection(index)}
                >
                  Apply Correction
                </Button>
                <Button
                  variant="secondary"
                  icon="stylus"
                  onClick={() => handlePractice(index)}
                >
                  Practice
                </Button>
                <Button
                  variant="cancel"
                  icon="block"
                  className="border-none"
                  onClick={() => handleSkip(index)}
                >
                  Skip
                </Button>
              </div>
            </div>
          );
        } else {
          const vocabError = error.data;
          return (
            <div
              key={index}
              className="bg-white border border-(--color-border) rounded-[10px] p-[20px] flex flex-col gap-[20px] shrink-0"
            >
              <div className="flex flex-col gap-[10px]">
                {/* 標題區域 */}
                <div className="flex items-center gap-[10px]">
                  <div className="size-[16px] rounded-full bg-(--color-vocab) shrink-0" />
                  <h3 className="font-medium text-[16px] text-(--color-text-primary)">
                    {vocabError.correctWord}
                  </h3>
                </div>

                {/* 錯誤 → 正確 */}
                <div className="bg-(--color-bg-secondary) rounded-[5px] px-[15px] py-[10px] flex items-center gap-[10px]">
                  <span className="text-[14px] font-medium text-red-500">
                    {vocabError.wrongWord}
                  </span>
                  <span className="text-[14px] font-medium text-(--color-text-primary)">
                    →
                  </span>
                  <span className="text-[14px] font-medium text-(--color-text-primary)">
                    {vocabError.correctWord}
                  </span>
                  <span className="material-symbols-rounded text-[16px] text-(--color-text-secondary) cursor-pointer rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors duration-200">
                    volume_up
                  </span>
                </div>

                {/* 圖片區塊 */}
                <div className="w-full h-[200px] bg-gray-200 rounded-[5px] flex items-center justify-center">
                  <span className="text-(--color-text-tertiary) text-[14px]">
                    Image placeholder
                  </span>
                </div>

                {/* 詳細資訊 */}
                {/* Translation, Synonyms, Related words, Antonyms - 同一行顯示 */}
                <div className="flex flex-wrap items-center gap-[15px]">
                  <div className="flex items-center gap-[5px]">
                    <p className="text-[14px] text-(--color-text-tertiary)">
                      Translation:
                    </p>
                    <p className="font-medium text-[14px] text-(--color-text-secondary)">
                      {vocabError.translation}
                    </p>
                  </div>

                  {vocabError.synonyms.length > 0 && (
                    <div className="flex items-center gap-[5px]">
                      <p className="text-[14px] text-(--color-text-tertiary)">
                        Synonyms:
                      </p>
                      <p className="font-medium text-[14px] text-(--color-text-secondary)">
                        {vocabError.synonyms.join(", ")}
                      </p>
                    </div>
                  )}

                  {vocabError.relatedWords.length > 0 && (
                    <div className="flex items-center gap-[5px]">
                      <p className="text-[14px] text-(--color-text-tertiary)">
                        Related words:
                      </p>
                      <p className="font-medium text-[14px] text-(--color-text-secondary)">
                        {vocabError.relatedWords.join(", ")}
                      </p>
                    </div>
                  )}

                  {vocabError.antonyms.length > 0 && (
                    <div className="flex items-center gap-[5px]">
                      <p className="text-[14px] text-(--color-text-tertiary)">
                        Antonyms:
                      </p>
                      <p className="font-medium text-[14px] text-(--color-text-secondary)">
                        {vocabError.antonyms.join(", ")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Example - 獨立一行 */}
                <div className="flex flex-col gap-[5px]">
                  <p className="text-[14px] text-(--color-text-tertiary)">
                    In-context example:
                  </p>
                  <p className="text-[14px] font-medium text-(--color-text-primary)">
                    {vocabError.example}
                  </p>
                </div>
              </div>

              {/* 按鈕區域 */}
              <div className="flex items-center gap-[10px]">
                <Button
                  variant="primary"
                  icon="check_circle"
                  onClick={() => handleApplyCorrection(index)}
                >
                  Apply Correction
                </Button>
                <Button
                  variant="cancel"
                  icon="block"
                  className="border-none"
                  onClick={() => handleSkip(index)}
                >
                  Skip
                </Button>
              </div>
            </div>
          );
        }
      })}
    </div>
  );
});

ErrorDetectionCorrection.displayName = "ErrorDetectionCorrection";
