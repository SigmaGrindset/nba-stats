require("dotenv").config();

const mongoose = require("mongoose");
const BoxScoreStats = require("./models/BoxScoreStats");
const Game = require("./models/Game");
const Player = require("./models/Player");
const PlayerCareerStats = require("./models/PlayerCareerStats");
const PlayerGameStats = require("./models/PlayerGameStats");
const Team = require("./models/Team");
const TeamCurrentRoster = require("./models/TeamCurrentRoster");

const { sleep } = require("./utils/scrape_utils");
const { runPool } = require("./utils/pool");
const { getTeamLinks, scrapeTeam } = require("./scrape/teams");
const { scrapePlayer, scrapePlayerStats, headshotURL } = require("./scrape/players");
const { scrapeGame } = require("./scrape/games");
const { discoverGames } = require("./scrape/schedule");
const deriveCareerStats = require("./aggregate/careerStats");
const logger = require("./config/logger");

// Every season from 2019-20 on. SEASONS overrides the list ("2018-19,2019-20");
// SEASON is kept as the single-season shorthand the older scripts used.
const DEFAULT_SEASONS = [
  "2019-20", "2020-21", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26"
];

function configuredSeasons() {
  const configured = process.env.SEASONS || process.env.SEASON;
  if (!configured) {
    return DEFAULT_SEASONS;
  }
  return configured.split(",").map(season => season.trim()).filter(Boolean);
}

const SEASONS = configuredSeasons();

// Optional caps, so the whole pipeline can be smoke-tested in a couple of minutes
// before committing to a full run. Unset means "everything".
const TEAM_LIMIT = parseInt(process.env.TEAM_LIMIT, 10) || Infinity;
const GAME_LIMIT = parseInt(process.env.GAME_LIMIT, 10) || Infinity;

// Six seasons is ~7,800 game pages at half a megabyte each, which a sequential
// loop would spend the better part of a day on. nba.com serves this happily in
// parallel - measured 4.3 pages/s at eight in flight with no failures - and past
// that the local connection saturates rather than the server complaining. Six is
// the steady state for a run measured in hours; the concurrency limit is the
// rate control, so there is no per-game sleep on top of it.
const GAME_CONCURRENCY = parseInt(process.env.CONCURRENCY, 10) || 6;

// Politeness delays for the sequential stages. stats.nba.com throttles harder
// than nba.com, which is why player career stats get the longer pause.
const PLAYER_DELAY_MS = 1200;
const TEAM_DELAY_MS = 1500;

const stats = {
  created: 0,
  skipped: 0,
  failed: 0,
  careerStatsOk: 0,
  careerStatsFailed: 0,
  careerStatsSkipped: 0
};

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not set. Copy .env.example to .env and fill it in.");
}

async function addPlayer(playerId, teamId, data = {}) {
  const existingPlayer = await Player.findOne({ _id: playerId });

  if (!existingPlayer) {
    const playerData = await scrapePlayer(playerId);
    if (!playerData.id) {
      // nba.com no longer serves a page for everyone who turns up in an older
      // box score. Without a document the autopopulated ref on their stat lines
      // resolves to null, and the game page dereferences it - so store what the
      // box score itself knows rather than leaving the reference dangling.
      if (!data.name) {
        logger.warn(`player page for ${playerId} doesn't exist and the box score has no name, skipping`);
        return;
      }
      await Player.create({
        _id: playerId,
        name: data.name,
        imageURL: headshotURL(playerId),
        pageColor: data.pageColor
      });
      logger.warn(`player page for ${playerId} doesn't exist - stored "${data.name}" from the box score`);
      return;
    }
    const player = await Player.create({
      ...playerData,
      _id: playerData.id,
      pageColor: data.pageColor
    });
    logger.info(`player created: ${player.name}`);
  }

  if (teamId) {
    // retired or waived players won't belong to a roster
    await TeamCurrentRoster.assignPlayer(playerId, teamId);
  }

  await addPlayerCareerStats(playerId);
}

// stats.nba.com refuses in long stretches. Each attempt can burn minutes across
// retries, so once it has clearly stopped answering, stop asking for the rest of
// the run rather than spending hours timing out player by player.
// limit kept low: each failure costs several timeouts, so at 8 an outage would
// take ~45 minutes just to detect. At 3 it costs a few minutes.
const careerStatsBreaker = { consecutiveFailures: 0, open: false, limit: 3 };

