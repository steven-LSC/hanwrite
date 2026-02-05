'use server'

import { cookies } from 'next/headers'
import { prisma } from './prisma'

const COOKIE_NAME = 'auth-user'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

/**
 * 驗證使用者帳號密碼
 */
export async function verifyUser(
  account: string,
  password: string
): Promise<{ id: string; username: string; responseLanguage: string; openaiModel: string; condition: string } | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { username: account }
    })

    if (!user) {
      return null
    }

    // 明碼比對（prototype 階段）
    if (user.password !== password) {
      return null
    }

    return {
      id: user.id,
      username: user.username,
      responseLanguage: user.responseLanguage,
      openaiModel: user.openaiModel,
      condition: user.condition || 'full'
    }
  } catch (error) {
    console.error('驗證使用者時發生錯誤:', error)
    return null
  }
}

/**
 * 設定登入 cookie
 */
export async function setAuthCookie(user: {
  username: string
  userId: string
  responseLanguage: string
  openaiModel: string
  condition: string
}): Promise<void> {
  const cookieStore = await cookies()
  const userData = JSON.stringify({
    username: user.username,
    userId: user.userId,
    responseLanguage: user.responseLanguage,
    openaiModel: user.openaiModel,
    condition: user.condition
  })

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
export async function getAuthUser(): Promise<{
  username: string
  userId: string
  responseLanguage: string
  openaiModel: string
  condition: string
} | null> {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(COOKIE_NAME)

  if (!authCookie?.value) {
    return null
  }

  try {
    const parsed = JSON.parse(authCookie.value)
    if (!parsed?.username) {
      return null
    }

    if (parsed.userId && parsed.responseLanguage && parsed.openaiModel) {
      return {
        username: parsed.username,
        userId: parsed.userId,
        responseLanguage: parsed.responseLanguage,
        openaiModel: parsed.openaiModel,
        condition: parsed.condition || 'full'
      }
    }

    // 向後相容：舊 cookie 沒有設定，從資料庫讀取
    const user = await prisma.user.findUnique({
      where: { username: parsed.username }
    })
    if (!user) {
      return null
    }

    return {
      username: parsed.username,
      userId: user.id,
      responseLanguage: user.responseLanguage,
      openaiModel: user.openaiModel,
      condition: user.condition || 'full'
    }
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
export async function createUser(username: string, password: string, condition: string = 'full'): Promise<{ success: boolean; error?: string }> {
  try {
    // 檢查使用者名稱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return { success: false, error: 'Username already exists.' }
    }

    // 驗證 condition 值
    if (condition !== 'full' && condition !== 'non-ai') {
      condition = 'full'
    }

    // 創建新使用者（使用預設值）
    await prisma.user.create({
      data: {
        username,
        password,
        condition
      }
    })

    return { success: true }
  } catch (error) {
    console.error('創建使用者時發生錯誤:', error)
    return { success: false, error: 'Failed to create user.' }
  }
}

/**
 * 更新使用者設定
 */
export async function updateUserSettings(
  userId: string,
  settings: {
    responseLanguage?: string
    openaiModel?: string
    condition?: string
  }
): Promise<{
  responseLanguage: string
  openaiModel: string
  condition: string
} | null> {
  try {
    const updateData: { responseLanguage?: string; openaiModel?: string; condition?: string } = {}
    if (settings.responseLanguage) {
      updateData.responseLanguage = settings.responseLanguage
    }
    if (settings.openaiModel) {
      updateData.openaiModel = settings.openaiModel
    }
    if (settings.condition) {
      // 驗證 condition 值
      if (settings.condition === 'full' || settings.condition === 'non-ai') {
        updateData.condition = settings.condition
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        responseLanguage: true,
        openaiModel: true,
        condition: true
      }
    })

    // 更新 cookie
    const cookieStore = await cookies()
    const authCookie = cookieStore.get(COOKIE_NAME)
    if (authCookie?.value) {
      try {
        const parsed = JSON.parse(authCookie.value)
        if (parsed.userId === userId) {
          const userData = JSON.stringify({
            username: parsed.username,
            userId: parsed.userId,
            responseLanguage: updatedUser.responseLanguage,
            openaiModel: updatedUser.openaiModel,
            condition: updatedUser.condition || 'full'
          })
          cookieStore.set(COOKIE_NAME, userData, {
            httpOnly: false,
            path: '/',
            maxAge: COOKIE_MAX_AGE,
            sameSite: 'lax'
          })
        }
      } catch {
        // 忽略 cookie 解析錯誤
      }
    }

    return {
      responseLanguage: updatedUser.responseLanguage,
      openaiModel: updatedUser.openaiModel,
      condition: updatedUser.condition || 'full'
    }
  } catch (error) {
    console.error('更新使用者設定時發生錯誤:', error)
    return null
  }
}
