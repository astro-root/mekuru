import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { ArrowLeft } from 'lucide-react'

export function LegalPageLayout({
  title,
  updatedAt,
  children,
}: {
  title: string
  updatedAt: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 group">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <rect x="3" y="4" width="14" height="18" rx="2" className="fill-secondary" />
              <path d="M17 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2" className="stroke-primary" strokeWidth="1.6" />
              <path d="M17 4 L23 8 L17 10 Z" className="fill-accent stroke-accent-foreground" strokeWidth="0.6" />
            </svg>
            <span className="font-heading text-lg font-bold tracking-wide">めくる</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            トップに戻る
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h1 className="font-heading text-2xl font-bold">{title}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">最終更新日: {updatedAt}</p>

          <div className="prose-legal mt-8 space-y-8 text-sm leading-relaxed text-foreground">
            {children}
          </div>
        </div>
      </main>

      <SiteFooter maxWidth="max-w-3xl" />
    </div>
  )
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-heading text-base font-bold">{heading}</h2>
      <div className="space-y-2 text-muted-foreground [&_li]:ml-4 [&_li]:list-disc [&_ol]:space-y-1 [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  )
}
