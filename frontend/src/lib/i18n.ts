import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'
import fr from '@/locales/fr.json'

export const LANGUAGES = [
  { code: 'en', label: 'English', tag: 'en-US' },
  { code: 'fr', label: 'Français', tag: 'fr-FR' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']

export const LANGUAGE_STORAGE_KEY = 'grove-language'

export function languageTag(lng: string): string {
  return LANGUAGES.find((l) => l.code === lng.split('-')[0])?.tag ?? 'en-US'
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, fr: { translation: fr } },
    fallbackLng: 'en',
    supportedLngs: LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: [],
    },
  })

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})
document.documentElement.lang = i18n.resolvedLanguage ?? 'en'

/** Apply a stored preference. Empty/unknown = auto (browser language). */
export function applyLanguagePreference(pref: string | undefined | null) {
  try {
    if (pref && LANGUAGES.some((l) => l.code === pref)) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, pref)
      void i18n.changeLanguage(pref)
    } else {
      localStorage.removeItem(LANGUAGE_STORAGE_KEY)
      void i18n.changeLanguage(navigator.language)
    }
  } catch {
    void i18n.changeLanguage(pref || 'en')
  }
}

export default i18n
