"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";

export interface ErrorPosition {
  position: { start: number; end: number };
  errorType: "grammar" | "vocab";
}

export interface EditorHighlightRef {
  highlightError: (position: { start: number; end: number }, errorType: "grammar" | "vocab") => void;
  highlightAllErrors: (errors: ErrorPosition[]) => void;
  clearHighlight: () => void;
}

interface EditorContextType {
  selectedErrorIndex: number | null;
  setSelectedErrorIndex: (index: number | null) => void;
  editorHighlightRef: React.RefObject<EditorHighlightRef | null>;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [selectedErrorIndex, setSelectedErrorIndex] = useState<number | null>(
    null
  );
  const editorHighlightRef = useRef<EditorHighlightRef | null>(null);

  return (
    <EditorContext.Provider
      value={{ selectedErrorIndex, setSelectedErrorIndex, editorHighlightRef }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}
