import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n/index.js'

export default function LanguageSwitch() {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage

  return (
    <div className="langswitch" role="group" aria-label={t('language.label')}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className="lang"
          lang={lang.code}
          title={lang.label}
          aria-label={lang.label}
          aria-pressed={current === lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
        >
          {lang.short}
        </button>
      ))}
    </div>
  )
}
