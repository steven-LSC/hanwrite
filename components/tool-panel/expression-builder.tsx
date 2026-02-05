"use client";

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Button } from "../ui/button";
import { Loading } from "../ui/loading";
import { ErrorMessage } from "../ui/error-message";
import { ExpressionBuilderResult } from "@/lib/types";
import { getExpressionBuilderResults } from "@/lib/data/writings";
import { logBehavior } from "@/lib/log-behavior";

export interface ExpressionBuilderHandle {
  isAnalyzing: boolean;
}

interface ExpressionBuilderProps {
  writingId?: string;
  initialResults: ExpressionBuilderResult[] | null;
  initialInputText?: string;
  onResultsChange: (results: ExpressionBuilderResult[]) => void;
  onInputTextChange: (inputText: string) => void;
  onLoadingChange?: (isLoading: boolean) => void; // loading 狀態變化 callback
}

export const ExpressionBuilder = forwardRef<ExpressionBuilderHandle, ExpressionBuilderProps>(({
  writingId,
  initialResults,
  initialInputText = "",
  onResultsChange,
  onInputTextChange,
  onLoadingChange,
}, ref) => {
  const [inputText, setInputText] = useState(initialInputText);
  const [results, setResults] = useState<ExpressionBuilderResult[]>(
    initialResults || []
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 追蹤元件是否已掛載，避免在已卸載的元件上設定狀態
  const isMountedRef = useRef(true);

  // 當 writingId、initialResults 或 initialInputText 改變時，同步狀態
  useEffect(() => {
    setResults(initialResults || []);
    // 清除錯誤狀態
    setError(null);
  }, [writingId, initialResults]);

  useEffect(() => {
    setInputText(initialInputText);
  }, [writingId, initialInputText]);

  // 追蹤元件掛載狀態
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 暴露 isAnalyzing 給父元件
  useImperativeHandle(ref, () => ({
    isAnalyzing,
  }));

  // 當 isAnalyzing 變化時，通知父元件
  useEffect(() => {
    onLoadingChange?.(isAnalyzing);
  }, [isAnalyzing, onLoadingChange]);

  // 當輸入文字改變時，通知父元件
  const handleInputChange = (value: string) => {
    setInputText(value);
    onInputTextChange(value);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null); // 清除之前的錯誤

    try {
      // 檢查輸入是否為空
      if (!inputText.trim()) {
        setError("輸入內容為空，無法進行分析");
        setIsAnalyzing(false);
        return;
      }

      const { results: analysisResults, duration } = await getExpressionBuilderResults(inputText);
      // 收到結果後記錄（包含使用者輸入內容）
      logBehavior("expression-builder-analyze", {
        results: analysisResults,
        duration,
        inputText: inputText.trim()
      });
      // 只有在元件還掛載時才更新本地狀態
      if (isMountedRef.current) {
        setResults(analysisResults);
        setIsAnalyzing(false);
      }
      // 無論元件是否掛載，都要通知父元件更新狀態（這樣結果才會被保存）
      onResultsChange(analysisResults);
      // 清除錯誤狀態
      setError(null);
    } catch (error) {
      console.error("Analysis failed:", error);
      // 設定錯誤訊息
      if (isMountedRef.current) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("分析失敗，請稍後再試");
        }
        setIsAnalyzing(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 輸入區（固定高度） */}
      <div className="px-[20px] py-[20px] border-(--color-border) shrink-0">
        <div className="flex flex-col gap-[10px]">
          <div className="bg-white border border-(--color-border) rounded-[10px] p-[20px] h-[154px] flex flex-col gap-[10px]">
            <textarea
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Enter a sentence"
              className="flex-1 text-[16px] text-(--color-text-secondary) outline-none resize-none overflow-y-auto"
            />
            <div className="flex justify-end">
              <Button
                variant="primary"
                icon="donut_large"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                Analyze
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 結果顯示區（可滾動） */}
      <div className="flex-1 overflow-y-auto px-[20px] py-[20px] min-h-0 scrollbar-hide">
        {isAnalyzing ? (
          <Loading />
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-[10px]">
              <ErrorMessage message={error} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {results.map((result, index) => (
              <ResultBlock key={index} result={result} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

ExpressionBuilder.displayName = "ExpressionBuilder";

// 結果區塊元件
function ResultBlock({ result }: { result: ExpressionBuilderResult }) {
  // vocab+grammar+example 合併卡片
  if (result.type === "vocab-grammar-example") {
    // 判斷是否為單字輸入（grammar 為空時只顯示 vocab）
    const isSingleWord = !result.grammar.grammar || result.grammar.grammar.trim() === "";

    return (
      <div className="bg-white border border-(--color-border) rounded-[10px] p-[20px] flex flex-col gap-[20px]">
        {/* Vocabulary 區塊 */}
        <div className="flex flex-col gap-[10px]">
          <div className="flex items-center gap-[5px]">
            <div
              className="w-[16px] h-[16px] rounded-full"
              style={{ backgroundColor: "var(--color-vocab)" }}
            />
            <span className="font-medium text-[16px] text-(--color-text-secondary)">
              Vocabulary
            </span>
          </div>
          <div className="flex flex-col gap-[5px]">
            {result.vocab.map((item, idx) => (
              <div
                key={idx}
                className="bg-(--color-bg-secondary) px-[10px] py-[5px] rounded-[5px] flex items-center gap-[5px]"
              >
                <span className="font-medium text-[14px] text-(--color-text-secondary)">
                  {item.vocab}
                </span>
                <span className="font-medium text-[14px] text-(--color-text-secondary)">
                  →
                </span>
                <span className="font-medium text-[14px] text-(--color-text-secondary)">
                  {item.translate}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Grammar 區塊（僅在非單字時顯示） */}
        {!isSingleWord && (
          <div className="flex flex-col gap-[10px]">
            <div className="flex items-center gap-[5px]">
              <div
                className="w-[16px] h-[16px] rounded-full"
                style={{ backgroundColor: "var(--color-grammar)" }}
              />
              <span className="font-medium text-[16px] text-(--color-text-secondary)">
                Grammar
              </span>
            </div>
            <div className="bg-(--color-bg-secondary) px-[10px] py-[5px] rounded-[5px] flex items-center gap-[5px]">
              <span className="shrink-0 max-w-[30%] font-medium text-[14px] text-(--color-text-secondary)">
                {result.grammar.grammar}
              </span>
              <span className="font-medium text-[14px] text-(--color-text-secondary)">
                →
              </span>
              <span className="font-medium text-[14px] text-(--color-text-secondary)">
                {result.grammar.explanation}
              </span>
            </div>
          </div>
        )}

        {/* Example Sentence 區塊（僅在非單字時顯示） */}
        {!isSingleWord && (
          <div className="flex flex-col gap-[10px]">
            <div className="flex items-center gap-[5px]">
              <div
                className="w-[16px] h-[16px] rounded-full"
                style={{ backgroundColor: "var(--color-vocab)" }}
              />
              <span className="font-medium text-[16px] text-(--color-text-secondary)">
                +
              </span>
              <div
                className="w-[16px] h-[16px] rounded-full"
                style={{ backgroundColor: "var(--color-grammar)" }}
              />
              <span className="font-medium text-[16px] text-(--color-text-secondary)">
                Example Sentence
              </span>
            </div>
            <div className="bg-(--color-bg-secondary) px-[10px] py-[5px] rounded-[5px]">
              <span className="font-medium text-[14px] text-(--color-text-secondary)">
                {result.example}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 連結詞卡片
  if (result.type === "connective") {
    return (
      <div className="bg-white border border-(--color-border) rounded-[10px] p-[20px] flex flex-col gap-[10px]">
        <div className="flex items-center gap-[5px]">
          <div
            className="w-[16px] h-[16px] rounded-full"
            style={{ backgroundColor: "var(--color-connective)" }}
          />
          <span className="font-medium text-[16px] text-(--color-text-secondary)">
            Connective
          </span>
        </div>
        <div className="bg-(--color-bg-secondary) px-[10px] py-[5px] rounded-[5px]">
          <span className="font-medium text-[14px] text-(--color-text-secondary)">
            {result.content.join(", ")}
          </span>
        </div>
      </div>
    );
  }

  return null;
}
