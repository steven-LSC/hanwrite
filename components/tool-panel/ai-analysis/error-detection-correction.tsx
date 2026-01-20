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
import { GrammarPracticeModal } from "./grammar-practice-modal";

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
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
  const [selectedGrammarIndex, setSelectedGrammarIndex] = useState<number | null>(null);
  const [skippedErrors, setSkippedErrors] = useState<Set<number>>(new Set());
  const previousResultsLengthRef = useRef<number>(0);

  // 當組件卸載時，清除 highlight
  useEffect(() => {
    return () => {
      // 組件卸載時的 cleanup 函數
      if (editorHighlightRef.current) {
        editorHighlightRef.current.clearHighlight();
      }
      setSelectedErrorIndex(null);
    };
  }, [editorHighlightRef, setSelectedErrorIndex]);

  // 當 writingId 或 initialResults 改變時，同步狀態
  useEffect(() => {
    // 檢查是否是新的分析（results 長度增加或從 null 變為有值）
    const currentLength = initialResults?.length || 0;
    const isNewAnalysis = currentLength > previousResultsLengthRef.current || previousResultsLengthRef.current === 0;
    
    setResults(initialResults);
    
    // 更新前一次的長度
    previousResultsLengthRef.current = currentLength;
    
    // 只有在新的分析時才打開 showAll，Apply 後的更新不應該打開
    if (initialResults && isNewAnalysis) {
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
      // 清除 skipped 狀態
      setSkippedErrors(new Set());
    } else if (initialResults) {
      // 如果是更新（例如 Apply 後），只同步 results，不改變 showAll 狀態
      // 但需要清除已移除錯誤的相關狀態
      // 這裡不需要做額外處理，因為 Apply 時已經處理了狀態更新
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
  const handleApplyCorrection = (index: number, errorType: "grammar" | "vocab", position: { start: number; end: number }) => {
    if (!results || !editorHighlightRef.current) return;

    // 關閉 Show All
    setShowAll(false);

    // 取得正確文字
    let correctText: string;
    if (errorType === "grammar") {
      const grammarError = results[index];
      if (grammarError.type !== "grammar") return;
      correctText = grammarError.data.correctSentence;
    } else {
      const vocabError = results[index];
      if (vocabError.type !== "vocab") return;
      correctText = vocabError.data.correctWord;
    }

    // 計算文字長度變化
    const originalLength = position.end - position.start;
    const newLength = correctText.length;
    const lengthDiff = newLength - originalLength;

    // 替換編輯器中的文字
    editorHighlightRef.current.replaceText(position, correctText);

    // 更新其他錯誤的位置資訊（在替換位置之後的錯誤需要調整位置）
    const updatedResults = results.map((error, i) => {
      if (i === index) {
        // 跳過要被移除的錯誤
        return null;
      }

      // 如果錯誤位置在替換位置之後，需要調整位置
      let errorPosition: { start: number; end: number };
      if (error.type === "grammar") {
        errorPosition = error.data.errorPosition;
      } else {
        errorPosition = error.data.errorPosition;
      }

      if (errorPosition.start >= position.end) {
        // 錯誤在替換位置之後，需要調整位置
        const adjustedPosition = {
          start: errorPosition.start + lengthDiff,
          end: errorPosition.end + lengthDiff,
        };

        // 創建更新後的錯誤物件
        if (error.type === "grammar") {
          return {
            ...error,
            data: {
              ...error.data,
              errorPosition: adjustedPosition,
            },
          };
        } else {
          return {
            ...error,
            data: {
              ...error.data,
              errorPosition: adjustedPosition,
            },
          };
        }
      }

      // 位置不需要調整
      return error;
    }).filter((error): error is NonNullable<typeof error> => error !== null);

    setResults(updatedResults);

    // 通知父元件更新狀態
    onResultsChange(updatedResults);

    // 清除選中狀態和 highlight
    if (selectedErrorIndex === index) {
      setSelectedErrorIndex(null);
    } else if (selectedErrorIndex !== null && selectedErrorIndex > index) {
      // 如果選中的錯誤索引大於被移除的索引，需要減 1
      setSelectedErrorIndex(selectedErrorIndex - 1);
    }

    if (editorHighlightRef.current) {
      editorHighlightRef.current.clearHighlight();
    }

    // 清除該錯誤的圖片狀態（如果有的話）
    if (imageUrls.has(index)) {
      setImageUrls((prev) => {
        const newMap = new Map(prev);
        // 需要更新所有索引大於 index 的圖片位置
        const updatedMap = new Map<number, string>();
        prev.forEach((url, imgIndex) => {
          if (imgIndex < index) {
            updatedMap.set(imgIndex, url);
          } else if (imgIndex > index) {
            updatedMap.set(imgIndex - 1, url);
          }
        });
        return updatedMap;
      });
    }

    // 清除 loading 狀態
    if (loadingImages.has(index)) {
      setLoadingImages((prev) => {
        const newSet = new Set<number>();
        prev.forEach((imgIndex) => {
          if (imgIndex < index) {
            newSet.add(imgIndex);
          } else if (imgIndex > index) {
            newSet.add(imgIndex - 1);
          }
        });
        return newSet;
      });
    }

    // 從 skippedErrors 中移除（如果有的話）
    if (skippedErrors.has(index)) {
      setSkippedErrors((prev) => {
        const newSet = new Set<number>();
        prev.forEach((skippedIndex) => {
          if (skippedIndex < index) {
            newSet.add(skippedIndex);
          } else if (skippedIndex > index) {
            newSet.add(skippedIndex - 1);
          }
        });
        return newSet;
      });
    }
  };

  const handlePractice = (index: number, errorType: "grammar" | "vocab", position: { start: number; end: number }) => {
    // 確保卡片被選中並 highlight
    setShowAll(false);
    setSelectedErrorIndex(index);
    if (editorHighlightRef.current) {
      editorHighlightRef.current.highlightError(position, errorType);
    }
    setSelectedGrammarIndex(index);
    setIsPracticeModalOpen(true);
  };

  const handleSkip = (index: number) => {
    // 關閉 Show All
    setShowAll(false);

    // 將錯誤索引添加到 skippedErrors Set
    setSkippedErrors((prev) => {
      const newSet = new Set(prev);
      newSet.add(index);
      return newSet;
    });

    // 如果該錯誤被選中，清除選中狀態和 highlight
    if (selectedErrorIndex === index) {
      setSelectedErrorIndex(null);
      if (editorHighlightRef.current) {
        editorHighlightRef.current.clearHighlight();
      }
    }
  };

  const handleRevert = (index: number, errorType: "grammar" | "vocab", position: { start: number; end: number }) => {
    // 從 skippedErrors Set 中移除該錯誤索引
    setSkippedErrors((prev) => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });

    // 關閉 Show All 並選中該錯誤（當作點選該卡片）
    setShowAll(false);
    setSelectedErrorIndex(index);
    if (editorHighlightRef.current) {
      editorHighlightRef.current.highlightError(position, errorType);
    }
  };

  // 處理單字發音
  const handleSpeakWord = (word: string, index: number, errorType: "grammar" | "vocab", position: { start: number; end: number }) => {
    // 確保卡片被選中並 highlight
    setShowAll(false);
    setSelectedErrorIndex(index);
    if (editorHighlightRef.current) {
      editorHighlightRef.current.highlightError(position, errorType);
    }

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
          const isSkipped = skippedErrors.has(index);

          // 簡化版本（Skip 後）
          if (isSkipped) {
            return (
              <div
                key={index}
                className="bg-white border border-(--color-border) rounded-[10px] p-[15px] flex items-center justify-between shrink-0"
              >
                <div className="flex items-center gap-[10px]">
                  <div className="size-[16px] rounded-full bg-(--color-grammar) shrink-0" />
                  <h3 className="font-medium text-[16px] text-(--color-text-primary)">
                    {grammarError.grammarName}
                  </h3>
                </div>
                <Button
                  variant="cancel"
                  icon="undo"
                  onClick={(e) => {
                    e?.stopPropagation();
                    handleRevert(index, "grammar", grammarError.errorPosition);
                  }}
                >
                  Revert
                </Button>
              </div>
            );
          }

          // 完整版本
          return (
            <div
              key={index}
              onClick={() => handleCardClick(index, "grammar", grammarError.errorPosition)}
              className={`bg-white border border-(--color-border) rounded-[10px] p-[20px] flex flex-col gap-[20px] shrink-0 cursor-pointer transition-colors ${isSelected ? "bg-[#DBEAFE33] border-[#DBEAFE]" : ""
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
                  onClick={() => handleApplyCorrection(index, "grammar", grammarError.errorPosition)}
                >
                  Apply Correction
                </Button>
                <Button
                  variant="secondary"
                  icon="stylus"
                  onClick={() => handlePractice(index, "grammar", grammarError.errorPosition)}
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
          const isSkipped = skippedErrors.has(index);

          // 簡化版本（Skip 後）
          if (isSkipped) {
            return (
              <div
                key={index}
                className="bg-white border border-(--color-border) rounded-[10px] p-[15px] flex items-center justify-between shrink-0"
              >
                <div className="flex items-center gap-[10px]">
                  <div className="size-[16px] rounded-full bg-(--color-vocab) shrink-0" />
                  <h3 className="font-medium text-[16px] text-(--color-text-primary)">
                    {vocabError.correctWord}
                  </h3>
                </div>
                <Button
                  variant="cancel"
                  icon="undo"
                  onClick={(e) => {
                    e?.stopPropagation();
                    handleRevert(index, "vocab", vocabError.errorPosition);
                  }}
                >
                  Revert
                </Button>
              </div>
            );
          }

          // 完整版本
          return (
            <div
              key={index}
              onClick={() => handleCardClick(index, "vocab", vocabError.errorPosition)}
              className={`bg-white border rounded-[10px] p-[20px] flex flex-col gap-[20px] shrink-0 cursor-pointer transition-colors ${isSelected ? "border-[#FEF08A]" : "border-(--color-border)"
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
                      handleSpeakWord(vocabError.correctWord, index, "vocab", vocabError.errorPosition);
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
                  onClick={() => handleApplyCorrection(index, "vocab", vocabError.errorPosition)}
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

      {/* Grammar Practice Modal */}
      {selectedGrammarIndex !== null && results[selectedGrammarIndex]?.type === "grammar" && (
        <GrammarPracticeModal
          isOpen={isPracticeModalOpen}
          onClose={() => {
            setIsPracticeModalOpen(false);
            setSelectedGrammarIndex(null);
          }}
          grammarName={results[selectedGrammarIndex].data.grammarName}
          explanation={results[selectedGrammarIndex].data.explanation}
        />
      )}
    </div>
  );
});

ErrorDetectionCorrection.displayName = "ErrorDetectionCorrection";
