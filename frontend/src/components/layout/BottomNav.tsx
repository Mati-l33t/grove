import { NavLink } from 'react-router-dom'
import { Home, Calendar, List, BookOpen, Utensils, Settings, Bot } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ParseKeys } from 'i18next'
import { cn } from '@/lib/utils'
import { useAiModels } from '@/hooks/useChat'

type NavEntry = { to: string; icon: React.ElementType; label: ParseKeys }

const baseItems: NavEntry[] = [
  { to: '/',          icon: Home,      label: 'nav.today' },
  { to: '/calendar',  icon: Calendar,  label: 'nav.calendar' },
  { to: '/lists',     icon: List,      label: 'nav.lists' },
  { to: '/recipes',   icon: BookOpen,  label: 'nav.recipes' },
  { to: '/meal-plan', icon: Utensils,  label: 'nav.meals' },
]

const chatItem: NavEntry = { to: '/chat', icon: Bot, label: 'nav.assistant' }

const settingsItem: NavEntry = { to: '/settings', icon: Settings, label: 'nav.settings' }

export default function BottomNav() {
  const { t } = useTranslation()
  const { data: aiData } = useAiModels()

  const items = aiData?.enabled
    ? [...baseItems, chatItem, settingsItem]
    : [...baseItems, settingsItem]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center bg-background border-t border-border md:hidden pb-safe">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          <Icon className="h-5 w-5" />
          {t(label)}
        </NavLink>
      ))}
    </nav>
  )
}
