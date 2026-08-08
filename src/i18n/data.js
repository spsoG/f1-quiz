/**
 * src/data/drivers.js stays the single source of truth and stays in English —
 * scripts/refresh-data.mjs rewrites it and carries the hand-written bios over.
 * Translations for those values live in the locale files, keyed by the English
 * value (countries, team bases) or by driver id (bios), and fall back to the
 * English original when a key is missing. So English needs no entries at all.
 */

/** Country in the nominative — "Italy" → "Італія". */
export const tCountry = (t, name) => t(`countries.${name}`, { defaultValue: name })

/** Country in the genitive, for "flag of …" / "… Grand Prix" — "Italy" → "Італії". */
export const tCountryOf = (t, name) => t(`countriesOf.${name}`, { defaultValue: tCountry(t, name) })

/** Team headquarters — "Maranello, Italy" → "Маранелло, Італія". */
export const tBase = (t, base) => t(`bases.${base}`, { defaultValue: base })

/** Driver biography, keyed by driver id. */
export const tBio = (t, driver) => t(`bios.${driver.id}`, { defaultValue: driver.bio })

/** Grand Prix name — "Hungarian Grand Prix" → "Гран-прі Угорщини". */
export const tRace = (t, name) => t(`races.${name}`, { defaultValue: name })

/** Circuit name — "Hungaroring" → "Хунгароринг". */
export const tCircuit = (t, name) => t(`circuits.${name}`, { defaultValue: name })

/** Host city — "Budapest" → "Будапешт". */
export const tLocation = (t, name) => t(`locations.${name}`, { defaultValue: name })

/**
 * Quiz answer options hold canonical English data values so grading stays a
 * plain string comparison; only the rendering is localised.
 */
const OPTION_TRANSLATORS = {
  country: tCountry,
  race: tRace,
  circuit: tCircuit,
  location: tLocation,
}

export const tOption = (t, value, kind) => OPTION_TRANSLATORS[kind]?.(t, value) ?? value

/**
 * Interpolation variables on a question hold canonical English data values too.
 * The ones that have translations of their own are resolved here; a `country`
 * var also yields `countryOf`, the genitive form some sentences need.
 */
export const resolveVars = (t, vars = {}) => {
  const out = { ...vars }
  if (vars.country) {
    out.country = tCountry(t, vars.country)
    out.countryOf = tCountryOf(t, vars.country)
  }
  if (vars.base) out.base = tBase(t, vars.base)
  if (vars.race) out.race = tRace(t, vars.race)
  if (vars.circuit) out.circuit = tCircuit(t, vars.circuit)
  if (vars.location) out.location = tLocation(t, vars.location)
  return out
}
