import { NavLink } from 'react-router-dom'
import { Home, Calendar, List, BookOpen, Utensils, Settings, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAiModels } from '@/hooks/useChat'

const baseItems = [
  { to: '/',          icon: Home,      label: 'Today' },
  { to: '/calendar',  icon: Calendar,  label: 'Calendar' },
  { to: '/lists',     icon: List,      label: 'Lists' },
  { to: '/recipes',   icon: BookOpen,  label: 'Recipes' },
  { to: '/meal-plan', icon: Utensils,  label: 'Meals' },
]

const chatItem = { to: '/chat', icon: Bot, label: 'Assistant' }

const settingsItem = { to: '/settings', icon: Settings, label: 'Settings' }

export default function BottomNav() {
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
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
