import Link from 'next/link'

export function SiteFooter({ maxWidth = 'max-w-5xl' }: { maxWidth?: string }) {
  return (
    <footer className="border-t">
      <div
        className={`mx-auto flex ${maxWidth} flex-col items-center gap-2 px-4 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left`}
      >
        <span>© {new Date().getFullYear()} めくる</span>
        <nav className="flex items-center gap-4">
          <Link href="/contact" className="transition-colors hover:text-foreground">
            お問い合わせ
          </Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            利用規約
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            プライバシーポリシー
          </Link>
        </nav>
      </div>
    </footer>
  )
}
