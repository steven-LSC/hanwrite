"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
} from "react";
import { ToolPanelRef } from "@/components/tool-panel/tool-panel";

export interface SidebarRef {
  refreshRecentWritings: () => Promise<void>;
  updateRecentWritingTitle: (writingId: string, newTitle: string) => void;
}

interface FocusContextType {
  isFocusMode: boolean;
  toggleFocus: () => void;
  sidebarRef: React.RefObject<SidebarRef | null>;
  toolPanelRef: React.RefObject<ToolPanelRef | null>;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export function FocusProvider({ children }: { children: ReactNode }) {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const sidebarRef = useRef<SidebarRef | null>(null);
  const toolPanelRef = useRef<ToolPanelRef | null>(null);

  const toggleFocus = () => {
    setIsFocusMode((prev) => !prev);
  };

  return (
    <FocusContext.Provider
      value={{ isFocusMode, toggleFocus, sidebarRef, toolPanelRef }}
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
