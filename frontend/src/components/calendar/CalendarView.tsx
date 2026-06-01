import { useState, useMemo, useEffect } from 'react'
import {
  addDays, addMonths, addWeeks, addYears,
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  startOfWeek, endOfWeek, startOfDay, endOfDay, format,
} from 'date-fns'
import { useAllEvents, useCalendarHolidays } from '@/hooks/useEvents'
import { useInstanceSettings } from '@/hooks/useAdmin'
import { useAuthStore } from '@/stores/authStore'
import { useHouseholdMembers } from '@/hooks/useHousehold'
import { useHour12, useWeekStart } from '@/lib/timeFormat'
import pb from '@/lib/pb'
import { CalendarProvider } from './bc/contexts/calendar-context'
import { ClientContainer } from './bc/components/client-container'
import EventModal from './EventModal'
import EventViewDialog from './EventViewDialog'
import { hexToEventColor } from './bc/helpers'
import type { CalendarEvent, Holiday } from '@/types'
import type { IEvent, IUser } from './bc/interfaces'
import type { TCalendarView } from './bc/types'

function pbDateToISO(pbDate: string): string {
  return pbDate.replace(' ', 'T')
}

function expandRecurring(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
  toIEvent: (e: CalendarEvent, occurrenceStart: Date, idSuffix: string) => IEvent
): IEvent[] {
  const eventStart = new Date(pbDateToISO(event.start))
  const eventEnd = event.end ? new Date(pbDateToISO(event.end)) : eventStart
  const durationMs = Math.max(0, eventEnd.getTime() - eventStart.getTime())

  const advanceCursor = (date: Date): Date => {
    switch (event.recurring) {
      case 'daily': return addDays(date, 1)
      case 'weekly': return addWeeks(date, 1)
      case 'monthly': return addMonths(date, 1)
      case 'yearly': return addYears(date, 1)
      default: return date
    }
  }

  const fastForward = (from: Date, to: Date): Date => {
    if (from >= to) return from
    switch (event.recurring) {
      case 'daily': {
        const days = Math.floor((to.getTime() - from.getTime()) / 86400000)
        return addDays(from, days)
      }
      case 'weekly': {
        const weeks = Math.floor((to.getTime() - from.getTime()) / (7 * 86400000))
        return addWeeks(from, weeks)
      }
      case 'monthly': {
        let c = from
        while (c < to) c = addMonths(c, 1)
        return c
      }
      case 'yearly': {
        const years = Math.max(0, to.getFullYear() - from.getFullYear())
        let c = addYears(from, years)
        if (c < to) c = addYears(c, 1)
        return c
      }
      default: return from
    }
  }

  const recurEnd = event.recurring_end
    ? new Date(pbDateToISO(event.recurring_end))
    : rangeEnd

  const limitEnd = recurEnd < rangeEnd ? recurEnd : rangeEnd
  let cursor = fastForward(eventStart, rangeStart)
  const occurrences: IEvent[] = []
  let safety = 0

  while (cursor <= limitEnd && safety < 500) {
    safety++
    if (new Date(cursor.getTime() + durationMs) > rangeStart) {
      occurrences.push(toIEvent(event, cursor, `_${cursor.getTime()}`))
    }
    cursor = advanceCursor(cursor)
  }

  return occurrences
}

function groveEventToIEvent(
  event: CalendarEvent,
  occurrenceStart: Date,
  idSuffix: string,
  members: ReturnType<typeof useHouseholdMembers>['data']
): IEvent {
  const eventStart = new Date(pbDateToISO(event.start))
  const eventEnd = event.end ? new Date(pbDateToISO(event.end)) : eventStart
  const durationMs = Math.max(0, eventEnd.getTime() - eventStart.getTime())
  const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs)

  const colorHex = event.color || event.expand?.user?.color || '#22c55e'
  const member = members?.find(m => m.id === event.user)

  let startISO: string
  let endISO: string

  if (event.all_day) {
    startISO = format(occurrenceStart, "yyyy-MM-dd'T'00:00:00")
    const durationDays = Math.max(1, Math.round(durationMs / 86400000))
    const lastDay = addDays(occurrenceStart, durationDays - 1)
    endISO = format(lastDay, "yyyy-MM-dd'T'00:00:00")
  } else {
    startISO = occurrenceStart.toISOString()
    endISO = occurrenceEnd.toISOString()
  }

  const user: IUser = {
    id: event.expand?.user?.id ?? event.user,
    name: event.expand?.user?.name ?? member?.name ?? 'Unknown',
    picturePath: event.expand?.user?.avatar
      ? pb.files.getURL(event.expand.user, event.expand.user.avatar)
      : null,
  }

  return {
    id: `${event.id}${idSuffix}`,
    title: event.title,
    description: event.description || '',
    startDate: startISO,
    endDate: endISO,
    color: hexToEventColor(colorHex),
    user,
    allDay: event.all_day,
  }
}

