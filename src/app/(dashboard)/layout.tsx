import { LogoutButton } from '@/components/logout-button'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeaderShell } from '@/components/site-header-shell'
import { InstallPrompt } from '@/components/install-prompt'
import Link from 'next/link'
import { History, Settings, Target, Search, Compass } from 'lucide-react'
import { MobileNav } from '@/components/mobile-nav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderShell
        href="/decks"
        right={
          <>
            <div className="hidden items-center gap-1 sm:flex">
              <Link href="/search">
                <Button variant="ghost" size="sm">
                  <Search className="mr-1 h-4 w-4" />
                  検索
                </Button>
              </Link>
              <Link href="/explore">
                <Button variant="ghost" size="sm">
                  <Compass className="mr-1 h-4 w-4" />
                  みんなのデッキ
                </Button>
              </Link>
              <Link href="/struggling">
                <Button variant="ghost" size="sm">
                  <Target className="mr-1 h-4 w-4" />
                  苦手
                </Button>
              </Link>
              <Link href="/history">
                <Button variant="ghost" size="sm">
                  <History className="mr-1 h-4 w-4" />
                  履歴
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" size="sm">
                  <Settings className="mr-1 h-4 w-4" />
                  設定
                </Button>
              </Link>
              <ThemeToggle />
              <LogoutButton />
            </div>

            <MobileNav />
          </>
        }
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <InstallPrompt />
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
