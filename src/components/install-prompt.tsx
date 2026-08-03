'use client'

import { useEffect, useState } from 'react'
import { Share, Smartphone, X } from 'lucide-react'

const DISMISS_KEY = 'mekuru:installPromptDismissedAt'
const DISMISS_DAYS = 14

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isDismissedRecently(): boolean {
  const raw = window.localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const dismissedAt = Number(raw)
  if (Number.isNaN(dismissedAt)) return false
  const days = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24)
  return days < DISMISS_DAYS
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean }
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
    if (isStandalone) return

    const ua = window.navigator.userAgent
    const isIos = /iphone|ipad|ipod/i.test(ua)
    const isAndroid = /android/i.test(ua)
    if (!isIos && !isAndroid) return
    if (isDismissedRecently()) return

    const id = setTimeout(() => {
      setPlatform(isIos ? 'ios' : 'android')
      setVisible(true)
    }, 0)

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      clearTimeout(id)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  async function handleInstallClick() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  if (!visible || !platform) return null

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 mb-4 flex items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Smartphone className="h-4.5 w-4.5 text-secondary-foreground" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">ホーム画面に追加すると、さらに快適に</p>
        {platform === 'ios' ? (
          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            共有ボタン
            <Share className="inline h-3.5 w-3.5" />
            から「ホーム画面に追加」を選んでください。全画面表示になり、次回から起動が速くなります。
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">
            全画面表示になり、次回から起動が速くなります。
          </p>
        )}
        {platform === 'android' && deferredPrompt && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
          >
            ホーム画面に追加する
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="閉じる"
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