async function addPlayerCareerStats(playerId) {
  if (careerStatsBreaker.open) {
    stats.careerStatsSkipped++;
    return;
  }

  try {
    const careerStats = await scrapePlayerStats(playerId);
    if (careerStats.regSeason) {
      await PlayerCareerStats.handlePlayerStats(careerStats.regSeason, playerId);
    }
    if (careerStats.playoffs) {
      await PlayerCareerStats.handlePlayerStats(careerStats.playoffs, playerId);
    }
    careerStatsBreaker.consecutiveFailures = 0;
    stats.careerStatsOk++;
  } catch (err) {
    // a missing career table shouldn't abort a run that is otherwise succeeding
    careerStatsBreaker.consecutiveFailures++;
    stats.careerStatsFailed++;
    logger.warn(`career stats unavailable for player ${playerId}: ${err.message}`);

    if (careerStatsBreaker.consecutiveFailures >= careerStatsBreaker.limit) {
      careerStatsBreaker.open = true;
      logger.error(
        `stats.nba.com failed ${careerStatsBreaker.limit} times in a row - skipping career ` +
        `stats for the rest of this run. Re-run "npm run scrape:teams" later to backfill.`
      );
    }
  }
}

/**
 * New players are fetched behind their own gate, separate from the game pool.
 *
 * A first sighting costs one nba.com request plus two to stats.nba.com, and that
 * second host throttles far harder - so while it is still being called, players
 * go one at a time behind the politeness delay. Once the circuit breaker has
 * given up on it there is nothing left but nba.com, which the game pool is
 * already hitting six wide, so the gate opens up and the delay goes away.
 *
 * It matters more than it looks: a game waits on every unfamiliar name in its
 * box score, and the first night of a new season is 20 of them at once. Held to
 * one at a time that put the whole run behind the player queue.
 *
 * The map collapses duplicates - a player debuting on a busy night is found by
 * several games at once, and without it they would each scrape him and then race
 * to insert the same document.
 *
 * Only genuinely unknown ids get here. addGameStats checks the whole box score
 * against the database in one query first, so the common case never queues.
 */
const PLAYER_CONCURRENCY = 4;

const playerQueue = { inFlight: new Map(), active: 0, waiting: [] };

function playerSlots() {
  return careerStatsBreaker.open ? PLAYER_CONCURRENCY : 1;
}

function acquirePlayerSlot() {
  if (playerQueue.active < playerSlots()) {
    playerQueue.active++;
    return Promise.resolve();
  }
  return new Promise(resolve => playerQueue.waiting.push(resolve));
}

function releasePlayerSlot() {
  playerQueue.active--;
  while (playerQueue.waiting.length > 0 && playerQueue.active < playerSlots()) {
    playerQueue.active++;
    playerQueue.waiting.shift()();
  }
}

function ensurePlayer(playerId, name) {
  const queued = playerQueue.inFlight.get(playerId);
  if (queued) {
    return queued;
  }

  const task = (async () => {
    await acquirePlayerSlot();
    try {
      await addPlayer(playerId, undefined, { name });
      if (!careerStatsBreaker.open) {
        await sleep(PLAYER_DELAY_MS);
      }
    } finally {
      releasePlayerSlot();
    }
  })();

  // Callers see the rejection through `task`; this only stops an unawaited
  // moment from surfacing as an unhandled rejection. The map keeps failures too
  // - a page that won't load won't load 82 times either. Those games go
  // unstored and are retried whole on the next run.
  task.catch(() => {});
  playerQueue.inFlight.set(playerId, task);
  return task;
}

async function addGame(gameId) {
  // Raw driver query: Game autopopulates four refs, so the model version would
  // fetch two teams and two box scores just to answer "is this already stored".
  const existingGame = await Game.collection.findOne(
    { _id: gameId },
    { projection: { _id: 1 } }
  );
  if (existingGame) {
    stats.skipped++;
    return "skipped";
  }

  const gameData = await scrapeGame(gameId);

  const awayTotals = gameData.boxScore[0].playerStats.slice(-1)[0];
  const homeTotals = gameData.boxScore[1].playerStats.slice(-1)[0];
  const [awayTeamBoxScore, homeTeamBoxScore] = await BoxScoreStats.insertMany([
    { ...awayTotals },
    { ...homeTotals }
  ]);

  try {
    await Game.create({
      _id: gameData.id,
      date: gameData.date,
      dateEpoch: gameData.dateEpoch,
      location: gameData.location,
      summaryText: gameData.summaryText,
      summaryLocation: gameData.summaryLocation,
      attendance: gameData.attendance,
      officials: gameData.officials,
      awayTeam: gameData.boxScore[0].teamId,
      homeTeam: gameData.boxScore[1].teamId,
      homeTeamStats: homeTeamBoxScore._id,
      awayTeamStats: awayTeamBoxScore._id
    });

    await addGameStats(gameData);
  } catch (err) {
    // The game document is what makes a re-run skip this id, so a failure part
    // way through the box scores would otherwise leave the game permanently
    // half-written - present, and quietly missing players. Roll the whole thing
    // back and let the next run fetch it again from scratch.
    await discardGame(gameData.id, [awayTeamBoxScore._id, homeTeamBoxScore._id]);
    throw err;
  }

  stats.created++;
  return "created";
}

