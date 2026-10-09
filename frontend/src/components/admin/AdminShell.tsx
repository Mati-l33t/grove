import { NavLink } from 'react-router-dom'
import { BarChart3, Settings, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ParseKeys } from 'i18next'
import { cn } from '@/lib/utils'
import TopBar from '@/components/layout/TopBar'

const tabs: { to: string; label: ParseKeys; icon: React.ElementType; end?: boolean }[] = [
  { to: '/admin',          label: 'admin.tabDashboard', icon: BarChart3, end: true },
  { to: '/admin/users',    label: 'admin.tabUsers',     icon: Users },
  { to: '/admin/settings', label: 'admin.tabSettings',  icon: Settings },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <>
      <TopBar title={t('admin.title')} />
      <div className="max-w-4xl mx-auto w-full p-4 md:p-6 space-y-6">
        <nav className="flex border-b border-border">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {t(label)}
            </NavLink>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </>
  )
}
