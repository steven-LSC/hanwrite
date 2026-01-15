import React from "react";

interface LoadingProps {
  text?: string;
  className?: string;
}

export function Loading({ text = "Loading", className = "" }: LoadingProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center h-full gap-[10px] ${className}`}
    >
      <div className="w-[40px] h-[40px] border-4 border-(--color-border) border-t-(--color-primary) rounded-full animate-spin" />
      <span className="text-[16px] text-(--color-text-secondary)">
        {text}
      </span>
    </div>
  );
}
