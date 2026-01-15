"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

interface UnsavedContextType {
  showWarning: () => Promise<boolean>;
  setWarningHandler: (handler: () => Promise<boolean>) => void;
}

const UnsavedContext = createContext<UnsavedContextType | undefined>(undefined);

export function UnsavedProvider({ children }: { children: ReactNode }) {
  const [warningHandler, setWarningHandlerState] = useState<
    (() => Promise<boolean>) | null
  >(null);

  const showWarning = useCallback(async (): Promise<boolean> => {
    if (warningHandler) {
      return await warningHandler();
    }
    return true; // 如果沒有 handler，允許導航
  }, [warningHandler]);

  const setWarningHandler = useCallback((handler: () => Promise<boolean>) => {
    setWarningHandlerState(() => handler);
  }, []);

  return (
    <UnsavedContext.Provider value={{ showWarning, setWarningHandler }}>
      {children}
    </UnsavedContext.Provider>
  );
}

export function useUnsaved() {
  const context = useContext(UnsavedContext);
  if (context === undefined) {
    throw new Error("useUnsaved must be used within an UnsavedProvider");
  }
  return context;
}
