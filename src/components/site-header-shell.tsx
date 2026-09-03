import Link from 'next/link'
import Image from 'next/image'

export function SiteHeaderShell({
  href = '/',
  right,
}: {
  href?: string
  right: React.ReactNode
}) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href={href} className="flex items-center gap-2 group">
          <Image
            src="/icons/header-icon.png"
            alt=""
            width={28}
            height={28}
            priority
            className="shrink-0 rounded-md transition-transform duration-300 group-hover:-rotate-6"
          />
          <span className="font-heading text-lg font-bold tracking-wide">めくる</span>
        </Link>
        <div className="flex items-center gap-1">{right}</div>
      </div>
    </header>
  )
}
