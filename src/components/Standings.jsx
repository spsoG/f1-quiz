import { useTranslation } from 'react-i18next'
import { DRIVERS, TEAMS } from '../data/drivers.js'

export default function Standings({ onSelect }) {
  const { t } = useTranslation()

  return (
    <>
      <h2 className="section-title">{t('standings.driversTitle')}</h2>
      <div className="standings">
        <div className="srow head">
          <span>{t('standings.pos')}</span>
          <span />
          <span>{t('standings.driver')}</span>
          <span style={{ textAlign: 'right' }}>{t('standings.pts')}</span>
        </div>
        {DRIVERS.map((d) => (
          <button
            key={d.id}
            type="button"
            className="srow"
            style={{ '--team': d.teamColour }}
            onClick={() => onSelect(d)}
          >
            <span className="spos">{d.position}</span>
            <img src={d.photo} alt="" loading="lazy" />
            <span>
              <span className="sname">
                {d.name} <span style={{ color: 'var(--text-faint)' }}>#{d.number}</span>
              </span>
              <span className="steam" style={{ display: 'block' }}>
                {d.flag} {d.team}
              </span>
            </span>
            <span className="spts">
              {d.points}
              <small>{t('standings.wins', { count: d.wins })}</small>
            </span>
          </button>
        ))}
      </div>

      <h2 className="section-title">{t('standings.constructorsTitle')}</h2>
      <div className="constructors">
        {TEAMS.map((team) => (
          <div key={team.name} className="ctile" style={{ '--team': team.colour }}>
            <div className="cname">{team.name}</div>
            <div className="cdrivers">{team.drivers.map((d) => d.lastName).join(' · ')}</div>
            <div className="cpts">
              {team.points} <span>{t('standings.points')}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
