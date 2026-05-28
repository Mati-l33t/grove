import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { format, isTomorrow, startOfDay } from 'date-fns'
import { toast } from 'sonner'
import {
  ArrowUp,
  Calendar,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Plus,
  ShoppingCart,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { DiaTextReveal } from '@/components/ui/dia-text-reveal'
import { useTodayEvents, useUpcomingWeekEvents } from '@/hooks/useEvents'
import { useHour12, formatTime } from '@/lib/timeFormat'
import { useActiveLists, useCreateListItem } from '@/hooks/useLists'
import { useTodayMealPlan } from '@/hooks/useMealPlan'
import { useHouseholdMembers } from '@/hooks/useHousehold'
import { MEAL_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import TopBar from '@/components/layout/TopBar'
import WeatherWidget from '@/components/weather/WeatherWidget'
import EventModal from '@/components/calendar/EventModal'
import EventViewDialog from '@/components/calendar/EventViewDialog'
import MealSlotDialog from '@/components/mealplan/MealSlotDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CalendarEvent } from '@/types'

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

function SectionHeader({
  title,
  icon,
  href,
}: {
  title: string
  icon: React.ReactNode
  href: string
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {icon}
        {title}
      </h2>
      <Link
        to={href}
        className="text-xs text-primary flex items-center gap-0.5 hover:underline"
      >
        View all <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  )
}

export default function Today() {
  const { user } = useAuthStore()
  const hour12 = useHour12()

  const now = new Date()
  const greeting = getGreeting(now.getHours())
  const firstName = user?.name?.split(' ')[0] ?? ''
  const dateLabel = format(now, 'EEEE, MMMM d')
  const userColor = user?.color || '#22c55e'

  const greetingPrefix = `${greeting}${firstName ? ', ' : ''}`
  const fullGreeting = `${greetingPrefix}${firstName}`

  const [typed, setTyped] = useState(0)
  const [cursorVisible, setCursorVisible] = useState(true)
  const doneTyping = typed >= fullGreeting.length

  useEffect(() => {
    if (!doneTyping) {
      const t = setTimeout(() => setTyped((n) => n + 1), 55)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setCursorVisible(false), 1500)
    return () => clearTimeout(t)
  }, [typed, doneTyping])

  const typedPrefix = greetingPrefix.slice(0, Math.min(typed, greetingPrefix.length))

  const [showScrollTop, setShowScrollTop] = useState(false)
  const handleScroll = useCallback(() => setShowScrollTop(window.scrollY > 220), [])
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const eventsQuery = useTodayEvents()
  const weekQuery = useUpcomingWeekEvents()
  const listsQuery = useActiveLists()
  const mealsQuery = useTodayMealPlan()
  const { data: householdMembers = [] } = useHouseholdMembers()
  const createListItem = useCreateListItem()

  const todayStr = format(now, 'yyyy-MM-dd')

  const [fabOpen, setFabOpen] = useState(false)
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [showItemDialog, setShowItemDialog] = useState(false)
  const [itemText, setItemText] = useState('')
  const [selectedListId, setSelectedListId] = useState('')

  const [viewEvent, setViewEvent] = useState<CalendarEvent | undefined>()
  const [viewEventOpen, setViewEventOpen] = useState(false)
  const [editEventOpen, setEditEventOpen] = useState(false)

  const [mealSlot, setMealSlot] = useState<{ date: string; mealType: string } | null>(null)

  function openEventView(event: CalendarEvent) {
    setViewEvent(event)
    setViewEventOpen(true)
  }

  function openEventEdit() {
    setViewEventOpen(false)
    setEditEventOpen(true)
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!itemText.trim() || !selectedListId) return
    try {
      await createListItem.mutateAsync({ listId: selectedListId, text: itemText.trim() })
      toast.success('Item added.')
      setItemText('')
      setShowItemDialog(false)
    } catch {
      toast.error('Failed to add item.')
    }
  }

  const events = eventsQuery.data ?? []

  const upcomingEvents = weekQuery.data ?? []
  const dayGroups = Object.values(
    upcomingEvents.reduce<Record<string, { day: Date; events: typeof upcomingEvents }>>((acc, ev) => {
      const day = startOfDay(new Date(ev.start.replace(' ', 'T')))
      const key = day.toISOString()
      if (!acc[key]) acc[key] = { day, events: [] }
      acc[key].events.push(ev)
      return acc
    }, {})
  ).sort((a, b) => a.day.getTime() - b.day.getTime())
  const lists = listsQuery.data ?? []
  const meals = mealsQuery.data ?? []

  return (
    <>
      <TopBar title="Today" />

      <div className="max-w-5xl mx-auto w-full p-4 md:px-8 space-y-6">
        {/* Greeting */}
        <div className="pt-2 flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-white font-semibold text-lg select-none"
            style={{ backgroundColor: user?.color || '#22c55e' }}
          >
            {user?.avatar ? (
              <img
                src={`/api/files/_pb_users_auth_/${user.id}/${user.avatar}`}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{(user?.name || user?.email || '?')[0].toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-2xl font-bold truncate">
                {typedPrefix}
                {typed >= greetingPrefix.length && firstName && (
                  <DiaTextReveal text={firstName} colors={[userColor]} />
                )}
                {cursorVisible && <span className="greeting-cursor">|</span>}
              </h1>
              {/* desktop: full widget right of greeting */}
              <div className="hidden md:block shrink-0">
                <WeatherWidget />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <p className="text-sm text-muted-foreground">{dateLabel}</p>
              {/* mobile: compact widget right of date */}
              <div className="md:hidden shrink-0">
                <WeatherWidget compact />
              </div>
            </div>
          </div>
        </div>

        {/* Today's events + Upcoming this week — side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Today's events */}
          <section>
            <SectionHeader
              title="Today's events"
              icon={<Calendar className="h-3.5 w-3.5" />}
              href="/calendar"
            />
            {eventsQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            ) : events.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">No events today</p>
                <button
                  className="mt-2 text-xs text-primary hover:underline"
                  onClick={() => {
                    setFabOpen(false)
                    setShowEventDialog(true)
                  }}
                >
                  + Add event
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((event) => {
                  const color = event.color || event.expand?.user?.color || '#22c55e'
                  const startDate = new Date(event.start.replace(' ', 'T'))
                  const endDate = event.end ? new Date(event.end.replace(' ', 'T')) : null
                  const timeLabel = event.all_day
                    ? 'All day'
                    : endDate && endDate.getTime() !== startDate.getTime()
                      ? `${formatTime(startDate, hour12)} – ${formatTime(endDate, hour12)}`
                      : formatTime(startDate, hour12)
                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 rounded-lg border bg-card p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => openEventView(event)}
                    >
                      <div
                        className="w-1 self-stretch rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{timeLabel}</p>
                        {event.location && (
                          <p className="text-xs text-muted-foreground truncate">{event.location}</p>
                        )}
                        {event.user !== user?.id && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <span
                              className="inline-block size-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: event.expand?.user?.color || color }}
                            />
                            {event.expand?.user?.name?.split(' ')[0] ?? householdMembers.find(m => m.id === event.user)?.name?.split(' ')[0] ?? 'Unknown'}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Upcoming this week */}
          <section>
            <SectionHeader
              title="Upcoming this week"
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              href="/calendar"
            />
            {weekQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            ) : dayGroups.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground">Nothing else this week</p>
                <button
                  className="mt-2 text-xs text-primary hover:underline"
                  onClick={() => {
                    setFabOpen(false)
                    setShowEventDialog(true)
                  }}
                >
                  + Add event
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {dayGroups.map(({ day, events: dayEvents }) => (
                  <div key={day.toISOString()}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5 px-1">
                      {isTomorrow(day) ? 'Tomorrow' : format(day, 'EEEE d')}
                    </p>
                    <div className="space-y-1.5">
                      {dayEvents.map((event) => {
                        const color = event.color || event.expand?.user?.color || '#22c55e'
                        const startDate = new Date(event.start.replace(' ', 'T'))
                        const endDate = event.end ? new Date(event.end.replace(' ', 'T')) : null
                        const timeLabel = event.all_day
                          ? 'All day'
                          : endDate && endDate.getTime() !== startDate.getTime()
                            ? `${formatTime(startDate, hour12)} – ${formatTime(endDate, hour12)}`
                            : formatTime(startDate, hour12)
                        return (
                          <div
                            key={event.id}
                            className="flex items-center gap-3 rounded-lg border bg-card p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                            onClick={() => openEventView(event)}
                          >
                            <div
                              className="w-1 self-stretch rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{event.title}</p>
                              <p className="text-xs text-muted-foreground">{timeLabel}</p>
                              {event.location && (
                                <p className="text-xs text-muted-foreground truncate">{event.location}</p>
                              )}
                              {event.user !== user?.id && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <span
                                    className="inline-block size-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: event.expand?.user?.color || color }}
                                  />
                                  {event.expand?.user?.name?.split(' ')[0] ?? householdMembers.find(m => m.id === event.user)?.name?.split(' ')[0] ?? 'Unknown'}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Lists */}
        <section>
          <SectionHeader
            title="Lists"
            icon={<CheckSquare className="h-3.5 w-3.5" />}
            href="/lists"
          />
          {listsQuery.isLoading ? (
            <div className="flex gap-2 flex-wrap">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-32 rounded-full" />
            </div>
          ) : lists.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">No active lists</p>
              <Link
                to="/lists"
                className="mt-2 block text-xs text-primary hover:underline"
              >
                + Create list
              </Link>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {lists.map((list) => {
                const Icon = list.type === 'shopping' ? ShoppingCart : CheckSquare
                const assignedToName = list.expand?.assigned_to?.name?.split(' ')[0]
                  ?? householdMembers.find((m) => m.id === list.assigned_to)?.name?.split(' ')[0]
                const creatorName = list.expand?.user?.name?.split(' ')[0]
                  ?? householdMembers.find((m) => m.id === list.user)?.name?.split(' ')[0]
                const assignedLabel =
                  list.assigned_to && list.assigned_to !== user?.id
                    ? `For: ${assignedToName ?? '?'}`
                    : list.assigned_to === user?.id && list.user !== user?.id
                    ? `From: ${creatorName ?? '?'}`
                    : list.assigned_to === user?.id
                    ? 'For: Me'
                    : null
                return (
                  <Link
                    key={list.id}
                    to={`/lists/${list.id}`}
                    className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm hover:bg-accent/50 transition-colors"
                  >
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full flex-shrink-0"
                      style={{ backgroundColor: list.color || '#22c55e' }}
                    >
                      <Icon className="h-2.5 w-2.5 text-white" />
                    </span>
                    {list.name}
                    {assignedLabel && (
                      <span className="text-xs text-muted-foreground">{assignedLabel}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Meal plan */}
        <section>
          <SectionHeader
            title="Today's meals"
            icon={<UtensilsCrossed className="h-3.5 w-3.5" />}
            href="/meal-plan"
          />
          {mealsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {MEAL_TYPES.map((mealType) => {
                const slotMeals = meals.filter((m) => m.meal_type === mealType)

                function getScopeLabel(meal: typeof slotMeals[0]): string | null {
                  if (meal.household) return null
                  if (meal.user === user?.id && meal.shared_with?.length) {
                    const names = meal.shared_with
                      .map((id) => householdMembers.find((m) => m.id === id)?.name?.split(' ')[0] || '?')
                      .join(', ')
                    return `For: ${names}`
                  }
                  if (meal.user !== user?.id) {
                    const plannerName = meal.expand?.user?.name?.split(' ')[0]
                      ?? householdMembers.find((m) => m.id === meal.user)?.name?.split(' ')[0]
                      ?? '?'
                    return `From: ${plannerName}`
                  }
                  return null
                }

                return (
                  <div
                    key={mealType}
                    className="rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setMealSlot({ date: todayStr, mealType })}
                  >
                    <p className="text-xs font-medium capitalize text-muted-foreground mb-1">
                      {mealType}
                    </p>
                    {slotMeals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">—</p>
                    ) : (
                      <div className="space-y-1">
                        {slotMeals.map((meal) => {
                          const label = meal.expand?.recipe?.title || meal.custom_meal || '—'
                          const scopeLabel = getScopeLabel(meal)
                          return (
                            <div key={meal.id}>
                              <p className="text-sm font-medium truncate leading-tight">{label}</p>
                              {scopeLabel && (
                                <p className="text-xs text-muted-foreground">{scopeLabel}</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Scroll to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
        className={cn(
          'fixed bottom-20 left-4 md:bottom-6 md:left-60 z-40 h-10 w-10 rounded-full bg-card border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200',
          showScrollTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        <ArrowUp className="h-4 w-4" />
      </button>

      {/* Quick-add FAB */}
      <div className="fixed bottom-20 right-4 md:bottom-6 z-40 flex flex-col items-end gap-2">
        <div
          className={cn(
            'flex flex-col items-end gap-2 transition-all duration-200',
            fabOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none'
          )}
        >
          <button
            className="flex items-center gap-2 rounded-full bg-card border shadow-md px-3 py-2 text-sm font-medium hover:bg-accent/50 transition-colors whitespace-nowrap"
            onClick={() => {
              setFabOpen(false)
              setShowEventDialog(true)
            }}
          >
            <Calendar className="h-4 w-4 text-primary" />
            Add event
          </button>
          <button
            className="flex items-center gap-2 rounded-full bg-card border shadow-md px-3 py-2 text-sm font-medium hover:bg-accent/50 transition-colors whitespace-nowrap"
            onClick={() => {
              setFabOpen(false)
              setShowItemDialog(true)
            }}
          >
            <CheckSquare className="h-4 w-4 text-primary" />
            Add to list
          </button>
        </div>

        <button
          className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
          onClick={() => setFabOpen(!fabOpen)}
          aria-label={fabOpen ? 'Close menu' : 'Quick add'}
        >
          {fabOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Event view dialog */}
      <EventViewDialog
        open={viewEventOpen}
        event={viewEvent}
        onClose={() => setViewEventOpen(false)}
        onEdit={openEventEdit}
      />

      {/* Event edit dialog */}
      <EventModal
        open={editEventOpen}
        mode="edit"
        event={viewEvent}
        onClose={() => setEditEventOpen(false)}
      />

      {/* Meal slot dialog */}
      {mealSlot && (
        <MealSlotDialog
          open={!!mealSlot}
          onClose={() => setMealSlot(null)}
          date={mealSlot.date}
          mealType={mealSlot.mealType}
          meals={meals.filter((m) => m.meal_type === mealSlot.mealType)}
        />
      )}

      {/* Quick-add event dialog */}
      <EventModal
        open={showEventDialog}
        mode="create"
        defaultDate={todayStr}
        onClose={() => setShowEventDialog(false)}
      />

      {/* Add list item dialog */}
      <Dialog
        open={showItemDialog}
        onOpenChange={(open) => {
          setShowItemDialog(open)
          if (!open) { setItemText(''); setSelectedListId('') }
        }}
      >
        <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add to list</DialogTitle>
          </DialogHeader>
          {lists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lists yet.{' '}
              <Link to="/lists" className="text-primary hover:underline">
                Create one first.
              </Link>
            </p>
          ) : (
            <form onSubmit={handleAddItem} className="space-y-4">
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a list" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Item text"
                value={itemText}
                onChange={(e) => setItemText(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowItemDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!itemText.trim() || !selectedListId || createListItem.isPending}
                >
                  {createListItem.isPending ? 'Adding…' : 'Add item'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
