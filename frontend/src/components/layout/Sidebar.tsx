import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home, Calendar, List, BookOpen, Utensils, Settings, ShieldCheck, Users, Bot, GraduationCap,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useDrawerStore } from '@/stores/drawerStore'
import { useInstanceSettings, useUpdateCheck } from '@/hooks/useAdmin'
import { useAiModels } from '@/hooks/useChat'
import ThemeToggle from './ThemeToggle'
import AppLogo from './AppLogo'

const mainNav = [
  { to: '/',          icon: Home,     label: 'Today' },
  { to: '/calendar',  icon: Calendar, label: 'Calendar' },
  { to: '/lists',     icon: List,     label: 'Lists' },
  { to: '/recipes',   icon: BookOpen, label: 'Recipes' },
  { to: '/meal-plan', icon: Utensils, label: 'Meal Plan' },
]

function NavItem({
  to, icon: Icon, label, end, badge,
}: {
  to: string; icon: React.ElementType; label: string; end?: boolean; badge?: boolean
}) {
  const setOpen = useDrawerStore((s) => s.setOpen)
  return (
    <NavLink
      to={to}
      end={end}
      onClick={() => setOpen(false)}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
        )
      }
    >
      <span className="relative shrink-0">
        <Icon className="h-4 w-4" />
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-orange-500" />
        )}
      </span>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const { data: appSettings } = useInstanceSettings()
  const { data: aiData } = useAiModels()
  const { open, setOpen } = useDrawerStore()
  const appName = appSettings?.app_name || 'Grove'

  const isAdmin = user?.is_admin ?? false
  const { data: updateInfo } = useUpdateCheck(isAdmin)
  const hasUpdate = updateInfo?.hasUpdate ?? false

  useEffect(() => {
    if (!isAdmin || !hasUpdate) return
    if (sessionStorage.getItem('grove-update-notified')) return
    sessionStorage.setItem('grove-update-notified', '1')
    toast.info(`Grove ${updateInfo!.latest} is available`, {
      description: 'Update in Admin → Settings',
      duration: 10000,
    })
  }, [isAdmin, hasUpdate, updateInfo])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={cn(
        'flex flex-col bg-background border-r border-border h-screen',
        'fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full',
        'md:sticky md:top-0 md:w-56 md:shrink-0 md:z-auto md:translate-x-0',
      )}>
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border">
          <AppLogo className="h-5 w-5" />
          <span className="font-semibold text-base">{appName}</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {mainNav.map((item) => (
            <NavItem key={item.to} {...item} end={item.to === '/'} />
          ))}

          <NavItem to="/school" icon={GraduationCap} label="School" />

          {user?.household && (
            <NavItem to="/household" icon={Users} label="Household" />
          )}

          {aiData?.enabled && (
            <NavItem to="/chat" icon={Bot} label="Assistant" />
          )}

          {user?.is_admin && (
            <NavItem to="/admin" icon={ShieldCheck} label="Admin" badge={hasUpdate} />
          )}
        </nav>

        <div className="px-2 py-3 border-t border-border space-y-0.5">
          <NavItem to="/settings" icon={Settings} label="Settings" />
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {user?.name || user?.email || ''}
            </span>
            <ThemeToggle />
          </div>
          <p className="px-3 pt-1 text-[10px] text-muted-foreground/50 select-none">
            v{__APP_VERSION__} · © {new Date().getFullYear()} Grove
          </p>
        </div>
      </aside>
    </>
  )
}
