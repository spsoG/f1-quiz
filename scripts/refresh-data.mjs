/**
 * Rebuilds src/data/drivers.js, public/drivers/*.png and public/teams/*.png from
 * the OpenF1 API and the Formula 1 media library.
 *
 *   node scripts/refresh-data.mjs [year]
 *
 * Driver bios, nationalities and dates of birth are hand-written and are carried
 * over from the existing data file by driver code, so re-running this only
 * refreshes the things that actually change during a season: the line-up, car
 * numbers, team colours, headshots, team logos and championship points. A driver
 * who is new to the grid comes through with empty bio fields for you to fill in.
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

/**
 * Slugs F1 uses for team logos in its media library. The white-on-transparent
 * variant is the one that suits the app's dark UI.
 */
const TEAM_SLUG = {
  Alpine: 'alpine',
  'Aston Martin': 'astonmartin',
  Audi: 'audi',
  Cadillac: 'cadillac',
  Ferrari: 'ferrari',
  'Haas F1 Team': 'haasf1team',
  McLaren: 'mclaren',
  Mercedes: 'mercedes',
  'Racing Bulls': 'racingbulls',
  'Red Bull Racing': 'redbullracing',
  Williams: 'williams',
}

const logoUrl = (slug, year) =>
  `https://media.formula1.com/image/upload/c_fit,w_320,h_320/q_auto,f_png/common/f1/${year}/${slug}/${year}${slug}logowhite.webp`

/**
 * Proper circuit names and host cities, by Grand Prix. OpenF1's
 * `circuit_short_name` is a mix of real circuit names ("Hungaroring") and plain
 * city names ("Melbourne", "Austin"), which reads badly when the question is
 * "name this circuit" — and it is occasionally just wrong for a round that
 * hasn't run (2026 Bahrain comes back as "Kuala Lumpur"). Hand-written, like the
 * team bases, and used in preference to the API values.
 */
const CIRCUITS = {
  'Australian Grand Prix': { circuit: 'Albert Park', location: 'Melbourne' },
  'Chinese Grand Prix': { circuit: 'Shanghai International Circuit', location: 'Shanghai' },
  'Japanese Grand Prix': { circuit: 'Suzuka', location: 'Suzuka' },
  'Miami Grand Prix': { circuit: 'Miami International Autodrome', location: 'Miami Gardens' },
  'Canadian Grand Prix': { circuit: 'Circuit Gilles Villeneuve', location: 'Montréal' },
  'Monaco Grand Prix': { circuit: 'Circuit de Monaco', location: 'Monte Carlo' },
  'Barcelona Grand Prix': { circuit: 'Circuit de Barcelona-Catalunya', location: 'Barcelona' },
  'Austrian Grand Prix': { circuit: 'Red Bull Ring', location: 'Spielberg' },
  'British Grand Prix': { circuit: 'Silverstone', location: 'Silverstone' },
  'Belgian Grand Prix': { circuit: 'Spa-Francorchamps', location: 'Stavelot' },
  'Hungarian Grand Prix': { circuit: 'Hungaroring', location: 'Budapest' },
  'Dutch Grand Prix': { circuit: 'Zandvoort', location: 'Zandvoort' },
  'Italian Grand Prix': { circuit: 'Monza', location: 'Monza' },
  'Spanish Grand Prix': { circuit: 'Madring', location: 'Madrid' },
  'Azerbaijan Grand Prix': { circuit: 'Baku City Circuit', location: 'Baku' },
  'Bahrain Grand Prix': { circuit: 'Bahrain International Circuit', location: 'Sakhir' },
  'Singapore Grand Prix': { circuit: 'Marina Bay Street Circuit', location: 'Marina Bay' },
  'United States Grand Prix': { circuit: 'Circuit of the Americas', location: 'Austin' },
  'Mexico City Grand Prix': { circuit: 'Autódromo Hermanos Rodríguez', location: 'Mexico City' },
  'São Paulo Grand Prix': { circuit: 'Interlagos', location: 'São Paulo' },
  'Las Vegas Grand Prix': { circuit: 'Las Vegas Strip Circuit', location: 'Las Vegas' },
  'Qatar Grand Prix': { circuit: 'Lusail International Circuit', location: 'Lusail' },
  'Abu Dhabi Grand Prix': { circuit: 'Yas Marina', location: 'Yas Island' },
}

const ICON_BASE =
  'https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3'

/**
 * OpenF1's `circuit_image` is right for almost every round. Where it isn't,
 * fix it here by Grand Prix name — `null` means "ship no map at all", which is
 * the honest answer when F1 hasn't drawn the circuit yet.
 */
const MAP_OVERRIDE = {
  // OpenF1 points this at a Barcelona-Catalunya icon that 404s. F1's long-standing
  // "Spain" icon is that same layout, so use it under an honest name.
  'Barcelona Grand Prix': { file: 'Spain carbon.png', slug: 'barcelona-catalunya' },
  // Madrid's Madring is new for 2026 and has no icon yet — and OpenF1 hands back
  // the "Spain" one, which is Barcelona's layout. No map beats the wrong map.
  'Spanish Grand Prix': null,
}

