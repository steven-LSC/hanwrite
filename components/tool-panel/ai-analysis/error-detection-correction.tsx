"use client";

import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useRef,
} from "react";
import Image from "next/image";
import { getWriting, getErrorDetectionResults } from "@/lib/data/writings";
import { ErrorDetectionResult } from "@/lib/types";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { useEditor, ErrorPosition } from "@/app/(main)/editor-context";

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
  const { selectedErrorIndex, setSelectedErrorIndex, editorHighlightRef } = useEditor();
  const [results, setResults] = useState<ErrorDetectionResult | null>(
    initialResults
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAll, setShowAll] = useState(true); // 預設打開
  const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map());
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());
  const loadedImageKeysRef = useRef<Set<string>>(new Set());

  // 當 writingId 或 initialResults 改變時，同步狀態
  useEffect(() => {
    setResults(initialResults);
    // 分析完或 update 完後，預設打開 showAll
    if (initialResults) {
      setShowAll(true);
      setSelectedErrorIndex(null); // 清除選中的錯誤
      // 清除 highlight
      if (editorHighlightRef.current) {
        editorHighlightRef.current.clearHighlight();
      }
      // 清除圖片狀態
      setImageUrls(new Map());
      setLoadingImages(new Set());
      loadedImageKeysRef.current.clear();
    }
  }, [writingId, initialResults, setSelectedErrorIndex, editorHighlightRef]);

  // 當 results 改變時，載入符合條件的圖片
  useEffect(() => {
    if (!results) return;

    // 先清除所有圖片狀態，避免舊圖片殘留
    setImageUrls(new Map());
    setLoadingImages(new Set());
    loadedImageKeysRef.current.clear();

    // 為每個符合條件的錯誤載入圖片
    results.forEach((error, index) => {
      if (
        error.type === "vocab" &&
        error.data.partOfSpeech === "noun" &&
        error.data.searchKeyword
      ) {
        const searchKeyword = error.data.searchKeyword;
        const imageKey = `${index}-${searchKeyword}`;

        // 標記為已載入（避免重複載入）
        loadedImageKeysRef.current.add(imageKey);

        // 標記為載入中
        setLoadingImages((prev) => new Set(prev).add(index));

        // 載入圖片
        fetch(
          `/api/pexels/search?query=${encodeURIComponent(searchKeyword)}`
        )
          .then(async (response) => {
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            if (data.url) {
              setImageUrls((prev) => {
                const newMap = new Map(prev);
                newMap.set(index, data.url);
                return newMap;
              });
            } else if (data.error) {
              throw new Error(data.error);
            }
          })
          .catch((error) => {
            console.error("Failed to load image for error", index, error.message || error);
            // 載入失敗時，移除 key 以便重試
            loadedImageKeysRef.current.delete(imageKey);
          })
          .finally(() => {
            setLoadingImages((prev) => {
              const newSet = new Set(prev);
              newSet.delete(index);
              return newSet;
            });
          });
      }
    });
  }, [results]);

  // 當 showAll 改變時，highlight 所有錯誤或清除
  useEffect(() => {
    if (!results || !editorHighlightRef.current) return;

    if (showAll) {
      // Show All 打開時，highlight 所有錯誤
      const errors: ErrorPosition[] = results.map((error) => {
        if (error.type === "grammar") {
          return {
            position: error.data.errorPosition,
            errorType: "grammar",
          };
        } else {
          return {
            position: error.data.errorPosition,
            errorType: "vocab",
          };
        }
      });
      editorHighlightRef.current.highlightAllErrors(errors);
    } else {
      // Show All 關閉時，如果沒有選中的錯誤，清除 highlight
      if (selectedErrorIndex === null) {
        editorHighlightRef.current.clearHighlight();
      }
    }
  }, [showAll, results, selectedErrorIndex, editorHighlightRef]);

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

  // 處理卡片點擊
  const handleCardClick = (index: number, errorType: "grammar" | "vocab", position: { start: number; end: number }) => {
    // 關閉 Show All
    setShowAll(false);
    
    // 如果點擊的是已經選中的錯誤，則取消選中
    if (selectedErrorIndex === index) {
      setSelectedErrorIndex(null);
      if (editorHighlightRef.current) {
        editorHighlightRef.current.clearHighlight();
      }
    } else {
      // 選中新的錯誤
      setSelectedErrorIndex(index);
      if (editorHighlightRef.current) {
        editorHighlightRef.current.highlightError(position, errorType);
      }
    }
  };

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

  // 處理單字發音
  const handleSpeakWord = (word: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }
    
    // 取消任何正在進行的語音
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  // 顯示結果卡片
  return (
    <div className="flex flex-col h-full overflow-y-auto px-[20px] py-[20px] gap-[10px]">
      {/* Show All 按鈕 */}
      <div className="shrink-0">
        <Button
          variant="third"
          icon="menu_book"
          onClick={() => {
            const newShowAll = !showAll;
            setShowAll(newShowAll);
            // 當打開 Show All 時，清除選中的錯誤
            if (newShowAll) {
              setSelectedErrorIndex(null);
            }
          }}
          className={showAll ? "bg-(--color-bg-secondary)!" : ""}
        >
          Show All
        </Button>
      </div>

      {/* 錯誤卡片列表 */}
      {results.map((error, index) => {
        if (error.type === "grammar") {
          const grammarError = error.data;
          const isSelected = selectedErrorIndex === index;
          return (
            <div
              key={index}
              onClick={() => handleCardClick(index, "grammar", grammarError.errorPosition)}
              className={`bg-white border border-(--color-border) rounded-[10px] p-[20px] flex flex-col gap-[20px] shrink-0 cursor-pointer transition-colors ${
                isSelected ? "bg-[#DBEAFE33] border-[#DBEAFE]" : ""
              }`}
              style={isSelected ? { backgroundColor: "rgba(219, 234, 254, 0.2)" } : {}}
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
              <div className="flex items-center gap-[10px] pt-[5px]" onClick={(e) => e.stopPropagation()}>
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
          const isSelected = selectedErrorIndex === index;
          return (
            <div
              key={index}
              onClick={() => handleCardClick(index, "vocab", vocabError.errorPosition)}
              className={`bg-white border rounded-[10px] p-[20px] flex flex-col gap-[20px] shrink-0 cursor-pointer transition-colors ${
                isSelected ? "border-[#FEF08A]" : "border-(--color-border)"
              }`}
              style={isSelected ? { backgroundColor: "rgba(254, 240, 138, 0.1)" } : {}}
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
                  <span 
                    className="material-symbols-rounded text-[16px] text-(--color-text-secondary) cursor-pointer rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpeakWord(vocabError.correctWord);
                    }}
                  >
                    volume_up
                  </span>
                </div>

                {/* 圖片區塊 - 只在名詞時顯示 */}
                {vocabError.partOfSpeech === "noun" &&
                vocabError.searchKeyword ? (
                  <div className="w-full h-[200px] bg-gray-200 rounded-[5px] overflow-hidden relative">
                    {imageUrls.has(index) ? (
                      <Image
                        src={imageUrls.get(index)!}
                        alt={vocabError.correctWord}
                        fill
                        className="object-cover"
                        sizes="(max-width: 458px) 100vw, 458px"
                      />
                    ) : loadingImages.has(index) ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-(--color-text-tertiary) text-[14px]">
                          Loading image...
                        </span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-(--color-text-tertiary) text-[14px]">
                          Image placeholder
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-[200px] bg-gray-200 rounded-[5px] flex items-center justify-center">
                    <span className="text-(--color-text-tertiary) text-[14px]">
                      Image placeholder
                    </span>
                  </div>
                )}

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
              <div className="flex items-center gap-[10px]" onClick={(e) => e.stopPropagation()}>
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
