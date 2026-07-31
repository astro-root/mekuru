import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { SiteFooter } from '@/components/site-footer'
import Link from 'next/link'
import { History } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/decks" className="flex items-center gap-2 group">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              className="shrink-0 transition-transform duration-300 group-hover:-rotate-6"
            >
              <rect x="3" y="4" width="14" height="18" rx="2" className="fill-secondary" />
              <path d="M17 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2" className="stroke-primary" strokeWidth="1.6" />
              <path d="M17 4 L23 8 L17 10 Z" className="fill-accent stroke-accent-foreground" strokeWidth="0.6" />
            </svg>
            <span className="font-heading text-lg font-bold tracking-wide">めくる</span>
          </Link>
          <div className="flex items-center gap-1">
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
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <SiteFooter />
    </div>
  )
}
