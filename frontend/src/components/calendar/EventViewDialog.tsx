import { useState } from 'react'
import { format } from 'date-fns'
import type { Locale } from 'date-fns'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useDateLocale } from '@/lib/dateLocale'
import { reminderLabel } from '@/lib/reminder'
import { MapPin, Pencil, RefreshCw, Bell, Trash2, Users, Lock } from 'lucide-react'
import { useHour12, formatTime } from '@/lib/timeFormat'
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

function formatDateRange(event: CalendarEvent, hour12: boolean, t: TFunction, locale: Locale): string {
  const fmt = (d: Date, key: 'calendar.dateRangeDay' | 'calendar.dateRangeShort') => format(d, t(key), { locale })
  const start = pbToDate(event.start)
  const end = event.end ? pbToDate(event.end) : start

  if (event.all_day) {
    const startStr = fmt(start, 'calendar.dateRangeDay')
    const endDay = new Date(end)
    endDay.setSeconds(endDay.getSeconds() - 1)
    if (format(start, 'yyyy-MM-dd') === format(endDay, 'yyyy-MM-dd')) {
      return startStr
    }
    return `${fmt(start, 'calendar.dateRangeShort')} – ${fmt(endDay, 'calendar.dateRangeDay')}`
  }

  const sameDay = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')
  if (sameDay) {
    return `${fmt(start, 'calendar.dateRangeDay')}, ${formatTime(start, hour12)} – ${formatTime(end, hour12)}`
  }
  return `${fmt(start, 'calendar.dateRangeShort')}, ${formatTime(start, hour12)} – ${fmt(end, 'calendar.dateRangeDay')}, ${formatTime(end, hour12)}`
}

function formatRecurring(event: CalendarEvent, t: TFunction, locale: Locale): string {
  const date = event.recurring_end ? format(pbToDate(event.recurring_end), t('calendar.dateShortYear'), { locale }) : ''
  switch (event.recurring) {
    case 'daily':   return event.recurring_end ? t('calendar.repeatsDailyUntil', { date })   : t('calendar.repeatsDaily')
    case 'weekly':  return event.recurring_end ? t('calendar.repeatsWeeklyUntil', { date })  : t('calendar.repeatsWeekly')
    case 'monthly': return event.recurring_end ? t('calendar.repeatsMonthlyUntil', { date }) : t('calendar.repeatsMonthly')
    case 'yearly':  return event.recurring_end ? t('calendar.repeatsYearlyUntil', { date })  : t('calendar.repeatsYearly')
    default:        return ''
  }
}

export default function EventViewDialog({ open, event, onClose, onEdit }: Props) {
  const { t } = useTranslation()
  const locale = useDateLocale()
  const { user } = useAuthStore()
  const { data: members = [] } = useHouseholdMembers()
  const deleteEvent = useDeleteEvent()
  const hour12 = useHour12()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!event) return null

  const canEdit = event.user === user?.id || !!user?.is_admin

  const ownerUser = event.expand?.user
  const ownerMember = members.find(m => m.id === event.user)
  const ownerName = ownerUser?.name || ownerMember?.name || t('scope.unknown')
  const ownerAvatar = ownerUser?.avatar
    ? pb.files.getURL(ownerUser as Parameters<typeof pb.files.getURL>[0], ownerUser.avatar)
    : undefined

  const scopeLabel = event.household
    ? t('calendar.everyoneInHousehold')
    : event.shared_with?.length
      ? event.shared_with
          .map(id => members.find(m => m.id === id)?.name?.split(' ')[0] || '?')
          .join(', ')
      : t('calendar.justMe')

  const ScopeIcon = event.household
    ? Users
    : event.shared_with?.length
      ? Users
      : Lock

  const recurring = formatRecurring(event, t, locale)
  const reminder = reminderLabel(t, event.reminder_minutes)

  async function handleDelete() {
    try {
      await deleteEvent.mutateAsync(event!.id)
      toast.success(t('calendar.toast.deleted'))
      onClose()
    } catch {
      toast.error(t('calendar.toast.deleteFailed'))
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
          <p className="font-medium text-foreground">{formatDateRange(event, hour12, t, locale)}</p>

          {/* Assigned to */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Avatar className="h-5 w-5 flex-shrink-0">
              {ownerAvatar && <AvatarImage src={ownerAvatar} />}
              <AvatarFallback className="text-[9px]">{ownerName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>{event.user === user?.id ? t('common.you', { name: ownerName }) : ownerName}</span>
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
              <span className="text-xs text-muted-foreground flex-1">{t('calendar.deleteConfirm')}</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteEvent.isPending}
              >
                {deleteEvent.isPending ? t('calendar.deleting') : t('common.delete')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                {t('common.cancel')}
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
                {t('common.delete')}
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
              {canEdit && (
                <Button onClick={() => { setConfirmDelete(false); onEdit() }}>
                  <Pencil className="h-4 w-4 mr-1.5" />
                  {t('common.edit')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