/** "…/Great Britain carbon.png" → "great-britain" */
const mapSlug = (url) =>
  decodeURIComponent(url.split('/').pop())
    .replace(/\s*carbon\.png$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

async function main() {
  console.log(`Fetching ${YEAR} sessions…`)
  const today = new Date().toISOString().slice(0, 10)
  const allSessions = (await get(`sessions?year=${YEAR}&session_type=Race`))
    .filter((s) => !s.is_cancelled)
    .sort((a, b) => a.date_start.localeCompare(b.date_start))
  const sessions = allSessions.filter((s) => s.date_start.slice(0, 10) < today)

  if (sessions.length === 0) throw new Error(`No completed ${YEAR} races yet.`)

  const meetings = (await get(`meetings?year=${YEAR}`)).filter(
    (m) => !/Testing/i.test(m.meeting_name),
  )

  const points = new Map()
  const wins = new Map()
  const sprintWins = new Map()
  const podiums = new Map()
  const raceWinner = new Map()
  const bump = (map, key, by = 1) => map.set(key, (map.get(key) || 0) + by)

  for (const s of sessions) {
    const results = await get(`session_result?session_key=${s.session_key}`)
    const isGrandPrix = s.session_name === 'Race'
    for (const r of results) {
      if (r.points) bump(points, r.driver_number, r.points)
      if (r.dsq || r.position == null) continue
      if (r.position === 1) {
        bump(isGrandPrix ? wins : sprintWins, r.driver_number)
        if (isGrandPrix) raceWinner.set(s.session_key, r.driver_number)
      }
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
        teamLogo: TEAM_SLUG[d.team_name] ? `/teams/${TEAM_SLUG[d.team_name]}.png` : old.teamLogo ?? '',
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

  console.log('\nDownloading team logos…')
  await mkdir(join(ROOT, 'public/teams'), { recursive: true })
  for (const team of [...new Set(drivers.map((d) => d.team))]) {
    const slug = TEAM_SLUG[team]
    if (!slug) {
      console.log(`  ⚠️  ${team} — no logo slug, add one to TEAM_SLUG`)
      continue
    }
    // A missing logo shouldn't sink a refresh — the old file stays in place.
    const res = await fetch(logoUrl(slug, YEAR))
    if (!res.ok) {
      console.log(`  ⚠️  ${team} — ${res.status} for ${slug}, keeping the existing file`)
      continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(join(ROOT, 'public/teams', `${slug}.png`), buf)
    console.log(`  ${team} → ${slug}.png ${Math.round(buf.length / 1024)}KB`)
  }

  console.log('\nBuilding the calendar and downloading circuit maps…')
  await mkdir(join(ROOT, 'public/circuits'), { recursive: true })
  const byNumber = Object.fromEntries(drivers.map((d) => [d.number, d.id]))
  const races = []

  for (const [i, s] of allSessions.filter((x) => x.session_name === 'Race').entries()) {
    const meeting = meetings.find((m) => m.meeting_key === s.meeting_key)
    const name = meeting?.meeting_name ?? `${s.country_name} Grand Prix`
    const override = Object.hasOwn(MAP_OVERRIDE, name) ? MAP_OVERRIDE[name] : undefined
    const source = override ? `${ICON_BASE}/${encodeURIComponent(override.file)}` : meeting?.circuit_image
    const slug = override ? override.slug : source && mapSlug(source)
    let map = null

    if (override !== null && source) {
      const res = await fetch(source)
      if (res.ok) {
        await writeFile(join(ROOT, 'public/circuits', `${slug}.png`), Buffer.from(await res.arrayBuffer()))
        map = `/circuits/${slug}.png`
      } else {
        console.log(`  ⚠️  ${name} — ${res.status} for the circuit map, shipping without one`)
      }
    }

    const winnerNumber = raceWinner.get(s.session_key)
    races.push({
      round: i + 1,
      name,
      officialName: meeting?.meeting_official_name ?? '',
      country: s.country_name,
      location: CIRCUITS[name]?.location ?? s.location,
      circuit: CIRCUITS[name]?.circuit ?? s.circuit_short_name,
      map,
      date: s.date_start.slice(0, 10),
      hasSprint: allSessions.some(
        (x) => x.meeting_key === s.meeting_key && x.session_name === 'Sprint',
      ),
      winner: winnerNumber == null ? null : byNumber[winnerNumber] ?? null,
    })
  }
  console.log(`  ${races.length} rounds, ${races.filter((r) => r.map).length} with a map`)

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
    logo: drivers[0].teamLogo,
    drivers,
    points: drivers.reduce((sum, d) => sum + d.points, 0),
  };
}).sort((a, b) => b.points - a.points);
`

  await writeFile(join(ROOT, 'src/data/drivers.js'), file)

  const racesFile = `// Generated by scripts/refresh-data.mjs from the OpenF1 API (api.openf1.org).
// \`winner\` is a driver id from ./drivers.js, or null for a race that hasn't run yet.

export const RACES = ${JSON.stringify(races, null, 2)};

/** Races that have actually been run — the only ones with a winner to ask about. */
export const RUN_RACES = RACES.filter((r) => r.winner !== null);
`
  await writeFile(join(ROOT, 'src/data/races.js'), racesFile)

  console.log(`\n✅ ${drivers.length} drivers written after ${season.roundsCompleted} rounds.`)
  console.log(`✅ ${races.length} races written, ${races.filter((r) => r.winner).length} with a winner.`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
