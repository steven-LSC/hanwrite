"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useEffect,
} from "react";
import { ToolPanelRef } from "@/components/tool-panel/tool-panel";
import { logBehavior } from "@/lib/log-behavior";

export interface SidebarRef {
  refreshRecentWritings: () => Promise<void>;
  updateRecentWritingTitle: (writingId: string, newTitle: string) => void;
}

// 活動狀態類型
type ActivityState = "writing" | "mindmap-editing" | "tool-using" | null;

interface FocusContextType {
  isFocusMode: boolean;
  toggleFocus: () => void;
  sidebarRef: React.RefObject<SidebarRef | null>;
  toolPanelRef: React.RefObject<ToolPanelRef | null>;
  // 活動狀態相關
  activityState: ActivityState;
  setActivityState: (state: ActivityState) => void;
  checkAndSetWritingState: () => void;
  checkAndSetMindmapEditingState: () => void;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export function FocusProvider({ children }: { children: ReactNode }) {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activityState, setActivityState] = useState<ActivityState>(null);
  const sidebarRef = useRef<SidebarRef | null>(null);
  const toolPanelRef = useRef<ToolPanelRef | null>(null);
  const isInitialMount = useRef(true);

  // 使用 useEffect 監聽狀態變化，只在實際改變時記錄（跳過初始渲染）
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // 記錄行為
    logBehavior(isFocusMode ? "focus-mode-on" : "focus-mode-off");
  }, [isFocusMode]);

  const toggleFocus = () => {
    setIsFocusMode((prev) => !prev);
  };

  // 檢查並設定寫作狀態（供編輯器使用）
  // 如果當前狀態不是 "writing"，就更新為 "writing" 並記錄
  const checkAndSetWritingState = () => {
    if (activityState !== "writing") {
      setActivityState("writing");
      logBehavior("writing-state");
    }
  };

  // 檢查並設定心智圖編輯狀態
  // 如果當前狀態不是 "mindmap-editing"，就更新為 "mindmap-editing" 並記錄
  const checkAndSetMindmapEditingState = () => {
    if (activityState !== "mindmap-editing") {
      setActivityState("mindmap-editing");
      logBehavior("mindmap-editing");
    }
  };

  return (
    <FocusContext.Provider
      value={{
        isFocusMode,
        toggleFocus,
        sidebarRef,
        toolPanelRef,
        activityState,
        setActivityState,
        checkAndSetWritingState,
        checkAndSetMindmapEditingState,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const context = useContext(FocusContext);
  if (context === undefined) {
    throw new Error("useFocus must be used within a FocusProvider");
  }
  return context;
}
