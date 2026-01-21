"use client";

import { useState, useRef, useEffect } from "react";
import { type NodeProps, Handle, Position } from "@xyflow/react";

export function MindmapNode({ data, selected, id }: NodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label as string);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 如果是新 node，自動進入編輯模式
  useEffect(() => {
    if (data.isNew) {
      setIsEditing(true);
    }
  }, [data.isNew]);

  const handleTextDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleNodeDoubleClick = (e: React.MouseEvent) => {
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

  // 聚焦邏輯：當進入編輯模式時自動聚焦
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          if (data.isNew) {
            textareaRef.current.setSelectionRange(0, 0);
          } else {
            const length = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(length, length);
          }
        }
      });
    }
  }, [isEditing, data.isNew]);

  useEffect(() => {
    setLabel(data.label as string);
  }, [data.label]);

  return (
    <div
      onDoubleClick={handleNodeDoubleClick}
      className={`px-4 rounded-lg border transition-all cursor-pointer outline-none focus:outline-none focus-visible:outline-none relative h-[40px] w-[200px] flex items-center justify-center ${selected
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
          onChange={(e) => {
            setLabel(e.target.value);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onDoubleClick={handleTextDoubleClick}
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
