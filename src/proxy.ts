import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_ROOT_ACCOUNT_URL!,
    process.env.NEXT_PUBLIC_ROOT_ACCOUNT_ANON_KEY!,
    {
      db: { schema: 'mekuru' },
      cookieOptions: {
        domain: process.env.NEXT_PUBLIC_ROOT_ACCOUNT_COOKIE_DOMAIN,
        path: '/',
        sameSite: 'lax',
        secure: true,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/forgot-password')
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/decks')
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  // パスワード再設定リンクからの遷移時はSupabaseのrecoveryセッションにより
  // user が入るため、isAuthRoute のログイン中リダイレクト対象からは除外する。
  const isResetPasswordRoute = request.nextUrl.pathname.startsWith('/reset-password')

  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // /admin配下は、ログイン済みかつADMIN_EMAILと一致するユーザーのみ通す。
  // 未ログインならログイン画面へ、ログイン済みだが管理者でなければ通常のダッシュボードへ逃がす
  // (存在自体を教えないよう404ではなくリダイレクトにする)。
  if (isAdminRoute) {
    const adminEmail = process.env.ADMIN_EMAIL
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    if (!adminEmail || user.email !== adminEmail) {
      const url = request.nextUrl.clone()
      url.pathname = '/decks'
      return NextResponse.redirect(url)
    }
  }

  if (user && isAuthRoute && !isResetPasswordRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/decks'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
