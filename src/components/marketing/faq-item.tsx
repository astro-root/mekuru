'use client'

import { useRef, useState } from 'react'

export function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <div className="w-full rounded-xl border border-border bg-card px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 font-heading text-sm font-bold"
      >
        {question}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* grid-template-rows を 0fr⇄1fr で切り替えることで、高さが可変な中身でも
          滑らかにアニメーションできる(height: autoは直接アニメーションできないため) */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div ref={contentRef} className="overflow-hidden">
          <p className="mt-2 text-sm text-muted-foreground">{answer}</p>
        </div>
      </div>
    </div>
  )
}
