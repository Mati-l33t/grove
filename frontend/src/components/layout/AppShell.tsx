import Sidebar from './Sidebar'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  useRealtimeSync()

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
