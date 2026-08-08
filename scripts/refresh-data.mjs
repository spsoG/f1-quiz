/**
 * Rebuilds src/data/drivers.js and public/drivers/*.png from the OpenF1 API.
 *
 *   node scripts/refresh-data.mjs [year]
 *
 * Driver bios, nationalities and dates of birth are hand-written and are carried
 * over from the existing data file by driver code, so re-running this only
 * refreshes the things that actually change during a season: the line-up, car
 * numbers, team colours, headshots and championship points. A driver who is new
 * to the grid comes through with empty bio fields for you to fill in.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const YEAR = Number(process.argv[2]) || new Date().getFullYear()
const API = 'https://api.openf1.org/v1'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** OpenF1 rate-limits fairly aggressively, so back off and retry on 429. */
async function get(path, tries = 6) {
  for (let attempt = 0; attempt < tries; attempt++) {
    const res = await fetch(`${API}/${path}`)
    if (res.ok) {
      await sleep(1500)
      return res.json()
    }
    if (res.status !== 429 || attempt === tries - 1) {
      throw new Error(`${res.status} ${res.statusText} for ${path}`)
    }
    const wait = 5000 * (attempt + 1)
    console.log(`  429 — retrying in ${wait / 1000}s`)
    await sleep(wait)
  }
}

const TEAM_BASE = {
  McLaren: 'Woking, United Kingdom',
  Mercedes: 'Brackley, United Kingdom',
  Ferrari: 'Maranello, Italy',
  'Red Bull Racing': 'Milton Keynes, United Kingdom',
  'Racing Bulls': 'Faenza, Italy',
  'Aston Martin': 'Silverstone, United Kingdom',
  Alpine: 'Enstone, United Kingdom',
  Williams: 'Grove, United Kingdom',
  'Haas F1 Team': 'Kannapolis, United States',
  Audi: 'Hinwil, Switzerland',
  Cadillac: 'Silverstone, United Kingdom',
}

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

async function main() {
  console.log(`Fetching ${YEAR} sessions…`)
  const today = new Date().toISOString().slice(0, 10)
  const sessions = (await get(`sessions?year=${YEAR}&session_type=Race`))
    .filter((s) => !s.is_cancelled && s.date_start.slice(0, 10) < today)
    .sort((a, b) => a.date_start.localeCompare(b.date_start))

  if (sessions.length === 0) throw new Error(`No completed ${YEAR} races yet.`)

  const points = new Map()
  const wins = new Map()
  const sprintWins = new Map()
  const podiums = new Map()
  const bump = (map, key, by = 1) => map.set(key, (map.get(key) || 0) + by)

  for (const s of sessions) {
    const results = await get(`session_result?session_key=${s.session_key}`)
    const isGrandPrix = s.session_name === 'Race'
    for (const r of results) {
      if (r.points) bump(points, r.driver_number, r.points)
      if (r.dsq || r.position == null) continue
      if (r.position === 1) bump(isGrandPrix ? wins : sprintWins, r.driver_number)
      if (r.position <= 3) bump(podiums, r.driver_number)
    }
    console.log(`  ${s.date_start.slice(0, 10)}  ${s.location} ${s.session_name}`)
  }

  // Carry hand-written bio fields over from the previous data file.
  let previous = {}
  try {
    const { DRIVERS } = await import('../src/data/drivers.js')
    previous = Object.fromEntries(DRIVERS.map((d) => [d.code, d]))
  } catch {
    console.log('  (no existing data file — bios will be blank)')
  }

  const latest = sessions.at(-1)
  const raw = await get(`drivers?session_key=${latest.session_key}`)

  const drivers = raw
    .map((d) => {
      const code = d.name_acronym
      const old = previous[code] || {}
      return {
        id: code.toLowerCase(),
        number: d.driver_number,
        code,
        firstName: titleCase(d.first_name),
        lastName: titleCase(d.last_name),
        name: `${titleCase(d.first_name)} ${titleCase(d.last_name)}`,
        team: d.team_name,
        teamColour: `#${d.team_colour}`,
        teamBase: TEAM_BASE[d.team_name] ?? old.teamBase ?? '',
        country: old.country ?? '',
        flag: old.flag ?? '',
        dob: old.dob ?? null,
        photo: `/drivers/${code.toLowerCase()}.png`,
        hasPhoto: true,
        points: Math.round((points.get(d.driver_number) || 0) * 10) / 10,
        wins: wins.get(d.driver_number) || 0,
        sprintWins: sprintWins.get(d.driver_number) || 0,
        podiums: podiums.get(d.driver_number) || 0,
        bio: old.bio ?? '',
        headshotSource: d.headshot_url,
      }
    })
    .sort((a, b) => b.points - a.points)

  drivers.forEach((d, i) => {
    d.position = i + 1
  })

  console.log('\nDownloading headshots…')
  await mkdir(join(ROOT, 'public/drivers'), { recursive: true })
  for (const d of drivers) {
    const url = d.headshotSource.replace('.transform/1col/', '.transform/4col/')
    const res = await fetch(url)
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(join(ROOT, 'public/drivers', `${d.id}.png`), buf)
    // F1 serves a ~3KB grey silhouette for drivers with no official portrait yet.
    d.hasPhoto = buf.length > 8000
    delete d.headshotSource
    console.log(`  ${d.code} ${Math.round(buf.length / 1024)}KB${d.hasPhoto ? '' : '  (placeholder)'}`)
  }

  const missing = drivers.filter((d) => !d.country || !d.dob || !d.bio)
  if (missing.length) {
    console.log(`\n⚠️  Fill in country / flag / dob / bio for: ${missing.map((d) => d.code).join(', ')}`)
  }

  const season = {
    year: YEAR,
    roundsCompleted: sessions.filter((s) => s.session_name === 'Race').length,
    lastRace: {
      name: latest.location,
      country: latest.country_name,
      date: latest.date_start.slice(0, 10),
    },
  }

  const file = `// Generated by scripts/refresh-data.mjs from the OpenF1 API (api.openf1.org).
// Bios, nationalities and dates of birth are hand-written and preserved across refreshes.

export const SEASON = ${JSON.stringify(season, null, 2)};

export const DRIVERS = ${JSON.stringify(drivers, null, 2)};

export const TEAMS = [...new Set(DRIVERS.map((d) => d.team))].map((team) => {
  const drivers = DRIVERS.filter((d) => d.team === team);
  return {
    name: team,
    colour: drivers[0].teamColour,
    base: drivers[0].teamBase,
    drivers,
    points: drivers.reduce((sum, d) => sum + d.points, 0),
  };
}).sort((a, b) => b.points - a.points);
`

  await writeFile(join(ROOT, 'src/data/drivers.js'), file)
  console.log(`\n✅ ${drivers.length} drivers written after ${season.roundsCompleted} rounds.`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
