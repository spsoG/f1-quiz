import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
import uk from './locales/uk.json'

export const LANGUAGES = [
  { code: 'en', short: 'EN', label: 'English', locale: 'en-GB' },
  { code: 'uk', short: 'УК', label: 'Українська', locale: 'uk-UA' },
]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, uk: { translation: uk } },
    fallbackLng: 'en',
    supportedLngs: LANGUAGES.map((l) => l.code),
    // "uk-UA" from the browser should resolve to our "uk" bundle.
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'f1quiz.lang',
    },
    // React already escapes everything it renders.
    interpolation: { escapeValue: false },
  })

/** BCP 47 tag for Intl formatting (dates, localeCompare). */
export const localeOf = (lng) =>
  LANGUAGES.find((l) => l.code === lng.split('-')[0])?.locale ?? 'en-GB'

export default i18n
