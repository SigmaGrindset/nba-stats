# NBA Stats

A server-rendered NBA statistics site. Browse all 30 teams, their rosters, every player's
career numbers, and the full box score of every game since the 2019-20 season.

**Live:** https://nba-stats-orcin.vercel.app

---

## What it does

| Page | Route | Content |
|------|-------|---------|
| Home | `/` | Landing page with search |
| Teams | `/teams` | All 30 franchises |
| Team | `/team/:teamId` | Record, league ranks, roster, games by season, franchise background |
| Player | `/player/:playerId` | Bio, current averages, career stats split by regular season and playoffs |
| Game | `/game/:gameId` | Full box score for both teams, plus arena, attendance and officials |
| Search | `/search/:query` | Fuzzy autocomplete across players and teams |

There's also a small read-only JSON API — see [HTTP API](#http-api).

## Architecture

The project is two independent programs that share a database and never talk to each
other directly:

```
   ┌──────────────────┐         ┌──────────────┐         ┌───────────────────┐
   │  scraper         │ writes  │              │  reads  │  web app          │
   │  src/scrape/*    ├────────►│  MongoDB     │◄────────┤  Express + EJS    │
   │  src/db.js       │         │  (Atlas)     │         │  src/app.js       │
   └────────┬─────────┘         └──────────────┘         └─────────┬─────────┘
            │                                                      │
      reads │                                              serves  │
            ▼                                                      ▼
        nba.com                                                 browser
```

Keeping ingestion out of the request path means a slow or failing scrape can never affect
page loads, and the web app has no dependency on nba.com at runtime. It also lets the two
halves be deployed differently: the app runs as a serverless function, while the scraper
runs on demand from a workstation.

### Web app

Classic MVC. A request flows `routes → controllers → models → EJS view`, and pages are
delivered as complete HTML with no client-side data fetching.

```
src/
  app.js              Express setup, middleware, error handling
  routes/             URL → controller mapping (team, game, player, search, api)
  controllers/        Query the models, render a view or JSON
  models/             Mongoose schemas
  views/              EJS templates
  public/             Compiled CSS, client JS, static assets
  scrape/             nba.com ingestion (not used at request time)
  aggregate/          Career stats rebuilt from stored box scores
  utils/              Season/game-id helpers, worker pool, retry wrapper
  config/             Logger and cached database connection
```

### Data model

Seven collections. `BoxScoreStats` is stored once per player per game and once per team
per game, and referenced rather than embedded so the same shape serves both.

```
Team ──┬──< TeamCurrentRoster >── Player
       │                            │
       │                            ├──< PlayerCareerStats
       │                            │
       └──< Game >──────────────────┴──< PlayerGameStats >── BoxScoreStats
```

### Scraping

nba.com is a Next.js application that embeds each page's data as JSON in a
`__NEXT_DATA__` script tag. The scraper reads that JSON rather than parsing rendered
HTML — the markup's CSS-module class names are content-hashed at build time and change on
every deploy, so any selector-based scraper breaks within weeks.

Game identifiers are structured rather than arbitrary:

```
0022500001
││└┬┘└─┬─┘
││ │   └──── sequence within the season
││ └──────── season start year (2025 → "25")
│└────────── season type (2 regular, 4 playoffs, 5 play-in, 6 NBA Cup final)
└─────────── league (00 = NBA)
```

Because the id carries the season, nothing stores it a second time on every document:
`src/utils/season.js` reads it back out, which is how the career stats aggregation and the
team page's season filter scope their queries.

Which ids exist comes from `src/scrape/schedule.js`. nba.com's `/games` page is a date
picker, and asking it for one date returns that day's game cards *and* a
`{ "YYYY-MM-DD": gameCount }` map covering the whole calendar year — so one request per
year yields the exact set of dates worth visiting, and nothing is fetched on spec.

Deriving the ids from the id pattern instead would need the length of each season's
sequence, and that isn't a constant: 2019-20 stopped dead in March and resumed with eight
seeding games a team, 2020-21 was 72 games rather than 82, the play-in only exists from
2019-20 on, and the NBA Cup final has a season type of its own. Every card is also
labelled with its type, which is how preseason, All-Star and Summer League games are kept
out.

Discovery and the game scrape both run through a worker pool
(`src/utils/pool.js`). nba.com serves this happily in parallel — measured 4.3 pages/s with
eight requests in flight and no failures — and past that the local connection saturates
before the server objects.

First sightings of a player go through their own gate, because each one also costs two
requests to `stats.nba.com`, which throttles far harder. While that host is still being
called they are fetched one at a time; once the circuit breaker below has given up on it,
nothing but nba.com is left and the gate widens. That matters more than it sounds — a game
waits on every unfamiliar name in its box score, and the first night of a new season is
twenty of them at once.

Career stats come from `stats.nba.com`, which rate-limits by IP and can refuse for hours
at a time. Requests are paced and retried with exponential backoff, and a circuit breaker
stops asking once it has clearly stopped answering — otherwise a single run could spend
hours timing out player by player.

