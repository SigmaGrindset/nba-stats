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
const { getTeamLinks, scrapeTeam } = require("./scrape/teams");
const { scrapePlayer, scrapePlayerStats } = require("./scrape/players");
const {
  scrapeGame,
  regularSeasonGameIds,
  postSeasonGameIds,
  playInGameIds
} = require("./scrape/games");
const deriveCareerStats = require("./aggregate/careerStats");
const logger = require("./config/logger");

const SEASON = process.env.SEASON || "2025-26";

// Optional caps, so the whole pipeline can be smoke-tested in a couple of minutes
// before committing to a full run. Unset means "everything".
const TEAM_LIMIT = parseInt(process.env.TEAM_LIMIT, 10) || Infinity;
const GAME_LIMIT = parseInt(process.env.GAME_LIMIT, 10) || Infinity;

// Politeness delays. nba.com tolerates a steady trickle; stats.nba.com throttles
// harder, which is why player career stats get the longer pause.
const GAME_DELAY_MS = 300;
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
      logger.warn(`player page for ${playerId} doesn't exist, skipping`);
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
  stats.created++;
  return "created";
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

  for (const playerId of playerIds) {
    if (!knownPlayers.has(playerId)) {
      // a player who appeared in a game but isn't on a current roster
      await addPlayer(playerId, undefined, {});
      knownPlayers.add(playerId);
      await sleep(PLAYER_DELAY_MS);
    }
  }

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

async function populateGames(allGameIds, label) {
  const gameIds = allGameIds.slice(0, GAME_LIMIT);
  logger.info(`scraping ${gameIds.length} ${label} candidates`);

  for (const [index, gameId] of gameIds.entries()) {
    try {
      const result = await addGame(gameId);
      if (index % 25 === 0 || result === "created") {
        logger.info(
          `[${label} ${index + 1}/${gameIds.length}] ${gameId} ${result} ` +
          `(created ${stats.created}, skipped ${stats.skipped}, failed ${stats.failed})`
        );
      }
    } catch (err) {
      if (err.permanent) {
        // enumerated id that never existed - expected for postseason candidates
        continue;
      }
      logger.error(`failed to add game ${gameId}: ${err.message}`);
      stats.failed++;
    }
    await sleep(GAME_DELAY_MS);
  }
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
  logger.info(`connected to db, target="${target}", season=${SEASON}`);

  const started = Date.now();

  if (target === "teams" || target === "all") {
    await populateTeams();
  }

  if (target === "games" || target === "all") {
    await populateGames(regularSeasonGameIds(SEASON), "regular season");
    await populateGames(playInGameIds(SEASON), "play-in");
    await populateGames(postSeasonGameIds(SEASON), "playoffs");
  }

  if (target === "summary") {
    await summarize();
    await mongoose.disconnect();
    return;
  }

  // Fill in any career stats stats.nba.com wouldn't serve, from the box scores
  // we already hold. Runs last because it needs the games to be in place.
  if (target === "careerstats" || target === "all" || target === "games") {
    await deriveCareerStats(SEASON);
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
