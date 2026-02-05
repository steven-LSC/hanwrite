"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { GrammarPracticeResult } from "@/lib/types";
import { checkGrammarPractice, generateTranslationQuestion } from "@/lib/data/grammar-practice";
import { logBehavior } from "@/lib/log-behavior";
import { Loading } from "@/components/ui/loading";

interface GrammarPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  grammarName: string;
  explanation: string;
  grammarError: string;
  correctSentence: string;
}

export function GrammarPracticeModal({
  isOpen,
  onClose,
  grammarName,
  explanation,
  grammarError,
  correctSentence,
}: GrammarPracticeModalProps) {
  const [sentence, setSentence] = useState("");
  const [checkResult, setCheckResult] = useState<GrammarPracticeResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDetailedExplanationOpen, setIsDetailedExplanationOpen] = useState(false);
  const [translationQuestion, setTranslationQuestion] = useState<string | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);

  // Modal 打開時生成翻譯題目
  useEffect(() => {
    if (!isOpen) {
      // Modal 關閉時重置狀態
      setTranslationQuestion(null);
      setIsLoadingQuestion(false);
      return;
    }

    // Modal 打開時，如果還沒有題目且沒有在載入中，則生成題目
    if (!translationQuestion && !isLoadingQuestion) {
      let cancelled = false;
      setIsLoadingQuestion(true);
      const startTime = Date.now();
      generateTranslationQuestion(
        grammarName,
        grammarError,
        correctSentence,
        explanation
      )
        .then((result) => {
          if (!cancelled) {
            setTranslationQuestion(result.translationQuestion);
            // 記錄生成題目的行為
            logBehavior("grammar-practice-generate", {
              grammarName,
              grammarError,
              correctSentence,
              explanation,
              translationQuestion: result.translationQuestion,
              duration: result.duration || Date.now() - startTime,
            });
          }
        })
        .catch((error) => {
          if (!cancelled) {
            console.error("Failed to generate translation question:", error);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoadingQuestion(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }
  }, [isOpen, grammarName, grammarError, correctSentence, explanation]);

  const handleCheck = async () => {
    if (!sentence.trim()) return;

    setIsChecking(true);
    try {
      const result = await checkGrammarPractice(
        sentence,
        grammarName,
        grammarError,
        correctSentence,
        explanation
      );
      setCheckResult(result);
      // 收到結果後記錄
      logBehavior("grammar-practice-check", {
        ...result,
        duration: result.duration,
      });
    } catch (error) {
      console.error("Failed to check grammar practice:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleTryAgain = () => {
    setSentence("");
    setCheckResult(null);
    setIsDetailedExplanationOpen(false);
  };

  const handleLeave = () => {
    handleClose();
  };

  const toggleDetailedExplanation = () => {
    setIsDetailedExplanationOpen(!isDetailedExplanationOpen);
  };

  const handleCancel = () => {
    // 如果已經成功完成練習，不需要記錄取消
    if (checkResult && checkResult.isCorrect) {
      handleClose();
      return;
    }
    // 記錄取消練習的行為
    logBehavior("grammar-practice-cancel", {
      grammarName,
      grammarError,
      correctSentence,
      explanation,
      translationQuestion: translationQuestion || null,
      hasUserInput: !!sentence.trim(),
      userSentence: sentence.trim() || undefined,
    });
    handleClose();
  };

  const handleClose = () => {
    setSentence("");
    setCheckResult(null);
    setIsChecking(false);
    setIsDetailedExplanationOpen(false);
    setTranslationQuestion(null);
    setIsLoadingQuestion(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} closeOnBackdropClick={false}>
      <div
        className={`bg-white rounded-[10px] w-[600px] flex flex-col overflow-hidden p-[30px] gap-[20px] ${checkResult && checkResult.isCorrect ? "gap-[60px]" : "gap-[20px]"
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題區域 */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-[10px]">
            <span className="material-symbols-rounded text-[20px] text-(--color-text-primary)">
              stylus
            </span>
            <h2 className="font-medium text-[20px] text-(--color-text-primary)">
              {grammarName}
            </h2>
          </div>
          {!isLoadingQuestion && (
            <button
              onClick={checkResult && checkResult.isCorrect ? handleClose : handleCancel}
              disabled={isChecking}
              className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-black/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-(--color-text-secondary)"
            >
              <span className="material-symbols-rounded text-[20px]">close</span>
            </button>
          )}
        </div>

        {/* Loading 狀態：正在生成翻譯題目時，只顯示 loading */}
        {isLoadingQuestion && !translationQuestion && (
          <div className="flex items-center justify-center py-[60px]">
            <Loading text="Generating question..." />
          </div>
        )}

        {/* 內容區域：只有在收到翻譯題目後才顯示 */}
        {translationQuestion && (
          <>
            {/* Explanation 區域 - 只在未檢查或錯誤時顯示 */}
            {(!checkResult || !checkResult.isCorrect) && (
              <div className="flex flex-col gap-[10px] text-[16px]">
                <div className="flex flex-col gap-[5px]">
                  <p className="font-medium text-(--color-text-primary)">
                    Explanation:
                  </p>
                  <p className="text-(--color-text-secondary)">
                    {explanation}
                  </p>
                </div>

                <div className="flex flex-col gap-[5px]">
                  <p className="font-medium text-(--color-text-primary)">
                    Original Error & Correction:
                  </p>
                  <div className="bg-(--color-bg-secondary) rounded-[5px] px-[10px] py-[5px] flex items-center gap-[10px]">
                    <span className="text-[14px] font-medium text-red-500">
                      {grammarError}
                    </span>
                    <span className="text-[14px] font-medium text-(--color-text-primary)">
                      →
                    </span>
                    <span className="text-[14px] font-medium text-(--color-text-primary)">
                      {correctSentence}
                    </span>
                  </div>
                </div>

                {/* 翻譯題目區域 */}
                <div className="flex flex-col gap-[5px]">
                  <p className="font-medium text-(--color-text-primary)">
                    Translation Practice:
                  </p>
                  <p className="text-(--color-text-secondary) bg-(--color-bg-secondary) rounded-[5px] px-[10px] py-[5px]">
                    {translationQuestion}
                  </p>
                </div>
              </div>
            )}

            {/* 未檢查或錯誤時顯示輸入區域 */}
            {(!checkResult || !checkResult.isCorrect) && (
              <>
                {/* 輸入區域 */}
                <input
                  type="text"
                  value={sentence}
                  onChange={(e) => setSentence(e.target.value)}
                  placeholder="Make a sentence"
                  disabled={isChecking}
                  spellCheck={false}
                  className="w-full h-[40px] px-[20px] py-[10px] border border-(--color-border) rounded-[10px] text-[16px] text-(--color-text-primary) outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />

                {/* 錯誤回饋區域 */}
                {checkResult && !checkResult.isCorrect && (
                  <div className="flex flex-col gap-[5px] text-[16px]">
                    {/* 錯誤提示 */}
                    <div className="flex items-center gap-[5px]">
                      <span className="material-symbols-rounded text-[20px] text-[#EF4444]">
                        cancel
                      </span>
                      <p className=" font-medium text-[#EF4444]">
                        Try again.
                      </p>
                    </div>

                    {/* 修正範例 */}
                    {checkResult.correctiveExample && (
                      <div className="flex flex-col gap-[5px]">
                        <p className="font-medium text-(--color-text-secondary)">
                          Corrective example:
                        </p>
                        <div className="text-(--color-text-secondary)">
                          {checkResult.correctiveExampleHighlight ? (
                            (() => {
                              const example = checkResult.correctiveExample;
                              const highlightText = checkResult.correctiveExampleHighlight;
                              const index = example.indexOf(highlightText);
                              if (index === -1) {
                                // 如果找不到 highlight 文字，直接顯示原文字
                                return example;
                              }
                              return (
                                <>
                                  {example.slice(0, index)}
                                  <span className="bg-(--color-grammar) px-[2px] rounded-[2px]">
                                    {highlightText}
                                  </span>
                                  {example.slice(index + highlightText.length)}
                                </>
                              );
                            })()
                          ) : (
                            checkResult.correctiveExample
                          )}
                        </div>
                      </div>
                    )}

                    {/* 詳細解釋 */}
                    {checkResult.detailedExplanation && (
                      <div className="flex flex-col gap-[5px]">
                        <button
                          onClick={toggleDetailedExplanation}
                          className="flex items-center gap-[5px] text-left"
                        >
                          <p className="font-medium text-(--color-text-tertiary)">
                            Detailed explanation
                          </p>
                          <span className="material-symbols-rounded text-(--color-text-tertiary)">
                            {isDetailedExplanationOpen ? "expand_less" : "expand_more"}
                          </span>
                        </button>
                        {isDetailedExplanationOpen && (
                          <p className="text-(--color-text-tertiary)">
                            {checkResult.detailedExplanation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 按鈕區域 */}
                <div className="flex items-center justify-end gap-[10px]">
                  {isChecking && (
                    <StatusIndicator text="checking" />
                  )}
                  <Button variant="cancel" onClick={handleCancel} disabled={isChecking}>
                    Close
                  </Button>
                  <Button variant="primary" onClick={handleCheck} disabled={isChecking}>
                    Check
                  </Button>
                </div>
              </>
            )}

            {/* 正確狀態 UI */}
            {checkResult && checkResult.isCorrect && (
              <>
                {/* 成功區域 */}
                <div className="flex flex-col items-center gap-[20px]">
                  <div className="relative w-[50px] h-[50px]">
                    <Image
                      src="/icons/thumb-up.svg"
                      alt="Thumb up"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p className="text-[20px] font-medium text-(--color-text-primary)">
                    Well done!
                  </p>
                  <div className="flex flex-col items-center gap-[5px] w-full text-[16px]">
                    <p className="text-(--color-text-tertiary)">
                      Completed sentence:
                    </p>
                    <p className="text-(--color-text-primary)">
                      {checkResult.userSentence}
                    </p>
                  </div>
                </div>

                {/* 按鈕區域 */}
                <div className="flex items-center justify-center gap-[5px]">
                  <Button variant="cancel" onClick={handleLeave}>
                    Leave
                  </Button>
                  <Button variant="primary" onClick={handleTryAgain}>
                    Try Another One
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
