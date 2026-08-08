import { DRIVERS, TEAMS, SEASON } from '../data/drivers.js'

const shuffle = (items) => {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const pick = (items) => items[Math.floor(Math.random() * items.length)]

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

/**
 * Every builder returns a question:
 *   { promptKey, promptVars, reviewKey, media, options, correct, optionKind,
 *     optionPhotos, explainKey, explainVars, subject }
 *
 * Text is stored as translation keys plus variables and is resolved at render
 * time, so switching language mid-quiz relabels a question in place. `options`
 * and `correct` hold the canonical English data values — grading is a plain
 * string comparison and never depends on the active language; `optionKind`
 * tells the renderer which of them have translations of their own, and the
 * optional `optionPhotos` maps an option to a headshot to show beside it.
 *
 * `media` is rendered above the prompt — a photo, a blurred photo, a car number
 * or a team logo. It only ever shows something the question isn't asking for.
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
    (driver) => ({
      promptKey: 'quiz.prompts.countryOf',
      promptVars: { name: driver.name },
      optionKind: 'country',
      correct: driver.country,
      options: distractors(DRIVERS, 3, (d) => d.country, [driver.country]).map((d) => d.country),
      subject: driver,
      explainKey: 'quiz.explain.flagOf',
      explainVars: { name: driver.name, country: driver.country, flag: driver.flag },
    }),
    (driver) => ({
      promptKey: 'quiz.prompts.driverOfCountry',
      promptVars: { country: driver.country },
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

export const TOPIC_IDS = ['mixed', 'photo', 'teams', 'numbers', 'countries']

/** A driver pool that is valid for the given topic — photo rounds need a real headshot. */
const poolFor = (topic) => (topic === 'photo' ? withPhoto : DRIVERS)

const buildOne = (topic, driver) => {
  const build = pick(BUILDERS[topic])
  const q = build(driver)
  return {
    ...q,
    topic,
    options: shuffle([q.correct, ...q.options]),
  }
}

/**
 * Build a quiz of `count` questions. Drivers are drawn without repeats until the
 * grid is exhausted, so a short quiz never asks about the same driver twice.
 */
export const buildQuiz = (topic, count) => {
  const topics = topic === 'mixed' ? ['photo', 'teams', 'numbers', 'countries'] : [topic]
  const questions = []
  let pool = []

  for (let i = 0; i < count; i++) {
    const chosenTopic = topic === 'mixed' ? topics[i % topics.length] : topic
    const valid = poolFor(chosenTopic)
    let candidates = pool.filter((d) => valid.includes(d))
    if (candidates.length === 0) {
      pool = shuffle(DRIVERS)
      candidates = pool.filter((d) => valid.includes(d))
    }
    const driver = candidates[0]
    pool = pool.filter((d) => d.id !== driver.id)
    questions.push(buildOne(chosenTopic, driver))
  }

  return shuffle(questions)
}

export const MAX_QUESTIONS = DRIVERS.length
