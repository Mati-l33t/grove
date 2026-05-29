import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfToday, addDays, addMonths, addYears, endOfWeek } from 'date-fns'
import pb from '@/lib/pb'
import { useAuthStore } from '@/stores/authStore'
import type { CalendarEvent, ShareMode } from '@/types'

function advanceToOrAfter(start: Date, recurring: string, from: Date): Date {
  let d = new Date(start)
  while (d < from) {
    if (recurring === 'daily') d = addDays(d, 1)
    else if (recurring === 'weekly') d = addDays(d, 7)
    else if (recurring === 'monthly') d = addMonths(d, 1)
    else d = addYears(d, 1)
  }
  return d
}

function buildScope(userId: string, householdId?: string): string {
  const base = `(user = "${userId}" || shared_with ~ "${userId}")`
  return householdId
    ? `(${base} || household = "${householdId}")`
    : base
}

function sharingFields(shareMode: ShareMode, sharedWith: string[], householdId?: string) {
  return {
    household: shareMode === 'household' && householdId ? householdId : null,
    shared_with: shareMode === 'members' ? sharedWith : [],
  }
}

export function useTodayEvents() {
  const { user, household } = useAuthStore()
  const todayKey = format(startOfToday(), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['events', 'today', user?.id, household?.id, todayKey],
    queryFn: async () => {
      const todayStr = format(startOfToday(), 'yyyy-MM-dd')
      const tomorrowStr = format(addDays(startOfToday(), 1), 'yyyy-MM-dd')
      const todayUtc = `${todayStr} 00:00:00.000Z`
      const tomorrowUtc = `${tomorrowStr} 00:00:00.000Z`
      const scope = buildScope(user!.id, household?.id)
      const dateRange =
        `(start >= "${todayUtc}" && start < "${tomorrowUtc}")` +
        ` || (start < "${todayUtc}" && end > "${todayUtc}")`
      const records = await pb.collection('events').getFullList({
        filter: `${scope} && (${dateRange})`,
        sort: '-all_day,start',
        expand: 'user',
      })
      return records as unknown as CalendarEvent[]
    },
    enabled: !!user,
  })
}

export function useUpcomingWeekEvents() {
  const { user, household } = useAuthStore()
  const todayKey = format(startOfToday(), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['events', 'upcoming-week', user?.id, household?.id, todayKey],
    queryFn: async () => {
      const tomorrow = addDays(startOfToday(), 1)
      const weekEndDay = addDays(endOfWeek(startOfToday(), { weekStartsOn: 1 }), 1)
      const tomorrowUtc = `${format(tomorrow, 'yyyy-MM-dd')} 00:00:00.000Z`
      const weekEndUtc = `${format(weekEndDay, 'yyyy-MM-dd')} 00:00:00.000Z`
      const scope = buildScope(user!.id, household?.id)
      const spansIntoRange = `(recurring != "none" && start < "${weekEndUtc}" && (recurring_end = "" || recurring_end >= "${tomorrowUtc}"))`
      const records = await pb.collection('events').getFullList({
        filter: `${scope} && ((start >= "${tomorrowUtc}" && start < "${weekEndUtc}") || ${spansIntoRange})`,
        sort: '-all_day,start',
        expand: 'user',
      })
      const from = new Date(`${format(tomorrow, 'yyyy-MM-dd')}T00:00:00.000Z`)
      const to = new Date(`${format(weekEndDay, 'yyyy-MM-dd')}T00:00:00.000Z`)
      return (records as unknown as CalendarEvent[]).flatMap((ev) => {
        const start = new Date(ev.start.replace(' ', 'T'))
        if (start >= from && start < to) return [ev]
        if (!ev.recurring || ev.recurring === 'none') return []
        const occ = advanceToOrAfter(start, ev.recurring, from)
        if (occ >= to) return []
        const recurringEnd = ev.recurring_end ? new Date(ev.recurring_end.replace(' ', 'T')) : null
        if (recurringEnd && occ > recurringEnd) return []
        const offset = occ.getTime() - start.getTime()
        return [{ ...ev, start: occ.toISOString().replace('T', ' '), end: ev.end ? new Date(new Date(ev.end.replace(' ', 'T')).getTime() + offset).toISOString().replace('T', ' ') : ev.end }]
      })
    },
    enabled: !!user,
  })
}

export function useAllEvents(start: Date | null, end: Date | null) {
  const { user, household } = useAuthStore()

  return useQuery({
    queryKey: ['events', 'range', user?.id, household?.id, start?.toISOString(), end?.toISOString()],
    queryFn: async () => {
      const startUtc = start!.toISOString().replace('T', ' ')
      const endUtc = end!.toISOString().replace('T', ' ')
      const scope = buildScope(user!.id, household?.id)
      const inRange = `(start >= "${startUtc}" && start < "${endUtc}")`
      const spansIntoRange = `(recurring != "none" && start < "${endUtc}" && (recurring_end = "" || recurring_end >= "${startUtc}"))`
      const records = await pb.collection('events').getFullList({
        filter: `${scope} && (${inRange} || ${spansIntoRange})`,
        sort: '-all_day,start',
        expand: 'user',
      })
      return records as unknown as CalendarEvent[]
    },
    enabled: !!user && !!start && !!end,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  const { user, household } = useAuthStore()

  return useMutation({
    mutationFn: async ({ title, shareMode, sharedWith }: {
      title: string
      shareMode: ShareMode
      sharedWith: string[]
    }) => {
      const todayStr = format(startOfToday(), 'yyyy-MM-dd')
      return pb.collection('events').create({
        title: title.trim(),
        start: `${todayStr} 00:00:00.000Z`,
        end: `${todayStr} 23:59:59.999Z`,
        all_day: true,
        color: '',
        recurring: 'none',
        reminder_minutes: 0,
        user: user!.id,
        ...sharingFields(shareMode, sharedWith, household?.id),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export interface EventData {
  title: string
  description?: string
  location?: string
  start: string
  end: string
  all_day: boolean
  color: string
  recurring: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  recurring_end?: string
  reminder_minutes: number
  shareMode: ShareMode
  sharedWith: string[]
  assignedUserId?: string
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient()
  const { user, household } = useAuthStore()

  return useMutation({
    mutationFn: async (data: EventData) => {
      const { shareMode, sharedWith, assignedUserId, ...rest } = data
      // Private visibility: creator always owns the record so only they can see it.
      // Non-private: assign ownership to the selected member.
      const actualUser = shareMode === 'private' ? user!.id : (assignedUserId || user!.id)
      return pb.collection('events').create({
        ...rest,
        user: actualUser,
        ...sharingFields(shareMode, sharedWith, household?.id),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  const { user, household } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, shareMode, sharedWith, assignedUserId, ...data }: EventData & { id: string }) => {
      const effectiveUser = shareMode === 'private' ? user!.id : assignedUserId
      return pb.collection('events').update(id, {
        ...data,
        ...(effectiveUser ? { user: effectiveUser } : {}),
        ...sharingFields(shareMode, sharedWith, household?.id),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return pb.collection('events').delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
