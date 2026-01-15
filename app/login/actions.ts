'use server'

import { redirect } from 'next/navigation'
import { verifyUser, setAuthCookie } from '@/lib/auth'

export async function loginAction(formData: FormData) {
  const account = formData.get('account') as string
  const password = formData.get('password') as string

  // 驗證輸入
  if (!account || !password) {
    return { error: 'Please fill in all fields.' }
  }

  // 驗證帳號密碼
  const isValid = await verifyUser(account, password)
  
  if (!isValid) {
    return { error: 'Incorrect username or password.' }
  }

  // 設定登入 cookie
  await setAuthCookie(account)

  // 跳轉到文章編輯頁
  redirect('/writings/new')
}
