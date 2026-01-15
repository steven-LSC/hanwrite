"use client";

import { useState } from "react";
import Image from "next/image";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    }
    // 成功的話會在 action 中 redirect，不會回到這裡
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5]">
      <div className="w-full max-w-md px-6">
        {/* Logo 和標語 */}
        <div className="flex flex-col items-center justify-center mb-12">
          <Image
            src="/login-logo.svg"
            alt="HanWrite Logo"
            width={362}
            height={362}
            priority
          />
        </div>

        {/* 登入表單 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account 輸入框 */}
          <div>
            <label
              htmlFor="account"
              className="mb-2 block text-sm font-medium text-[#333]"
            >
              Account
            </label>
            <input
              type="text"
              id="account"
              name="account"
              placeholder="Type your account"
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 text-sm text-[#333] placeholder:text-[#999] focus:border-[#1BA881] focus:outline-none focus:ring-1 focus:ring-[#1BA881] disabled:bg-gray-100"
            />
          </div>

          {/* Password 輸入框 */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-[#333]"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Type your password"
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 text-sm text-[#333] placeholder:text-[#999] focus:border-[#1BA881] focus:outline-none focus:ring-1 focus:ring-[#1BA881] disabled:bg-gray-100"
            />
          </div>

          {/* 錯誤訊息 */}
          <p className="min-h-[20px] text-sm text-[#E53E3E]">{error}</p>

          {/* 按鈕區 */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-[#1BA881] px-8 py-2.5 text-sm font-medium text-white hover:bg-[#159570] transition-colors disabled:bg-[#9CD9C9] disabled:cursor-not-allowed"
            >
              {isLoading ? "Loading..." : "Login"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
