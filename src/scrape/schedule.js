const { fetchNextData } = require("./main");
const { scrapeUntilSuccessful } = require("../utils/scrape_utils");
const { runPool } = require("../utils/pool");
const logger = require("../config/logger");

// nba.com's /games page is a date picker. Asking it for one date returns that
// day's game cards *and* a { "YYYY-MM-DD": gameCount } map covering the whole
// calendar year - so a single request per year yields the exact set of dates
// worth visiting, and nothing is scraped on spec.
//
// This replaces enumerating ids from the <type><season><sequence> pattern.
// Enumeration only works when you already know how many games a season had, and
// that isn't a constant: 2020-21 was 72 games a team, not 82; the play-in didn't
// exist before it; and the NBA Cup final carries a season type of its own. Every
// card here is labelled with its season and type, so the ids arrive presorted.

// Card labels mapped to the type each one's id prefix encodes. Preseason (001),
// All-Star (003) and Summer League (league id 15, not the NBA at all) are
// deliberately absent: they aren't NBA games and don't belong in a team's
// schedule or a player's season averages.
const WANTED_SEASON_TYPES = {
  "Regular Season": "regular",
  "PlayIn": "playin",
  "Playoffs": "playoffs",
  // The NBA Cup final is the one tournament game that doesn't count towards
  // regular season records, which is why it has its own prefix (006) instead of
  // sitting in with the group-stage games. It's a real game with a real box
  // score so it is stored, but careerStats.js aggregates only 002 and 004, which
  // keeps it out of season averages exactly as the NBA treats it.
  "IST Championship": "cup"
};

const IGNORED_SEASON_TYPES = new Set(["Preseason", "All-Star", "Summer League"]);

const FINAL = 3; // gameStatus: 1 = scheduled, 2 = live, 3 = final

// A season spans two calendar years. 2019-20 ran into October 2020 and 2020-21
// didn't tip off until December, but both stay inside the two-year window.
function calendarYearsFor(seasons) {
  const years = new Set();
  for (const season of seasons) {
    const startYear = Number(String(season).split("-")[0]);
    if (!startYear) {
      throw new Error(`season should look like "2024-25", got "${season}"`);
    }
    years.add(startYear);
    years.add(startYear + 1);
  }
  return [...years].sort((a, b) => a - b);
}

async function fetchDatesWithGames(year) {
  // Any date in the year returns the same calendar; mid-November is inside every
  // NBA season, so the page it comes attached to is a useful one either way.
  const pageProps = await fetchNextData(`/games?date=${year}-11-15`);
  const calendar = (pageProps.allGamesInCurrentYear || {})[String(year)];
  if (!calendar) {
    throw new Error(`no calendar returned for ${year}`);
  }
  return Object.entries(calendar)
    .filter(([, count]) => count > 0)
    .map(([date]) => date)
    .sort();
}

async function fetchGamesOnDate(date) {
  const pageProps = await fetchNextData(`/games?date=${date}`);
  const modules = (pageProps.gameCardFeed || {}).modules || [];

  const games = [];
  for (const module of modules) {
    for (const card of module.cards || []) {
      const data = card.cardData;
      if (!data || !data.gameId) {
        continue;
      }

      const type = WANTED_SEASON_TYPES[data.seasonType];
      if (!type) {
        // Anything unrecognised is surfaced rather than dropped quietly: a
        // renamed label would otherwise take a whole season out of the scrape
        // with nothing in the log to say so.
        if (!IGNORED_SEASON_TYPES.has(data.seasonType)) {
          logger.warn(`unknown season type "${data.seasonType}" on ${date} (game ${data.gameId}) - skipped`);
        }
        continue;
      }

      games.push({
        id: data.gameId,
        date,
        type,
        season: data.seasonYear,
        status: data.gameStatus
      });
    }
  }
  return games;
}

const fetchDatesWithGamesRetrying = scrapeUntilSuccessful(fetchDatesWithGames);
const fetchGamesOnDateRetrying = scrapeUntilSuccessful(fetchGamesOnDate);

/**
 * Resolves a list of seasons ("2020-21", ...) to the finished NBA games they
 * contain, in chronological order.
 *
 * Returns { games, byBucket } where byBucket counts games per season and type,
 * which is the only cheap sanity check available on a run this size - a season
 * short of 1230 regular season games means dates went missing.
 */
async function discoverGames(seasons, { concurrency = 6 } = {}) {
  const wanted = new Set(seasons);

  const dates = [];
  for (const year of calendarYearsFor(seasons)) {
    const yearDates = await fetchDatesWithGamesRetrying(year);
    dates.push(...yearDates);
    logger.info(`calendar ${year}: ${yearDates.length} dates with games`);
  }

  const found = new Map();
  let visited = 0;

  async function visit(date, failures) {
    try {
      for (const game of await fetchGamesOnDateRetrying(date)) {
        if (wanted.has(game.season) && game.status === FINAL) {
          found.set(game.id, game);
        }
      }
    } catch (err) {
      failures.push(date);
      logger.warn(`could not read the schedule for ${date}: ${err.message}`);
    }
    visited++;
    if (visited % 100 === 0) {
      logger.info(`discovery: ${visited}/${dates.length} dates, ${found.size} games so far`);
    }
  }

  const failed = [];
  await runPool(dates, date => visit(date, failed), concurrency);

  // One quiet retry pass. nba.com answers the occasional request with a 503, and
  // a date lost here doesn't fail loudly later - it just silently removes a
  // night's games from the scrape. Serial, because a burst is what provoked it.
  if (failed.length) {
    logger.info(`retrying ${failed.length} dates that failed the first pass`);
    const stillFailed = [];
    for (const date of failed) {
      await visit(date, stillFailed);
    }
    if (stillFailed.length) {
      logger.error(`gave up on ${stillFailed.length} dates - their games are missing: ${stillFailed.join(", ")}`);
    }
  }

  const games = [...found.values()].sort((a, b) =>
    a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date));

  const byBucket = {};
  for (const game of games) {
    byBucket[game.season] = byBucket[game.season] || {};
    byBucket[game.season][game.type] = (byBucket[game.season][game.type] || 0) + 1;
  }

  return { games, byBucket };
}

module.exports.discoverGames = discoverGames;
module.exports.fetchDatesWithGames = fetchDatesWithGamesRetrying;
module.exports.fetchGamesOnDate = fetchGamesOnDateRetrying;
module.exports.calendarYearsFor = calendarYearsFor;
module.exports.WANTED_SEASON_TYPES = WANTED_SEASON_TYPES;
