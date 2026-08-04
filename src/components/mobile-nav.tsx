'use client'

import Link from 'next/link'
import { Menu, Search, Target, History, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogoutButton } from '@/components/logout-button'

export function MobileNav() {
  return (
    <div className="flex items-center gap-1 sm:hidden">
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="メニュー">
            <Menu className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href="/search">
              <Search className="mr-1 h-4 w-4" />
              検索
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/struggling">
              <Target className="mr-1 h-4 w-4" />
              苦手
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/history">
              <History className="mr-1 h-4 w-4" />
              履歴
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="mr-1 h-4 w-4" />
              設定
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
            <LogoutButton variant="ghost" className="w-full justify-start" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
