import { useTranslation } from 'react-i18next'

export default function DriverCard({ driver, onSelect }) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      className="card"
      style={{ '--team': driver.teamColour }}
      onClick={() => onSelect(driver)}
    >
      <div className="card-photo">
        <span className="card-pos">P{driver.position}</span>
        <span className="card-number">{driver.number}</span>
        <img src={driver.photo} alt={driver.name} loading="lazy" />
      </div>
      <div className="card-body">
        <div className="card-first">{driver.firstName}</div>
        <div className="card-last">{driver.lastName}</div>
        <div className="card-meta">
          <span>{driver.team}</span>
          <span>
            <b>{driver.points}</b> {t('card.points')}
          </span>
        </div>
      </div>
    </button>
  )
}
