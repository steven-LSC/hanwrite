'use server'

import { cookies } from 'next/headers'
import { prisma } from './prisma'

const COOKIE_NAME = 'auth-user'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

/**
 * 驗證使用者帳號密碼
 */
export async function verifyUser(account: string, password: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { username: account }
    })

    if (!user) {
      return false
    }

    // 明碼比對（prototype 階段）
    return user.password === password
  } catch (error) {
    console.error('驗證使用者時發生錯誤:', error)
    return false
  }
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

/**
 * 創建新使用者
 * @returns 成功返回 true，使用者名稱已存在返回 false
 */
export async function createUser(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 檢查使用者名稱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return { success: false, error: 'Username already exists.' }
    }

    // 創建新使用者
    await prisma.user.create({
      data: {
        username,
        password
      }
    })

    return { success: true }
  } catch (error) {
    console.error('創建使用者時發生錯誤:', error)
    return { success: false, error: 'Failed to create user.' }
  }
}
