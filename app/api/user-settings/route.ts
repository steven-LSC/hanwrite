import { NextRequest, NextResponse } from 'next/server'
import { updateUserSettings } from '@/lib/auth'

export async function PUT(request: NextRequest) {
  try {
    const authCookie = request.cookies.get('auth-user')
    
    if (!authCookie?.value) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userData = JSON.parse(authCookie.value)
    const userId = userData.userId

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { responseLanguage } = body

    const settings: { responseLanguage?: string } = {}
    if (responseLanguage) {
      settings.responseLanguage = responseLanguage
    }

    const updatedSettings = await updateUserSettings(userId, settings)

    if (!updatedSettings) {
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error('更新設定時發生錯誤:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
