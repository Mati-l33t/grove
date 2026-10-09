import type { TFunction } from 'i18next'

/** Human label for a "N minutes before" reminder; empty string when there is no reminder. */
export function reminderLabel(t: TFunction, mins: number): string {
  if (!mins) return ''
  if (mins >= 1440 && mins % 1440 === 0) return t('reminder.beforeDays', { count: mins / 1440 })
  if (mins >= 60 && mins % 60 === 0) return t('reminder.beforeHours', { count: mins / 60 })
  if (mins >= 60) return t('reminder.beforeHoursMinutes', { hours: Math.floor(mins / 60), minutes: mins % 60 })
  return t('reminder.beforeMinutes', { count: mins })
}
