interface StatusIndicatorProps {
  text: string;
  className?: string;
}

export function StatusIndicator({ text, className = "" }: StatusIndicatorProps) {
  return (
    <div className={`flex items-center gap-[5px] ${className}`}>
      <span className="material-symbols-rounded text-[14px] text-(--color-text-tertiary) animate-spin">
        sync
      </span>
      <p className="font-normal text-[14px] text-(--color-text-tertiary)">
        {text}
      </p>
    </div>
  );
}
