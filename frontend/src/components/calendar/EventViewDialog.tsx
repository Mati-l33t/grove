import { useState } from 'react'
import { format } from 'date-fns'
import { MapPin, Pencil, RefreshCw, Bell, Trash2, Users, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useDeleteEvent } from '@/hooks/useEvents'
import { useHouseholdMembers } from '@/hooks/useHousehold'
import { useAuthStore } from '@/stores/authStore'
import pb from '@/lib/pb'
import type { CalendarEvent } from '@/types'

interface Props {
  open: boolean
  event?: CalendarEvent
  onClose: () => void
  onEdit: () => void
}

function pbToDate(pbDate: string): Date {
  return new Date(pbDate.replace(' ', 'T'))
}

function formatDateRange(event: CalendarEvent): string {
  const start = pbToDate(event.start)
  const end = event.end ? pbToDate(event.end) : start

  if (event.all_day) {
    const startStr = format(start, 'EEE, d MMM yyyy')
    const endDay = new Date(end)
    endDay.setSeconds(endDay.getSeconds() - 1)
    if (format(start, 'yyyy-MM-dd') === format(endDay, 'yyyy-MM-dd')) {
      return startStr
    }
    return `${format(start, 'EEE, d MMM')} – ${format(endDay, 'EEE, d MMM yyyy')}`
  }

  const sameDay = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')
  if (sameDay) {
    return `${format(start, 'EEE, d MMM yyyy')}, ${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`
  }
  return `${format(start, 'EEE, d MMM, HH:mm')} – ${format(end, 'EEE, d MMM yyyy, HH:mm')}`
}

function formatRecurring(event: CalendarEvent): string {
  const labels: Record<string, string> = {
    daily: 'Repeats daily',
    weekly: 'Repeats weekly',
    monthly: 'Repeats monthly',
    yearly: 'Repeats yearly',
  }
  const base = labels[event.recurring] || ''
  if (!base) return ''
  if (event.recurring_end) {
    return `${base} until ${format(pbToDate(event.recurring_end), 'd MMM yyyy')}`
  }
  return base
}

function formatReminder(mins: number): string {
  if (!mins) return ''
  if (mins >= 1440 && mins % 1440 === 0) {
    const d = mins / 1440
    return `${d} day${d !== 1 ? 's' : ''} before`
  }
  if (mins >= 60 && mins % 60 === 0) {
    const h = mins / 60
    return `${h} hour${h !== 1 ? 's' : ''} before`
  }
  if (mins >= 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}min before`
  }
  return `${mins} minute${mins !== 1 ? 's' : ''} before`
}

export default function EventViewDialog({ open, event, onClose, onEdit }: Props) {
  const { user } = useAuthStore()
  const { data: members = [] } = useHouseholdMembers()
  const deleteEvent = useDeleteEvent()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!event) return null

  const canEdit = event.user === user?.id || !!user?.is_admin

  const ownerUser = event.expand?.user
  const ownerMember = members.find(m => m.id === event.user)
  const ownerName = ownerUser?.name || ownerMember?.name || 'Unknown'
  const ownerAvatar = ownerUser?.avatar
    ? pb.files.getURL(ownerUser as Parameters<typeof pb.files.getURL>[0], ownerUser.avatar)
    : undefined

  const scopeLabel = event.household
    ? 'Everyone in household'
    : event.shared_with?.length
      ? event.shared_with
          .map(id => members.find(m => m.id === id)?.name?.split(' ')[0] || '?')
          .join(', ')
      : 'Just me'

  const ScopeIcon = event.household
    ? Users
    : event.shared_with?.length
      ? Users
      : Lock

  const recurring = formatRecurring(event)
  const reminder = formatReminder(event.reminder_minutes)

  async function handleDelete() {
    try {
      await deleteEvent.mutateAsync(event!.id)
      toast.success('Event deleted.')
      onClose()
    } catch {
      toast.error('Failed to delete event.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setConfirmDelete(false); onClose() } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 h-4 w-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: event.color || ownerUser?.color || '#22c55e' }}
            />
            <DialogTitle className="text-lg leading-snug">{event.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* Date / time */}
          <p className="font-medium text-foreground">{formatDateRange(event)}</p>

          {/* Assigned to */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Avatar className="h-5 w-5 flex-shrink-0">
              {ownerAvatar && <AvatarImage src={ownerAvatar} />}
              <AvatarFallback className="text-[9px]">{ownerName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>{ownerName}{event.user === user?.id ? ' (you)' : ''}</span>
          </div>

          {/* Scope */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <ScopeIcon className="h-4 w-4 flex-shrink-0" />
            <span>{scopeLabel}</span>
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-foreground whitespace-pre-wrap break-words">{event.description}</p>
          )}

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="break-words">{event.location}</span>
            </div>
          )}

          {/* Recurring */}
          {recurring && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 flex-shrink-0" />
              <span>{recurring}</span>
            </div>
          )}

          {/* Reminder */}
          {reminder && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bell className="h-4 w-4 flex-shrink-0" />
              <span>{reminder}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-3 border-t border-border">
          {confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex-1">Delete this event?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteEvent.isPending}
              >
                {deleteEvent.isPending ? 'Deleting…' : 'Delete'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between">
            {canEdit && !confirmDelete ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              {canEdit && (
                <Button onClick={() => { setConfirmDelete(false); onEdit() }}>
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
