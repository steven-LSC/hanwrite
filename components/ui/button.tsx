import React from "react";

interface ButtonProps {
  variant: "primary" | "secondary" | "cancel" | "third";
  icon?: string;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export function Button({
  variant,
  icon,
  onClick,
  children,
  className = "",
  disabled = false,
  type = "button",
}: ButtonProps) {
  // 變體樣式
  const variantStyles = {
    primary:
      "bg-(--color-primary) text-white hover:brightness-110 transition-colors duration-200",
    secondary:
      "bg-[#DBEAFE] text-[#1D4ED8] hover:bg-[#BFDBFE] transition-colors duration-200",
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

  // disabled 狀態的樣式
  const disabledStyles = disabled
    ? variant === "primary"
      ? "bg-gray-300 text-gray-500 cursor-not-allowed hover:brightness-100"
      : "opacity-50 cursor-not-allowed hover:brightness-100"
    : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${iconOnlyStyles} ${disabledStyles} ${className}`}
    >
      {icon && (
        <span
          className={`material-symbols-rounded text-[20px] ${
            disabled && variant === "primary" ? "text-gray-500" : ""
          }`}
        >
          {icon}
        </span>
      )}
      {children && (
        <span className="font-medium text-[14px] leading-normal">
          {children}
        </span>
      )}
    </button>
  );
}
