'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const id = setTimeout(() => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // 登録に失敗してもアプリ自体は通常通り動作するので握りつぶす
      })
    }, 0)
    return () => clearTimeout(id)
  }, [])

  return null
}
