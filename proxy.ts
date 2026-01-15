import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const authCookie = request.cookies.get('auth-user')
  const pathname = request.nextUrl.pathname

  // 保護 /writings 路由
  if (pathname.startsWith('/writings')) {
    if (!authCookie?.value) {
      // 未登入，跳轉到登入頁
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // 如果已登入且訪問登入頁，跳轉到 writings/new
  if (pathname === '/login' && authCookie?.value) {
    return NextResponse.redirect(new URL('/writings/new', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/writings/:path*', '/login']
}
