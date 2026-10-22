/**
 * Download every image the app needs into public/.
 *
 *   node scripts/fetch-assets.mjs [--force] [--only=drivers,teams,circuits]
 *
 * The images are official Formula 1 media (driver headshots, team logos and
 * circuit maps) and are deliberately *not* committed to the repository — they
 * are third-party artwork with their own rights. Instead the generated data
 * files record where each one came from, and this script puts them back on
 * disk. Run it after cloning, or whenever the season's artwork changes.
 *
 * Everything is read from src/data/drivers.js and src/data/races.js, so no
 * API key is needed and no network call to OpenF1 is made.
 */

import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')

const args = process.argv.slice(2)
const force = args.includes('--force')
const onlyArg = args.find((a) => a.startsWith('--only='))
const only = onlyArg ? onlyArg.split('=')[1].split(',').map((s) => s.trim()) : null
const wants = (kind) => !only || only.includes(kind)

const { SEASON, DRIVERS, TEAMS } = await import('../src/data/drivers.js')
const { RACES } = await import('../src/data/races.js')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Save one image. Returns 'skipped' when the file is already there, unless
 * --force was asked for.
 */
async function save(relPath, source) {
  const target = join(PUBLIC, relPath.replace(/^\//, ''))
  if (!force) {
    try {
      const info = await stat(target)
      if (info.size > 0) return 'skipped'
    } catch {
      /* not there yet */
    }
  }
  const res = await fetch(source)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${source}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, buf)
  return `saved ${Math.round(buf.length / 1024)}KB`
}

let saved = 0
let skipped = 0

async function download(relPath, source) {
  if (!source) return
  const result = await save(relPath, source)
  if (result === 'skipped') skipped += 1
  else saved += 1
  console.log(`  ${relPath}  ${result}`)
}

console.log(`Fetching assets for the ${SEASON.year} season…`)

if (wants('drivers')) {
  console.log('\nDriver headshots…')
  for (const driver of DRIVERS) {
    if (!driver.headshotSource) {
      console.log(`  ⚠️  ${driver.code} — no headshot URL in the data file, skipping`)
      continue
    }
    await download(driver.photo, driver.headshotSource)
    await sleep(150)
  }
}

if (wants('teams')) {
  console.log('\nTeam logos…')
  for (const team of TEAMS) {
    if (!team.logo) continue
    if (!team.logoSource) {
      console.log(`  ⚠️  ${team.name} — no logo URL in the data file, skipping`)
      continue
    }
    await download(team.logo, team.logoSource)
    await sleep(150)
  }
}

if (wants('circuits')) {
  console.log('\nCircuit maps…')
  for (const race of RACES) {
    if (!race.map) {
      console.log(`  ${race.name}  no map`)
      continue
    }
    if (!race.mapSource) {
      console.log(`  ⚠️  ${race.name} — no map URL in the data file, skipping`)
      continue
    }
    await download(race.map, race.mapSource)
    await sleep(150)
  }
}

console.log(`\n✅ ${saved} downloaded, ${skipped} already on disk.`)
