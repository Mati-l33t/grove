import { createContext, useContext, useState, useEffect } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { IEvent, IUser } from "../interfaces"
import type { TBadgeVariant, TCalendarView, TVisibleHours, TWorkingHours } from "../types"

interface ICalendarContext {
  view: TCalendarView
  setView: (v: TCalendarView) => void
  selectedDate: Date
  setSelectedDate: (date: Date | undefined) => void
  selectedUserId: IUser["id"] | "all"
  setSelectedUserId: (userId: IUser["id"] | "all") => void
  badgeVariant: TBadgeVariant
  setBadgeVariant: (variant: TBadgeVariant) => void
  users: IUser[]
  workingHours: TWorkingHours
  setWorkingHours: Dispatch<SetStateAction<TWorkingHours>>
  visibleHours: TVisibleHours
  setVisibleHours: Dispatch<SetStateAction<TVisibleHours>>
  events: IEvent[]
  setLocalEvents: Dispatch<SetStateAction<IEvent[]>>
  onEventClick: (event: IEvent) => void
  onDateClick: (date: Date) => void
  firstDayOfWeek: 0 | 1
  hour12: boolean
}

const CalendarContext = createContext({} as ICalendarContext)

const DEFAULT_WORKING_HOURS: TWorkingHours = {
  0: { from: 0, to: 0 },
  1: { from: 8, to: 17 },
  2: { from: 8, to: 17 },
  3: { from: 8, to: 17 },
  4: { from: 8, to: 17 },
  5: { from: 8, to: 17 },
  6: { from: 8, to: 12 },
}

const DEFAULT_VISIBLE_HOURS: TVisibleHours = { from: 7, to: 18 }

interface CalendarProviderProps {
  children: React.ReactNode
  view: TCalendarView
  onViewChange: (v: TCalendarView) => void
  selectedDate: Date
  onDateChange: (d: Date) => void
  users: IUser[]
  events: IEvent[]
  onEventClick: (event: IEvent) => void
  onDateClick: (date: Date) => void
  firstDayOfWeek?: 0 | 1
  hour12?: boolean
}

export function CalendarProvider({
  children,
  view,
  onViewChange,
  selectedDate,
  onDateChange,
  users,
  events,
  onEventClick,
  onDateClick,
  firstDayOfWeek = 0,
  hour12 = true,
}: CalendarProviderProps) {
  const [badgeVariant, setBadgeVariant] = useState<TBadgeVariant>("colored")
  const [visibleHours, setVisibleHours] = useState<TVisibleHours>(DEFAULT_VISIBLE_HOURS)
  const [workingHours, setWorkingHours] = useState<TWorkingHours>(DEFAULT_WORKING_HOURS)
  const [selectedUserId, setSelectedUserId] = useState<IUser["id"] | "all">("all")
  const [localEvents, setLocalEvents] = useState<IEvent[]>(events)

  useEffect(() => {
    setLocalEvents(events)
  }, [events])

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return
    onDateChange(date)
  }

  return (
    <CalendarContext.Provider
      value={{
        view,
        setView: onViewChange,
        selectedDate,
        setSelectedDate: handleSelectDate,
        selectedUserId,
        setSelectedUserId,
        badgeVariant,
        setBadgeVariant,
        users,
        visibleHours,
        setVisibleHours,
        workingHours,
        setWorkingHours,
        events: localEvents,
        setLocalEvents,
        onEventClick,
        onDateClick,
        firstDayOfWeek,
        hour12,
      }}
    >
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar(): ICalendarContext {
  const context = useContext(CalendarContext)
  if (!context) throw new Error("useCalendar must be used within a CalendarProvider.")
  return context
}
