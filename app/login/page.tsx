"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loginAction, signUpAction } from "./actions";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/ui/status-indicator";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [account, setAccount] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [condition, setCondition] = useState<string>("full");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // 當切換模式時，清空所有欄位
  useEffect(() => {
    setAccount("");
    setPassword("");
    setCondition("full");
    setError("");
  }, [mode]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData();
    formData.append("account", account);
    formData.append("password", password);
    if (mode === "signup") {
      formData.append("condition", condition);
    }

    const result = mode === "login"
      ? await loginAction(formData)
      : await signUpAction(formData);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    // 註冊成功：切換回登入模式並清空欄位
    if (mode === "signup" && (result as { success?: boolean }).success) {
      setIsLoading(false);
      setMode("login");
      // account 和 password 會在 useEffect 中自動清空
      router.refresh();
    }
    // 登入成功的話會在 action 中 redirect，不會回到這裡
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-[400px] flex flex-col items-center justify-center gap-[40px]">
        {/* Logo 和標語 */}
        <Image
          src="/login-logo.svg"
          alt="HanWrite Logo"
          width={362}
          height={362}
          priority
        />

        {/* 登入表單 */}
        <form onSubmit={handleSubmit} className="w-full space-y-[20px]">
          {/* Account 輸入框 */}
          <div className="flex flex-col gap-[5px]">
            <label
              htmlFor="account"
              className="block text-sm font-medium text-(--color-text-secondary)"
            >
              Account
            </label>
            <input
              type="text"
              id="account"
              name="account"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="Type your account"
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 text-sm text-[#333] placeholder:text-[#999] focus:border-[#1BA881] focus:outline-none focus:ring-1 focus:ring-[#1BA881] disabled:bg-gray-100"
            />
          </div>

          {/* Password 輸入框 */}
          <div className="flex flex-col gap-[5px]">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-(--color-text-secondary)"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Type your password"
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 text-sm text-[#333] placeholder:text-[#999] focus:border-[#1BA881] focus:outline-none focus:ring-1 focus:ring-[#1BA881] disabled:bg-gray-100"
            />
          </div>

          {/* Condition 選擇（僅在註冊模式顯示） */}
          {mode === "signup" && (
            <div className="flex flex-col gap-[5px]">
              <label className="block text-sm font-medium text-(--color-text-secondary)">
                Account Type
              </label>
              <div className="flex gap-[20px]">
                <label className="flex items-center gap-[8px] cursor-pointer">
                  <input
                    type="radio"
                    name="condition"
                    value="full"
                    checked={condition === "full"}
                    onChange={(e) => setCondition(e.target.value)}
                    disabled={isLoading}
                    className="w-4 h-4 text-[#1BA881] focus:ring-[#1BA881]"
                  />
                  <span className="text-sm text-(--color-text-secondary)">
                    Full (All Features)
                  </span>
                </label>
                <label className="flex items-center gap-[8px] cursor-pointer">
                  <input
                    type="radio"
                    name="condition"
                    value="non-ai"
                    checked={condition === "non-ai"}
                    onChange={(e) => setCondition(e.target.value)}
                    disabled={isLoading}
                    className="w-4 h-4 text-[#1BA881] focus:ring-[#1BA881]"
                  />
                  <span className="text-sm text-(--color-text-secondary)">
                    Non-AI (No AI Features)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* 錯誤訊息 */}
          <p className="min-h-[20px] text-sm text-[#E53E3E]">{error}</p>

          {/* 按鈕區 */}
          <div className="flex items-center justify-end gap-4">
            {isLoading && <StatusIndicator text="Loading..." />}
            <Button
              variant="cancel"
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              disabled={isLoading}
            >
              {mode === "login" ? "Sign Up" : "Back to Login"}
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-[#1BA881] px-8 py-2.5 text-sm font-medium text-white hover:bg-[#159570] transition-colors disabled:bg-[#9CD9C9] disabled:cursor-not-allowed"
            >
              {mode === "login" ? "Login" : "Sign Up"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
