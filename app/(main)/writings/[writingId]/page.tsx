"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { Editor, EditorRef } from "@/components/editor/editor";
import { UnsavedChangesModal } from "@/components/editor/unsaved-changes-modal";
import { getWriting, createWriting, updateWriting, saveToolPanelState } from "@/lib/data/writings";
import { Writing } from "@/lib/types";
import { useFocus } from "../../focus-context";
import { useUnsaved } from "../../unsaved-context";

export default function WritingPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const writingId = params.writingId as string;
  const isNewWriting = writingId === "new";
  const { sidebarRef, toolPanelRef } = useFocus();
  const { setWarningHandler } = useUnsaved();
  const editorRef = useRef<EditorRef>(null);
  const pendingNavigationRef = useRef<string | null>(null);
  const resolveNavigationRef = useRef<((value: boolean) => void) | null>(null);

  const [writing, setWriting] = useState<Writing | null>(null);
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  useEffect(() => {
    if (isNewWriting) {
      // 新文章：不需要載入，直接設為空白
      setWriting(null);
    } else if (writingId) {
      // 如果已經載入過這個文章，不需要重新載入
      if (writing?.id === writingId) {
        return;
      }
      // 現有文章：載入資料
      setIsEditorLoading(true);
      getWriting(writingId)
        .then((w) => {
          setWriting(w);
        })
        .catch((error) => {
          console.error("Failed to load writing:", error);
          // 找不到文章時導引到 new
          router.replace("/writings/new");
        })
        .finally(() => {
          setIsEditorLoading(false);
        });
    }
  }, [writingId, isNewWriting, router, writing?.id]);

  const handleSave = async (title: string, content: string) => {
    if (isNewWriting) {
      // 首次儲存：建立文章
      const newId = await createWriting(title, content);
      // 更新 sidebar 列表
      if (sidebarRef.current) {
        await sidebarRef.current.refreshRecentWritings();
      }
      // 更新 URL
      router.push(`/writings/${newId}`);
      // 更新本地狀態
      const newWriting: Writing = {
        id: newId,
        title: title || "Untitled",
        content,
        characterCount: content.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setWriting(newWriting);
    } else {
      // 更新現有文章
      await updateWriting(writingId, title, content);
      // 注意：更新現有文章時不更新 sidebar 列表順序
      // 只有在新增文章時才會更新 sidebar 列表
      // 更新本地狀態
      if (writing) {
        setWriting({
          ...writing,
          title: title || "Untitled",
          content,
          characterCount: content.length,
          updatedAt: new Date(),
        });
      }
    }
  };

  // 處理儲存（文章 + 工具欄狀態）
  const handleSaveWithToolState = async () => {
    if (!editorRef.current) return;

    const title = editorRef.current.getTitle();
    const content = editorRef.current.getContent();

    // 儲存文章
    await handleSave(title, content);

    // 儲存工具欄狀態（如果不是新文章）
    if (!isNewWriting && toolPanelRef.current) {
      const toolState = toolPanelRef.current.getToolState();
      await saveToolPanelState(writingId, toolState);
    }
  };

  // 註冊警告處理器
  useEffect(() => {
    const handler = async (): Promise<boolean> => {
      // 如果是空的新文章，直接允許導航
      const currentWritingId = params.writingId as string;
      const currentIsNewWriting = currentWritingId === "new";
      
      if (currentIsNewWriting && editorRef.current) {
        const title = editorRef.current.getTitle().trim();
        const content = editorRef.current.getContent().trim();

        // 檢查 title 和 content 是否為空
        if (!title && !content) {
          // 檢查工具狀態是否為空
          if (toolPanelRef.current) {
            const toolState = toolPanelRef.current.getToolState();
            const hasToolState =
              toolState["reverse-outlining"] !== null ||
              toolState["ai-analysis"] !== null ||
              toolState["expression-builder"] !== null;

            // 如果工具狀態也是空的，直接允許導航
            if (!hasToolState) {
              return true;
            }
          } else {
            // 如果沒有 toolPanelRef，也允許導航
            return true;
          }
        }
      }

      return new Promise((resolve) => {
        pendingNavigationRef.current = "pending";
        resolveNavigationRef.current = resolve;
        setShowUnsavedModal(true);
      });
    };

    setWarningHandler(handler);

    return () => {
      setWarningHandler(async () => true);
    };
  }, [setWarningHandler, params.writingId]);

  // 攔截頁面刷新和離開
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // 處理 modal 關閉（X 按鈕）
  const handleModalClose = () => {
    setShowUnsavedModal(false);
    pendingNavigationRef.current = null;
    if (resolveNavigationRef.current) {
      resolveNavigationRef.current(false); // 取消導航
      resolveNavigationRef.current = null;
    }
  };

  // 處理 modal 繼續（Still Go 按鈕）
  const handleModalProceed = () => {
    setShowUnsavedModal(false);
    pendingNavigationRef.current = null;
    if (resolveNavigationRef.current) {
      resolveNavigationRef.current(true); // 允許導航
      resolveNavigationRef.current = null;
    }
  };

  // 處理 modal 儲存（Save 按鈕）
  const handleModalSave = async () => {
    await handleSaveWithToolState();
    setShowUnsavedModal(false);
    pendingNavigationRef.current = null;
    if (resolveNavigationRef.current) {
      resolveNavigationRef.current(true); // 允許導航
      resolveNavigationRef.current = null;
    }
  };

  return (
    <>
      <Editor
        ref={editorRef}
        initialTitle={writing?.title || ""}
        initialContent={writing?.content || ""}
        onSave={handleSave}
        isLoading={isEditorLoading}
      />
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onClose={handleModalClose}
        onSave={handleModalSave}
        onProceed={handleModalProceed}
      />
    </>
  );
}
