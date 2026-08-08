# F1 2026 — Grid & Quiz

A React app for browsing the 2026 Formula 1 grid and testing yourself on it.

- **Drivers** — every driver on the grid as a card with their official headshot, name, team, car number and points. Search by name, team, country, three-letter code or number; filter by team; sort by championship position, number, surname or team. Clicking a card opens a detail panel with championship position, points, wins, podiums, team base, date of birth, age and a jump link to their team mate.
- **Standings** — the drivers' and constructors' championships, both computed from real race results.
- **Quiz** — multiple-choice rounds drawn from the driver and race data. Pick a topic (mixed, photos, teams, numbers, nationalities, race winners, circuits) and a length (5, 10 or all 22), answer, and get instant grading plus a full review at the end. Questions are illustrated wherever the picture isn't the answer: the team logo above team questions, a flag above "who's from this country?", the circuit map above the winner and circuit questions, headshots beside driver names, and flags beside the country options.
  - **Race winners** asks who won each round of the season so far, naming the circuit and host city alongside the Grand Prix — "Who won the Belgian Grand Prix at Spa-Francorchamps, Stavelot?". There's a harder variant that shows the map with no name attached, one that names only the circuit and city, and a reverse question ("Which of these Grands Prix did Kimi Antonelli win?"). Wrong answers are drawn from the drivers who have actually won a race, so the round is a real test rather than a process of elimination.
  - **Circuits** is about the tracks themselves: name the circuit from its layout, work out which Grand Prix it hosts, say what city it's in, or go the other way from a named Grand Prix to its circuit. It covers the whole calendar, not just the rounds already run.
- **English and Ukrainian**, switchable from the header at any time — including mid-quiz.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm run lint
```

## Where the data comes from

`src/data/drivers.js` is generated from the [OpenF1 API](https://openf1.org). The
line-up, car numbers, team colours and headshot URLs come from the most recent
race session; championship points, wins and podiums are computed by summing every
race and sprint result of the season. Headshots and team logos are the official
Formula 1 media images, downloaded into `public/drivers/` and `public/teams/` so
the app needs no network at runtime.

Logos are the white-on-transparent variant, which is what suits the dark UI —
each team's slug lives in `TEAM_SLUG` in the refresh script, and every driver
carries a `teamLogo` path alongside their `teamColour` and `teamBase`. If F1
hasn't published a logo for a season yet, the refresh warns and keeps the file
already on disk rather than failing the run.

The data currently in the repo is from after the 2026 Hungarian Grand Prix
(26 July 2026) — 22 drivers across 11 teams, 11 rounds completed.

To refresh it after later races:

```bash
node scripts/refresh-data.mjs        # current year
node scripts/refresh-data.mjs 2027   # or an explicit season
```

The script re-fetches everything and re-downloads the headshots, but preserves
the hand-written `country`, `flag`, `dob` and `bio` fields by driver code, and
warns you about any driver missing them.

`src/data/races.js` is generated from the same run: the full Grand Prix calendar
with round number, name, country, circuit, host city, date, whether the weekend
has a sprint, and the winner as a driver id (`null` for a round that hasn't run
yet). Circuit maps are F1's track icons, downloaded into `public/circuits/`.

Circuit names and host cities come from the hand-written `CIRCUITS` table in the
refresh script rather than the API, which returns a mix of real circuit names
("Hungaroring") and bare city names ("Melbourne", "Austin") — fine as a label,
useless when the question is *name this circuit*. Add a row there for any new
round; anything missing falls back to the API values.

### Data caveats

- **Circuit maps need two fixes.** OpenF1 points the Barcelona Grand Prix at an
  icon URL that 404s; F1's long-standing "Spain" icon *is* the
  Barcelona-Catalunya layout, so that's used under its own name. Madrid's Madring
  is new for 2026 and has no icon yet — and OpenF1 hands back the "Spain" one,
  which is Barcelona's layout, so that round ships with no map rather than the
  wrong circuit. Both live in `MAP_OVERRIDE` in the refresh script; a race with
  no map is simply left out of the winner questions.
- **Some future rounds carry provisional detail.** The 2026 Bahrain Grand Prix
  comes back from the API as `circuit_short_name: "Kuala Lumpur"`, which is why
  circuit names and cities are taken from the `CIRCUITS` table instead. Winners
  only ever come from completed races, so nothing provisional reaches the quiz.

- **Arvid Lindblad has no published headshot.** F1's media library returns its
  grey silhouette placeholder for him, so his card shows that. He is flagged
  `hasPhoto: false` and excluded from photo-based quiz questions, since guessing
  a silhouette isn't a fair question. The refresh script re-detects this
  automatically by file size.
- **Some portraits show a previous team's race suit.** F1 doesn't always reshoot
  drivers who switch teams mid-career — Sergio Pérez and Isack Hadjar, for
  example, appear in their old liveries. The team name and colour shown next to
  the photo are always the current ones.

## Languages

The app ships English (`en`) and Ukrainian (`uk`) via
[i18next](https://www.i18next.com) / react-i18next. The header switch writes the
choice to `localStorage` under `f1quiz.lang`; with nothing stored, the browser's
own language decides.

```
src/i18n/index.js          i18next setup and the LANGUAGES list
src/i18n/locales/en.json   English UI strings — the reference copy
src/i18n/locales/uk.json   Ukrainian UI strings, plus the data translations below
src/i18n/data.js           helpers that translate values out of src/data/drivers.js
```

**`src/data/drivers.js` stays English and stays the single source of truth**, so
`refresh-data.mjs` keeps working untouched. The values in it that need
translating live in the locale files instead, keyed by the English value or by
driver id, and fall back to the English original when a key is missing — which is
why `en.json` carries no data entries at all:

| Key in `uk.json` | Covers | Example |
| --- | --- | --- |
| `countries` | nationalities, nominative | `Italy` → `Італія` |
| `countriesOf` | the same, genitive, for "flag of …" and "… Grand Prix" | `Italy` → `Італії` |
| `bases` | team headquarters | `Maranello, Italy` → `Маранелло, Італія` |
| `bios` | driver biographies, keyed by driver id | `ver` → … |
| `races` | Grand Prix names | `Hungarian Grand Prix` → `Гран-прі Угорщини` |
| `circuits` | circuit names | `Hungaroring` → `Хунгароринг` |
| `locations` | host cities | `Budapest` → `Будапешт` |

So after adding a driver to the grid, add their `bios.<id>` entry — and their
country to `countries`/`countriesOf` if it's new. A new Grand Prix needs `races`,
`circuits` and `locations` entries. Anything you miss shows in English rather
than breaking.

Quiz questions store translation keys plus variables, not finished sentences, and
their answer options hold the canonical English data values. Grading is a plain
string comparison that never depends on the active language, and switching
language mid-question relabels it in place.

## Layout

```
public/drivers/         official headshots, one PNG per driver
public/teams/           official team logos, one PNG per team
public/circuits/        F1 track icons, one PNG per circuit
scripts/refresh-data.mjs  regenerates the dataset, headshots, logos and maps
src/data/drivers.js     generated: SEASON, DRIVERS, TEAMS
src/data/races.js       generated: RACES, RUN_RACES
src/i18n/               i18next setup, locale files and data-value helpers
src/quiz/generate.js    question builders and quiz assembly
src/components/         Drivers, DriverCard, DriverDetail, Standings, Quiz, LanguageSwitch
```
