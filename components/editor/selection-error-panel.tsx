"use client";

import { Button } from "@/components/ui/button";

interface SelectionErrorPanelProps {
  message: string;
  onClose?: () => void;
}

export function SelectionErrorPanel({ message, onClose }: SelectionErrorPanelProps) {
  return (
    <div className="bg-white border border-(--color-border) rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-[20px] flex flex-col gap-[10px]">
      <div className="flex items-center gap-[10px]">
        <span className="material-symbols-rounded text-[20px] text-red-500 shrink-0">
          error
        </span>
        <span className="font-medium text-[14px] text-(--color-text-secondary)">
          {message}
        </span>
      </div>
      {onClose && (
        <div className="flex justify-end">
          <Button variant="cancel" icon="close" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
