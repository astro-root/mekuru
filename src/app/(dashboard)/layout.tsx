import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/decks" className="text-lg font-bold">
            めくる
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              ログアウト
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  )
}
