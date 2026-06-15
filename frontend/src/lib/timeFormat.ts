import { useAuthStore } from '@/stores/authStore'

function browserUses12Hour(): boolean {
  const sample = new Intl.DateTimeFormat(navigator.language, { hour: 'numeric' }).format(new Date(2000, 0, 1, 13))
  return /am|pm/i.test(sample)
}

export function useHour12(): boolean {
  const user = useAuthStore((s) => s.user)
  if (user?.time_format === '12h') return true
  if (user?.time_format === '24h') return false
  return browserUses12Hour()
}

export function useWeekStart(): 0 | 1 {
  const user = useAuthStore((s) => s.user)
  return user?.week_start === 'sunday' ? 0 : 1
}

export function formatTime(date: Date, hour12: boolean): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12 })
}
