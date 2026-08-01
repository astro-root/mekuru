import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeaderShell } from '@/components/site-header-shell'
import Link from 'next/link'
import { History } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderShell
        href="/decks"
        right={
          <>
            <Link href="/history">
              <Button variant="ghost" size="sm">
                <History className="mr-1 h-4 w-4" />
                履歴
              </Button>
            </Link>
            <ThemeToggle />
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                ログアウト
              </Button>
            </form>
          </>
        }
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <SiteFooter />
    </div>
  )
}
