'use client'

import { useState } from 'react'

const DEMO_CARDS = [
  { q: '徳川幕府 第15代将軍は？', a: '徳川慶喜' },
  { q: 'FSRSとは何の略？', a: 'Free Spaced Repetition Scheduler' },
  { q: '「aquire」の正しいスペルは？', a: 'acquire' },
]

export function HeroFlipDemo() {
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const card = DEMO_CARDS[i % DEMO_CARDS.length]

  function handleClick() {
    if (!flipped) {
      setFlipped(true)
    } else {
      setFlipped(false)
      setI((v) => v + 1)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div
        className="relative w-full cursor-pointer select-none"
        style={{ perspective: '1600px' }}
        onClick={handleClick}
      >
        <div
          className="relative min-h-[220px] w-full transition-transform duration-500 ease-[cubic-bezier(0.4,0.2,0.2,1)]"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          <div
            className="absolute inset-0 flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-md"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="font-mono text-xs tracking-wide text-muted-foreground">Q</span>
            <p className="font-heading text-lg font-medium leading-relaxed">{card.q}</p>
            <span className="mt-2 text-xs text-muted-foreground">タップしてめくる</span>
          </div>
          <div
            className="absolute inset-0 flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-primary/30 bg-card p-6 text-center shadow-md"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <span className="font-mono text-xs tracking-wide text-primary">A</span>
            <p className="font-heading text-lg font-medium leading-relaxed">{card.a}</p>
            <span className="mt-2 text-xs text-muted-foreground">もう一度タップで次のカード</span>
          </div>
        </div>
      </div>
    </div>
  )
}
