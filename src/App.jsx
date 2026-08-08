import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { SEASON } from './data/drivers.js'
import { localeOf } from './i18n/index.js'
import { tCountry, tCountryOf } from './i18n/data.js'
import Drivers from './components/Drivers.jsx'
import Standings from './components/Standings.jsx'
import DriverDetail from './components/DriverDetail.jsx'
import Quiz from './components/Quiz.jsx'
import LanguageSwitch from './components/LanguageSwitch.jsx'

const TAB_IDS = ['drivers', 'standings', 'quiz']

export default function App() {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState('drivers')
  const [selected, setSelected] = useState(null)

  const lang = i18n.resolvedLanguage

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t('app.documentTitle', { year: SEASON.year })
  }, [lang, t])

  const lastRaceCountry = tCountry(t, SEASON.lastRace.country)
  const lastRaceCountryOf = tCountryOf(t, SEASON.lastRace.country)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">F1</div>
          <div>
            <h1>{t('app.title', { year: SEASON.year })}</h1>
            <p>
              {t('app.subtitle', {
                count: SEASON.roundsCompleted,
                country: lastRaceCountry,
                countryOf: lastRaceCountryOf,
                date: new Date(SEASON.lastRace.date).toLocaleDateString(localeOf(lang), {
                  day: 'numeric',
                  month: 'short',
                }),
              })}
            </p>
          </div>
        </div>
        <div className="tabs" role="tablist">
          {TAB_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              className="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
            >
              {t(`tabs.${id}`)}
            </button>
          ))}
        </div>
        <LanguageSwitch />
      </header>

      {tab === 'drivers' && <Drivers onSelect={setSelected} />}
      {tab === 'standings' && <Standings onSelect={setSelected} />}
      {tab === 'quiz' && <Quiz />}

      {selected && (
        <DriverDetail
          driver={selected}
          onClose={() => setSelected(null)}
          onSelect={setSelected}
        />
      )}

      <p className="footnote">
        <Trans
          i18nKey="app.footnote"
          values={{ countryOf: lastRaceCountryOf, date: SEASON.lastRace.date }}
          components={{
            api: <a href="https://openf1.org" target="_blank" rel="noreferrer" />,
          }}
        />
      </p>
    </div>
  )
}
