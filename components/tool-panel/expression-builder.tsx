"use client";

import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Loading } from "../ui/loading";
import { ExpressionBuilderResult } from "@/lib/types";
import { getExpressionBuilderResults } from "@/lib/data/writings";

interface ExpressionBuilderProps {
  writingId?: string;
  initialResults: ExpressionBuilderResult[] | null;
  onResultsChange: (results: ExpressionBuilderResult[]) => void;
}

export function ExpressionBuilder({
  writingId,
  initialResults,
  onResultsChange,
}: ExpressionBuilderProps) {
  const [inputText, setInputText] = useState("");
  const [results, setResults] = useState<ExpressionBuilderResult[]>(
    initialResults || []
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 當 writingId 或 initialResults 改變時，同步狀態
  useEffect(() => {
    setResults(initialResults || []);
  }, [writingId, initialResults]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    try {
      const analysisResults = await getExpressionBuilderResults(inputText);
      setResults(analysisResults);
      // 通知父元件更新狀態
      onResultsChange(analysisResults);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
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
              onChange={(e) => setInputText(e.target.value)}
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
  if (result.type === "vocab") {
    return (
      <div className="bg-white border border-(--color-border) rounded-[10px] p-[20px] flex flex-col gap-[10px]">
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
          {result.content.map((item, idx) => (
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
    );
  }

  if (result.type === "grammar") {
    return (
      <div className="bg-white border border-(--color-border) rounded-[10px] p-[20px] flex flex-col gap-[10px]">
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
          <span className="font-medium text-[14px] text-(--color-text-secondary)">
            {result.content.grammar}
          </span>
          <span className="font-medium text-[14px] text-(--color-text-secondary)">
            →
          </span>
          <span className="font-medium text-[14px] text-(--color-text-secondary)">
            {result.content.explanation}
          </span>
        </div>
      </div>
    );
  }

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

  if (result.type === "example") {
    return (
      <div className="bg-white border border-(--color-border) rounded-[10px] p-[20px] flex flex-col gap-[10px]">
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
            {result.content}
          </span>
        </div>
      </div>
    );
  }

  return null;
}
