"use client";

/**
 * 記錄使用者行為
 * @param actionName 行為名稱
 * @param resultData 可選的結果資料（JSON 格式）
 */
export async function logBehavior(actionName: string, resultData?: any): Promise<void> {
  try {
    // 從 cookie 讀取 userId
    const cookies = document.cookie.split("; ");
    const authCookie = cookies.find((c) => c.startsWith("auth-user="));
    
    if (!authCookie) {
      console.warn("[Log Behavior] 無法找到 auth-user cookie");
      return;
    }

    try {
      const userData = JSON.parse(
        decodeURIComponent(authCookie.split("=")[1])
      );
      
      if (!userData.userId) {
        console.warn("[Log Behavior] 無法從 cookie 取得 userId");
        return;
      }

      // 呼叫 API 記錄行為（不等待回應，避免阻塞 UI）
      fetch("/api/log-behavior", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: userData.userId, 
          actionName,
          resultData: resultData !== undefined ? resultData : undefined,
        }),
      }).catch((error) => {
        console.error(`[Log Behavior] 記錄行為失敗:`, error);
      });
    } catch (parseError) {
      console.warn("[Log Behavior] 解析 cookie 失敗:", parseError);
    }
  } catch (error) {
    console.error(`[Log Behavior] 記錄行為時發生錯誤:`, error);
  }
}
