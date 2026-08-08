import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DRIVERS, SEASON } from '../data/drivers.js'
import { localeOf } from '../i18n/index.js'
import { tBase, tBio, tCountry } from '../i18n/data.js'

const ageOn = (dob, on) => {
  const born = new Date(dob)
  let age = on.getFullYear() - born.getFullYear()
  const beforeBirthday =
    on.getMonth() < born.getMonth() ||
    (on.getMonth() === born.getMonth() && on.getDate() < born.getDate())
  return beforeBirthday ? age - 1 : age
}

export default function DriverDetail({ driver, onClose, onSelect }) {
  const { t, i18n } = useTranslation()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const locale = localeOf(i18n.resolvedLanguage)
  const today = new Date()
  const teamMate = DRIVERS.find((d) => d.team === driver.team && d.id !== driver.id)
  const isBirthday =
    new Date(driver.dob).getDate() === today.getDate() &&
    new Date(driver.dob).getMonth() === today.getMonth()

  return (
    <div className="overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="detail"
        style={{ '--team': driver.teamColour }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="detail-close"
          onClick={onClose}
          aria-label={t('detail.close')}
        >
          ×
        </button>

        <div className="detail-hero">
          <img src={driver.photo} alt={driver.name} />
          <div className="detail-id">
            <span className="detail-team">{driver.team}</span>
            <h2>{driver.name}</h2>
            <div className="detail-sub">
              {driver.flag} {tCountry(t, driver.country)} · {driver.code}
            </div>
          </div>
          <div className="detail-bignum">{driver.number}</div>
        </div>

        <div className="detail-body">
          <p className="bio">{tBio(t, driver)}</p>

          <div className="stats">
            <div className="stat">
              <div className="stat-value">
                {t('detail.ordinal', { count: driver.position, ordinal: true })}
              </div>
              <div className="stat-label">{t('detail.championship')}</div>
            </div>
            <div className="stat">
              <div className="stat-value">{driver.points}</div>
              <div className="stat-label">{t('detail.points')}</div>
            </div>
            <div className="stat">
              <div className="stat-value">{driver.wins}</div>
              <div className="stat-label">{t('detail.wins')}</div>
            </div>
            <div className="stat">
              <div className="stat-value">{driver.podiums}</div>
              <div className="stat-label">{t('detail.podiums')}</div>
            </div>
          </div>

          <dl className="facts">
            <div className="fact">
              <dt>{t('detail.carNumber')}</dt>
              <dd>{driver.number}</dd>
            </div>
            <div className="fact">
              <dt>{t('detail.teamBase')}</dt>
              <dd>{tBase(t, driver.teamBase)}</dd>
            </div>
            <div className="fact">
              <dt>{t('detail.dob')}</dt>
              <dd>
                {new Date(driver.dob).toLocaleDateString(locale, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                {isBirthday ? ' 🎂' : ''}
              </dd>
            </div>
            <div className="fact">
              <dt>{t('detail.age')}</dt>
              <dd>{ageOn(driver.dob, today)}</dd>
            </div>
            {driver.sprintWins > 0 && (
              <div className="fact">
                <dt>{t('detail.sprintWins', { year: SEASON.year })}</dt>
                <dd>{driver.sprintWins}</dd>
              </div>
            )}
          </dl>

          {teamMate && (
            <button type="button" className="teammate" onClick={() => onSelect(teamMate)}>
              <img src={teamMate.photo} alt="" />
              <span>
                <span className="teammate-label">{t('detail.teamMate')}</span>
                <span className="teammate-name" style={{ display: 'block' }}>
                  {teamMate.name}
                </span>
              </span>
              <span className="teammate-arrow">→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