Because that source can't be relied on, career numbers are also derivable without it:
`src/aggregate/careerStats.js` rebuilds them from the box scores already in the database
using a MongoDB aggregation, one season at a time, and inserts only the rows that are
missing. Shooting percentages are computed from summed makes and attempts rather than by
averaging per-game percentages; games started are counted from the box score (only the
five starters carry a position in nba.com's feed); and a row's age is the player's age on
February 1st of that season, not their age today.

The NBA Cup final is stored but deliberately left out of these totals — it has its own
season type precisely because it doesn't count towards regular season records.

## Running locally

**Requirements:** Node.js 22 (pinned in `engines`, so Vercel builds on the same major
that development uses), and a MongoDB database (Atlas free tier is enough).

```bash
git clone https://github.com/SigmaGrindset/nba-stats.git
cd nba-stats
npm install

cp .env.example .env      # then fill in MONGO_URI
```

Populate the database — seven seasons is around 8,900 games and takes a couple of hours. It
is safe to re-run and to interrupt, since it skips anything already stored:

```bash
npm run scrape:teams        # 30 teams, rosters, player bios and career stats
npm run scrape:games        # every game from 2019-20 on, with play-in and playoffs
npm run scrape:careerstats  # backfill career stats from box scores if needed
npm run scrape:summary      # print collection counts
```

| Variable | Default | Effect |
|----------|---------|--------|
| `SEASONS` | `2019-20` … `2025-26` | Comma-separated list of seasons to ingest |
| `SEASON` | — | Shorthand for a single season |
| `CONCURRENCY` | `6` | Pages in flight while discovering and scraping games |
| `TEAM_LIMIT` / `GAME_LIMIT` | unlimited | Cap how much is fetched |

The limits are there to check the whole pipeline works before committing to a full run:

```bash
SEASON=2025-26 TEAM_LIMIT=1 GAME_LIMIT=5 npm run scrape
```

Scraping further back than 2019-20 works, but the data thins out as you go: plus/minus
stops at 1996-97, turnovers and offensive rebounds around 1985-86, steals and blocks at
1973-74, and rebounds and assists at 1960-61 — a box score from 1946-47 carries points and
shooting only. The starters heuristic degrades too, over-reporting through the 2000s and
returning nobody at all before that, and arena names and attendance for old games come
back filled in with present-day values. 2019-20 is where all of that is still sound.

Then start the app:

```bash
npm run watch:css         # optional: recompile SCSS on change
npm start                 # http://localhost:3000
```

### Search indexes

The search page uses MongoDB Atlas Search, which needs an index named `default` on both
the `teams` and `players` collections. Create them once the scrape has run:

```bash
node src/createSearchIndexes.js
```

The script is idempotent and waits until Atlas reports each index queryable — worth doing,
because querying an index that is still building returns no results rather than an error,
which is indistinguishable from a broken search page.

The definition is also in [`atlas/search-index.json`](atlas/search-index.json) if you
prefer the Atlas UI's JSON editor. Without the indexes, search errors while the rest of
the site works normally.

## HTTP API

All endpoints are `GET` and take query parameters. Rate limited to 100 requests per 15
minutes per IP.

| Endpoint | Parameters |
|----------|-----------|
| `/api/team` | `teamId` or `name` |
| `/api/player` | `playerId`, `name`, `number` or `teamId` |
| `/api/game` | `gameId` or `teamId`, optionally `season` |
| `/api/player-career-stats` | `playerId` |
| `/api/player-game-stats` | any of `playerId`, `teamId`, `gameId`, optionally `season` |

The two endpoints that return collections take `limit` (200 by default, 1000 at most) and
`skip`. Unpaginated, a query like "every box score line this team has produced" is tens of
thousands of documents with their references populated — more than the serverless response
limit allows, and more than any caller wanted in one go.

```bash
curl 'http://localhost:3000/api/team?name=Boston%20Celtics'
curl 'http://localhost:3000/api/player-game-stats?gameId=0022500001'
curl 'http://localhost:3000/api/game?teamId=1610612738&season=2021-22'
```

## Testing

| Layer | Tool | Command |
|-------|------|---------|
| Scrapers and aggregation | Jest | `npm test` |
| End-to-end | Cypress | `npm run cypress:run` |
| Load / stress | k6 | `k6 run test/load_test.js` |

The scraper tests run against live nba.com, so they fail loudly when the site changes
shape rather than silently returning empty data. The aggregation test runs against an
ephemeral MongoDB (`mongodb-memory-server`, which downloads a binary on first run) and
checks the arithmetic against hand-computed values — including that shooting percentages
come from summed totals rather than averaged per-game percentages.

Cypress specs assert rendered pages against the database directly, so they catch
mismatches between what was scraped and what is displayed. The k6 suite covers smoke,
load, stress, spike and soak profiles, with results shipped to InfluxDB and visualised in
Grafana:

```bash
docker compose up          # InfluxDB + Grafana on :5000
k6 run --out influxdb=http://localhost:8086/k6 test/load_test.js
```

## Deployment

The app deploys to Vercel as a serverless function (`api/index.js` exports the Express
app; `vercel.json` routes all traffic to it). Set `MONGO_URI` in the project's environment
variables, and allow network access from anywhere on the Atlas cluster so the functions
can connect.

The Mongoose connection is cached on the global object so that warm invocations reuse it
instead of opening a new connection per request.

`GET /api/health` reports document counts and is hit by a daily cron declared in
`vercel.json`. That is not decoration: Atlas pauses a free cluster after 30 days with no
connections, so an unvisited deployment would otherwise take itself offline.

A `Dockerfile` is also included, which runs the app under PM2 in cluster mode for
conventional (non-serverless) hosting.

## Notes

Data covers the 2019-20 season onwards. The scraper backs off on failure and keeps new
player lookups single-file, so a full run is slow by design.

Career stats on the deployed instance are the derived kind described above — one row per
season the scrape covers, rather than a player's full career. `stats.nba.com` blocks the IP
the scrape ran from; re-running `npm run scrape:teams` from an unblocked network backfills
the real all-time tables in place, without disturbing anything else.
