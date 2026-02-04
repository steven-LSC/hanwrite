"use client";

import React, { useState, useEffect } from "react";
import { LANGUAGE_OPTIONS } from "@/lib/ai-config";
import { logBehavior } from "@/lib/log-behavior";
import { useFocus } from "@/app/(main)/focus-context";

interface UserMenuProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function UserMenu({
  currentLanguage,
  onLanguageChange,
  onLogout,
  isOpen,
  onClose,
}: UserMenuProps) {
  const { setActivityState } = useFocus();
  const [languageSubmenuOpen, setLanguageSubmenuOpen] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // 在組件掛載時讀取 session 狀態
  useEffect(() => {
    const savedSession = localStorage.getItem("hanwrite-session-active");
    if (savedSession === "true") {
      setIsSessionActive(true);
    }
  }, []);

  const handleLanguageSelect = (language: string) => {
    onLanguageChange(language);
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  const handleSessionToggle = async () => {
    const newSessionState = !isSessionActive;
    setIsSessionActive(newSessionState);

    // 儲存狀態到 localStorage 供 logBehavior 使用
    localStorage.setItem("hanwrite-session-active", newSessionState ? "true" : "false");

    // 觸發自訂事件通知其他組件 session 狀態已改變
    window.dispatchEvent(new Event("session-status-change"));

    // 如果是開啟 Session，重置活動狀態為 null
    if (newSessionState) {
      setActivityState(null);
    }

    await logBehavior(newSessionState ? "session-start" : "session-end");
  };

  return (
    <>
      {isOpen && (
        <div className="absolute bottom-full mb-[8px] bg-white border border-(--color-border) rounded-[10px] shadow-lg w-[150px] z-50">
          {/* Language Selection */}
          <div className="relative">
            <button
              onClick={() => {
                setLanguageSubmenuOpen(!languageSubmenuOpen);
              }}
              className="w-full px-[15px] py-[10px] text-left text-[14px] font-medium text-(--color-text-secondary) hover:bg-slate-100 transition-colors duration-200 flex items-center justify-between"
            >
              <span>Language</span>
              <span className="material-symbols-rounded text-[16px]">
                {languageSubmenuOpen ? "expand_less" : "expand_more"}
              </span>
            </button>
            {languageSubmenuOpen && (
              <div className="bg-slate-50 border-t border-(--color-border)">
                {LANGUAGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleLanguageSelect(option.value)}
                    className={`w-full px-[15px] py-[8px] text-left text-[14px] text-(--color-text-secondary) hover:bg-slate-100 transition-colors duration-200 flex items-center gap-[8px] ${currentLanguage === option.value
                      ? "bg-slate-100 font-medium"
                      : ""
                      }`}
                  >
                    <span>{option.flag}</span>
                    <span>{option.label}</span>
                    {currentLanguage === option.value && (
                      <span className="material-symbols-rounded text-[16px] ml-auto">
                        check
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Session Start/End Switch */}
          <div className="border-t border-(--color-border)">
            <div className="flex items-center justify-between px-[15px] py-[10px]">
              <span className="text-[14px] font-medium text-(--color-text-secondary)">
                Session
              </span>
              <button
                onClick={handleSessionToggle}
                className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors duration-200 ${isSessionActive ? "bg-blue-500" : "bg-gray-300"
                  }`}
                role="switch"
                aria-checked={isSessionActive}
              >
                <span
                  className={`inline-block h-[16px] w-[16px] transform rounded-full bg-white transition-transform duration-200 ${isSessionActive ? "translate-x-[18px]" : "translate-x-[2px]"
                    }`}
                />
              </button>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full px-[15px] py-[10px] text-left text-[14px] font-medium text-(--color-text-secondary) hover:bg-slate-100 transition-colors duration-200 border-t border-(--color-border) rounded-b-[10px]"
          >
            Log out
          </button>
        </div>
      )}
    </>
  );
}
