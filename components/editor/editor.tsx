"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { ContextMenu } from "./context-menu";
import { ExpansionHintPanel } from "./expansion-hint-panel";
import { ParaphrasePanel } from "./paraphrase-panel";
import { ParaphraseStylePanel } from "./paraphrase-style-panel";
import { getExpansionHints, getParaphraseResult } from "@/lib/data/context-menu";
import {
  ContextMenuStage,
  ExpansionHint,
  ParaphraseResult,
  ParaphraseStyle,
} from "@/lib/types";

interface EditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSave?: (title: string, content: string) => void;
  isFocusMode?: boolean;
  onToggleFocus?: () => void;
}

export function Editor({
  initialTitle = "",
  initialContent = "",
  onSave,
  isFocusMode = false,
  onToggleFocus,
}: EditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Context Menu 相關狀態
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuStage, setMenuStage] = useState<ContextMenuStage>("initial");
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [adjustedMenuY, setAdjustedMenuY] = useState(0);
  const [selectedText, setSelectedText] = useState("");
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  // Expansion Hint 相關狀態
  const [hints, setHints] = useState<ExpansionHint[]>([]);
  const [selectedHintIndex, setSelectedHintIndex] = useState<number | null>(
    null
  );
  const [isLoadingHints, setIsLoadingHints] = useState(false);

  // Paraphrase 相關狀態
  const [paraphraseResult, setParaphraseResult] =
    useState<ParaphraseResult | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ParaphraseStyle | null>(
    null
  );
  const [isLoadingParaphrase, setIsLoadingParaphrase] = useState(false);

  // 即時計算字數
  const characterCount = content.length;

  const handleSave = () => {
    if (onSave) {
      onSave(title, content);
    }
  };

  // 處理文字反白
  const handleMouseUp = (e: React.MouseEvent) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    setTimeout(() => {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.substring(start, end);

      // 如果有選取文字，顯示選單
      if (selected.trim().length > 0) {
        setSelectedText(selected);
        setSelectionStart(start);
        setSelectionEnd(end);

        // 使用滑鼠位置來定位選單（最簡單的方式）
        const x = e.clientX;
        const y = e.clientY + 10; // 滑鼠位置下方 10px

        setMenuPosition({ x, y });
        setMenuStage("initial");
        setShowContextMenu(true);

        // 保持反白效果
        textarea.focus();
        textarea.setSelectionRange(start, end);
      } else {
        setShowContextMenu(false);
      }
    }, 10);
  };

  // 點擊外部或編輯器內部關閉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 如果點擊的不是選單內部，就關閉選單
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };

    if (showContextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showContextMenu]);

  // 計算選單的最佳顯示位置
  useEffect(() => {
    if (!showContextMenu || !menuRef.current) return;

    // 使用 requestAnimationFrame 確保 DOM 已經更新
    const calculatePosition = () => {
      if (!menuRef.current) return;

      // 預設位置：反白文字正下方
      let finalY = menuPosition.y;

      // 取得選單實際高度
      const menuHeight = menuRef.current.offsetHeight;

      // 計算是否會超出視窗底部
      const spaceBelow = window.innerHeight - menuPosition.y;
      if (spaceBelow < menuHeight) {
        // 空間不足，往上調整
        finalY = window.innerHeight - menuHeight - 10; // 10px 安全邊距

        // 確保不會超出視窗頂部
        if (finalY < 10) {
          finalY = 10;
        }
      }

      setAdjustedMenuY(finalY);
    };

    // 延遲執行以確保 DOM 完全渲染
    requestAnimationFrame(() => {
      requestAnimationFrame(calculatePosition);
    });
  }, [showContextMenu, menuPosition, menuStage, isLoadingHints, isLoadingParaphrase]);

  // 選擇 Expansion Hint
  const handleSelectExpansionHint = async () => {
    setMenuStage("expansion-hint");
    setIsLoadingHints(true);
    setSelectedHintIndex(null);

    // 保持反白效果
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
    }

    try {
      const fetchedHints = await getExpansionHints(selectedText);
      setHints(fetchedHints);
    } catch (error) {
      console.error("Failed to fetch expansion hints:", error);
    } finally {
      setIsLoadingHints(false);
    }
  };

  // 選擇 Paraphrase（顯示風格選擇）
  const handleSelectParaphrase = () => {
    setMenuStage("paraphrase-style");

    // 保持反白效果
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
    }
  };

  // 選擇 Paraphrase 風格
  const handleSelectStyle = async (style: ParaphraseStyle) => {
    setSelectedStyle(style);
    setMenuStage("paraphrase-result");
    setIsLoadingParaphrase(true);

    // 保持反白效果
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
    }

    try {
      const result = await getParaphraseResult(selectedText, style);
      setParaphraseResult(result);
    } catch (error) {
      console.error("Failed to fetch paraphrase result:", error);
    } finally {
      setIsLoadingParaphrase(false);
    }
  };

  // Retry Paraphrase
  const handleRetryParaphrase = async () => {
    if (!selectedStyle) return;

    setIsLoadingParaphrase(true);

    // 保持反白效果
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
    }

    try {
      const result = await getParaphraseResult(selectedText, selectedStyle);
      setParaphraseResult(result);
    } catch (error) {
      console.error("Failed to fetch paraphrase result:", error);
    } finally {
      setIsLoadingParaphrase(false);
    }
  };

  // 套用 Paraphrase 修改到編輯器
  const handleReplaceParaphrase = (enabledChanges: Set<number>) => {
    if (!paraphraseResult || !textareaRef.current) return;

    // 取得要套用的修改（按照索引排序）
    const changesToApply = paraphraseResult.changes
      .map((change, index) => ({ ...change, index }))
      .filter((change) => enabledChanges.has(change.index))
      .sort((a, b) => b.position.start - a.position.start); // 從後往前處理避免位置偏移

    // 計算新的文字內容
    let newContent = content;
    let adjustedStart = selectionStart;
    let adjustedEnd = selectionEnd;

    // 先計算反白區域內的新文字
    let selectedContent = selectedText;
    changesToApply.forEach((change) => {
      const before = selectedContent.substring(0, change.position.start);
      const after = selectedContent.substring(change.position.end);
      selectedContent = before + change.revised + after;
    });

    // 替換編輯器中的文字
    newContent =
      content.substring(0, selectionStart) +
      selectedContent +
      content.substring(selectionEnd);

    setContent(newContent);
    setShowContextMenu(false);

    // 將游標移到替換文字的後面
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = selectionStart + selectedContent.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // Retry Expansion Hints
  const handleRetryHints = async () => {
    setIsLoadingHints(true);
    setSelectedHintIndex(null);

    // 保持反白效果
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
    }

    try {
      const fetchedHints = await getExpansionHints(selectedText);
      setHints(fetchedHints);
    } catch (error) {
      console.error("Failed to fetch expansion hints:", error);
    } finally {
      setIsLoadingHints(false);
    }
  };

  // 選擇 Hint（保持反白）
  const handleSelectHint = (index: number) => {
    setSelectedHintIndex(index);

    // 保持反白效果
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
    }
  };

  // 插入選中的 Hint
  const handleInsertHint = () => {
    if (selectedHintIndex === null || !textareaRef.current) return;

    const selectedHint = hints[selectedHintIndex];
    // 移除換行符號，只保留單行文字，並在前面加一個空格
    const cleanExample = selectedHint.example.replace(/\n/g, " ").trim();
    const textToInsert = " " + cleanExample;

    // 在反白文字後面插入
    const newContent =
      content.substring(0, selectionEnd) +
      textToInsert +
      content.substring(selectionEnd);

    setContent(newContent);
    setShowContextMenu(false);

    // 將游標移到插入文字的後面
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = selectionEnd + textToInsert.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  return (
    <>
      <div className="w-[670px] h-[95%] bg-white my-auto flex flex-col rounded-[10px] border border-(--color-border) overflow-hidden">
        <div className="px-[40px] py-[20px] flex items-center justify-between h-[70px] shrink-0">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="font-medium text-[20px] text-(--color-text-primary) flex-1 outline-none bg-transparent"
          />
          <Button
            variant="third"
            icon="center_focus_strong"
            onClick={onToggleFocus}
            className={isFocusMode ? "bg-(--color-bg-secondary)!" : ""}
          >
            Focus
          </Button>
        </div>

        {/* 內容區 - 佔據剩餘空間，設定最低高度 */}
        <div className="flex-1 overflow-hidden min-h-[200px] border-(--color-border) border-0 border-y">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onMouseUp={handleMouseUp}
            placeholder="Add text to start writing"
            className="w-full h-full px-[40px] py-[40px] text-[16px] text-(--color-text-primary) leading-[1.8] outline-none resize-none"
            style={{ fontFamily: "Pretendard, sans-serif" }}
          />
        </div>

        {/* 底部欄 - 固定高度 */}
        <div className="px-[40px] py-[20px] flex items-center justify-between h-[59px] shrink-0">
          <p className="font-normal text-[14px] text-(--color-text-tertiary) text-right">
            {characterCount} characters
          </p>
          <Button variant="primary" icon="save" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50"
          style={{
            left: `${menuPosition.x}px`,
            top: `${adjustedMenuY}px`,
          }}
        >
          {menuStage === "initial" && (
            <ContextMenu
              onSelectParaphrase={handleSelectParaphrase}
              onSelectExpansionHint={handleSelectExpansionHint}
            />
          )}

          {menuStage === "expansion-hint" && (
            <>
              {isLoadingHints ? (
                <div className="bg-white border border-(--color-border) rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-[20px]">
                  <p className="text-(--color-text-secondary) text-[14px]">
                    Loading hints...
                  </p>
                </div>
              ) : (
                <ExpansionHintPanel
                  hints={hints}
                  selectedIndex={selectedHintIndex}
                  onSelectHint={handleSelectHint}
                  onRetry={handleRetryHints}
                  onInsert={handleInsertHint}
                />
              )}
            </>
          )}

          {menuStage === "paraphrase-style" && (
            <ParaphraseStylePanel
              onSelectStyle={handleSelectStyle}
              textareaRef={textareaRef}
              selectionStart={selectionStart}
              selectionEnd={selectionEnd}
            />
          )}

          {menuStage === "paraphrase-result" && (
            <>
              {isLoadingParaphrase ? (
                <div className="bg-white border border-(--color-border) rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-[20px]">
                  <p className="text-(--color-text-secondary) text-[14px]">
                    Loading paraphrase...
                  </p>
                </div>
              ) : paraphraseResult ? (
                <ParaphrasePanel
                  result={paraphraseResult}
                  onRetry={handleRetryParaphrase}
                  onReplace={handleReplaceParaphrase}
                  textareaRef={textareaRef}
                  selectionStart={selectionStart}
                  selectionEnd={selectionEnd}
                />
              ) : null}
            </>
          )}
        </div>
      )}
    </>
  );
}
