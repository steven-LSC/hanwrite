"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserCondition } from "@/lib/types";

interface UserContextType {
  condition: UserCondition;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [condition, setCondition] = useState<UserCondition>("full");

  useEffect(() => {
    // 從 cookie 讀取使用者 condition
    const cookies = document.cookie.split("; ");
    const authCookie = cookies.find((c) => c.startsWith("auth-user="));
    if (authCookie) {
      try {
        const userData = JSON.parse(
          decodeURIComponent(authCookie.split("=")[1])
        );
        // 驗證 condition 值
        if (userData.condition === "non-ai" || userData.condition === "full") {
          setCondition(userData.condition);
        } else {
          setCondition("full");
        }
      } catch {
        setCondition("full");
      }
    }
  }, []);

  return (
    <UserContext.Provider value={{ condition }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
