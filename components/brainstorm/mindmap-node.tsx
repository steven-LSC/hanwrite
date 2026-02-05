"use client";

import { useState, useRef, useEffect } from "react";
import { type NodeProps, Handle, Position } from "@xyflow/react";

interface MindmapNodeProps extends NodeProps {
  readonly?: boolean;
}

export function MindmapNode({ data, selected, id, readonly = false }: MindmapNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label as string);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 如果是新 node，自動進入編輯模式（readonly 模式下不允許）
  useEffect(() => {
    if (data.isNew && !readonly) {
      setIsEditing(true);
    }
  }, [data.isNew, readonly]);

  // 當新 node 被選中時，確保進入編輯模式（readonly 模式下不允許）
  useEffect(() => {
    if (data.isNew && selected && !readonly) {
      setIsEditing(true);
    }
  }, [data.isNew, selected, readonly]);

  const handleTextDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!readonly) {
      setIsEditing(true);
    }
  };

  const handleNodeDoubleClick = (e: React.MouseEvent) => {
    if (readonly) return;
    
    // 如果雙擊的是文字區域（textarea 或顯示文字的 div），不處理（由 handleTextDoubleClick 處理）
    const target = e.target as HTMLElement;
    if (
      target.tagName === "TEXTAREA" ||
      (target.tagName === "DIV" && target.textContent !== null)
    ) {
      return;
    }

    // 雙擊節點其他區域，新增子節點
    if (data.onAddChild && typeof data.onAddChild === "function") {
      data.onAddChild(id);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (data.onLabelChange && typeof data.onLabelChange === "function") {
      data.onLabelChange(label);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setLabel(data.label as string);
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLabel(e.target.value);
    // 不手動設置游標位置，讓瀏覽器自動處理
    // 我們只需要確保 useEffect 不會在輸入過程中重置游標
  };

  // 聚焦邏輯：只在第一次進入編輯模式時自動聚焦和設置游標位置
  // 使用 nodeId 來追蹤每個 node 的初始化狀態，避免 data.isNew 改變時重新初始化
  const initializedNodeIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    // 當離開編輯模式時重置標記
    if (!isEditing) {
      initializedNodeIdRef.current = null;
      return;
    }
    
    // 只在第一次進入編輯模式時初始化，且只在 nodeId 改變時重新初始化
    if (isEditing && textareaRef.current && initializedNodeIdRef.current !== id) {
      // 使用雙重 requestAnimationFrame 和 setTimeout 確保 DOM 完全渲染
      const focusTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (textareaRef.current && initializedNodeIdRef.current !== id) {
              textareaRef.current.focus();
              // 確保聚焦成功
              if (document.activeElement === textareaRef.current) {
                if (data.isNew) {
                  // 新 node：游標在開頭
                  textareaRef.current.setSelectionRange(0, 0);
                } else {
                  // 編輯現有 node：游標在結尾
                  const length = textareaRef.current.value.length;
                  textareaRef.current.setSelectionRange(length, length);
                }
                initializedNodeIdRef.current = id;
              }
            }
          });
        });
      }, 100); // 給 ReactFlow 更多時間來渲染節點

      return () => clearTimeout(focusTimeout);
    }
  }, [isEditing, id, data.isNew]);

  useEffect(() => {
    setLabel(data.label as string);
  }, [data.label]);

  return (
    <div
      onDoubleClick={handleNodeDoubleClick}
      className={`px-4 rounded-lg border transition-all outline-none focus:outline-none focus-visible:outline-none relative h-[40px] w-[200px] flex items-center justify-center ${readonly
        ? "cursor-default"
        : "cursor-pointer"} ${selected
        ? "bg-blue-50 border-blue-300"
        : "bg-(--color-bg-card) border-gray-300 hover:border-gray-400"
        }`}
    >
      {/* Handle 用於連接線 */}
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        style={{ opacity: 0 }}
      />
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        style={{ opacity: 0 }}
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        style={{ opacity: 0 }}
      />
      <Handle
        id="right"
        type="target"
        position={Position.Right}
        style={{ opacity: 0 }}
      />

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={label}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onDoubleClick={handleTextDoubleClick}
          tabIndex={0}
          dir="ltr"
          {...(!!data.isNew && !readonly ? { autoFocus: true } : {})}
          className="bg-transparent outline-none text-(--color-text-secondary) text-[14px] font-medium text-center resize-none w-full overflow-hidden whitespace-nowrap flex items-center"
          style={{
            lineHeight: "40px",
            height: "40px",
            pointerEvents: "auto",
          }}
        />
      ) : (
        <div
          onDoubleClick={handleTextDoubleClick}
          className="text-(--color-text-secondary) text-[14px] font-medium text-center h-full flex items-center justify-center whitespace-nowrap overflow-hidden text-ellipsis w-full"
        >
          {label || "\u00A0"}
        </div>
      )}
    </div>
  );
}
