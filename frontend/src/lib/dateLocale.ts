import { useTranslation } from 'react-i18next'
import { enUS, fr } from 'date-fns/locale'
import type { Locale } from 'date-fns'

const DATE_LOCALES: Record<string, Locale> = { en: enUS, fr }

export function dateLocaleFor(lng: string): Locale {
  return DATE_LOCALES[lng.split('-')[0]] ?? enUS
}

export function useDateLocale(): Locale {
  const { i18n } = useTranslation()
  return dateLocaleFor(i18n.resolvedLanguage ?? i18n.language ?? 'en')
}
