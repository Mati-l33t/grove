import { useMemo } from "react"
import { isSameDay, parseISO } from "date-fns"
import { useCalendar } from "../contexts/calendar-context"
import { DndProviderWrapper } from "./dnd/dnd-provider"
import { CalendarHeader } from "./header/calendar-header"
import { CalendarYearView } from "./year-view/calendar-year-view"
import { CalendarMonthView } from "./month-view/calendar-month-view"
import { CalendarAgendaView } from "./agenda-view/calendar-agenda-view"
import { CalendarDayView } from "./week-and-day-view/calendar-day-view"
import { CalendarWeekView } from "./week-and-day-view/calendar-week-view"

export function ClientContainer() {
  const { view, selectedDate, selectedUserId, events } = useCalendar()

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const eventStartDate = parseISO(event.startDate)
      const eventEndDate = parseISO(event.endDate)
      const isUserMatch = selectedUserId === "all" || event.user.id === selectedUserId

      if (view === "year") {
        const yearStart = new Date(selectedDate.getFullYear(), 0, 1)
        const yearEnd = new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59, 999)
        return eventStartDate <= yearEnd && eventEndDate >= yearStart && isUserMatch
      }

      if (view === "month" || view === "agenda") {
        const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999)
        return eventStartDate <= monthEnd && eventEndDate >= monthStart && isUserMatch
      }

      if (view === "week") {
        const dayOfWeek = selectedDate.getDay()
        const weekStart = new Date(selectedDate)
        weekStart.setDate(selectedDate.getDate() - dayOfWeek)
        weekStart.setHours(0, 0, 0, 0)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)
        return eventStartDate <= weekEnd && eventEndDate >= weekStart && isUserMatch
      }

      if (view === "day") {
        const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0)
        const dayEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59)
        return eventStartDate <= dayEnd && eventEndDate >= dayStart && isUserMatch
      }

      return isUserMatch
    })
  }, [selectedDate, selectedUserId, events, view])

  const singleDayEvents = filteredEvents.filter(event => {
    const startDate = parseISO(event.startDate)
    const endDate = parseISO(event.endDate)
    return isSameDay(startDate, endDate) && !event.allDay
  })

  const multiDayEvents = filteredEvents.filter(event => {
    const startDate = parseISO(event.startDate)
    const endDate = parseISO(event.endDate)
    return !isSameDay(startDate, endDate) || event.allDay
  })

  const eventStartDates = useMemo(() => {
    return filteredEvents.map(event => ({ ...event, endDate: event.startDate }))
  }, [filteredEvents])

  return (
    <div className="overflow-hidden rounded-xl border">
      <CalendarHeader events={filteredEvents} />
      <DndProviderWrapper>
        {view === "day" && <CalendarDayView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} />}
        {view === "month" && <CalendarMonthView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} />}
        {view === "week" && <CalendarWeekView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} />}
        {view === "year" && <CalendarYearView allEvents={eventStartDates} />}
        {view === "agenda" && <CalendarAgendaView singleDayEvents={singleDayEvents} multiDayEvents={multiDayEvents} />}
      </DndProviderWrapper>
    </div>
  )
}
