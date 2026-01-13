"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";

interface EditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSave?: (title: string, content: string) => void;
}

export function Editor({
  initialTitle = "",
  initialContent = "",
  onSave,
}: EditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  // 即時計算字數
  const characterCount = content.length;

  const handleSave = () => {
    if (onSave) {
      onSave(title, content);
    }
  };

  return (
    <div className="w-[670px] h-[95%] bg-white my-auto flex flex-col rounded-[10px] border border-(--color-border) overflow-hidden">
      <div className="px-[40px] py-[20px] flex items-center justify-between h-[77px] shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className="font-medium text-[20px] text-(--color-text-primary) flex-1 outline-none bg-transparent"
        />
        <Button variant="cancel" icon="center_focus_strong">
          Focus
        </Button>
      </div>

      {/* 內容區 - 佔據剩餘空間，設定最低高度 */}
      <div className="flex-1 overflow-hidden min-h-[200px] border-(--color-border) border-0 border-y">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요..."
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
  );
}
