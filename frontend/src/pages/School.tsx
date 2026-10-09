import { useState, useEffect } from 'react'
import { format, startOfWeek, startOfToday, addDays, isBefore, isToday, parseISO } from 'date-fns'
import { toast } from 'sonner'
import {
  GraduationCap, Plus, ChevronLeft, ChevronRight, Pencil, Trash2,
  Clock, UtensilsCrossed, BookOpen, CheckCircle2, Circle, ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import TopBar from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  useSchoolChildren, useCreateChild, useUpdateChild, useDeleteChild,
  useSchoolSchedule, useUpsertSchedule, useDeleteSchedule,
  useSchoolLunches, useUpsertLunch, useDeleteLunch,
  useSchoolAssignments, useCreateAssignment, useUpdateAssignment,
  useToggleAssignment, useDeleteAssignment,
} from '@/hooks/useSchool'
import { useHouseholdMembers } from '@/hooks/useHousehold'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useAuthStore } from '@/stores/authStore'
import pb from '@/lib/pb'
import type { SchoolChild, SchoolAssignment, WeekDay, AssignmentType } from '@/types'

const WEEKDAYS: WeekDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

const CHILD_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
]

const TYPE_COLORS: Record<AssignmentType, string> = {
  test: 'bg-red-500/15 text-red-600 dark:text-red-400',
  homework: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  project: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  other: 'bg-muted text-muted-foreground',
}

function getDueLabel(dueDate: string, t: TFunction): { label: string; urgent: boolean } {
  if (!dueDate) return { label: '', urgent: false }
  const d = parseISO(dueDate)
  if (isToday(d)) return { label: t('school.today'), urgent: true }
  if (isBefore(d, startOfToday())) return { label: t('school.overdue', { date: format(d, t('school.formats.short')) }), urgent: true }
  return { label: format(d, t('school.formats.short')), urgent: false }
}

