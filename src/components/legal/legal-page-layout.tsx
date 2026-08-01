import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeaderShell } from '@/components/site-header-shell'
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
      <SiteHeaderShell
        right={
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            トップに戻る
          </Link>
        }
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h1 className="font-heading text-2xl font-bold">{title}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">最終更新日: {updatedAt}</p>

          <div className="prose-legal mt-8 space-y-8 text-sm leading-relaxed text-foreground">
            {children}
          </div>
        </div>
      </main>

      <SiteFooter />
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
