"use client";

interface ErrorMessageProps {
  message: string;
}

/**
 * 可重用的錯誤訊息元件
 * 只包含錯誤訊息的內容部分（icon + 文字），不包含外層容器樣式
 * 讓使用的地方自行決定排版和位置
 */
export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <>
      <span className="material-symbols-rounded text-[20px] text-red-500 shrink-0">
        error
      </span>
      <span className="font-medium text-[14px] text-(--color-text-secondary)">
        {message}
      </span>
    </>
  );
}