// Removes a game and everything hanging off it: both team box scores, every
// player's stat line, and the box score each of those points at.
async function discardGame(gameId, extraBoxScoreIds = []) {
  const rows = await PlayerGameStats.collection
    .find({ game: gameId }, { projection: { stats: 1 } })
    .toArray();

  const boxScoreIds = rows.map(row => row.stats).concat(extraBoxScoreIds).filter(Boolean);

  await PlayerGameStats.deleteMany({ game: gameId });
  await BoxScoreStats.deleteMany({ _id: { $in: boxScoreIds } });
  await Game.deleteOne({ _id: gameId });
}

/**
 * A box score holds around 28 players. Done one at a time through the models
 * this cost roughly 250 round trips to Atlas per game - PlayerGameStats
 * autopopulates all four of its refs, so merely asking whether a row existed
 * pulled back the game, both its teams and their box scores. Reads are batched
 * and issued through the raw driver to bypass autopopulate, and the writes go
 * out as two insertMany calls.
 */
async function addGameStats(gameData) {
  const rows = [];
  for (const teamStats of gameData.boxScore) {
    for (const playerStats of teamStats.playerStats) {
      if (playerStats.player === "totals") {
        continue;
      }
      rows.push({ playerStats, teamId: teamStats.teamId });
    }
  }
  if (rows.length === 0) {
    return;
  }

  const playerIds = rows.map(row => row.playerStats.player);

  const knownPlayers = new Set(
    (await Player.collection
      .find({ _id: { $in: playerIds } }, { projection: { _id: 1 } })
      .toArray()).map(doc => doc._id)
  );

  // players who appeared in a game but aren't on a current roster - retired,
  // waived, or (for older seasons) since traded away. The name comes along so a
  // player whose page nba.com has dropped can still be stored.
  const missing = new Map();
  for (const { playerStats } of rows) {
    if (!knownPlayers.has(playerStats.player)) {
      missing.set(playerStats.player, playerStats.name);
    }
  }
  await Promise.all([...missing].map(([playerId, name]) => ensurePlayer(playerId, name)));

  // check before creating the box scores so a re-run doesn't orphan documents
  const alreadyStored = new Set(
    (await PlayerGameStats.collection
      .find({ game: gameData.id, player: { $in: playerIds } }, { projection: { player: 1 } })
      .toArray()).map(doc => doc.player)
  );

  const boxScores = [];
  const playerGameStats = [];
  for (const { playerStats, teamId } of rows) {
    if (alreadyStored.has(playerStats.player)) {
      continue;
    }

    // generated up front so both documents can be built in one pass
    const statsId = new mongoose.Types.ObjectId();
    boxScores.push({ ...playerStats, _id: statsId });
    playerGameStats.push({
      game: gameData.id,
      player: playerStats.player,
      stats: statsId,
      team: teamId,
      started: Boolean(playerStats.started)
    });
  }

  if (boxScores.length === 0) {
    return;
  }

  // box scores first: PlayerGameStats.stats is required, so a crash between the
  // two leaves unreferenced box scores rather than dangling references
  await BoxScoreStats.insertMany(boxScores);
  await PlayerGameStats.insertMany(playerGameStats);
}

async function addTeam(link) {
  const teamData = await scrapeTeam(link);

  let team = await Team.findOne({ _id: teamData.id });
  if (!team) {
    team = await Team.create({ ...teamData, _id: teamData.id });
    logger.info(`team created: ${team.name}`);
  } else {
    await Team.updateOne({ _id: teamData.id }, { ...teamData });
    logger.info(`team updated: ${team.name}`);
  }

  for (const playerId of teamData.players) {
    try {
      await addPlayer(playerId, teamData.id, { pageColor: teamData.pageColor });
    } catch (err) {
      logger.error(`failed to add player ${playerId}: ${err.message}`);
      stats.failed++;
    }
    await sleep(PLAYER_DELAY_MS);
  }
}

