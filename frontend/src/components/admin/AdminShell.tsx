import { NavLink } from 'react-router-dom'
import { BarChart3, Settings, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import TopBar from '@/components/layout/TopBar'

const tabs = [
  { to: '/admin',          label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/admin/users',    label: 'Users',     icon: Users },
  { to: '/admin/settings', label: 'Settings',  icon: Settings },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar title="Admin" />
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
              {label}
            </NavLink>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </>
  )
}
