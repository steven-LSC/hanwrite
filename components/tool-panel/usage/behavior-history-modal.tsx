"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { BehaviorRecord, BehaviorHistoryModalProps } from "./types";
import {
  ExpansionHint,
  ParaphraseChange,
  ExpressionBuilderResult,
  ProficiencyReportItem,
  ReverseOutliningItem,
  GrammarPracticeResult,
  OutlineSection,
} from "@/lib/types";
import { IdeaPartnerCard } from "@/lib/data/idea-partner";

/**
 * Behavior History Modal 元件
 * 顯示特定功能的行為記錄詳細資料
 */
export function BehaviorHistoryModal({
  isOpen,
  onClose,
  feature,
  featureTitle,
}: BehaviorHistoryModalProps) {
  const [behaviors, setBehaviors] = useState<BehaviorRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 當 modal 打開時才載入資料
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const fetchBehaviors = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/usage-behaviors?feature=${feature}`);
        if (!response.ok) {
          throw new Error("Failed to fetch behavior history");
        }

        const data = await response.json();
        setBehaviors(data.behaviors || []);
      } catch (err) {
        console.error("Failed to fetch behavior history:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load behavior history"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchBehaviors();
  }, [isOpen, feature]);

  // 格式化時間戳記
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  // Action Label 和 Color Coding 配置
  const getActionConfig = (actionName: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      // Expansion Hints
      "expansion-hint-generate": {
        label: "Generated",
        color: "text-(--color-text-primary)",
      },
      "expansion-hint-insert": {
        label: "Inserted",
        color: "text-(--color-text-highlight)",
      },
      "expansion-hint-try": {
        label: "Try",
        color: "text-green-600",
      },
      "expansion-hint-discard": {
        label: "Discarded",
        color: "text-red-500",
      },
      // Idea Partner
      "idea-partner-scan": {
        label: "Scanned",
        color: "text-(--color-text-primary)",
      },
      "idea-partner-add-block": {
        label: "Added",
        color: "text-(--color-text-highlight)",
      },
      "idea-partner-skip": {
        label: "Skipped",
        color: "text-red-500",
      },
      // Outline Generator
      "outline-generator-generate": {
        label: "Generated",
        color: "text-(--color-text-primary)",
      },
      "outline-generator-save": {
        label: "Saved",
        color: "text-(--color-text-highlight)",
      },
      // Paraphrase
      "paraphrase-generate": {
        label: "Generated",
        color: "text-(--color-text-primary)",
      },
      "paraphrase-apply": {
        label: "Applied",
        color: "text-(--color-text-highlight)",
      },
      "paraphrase-discard": {
        label: "Discarded",
        color: "text-red-500",
      },
      "paraphrase-no-change-needed": {
        label: "No Change Needed",
        color: "text-(--color-text-tertiary)",
      },
      // Expression Builder
      "expression-builder-analyze": {
        label: "Analyzed",
        color: "text-(--color-text-primary)",
      },
      // Proficiency Report
      "proficiency-report-generate": {
        label: "Generated",
        color: "text-(--color-text-primary)",
      },
      "proficiency-report-open": {
        label: "Opened",
        color: "text-(--color-text-primary)",
      },
      // Error Detection
      "error-detection-analyze": {
        label: "Analyzed",
        color: "text-(--color-text-primary)",
      },
      "error-detection-apply": {
        label: "Applied",
        color: "text-(--color-text-highlight)",
      },
      "error-detection-skip": {
        label: "Skipped",
        color: "text-red-500",
      },
      // Grammar Practice
      "grammar-practice-generate": {
        label: "Generated",
        color: "text-(--color-text-primary)",
      },
      "grammar-practice-check": {
        label: "Checked",
        color: "text-(--color-text-primary)",
      },
      "grammar-practice-cancel": {
        label: "Cancel",
        color: "text-(--color-text-tertiary)",
      },
      // Reverse Outlining
      "reverse-outlining-generate": {
        label: "Generated",
        color: "text-(--color-text-primary)",
      },
    };

    return (
      configs[actionName] || {
        label: actionName,
        color: "text-(--color-text-primary)",
      }
    );
  };

  // 渲染 Expansion Hint Generate 記錄
  const renderGenerateRecord = (record: BehaviorRecord) => {
    const resultData = record.resultData as {
      hints?: ExpansionHint[];
      duration?: number;
    };

    if (!resultData.hints || resultData.hints.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-col gap-[10px]">
        <div className="flex flex-col gap-[8px]">
          {resultData.hints.map((hint, index) => (
            <div
              key={index}
              className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]"
            >
              <p className="font-medium text-[14px] text-(--color-text-secondary)">
                {hint.explanation}
              </p>
              <p className="text-[12px] text-(--color-text-tertiary)">
                Example sentence:
              </p>
              <p className="font-medium text-[14px] text-(--color-text-secondary)">
                {hint.example}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染 Expansion Hint Insert 記錄
  const renderInsertRecord = (record: BehaviorRecord) => {
    const resultData = record.resultData as {
      insertedHint?: ExpansionHint;
    };

    if (!resultData.insertedHint) {
      return null;
    }

    return (
      <div className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]">
        <p className="font-medium text-[14px] text-(--color-text-secondary)">
          {resultData.insertedHint.explanation}
        </p>
        <p className="text-[12px] text-(--color-text-tertiary)">
          Example sentence:
        </p>
        <p className="font-medium text-[14px] text-(--color-text-secondary)">
          {resultData.insertedHint.example}
        </p>
      </div>
    );
  };

  // 渲染 Expansion Hint Try 記錄
  const renderTryRecord = (record: BehaviorRecord) => {
    const resultData = record.resultData as {
      selectedHint?: ExpansionHint;
    };

    if (!resultData.selectedHint) {
      return null;
    }

    return (
      <div className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]">
        <p className="font-medium text-[14px] text-(--color-text-secondary)">
          {resultData.selectedHint.explanation}
        </p>
        <p className="text-[12px] text-(--color-text-tertiary)">
          Example sentence:
        </p>
        <p className="font-medium text-[14px] text-(--color-text-secondary)">
          {resultData.selectedHint.example}
        </p>
      </div>
    );
  };

  // 渲染 Idea Partner Scan 記錄
  const renderIdeaPartnerScan = (record: BehaviorRecord) => {
    const resultData = record.resultData as {
      cards?: IdeaPartnerCard[];
      duration?: number;
    };

    if (!resultData.cards || resultData.cards.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-col gap-[10px]">
        <div className="flex flex-col gap-[8px]">
          {resultData.cards.map((card, index) => (
            <div
              key={index}
              className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]"
            >
              <p className="font-medium text-[14px] text-(--color-text-secondary)">
                {card.title}
              </p>
              <p className="text-[12px] text-(--color-text-tertiary)">
                Description:
              </p>
              <p className="font-medium text-[14px] text-(--color-text-secondary)">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染 Idea Partner Add Block 記錄
  const renderIdeaPartnerAddBlock = (record: BehaviorRecord) => {
    const resultData = record.resultData as {
      input: string;
      source?: {
        nodeId: string;
        title: string;
        description: string;
      };
    };

    if (!resultData.source) {
      return null;
    }

    return (
      <div className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]">
        <p className="text-[12px] text-(--color-text-tertiary)">
          Source Node:
        </p>
        <p className="font-medium text-[14px] text-(--color-text-secondary)">
          {resultData.source.title}
        </p>
        <p className="text-[12px] text-(--color-text-tertiary)">
          Description:
        </p>
        <p className="font-medium text-[14px] text-(--color-text-secondary)">
          {resultData.source.description}
        </p>
        <p className="text-[12px] text-(--color-text-tertiary)">
          Input:
        </p>
        <p className="font-medium text-[14px] text-(--color-text-secondary)">
          {resultData.input}
        </p>
      </div>
    );
  };

  // 渲染 Idea Partner Skip 記錄
  const renderIdeaPartnerSkip = (record: BehaviorRecord) => {
    const resultData = record.resultData as {
      card?: {
        nodeId: string;
        title: string;
        description: string;
        idea: string;
      };
    };

    if (!resultData.card) {
      return null;
    }

    return (
      <div className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]">
        <p className="font-medium text-[14px] text-(--color-text-secondary)">
          {resultData.card.title}
        </p>
        <p className="text-[12px] text-(--color-text-tertiary)">
          Description:
        </p>
        <p className="font-medium text-[14px] text-(--color-text-secondary)">
          {resultData.card.description}
        </p>
      </div>
    );
  };

  // 渲染 Outline Generator Generate/Save 記錄
  const renderOutlineGenerator = (record: BehaviorRecord) => {
    const resultData = record.resultData as {
      title?: string;
      sections?: OutlineSection[];
      duration?: number;
    };

    if (!resultData.sections || resultData.sections.length === 0) {
      return null;
    }

    // 將第一個字大寫的輔助函數
    const capitalize = (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

    return (
      <div className="flex flex-col gap-[10px]">
        {resultData.title && (
          <p className="font-medium text-[14px] text-(--color-text-secondary)">
            {resultData.title}
          </p>
        )}
        <div className="flex flex-col gap-[8px]">
          {resultData.sections.map((section, index) => (
            <div
              key={index}
              className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]"
            >
              <p className="text-[12px] text-(--color-text-tertiary)">
                {capitalize(section.type)}:
              </p>
              <p className="font-medium text-[14px] text-(--color-text-secondary)">
                {section.description}
              </p>
              <p className="text-[12px] text-(--color-text-tertiary)">
                Example sentence:
              </p>
              <p className="font-medium text-[14px] text-(--color-text-secondary)">
                {section.exampleSentence}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染 Paraphrase Generate 記錄
  const renderParaphraseGenerate = (record: BehaviorRecord) => {
    const resultData = record.resultData as {
      originalText?: string;
      changes?: ParaphraseChange[];
      duration?: number;
      noChange?: boolean;
      message?: string;
    };

    if (!resultData.originalText) {
      return null;
    }

    // 處理 noChange 情況
    if (resultData.noChange === true) {
      return (
        <div className="flex flex-col gap-[10px]">
          <div className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]">
            <p className="text-[12px] text-(--color-text-tertiary)">
              Original text:
            </p>
            <p className="font-medium text-[14px] text-(--color-text-secondary)">
              {resultData.originalText}
            </p>
          </div>
          <div className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]">
            <p className="text-[12px] text-(--color-text-tertiary)">
              Message:
            </p>
            <p className="font-medium text-[14px] text-(--color-text-secondary)">
              {resultData.message || "這個句子已經是母語風格，不需要修改"}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-[10px]">
        <div className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]">
          <p className="text-[12px] text-(--color-text-tertiary)">
            Original text:
          </p>
          <p className="font-medium text-[14px] text-(--color-text-secondary)">
            {resultData.originalText}
          </p>
        </div>
        {resultData.changes && resultData.changes.length > 0 && (
          <div className="flex flex-col gap-[8px]">
            {resultData.changes.map((change, index) => (
              <div
                key={index}
                className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]"
              >
                <p className="text-[12px] text-(--color-text-tertiary)">
                  Change:
                </p>
                <p className="font-medium text-[14px] text-(--color-text-secondary)">
                  {change.original} → {change.revised}
                </p>
                <p className="text-[12px] text-(--color-text-tertiary)">
                  Explanation:
                </p>
                <p className="font-medium text-[14px] text-(--color-text-secondary)">
                  {change.explanation}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 渲染 Paraphrase Apply 記錄
  const renderParaphraseApply = (record: BehaviorRecord) => {
    const resultData = record.resultData as {
      finalSentence?: string;
      appliedChanges?: ParaphraseChange[];
    };

    if (!resultData.finalSentence) {
      return null;
    }

    return (
      <div className="flex flex-col gap-[10px]">
        <div className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]">
          <p className="text-[12px] text-(--color-text-tertiary)">
            Final sentence:
          </p>
          <p className="font-medium text-[14px] text-(--color-text-secondary)">
            {resultData.finalSentence}
          </p>
        </div>
        {resultData.appliedChanges && resultData.appliedChanges.length > 0 && (
          <div className="flex flex-col gap-[8px]">
            {resultData.appliedChanges.map((change, index) => (
              <div
                key={index}
                className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]"
              >
                <p className="text-[12px] text-(--color-text-tertiary)">
                  Change:
                </p>
                <p className="font-medium text-[14px] text-(--color-text-secondary)">
                  {change.original} → {change.revised}
                </p>
                <p className="text-[12px] text-(--color-text-tertiary)">
                  Explanation:
                </p>
                <p className="font-medium text-[14px] text-(--color-text-secondary)">
                  {change.explanation}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 渲染 Expression Builder 記錄
  const renderExpressionBuilder = (record: BehaviorRecord) => {
    const resultData = record.resultData as {
      results?: ExpressionBuilderResult[];
      duration?: number;
      inputText?: string;
    };

    if (!resultData.results || resultData.results.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-col gap-[10px]">
        {/* 顯示使用者輸入內容 */}
        {resultData.inputText && (
          <div className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]">
            <p className="text-[12px] text-(--color-text-tertiary)">
              Input:
            </p>
            <p className="font-medium text-[14px] text-(--color-text-secondary)">
              {resultData.inputText}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-[8px]">
          {resultData.results.map((result, index) => (
            <div
              key={index}
              className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]"
            >
              {result.type === "vocab-grammar-example" ? (
                <>
                  <p className="text-[12px] text-(--color-text-tertiary)">
                    Vocabulary:
                  </p>
                  <p className="font-medium text-[14px] text-(--color-text-secondary)">
                    {result.vocab.map((v) => `${v.vocab} (${v.translate})`).join(", ")}
                  </p>
                  {/* 僅在 grammar 不為空時顯示 Grammar 和 Example */}
                  {result.grammar.grammar && result.grammar.grammar.trim() !== "" && (
                    <>
                      <p className="text-[12px] text-(--color-text-tertiary)">
                        Grammar:
                      </p>
                      <p className="font-medium text-[14px] text-(--color-text-secondary)">
                        {result.grammar.grammar} - {result.grammar.explanation}
                      </p>
                      {result.example && result.example.trim() !== "" && (
                        <>
                          <p className="text-[12px] text-(--color-text-tertiary)">
                            Example:
                          </p>
                          <p className="font-medium text-[14px] text-(--color-text-secondary)">
                            {result.example}
                          </p>
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[12px] text-(--color-text-tertiary)">
                    Connective:
                  </p>
                  <p className="font-medium text-[14px] text-(--color-text-secondary)">
                    {result.content.map((item) => `${item.vocab} (${item.translate})`).join(", ")}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染 Proficiency Report 記錄
  const renderProficiencyReport = (record: BehaviorRecord) => {
    const resultData = record.resultData as {
      results?: ProficiencyReportItem[];
      duration?: number;
    };

    if (!resultData.results || resultData.results.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-col gap-[10px]">
        <div className="flex flex-col gap-[8px]">
          {resultData.results.map((item, index) => (
            <div
              key={index}
              className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]"
            >
              <p className="font-medium text-[14px] text-(--color-text-secondary)">
                {item.category} - Level {item.level}
              </p>
              <p className="text-[12px] text-(--color-text-tertiary)">
                Description:
              </p>
              <p className="font-medium text-[14px] text-(--color-text-secondary)">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染 Error Detection Analyze 記錄
  const renderErrorDetectionAnalyze = (record: BehaviorRecord) => {
    const resultData = record.resultData as {
      results?: Array<
        | { type: "grammar"; data: { grammarError?: string; correctSentence?: string } }
        | { type: "vocab"; data: { vocabError?: string; correctWord?: string } }
      >;
      duration?: number;
    };

    if (!resultData.results || resultData.results.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-col gap-[10px]">
        <div className="flex flex-col gap-[8px]">
          {resultData.results.map((error, index) => (
            <div
              key={index}
              className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]"
            >
              <p className="text-[12px] text-(--color-text-tertiary)">
                Error type:
              </p>
              <p className="font-medium text-[14px] text-(--color-text-secondary)">
                {error.type === "grammar" ? "Grammar" : "Vocabulary"}
              </p>
              <p className="text-[12px] text-(--color-text-tertiary)">
                Error & Correction:
              </p>
              <p className="font-medium text-[14px] text-(--color-text-secondary)">
                {error.type === "grammar"
                  ? error.data.grammarError || "N/A"
                  : error.data.vocabError || "N/A"} → {error.type === "grammar"
                    ? error.data.correctSentence || "N/A"
                    : error.data.correctWord || "N/A"}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染 Error Detection Apply/Skip 記錄
  const renderErrorDetectionApplySkip = (record: BehaviorRecord) => {
    const resultData = record.resultData as {
      errorType?: "grammar" | "vocab";
      errorData?: any;
    };

    if (!resultData.errorType || !resultData.errorData) {
      return null;
    }

    if (resultData.errorType === "grammar") {
      const grammarData = resultData.errorData as {
        grammarName?: string;
        grammarError?: string;
        correctSentence?: string;
        explanation?: string;
      };

      return (
        <div className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]">
          <p className="text-[12px] text-(--color-text-tertiary)">
            Error type:
          </p>
          <p className="font-medium text-[14px] text-(--color-text-secondary)">
            Grammar
          </p>
          <p className="text-[12px] text-(--color-text-tertiary)">
            Error & Correction:
          </p>
          <p className="font-medium text-[14px] text-(--color-text-secondary)">
            {grammarData.grammarError || "N/A"} → {grammarData.correctSentence || "N/A"}
          </p>
          <p className="text-[12px] text-(--color-text-tertiary)">
            Grammar name:
          </p>
          <p className="font-medium text-[14px] text-(--color-text-secondary)">
            {grammarData.grammarName || "N/A"}
          </p>
          <p className="text-[12px] text-(--color-text-tertiary)">
            Explanation:
          </p>
          <p className="font-medium text-[14px] text-(--color-text-secondary)">
            {grammarData.explanation || "N/A"}
          </p>
        </div>
      );
    } else {
      const vocabData = resultData.errorData as {
        vocabError?: string;
        correctWord?: string;
        translation?: string;
        partOfSpeech?: string;
      };

      return (
        <div className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]">
          <p className="text-[12px] text-(--color-text-tertiary)">
            Error type:
          </p>
          <p className="font-medium text-[14px] text-(--color-text-secondary)">
            Vocabulary
          </p>
          <p className="text-[12px] text-(--color-text-tertiary)">
            Error & Correction:
          </p>
          <p className="font-medium text-[14px] text-(--color-text-secondary)">
            {vocabData.vocabError || "N/A"} → {vocabData.correctWord || "N/A"}
          </p>
          <p className="text-[12px] text-(--color-text-tertiary)">
            Translation:
          </p>
          <p className="font-medium text-[14px] text-(--color-text-secondary)">
            {vocabData.translation || "N/A"} ({vocabData.partOfSpeech})
          </p>
        </div>
      );
    }
  };

  // 渲染 Grammar Practice Generate 記錄
  const renderGrammarPracticeGenerate = (record: BehaviorRecord) => {
    const resultData = record.resultData as {
      grammarName?: string;
      grammarError?: string;
      correctSentence?: string;
      explanation?: string;
      translationQuestion?: string;
    };

    if (!resultData.translationQuestion) {
      return null;
    }

    return (
      <div className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]">
        {resultData.grammarName && (
          <>
            <p className="text-[12px] text-(--color-text-tertiary)">
              Grammar:
            </p>
            <p className="font-medium text-[14px] text-(--color-text-secondary)">
              {resultData.grammarName}
            </p>
          </>
        )}
        <p className="text-[12px] text-(--color-text-tertiary)">
          Translation Question:
        </p>
        <p className="font-medium text-[14px] text-(--color-text-secondary)">
          {resultData.translationQuestion}
        </p>
      </div>
    );
  };

  // 渲染 Grammar Practice Check 記錄
  const renderGrammarPractice = (record: BehaviorRecord) => {
    const resultData = record.resultData as GrammarPracticeResult;

    if (!resultData.userSentence) {
      return null;
    }

    return (
      <div className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]">
        <p className="text-[12px] text-(--color-text-tertiary)">
          User sentence:
        </p>
        <p className="font-medium text-[14px] text-(--color-text-secondary)">
          {resultData.userSentence}
        </p>
        {!resultData.isCorrect && resultData.correctiveExample && (
          <>
            <p className="text-[12px] text-(--color-text-tertiary)">
              Corrective example:
            </p>
            <p className="font-medium text-[14px] text-(--color-text-secondary)">
              {resultData.correctiveExampleHighlight ? (
                (() => {
                  const example = resultData.correctiveExample!;
                  const highlightText = resultData.correctiveExampleHighlight;
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
                resultData.correctiveExample
              )}
            </p>
          </>
        )}
        {!resultData.isCorrect && resultData.detailedExplanation && (
          <>
            <p className="text-[12px] text-(--color-text-tertiary)">
              Explanation:
            </p>
            <p className="font-medium text-[14px] text-(--color-text-secondary)">
              {resultData.detailedExplanation}
            </p>
          </>
        )}
      </div>
    );
  };

  // 渲染 Reverse Outlining 記錄
  const renderReverseOutlining = (record: BehaviorRecord) => {
    const resultData = record.resultData as {
      results?: ReverseOutliningItem[];
      duration?: number;
    };

    if (!resultData.results || resultData.results.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-col gap-[10px]">
        <div className="flex flex-col gap-[8px]">
          {resultData.results.map((item, index) => (
            <div
              key={index}
              className="bg-(--color-bg-secondary) rounded-[8px] p-[12px] flex flex-col gap-[5px]"
            >
              <p className="text-[12px] text-(--color-text-tertiary)">
                Outline:
              </p>
              <p className="font-medium text-[14px] text-(--color-text-secondary)">
                {item.outline}
              </p>
              <p className="text-[12px] text-(--color-text-tertiary)">
                Reasons:
              </p>
              <div className="flex flex-col gap-[3px]">
                {item.reasons.map((reason, reasonIndex) => (
                  <p
                    key={reasonIndex}
                    className="font-medium text-[14px] text-(--color-text-secondary)"
                  >
                    • {reason}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染單一記錄項目
  const renderRecordItem = (record: BehaviorRecord) => {
    const config = getActionConfig(record.actionName);
    let content: React.ReactNode = null;
    let duration: number | undefined = undefined;

    // 根據 actionName 決定要渲染的內容
    switch (record.actionName) {
      // Expansion Hints
      case "expansion-hint-generate":
        content = renderGenerateRecord(record);
        duration = (record.resultData as { duration?: number })?.duration;
        break;
      case "expansion-hint-insert":
        content = renderInsertRecord(record);
        break;
      case "expansion-hint-try":
        content = renderTryRecord(record);
        break;
      case "expansion-hint-discard":
        // discard 不需要顯示 content
        break;

      // Idea Partner
      case "idea-partner-scan":
        content = renderIdeaPartnerScan(record);
        duration = (record.resultData as { duration?: number })?.duration;
        break;
      case "idea-partner-add-block":
        content = renderIdeaPartnerAddBlock(record);
        break;
      case "idea-partner-skip":
        content = renderIdeaPartnerSkip(record);
        break;

      // Outline Generator
      case "outline-generator-generate":
        content = renderOutlineGenerator(record);
        duration = (record.resultData as { duration?: number })?.duration;
        break;
      case "outline-generator-save":
        content = renderOutlineGenerator(record);
        break;

      // Paraphrase
      case "paraphrase-generate":
        content = renderParaphraseGenerate(record);
        duration = (record.resultData as { duration?: number })?.duration;
        break;
      case "paraphrase-apply":
        content = renderParaphraseApply(record);
        break;
      case "paraphrase-discard":
        // discard 不需要顯示 content
        break;
      case "paraphrase-no-change-needed":
        // no-change-needed 不需要顯示 content
        break;

      // Expression Builder
      case "expression-builder-analyze":
        content = renderExpressionBuilder(record);
        duration = (record.resultData as { duration?: number })?.duration;
        break;

      // Proficiency Report
      case "proficiency-report-generate":
        content = renderProficiencyReport(record);
        duration = (record.resultData as { duration?: number })?.duration;
        break;
      case "proficiency-report-open":
        // open 不需要顯示 content
        break;

      // Error Detection
      case "error-detection-analyze":
        content = renderErrorDetectionAnalyze(record);
        duration = (record.resultData as { duration?: number })?.duration;
        break;
      case "error-detection-apply":
        content = renderErrorDetectionApplySkip(record);
        break;
      case "error-detection-skip":
        content = renderErrorDetectionApplySkip(record);
        break;

      // Grammar Practice
      case "grammar-practice-generate":
        content = renderGrammarPracticeGenerate(record);
        duration = (record.resultData as { duration?: number })?.duration;
        break;
      case "grammar-practice-check": {
        const resultData = record.resultData as GrammarPracticeResult;
        const resultText = resultData.isCorrect ? "Correct" : "Incorrect";
        config.label = resultText;
        config.color = resultData.isCorrect ? "text-(--color-text-highlight)" : "text-red-500";
        content = renderGrammarPractice(record);
        break;
      }
      case "grammar-practice-cancel":
        // cancel 不需要顯示 content
        break;

      // Reverse Outlining
      case "reverse-outlining-generate":
        content = renderReverseOutlining(record);
        duration = (record.resultData as { duration?: number })?.duration;
        break;
    }

    // 將 duration 從毫秒轉換為秒
    const durationInSeconds = duration ? (duration / 1000).toFixed(2) : null;

    return (
      <div
        key={record.id}
        className="border-b border-(--color-border) pb-[15px] last:border-b-0 last:pb-0 flex flex-col gap-[8px]"
      >
        <div className="flex items-center justify-between">
          <span className={`font-medium text-[14px] ${config.color}`}>
            {config.label}
          </span>
          <div className="flex items-center gap-[5px]">
            {durationInSeconds && (
              <span className="text-[12px] text-(--color-text-tertiary)">
                {durationInSeconds}s
              </span>
            )}
            <span className="text-[12px] text-(--color-text-tertiary)">
              {formatTimestamp(record.timestamp)}
            </span>
          </div>
        </div>
        {content && <div className="mt-[5px]">{content}</div>}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={true}>
      <div className="bg-white rounded-[10px] w-[700px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* 標題區域 */}
        <div className="px-[30px] py-[20px] border-b border-(--color-border) flex items-center justify-between shrink-0">
          <h2 className="font-medium text-[18px] text-(--color-text-primary)">
            {featureTitle} History
          </h2>
          <button
            onClick={onClose}
            className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-black/10 transition-colors"
          >
            <span className="material-symbols-rounded text-[20px]">close</span>
          </button>
        </div>

        {/* 內容區域 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-[30px] py-[20px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-[14px] text-(--color-text-tertiary)">
                Loading...
              </p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-[14px] text-(--color-text-tertiary)">{error}</p>
            </div>
          ) : behaviors.length === 0 ? (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-[14px] text-(--color-text-tertiary)">
                No behavior records found.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-[15px]">
              {behaviors.map((record) => renderRecordItem(record))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
