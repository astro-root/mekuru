import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
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
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
          }
        },
      },
    }
  )
}
