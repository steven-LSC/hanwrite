"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseWritingProgressOptions {
  writingId: string | undefined;
  activityState: "writing" | "mindmap-editing" | "tool-using" | null;
  characterCount: number;
}

/**
 * Writing Progress Hook
 * 追蹤寫作進度，在特定時間點記錄字數快照
 */
export function useWritingProgress({
  writingId,
  activityState,
  characterCount,
}: UseWritingProgressOptions) {
  const threeSecondTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thirtySecondTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCharacterCountRef = useRef<number>(characterCount);
  const lastRecordTimeRef = useRef<number>(Date.now());
  const isRecordingRef = useRef<boolean>(false);
  const currentWritingIdRef = useRef<string | undefined>(writingId);
  const currentActivityStateRef = useRef<"writing" | "mindmap-editing" | "tool-using" | null>(activityState);

  // 檢查 session 是否啟動
  const isSessionActive = useCallback(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("hanwrite-session-active") === "true";
  }, []);

  // 記錄寫作進度
  const recordProgress = useCallback(async (type: "start" | "idle" | "interval") => {
    // 檢查 session 狀態
    if (!isSessionActive()) {
      return;
    }

    // 檢查 writingId
    if (!writingId || writingId === "new") {
      return;
    }

    // 從 cookie 讀取 userId
    const cookies = document.cookie.split("; ");
    const authCookie = cookies.find((c) => c.startsWith("auth-user="));

    if (!authCookie) {
      console.warn("[Writing Progress] 無法找到 auth-user cookie");
      return;
    }

    try {
      const userData = JSON.parse(
        decodeURIComponent(authCookie.split("=")[1])
      );

      if (!userData.userId) {
        console.warn("[Writing Progress] 無法從 cookie 取得 userId");
        return;
      }

      // 呼叫 API 記錄寫作進度（不等待回應，避免阻塞 UI）
      fetch("/api/writing-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writingId,
          characterCount,
          type,
        }),
      }).catch((error) => {
        console.error(`[Writing Progress] 記錄寫作進度失敗:`, error);
      });

      lastRecordTimeRef.current = Date.now();
    } catch (parseError) {
      console.warn("[Writing Progress] 解析 cookie 失敗:", parseError);
    }
  }, [writingId, characterCount, isSessionActive]);

  // 清除所有計時器
  const clearTimers = useCallback(() => {
    if (threeSecondTimerRef.current) {
      clearTimeout(threeSecondTimerRef.current);
      threeSecondTimerRef.current = null;
    }
    if (thirtySecondTimerRef.current) {
      clearInterval(thirtySecondTimerRef.current);
      thirtySecondTimerRef.current = null;
    }
  }, []);

  // 重置 3 秒計時器
  const resetThreeSecondTimer = useCallback(() => {
    // 清除現有的 3 秒計時器
    if (threeSecondTimerRef.current) {
      clearTimeout(threeSecondTimerRef.current);
    }

    // 只有在 writing state 且 session 啟動時才設定計時器
    if (activityState === "writing" && isSessionActive() && writingId && writingId !== "new") {
      threeSecondTimerRef.current = setTimeout(() => {
        // 3 秒沒動靜，記錄一次（type: "idle"）
        recordProgress("idle");
        threeSecondTimerRef.current = null;
      }, 3000);
    }
  }, [activityState, isSessionActive, writingId, recordProgress]);

  // 當 activityState 變為 "writing" 時啟動計時器
  useEffect(() => {
    // 更新 ref
    currentActivityStateRef.current = activityState;

    // 如果 writingId 改變，重置記錄狀態
    if (currentWritingIdRef.current !== writingId) {
      isRecordingRef.current = false;
      currentWritingIdRef.current = writingId;
    }

    if (activityState === "writing") {
      // 檢查 session 狀態
      if (!isSessionActive()) {
        return;
      }

      // 檢查 writingId
      if (!writingId || writingId === "new") {
        return;
      }

      // 開始 writing-state 時立即記錄一次（type: "start"）
      if (!isRecordingRef.current) {
        isRecordingRef.current = true;
        recordProgress("start");
      }

      // 啟動 3 秒計時器
      resetThreeSecondTimer();

      // 啟動 30 秒強制記錄計時器（如果還沒啟動）
      if (!thirtySecondTimerRef.current) {
        thirtySecondTimerRef.current = setInterval(() => {
          // 每 30 秒強制記錄一次
          // 檢查當前的狀態（使用 ref 來避免閉包問題）
          const currentWritingId = currentWritingIdRef.current;
          const currentActivityState = currentActivityStateRef.current;
          if (
            currentActivityState === "writing" &&
            isSessionActive() &&
            currentWritingId &&
            currentWritingId !== "new"
          ) {
            // 每 30 秒強制記錄一次（type: "interval"）
            recordProgress("interval");
          }
        }, 30000);
      }
    } else {
      // 離開 writing state 時清理計時器
      clearTimers();
      isRecordingRef.current = false;
    }

    return () => {
      clearTimers();
    };
  }, [activityState, writingId, isSessionActive, recordProgress, resetThreeSecondTimer, clearTimers]);

  // 監聽字數變化，重置 3 秒計時器
  useEffect(() => {
    if (activityState === "writing" && characterCount !== lastCharacterCountRef.current) {
      lastCharacterCountRef.current = characterCount;
      resetThreeSecondTimer();
    }
  }, [characterCount, activityState, resetThreeSecondTimer]);

  // 監聽 session 狀態變化
  useEffect(() => {
    const handleStorageChange = () => {
      // 如果 session 結束，清理計時器
      if (!isSessionActive()) {
        clearTimers();
        isRecordingRef.current = false;
      }
    };

    // 監聽 localStorage 變化
    window.addEventListener("storage", handleStorageChange);

    // 也檢查當前的 session 狀態
    if (!isSessionActive()) {
      clearTimers();
      isRecordingRef.current = false;
    }

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [isSessionActive, clearTimers]);

  // 組件卸載時清理計時器
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);
}
