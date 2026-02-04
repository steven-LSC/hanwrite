"use client";

import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useRef,
} from "react";
import Image from "next/image";
import { getErrorDetectionResults, getWriting } from "@/lib/data/writings";
import { ErrorDetectionResult, GrammarErrorInput, VocabErrorInput } from "@/lib/types";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { useEditor, ErrorPosition, EditorClickHandlerRef } from "@/app/(main)/editor-context";
import { GrammarPracticeModal } from "./grammar-practice-modal";
import { logBehavior } from "@/lib/log-behavior";

export interface ErrorDetectionCorrectionHandle {
  handleAnalyze: () => Promise<void>;
  isAnalyzing: boolean;
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
  const { selectedErrorIndex, setSelectedErrorIndex, editorHighlightRef, editorContentRef, editorClickHandlerRef } = useEditor();
  const [results, setResults] = useState<ErrorDetectionResult | null>(
    initialResults
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAll, setShowAll] = useState(true); // 預設打開
  const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map());
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());
  const loadedImageKeysRef = useRef<Set<string>>(new Set());
  const previousResultsContentRef = useRef<string>("");
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
  const [selectedGrammarIndex, setSelectedGrammarIndex] = useState<number | null>(null);
  const [skippedErrors, setSkippedErrors] = useState<Set<number>>(new Set());
  const previousResultsLengthRef = useRef<number>(0);

  // 計算錯誤位置（反向尋找策略：從前面開始搜尋，按照錯誤 list 順序依序匹配）
  // 如果找不到錯誤，會過濾掉該錯誤
  const calculateErrorPositions = (
    errors: Array<{ type: "grammar"; data: GrammarErrorInput } | { type: "vocab"; data: VocabErrorInput }>,
    content: string
  ): ErrorDetectionResult => {
    let searchStartIndex = 0;

    return errors
      .map((error) => {
        let errorText: string;
        if (error.type === "grammar") {
          errorText = error.data.grammarError?.trim() || '';
        } else {
          errorText = error.data.vocabError?.trim() || '';
        }

        if (!errorText) {
          console.warn(`[Error Detection] 錯誤文字為空，過濾掉`);
          return null;
        }

        // 從 searchStartIndex 開始搜尋錯誤文字
        // 先嘗試直接匹配
        let index = content.indexOf(errorText, searchStartIndex);

        // 如果找不到，嘗試標準化後匹配（移除多餘空格）
        if (index === -1) {
          const normalizedContent = content.replace(/\s+/g, ' ');
          const normalizedErrorText = errorText.replace(/\s+/g, ' ');
          const normalizedIndex = normalizedContent.indexOf(normalizedErrorText, searchStartIndex);

          if (normalizedIndex !== -1) {
            // 找到標準化後的位置，需要轉換回原始位置
            // 計算標準化前的位置
            let charCount = 0;
            let normalizedCharCount = 0;
            for (let i = 0; i < content.length; i++) {
              if (normalizedCharCount === normalizedIndex) {
                index = charCount;
                break;
              }
              if (content[i].match(/\s/)) {
                // 如果是空格，只在標準化字串中計數一次
                if (normalizedCharCount === 0 || normalizedContent[normalizedCharCount - 1] !== ' ') {
                  normalizedCharCount++;
                }
              } else {
                normalizedCharCount++;
              }
              charCount++;
            }
            // 如果還是找不到，使用標準化索引作為近似值
            if (index === -1) {
              index = normalizedIndex;
            }
          }
        }

        if (index === -1) {
          // 如果找不到，過濾掉這個錯誤
          console.warn(`[Error Detection] 找不到錯誤文字: ${errorText}，過濾掉`);
          return null;
        }

        // 找到錯誤位置
        const errorPosition = {
          start: index,
          end: index + errorText.length,
        };

        // 更新 searchStartIndex，從這個錯誤之後繼續搜尋下一個錯誤
        searchStartIndex = errorPosition.end;

        // 建立包含位置的錯誤物件
        if (error.type === "grammar") {
          return {
            type: "grammar" as const,
            data: {
              ...error.data,
              errorPosition,
            },
          };
        } else {
          return {
            type: "vocab" as const,
            data: {
              ...error.data,
              errorPosition,
            },
          };
        }
      })
      .filter((error): error is NonNullable<typeof error> => error !== null);
  };

  // 註冊編輯器點擊處理器
  useImperativeHandle(editorClickHandlerRef, () => ({
    onEditorClick: () => {
      // 關閉 showAll
      setShowAll(false);
      // 清除選中的錯誤
      setSelectedErrorIndex(null);
      // 清除 highlight（已經在編輯器中處理了，這裡確保清除）
      if (editorHighlightRef.current) {
        editorHighlightRef.current.clearHighlight();
      }
    },
  }), [setSelectedErrorIndex, editorHighlightRef, setShowAll]);

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
      previousResultsContentRef.current = "";
      // 清除 skipped 狀態
      setSkippedErrors(new Set());
    } else if (initialResults) {
      // 如果是更新（例如 Apply 後），只同步 results，不改變 showAll 狀態
      // 但需要清除已移除錯誤的相關狀態
      // 這裡不需要做額外處理，因為 Apply 時已經處理了狀態更新
    }
  }, [writingId, initialResults, setSelectedErrorIndex, editorHighlightRef]);

  // 當 results 改變時，載入符合條件的圖片（有 imageSearchKeyword 的單字）
  useEffect(() => {
    if (!results) return;

    // 建立結果內容的簽名（不包含位置資訊），用於判斷是否需要重新載入圖片
    const resultsContent = JSON.stringify(
      results.map((error) => {
        if (error.type === "vocab") {
          return {
            type: "vocab",
            vocabError: error.data.vocabError,
            correctWord: error.data.correctWord,
            partOfSpeech: error.data.partOfSpeech,
            imageSearchKeyword: error.data.imageSearchKeyword,
          };
        }
        return null;
      }).filter(Boolean)
    );

    // 如果結果內容沒有改變（只是位置更新），不重新載入圖片
    if (resultsContent === previousResultsContentRef.current) {
      return;
    }

    // 更新內容簽名
    previousResultsContentRef.current = resultsContent;

    // 清除舊的圖片狀態（只在內容真正改變時）
    setImageUrls(new Map());
    setLoadingImages(new Set());
    loadedImageKeysRef.current.clear();

    // 為每個有 imageSearchKeyword 的單字錯誤載入圖片
    results.forEach((error, index) => {
      if (
        error.type === "vocab" &&
        error.data.imageSearchKeyword
      ) {
        const searchKeyword = error.data.imageSearchKeyword;
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
      // Show All 打開時，重新計算錯誤位置並 highlight 所有錯誤
      if (editorContentRef.current) {
        const content = editorContentRef.current.getContent();
        const errorsWithoutPosition = results.map((error) => {
          if (error.type === "grammar") {
            return {
              type: "grammar" as const,
              data: {
                grammarName: error.data.grammarName,
                grammarError: error.data.grammarError,
                correctSentence: error.data.correctSentence,
                explanation: error.data.explanation,
                example: error.data.example,
              },
            };
          } else {
            return {
              type: "vocab" as const,
              data: {
                correctWord: error.data.correctWord,
                vocabError: error.data.vocabError,
                translation: error.data.translation,
                partOfSpeech: error.data.partOfSpeech,
                example: error.data.example,
                synonyms: error.data.synonyms,
                relatedWords: error.data.relatedWords,
                antonyms: error.data.antonyms,
                imageSearchKeyword: error.data.imageSearchKeyword,
              },
            };
          }
        });
        const updatedResults = calculateErrorPositions(errorsWithoutPosition, content);

        // 如果結果改變了（有錯誤被過濾掉），更新狀態
        if (updatedResults.length !== results.length) {
          setResults(updatedResults);
          onResultsChange(updatedResults);
          // 如果當前選中的錯誤被過濾掉了，清除選中狀態
          if (selectedErrorIndex !== null && selectedErrorIndex >= updatedResults.length) {
            setSelectedErrorIndex(null);
          }
          // 使用更新後的結果進行 highlight
          const errors: ErrorPosition[] = updatedResults.map((error) => {
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
          // 結果沒變，直接 highlight
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
        }
      }
    } else {
      // Show All 關閉時，如果沒有選中的錯誤，清除 highlight
      if (selectedErrorIndex === null) {
        editorHighlightRef.current.clearHighlight();
      }
    }
  }, [showAll, results, selectedErrorIndex, editorHighlightRef, editorContentRef, onResultsChange, setSelectedErrorIndex]);

  const handleAnalyze = async () => {
    // 清除編輯器上的 highlight
    if (editorHighlightRef.current) {
      editorHighlightRef.current.clearHighlight();
    }
    // 清除選中的錯誤
    setSelectedErrorIndex(null);
    // 關閉 showAll，避免在分析完成後自動重新 highlight
    setShowAll(false);

    setIsAnalyzing(true);
    try {
      // 從編輯器取得內容
      if (!editorContentRef.current) {
        throw new Error("Editor content ref not available");
      }
      const content = editorContentRef.current.getContent();

      if (!content || !content.trim()) {
        throw new Error("Content is empty");
      }

      // 取得分析結果（不包含位置）
      const analysisResultsWithoutPosition = await getErrorDetectionResults(content);

      // 計算錯誤位置
      const analysisResults = calculateErrorPositions(analysisResultsWithoutPosition, content);

      setResults(analysisResults);
      // 通知父元件更新狀態
      onResultsChange(analysisResults);

      // 取得 title（如果 writingId 存在）
      let title: string | null = null;
      if (writingId && writingId !== "new") {
        try {
          const writing = await getWriting(writingId);
          title = writing.title;
        } catch (error) {
          // 如果取得 title 失敗，繼續執行，title 保持為 null
          console.warn("Failed to get writing title:", error);
        }
      }

      // 收到結果後記錄：當時的文章、title、回傳結果（不包含 errorPosition，因為那是前端計算的）
      logBehavior("error-detection-analyze", {
        content,
        title,
        results: analysisResultsWithoutPosition,
      });

      // 如果是第一次分析（沒有 results），預設打開 showAll
      // 如果是 Update（已經有 results），保持 showAll 為 false，不自動 highlight
      if (!results || results.length === 0) {
        setShowAll(true);
      }
    } catch (error) {
      console.error("Failed to analyze:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 暴露 handleAnalyze 和 isAnalyzing 給父元件
  useImperativeHandle(ref, () => ({
    handleAnalyze,
    isAnalyzing,
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

  // 沒有錯誤時顯示訊息
  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[14px] text-(--color-text-tertiary)">
          No error detected.
        </p>
      </div>
    );
  }

  // 處理卡片點擊
  const handleCardClick = (index: number, errorType: "grammar" | "vocab", position: { start: number; end: number }) => {
    // 關閉 Show All
    setShowAll(false);

    // 重新計算所有錯誤的位置（因為文章內容可能已改變）
    if (results && editorContentRef.current) {
      const content = editorContentRef.current.getContent();
      const errorsWithoutPosition = results.map((error) => {
        if (error.type === "grammar") {
          return {
            type: "grammar" as const,
            data: {
              grammarName: error.data.grammarName,
              grammarError: error.data.grammarError,
              correctSentence: error.data.correctSentence,
              explanation: error.data.explanation,
              example: error.data.example,
            },
          };
        } else {
          return {
            type: "vocab" as const,
            data: {
              correctWord: error.data.correctWord,
              vocabError: error.data.vocabError,
              translation: error.data.translation,
              partOfSpeech: error.data.partOfSpeech,
              example: error.data.example,
              synonyms: error.data.synonyms,
              relatedWords: error.data.relatedWords,
              antonyms: error.data.antonyms,
              imageSearchKeyword: error.data.imageSearchKeyword,
            },
          };
        }
      });
      const updatedResults = calculateErrorPositions(errorsWithoutPosition, content);

      // 如果更新後的結果數量改變了（有錯誤被過濾掉），需要調整索引
      if (updatedResults.length !== results.length) {
        // 如果當前選中的錯誤被過濾掉了，清除選中狀態
        if (index >= updatedResults.length) {
          setSelectedErrorIndex(null);
          if (editorHighlightRef.current) {
            editorHighlightRef.current.clearHighlight();
          }
        } else {
          // 調整索引（如果被過濾的錯誤在當前選中錯誤之前，索引需要調整）
          const newIndex = Math.min(index, updatedResults.length - 1);
          setSelectedErrorIndex(newIndex);
          const updatedPosition = updatedResults[newIndex]?.data.errorPosition;
          if (updatedPosition && editorHighlightRef.current) {
            editorHighlightRef.current.highlightError(updatedPosition, errorType);
          }
        }
      } else {
        // 結果數量沒變，使用原來的索引
        const updatedPosition = updatedResults[index]?.data.errorPosition || position;

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
            editorHighlightRef.current.highlightError(updatedPosition, errorType);
          }
        }
      }

      setResults(updatedResults);
      onResultsChange(updatedResults);
    } else {
      // 如果沒有 results，使用原始 position
      if (selectedErrorIndex === index) {
        setSelectedErrorIndex(null);
        if (editorHighlightRef.current) {
          editorHighlightRef.current.clearHighlight();
        }
      } else {
        setSelectedErrorIndex(index);
        if (editorHighlightRef.current) {
          editorHighlightRef.current.highlightError(position, errorType);
        }
      }
    }
  };

  // 處理按鈕點擊
  const handleApplyCorrection = (index: number, errorType: "grammar" | "vocab", position: { start: number; end: number }) => {
    if (!results || !editorHighlightRef.current) return;

    // 關閉 Show All
    setShowAll(false);

    // 取得正確文字和完整的錯誤資訊
    let correctText: string;
    let errorData: any;
    if (errorType === "grammar") {
      const grammarError = results[index];
      if (grammarError.type !== "grammar") return;
      correctText = grammarError.data.correctSentence;
      errorData = grammarError.data;
    } else {
      const vocabError = results[index];
      if (vocabError.type !== "vocab") return;
      correctText = vocabError.data.correctWord;
      errorData = vocabError.data;
    }

    // 記錄 apply 的卡片的所有資訊
    logBehavior("error-detection-apply", {
      errorType,
      errorData,
      position,
    });

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
    if (!results) return;

    // 關閉 Show All
    setShowAll(false);

    // 取得完整的錯誤資訊
    const error = results[index];
    const errorData = error.type === "grammar" ? error.data : error.data;

    // 記錄 skip 的卡片的所有資訊
    logBehavior("error-detection-skip", {
      errorType: error.type,
      errorData,
    });

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

    // 記錄行為（只在 vocab 類型時記錄）
    if (errorType === "vocab") {
      logBehavior("vocab-speaker-click");
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
                    {grammarError.grammarError}
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
                  {vocabError.partOfSpeech && (
                    <span className="text-[14px] text-(--color-text-tertiary)">
                      {vocabError.partOfSpeech}
                    </span>
                  )}
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
                  {vocabError.partOfSpeech && (
                    <span className="text-[14px] text-(--color-text-tertiary)">
                      {vocabError.partOfSpeech}
                    </span>
                  )}
                </div>

                {/* 錯誤 → 正確 */}
                <div className="bg-(--color-bg-secondary) rounded-[5px] px-[15px] py-[10px] flex items-center gap-[10px]">
                  <span className="text-[14px] font-medium text-red-500">
                    {vocabError.vocabError}
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

                {/* 圖片區塊 - 只在有 imageSearchKeyword 時顯示 */}
                {vocabError.imageSearchKeyword ? (
                  <div
                    className="w-full h-[200px] bg-gray-200 rounded-[5px] overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (imageUrls.has(index)) {
                        // 記錄行為
                        logBehavior("vocab-image-click");
                        // 在新視窗打開圖片
                        window.open(imageUrls.get(index)!, "_blank");
                      }
                    }}
                  >
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
                ) : null}

                {/* 詳細資訊 */}
                <div className="flex flex-col gap-[10px]">
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

                  {vocabError.relatedWords && vocabError.relatedWords.length > 0 && (
                    <div className="flex items-center gap-[5px]">
                      <p className="text-[14px] text-(--color-text-tertiary)">
                        Related words:
                      </p>
                      <p className="font-medium text-[14px] text-(--color-text-secondary)">
                        {vocabError.relatedWords.join(", ")}
                      </p>
                    </div>
                  )}

                  {vocabError.antonyms && vocabError.antonyms.length > 0 && (
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
