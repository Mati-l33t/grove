import { useMemo } from "react"
import { useCalendar } from "../../contexts/calendar-context"
import { DayCell } from "./day-cell"
import { getCalendarCells, calculateMonthEventPositions } from "../../helpers"
import type { IEvent } from "../../interfaces"

interface IProps {
  singleDayEvents: IEvent[]
  multiDayEvents: IEvent[]
}

export function CalendarMonthView({ singleDayEvents, multiDayEvents }: IProps) {
  const { selectedDate, firstDayOfWeek } = useCalendar()
  const allEvents = [...multiDayEvents, ...singleDayEvents]

  const WEEK_DAYS = firstDayOfWeek === 1
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const cells = useMemo(
    () => getCalendarCells(selectedDate, firstDayOfWeek),
    [selectedDate, firstDayOfWeek]
  )

  const eventPositions = useMemo(
    () => calculateMonthEventPositions(multiDayEvents, singleDayEvents, selectedDate),
    [multiDayEvents, singleDayEvents, selectedDate]
  )

  return (
    <div>
      <div className="grid grid-cols-7 divide-x">
        {WEEK_DAYS.map(day => (
          <div key={day} className="flex items-center justify-center py-2">
            <span className="text-xs font-medium text-muted-foreground">{day}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 overflow-hidden">
        {cells.map(cell => (
          <DayCell key={cell.date.toISOString()} cell={cell} events={allEvents} eventPositions={eventPositions} />
        ))}
      </div>
    </div>
  )
}
