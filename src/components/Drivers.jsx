import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DRIVERS, TEAMS } from '../data/drivers.js'
import { localeOf } from '../i18n/index.js'
import { tCountry } from '../i18n/data.js'
import DriverCard from './DriverCard.jsx'

const SORTS = {
  standings: () => (a, b) => a.position - b.position,
  number: () => (a, b) => a.number - b.number,
  name: (locale) => (a, b) => a.lastName.localeCompare(b.lastName, locale),
  team: () => (a, b) => a.team.localeCompare(b.team) || a.position - b.position,
}

export default function Drivers({ onSelect }) {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const [team, setTeam] = useState('all')
  const [sort, setSort] = useState('standings')

  const locale = localeOf(i18n.resolvedLanguage)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return DRIVERS.filter((d) => {
      if (team !== 'all' && d.team !== team) return false
      if (!q) return true
      return (
        d.name.toLowerCase().includes(q) ||
        d.team.toLowerCase().includes(q) ||
        d.country.toLowerCase().includes(q) ||
        // Search also matches the localised country name, e.g. "Італія".
        tCountry(t, d.country).toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        String(d.number) === q
      )
    }).sort(SORTS[sort](locale))
  }, [query, team, sort, locale, t])

  return (
    <>
      <div className="controls">
        <input
          className="search"
          type="search"
          placeholder={t('controls.searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="select" value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="all">{t('controls.allTeams')}</option>
          {TEAMS.map((tm) => (
            <option key={tm.name} value={tm.name}>
              {tm.name}
            </option>
          ))}
        </select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
          {Object.keys(SORTS).map((key) => (
            <option key={key} value={key}>
              {t(`sorts.${key}`)}
            </option>
          ))}
        </select>
        <span className="count">
          {t('controls.count', { visible: visible.length, total: DRIVERS.length })}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="empty">{t('controls.empty', { query })}</p>
      ) : (
        <div className="grid">
          {visible.map((driver) => (
            <DriverCard key={driver.id} driver={driver} onSelect={onSelect} />
          ))}
        </div>
      )}
    </>
  )
}
