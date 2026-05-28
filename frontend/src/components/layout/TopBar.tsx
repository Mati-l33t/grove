import { Menu } from 'lucide-react'
import { useDrawerStore } from '@/stores/drawerStore'
import ThemeToggle from './ThemeToggle'

interface TopBarProps {
  title: string
  actions?: React.ReactNode
}

export default function TopBar({ title, actions }: TopBarProps) {
  const setOpen = useDrawerStore((s) => s.setOpen)

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold text-sm tracking-wide">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        {actions}
        <ThemeToggle />
      </div>
    </header>
  )
}
