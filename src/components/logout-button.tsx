'use client'

import { useTransition } from 'react'
import { signOut } from '@/lib/actions/auth'
import { clearOfflineData } from '@/lib/offline/db'
import { Button } from '@/components/ui/button'

// 共有端末でのプライバシー漏洩防止: サーバー側セッション破棄の前に、
// 必ずクライアント側のIndexedDB（カード内容・未同期の復習履歴）を消去する。
export function LogoutButton({ variant = 'ghost', size = 'sm', className }: {
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
  className?: string
}) {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await clearOfflineData()
      await signOut()
    })
  }

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={handleLogout} disabled={isPending}>
      ログアウト
    </Button>
  )
}
