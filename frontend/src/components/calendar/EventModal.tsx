import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { MapPin, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  useCreateCalendarEvent, useUpdateEvent, useDeleteEvent,
} from '@/hooks/useEvents'
import { useAuthStore } from '@/stores/authStore'
import { useHouseholdMembers } from '@/hooks/useHousehold'
import SharePicker from '@/components/ui/SharePicker'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import pb from '@/lib/pb'
import type { CalendarEvent, ShareMode } from '@/types'

const COLOR_SWATCHES = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
]

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  event?: CalendarEvent
  defaultDate?: string
  onClose: () => void
}

function pbToLocalDate(pbDate: string): string {
  return format(new Date(pbDate.replace(' ', 'T')), 'yyyy-MM-dd')
}

function pbToLocalTime(pbDate: string): string {
  return format(new Date(pbDate.replace(' ', 'T')), 'HH:mm')
}

function localToUtcPb(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString().replace('T', ' ')
}

export default function EventModal({ open, mode, event, defaultDate, onClose }: Props) {
  const { user } = useAuthStore()
  const { data: members = [] } = useHouseholdMembers()
  const [shareMode, setShareMode] = useState<ShareMode>('private')
  const [sharedWith, setSharedWith] = useState<string[]>([])
  const createEvent = useCreateCalendarEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()

  const today = format(new Date(), 'yyyy-MM-dd')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState(today)
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState(today)
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(true)
  const [color, setColor] = useState(user?.color || '#22c55e')
  const [recurring, setRecurring] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none')
  const [recurringEnd, setRecurringEnd] = useState('')
  const [reminderMinutes, setReminderMinutes] = useState(0)
  const [assignedUserId, setAssignedUserId] = useState<string>('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && event) {
      setTitle(event.title)
      setDescription(event.description || '')
      setLocation(event.location || '')
      setStartDate(pbToLocalDate(event.start))
      setStartTime(event.all_day ? '09:00' : pbToLocalTime(event.start))
      setEndDate(event.end ? pbToLocalDate(event.end) : pbToLocalDate(event.start))
      setEndTime(event.end && !event.all_day ? pbToLocalTime(event.end) : '10:00')
      setAllDay(event.all_day)
      setColor(event.color || user?.color || '#22c55e')
      setRecurring(event.recurring || 'none')
      setRecurringEnd(event.recurring_end ? pbToLocalDate(event.recurring_end) : '')
      setReminderMinutes(event.reminder_minutes || 0)
      if (event.household) {
        setShareMode('household')
        setSharedWith([])
      } else if (event.shared_with?.length) {
        setShareMode('members')
        setSharedWith(event.shared_with)
      } else {
        setShareMode('private')
        setSharedWith([])
      }
    } else {
      const date = defaultDate?.slice(0, 10) || today
      setTitle('')
      setDescription('')
      setLocation('')
      setStartDate(date)
      setStartTime('09:00')
      setEndDate(date)
      setEndTime('10:00')
      setAllDay(true)
      setColor(user?.color || '#22c55e')
      setRecurring('none')
      setRecurringEnd('')
      setReminderMinutes(0)
      setShareMode('private')
      setSharedWith([])
    }
    setAssignedUserId(mode === 'edit' && event ? event.user : (user?.id ?? ''))
    setShowDeleteConfirm(false)
  }, [open, mode, event, defaultDate])

  function buildEventData() {
    const start = allDay
      ? `${startDate} 00:00:00.000Z`
      : localToUtcPb(startDate, startTime)
    const end = allDay
      ? `${endDate} 23:59:59.999Z`
      : localToUtcPb(endDate, endTime)
    return {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      start,
      end,
      all_day: allDay,
      color,
      recurring,
      ...(recurring !== 'none' && recurringEnd
        ? { recurring_end: `${recurringEnd} 00:00:00.000Z` }
        : {}),
      reminder_minutes: reminderMinutes,
      shareMode,
      sharedWith,
      assignedUserId: mode === 'create'
        ? (assignedUserId || user?.id)
        : (assignedUserId && assignedUserId !== event?.user ? assignedUserId : undefined),
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    try {
      if (mode === 'create') {
        await createEvent.mutateAsync(buildEventData())
        toast.success('Event created.')
      } else {
        await updateEvent.mutateAsync({ id: event!.id, ...buildEventData() })
        toast.success('Event updated.')
      }
      onClose()
    } catch {
      toast.error(mode === 'create' ? 'Failed to create event.' : 'Failed to update event.')
    }
  }

  async function handleDelete() {
    try {
      await deleteEvent.mutateAsync(event!.id)
      toast.success('Event deleted.')
      onClose()
    } catch {
      toast.error('Failed to delete event.')
    }
  }

  const isPending = createEvent.isPending || updateEvent.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'New event' : 'Edit event'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              placeholder="Event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          {members.length > 0 && (
            <div className="space-y-1.5">
              <Label>Assign to</Label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[user!, ...members.filter(m => m.id !== user?.id)].map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-5">
                          <AvatarImage src={m.avatar ? pb.files.getURL(m as Parameters<typeof pb.files.getURL>[0], m.avatar) : undefined} />
                          <AvatarFallback className="text-[10px]">{m.name?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {m.name}{m.id === user?.id ? ' (you)' : ''}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="event-desc">Description</Label>
            <Input
              id="event-desc"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="event-location"
                placeholder="Optional location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-4 w-4 accent-primary cursor-pointer rounded"
            />
            <span className="text-sm font-medium">All day</span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (endDate < e.target.value) setEndDate(e.target.value)
                }}
              />
            </div>
            {!allDay && (
              <div className="space-y-1.5">
                <Label>Start time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            )}
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-6 w-6 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c
                      ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${c}`
                      : 'none',
                  }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                title="Custom color"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Repeat</Label>
            <Select
              value={recurring}
              onValueChange={(v) => setRecurring(v as typeof recurring)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurring !== 'none' && (
            <div className="space-y-1.5">
              <Label>Repeat until</Label>
              <Input
                type="date"
                value={recurringEnd}
                min={startDate}
                onChange={(e) => setRecurringEnd(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Reminder</Label>
            <Select
              value={String(reminderMinutes)}
              onValueChange={(v) => setReminderMinutes(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No reminder</SelectItem>
                <SelectItem value="5">5 minutes before</SelectItem>
                <SelectItem value="10">10 minutes before</SelectItem>
                <SelectItem value="15">15 minutes before</SelectItem>
                <SelectItem value="30">30 minutes before</SelectItem>
                <SelectItem value="60">1 hour before</SelectItem>
                <SelectItem value="1440">1 day before</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SharePicker
            mode={shareMode}
            selectedMembers={sharedWith}
            onChange={(m, members) => { setShareMode(m); setSharedWith(members) }}
          />

          <div className="flex items-center justify-between pt-2 border-t border-border">
            {mode === 'edit' ? (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Delete this event?</span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleteEvent.isPending}
                  >
                    {deleteEvent.isPending ? 'Deleting…' : 'Delete'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              )
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || isPending}>
                {isPending ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
