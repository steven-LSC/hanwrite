"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { Loading } from "../ui/loading";
import { ExpressionBuilderResult } from "@/lib/types";
import { getExpressionBuilderResults } from "@/lib/data/writings";

interface ExpressionBuilderProps {
  writingId?: string;
  initialResults: ExpressionBuilderResult[] | null;
  initialInputText?: string;
  onResultsChange: (results: ExpressionBuilderResult[]) => void;
  onInputTextChange: (inputText: string) => void;
}

export function ExpressionBuilder({
  writingId,
  initialResults,
  initialInputText = "",
  onResultsChange,
  onInputTextChange,
}: ExpressionBuilderProps) {
  const [inputText, setInputText] = useState(initialInputText);
  const [results, setResults] = useState<ExpressionBuilderResult[]>(
    initialResults || []
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // 追蹤元件是否已掛載，避免在已卸載的元件上設定狀態
  const isMountedRef = useRef(true);

  // 當 writingId、initialResults 或 initialInputText 改變時，同步狀態
  useEffect(() => {
    setResults(initialResults || []);
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

  // 當輸入文字改變時，通知父元件
  const handleInputChange = (value: string) => {
    setInputText(value);
    onInputTextChange(value);
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    try {
      const analysisResults = await getExpressionBuilderResults(inputText);
      // 只有在元件還掛載時才更新本地狀態
      if (isMountedRef.current) {
        setResults(analysisResults);
        setIsAnalyzing(false);
      }
      // 無論元件是否掛載，都要通知父元件更新狀態（這樣結果才會被保存）
      onResultsChange(analysisResults);
    } catch (error) {
      console.error("Analysis failed:", error);
      // 只有在元件還掛載時才更新狀態
      if (isMountedRef.current) {
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
              >
                Analyze
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 結果顯示區（可滾動） */}
      <div className="flex-1 overflow-y-auto px-[20px] py-[20px] min-h-0">
        {isAnalyzing ? (
          <Loading />
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
}

// 結果區塊元件
function ResultBlock({ result }: { result: ExpressionBuilderResult }) {
  // vocab+grammar+example 合併卡片
  if (result.type === "vocab-grammar-example") {
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

        {/* Grammar 區塊 */}
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

        {/* Example Sentence 區塊 */}
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
