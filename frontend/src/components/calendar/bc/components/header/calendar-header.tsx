import { Columns, Grid3x3, List, Plus, Grid2x2, CalendarRange } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserSelect } from "./user-select"
import { TodayButton } from "./today-button"
import { DateNavigator } from "./date-navigator"
import { useCalendar } from "../../contexts/calendar-context"
import type { IEvent } from "../../interfaces"
import type { TCalendarView } from "../../types"

interface IProps {
  events: IEvent[]
}

export function CalendarHeader({ events }: IProps) {
  const { view, setView, onDateClick } = useCalendar()

  const viewButtons: { key: TCalendarView; icon: React.ReactNode; label: string }[] = [
    { key: "day", icon: <List strokeWidth={1.8} className="size-5" />, label: "View by day" },
    { key: "week", icon: <Columns strokeWidth={1.8} className="size-5" />, label: "View by week" },
    { key: "month", icon: <Grid2x2 strokeWidth={1.8} className="size-5" />, label: "View by month" },
    { key: "year", icon: <Grid3x3 strokeWidth={1.8} className="size-5" />, label: "View by year" },
    { key: "agenda", icon: <CalendarRange strokeWidth={1.8} className="size-5" />, label: "View by agenda" },
  ]

  return (
    <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <TodayButton />
        <DateNavigator view={view} events={events} />
      </div>
      <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:justify-between">
        <div className="flex w-full items-center gap-1.5">
          <div className="inline-flex">
            {viewButtons.map(({ key, icon, label }, i) => (
              <Button
                key={key}
                aria-label={label}
                size="icon"
                variant={view === key ? "default" : "outline"}
                className={[
                  i === 0 ? "rounded-r-none" : "",
                  i === viewButtons.length - 1 ? "rounded-l-none -ml-px" : "",
                  i > 0 && i < viewButtons.length - 1 ? "rounded-none -ml-px" : "",
                ].join(" ")}
                onClick={() => setView(key)}
              >
                {icon}
              </Button>
            ))}
          </div>
          <UserSelect />
        </div>
        <Button className="w-full sm:w-auto" onClick={() => onDateClick(new Date())}>
          <Plus className="mr-1.5 size-4" />
          New event
        </Button>
      </div>
    </div>
  )
}
