import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HeroFlipDemo } from '@/components/marketing/hero-flip-demo'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  BrainCircuit,
  WifiOff,
  FileUp,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

const FEATURES = [
  {
    icon: BrainCircuit,
    title: 'FSRSによる間隔反復',
    desc: '最新のFSRSアルゴリズムが、忘れかけたタイミングで最適に復習カードを出します。',
  },
  {
    icon: WifiOff,
    title: 'オフライン対応',
    desc: '通信が不安定でも復習を継続。結果は接続が戻り次第、自動で同期されます。',
  },
  {
    icon: FileUp,
    title: 'インポート/エクスポート',
    desc: '既存の単語帳や問題集をそのまま取り込み、他ツールへの書き出しも可能。',
  },
  {
    icon: Layers,
    title: '穴埋め/表裏の両対応',
    desc: '一問一答形式のカードだけでなく、文章中の穴埋め(cloze)形式にも対応。',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <rect x="3" y="4" width="14" height="18" rx="2" className="fill-secondary" />
              <path d="M17 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2" className="stroke-primary" strokeWidth="1.6" />
              <path d="M17 4 L23 8 L17 10 Z" className="fill-accent stroke-accent-foreground" strokeWidth="0.6" />
            </svg>
            <span className="font-heading text-lg font-bold tracking-wide">めくる</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">ログイン</Button>
            </Link>
          </div>
        </div>
      </header>

      <section
        className="border-b"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--primary) 6%, var(--background)), var(--background) 70%)',
        }}
      >
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              競技クイズ・受験対策にも
            </span>
            <h1 className="mt-4 font-heading text-3xl font-bold leading-snug md:text-4xl">
              めくって、覚える。
              <br />
              続けられる暗記プラットフォーム。
            </h1>
            <p className="mt-4 text-muted-foreground">
              間隔反復(FSRS)で「今、思い出すべきカード」だけを出題。
              単語帳をめくる感覚そのままに、記憶の定着を積み上げます。
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto">
                  無料で始める
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  ログイン
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <HeroFlipDemo />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center font-heading text-2xl font-bold">続けるための仕組み</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          暗記アプリではなく、記憶の相棒として設計しています。
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                <f.icon className="h-4.5 w-4.5 text-secondary-foreground" strokeWidth={1.75} />
              </div>
              <h3 className="mt-3 font-heading text-base font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-card">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-14 text-center">
          <h2 className="font-heading text-2xl font-bold">今日から、めくり始めよう。</h2>
          <p className="text-sm text-muted-foreground">登録は数十秒。最初のデッキはすぐに作れます。</p>
          <Link href="/login">
            <Button size="lg">
              無料で始める
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} めくる
        </div>
      </footer>
    </div>
  )
}
