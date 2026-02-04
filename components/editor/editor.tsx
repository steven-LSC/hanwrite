"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Button } from "../ui/button";
import { StatusIndicator } from "../ui/status-indicator";
import { Loading } from "../ui/loading";
import { ContextMenu } from "./context-menu";
import { ExpansionHintPanel } from "./expansion-hint-panel";
import { ParaphrasePanel } from "./paraphrase-panel";
import { SelectionErrorPanel } from "./selection-error-panel";
import {
  getExpansionHints,
  getParaphraseResult,
} from "@/lib/data/context-menu";
import {
  ContextMenuStage,
  ExpansionHint,
  ParaphraseResult,
} from "@/lib/types";
import { useFocus } from "@/app/(main)/focus-context";
import { useEditor, EditorHighlightRef, EditorContentRef, ErrorPosition, EditorClickHandlerRef } from "@/app/(main)/editor-context";
import { logBehavior } from "@/lib/log-behavior";
import { useWritingProgress } from "@/lib/hooks/use-writing-progress";

interface EditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSave?: (title: string, content: string) => Promise<void>;
  onTitleChange?: (title: string) => void;
  isLoading?: boolean;
  writingId?: string;
}

export interface EditorRef {
  getTitle: () => string;
  getContent: () => string;
  triggerSave: () => Promise<void>;
}

