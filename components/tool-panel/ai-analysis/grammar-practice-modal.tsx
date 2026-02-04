"use client";

import React, { useState } from "react";
import Image from "next/image";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { GrammarPracticeResult } from "@/lib/types";
import { checkGrammarPractice } from "@/lib/data/grammar-practice";
import { logBehavior } from "@/lib/log-behavior";

interface GrammarPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  grammarName: string;
  explanation: string;
}

export function GrammarPracticeModal({
  isOpen,
  onClose,
  grammarName,
  explanation,
}: GrammarPracticeModalProps) {
  const [sentence, setSentence] = useState("");
  const [checkResult, setCheckResult] = useState<GrammarPracticeResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDetailedExplanationOpen, setIsDetailedExplanationOpen] = useState(false);

  const handleCheck = async () => {
    if (!sentence.trim()) return;

    setIsChecking(true);
    try {
      const result = await checkGrammarPractice(sentence, grammarName, explanation);
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

  const handleClose = () => {
    setSentence("");
    setCheckResult(null);
    setIsChecking(false);
    setIsDetailedExplanationOpen(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} closeOnBackdropClick={true}>
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
          <button
            onClick={handleClose}
            className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-black/10 transition-colors"
          >
            <span className="material-symbols-rounded text-[20px]">close</span>
          </button>
        </div>

        {/* Explanation 區域 - 只在未檢查或錯誤時顯示 */}
        {(!checkResult || !checkResult.isCorrect) && (
          <div className="flex flex-col gap-[5px] text-[16px]">
            <p className="font-medium text-(--color-text-primary)">
              Explanation:
            </p>
            <p className="text-(--color-text-secondary)">
              {explanation}
            </p>
            <div className="flex items-center gap-[5px]">
              <span className="text-(--color-text-tertiary)">→</span>
              <p className="text-(--color-text-tertiary)">
                Use this meaning when writing your sentence.
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
                      Corrective example: {checkResult.correctiveExample}
                    </p>
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
      </div>
    </Modal>
  );
}