async function populateTeams() {
  const allLinks = await getTeamLinks();
  const teamLinks = allLinks.slice(0, TEAM_LIMIT);
  logger.info(`scraping ${teamLinks.length} teams`);

  for (const [index, link] of teamLinks.entries()) {
    logger.info(`[team ${index + 1}/${teamLinks.length}] ${link}`);
    try {
      await addTeam(link);
    } catch (err) {
      logger.error(`failed to add team ${link}: ${err.message}`);
      stats.failed++;
    }
    await sleep(TEAM_DELAY_MS);
  }
}

async function populateGames(allGames) {
  const games = allGames.slice(0, GAME_LIMIT);
  const started = Date.now();
  let processed = 0;

  logger.info(`scraping ${games.length} games, ${GAME_CONCURRENCY} at a time`);

  await runPool(games, async game => {
    try {
      await addGame(game.id);
    } catch (err) {
      // the same context either way: an id on its own says nothing about which
      // game went missing, and that is the first thing worth knowing afterwards
      const where = `${game.season} ${game.type}, ${game.date}`;
      if (err.permanent) {
        // the game exists but isn't final - a postponement still on the calendar
        logger.warn(`no box score for ${game.id} (${where}): ${err.message}`);
      } else {
        logger.error(`failed to add game ${game.id} (${where}): ${err.message}`);
      }
      stats.failed++;
    }

    processed++;
    if (processed % 100 === 0 || processed === games.length) {
      const rate = processed / ((Date.now() - started) / 1000);
      const remaining = Math.round((games.length - processed) / rate / 60);
      logger.info(
        `[${processed}/${games.length}] ${game.season} ${game.date} - created ${stats.created}, ` +
        `skipped ${stats.skipped}, failed ${stats.failed} - ${rate.toFixed(1)}/s, ~${remaining} min left`
      );
    }
  }, GAME_CONCURRENCY);
}

async function summarize() {
  const counts = {
    teams: await Team.countDocuments(),
    players: await Player.countDocuments(),
    rosterEntries: await TeamCurrentRoster.countDocuments(),
    games: await Game.countDocuments(),
    playerGameStats: await PlayerGameStats.countDocuments(),
    careerStats: await PlayerCareerStats.countDocuments(),
    boxScores: await BoxScoreStats.countDocuments()
  };
  logger.info(`collection counts: ${JSON.stringify(counts, null, 2)}`);
  return counts;
}

async function main() {
  const target = process.argv[2] || "all";

  await mongoose.connect(process.env.MONGO_URI);
  logger.info(`connected to db, target="${target}", seasons=${SEASONS.join(", ")}`);

  const started = Date.now();

  if (target === "teams" || target === "all") {
    await populateTeams();
  }

  if (target === "games" || target === "all") {
    const { games, byBucket } = await discoverGames(SEASONS, { concurrency: GAME_CONCURRENCY });
    for (const season of SEASONS) {
      const buckets = byBucket[season];
      logger.info(`${season}: ${buckets ? JSON.stringify(buckets) : "no games found"}`);
    }
    await populateGames(games);
  }

  if (target === "summary") {
    await summarize();
    await mongoose.disconnect();
    return;
  }

  // Fill in any career stats stats.nba.com wouldn't serve, from the box scores
  // we already hold. Runs last because it needs the games to be in place, and
  // once per season because that's the grain PlayerCareerStats rows are stored at.
  if (target === "careerstats" || target === "all" || target === "games") {
    for (const season of SEASONS) {
      logger.info(`deriving career stats for ${season}`);
      await deriveCareerStats(season);
    }
  }

  await summarize();
  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  logger.info(`done in ${minutes} min - created ${stats.created}, skipped ${stats.skipped}, failed ${stats.failed}`);
  logger.info(
    `career stats: ${stats.careerStatsOk} ok, ${stats.careerStatsFailed} failed, ` +
    `${stats.careerStatsSkipped} skipped after circuit breaker opened`
  );

  await mongoose.disconnect();
}

main().catch(err => {
  logger.error(`populate failed: ${err.stack || err.message}`);
  process.exit(1);
});
