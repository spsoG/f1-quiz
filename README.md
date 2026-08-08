# F1 2026 — Grid & Quiz

A React app for browsing the 2026 Formula 1 grid and testing yourself on it.

- **Drivers** — every driver on the grid as a card with their official headshot, name, team, car number and points. Search by name, team, country, three-letter code or number; filter by team; sort by championship position, number, surname or team. Clicking a card opens a detail panel with championship position, points, wins, podiums, team base, date of birth, age and a jump link to their team mate.
- **Standings** — the drivers' and constructors' championships, both computed from real race results.
- **Quiz** — multiple-choice rounds drawn from the driver data. Pick a topic (mixed, photos, teams, numbers, nationalities) and a length (5, 10 or all 22), answer, and get instant grading plus a full review at the end.
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
race and sprint result of the season. Headshots are the official Formula 1 media
images, downloaded into `public/drivers/` so the app needs no network at runtime.

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

### Two data caveats

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

So after adding a driver to the grid, add their `bios.<id>` entry — and their
country to `countries`/`countriesOf` if it's new. Anything you miss shows in
English rather than breaking.

Quiz questions store translation keys plus variables, not finished sentences, and
their answer options hold the canonical English data values. Grading is a plain
string comparison that never depends on the active language, and switching
language mid-question relabels it in place.

## Layout

```
public/drivers/         official headshots, one PNG per driver
scripts/refresh-data.mjs  regenerates the dataset and headshots from OpenF1
src/data/drivers.js     generated: SEASON, DRIVERS, TEAMS
src/i18n/               i18next setup, locale files and data-value helpers
src/quiz/generate.js    question builders and quiz assembly
src/components/         Drivers, DriverCard, DriverDetail, Standings, Quiz, LanguageSwitch
```