export default function School() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { data: members = [] } = useHouseholdMembers()
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [showDone, setShowDone] = useState(false)

  // Child dialog
  const [childDialogOpen, setChildDialogOpen] = useState(false)
  const [editingChild, setEditingChild] = useState<SchoolChild | null>(null)
  const [childName, setChildName] = useState('')
  const [childSchool, setChildSchool] = useState('')
  const [childGrade, setChildGrade] = useState('')
  const [childColor, setChildColor] = useState(CHILD_COLORS[0])
  const [childOwner, setChildOwner] = useState('')

  // Schedule dialog
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [scheduleDay, setScheduleDay] = useState<WeekDay>('monday')
  const [scheduleStart, setScheduleStart] = useState('')
  const [scheduleEnd, setScheduleEnd] = useState('')

  // Lunch dialog
  const [lunchDialogOpen, setLunchDialogOpen] = useState(false)
  const [lunchDate, setLunchDate] = useState('')
  const [lunchMeal, setLunchMeal] = useState('')

  // Assignment dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<SchoolAssignment | null>(null)
  const [assignSubject, setAssignSubject] = useState('')
  const [assignTitle, setAssignTitle] = useState('')
  const [assignType, setAssignType] = useState<AssignmentType>('homework')
  const [assignDue, setAssignDue] = useState('')
  const [assignNotes, setAssignNotes] = useState('')

  // Week dates (Mon–Fri)
  const weekStart = addDays(startOfWeek(startOfToday(), { weekStartsOn: 1 }), weekOffset * 7)
  const weekDates = WEEKDAYS.map((_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'))
  const weekLabel = `${format(weekStart, t('school.formats.short'))} – ${format(addDays(weekStart, 4), t('school.formats.short'))}`

  // Queries
  const { data: children = [], isLoading: childrenLoading } = useSchoolChildren()
  const { data: scheduleData = [] } = useSchoolSchedule(selectedChildId)
  const { data: lunchData = [] } = useSchoolLunches(selectedChildId, weekDates)
  const { data: assignments = [] } = useSchoolAssignments(selectedChildId)

  // Mutations
  const createChild = useCreateChild()
  const updateChild = useUpdateChild()
  const deleteChild = useDeleteChild()
  const upsertSchedule = useUpsertSchedule()
  const deleteSchedule = useDeleteSchedule()
  const upsertLunch = useUpsertLunch()
  const deleteLunch = useDeleteLunch()
  const createAssignment = useCreateAssignment()
  const updateAssignment = useUpdateAssignment()
  const toggleAssignment = useToggleAssignment()
  const deleteAssignment = useDeleteAssignment()

  // Auto-select first child
  useEffect(() => {
    if (!selectedChildId && children.length > 0) {
      setSelectedChildId(children[0].id)
    }
  }, [children, selectedChildId])

  // Derived maps
  const scheduleByDay: Record<string, typeof scheduleData[0]> = {}
  for (const s of scheduleData) scheduleByDay[s.day] = s

  const lunchByDate: Record<string, typeof lunchData[0]> = {}
  for (const l of lunchData) lunchByDate[l.date] = l

  const upcoming = assignments.filter((a) => !a.done)
  const done = assignments.filter((a) => a.done)
  const displayedAssignments = showDone ? done : upcoming

  // ── Child dialog ──────────────────────────────────────────────────────────
  function openAddChild() {
    setEditingChild(null)
    setChildName('')
    setChildSchool('')
    setChildGrade('')
    setChildColor(CHILD_COLORS[0])
    setChildOwner(user?.id || '')
    setChildDialogOpen(true)
  }

  function openEditChild(child: SchoolChild, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingChild(child)
    setChildName(child.name)
    setChildSchool(child.school_name || '')
    setChildGrade(child.grade || '')
    setChildColor(child.color || CHILD_COLORS[0])
    setChildOwner(child.user || user?.id || '')
    setChildDialogOpen(true)
  }

  async function handleSaveChild(e: React.FormEvent) {
    e.preventDefault()
    if (!childName.trim()) return
    try {
      if (editingChild) {
        await updateChild.mutateAsync({ id: editingChild.id, name: childName.trim(), school_name: childSchool.trim(), grade: childGrade.trim(), color: childColor, userId: childOwner || undefined })
        toast.success(t('school.toast.childUpdated'))
      } else {
        const record = await createChild.mutateAsync({ name: childName.trim(), school_name: childSchool.trim(), grade: childGrade.trim(), color: childColor, userId: childOwner || undefined })
        setSelectedChildId((record as { id: string }).id)
        toast.success(t('school.toast.childAdded'))
      }
      setChildDialogOpen(false)
    } catch {
      toast.error(t('school.toast.saveFailed'))
    }
  }

  async function handleDeleteChild(child: SchoolChild, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(t('school.confirmRemoveChild', { name: child.name }))) return
    try {
      await deleteChild.mutateAsync(child.id)
      if (selectedChildId === child.id) setSelectedChildId(null)
      toast.success(t('school.toast.childRemoved'))
    } catch {
      toast.error(t('school.toast.removeFailed'))
    }
  }

  // ── Schedule dialog ───────────────────────────────────────────────────────
  function openSchedule(day: WeekDay) {
    const existing = scheduleByDay[day]
    setScheduleDay(day)
    setScheduleStart(existing?.start_time || '')
    setScheduleEnd(existing?.end_time || '')
    setScheduleDialogOpen(true)
  }

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedChildId) return
    const existing = scheduleByDay[scheduleDay]
    if (!scheduleStart && !scheduleEnd) {
      if (existing) {
        try {
          await deleteSchedule.mutateAsync({ id: existing.id, childId: selectedChildId })
          toast.success(t('school.toast.scheduleCleared'))
        } catch { toast.error(t('school.toast.clearFailed')) }
      }
      setScheduleDialogOpen(false)
      return
    }
    try {
      await upsertSchedule.mutateAsync({
        childId: selectedChildId, day: scheduleDay,
        start_time: scheduleStart, end_time: scheduleEnd,
        existingId: existing?.id,
      })
      toast.success(t('school.toast.scheduleSaved'))
      setScheduleDialogOpen(false)
    } catch {
      toast.error(t('school.toast.saveFailed'))
    }
  }

  // ── Lunch dialog ──────────────────────────────────────────────────────────
  function openLunch(date: string) {
    const existing = lunchByDate[date]
    setLunchDate(date)
    setLunchMeal(existing?.meal || '')
    setLunchDialogOpen(true)
  }

  async function handleSaveLunch(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedChildId) return
    const existing = lunchByDate[lunchDate]
    if (!lunchMeal.trim()) {
      if (existing) {
        try {
          await deleteLunch.mutateAsync({ id: existing.id, childId: selectedChildId })
          toast.success(t('school.toast.lunchCleared'))
        } catch { toast.error(t('school.toast.clearFailed')) }
      }
      setLunchDialogOpen(false)
      return
    }
    try {
      await upsertLunch.mutateAsync({ childId: selectedChildId, date: lunchDate, meal: lunchMeal.trim(), existingId: existing?.id })
      toast.success(t('school.toast.lunchSaved'))
      setLunchDialogOpen(false)
    } catch {
      toast.error(t('school.toast.saveFailed'))
    }
  }

  // ── Assignment dialog ─────────────────────────────────────────────────────
  function openAddAssignment() {
    setEditingAssignment(null)
    setAssignSubject('')
    setAssignTitle('')
    setAssignType('homework')
    setAssignDue('')
    setAssignNotes('')
    setAssignDialogOpen(true)
  }

  function openEditAssignment(a: SchoolAssignment) {
    setEditingAssignment(a)
    setAssignSubject(a.subject || '')
    setAssignTitle(a.title)
    setAssignType(a.type || 'homework')
    setAssignDue(a.due_date || '')
    setAssignNotes(a.notes || '')
    setAssignDialogOpen(true)
  }

  async function handleSaveAssignment(e: React.FormEvent) {
    e.preventDefault()
    if (!assignTitle.trim() || !selectedChildId) return
    try {
      if (editingAssignment) {
        await updateAssignment.mutateAsync({
          id: editingAssignment.id, childId: selectedChildId,
          subject: assignSubject.trim(), title: assignTitle.trim(),
          type: assignType, due_date: assignDue, notes: assignNotes.trim(),
        })
        toast.success(t('school.toast.assignmentUpdated'))
      } else {
        await createAssignment.mutateAsync({
          childId: selectedChildId, subject: assignSubject.trim(), title: assignTitle.trim(),
          type: assignType, due_date: assignDue, notes: assignNotes.trim(),
        })
        toast.success(t('school.toast.assignmentAdded'))
      }
      setAssignDialogOpen(false)
    } catch {
      toast.error(t('school.toast.saveFailed'))
    }
  }

  async function handleToggle(a: SchoolAssignment) {
    try {
      await toggleAssignment.mutateAsync({ id: a.id, childId: a.child, done: !a.done })
    } catch {
      toast.error(t('school.toast.updateFailed'))
    }
  }

  async function handleDeleteAssignment(a: SchoolAssignment) {
    if (!confirm(t('school.confirmDeleteAssignment', { title: a.title }))) return
    try {
      await deleteAssignment.mutateAsync({ id: a.id, childId: a.child })
      toast.success(t('school.toast.deleted'))
    } catch {
      toast.error(t('school.toast.deleteFailed'))
    }
  }

  const selectedChild = children.find((c) => c.id === selectedChildId)

  return (
    <>
      <TopBar title={t('school.title')} />

      <div className="max-w-5xl mx-auto w-full p-4 md:px-8 space-y-6">

        {/* Child selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {childrenLoading ? (
            <>
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </>
          ) : (
            <>
              {children.map((child) => (
                <div key={child.id} className="flex items-center">
                  <button
                    onClick={() => setSelectedChildId(child.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      selectedChildId === child.id
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    )}
                  >
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: child.color || '#22c55e' }}
                    />
                    {child.name}
                    {child.grade && (
                      <span className="text-xs opacity-70">{child.grade}</span>
                    )}
                    {members.length > 0 && child.expand?.user && (
                      <Avatar className="size-4">
                        <AvatarImage src={child.expand.user.avatar ? pb.files.getURL(child.expand.user as Parameters<typeof pb.files.getURL>[0], child.expand.user.avatar) : undefined} />
                        <AvatarFallback className="text-[8px]">{child.expand.user.name?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                  </button>
                  {selectedChildId === child.id && (
                    <div className="flex items-center ml-0.5">
                      <button
                        onClick={(e) => openEditChild(child, e)}
                        className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                        aria-label={t('school.editChild')}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteChild(child, e)}
                        className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
                        aria-label={t('school.removeChild')}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={openAddChild}
                className="flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('school.addChild')}
              </button>
            </>
          )}
        </div>

        {/* Empty state */}
        {!childrenLoading && children.length === 0 && (
          <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
            <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">{t('school.noChildren')}</p>
            <p className="text-xs text-muted-foreground">{t('school.noChildrenHint')}</p>
            <Button size="sm" onClick={openAddChild}>
              <Plus className="h-4 w-4 mr-1" />
              {t('school.addChild')}
            </Button>
          </div>
        )}

        {selectedChild && (
          <>
            {/* Week schedule */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {t('school.weekSchedule')}
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setWeekOffset((n) => n - 1)}
                    className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    aria-label={t('school.previousWeek')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-muted-foreground min-w-[120px] text-center">{weekLabel}</span>
                  <button
                    onClick={() => setWeekOffset((n) => n + 1)}
                    className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    aria-label={t('school.nextWeek')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Desktop: 5-col grid */}
              <div className="hidden md:grid grid-cols-5 gap-2">
                {WEEKDAYS.map((day, i) => {
                  const date = weekDates[i]
                  const schedule = scheduleByDay[day]
                  const lunch = lunchByDate[date]
                  const dateObj = parseISO(date)
                  const isCurrentDay = isToday(dateObj)
                  return (
                    <div
                      key={day}
                      className={cn(
                        'rounded-lg border bg-card overflow-hidden',
                        isCurrentDay && 'border-primary/40'
                      )}
                    >
                      <div
                        className={cn(
                          'px-3 py-2 text-center border-b',
                          isCurrentDay ? 'bg-primary/10' : 'bg-muted/30'
                        )}
                      >
                        <p className={cn('text-xs font-semibold', isCurrentDay ? 'text-primary' : 'text-muted-foreground')}>
                          {t(`school.day.${day}`)}
                        </p>
                        <p className={cn('text-xs', isCurrentDay ? 'text-primary/80' : 'text-muted-foreground/70')}>
                          {format(dateObj, t('school.formats.short'))}
                        </p>
                      </div>
                      <button
                        onClick={() => openSchedule(day)}
                        className="w-full px-3 py-2.5 text-left border-b hover:bg-accent/30 transition-colors group"
                      >
                        {schedule?.start_time || schedule?.end_time ? (
                          <p className="text-xs font-medium truncate">
                            {schedule.start_time || '?'} – {schedule.end_time || '?'}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">{t('school.setHours')}</p>
                        )}
                      </button>
                      <button
                        onClick={() => openLunch(date)}
                        className="w-full px-3 py-2.5 text-left hover:bg-accent/30 transition-colors group min-h-[52px]"
                      >
                        {lunch?.meal ? (
                          <p className="text-xs leading-tight">{lunch.meal}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground/50 group-hover:text-muted-foreground transition-colors flex items-center gap-1">
                            <UtensilsCrossed className="h-3 w-3" />
                            {t('school.addLunch')}
                          </p>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Mobile: vertical list */}
              <div className="md:hidden space-y-2">
                {WEEKDAYS.map((day, i) => {
                  const date = weekDates[i]
                  const schedule = scheduleByDay[day]
                  const lunch = lunchByDate[date]
                  const dateObj = parseISO(date)
                  const isCurrentDay = isToday(dateObj)
                  return (
                    <div
                      key={day}
                      className={cn(
                        'rounded-lg border bg-card',
                        isCurrentDay && 'border-primary/40'
                      )}
                    >
                      <div className={cn(
                        'flex items-center gap-3 px-3 py-2 border-b',
                        isCurrentDay ? 'bg-primary/10' : 'bg-muted/30'
                      )}>
                        <p className={cn('text-sm font-semibold w-8', isCurrentDay ? 'text-primary' : 'text-foreground')}>
                          {t(`school.day.${day}`)}
                        </p>
                        <p className="text-xs text-muted-foreground">{format(dateObj, t('school.formats.long'))}</p>
                      </div>
                      <div className="flex divide-x">
                        <button
                          onClick={() => openSchedule(day)}
                          className="flex-1 min-w-0 px-3 py-2.5 text-left hover:bg-accent/30 transition-colors group"
                        >
                          <p className="text-xs text-muted-foreground mb-0.5">{t('school.hours')}</p>
                          {schedule?.start_time || schedule?.end_time ? (
                            <p className="text-xs font-medium break-words">{schedule.start_time || '?'} – {schedule.end_time || '?'}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground/50 group-hover:text-muted-foreground">—</p>
                          )}
                        </button>
                        <button
                          onClick={() => openLunch(date)}
                          className="flex-1 min-w-0 px-3 py-2.5 text-left hover:bg-accent/30 transition-colors group"
                        >
                          <p className="text-xs text-muted-foreground mb-0.5">{t('school.lunch')}</p>
                          {lunch?.meal ? (
                            <p className="text-xs font-medium break-words">{lunch.meal}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground/50 group-hover:text-muted-foreground">—</p>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Assignments */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  {t('school.assignments')}
                </h2>
                <Button size="sm" variant="outline" onClick={openAddAssignment}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {t('school.add')}
                </Button>
              </div>

              {/* Upcoming / Done toggle */}
              <div className="flex gap-1 mb-3">
                {(['upcoming', 'done'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setShowDone(tab === 'done')}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                      (tab === 'done') === showDone
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    )}
                  >
                    {tab === 'upcoming'
                      ? (upcoming.length > 0 ? t('school.upcomingCount', { count: upcoming.length }) : t('school.upcoming'))
                      : (done.length > 0 ? t('school.doneCount', { count: done.length }) : t('school.done'))}
                  </button>
                ))}
              </div>

              {displayedAssignments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <ClipboardList className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {showDone ? t('school.noCompleted') : t('school.noUpcoming')}
                  </p>
                  {!showDone && (
                    <button
                      className="mt-2 text-xs text-primary hover:underline"
                      onClick={openAddAssignment}
                    >
                      {t('school.addAssignmentLink')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedAssignments.map((a) => {
                    const { label: dueLabel, urgent } = getDueLabel(a.due_date, t)
                    return (
                      <div
                        key={a.id}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors',
                          a.done && 'opacity-60'
                        )}
                      >
                        <button
                          onClick={() => handleToggle(a)}
                          className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                          aria-label={a.done ? t('school.markNotDone') : t('school.markDone')}
                        >
                          {a.done
                            ? <CheckCircle2 className="h-5 w-5 text-primary" />
                            : <Circle className="h-5 w-5" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold', TYPE_COLORS[a.type || 'other'])}>
                              {t(`school.type.${a.type || 'other'}`)}
                            </span>
                            {a.subject && (
                              <span className="text-xs text-muted-foreground">{a.subject}</span>
                            )}
                          </div>
                          <p className={cn('text-sm font-medium', a.done && 'line-through')}>{a.title}</p>
                          {dueLabel && (
                            <p className={cn('text-xs mt-0.5', urgent ? 'text-red-500 dark:text-red-400 font-medium' : 'text-muted-foreground')}>
                              Due: {dueLabel}
                            </p>
                          )}
                          {a.notes && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEditAssignment(a)}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                            aria-label={t('common.edit')}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(a)}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-accent/50 transition-colors"
                            aria-label={t('common.delete')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── Add/Edit child dialog ─────────────────────────────────────────────── */}
      <Dialog open={childDialogOpen} onOpenChange={setChildDialogOpen}>
        <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingChild ? t('school.editChild') : t('school.addChild')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveChild} className="space-y-4">
            {/* Member picker — shown when in a household */}
            {members.length > 0 && (
              <div className="space-y-1.5">
                <Label>{t('school.householdMember')}</Label>
                <div className="rounded-md border divide-y max-h-44 overflow-y-auto">
                  {[user!, ...members.filter((m) => m.id !== user?.id)].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setChildOwner(m.id)
                        setChildName(m.name || '')
                        if (m.color && !childColor) setChildColor(m.color)
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                        childOwner === m.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-accent/50 text-foreground'
                      )}
                    >
                      <Avatar className="size-8 flex-shrink-0">
                        <AvatarImage src={m.avatar ? pb.files.getURL(m as Parameters<typeof pb.files.getURL>[0], m.avatar) : undefined} />
                        <AvatarFallback style={{ backgroundColor: m.color || '#22c55e' }} className="text-white text-xs">
                          {m.name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium flex-1 truncate">
                        {m.id === user?.id ? t('common.you', { name: m.name }) : m.name}
                      </span>
                      {childOwner === m.id && (
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="child-name">{t('school.displayName')}</Label>
              <Input
                id="child-name"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder={t('school.namePlaceholder')}
                autoFocus={members.length === 0}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="child-school">{t('school.school')}</Label>
              <Input
                id="child-school"
                value={childSchool}
                onChange={(e) => setChildSchool(e.target.value)}
                placeholder={t('school.schoolPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="child-grade">{t('school.gradeClass')}</Label>
              <Input
                id="child-grade"
                value={childGrade}
                onChange={(e) => setChildGrade(e.target.value)}
                placeholder={t('school.gradePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('school.color')}</Label>
              <div className="flex gap-2 flex-wrap">
                {CHILD_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChildColor(c)}
                    className={cn(
                      'h-7 w-7 rounded-full transition-all',
                      childColor === c && 'ring-2 ring-offset-2 ring-offset-background ring-foreground'
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setChildDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createChild.isPending || updateChild.isPending}>
                {editingChild ? t('common.save') : t('school.add')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Schedule dialog ───────────────────────────────────────────────────── */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>
              {t('school.dayHours', { day: t(`school.dayFull.${scheduleDay}`) })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSchedule} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sched-start">{t('school.start')}</Label>
                <Input
                  id="sched-start"
                  type="time"
                  value={scheduleStart}
                  onChange={(e) => setScheduleStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sched-end">{t('school.end')}</Label>
                <Input
                  id="sched-end"
                  type="time"
                  value={scheduleEnd}
                  onChange={(e) => setScheduleEnd(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('school.noSchoolHint')}</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={upsertSchedule.isPending || deleteSchedule.isPending}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Lunch dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={lunchDialogOpen} onOpenChange={setLunchDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>
              {t('school.lunchTitle', { date: lunchDate ? format(parseISO(lunchDate), t('school.formats.lunchDay')) : '' })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveLunch} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="lunch-meal">{t('school.meal')}</Label>
              <Input
                id="lunch-meal"
                value={lunchMeal}
                onChange={(e) => setLunchMeal(e.target.value)}
                placeholder={t('school.mealPlaceholder')}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">{t('school.clearLunchHint')}</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLunchDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={upsertLunch.isPending || deleteLunch.isPending}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Assignment dialog ─────────────────────────────────────────────────── */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? t('school.editAssignment') : t('school.addAssignment')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAssignment} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="assign-type">{t('school.type_')}</Label>
                <Select value={assignType} onValueChange={(v) => setAssignType(v as AssignmentType)}>
                  <SelectTrigger id="assign-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homework">{t('school.type.homework')}</SelectItem>
                    <SelectItem value="test">{t('school.type.test')}</SelectItem>
                    <SelectItem value="project">{t('school.type.project')}</SelectItem>
                    <SelectItem value="other">{t('school.type.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assign-subject">{t('school.subject')}</Label>
                <Input
                  id="assign-subject"
                  value={assignSubject}
                  onChange={(e) => setAssignSubject(e.target.value)}
                  placeholder={t('school.subjectPlaceholder')}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-title">{t('school.title_')}</Label>
              <Input
                id="assign-title"
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                placeholder={t('school.titlePlaceholder')}
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-due">{t('school.dueDate')}</Label>
              <Input
                id="assign-due"
                type="date"
                value={assignDue}
                onChange={(e) => setAssignDue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-notes">{t('school.notes')}</Label>
              <Textarea
                id="assign-notes"
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder={t('school.notesPlaceholder')}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAssignDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createAssignment.isPending || updateAssignment.isPending}>
                {editingAssignment ? t('common.save') : t('school.add')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