export const Editor = forwardRef<EditorRef, EditorProps>(
  (
    {
      initialTitle = "",
      initialContent = "",
      onSave,
      onTitleChange,
      isLoading = false,
      writingId,
    },
    ref
  ) => {
    const { isFocusMode, toggleFocus, checkAndSetWritingState, activityState } = useFocus();
    const { editorHighlightRef, editorContentRef, editorClickHandlerRef } = useEditor();
    const [title, setTitle] = useState(initialTitle);
    const [content, setContent] = useState(initialContent);
    const [isSaving, setIsSaving] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const highlightRef = useRef<{ start: number; end: number; color: string } | null>(null);

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
    const [isLoadingParaphrase, setIsLoadingParaphrase] = useState(false);
    const [selectionError, setSelectionError] = useState<string | null>(null);

    // 當 initialTitle 或 initialContent 改變時更新狀態（用於切換文章）
    useEffect(() => {
      setTitle(initialTitle);
      setContent(initialContent);
      // 同步 contentEditable div 的內容（將 \n 轉換為 <br>）
      if (editorRef.current) {
        const currentText = getTextContent(editorRef.current);
        if (currentText !== initialContent) {
          // 保存當前的選取範圍
          const selection = window.getSelection();
          const hadFocus = document.activeElement === editorRef.current;
          let savedRange: Range | null = null;

          if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
            savedRange = selection.getRangeAt(0).cloneRange();
          }

          // 將 \n 轉換為 <br> 後設定到 contentEditable
          editorRef.current.innerHTML = textToHtml(initialContent);

          // 恢復選取範圍（如果之前有選取且焦點在編輯器上）
          if (savedRange && selection && hadFocus) {
            try {
              // 檢查範圍是否仍然有效
              if (editorRef.current.contains(savedRange.startContainer)) {
                selection.removeAllRanges();
                selection.addRange(savedRange);
              }
            } catch (e) {
              // 如果恢復失敗，至少恢復焦點
              if (editorRef.current) {
                editorRef.current.focus();
              }
            }
          }
        }
      }
    }, [initialTitle, initialContent]);


    // 即時計算字數
    const characterCount = content.length;

    // 使用 Writing Progress Hook 追蹤寫作進度
    useWritingProgress({
      writingId,
      activityState,
      characterCount,
    });

    // Helper 函數：取得純文字內容（將 HTML 換行轉換回 \n）
    const getTextContent = (element: HTMLElement): string => {
      // 複製元素以避免修改原始 DOM
      const clone = element.cloneNode(true) as HTMLElement;

      const isBlockElement = (node: Node): boolean => {
        return (
          node.nodeType === Node.ELEMENT_NODE &&
          ["DIV", "P"].includes((node as HTMLElement).tagName)
        );
      };

      const extractText = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent || "";
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
          return "";
        }

        const elementNode = node as HTMLElement;
        if (elementNode.tagName === "BR") {
          return "\n";
        }

        let text = "";
        elementNode.childNodes.forEach((child, index) => {
          const childText = extractText(child);
          if (index > 0 && isBlockElement(child) && !text.endsWith("\n")) {
            if (childText !== "\n") {
              text += "\n";
            }
          }
          text += childText;
        });

        return text;
      };

      return extractText(clone);
    };

    // Helper 函數：將純文字轉換為 HTML（將 \n 轉換為 <br>）
    const textToHtml = (text: string): string => {
      // 將 \n 轉換為 <br>
      return text.replace(/\n/g, "<br>");
    };

    // Helper 函數：取得選取範圍
    // 使用與 setSelectionRange 相同的邏輯來計算位置
    const getSelectionRange = (
      element: HTMLElement
    ): { start: number; end: number } | null => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;

      const range = selection.getRangeAt(0);
      if (!element.contains(range.commonAncestorContainer)) return null;

      let charCount = 0;
      let start = 0;
      let end = 0;
      let foundStart = false;
      let foundEnd = false;

      const traverse = (node: Node): boolean => {
        if (node.nodeType === Node.TEXT_NODE) {
          const textNode = node as Text;
          const nodeLength = textNode.textContent?.length || 0;

          // 檢查開始位置
          if (!foundStart) {
            if (node === range.startContainer) {
              foundStart = true;
              start = charCount + range.startOffset;
            }
          }

          // 檢查結束位置
          if (!foundEnd) {
            if (node === range.endContainer) {
              foundEnd = true;
              end = charCount + range.endOffset;
              return true; // 停止遍歷
            }
          }

          charCount += nodeLength;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const elementNode = node as HTMLElement;

          // 如果是 <br> 標籤，視為一個字元
          if (elementNode.tagName === "BR") {
            // 檢查開始位置是否在這個 <br> 的位置
            if (!foundStart) {
              // 如果 startContainer 是這個 <br> 的父節點
              if (range.startContainer === node.parentNode) {
                const childIndex = Array.from(node.parentNode!.childNodes).indexOf(node as ChildNode);
                if (range.startOffset === childIndex) {
                  // startOffset 指向 <br> 之前
                  foundStart = true;
                  start = charCount;
                } else if (range.startOffset === childIndex + 1) {
                  // startOffset 指向 <br> 之後
                  foundStart = true;
                  start = charCount + 1;
                }
              } else if (range.startContainer === node) {
                // startContainer 就是這個 <br> 節點本身（不應該發生，但為了安全）
                foundStart = true;
                start = charCount;
              }
            }

            // 檢查結束位置是否在這個 <br> 的位置
            if (!foundEnd) {
              if (range.endContainer === node.parentNode) {
                const childIndex = Array.from(node.parentNode!.childNodes).indexOf(node as ChildNode);
                if (range.endOffset === childIndex) {
                  foundEnd = true;
                  end = charCount;
                  return true;
                } else if (range.endOffset === childIndex + 1) {
                  foundEnd = true;
                  end = charCount + 1;
                  return true;
                }
              } else if (range.endContainer === node) {
                foundEnd = true;
                end = charCount;
                return true;
              }
            }

            charCount += 1;
          } else {
            // 遞迴遍歷子節點
            for (let i = 0; i < elementNode.childNodes.length; i++) {
              if (traverse(elementNode.childNodes[i])) {
                return true;
              }
            }
          }
        }
        return false;
      };

      // 遍歷所有子節點
      for (let i = 0; i < element.childNodes.length; i++) {
        if (traverse(element.childNodes[i])) {
          break;
        }
      }

      // 如果沒找到，返回 null
      if (!foundStart || !foundEnd) {
        return null;
      }

      return { start, end };
    };

    // Helper 函數：設定選取範圍
    const setSelectionRange = (
      element: HTMLElement,
      start: number,
      end: number
    ): void => {
      const selection = window.getSelection();
      if (!selection) return;

      const range = document.createRange();
      let charCount = 0;
      let foundStart = false;
      let foundEnd = false;
      let startNode: Node | null = null;
      let startOffset = 0;
      let endNode: Node | null = null;
      let endOffset = 0;

      // 自定義遍歷函數，同時處理文字節點和 <br> 標籤
      const traverse = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const textNode = node as Text;
          const nodeLength = textNode.textContent?.length || 0;

          if (!foundStart && charCount + nodeLength >= start) {
            foundStart = true;
            startNode = textNode;
            startOffset = start - charCount;
          }

          if (!foundEnd && charCount + nodeLength >= end) {
            foundEnd = true;
            endNode = textNode;
            endOffset = end - charCount;
            return true; // 停止遍歷
          }

          charCount += nodeLength;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const elementNode = node as HTMLElement;
          // 如果是 <br> 標籤，視為一個換行符號（一個字元）
          if (elementNode.tagName === "BR") {
            // charCount 是 <br> 之前的位置，charCount + 1 是 <br> 之後的位置
            // 先檢查 start 是否在這個 <br> 的位置
            if (!foundStart) {
              if (start === charCount) {
                // start 正好在 <br> 之前
                foundStart = true;
                startNode = elementNode;
                startOffset = 0;
              } else if (start === charCount + 1) {
                // start 正好在 <br> 之後
                foundStart = true;
                startNode = elementNode;
                startOffset = 1;
              }
            }

            // 檢查 end 是否在這個 <br> 的位置
            if (!foundEnd) {
              if (end === charCount) {
                foundEnd = true;
                endNode = elementNode;
                endOffset = 0;
                if (foundStart) return true; // 停止遍歷
              } else if (end === charCount + 1) {
                foundEnd = true;
                endNode = elementNode;
                endOffset = 1;
                if (foundStart) return true; // 停止遍歷
              } else if (end < charCount) {
                // end 在 <br> 之前（這不應該發生，但為了安全起見）
                foundEnd = true;
                endNode = elementNode;
                endOffset = 0;
                return true; // 停止遍歷
              }
            }

            // 如果都找到了，停止遍歷
            if (foundStart && foundEnd) {
              return true;
            }

            charCount += 1; // <br> 視為一個字元
          } else {
            // 遞迴遍歷子節點
            for (let i = 0; i < elementNode.childNodes.length; i++) {
              if (traverse(elementNode.childNodes[i])) {
                return true; // 如果子節點返回 true，停止遍歷
              }
            }
          }
        }
        return false;
      };

      traverse(element);

      if (foundStart && foundEnd && startNode && endNode) {
        // 明確指定型別，避免 TypeScript 型別推斷錯誤
        const start: Node = startNode;
        const end: Node = endNode;

        try {
          // 處理 <br> 標籤的情況
          if (start.nodeType === Node.ELEMENT_NODE && (start as HTMLElement).tagName === "BR") {
            if (startOffset === 0) {
              range.setStartBefore(start);
            } else {
              range.setStartAfter(start);
            }
          } else {
            range.setStart(start, Math.min(startOffset, (start as Text).textContent?.length || 0));
          }

          if (end.nodeType === Node.ELEMENT_NODE && (end as HTMLElement).tagName === "BR") {
            if (endOffset === 0) {
              range.setEndBefore(end);
            } else {
              range.setEndAfter(end);
            }
          } else {
            range.setEnd(end, Math.min(endOffset, (end as Text).textContent?.length || 0));
          }

          selection.removeAllRanges();
          selection.addRange(range);
        } catch (e) {
          // 如果設定失敗，嘗試設定到元素末尾
          try {
            range.selectNodeContents(element);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          } catch (e2) {
            // 如果還是失敗，至少確保焦點在元素上
            element.focus();
          }
        }
      } else if (foundStart && startNode) {
        // 如果只找到開始位置，設定游標到該位置
        // 明確指定型別，避免 TypeScript 型別推斷錯誤
        const start: Node = startNode;
        try {
          if (start.nodeType === Node.ELEMENT_NODE && (start as HTMLElement).tagName === "BR") {
            if (startOffset === 0) {
              range.setStartBefore(start);
            } else {
              range.setStartAfter(start);
            }
          } else {
            range.setStart(start, Math.min(startOffset, (start as Text).textContent?.length || 0));
          }
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (e) {
          element.focus();
        }
      } else {
        // 如果找不到位置，設定游標到元素末尾
        try {
          range.selectNodeContents(element);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (e) {
          element.focus();
        }
      }
    };

    const handleSave = async () => {
      if (onSave && !isSaving) {
        setIsSaving(true);
        try {
          await onSave(title, content);
        } finally {
          setIsSaving(false);
        }
      }
    };

    // Highlight 單個錯誤文字（會清除之前的 highlight）
    const highlightError = (position: { start: number; end: number }, errorType: "grammar" | "vocab") => {
      if (!editorRef.current) return;

      // 清除之前的 highlight
      clearHighlight();

      // Highlight 單個錯誤
      highlightSingleError(position, errorType);
    };

    // Highlight 單個錯誤（不清除之前的 highlight，用於 showAll）
    const highlightSingleError = (position: { start: number; end: number }, errorType: "grammar" | "vocab") => {
      if (!editorRef.current) return;

      const color = errorType === "grammar" ? "#DBEAFE" : "#FEF08A";

      // 建立選取範圍
      const selection = window.getSelection();
      if (!selection) return;

      // 設定選取範圍
      setSelectionRange(editorRef.current, position.start, position.end);

      // 取得選取範圍
      if (selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);

      // 檢查這個範圍是否已經被 highlight 了（避免重複 highlight）
      const rangeText = range.toString();
      if (!rangeText) return;

      // 建立一個 span 來包裹 highlight 的文字
      const span = document.createElement("span");
      span.style.backgroundColor = color;
      span.style.padding = "2px 0";
      span.setAttribute("data-error-highlight", "true");

      try {
        // 嘗試使用 surroundContents（適用於簡單情況）
        range.surroundContents(span);
      } catch (e) {
        // 如果 surroundContents 失敗（範圍跨越多個節點），使用另一種方法
        try {
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
        } catch (e2) {
          // 如果還是失敗，使用最簡單的方法：選取文字並加上背景色標記
          const text = range.toString();
          if (text) {
            const textNode = document.createTextNode(text);
            span.appendChild(textNode);
            range.deleteContents();
            range.insertNode(span);
          }
        }
      }

      // 清除選取，但保留 highlight
      selection.removeAllRanges();
    };

    // Highlight 多個錯誤（用於 showAll）
    const highlightAllErrors = (errors: ErrorPosition[]) => {
      if (!editorRef.current) return;

      // 清除之前的 highlight
      clearHighlight();

      // 從後往前 highlight，避免位置偏移
      const sortedErrors = [...errors].sort((a, b) => b.position.start - a.position.start);

      sortedErrors.forEach((error) => {
        highlightSingleError(error.position, error.errorType);
      });
    };

    // 清除 highlight
    const clearHighlight = () => {
      if (!editorRef.current) return;

      // 移除所有 highlight span
      const highlightSpans = editorRef.current.querySelectorAll("span[data-error-highlight='true']");
      highlightSpans.forEach((span) => {
        const parent = span.parentNode;
        if (parent) {
          // 用文字節點替換 span
          const textNode = document.createTextNode(span.textContent || "");
          parent.replaceChild(textNode, span);
          parent.normalize(); // 合併相鄰的文字節點
        }
      });

      highlightRef.current = null;
    };

    // 替換指定位置的文字
    const replaceText = (position: { start: number; end: number }, newText: string) => {
      if (!editorRef.current) return;

      // 計算新的文字內容
      const newContent =
        content.substring(0, position.start) +
        newText +
        content.substring(position.end);

      setContent(newContent);

      // 更新 contentEditable div 的內容（將 \n 轉換為 <br>）
      editorRef.current.innerHTML = textToHtml(newContent);

      // 清除 highlight
      clearHighlight();

      // 將游標移到替換文字的後面
      setTimeout(() => {
        if (editorRef.current) {
          const newPosition = position.start + newText.length;
          editorRef.current.focus();
          setSelectionRange(editorRef.current, newPosition, newPosition);
        }
      }, 0);
    };

    // 暴露 highlight 方法給 context
    useImperativeHandle(editorHighlightRef, () => ({
      highlightError: (position: { start: number; end: number }, errorType: "grammar" | "vocab") => {
        highlightError(position, errorType);
      },
      highlightAllErrors: (errors: ErrorPosition[]) => {
        highlightAllErrors(errors);
      },
      clearHighlight,
      replaceText,
    }));

    // 暴露 content 方法給 context
    useImperativeHandle(editorContentRef, () => ({
      getContent: () => content,
    }));

    // 暴露方法給父元件
    useImperativeHandle(ref, () => ({
      getTitle: () => title,
      getContent: () => content,
      triggerSave: handleSave,
    }));

    // 處理貼上事件（清除格式，只保留純文字）
    const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();

      const editor = editorRef.current;
      if (!editor) return;

      // 從剪貼簿取得純文字
      const pastedText = e.clipboardData.getData('text/plain');

      if (!pastedText) return;

      // 取得當前選取範圍
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);

      // 刪除選取的內容（如果有的話）
      range.deleteContents();

      // 插入純文字
      const textNode = document.createTextNode(pastedText);
      range.insertNode(textNode);

      // 將游標移到插入文字的後面
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      // 更新 content state
      const newTextContent = getTextContent(editor);
      if (newTextContent !== content) {
        setContent(newTextContent);
        // 當內容改變時，清除 highlight（因為位置可能已經改變）
        if (highlightRef.current) {
          clearHighlight();
        }
      }
    };

    // 處理文字輸入
    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      const textContent = getTextContent(e.currentTarget);
      // 只有在內容真的改變時才更新 state，避免不必要的重新渲染
      if (textContent !== content) {
        setContent(textContent);
        // 當內容改變時，清除 highlight（因為位置可能已經改變）
        if (highlightRef.current) {
          clearHighlight();
        }
      }
    };

    // 處理文字反白
    const handleMouseUp = (e: React.MouseEvent) => {
      const editor = editorRef.current;
      if (!editor) return;

      setTimeout(() => {
        const range = getSelectionRange(editor);
        if (!range) {
          setShowContextMenu(false);
          // 當沒有選取文字時，清除 highlight（保留錯誤卡片）
          if (editorHighlightRef.current) {
            editorHighlightRef.current.clearHighlight();
          }
          // 通知 error-detection-correction 組件關閉 showAll
          if (editorClickHandlerRef.current) {
            editorClickHandlerRef.current.onEditorClick();
          }
          return;
        }

        const { start, end } = range;
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
          editor.focus();
          setSelectionRange(editor, start, end);
        } else {
          setShowContextMenu(false);
          // 當沒有選取文字時，清除 highlight（保留錯誤卡片）
          if (editorHighlightRef.current) {
            editorHighlightRef.current.clearHighlight();
          }
          // 通知 error-detection-correction 組件關閉 showAll
          if (editorClickHandlerRef.current) {
            editorClickHandlerRef.current.onEditorClick();
          }
        }
      }, 10);
    };

    // 點擊外部或編輯器內部關閉選單
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        // 如果點擊的不是選單內部，就關閉選單
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target as Node)
        ) {
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

    // 監聽鍵盤事件，按下 Delete 或 Backspace 時關閉選單
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          showContextMenu &&
          (event.key === "Delete" || event.key === "Backspace")
        ) {
          setShowContextMenu(false);
        }
      };

      if (showContextMenu) {
        document.addEventListener("keydown", handleKeyDown);
      }

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [showContextMenu]);

    // 當選取文字被刪除或改變時，關閉選單
    useEffect(() => {
      if (!showContextMenu || !editorRef.current) return;

      const checkSelection = () => {
        const editor = editorRef.current;
        if (!editor) return;

        const range = getSelectionRange(editor);
        if (!range) {
          setShowContextMenu(false);
          return;
        }

        const { start, end } = range;
        const selected = content.substring(start, end);

        // 如果沒有選取文字或選取文字與之前不同，關閉選單
        if (selected.trim().length === 0 || selected !== selectedText) {
          setShowContextMenu(false);
        }
      };

      // 使用 setTimeout 確保在文字刪除後檢查
      const timeoutId = setTimeout(checkSelection, 10);

      return () => {
        clearTimeout(timeoutId);
      };
    }, [content, showContextMenu, selectedText]);

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
    }, [
      showContextMenu,
      menuPosition,
      menuStage,
      isLoadingHints,
      isLoadingParaphrase,
    ]);

    // 選擇 Expansion Hint
    const handleSelectExpansionHint = async () => {
      setMenuStage("expansion-hint");
      setIsLoadingHints(true);
      setSelectedHintIndex(null);
      setSelectionError(null);

      // 保持反白效果
      if (editorRef.current) {
        editorRef.current.focus();
        setSelectionRange(editorRef.current, selectionStart, selectionEnd);
      }

      try {
        const { hints: fetchedHints, duration } = await getExpansionHints(selectedText);
        setHints(fetchedHints);
        // 收到結果後記錄
        logBehavior("expansion-hint-generate", {
          hints: fetchedHints,
          duration,
        });
      } catch (error) {
        // 處理 API 錯誤
        const errorMessage =
          error instanceof Error
            ? error.message
            : "無法取得擴展建議，請稍後再試";

        // 只有非驗證錯誤才記錄到 console（驗證錯誤是預期的，不需要記錄）
        const isValidationError = (error as any).isValidationError;
        if (!isValidationError) {
          console.error("Failed to fetch expansion hints:", error);
        }

        setSelectionError(errorMessage);
        setMenuStage("expansion-hint-error");
      } finally {
        setIsLoadingHints(false);
      }
    };

    // 選擇 Paraphrase（直接調用 API）
    const handleSelectParaphrase = async () => {
      setMenuStage("paraphrase-result");
      setIsLoadingParaphrase(true);
      setSelectionError(null);

      // 保持反白效果
      if (editorRef.current) {
        editorRef.current.focus();
        setSelectionRange(editorRef.current, selectionStart, selectionEnd);
      }

      try {
        const result = await getParaphraseResult(selectedText);
        setParaphraseResult(result);
        // 收到結果後記錄
        logBehavior("paraphrase-generate", {
          originalText: result.originalText,
          changes: result.changes,
          duration: result.duration,
        });
      } catch (error) {
        // 處理 API 錯誤
        const errorMessage =
          error instanceof Error
            ? error.message
            : "無法取得改寫結果，請稍後再試";

        // 只有非驗證錯誤才記錄到 console（驗證錯誤是預期的，不需要記錄）
        const isValidationError = (error as any).isValidationError;
        if (!isValidationError) {
          console.error("Failed to fetch paraphrase result:", error);
        }

        setSelectionError(errorMessage);
        setMenuStage("paraphrase-error");
      } finally {
        setIsLoadingParaphrase(false);
      }
    };

    // Discard Paraphrase（關閉視窗）
    const handleDiscardParaphrase = () => {
      // 記錄 discard 的結果（如果存在）
      if (paraphraseResult) {
        logBehavior("paraphrase-discard", {
          originalText: paraphraseResult.originalText,
          changes: paraphraseResult.changes,
        });
      } else {
        logBehavior("paraphrase-discard");
      }
      setShowContextMenu(false);
    };

    // 套用 Paraphrase 修改到編輯器
    const handleReplaceParaphrase = (enabledChanges: Set<number>) => {
      if (!paraphraseResult || !editorRef.current) return;

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

      // 記錄最終插入的句子和選擇的修改項目
      logBehavior("paraphrase-apply", {
        finalSentence: selectedContent,
        appliedChanges: changesToApply.map((change) => ({
          original: change.original,
          revised: change.revised,
          explanation: change.explanation,
        })),
      });

      // 替換編輯器中的文字
      newContent =
        content.substring(0, selectionStart) +
        selectedContent +
        content.substring(selectionEnd);

      setContent(newContent);
      setShowContextMenu(false);

      // 更新 contentEditable div 的內容（將 \n 轉換為 <br>）
      if (editorRef.current) {
        editorRef.current.innerHTML = textToHtml(newContent);
      }

      // 將游標移到替換文字的後面
      setTimeout(() => {
        if (editorRef.current) {
          const newPosition = selectionStart + selectedContent.length;
          editorRef.current.focus();
          setSelectionRange(editorRef.current, newPosition, newPosition);
        }
      }, 0);
    };

    // Discard Expansion Hints（關閉視窗）
    const handleDiscardHints = () => {
      // 記錄 discard 時把 generate 時候的結果再次記錄
      if (hints.length > 0) {
        logBehavior("expansion-hint-discard", {
          hints: hints,
        });
      } else {
        logBehavior("expansion-hint-discard");
      }
      setShowContextMenu(false);
    };

    // 選擇 Hint（保持反白）
    const handleSelectHint = (index: number) => {
      setSelectedHintIndex(index);

      // 保持反白效果
      if (editorRef.current) {
        editorRef.current.focus();
        setSelectionRange(editorRef.current, selectionStart, selectionEnd);
      }
    };

    // 插入選中的 Hint
    const handleInsertHint = () => {
      if (selectedHintIndex === null || !editorRef.current) return;

      const selectedHint = hints[selectedHintIndex];
      // 移除換行符號，只保留單行文字，並在前面加一個空格
      const cleanExample = selectedHint.example.replace(/\n/g, " ").trim();
      const textToInsert = " " + cleanExample;

      // 記錄插入的 hint（只記錄 insertedHint）
      logBehavior("expansion-hint-insert", {
        insertedHint: selectedHint,
      });

      // 在反白文字後面插入
      const newContent =
        content.substring(0, selectionEnd) +
        textToInsert +
        content.substring(selectionEnd);

      setContent(newContent);
      setShowContextMenu(false);

      // 更新 contentEditable div 的內容（將 \n 轉換為 <br>）
      if (editorRef.current) {
        editorRef.current.innerHTML = textToHtml(newContent);
      }

      // 將游標移到插入文字的後面
      setTimeout(() => {
        if (editorRef.current) {
          const newPosition = selectionEnd + textToInsert.length;
          editorRef.current.focus();
          setSelectionRange(editorRef.current, newPosition, newPosition);
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
              onClick={checkAndSetWritingState}
              onChange={(e) => {
                const newTitle = e.target.value;
                setTitle(newTitle);
                onTitleChange?.(newTitle);
              }}
              placeholder="Title"
              spellCheck={false}
              className="font-medium text-[20px] text-(--color-text-primary) flex-1 outline-none bg-transparent"
              disabled={isLoading}
            />
            <Button
              variant="third"
              icon="center_focus_strong"
              onClick={toggleFocus}
              className={isFocusMode ? "bg-(--color-bg-secondary)!" : ""}
            >
              Focus
            </Button>
          </div>

          {/* 內容區 - 佔據剩餘空間，設定最低高度 */}
          <div className="flex-1 overflow-hidden min-h-[200px] border-(--color-border) border-0 border-y relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
                <p className="text-(--color-text-secondary) text-[14px]">
                  Loading...
                </p>
              </div>
            )}
            <div className="relative w-full h-full">
              {!content.trim() && (
                <div className="absolute top-[40px] left-[40px] text-[16px] text-(--color-text-tertiary) pointer-events-none">
                  Add text to start writing
                </div>
              )}
              <div
                ref={editorRef}
                contentEditable
                spellCheck={false}
                onInput={handleInput}
                onPaste={handlePaste}
                onClick={checkAndSetWritingState}
                onMouseUp={handleMouseUp}
                suppressContentEditableWarning
                suppressHydrationWarning
                className="w-full h-full px-[40px] py-[40px] text-[16px] text-(--color-text-primary) leading-[1.8] outline-none overflow-y-auto"
                style={{ fontFamily: "Pretendard, sans-serif" }}
              />
            </div>
          </div>

          {/* 底部欄 - 固定高度 */}
          <div className="px-[40px] py-[20px] flex items-center justify-between h-[59px] shrink-0">
            <p className="font-normal text-[14px] text-(--color-text-tertiary) text-right">
              {characterCount} characters
            </p>
            <div className="flex items-center gap-[10px]">
              {isSaving && <StatusIndicator text="saving" />}
              <Button
                variant="primary"
                icon="save"
                onClick={handleSave}
                disabled={isSaving || isLoading}
              >
                Save
              </Button>
            </div>
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
                  <div className="bg-white border border-(--color-border) rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] w-[340px] h-[200px] flex items-center justify-center">
                    <Loading text="Loading hints..." className="w-full h-full" />
                  </div>
                ) : (
                  <ExpansionHintPanel
                    hints={hints}
                    selectedIndex={selectedHintIndex}
                    onSelectHint={handleSelectHint}
                    onDiscard={handleDiscardHints}
                    onInsert={handleInsertHint}
                  />
                )}
              </>
            )}

            {menuStage === "paraphrase-result" && (
              <>
                {isLoadingParaphrase ? (
                  <div className="bg-white border border-(--color-border) rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] w-[340px] h-[200px] flex items-center justify-center">
                    <Loading text="Loading paraphrase..." className="w-full h-full" />
                  </div>
                ) : paraphraseResult ? (
                  <ParaphrasePanel
                    result={paraphraseResult}
                    onDiscard={handleDiscardParaphrase}
                    onReplace={handleReplaceParaphrase}
                    editorRef={editorRef}
                    selectionStart={selectionStart}
                    selectionEnd={selectionEnd}
                  />
                ) : null}
              </>
            )}

            {menuStage === "expansion-hint-error" && selectionError && (
              <SelectionErrorPanel message={selectionError} />
            )}

            {menuStage === "paraphrase-error" && selectionError && (
              <SelectionErrorPanel message={selectionError} />
            )}
          </div>
        )}
      </>
    );
  }
);

Editor.displayName = "Editor";
