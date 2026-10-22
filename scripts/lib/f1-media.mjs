/**
 * Shared tables and helpers for talking to the OpenF1 API and the Formula 1
 * media library.
 *
 * Both scripts/refresh-data.mjs (rebuilds the dataset and the images) and
 * scripts/fetch-assets.mjs (downloads the images only) use these, so the two
 * always agree on file names and on which round is which.
 */

export const TEAM_BASE = {
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
export const TEAM_SLUG = {
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

/**
 * Proper circuit names and host cities, by Grand Prix. OpenF1's
 * `circuit_short_name` is a mix of real circuit names ("Hungaroring") and plain
 * city names ("Melbourne", "Austin"), which reads badly when the question is
 * "name this circuit" — and it is occasionally just wrong for a round that
 * hasn't run. Hand-written, like the team bases, and used in preference to the
 * API values.
 */
export const CIRCUITS = {
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

/**
 * Rounds where the API's own meeting name or circuit is wrong or ambiguous.
 *
 * The October round is billed by the API as another "Bahrain Grand Prix", but
 * it is the Malaysian round at Sepang — the official name says so ("Bahrain
 * Grand Prix in Malaysia"). Keyed on the official name so it survives the
 * season the API changes the year in the string.
 */
export const ROUND_OVERRIDES = [
  {
    test: (officialName) => /IN MALAYSIA/i.test(officialName),
    name: 'Malaysian Grand Prix',
    circuit: 'Sepang International Circuit',
    location: 'Kuala Lumpur',
  },
]

/**
 * Where the API's `circuit_image` is wrong, fix it here by Grand Prix name —
 * `null` means "ship no map at all", which is the honest answer when F1 hasn't
 * drawn the circuit yet.
 */
export const MAP_OVERRIDE = {
  // OpenF1 points this at a Barcelona-Catalunya icon that 404s. F1's long-standing
  // "Spain" icon is that same layout, so use it under an honest name.
  'Barcelona Grand Prix': { file: 'Spain carbon.png', slug: 'barcelona-catalunya' },
  // Madrid's Madring is new for 2026 and has no icon yet — and OpenF1 hands back
  // the "Spain" one, which is Barcelona's layout. No map beats the wrong map.
  'Spanish Grand Prix': null,
}

export const ICON_BASE =
  'https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Track%20icons%204x3'

/** "…/Great Britain carbon.png" → "great-britain" */
export const mapSlug = (url) =>
  decodeURIComponent(url.split('/').pop())
    .replace(/\.(png|webp|jpe?g)$/i, '')
    .replace(/\s*carbon$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * The extension a downloaded file should be saved under. Most of the media
 * library serves PNG; the newer track artwork (Kuala Lumpur, for one) is
 * WebP, and saving it as `.png` serves it with the wrong MIME type.
 */
export const extFor = (url) => (/\.webp(\?|$)/i.test(url) ? '.webp' : '.png')

export const logoUrl = (slug, year) =>
  `https://media.formula1.com/image/upload/c_fit,w_320,h_320/q_auto,f_png/common/f1/${year}/${slug}/${year}${slug}logowhite.webp`

/** The 4-column headshot is a couple of times larger than the 1-column one. */
export const headshotUrl = (url) => url.replace('.transform/1col/', '.transform/4col/')
