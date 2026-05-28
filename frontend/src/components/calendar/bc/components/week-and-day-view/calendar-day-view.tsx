import { parseISO, areIntervalsOverlapping, format } from "date-fns"
import { useCalendar } from "../../contexts/calendar-context"
import { ScrollArea } from "@/components/ui/scroll-area"
import { EventBlock } from "./event-block"
import { DroppableTimeBlock } from "../dnd/droppable-time-block"
import { CalendarTimeline } from "./calendar-time-line"
import { DayViewMultiDayEventsRow } from "./day-view-multi-day-events-row"
import { cn } from "@/lib/utils"
import { groupEvents, getEventBlockStyle, isWorkingHour, getVisibleHours } from "../../helpers"
import type { IEvent } from "../../interfaces"

interface IProps {
  singleDayEvents: IEvent[]
  multiDayEvents: IEvent[]
}

export function CalendarDayView({ singleDayEvents, multiDayEvents }: IProps) {
  const { selectedDate, visibleHours, workingHours, onDateClick, hour12 } = useCalendar()
  const { hours, earliestEventHour, latestEventHour } = getVisibleHours(visibleHours, singleDayEvents)

  const dayEvents = singleDayEvents.filter(event => {
    const eventDate = parseISO(event.startDate)
    return (
      eventDate.getDate() === selectedDate.getDate() &&
      eventDate.getMonth() === selectedDate.getMonth() &&
      eventDate.getFullYear() === selectedDate.getFullYear()
    )
  })

  const groupedEvents = groupEvents(dayEvents)

  return (
    <div className="flex flex-col">
      <DayViewMultiDayEventsRow selectedDate={selectedDate} multiDayEvents={multiDayEvents} />

      <div className="relative z-20 flex border-b">
        <div className="w-18" />
        <span className="flex-1 border-l py-2 text-center text-xs font-medium text-muted-foreground">
          {format(selectedDate, "EE")} <span className="font-semibold text-foreground">{format(selectedDate, "d")}</span>
        </span>
      </div>

      <ScrollArea className="h-[800px]" type="always">
        <div className="flex">
          <div className="relative w-18">
            {hours.map((hour, index) => (
              <div key={hour} className="relative" style={{ height: "96px" }}>
                <div className="absolute -top-3 right-2 flex h-6 items-center">
                  {index !== 0 && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date().setHours(hour, 0, 0, 0), hour12 ? "hh a" : "HH:mm")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="relative flex-1 border-l">
            <div className="relative">
              {hours.map((hour, index) => {
                const isDisabled = !isWorkingHour(selectedDate, hour, workingHours)
                return (
                  <div
                    key={hour}
                    className={cn("relative", isDisabled && "bg-muted/20")}
                    style={{ height: "96px" }}
                  >
                    {index !== 0 && <div className="pointer-events-none absolute inset-x-0 top-0 border-b" />}
                    <DroppableTimeBlock date={selectedDate} hour={hour} minute={0}>
                      <div
                        className="absolute inset-x-0 top-0 h-[24px] cursor-pointer transition-colors hover:bg-accent"
                        onClick={() => { const d = new Date(selectedDate); d.setHours(hour, 0, 0, 0); onDateClick(d) }}
                      />
                    </DroppableTimeBlock>
                    <DroppableTimeBlock date={selectedDate} hour={hour} minute={15}>
                      <div
                        className="absolute inset-x-0 top-[24px] h-[24px] cursor-pointer transition-colors hover:bg-accent"
                        onClick={() => { const d = new Date(selectedDate); d.setHours(hour, 15, 0, 0); onDateClick(d) }}
                      />
                    </DroppableTimeBlock>
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 border-b border-dashed" />
                    <DroppableTimeBlock date={selectedDate} hour={hour} minute={30}>
                      <div
                        className="absolute inset-x-0 top-[48px] h-[24px] cursor-pointer transition-colors hover:bg-accent"
                        onClick={() => { const d = new Date(selectedDate); d.setHours(hour, 30, 0, 0); onDateClick(d) }}
                      />
                    </DroppableTimeBlock>
                    <DroppableTimeBlock date={selectedDate} hour={hour} minute={45}>
                      <div
                        className="absolute inset-x-0 top-[72px] h-[24px] cursor-pointer transition-colors hover:bg-accent"
                        onClick={() => { const d = new Date(selectedDate); d.setHours(hour, 45, 0, 0); onDateClick(d) }}
                      />
                    </DroppableTimeBlock>
                  </div>
                )
              })}

              {groupedEvents.map((group, groupIndex) =>
                group.map(event => {
                  let style = getEventBlockStyle(event, selectedDate, groupIndex, groupedEvents.length, {
                    from: earliestEventHour,
                    to: latestEventHour,
                  })
                  const hasOverlap = groupedEvents.some(
                    (otherGroup, otherIndex) =>
                      otherIndex !== groupIndex &&
                      otherGroup.some(otherEvent =>
                        areIntervalsOverlapping(
                          { start: parseISO(event.startDate), end: parseISO(event.endDate) },
                          { start: parseISO(otherEvent.startDate), end: parseISO(otherEvent.endDate) }
                        )
                      )
                  )
                  if (!hasOverlap) style = { ...style, width: "100%", left: "0%" }
                  return (
                    <div key={event.id} className="absolute p-1" style={style}>
                      <EventBlock event={event} />
                    </div>
                  )
                })
              )}
            </div>
            <CalendarTimeline firstVisibleHour={earliestEventHour} lastVisibleHour={latestEventHour} />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
