"use client";

import React, { useState } from "react";
import { LANGUAGE_OPTIONS } from "@/lib/ai-config";

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
  const [languageSubmenuOpen, setLanguageSubmenuOpen] = useState(false);

  const handleLanguageSelect = (language: string) => {
    onLanguageChange(language);
  };

  const handleLogout = () => {
    onLogout();
    onClose();
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
