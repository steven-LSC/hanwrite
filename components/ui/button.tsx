import React from "react";

interface ButtonProps {
  variant: "primary" | "secondary" | "cancel" | "third";
  icon?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function Button({
  variant,
  icon,
  onClick,
  children,
  className = "",
}: ButtonProps) {
  // 變體樣式
  const variantStyles = {
    primary:
      "bg-(--color-primary) text-white hover:brightness-110 transition-colors duration-200",
    secondary:
      "bg-(--color-secondary) text-white hover:brightness-110 transition-colors duration-200",
    cancel:
      "bg-(--color-bg-secondary) text-(--color-text-secondary) border border-(--color-border) hover:bg-slate-200 transition-colors duration-200",
    third:
      "bg-white text-(--color-text-secondary) border border-(--color-border) hover:bg-gray-50 transition-colors duration-200",
  };

  // 基本樣式
  const baseStyles =
    "rounded-[5px] flex items-center gap-[5px] px-[10px] py-[5px]";

  // 如果只有 icon 沒有 children，按鈕為方形
  const isIconOnly = icon && !children;
  const iconOnlyStyles = isIconOnly ? "justify-center" : "";

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${iconOnlyStyles} ${className}`}
    >
      {icon && <span className="material-symbols-rounded">{icon}</span>}
      {children && (
        <span className="font-medium text-[14px] leading-normal">
          {children}
        </span>
      )}
    </button>
  );
}
