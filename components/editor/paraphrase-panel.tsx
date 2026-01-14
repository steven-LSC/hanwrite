"use client";

import React, { useState, useMemo } from "react";
import { ParaphraseResult } from "@/lib/types";

interface ParaphrasePanelProps {
  result: ParaphraseResult;
  onRetry: () => void;
  onReplace: (enabledChanges: Set<number>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  selectionStart: number;
  selectionEnd: number;
}

export function ParaphrasePanel({
  result,
  onRetry,
  onReplace,
  textareaRef,
  selectionStart,
  selectionEnd,
}: ParaphrasePanelProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [enabledChanges, setEnabledChanges] = useState<Set<number>>(
    new Set(result.changes.map((_, index) => index))
  );

  // 計算預覽文字（套用已勾選的修改）
  const previewText = useMemo(() => {
    let text = result.originalText;
    const sortedChanges = [...result.changes]
      .map((change, index) => ({ ...change, index }))
      .filter((change) => enabledChanges.has(change.index))
      .sort((a, b) => b.position.start - a.position.start); // 從後往前處理

    sortedChanges.forEach((change) => {
      const before = text.substring(0, change.position.start);
      const after = text.substring(change.position.end);
      text = before + change.revised + after;
    });

    return text;
  }, [result, enabledChanges]);

  // 計算 highlight 位置（根據已勾選的修改）
  const highlightSegments = useMemo(() => {
    const segments: Array<{ text: string; isHighlight: boolean }> = [];
    let currentPos = 0;
    let text = result.originalText;

    // 先應用修改來得到新文字，同時記錄哪些部分是修改過的
    const changes = [...result.changes]
      .map((change, index) => ({ ...change, index }))
      .filter((change) => enabledChanges.has(change.index))
      .sort((a, b) => a.position.start - b.position.start);

    let offset = 0;
    changes.forEach((change) => {
      const adjustedStart = change.position.start + offset;
      const adjustedEnd = change.position.end + offset;

      // 加入修改前的正常文字
      if (currentPos < adjustedStart) {
        segments.push({
          text: text.substring(currentPos, adjustedStart),
          isHighlight: false,
        });
      }

      // 加入修改後的文字（highlight）
      segments.push({
        text: change.revised,
        isHighlight: true,
      });

      // 更新偏移量
      const originalLength = change.position.end - change.position.start;
      const newLength = change.revised.length;
      offset += newLength - originalLength;

      // 在原始文字中進行替換
      text =
        text.substring(0, adjustedStart) +
        change.revised +
        text.substring(adjustedEnd);
      currentPos = adjustedStart + newLength;
    });

    // 加入剩餘的正常文字
    if (currentPos < text.length) {
      segments.push({
        text: text.substring(currentPos),
        isHighlight: false,
      });
    }

    return segments;
  }, [result, enabledChanges]);

  const handleToggleChange = (index: number) => {
    const newEnabled = new Set(enabledChanges);
    if (newEnabled.has(index)) {
      newEnabled.delete(index);
    } else {
      newEnabled.add(index);
    }
    setEnabledChanges(newEnabled);

    // 保持反白效果
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
      }
    }, 0);
  };

  const handleReplace = () => {
    onReplace(enabledChanges);
  };

  return (
    <div className="bg-white border border-(--color-border) rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-[20px] flex flex-col gap-[10px] w-[340px] max-h-[500px]">
      {/* 頂部：選擇的風格 */}
      <div className="flex items-center gap-[5px] rounded-[10px] shrink-0">
        <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary)">
          autorenew
        </span>
        <span className="font-medium text-[14px] text-(--color-text-secondary)">
          Paraphrase
        </span>
      </div>

      {/* 預覽文字區（highlight 修改部分）*/}
      <div className="p-[10px] bg-(--color-bg-secondary) rounded-[10px]">
        <p className="font-medium text-[14px] text-(--color-text-secondary) whitespace-pre-wrap">
          {highlightSegments.map((segment, index) =>
            segment.isHighlight ? (
              <span key={index} className="bg-[#e2e8f0] rounded-[2px] px-[2px]">
                {segment.text}
              </span>
            ) : (
              <span key={index}>{segment.text}</span>
            )
          )}
        </p>
      </div>

      {/* Dropdown 修改項目清單 */}
      <div className="flex flex-col gap-[5px] shrink-0">
        <button
          onClick={() => {
            setShowDropdown(!showDropdown);
            // 保持反白效果
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(
                  selectionStart,
                  selectionEnd
                );
              }
            }, 0);
          }}
          className="flex items-center gap-[5px] text-left"
        >
          <p className="font-medium text-[12px] text-(--color-text-secondary)">
            Show explanation and partial change
          </p>
          <span
            className={`material-symbols-rounded text-[20px] text-(--color-text-secondary) transition-transform ${
              showDropdown ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
        </button>

        {showDropdown && (
          <div className="flex flex-col gap-[5px]">
            {result.changes.map((change, index) => (
              <label
                key={index}
                className="bg-(--color-bg-secondary) flex items-center gap-[5px] p-[5px] rounded-[5px] cursor-pointer hover:brightness-95"
              >
                <input
                  type="checkbox"
                  checked={enabledChanges.has(index)}
                  onChange={() => handleToggleChange(index)}
                  className="shrink-0 w-[17px] h-[17px] cursor-pointer"
                />
                <p className="flex-1 font-medium text-[12px] text-(--color-text-secondary)">
                  {change.revised}{" "}
                  {change.original === change.revised ? "changed" : "added"} (
                  {change.explanation})
                </p>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 底部按鈕 */}
      <div className="flex gap-[10px] justify-end shrink-0">
        {/* Retry 按鈕 */}
        <button
          onClick={onRetry}
          className="bg-(--color-bg-secondary) flex items-center gap-[5px] px-[10px] py-[5px] rounded-[5px] hover:brightness-95 transition-colors duration-200"
        >
          <span className="material-symbols-rounded text-[20px] text-(--color-text-secondary)">
            refresh
          </span>
          <span className="font-medium text-[14px] text-(--color-text-secondary)">
            Retry
          </span>
        </button>

        {/* Replace 按鈕 */}
        <button
          onClick={handleReplace}
          disabled={enabledChanges.size === 0}
          className={`flex items-center gap-[5px] px-[10px] py-[5px] rounded-[5px] transition-colors duration-200 ${
            enabledChanges.size === 0
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-(--color-primary) hover:brightness-110"
          }`}
        >
          <span
            className={`material-symbols-rounded text-[20px] ${
              enabledChanges.size === 0 ? "text-gray-500" : "text-white"
            }`}
          >
            check
          </span>
          <span
            className={`font-medium text-[14px] ${
              enabledChanges.size === 0 ? "text-gray-500" : "text-white"
            }`}
          >
            Replace
          </span>
        </button>
      </div>
    </div>
  );
}
