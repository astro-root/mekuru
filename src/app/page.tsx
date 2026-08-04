import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HeroFlipDemo } from '@/components/marketing/hero-flip-demo'
import { Reveal } from '@/components/marketing/reveal'
import { FaqItem } from '@/components/marketing/faq-item'
import { ThemeToggle } from '@/components/theme-toggle'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeaderShell } from '@/components/site-header-shell'
import {
  BrainCircuit,
  WifiOff,
  FileUp,
  Layers,
  Sparkles,
  ArrowRight,
  History,
  RotateCcw,
  ListPlus,
  BookOpen,
  BarChart3,
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
    desc: '既存の単語帳や問題集をそのまま取り込み、他ツールへの書き出しも可能。見出し行が無いファイルもそのまま読み込めます。',
  },
  {
    icon: Layers,
    title: '穴埋め/表裏の両対応',
    desc: '一問一答形式のカードだけでなく、文章中の穴埋め(cloze)形式にも対応。',
  },
  {
    icon: RotateCcw,
    title: '見返しながら復習',
    desc: '答えを確認したあとにもう一度問題に戻ったり、直前のカードを振り返ったりできます。',
  },
  {
    icon: History,
    title: '学習履歴を記録',
    desc: 'いつ・どのカードを・どう評価したか、学習の歩みをあとから振り返れます。',
  },
]

const STEPS = [
  {
    icon: ListPlus,
    title: 'デッキとカードを作る',
    desc: '覚えたい内容をカードとして登録。CSV/Excelから一括インポートもできます。',
  },
  {
    icon: BookOpen,
    title: 'めくって復習する',
    desc: '出題されたカードをタップしてめくり、思い出せたかどうかを2段階で評価します。',
  },
  {
    icon: BarChart3,
    title: 'FSRSが次を最適化',
    desc: '評価結果をもとに、次に復習すべき最適なタイミングを自動で計算してくれます。',
  },
]

const FAQS = [
  {
    q: 'FSRSとは何ですか？',
    a: 'Free Spaced Repetition Scheduler の略で、記憶の忘却曲線を統計的にモデル化した間隔反復アルゴリズムです。カードごとの評価結果から、次に復習すべき最適なタイミングを計算します。',
  },
  {
    q: 'オフラインでも使えますか？',
    a: '一度開いたデッキはブラウザ内に保存され、通信が無い状態でも復習を続けられます。評価結果は接続が回復した際に自動でサーバーへ同期されます。',
  },
  {
    q: 'CSVやExcelのファイルに見出し行が無くても大丈夫ですか？',
    a: 'はい。1行目に front/back のような見出しがあればそれを使い、無ければ1列目を表・2列目を裏・3列目をコメントとしてそのまま読み込みます。',
  },
  {
    q: '料金はかかりますか？',
    a: '無料でご利用いただけます。アカウントを作成すれば、すぐにデッキ作成と復習を始められます。',
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderShell
        right={
          <>
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">ログイン</Button>
            </Link>
          </>
        }
      />

      <section
        className="relative overflow-hidden border-b"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--primary) 6%, var(--background)), var(--background) 70%)',
        }}
      >
        {/* 装飾用の浮遊シェイプ(SVGのみ、絵文字は使用しない) */}
        <svg
          aria-hidden="true"
          className="animate-float pointer-events-none absolute -left-10 top-16 h-24 w-24 opacity-40 md:h-32 md:w-32"
          viewBox="0 0 100 100"
        >
          <rect x="10" y="10" width="70" height="90" rx="10" className="fill-secondary" />
        </svg>
        <svg
          aria-hidden="true"
          className="animate-float pointer-events-none absolute right-4 top-40 h-16 w-16 opacity-40 md:right-16"
          style={{ animationDelay: '1.5s' }}
          viewBox="0 0 100 100"
        >
          <circle cx="50" cy="50" r="40" className="fill-accent" />
        </svg>

        <div className="relative mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 text-center md:text-left">
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
                <Button size="lg" className="w-full transition-transform hover:-translate-y-0.5 sm:w-auto">
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
          <div className="animate-in fade-in zoom-in-95 duration-700 flex justify-center">
            <HeroFlipDemo />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <Reveal className="text-center">
          <h2 className="font-heading text-2xl font-bold">3ステップで始められます</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            アカウント登録から復習まで、迷うところはありません。
          </p>
        </Reveal>

        <div className="relative mt-10 grid gap-6 sm:grid-cols-3">
          <div
            aria-hidden="true"
            className="absolute top-9 left-[16.5%] right-[16.5%] hidden h-px bg-border sm:block"
          />
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 120} className="relative text-center">
              <div className="relative mx-auto flex h-[72px] w-[72px] items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-border bg-card" />
                <step.icon className="relative h-6 w-6 text-primary" strokeWidth={1.75} />
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-heading text-base font-bold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t bg-card">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <Reveal className="text-center">
            <h2 className="font-heading text-2xl font-bold">続けるための仕組み</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              暗記アプリではなく、記憶の相棒として設計しています。
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 100}>
                <div className="h-full rounded-2xl border border-border bg-background p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                    <f.icon className="h-4.5 w-4.5 text-secondary-foreground" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-3 font-heading text-base font-bold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <Reveal className="text-center">
          <h2 className="font-heading text-2xl font-bold">よくある質問</h2>
        </Reveal>
        <div className="mt-8 space-y-2">
          {FAQS.map((item, i) => (
            <Reveal key={item.q} delay={i * 60}>
              <FaqItem question={item.q} answer={item.a} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t bg-card">
        <Reveal>
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-14 text-center">
            <h2 className="font-heading text-2xl font-bold">今日から、めくり始めよう。</h2>
            <p className="text-sm text-muted-foreground">登録は数十秒。最初のデッキはすぐに作れます。</p>
            <Link href="/login">
              <Button size="lg" className="transition-transform hover:-translate-y-0.5">
                無料で始める
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  )
}
