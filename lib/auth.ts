'use server'

import { cookies } from 'next/headers'

const COOKIE_NAME = 'auth-user'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

// 假資料
const MOCK_USER = {
  account: 'user1',
  password: '1234',
  username: 'user1'
}

/**
 * 驗證使用者帳號密碼
 */
export async function verifyUser(account: string, password: string): Promise<boolean> {
  return account === MOCK_USER.account && password === MOCK_USER.password
}

/**
 * 設定登入 cookie
 */
export async function setAuthCookie(username: string): Promise<void> {
  const cookieStore = await cookies()
  const userData = JSON.stringify({ username })
  
  cookieStore.set(COOKIE_NAME, userData, {
    httpOnly: false,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax'
  })
}

/**
 * 從 cookie 讀取登入狀態
 */
export async function getAuthUser(): Promise<{ username: string } | null> {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(COOKIE_NAME)
  
  if (!authCookie?.value) {
    return null
  }
  
  try {
    return JSON.parse(authCookie.value)
  } catch {
    return null
  }
}

/**
 * 清除登入 cookie（供未來登出使用）
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
