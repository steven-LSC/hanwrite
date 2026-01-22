"use client";

import React, { useState } from "react";

interface UserMenuProps {
  currentLanguage: string;
  currentModel: string;
  onLanguageChange: (language: string) => void;
  onModelChange: (model: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGE_OPTIONS = [
  { value: "繁體中文", label: "繁體中文", flag: "🇹🇼" },
  { value: "簡體中文", label: "簡體中文", flag: "🇨🇳" },
  { value: "English", label: "English", flag: "🇺🇸" },
];

const MODEL_OPTIONS = [
  { value: "gpt-4.1-nano", label: "gpt-4.1-nano" },
  { value: "gpt-4o-mini", label: "gpt-4o-mini" },
  { value: "gpt-4.1-mini", label: "gpt-4.1-mini" },
  { value: "gpt-4.1", label: "gpt-4.1" },
  { value: "gpt-4o", label: "gpt-4o" },
];

export function UserMenu({
  currentLanguage,
  currentModel,
  onLanguageChange,
  onModelChange,
  onLogout,
  isOpen,
  onClose,
}: UserMenuProps) {
  const [languageSubmenuOpen, setLanguageSubmenuOpen] = useState(false);
  const [modelSubmenuOpen, setModelSubmenuOpen] = useState(false);

  const handleLanguageSelect = (language: string) => {
    onLanguageChange(language);
  };

  const handleModelSelect = (model: string) => {
    onModelChange(model);
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
                setModelSubmenuOpen(false);
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

          {/* Model Selection */}
          <div className="relative">
            <button
              onClick={() => {
                setModelSubmenuOpen(!modelSubmenuOpen);
                setLanguageSubmenuOpen(false);
              }}
              className="w-full px-[15px] py-[10px] text-left text-[14px] font-medium text-(--color-text-secondary) hover:bg-slate-100 transition-colors duration-200 flex items-center justify-between border-t border-(--color-border)"
            >
              <span>Model</span>
              <span className="material-symbols-rounded text-[16px]">
                {modelSubmenuOpen ? "expand_less" : "expand_more"}
              </span>
            </button>
            {modelSubmenuOpen && (
              <div className="bg-slate-50 border-t border-(--color-border)">
                {MODEL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleModelSelect(option.value)}
                    className={`w-full px-[15px] py-[8px] text-left text-[14px] text-(--color-text-secondary) hover:bg-slate-100 transition-colors duration-200 ${currentModel === option.value
                      ? "bg-slate-100 font-medium"
                      : ""
                      }`}
                  >
                    <span className="flex items-center justify-between">
                      {option.label}
                      {currentModel === option.value && (
                        <span className="material-symbols-rounded text-[16px]">
                          check
                        </span>
                      )}
                    </span>
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
