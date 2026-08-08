import { DRIVERS, TEAMS, SEASON } from '../data/drivers.js'
import { RACES, RUN_RACES } from '../data/races.js'

const shuffle = (items) => {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Pick `count` distinct values from `pool`, keyed by `key`, excluding `taken`. */
const distractors = (pool, count, key, taken) => {
  const seen = new Set(taken)
  const out = []
  for (const item of shuffle(pool)) {
    const value = key(item)
    if (seen.has(value)) continue
    seen.add(value)
    out.push(item)
    if (out.length === count) break
  }
  return out
}

const withPhoto = DRIVERS.filter((d) => d.hasPhoto)

const year = SEASON.year

const driverById = Object.fromEntries(DRIVERS.map((d) => [d.id, d]))

/** The drivers who have actually won a Grand Prix this season. */
const raceWinners = [...new Set(RUN_RACES.map((r) => r.winner))].map((id) => driverById[id])

/**
 * "Who won?" is no test if three of the four names have never won a race, so
 * draw the wrong answers from the other winners first and only pad from the
 * wider grid early in a season, when barely anyone has won yet.
 */
const winnerDistractors = (champion) => {
  const picked = distractors(raceWinners, 3, (d) => d.name, [champion.name])
  if (picked.length === 3) return picked
  const taken = [champion.name, ...picked.map((d) => d.name)]
  return [...picked, ...distractors(DRIVERS, 3 - picked.length, (d) => d.name, taken)]
}

/**
 * Every builder returns a question:
 *   { promptKey, promptVars, reviewKey, media, options, correct, optionKind,
 *     optionPhotos, optionFlags, explainKey, explainVars, subject }
 *
 * Text is stored as translation keys plus variables and is resolved at render
 * time, so switching language mid-quiz relabels a question in place. `options`
 * and `correct` hold the canonical English data values — grading is a plain
 * string comparison and never depends on the active language; `optionKind`
 * tells the renderer which of them have translations of their own, and the
 * optional `optionPhotos` / `optionFlags` map an option to a headshot or a flag
 * to show beside it.
 *
 * `media` is rendered above the prompt — a photo, a blurred photo, a car number,
 * a team logo or a flag. It only ever shows something the question isn't asking
 * for.
 * `reviewKey` replaces the prompt on the results screen, where the media is gone
 * and "this driver" / "this number" no longer means anything.
 */
const BUILDERS = {
  photo: [
    (driver) => ({
      promptKey: 'quiz.prompts.photoWho',
      promptVars: { name: driver.name },
      reviewKey: 'quiz.review.photoWho',
      media: { kind: 'photo', src: driver.photo },
      optionKind: 'driver',
      correct: driver.name,
      options: distractors(DRIVERS, 3, (d) => d.name, [driver.name]).map((d) => d.name),
      subject: driver,
      explainKey: 'quiz.explain.driverTeamNumber',
      explainVars: { name: driver.name, team: driver.team, number: driver.number },
    }),
    (driver) => ({
      promptKey: 'quiz.prompts.photoBlur',
      promptVars: { name: driver.name },
      reviewKey: 'quiz.review.photoBlur',
      media: { kind: 'photo', src: driver.photo, blurred: true },
      optionKind: 'driver',
      correct: driver.name,
      options: distractors(DRIVERS, 3, (d) => d.name, [driver.name]).map((d) => d.name),
      subject: driver,
      explainKey: 'quiz.explain.driverTeamNumber',
      explainVars: { name: driver.name, team: driver.team, number: driver.number },
    }),
    (driver) => ({
      promptKey: 'quiz.prompts.photoTeam',
      promptVars: { name: driver.name },
      reviewKey: 'quiz.review.photoTeam',
      media: { kind: 'photo', src: driver.photo },
      optionKind: 'team',
      correct: driver.team,
      options: distractors(TEAMS, 3, (t) => t.name, [driver.team]).map((t) => t.name),
      subject: driver,
      explainKey: 'quiz.explain.thatIs',
      explainVars: { name: driver.name, team: driver.team },
    }),
  ],

  teams: [
    // No logo on this one — the team is the answer, so showing it would give it away.
    (driver) => ({
      promptKey: 'quiz.prompts.teamOf',
      promptVars: { name: driver.name, year },
      optionKind: 'team',
      correct: driver.team,
      options: distractors(TEAMS, 3, (t) => t.name, [driver.team]).map((t) => t.name),
      subject: driver,
      explainKey: 'quiz.explain.linesUp',
      explainVars: { name: driver.name, team: driver.team, base: driver.teamBase },
    }),
    (driver) => {
      const team = TEAMS.find((t) => t.name === driver.team)
      const mate = team.drivers.find((d) => d.id !== driver.id)
      return {
        promptKey: 'quiz.prompts.teamMate',
        promptVars: { name: driver.name, team: driver.team },
        media: { kind: 'logo', src: driver.teamLogo, team: driver.team },
        optionKind: 'driver',
        correct: mate.name,
        options: distractors(
          DRIVERS.filter((d) => d.team !== driver.team),
          3,
          (d) => d.name,
          [mate.name],
        ).map((d) => d.name),
        subject: mate,
        explainKey: 'quiz.explain.pairing',
        explainVars: { name: driver.name, mate: mate.name, team: driver.team, year },
      }
    },
    (driver) => ({
      promptKey: 'quiz.prompts.driverOfTeam',
      promptVars: { team: driver.team },
      media: { kind: 'logo', src: driver.teamLogo, team: driver.team },
      optionKind: 'driver',
      correct: driver.name,
      options: distractors(
        DRIVERS.filter((d) => d.team !== driver.team),
        3,
        (d) => d.name,
        [driver.name],
      ).map((d) => d.name),
      subject: driver,
      explainKey: 'quiz.explain.alongside',
      explainVars: {
        name: driver.name,
        team: driver.team,
        mate: TEAMS.find((t) => t.name === driver.team).drivers.find((d) => d.id !== driver.id).name,
      },
    }),
  ],

  numbers: [
    (driver) => ({
      promptKey: 'quiz.prompts.numberOf',
      promptVars: { name: driver.name },
      optionKind: 'number',
      correct: String(driver.number),
      options: distractors(DRIVERS, 3, (d) => d.number, [driver.number]).map((d) => String(d.number)),
      subject: driver,
      explainKey: 'quiz.explain.runsNumber',
      explainVars: { name: driver.name, number: driver.number, team: driver.team },
    }),
    (driver) => {
      const others = distractors(DRIVERS, 3, (d) => d.name, [driver.name])
      return {
        promptKey: 'quiz.prompts.driverOfNumber',
        promptVars: { number: driver.number },
        reviewKey: 'quiz.review.driverOfNumber',
        // Deliberately not tinted with the team colour — that would give the answer away.
        media: { kind: 'number', value: driver.number },
        optionKind: 'driver',
        correct: driver.name,
        options: others.map((d) => d.name),
        // A headshot can't hint at a car number, so it's safe to show here —
        // unlike the photo round, where it would be the answer.
        optionPhotos: Object.fromEntries([driver, ...others].map((d) => [d.name, d.photo])),
        subject: driver,
        explainKey: 'quiz.explain.numberBelongs',
        explainVars: { number: driver.number, name: driver.name, team: driver.team },
      }
    },
  ],

  countries: [
    // No flag above the prompt here — this driver's flag is the answer. It goes
    // beside the options instead, where all four are shown and none is a tell.
    (driver) => {
      const others = distractors(DRIVERS, 3, (d) => d.country, [driver.country])
      return {
        promptKey: 'quiz.prompts.countryOf',
        promptVars: { name: driver.name },
        optionKind: 'country',
        correct: driver.country,
        options: others.map((d) => d.country),
        optionFlags: Object.fromEntries([driver, ...others].map((d) => [d.country, d.flag])),
        subject: driver,
        explainKey: 'quiz.explain.flagOf',
        explainVars: { name: driver.name, country: driver.country, flag: driver.flag },
      }
    },
    (driver) => ({
      promptKey: 'quiz.prompts.driverOfCountry',
      promptVars: { country: driver.country },
      // The prompt already names the country, so the flag only restates it.
      media: { kind: 'flag', value: driver.flag, country: driver.country },
      optionKind: 'driver',
      correct: driver.name,
      options: distractors(
        DRIVERS.filter((d) => d.country !== driver.country),
        3,
        (d) => d.name,
        [driver.name],
      ).map((d) => d.name),
      subject: driver,
      explainKey: 'quiz.explain.entry',
      explainVars: { name: driver.name, flag: driver.flag, country: driver.country, year },
    }),
  ],
}

/**
 * The winners topic is the one whose subject is a race rather than a driver —
 * everything else about a question is the same.
 */
/** Everything a winner question says about the race it's asking about. */
const raceVars = (race, champion) => ({
  name: champion.name,
  race: race.name,
  team: champion.team,
  round: race.round,
  circuit: race.circuit,
  location: race.location,
  country: race.country,
  year,
})

/** The four driver options for a "who won?" question, with their headshots. */
const winnerOptions = (champion) => {
  const others = winnerDistractors(champion)
  return {
    optionKind: 'driver',
    correct: champion.name,
    options: others.map((d) => d.name),
    optionPhotos: Object.fromEntries([champion, ...others].map((d) => [d.name, d.photo])),
    subject: champion,
  }
}

BUILDERS.winners = [
  (race) => {
    const champion = driverById[race.winner]
    return {
      promptKey: 'quiz.prompts.winnerOf',
      promptVars: raceVars(race, champion),
      media: { kind: 'map', src: race.map },
      ...winnerOptions(champion),
      explainKey: 'quiz.explain.wonRace',
      explainVars: raceVars(race, champion),
    }
  },

  // The map is the whole question here — the Grand Prix is deliberately unnamed,
  // so the review screen names it instead.
  (race) => {
    const champion = driverById[race.winner]
    return {
      promptKey: 'quiz.prompts.winnerAtCircuit',
      promptVars: raceVars(race, champion),
      reviewKey: 'quiz.prompts.winnerOf',
      media: { kind: 'map', src: race.map },
      ...winnerOptions(champion),
      explainKey: 'quiz.explain.wonRace',
      explainVars: raceVars(race, champion),
    }
  },

  (race) => {
    const champion = driverById[race.winner]
    return {
      promptKey: 'quiz.prompts.winnerAtNamedCircuit',
      promptVars: raceVars(race, champion),
      reviewKey: 'quiz.prompts.winnerOf',
      ...winnerOptions(champion),
      explainKey: 'quiz.explain.wonRace',
      explainVars: raceVars(race, champion),
    }
  },

  (race) => {
    const champion = driverById[race.winner]
    // Every wrong answer must be a race somebody else won, or the question has
    // two right answers. Skip it when the winner has swept too much of the season.
    const others = distractors(
      RUN_RACES.filter((r) => r.winner !== race.winner),
      3,
      (r) => r.name,
      [race.name],
    )
    if (others.length < 3) return null
    return {
      promptKey: 'quiz.prompts.raceWonBy',
      promptVars: raceVars(race, champion),
      media: { kind: 'photo', src: champion.photo },
      optionKind: 'race',
      correct: race.name,
      options: others.map((r) => r.name),
      subject: champion,
      explainKey: 'quiz.explain.wonRace',
      explainVars: raceVars(race, champion),
    }
  },
]

/** Circuits are asked about whether or not the race has been run yet. */
const mappedRaces = RACES.filter((r) => r.map)

/**
 * Shared tail of a circuit question. `explainMedia` is what the feedback row
 * shows once the answer is in — a driver question has a headshot to fall back
 * on, a circuit question doesn't, so it names the layout explicitly.
 */
const circuitCommon = (race) => ({
  subject: race,
  explainMedia: { kind: 'map', src: race.map },
  explainKey: 'quiz.explain.circuit',
  explainVars: {
    circuit: race.circuit,
    location: race.location,
    race: race.name,
    country: race.country,
  },
})

const circuitVars = (race) => ({
  race: race.name,
  circuit: race.circuit,
  location: race.location,
})

BUILDERS.circuits = [
  (race) => ({
    promptKey: 'quiz.prompts.whichCircuit',
    promptVars: circuitVars(race),
    reviewKey: 'quiz.review.whichCircuit',
    media: { kind: 'map', src: race.map },
    optionKind: 'circuit',
    correct: race.circuit,
    options: distractors(mappedRaces, 3, (r) => r.circuit, [race.circuit]).map((r) => r.circuit),
    ...circuitCommon(race),
  }),

  (race) => ({
    promptKey: 'quiz.prompts.whichRaceCircuit',
    promptVars: circuitVars(race),
    reviewKey: 'quiz.review.whichRaceCircuit',
    media: { kind: 'map', src: race.map },
    optionKind: 'race',
    correct: race.name,
    options: distractors(mappedRaces, 3, (r) => r.name, [race.name]).map((r) => r.name),
    ...circuitCommon(race),
  }),

  (race) => ({
    promptKey: 'quiz.prompts.whereIsCircuit',
    promptVars: circuitVars(race),
    reviewKey: 'quiz.review.whereIsCircuit',
    media: { kind: 'map', src: race.map },
    optionKind: 'location',
    correct: race.location,
    options: distractors(mappedRaces, 3, (r) => r.location, [race.location]).map((r) => r.location),
    ...circuitCommon(race),
  }),

  // No map above the prompt — this one goes the other way, from the named Grand
  // Prix to its circuit, and only reveals the layout in the feedback.
  (race) => ({
    promptKey: 'quiz.prompts.circuitOfRace',
    promptVars: circuitVars(race),
    optionKind: 'circuit',
    correct: race.circuit,
    options: distractors(mappedRaces, 3, (r) => r.circuit, [race.circuit]).map((r) => r.circuit),
    ...circuitCommon(race),
  }),
]

export const TOPIC_IDS = ['mixed', 'photo', 'teams', 'numbers', 'countries', 'winners', 'circuits']

/**
 * The subjects a topic draws its questions from. Photo rounds need a real
 * headshot; winner rounds are about races rather than drivers, and two of their
 * three builders show the circuit map, so a race without one is left out.
 */
const poolFor = (topic) =>
  topic === 'photo'
    ? withPhoto
    : topic === 'winners'
      ? RUN_RACES.filter((r) => r.map)
      : topic === 'circuits'
        ? mappedRaces
        : DRIVERS

/** Which pool a topic draws from — driver topics deliberately share one. */
const kindOf = (topic) => (topic === 'winners' || topic === 'circuits' ? topic : 'drivers')

const reseed = { drivers: () => DRIVERS, winners: () => poolFor('winners'), circuits: () => mappedRaces }

/** Builders may return null when a subject can't make a fair question of them. */
const buildOne = (topic, subject) => {
  for (const build of shuffle(BUILDERS[topic])) {
    const q = build(subject)
    if (q) return { ...q, topic, options: shuffle([q.correct, ...q.options]) }
  }
  return null
}

const MIXED_TOPICS = ['photo', 'teams', 'numbers', 'countries', 'winners', 'circuits']

/**
 * Build a quiz of `count` questions. Subjects are drawn without repeats until
 * the pool is exhausted, so a short quiz never asks about the same driver — or
 * the same race — twice. Drivers share one pool across topics so a mixed quiz
 * doesn't circle back to the same driver; races keep their own.
 */
export const buildQuiz = (topic, count) => {
  const topics = topic === 'mixed' ? MIXED_TOPICS : [topic]
  const questions = []
  const pools = { drivers: [], winners: [], circuits: [] }

  for (let i = 0; i < count; i++) {
    const chosenTopic = topic === 'mixed' ? topics[i % topics.length] : topic
    const kind = kindOf(chosenTopic)
    const valid = poolFor(chosenTopic)

    let candidates = pools[kind].filter((s) => valid.includes(s))
    if (candidates.length === 0) {
      pools[kind] = shuffle(reseed[kind]())
      candidates = pools[kind].filter((s) => valid.includes(s))
    }

    const subject = candidates[0]
    pools[kind] = pools[kind].filter((s) => s !== subject)
    const question = buildOne(chosenTopic, subject)
    if (question) questions.push(question)
  }

  return shuffle(questions)
}

export const MAX_QUESTIONS = DRIVERS.length
