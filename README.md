# NBA Stats

A server-rendered NBA statistics site. Browse all 30 teams, their rosters, every player's
career numbers, and the full box score of every game in the season.

**Live:** https://nba-stats-orcin.vercel.app

---

## What it does

| Page | Route | Content |
|------|-------|---------|
| Home | `/` | Landing page with search |
| Teams | `/teams` | All 30 franchises |
| Team | `/team/:teamId` | Record, league ranks, roster, every game played, franchise background |
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
│└────────── season type (2 regular, 4 playoffs, 5 play-in)
└─────────── league (00 = NBA)
```

That makes a season's games directly enumerable, so ingestion doesn't depend on schedule
endpoints — which matters, because nba.com's public schedule rolls over to the upcoming
season the moment the previous one ends.

Career stats come from `stats.nba.com`, which rate-limits by IP and can refuse for hours
at a time. Requests are paced and retried with exponential backoff, and a circuit breaker
stops asking once it has clearly stopped answering — otherwise a single run could spend
hours timing out player by player.

Because that source can't be relied on, career numbers for the scraped season are also
derivable without it: `src/aggregate/careerStats.js` rebuilds them from the box scores
already in the database using a MongoDB aggregation, and inserts only the rows that are
missing. Shooting percentages are computed from summed makes and attempts rather than by
averaging per-game percentages, and games started are counted from the box score (only the
five starters carry a position in nba.com's feed).

## Running locally

**Requirements:** Node.js 20+, and a MongoDB database (Atlas free tier is enough).

```bash
git clone https://github.com/SigmaGrindset/nba-stats.git
cd nba-stats
npm install

cp .env.example .env      # then fill in MONGO_URI
```

Populate the database — this takes roughly an hour, and is safe to re-run since it skips
anything already stored:

```bash
npm run scrape:teams        # 30 teams, rosters, player bios and career stats
npm run scrape:games        # ~1,230 regular season games, plus play-in and playoffs
npm run scrape:careerstats  # backfill career stats from box scores if needed
npm run scrape:summary      # print collection counts
```

`TEAM_LIMIT` and `GAME_LIMIT` cap how much is fetched, which is useful for checking the
whole pipeline works before committing to a full run:

```bash
TEAM_LIMIT=1 GAME_LIMIT=5 npm run scrape
```

`SEASON` selects which season to ingest (default `2025-26`).

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
| `/api/game` | `gameId` or `teamId` |
| `/api/player-career-stats` | `playerId` |
| `/api/player-game-stats` | any of `playerId`, `teamId`, `gameId` |

```bash
curl 'http://localhost:3000/api/team?name=Boston%20Celtics'
curl 'http://localhost:3000/api/player-game-stats?gameId=0022500001'
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

Data covers the 2025-26 season. The scraper is deliberately polite — it paces requests and
backs off on failure — so a full run is slow by design.

Career stats on the deployed instance are the derived kind described above, so they cover
the scraped season rather than a player's full career. `stats.nba.com` blocks the IP the
scrape ran from; re-running `npm run scrape:teams` from an unblocked network backfills the
real multi-season tables in place, without disturbing anything else.
