'use server'

import { redirect } from 'next/navigation'
import { verifyUser, setAuthCookie, createUser } from '@/lib/auth'

export async function loginAction(formData: FormData) {
  const account = formData.get('account') as string
  const password = formData.get('password') as string

  // 驗證輸入
  if (!account || !password) {
    return { error: 'Please fill in all fields.' }
  }

  // 驗證帳號密碼
  const user = await verifyUser(account, password)
  
  if (!user) {
    return { error: 'Incorrect username or password.' }
  }

  // 設定登入 cookie（包含設定）
  await setAuthCookie({ 
    username: user.username, 
    userId: user.id,
    responseLanguage: user.responseLanguage,
    openaiModel: user.openaiModel,
    condition: user.condition
  })

  // 跳轉到文章編輯頁
  redirect('/writings/new')
}

export async function signUpAction(formData: FormData) {
  const account = formData.get('account') as string
  const password = formData.get('password') as string
  const condition = (formData.get('condition') as string) || 'full'

  // 驗證輸入
  if (!account || !password) {
    return { error: 'Please fill in all fields.' }
  }

  // 驗證 condition 值
  const validCondition = condition === 'non-ai' ? 'non-ai' : 'full'

  // 創建新使用者
  const result = await createUser(account, password, validCondition)
  
  if (!result.success) {
    return { error: result.error || 'Failed to create account.' }
  }

  // 註冊成功，返回成功狀態讓 client 端處理
  return { success: true }
}