export default function CalendarView() {
  const hour12 = useHour12()
  const weekStartDay = useWeekStart()
  const firstDayOfWeek: 0 | 1 = weekStartDay === 1 ? 1 : 0

  const { user, permissions } = useAuthStore()
  const { data: members = [] } = useHouseholdMembers()

  const [view, setView] = useState<TCalendarView>('month')
  const [selectedDate, setSelectedDate] = useState(new Date())

  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null)

  useEffect(() => {
    const d = selectedDate
    const opts = { weekStartsOn: firstDayOfWeek as 0 | 1 }
    switch (view) {
      case 'month':
        setRangeStart(startOfMonth(addMonths(d, -1)))
        setRangeEnd(endOfMonth(addMonths(d, 1)))
        break
      case 'week':
        setRangeStart(startOfWeek(addWeeks(d, -1), opts))
        setRangeEnd(endOfWeek(addWeeks(d, 1), opts))
        break
      case 'day':
        setRangeStart(startOfDay(addDays(d, -1)))
        setRangeEnd(endOfDay(addDays(d, 1)))
        break
      case 'year':
        setRangeStart(startOfYear(d))
        setRangeEnd(endOfYear(d))
        break
      case 'agenda':
        setRangeStart(startOfMonth(d))
        setRangeEnd(endOfMonth(d))
        break
    }
  }, [view, selectedDate, firstDayOfWeek])

  const { data: rawEvents = [] } = useAllEvents(rangeStart, rangeEnd)
  const { data: instanceSettings } = useInstanceSettings()
  const holidaysEnabled = instanceSettings?.holidays_enabled ?? false
  const { data: rawHolidays = [] } = useCalendarHolidays(rangeStart, rangeEnd, holidaysEnabled)

  const bcEvents: IEvent[] = useMemo(() => {
    const regularEvents = rawEvents.flatMap(event => {
      const toIEvent = (e: CalendarEvent, start: Date, suffix: string) =>
        groveEventToIEvent(e, start, suffix, members)

      if (event.recurring === 'none') {
        const eventStart = new Date(pbDateToISO(event.start))
        return [toIEvent(event, eventStart, '')]
      }

      return expandRecurring(
        event,
        rangeStart ?? new Date(),
        rangeEnd ?? new Date(),
        toIEvent
      )
    })

    const holidayEvents: IEvent[] = rawHolidays.map((h: Holiday) => ({
      id: `hol_${h.id}`,
      title: h.local_name || h.name,
      description: '',
      startDate: format(new Date(h.date.replace(' ', 'T')), "yyyy-MM-dd'T'00:00:00"),
      endDate: format(new Date(h.date.replace(' ', 'T')), "yyyy-MM-dd'T'00:00:00"),
      color: hexToEventColor('#ef4444'),
      user: { id: '', name: '', picturePath: null },
      allDay: true,
    }))

    return [...regularEvents, ...holidayEvents]
  }, [rawEvents, rawHolidays, rangeStart, rangeEnd, members])

  const bcUsers: IUser[] = useMemo(() => {
    if (!user) return []
    const seen = new Set<string>()
    const users: IUser[] = []

    const addUser = (u: { id: string; name: string; avatar: string } | undefined) => {
      if (!u || seen.has(u.id)) return
      seen.add(u.id)
      users.push({
        id: u.id,
        name: u.name,
        picturePath: u.avatar ? pb.files.getURL(u as Parameters<typeof pb.files.getURL>[0], u.avatar) : null,
      })
    }

    addUser(user)
    members.forEach(m => addUser(m as typeof user))
    return users
  }, [user, members])

  const [viewOpen, setViewOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>()
  const [defaultDate, setDefaultDate] = useState<string | undefined>()

  function handleEventClick(bcEvent: IEvent) {
    if (bcEvent.id.startsWith('hol_')) return
    const baseId = bcEvent.id.includes('_') ? bcEvent.id.split('_')[0] : bcEvent.id
    const raw = rawEvents.find(e => e.id === baseId)
    if (!raw) return
    setSelectedEvent(raw)
    setViewOpen(true)
  }

  function openEditFromView() {
    setViewOpen(false)
    setModalMode('edit')
    setDefaultDate(undefined)
    setModalOpen(true)
  }

  function handleDateClick(date: Date) {
    if (!permissions.events) return
    setModalMode('create')
    setSelectedEvent(undefined)
    setDefaultDate(format(date, 'yyyy-MM-dd'))
    setModalOpen(true)
  }

  return (
    <>
      <div className="p-4 md:p-6">
        <CalendarProvider
          view={view}
          onViewChange={setView}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          users={bcUsers}
          events={bcEvents}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          firstDayOfWeek={firstDayOfWeek}
          hour12={hour12}
        >
          <ClientContainer />
        </CalendarProvider>
      </div>

      <EventViewDialog
        open={viewOpen}
        event={selectedEvent}
        onClose={() => setViewOpen(false)}
        onEdit={openEditFromView}
      />

      <EventModal
        open={modalOpen}
        mode={modalMode}
        event={selectedEvent}
        defaultDate={defaultDate}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
