"use client";

import React, {
  useEffect,
  useState,
  useImperativeHandle,
  startTransition,
} from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { FocusProvider, useFocus, SidebarRef } from "./focus-context";
import { UnsavedProvider, useUnsaved } from "./unsaved-context";
import { EditorProvider } from "./editor-context";
import { RecentWriting } from "@/lib/types";
import { getRecentWritings } from "@/lib/data/writings";
import { clearAuthCookie } from "@/lib/auth";
import { Button } from "@/components/ui/button";

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isFocusMode, sidebarRef } = useFocus();
  const { showWarning } = useUnsaved();
  const [recentWritings, setRecentWritings] = useState<RecentWriting[]>([]);
  const [userName, setUserName] = useState<string>("");

  // 從 pathname 提取當前選中的 writingId
  const currentWritingId = pathname?.startsWith("/writings/")
    ? pathname.split("/")[2] === "new"
      ? undefined
      : pathname.split("/")[2]
    : undefined;

  const refreshRecentWritings = async () => {
    const writings = await getRecentWritings();
    setRecentWritings(writings);
  };

  useImperativeHandle(sidebarRef, () => ({
    refreshRecentWritings,
  }));

  useEffect(() => {
    refreshRecentWritings();
  }, []);

  useEffect(() => {
    // 從 cookie 讀取使用者名稱
    const cookies = document.cookie.split("; ");
    const authCookie = cookies.find((c) => c.startsWith("auth-user="));
    if (authCookie) {
      try {
        const userData = JSON.parse(
          decodeURIComponent(authCookie.split("=")[1])
        );
        setUserName(userData.username || "User");
      } catch {
        setUserName("User");
      }
    }
  }, []);

  const handleLogout = async () => {
    await clearAuthCookie();
    router.push("/login");
  };

  const handleWritingClick = async (writingId: string) => {
    // 如果點擊的是當前文章，不需要處理
    if (currentWritingId === writingId) {
      return;
    }

    // 檢查是否需要顯示警告
    const shouldNavigate = await showWarning();
    if (shouldNavigate) {
      // 使用 startTransition 標記路由導航為非緊急更新，避免阻塞 UI
      startTransition(() => {
        router.push(`/writings/${writingId}`);
      });
    }
  };

  return (
    <div
      className={`flex h-screen bg-(--color-bg-primary) overflow-x-auto transition-all duration-300 ${isFocusMode ? "min-w-[750px]" : "min-w-[1200px]"
        }`}
    >
      {/* 左側導航 - 一般模式 192px，Focus 模式 40px */}
      <div className="shrink-0">
        <div
          className={`h-full bg-white border border-(--color-border) flex flex-col transition-all duration-300 ${isFocusMode
              ? "w-[40px] py-[40px] px-0 gap-[40px]"
              : "w-[192px] p-[20px] gap-[40px]"
            }`}
        >
          {/* Logo 區域（固定） */}
          <div className="flex flex-col items-center gap-[5px] shrink-0">
            {isFocusMode ? (
              <div className="relative w-[25px] h-[25px]">
                <Image
                  src="/logo-small.svg"
                  alt="HanWrite Logo"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="relative w-full aspect-667/172">
                <Image
                  src="/logo.svg"
                  alt="HanWrite Logo"
                  fill
                  className="object-contain"
                />
              </div>
            )}
          </div>

          {/* 主要導航區域（固定） */}
          <div
            className={`flex flex-col shrink-0 ${isFocusMode ? "gap-[20px]" : "gap-[5px]"
              }`}
          >
            <button
              onClick={async () => {
                if (pathname !== "/writings/new") {
                  const shouldNavigate = await showWarning();
                  if (shouldNavigate) {
                    router.push("/writings/new");
                  }
                }
              }}
              className={`flex items-center rounded-[10px] text-(--color-text-secondary) hover:bg-slate-100 transition-colors duration-200 cursor-pointer ${isFocusMode
                  ? "justify-center p-[5px]"
                  : "gap-[5px] px-[10px] py-[5px]"
                }`}
            >
              <span className="material-symbols-rounded text-[20px]">
                edit_square
              </span>
              {!isFocusMode && (
                <span className="font-medium text-[14px]">New Writing</span>
              )}
            </button>
            <button
              onClick={async () => {
                if (!pathname?.startsWith("/brainstorm")) {
                  const shouldNavigate = await showWarning();
                  if (shouldNavigate) {
                    // 立即導向到 loading 頁面，讓 page.tsx 處理載入邏輯
                    router.push("/brainstorm/loading");
                  }
                }
              }}
              className={`flex items-center rounded-[10px] text-(--color-text-secondary) hover:bg-slate-100 transition-colors duration-200 cursor-pointer ${isFocusMode
                  ? "justify-center p-[5px]"
                  : "gap-[5px] px-[10px] py-[5px]"
                }`}
            >
              <span className="material-symbols-rounded text-[20px]">
                experiment
              </span>
              {!isFocusMode && (
                <span className="font-medium text-[14px]">Brainstorm Lab</span>
              )}
            </button>
          </div>

          {/* Recents 列表區域（可滾動，Focus 模式下隱藏） */}
          {!isFocusMode && (
            <div className="flex flex-col gap-[10px] flex-1 min-h-0">
              <p className="font-normal text-[14px] text-(--color-text-tertiary) shrink-0">
                Recents
              </p>
              <div className="flex flex-col gap-[5px] overflow-y-auto flex-1">
                {recentWritings.map((writing) => (
                  <div
                    key={writing.id}
                    onClick={() => handleWritingClick(writing.id)}
                    className={`px-[10px] py-[5px] rounded-[10px] hover:bg-slate-100 transition-colors duration-200 cursor-pointer shrink-0 ${currentWritingId === writing.id ? "bg-slate-100" : ""
                      }`}
                  >
                    <p className="font-medium text-[14px] text-(--color-text-secondary) overflow-hidden text-ellipsis whitespace-nowrap">
                      {writing.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 使用者區域（固定，Focus 模式下隱藏） */}
          {!isFocusMode && (
            <div className="flex items-center justify-between shrink-0 pt-[10px] border-t border-(--color-border)">
              <p className="font-medium text-[14px] text-(--color-text-secondary) overflow-hidden text-ellipsis whitespace-nowrap">
                {userName}
              </p>
              <Button variant="cancel" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 左側間隔 - 最小 20px，自動分配剩餘空間 */}
      <div className="flex-1 min-w-[20px]" />

      {/* 中間內容區域 - 由 children 提供，writings layout 會在這裡添加右側工具面板 */}
      <div className="shrink-0 flex items-center">{children}</div>

      {/* 右側間隔 - 最小 20px，自動分配剩餘空間（僅在非 writings 路由時使用） */}
      <div className="flex-1 min-w-[20px]" />
    </div>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FocusProvider>
      <UnsavedProvider>
        <EditorProvider>
          <MainLayoutContent>{children}</MainLayoutContent>
        </EditorProvider>
      </UnsavedProvider>
    </FocusProvider>
  );
}
