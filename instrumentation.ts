/**
 * Next.js Instrumentation
 * 在 server 啟動時執行，用於修正 Vercel 上的 SSL 憑證驗證問題
 *
 * UNABLE_TO_VERIFY_LEAF_SIGNATURE 錯誤發生於 Node.js 無法驗證外部 API（如 Bareun）的
 * SSL 憑證鏈。使用 ssl-root-cas 注入 Mozilla 的 root CA 憑證可解決此問題。
 *
 * 使用 ssl-root-cas（非 latest）避免 build 時依賴動態產生的檔案。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // 僅在 Node.js runtime 執行（排除 Edge）
    require("ssl-root-cas").inject();
  }
}
