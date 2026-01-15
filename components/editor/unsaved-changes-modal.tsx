"use client";

import React from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  onProceed: () => void;
}

export function UnsavedChangesModal({
  isOpen,
  onClose,
  onSave,
  onProceed,
}: UnsavedChangesModalProps) {
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave();
      onClose();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={true}>
      <div className="bg-white rounded-[10px] p-[30px] w-[500px] flex flex-col gap-[20px]">
        <div className="flex items-center justify-between">
          {/* 標題 */}
          <h2 className="font-bold text-[18px] text-(--color-text-primary)">
            This Editor Doesn't Save Automatically
          </h2>
          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-black/10 transition-colors"
          >
            <span className="material-symbols-rounded text-[20px]">close</span>
          </button>
        </div>

        {/* 訊息 */}
        <p className="text-[14px] text-(--color-text-secondary) leading-relaxed">
          If you leave this page, your changes will not be saved. Please click{" "}
          <span className="text-(--color-primary) font-medium">Save</span> below
          before leaving.
        </p>

        {/* 按鈕組 */}
        <div className="flex items-center justify-end gap-[10px]">
          <Button variant="cancel" icon="arrow_back" onClick={onProceed}>
            Still Go
          </Button>
          <Button
            variant="primary"
            icon="save"
            onClick={handleSave}
            disabled={isSaving}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
