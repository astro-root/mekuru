import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
  // sw.js の PROTECTED_PREFIXES と一致させること(キャッシュ除外パスと未ログイン保護パスの整合性維持)
  const PROTECTED_PREFIXES = ['/decks', '/history', '/search', '/settings', '/struggling', '/review']
  const isDashboardRoute = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  )
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
