import { useTranslation } from 'react-i18next'
import { enUS, fr } from 'date-fns/locale'
import { addDays, format, startOfWeek } from 'date-fns'
import type { Locale } from 'date-fns'

const DATE_LOCALES: Record<string, Locale> = { en: enUS, fr }

export function dateLocaleFor(lng: string): Locale {
  return DATE_LOCALES[lng.split('-')[0]] ?? enUS
}

export function useDateLocale(): Locale {
  const { i18n } = useTranslation()
  return dateLocaleFor(i18n.resolvedLanguage ?? i18n.language ?? 'en')
}

/** Weekday labels (in the current date-fns default locale) starting from the given weekday. */
export function weekdayLabels(weekStartsOn: 0 | 1, pattern: string): string[] {
  const start = startOfWeek(new Date(2024, 0, 3), { weekStartsOn })
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), pattern))
}
