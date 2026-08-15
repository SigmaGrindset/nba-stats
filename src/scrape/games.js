const { fetchNextData } = require("./main");
const { scrapeUntilSuccessful } = require("../utils/scrape_utils");

// NBA game ids are structured, not arbitrary:
//   <2-digit league><1-digit season type><2-digit season start year><5-digit sequence>
// e.g. 0022500001 = league 00, type 2 (regular season), season 2025-26, game 1.
// That means a season's games can be enumerated directly, which avoids the
// schedule endpoints entirely - useful because nba.com's public schedule rolls
// over to the upcoming season as soon as the previous one ends.
const SEASON_TYPES = {
  regular: "002",
  playoffs: "004",
  playin: "005"
};

const REGULAR_SEASON_GAMES = 1230; // 30 teams * 82 games / 2

function seasonSuffix(season) {
  // "2025-26" -> "25"
  const startYear = String(season).split("-")[0];
  return startYear.slice(-2);
}

function buildGameId(season, type, sequence) {
  const prefix = SEASON_TYPES[type];
  if (!prefix) {
    throw new Error(`unknown season type: ${type}`);
  }
  return `${prefix}${seasonSuffix(season)}${String(sequence).padStart(5, "0")}`;
}

function regularSeasonGameIds(season) {
  const ids = [];
  for (let i = 1; i <= REGULAR_SEASON_GAMES; i++) {
    ids.push(buildGameId(season, "regular", i));
  }
  return ids;
}

// Postseason sequence is 00<round><series><game>, with series numbered from 0
// (so the Finals are round 4, series 0). Rounds halve each time. Series end in
// four to seven games, so callers skip the candidates that don't resolve.
function postSeasonGameIds(season) {
  const ids = [];
  const seriesPerRound = { 1: 8, 2: 4, 3: 2, 4: 1 };
  for (const round of [1, 2, 3, 4]) {
    for (let series = 0; series < seriesPerRound[round]; series++) {
      for (let game = 1; game <= 7; game++) {
        ids.push(buildGameId(season, "playoffs", `${round}${series}${game}`));
      }
    }
  }
  return ids;
}

// The play-in uses the same round/series/game sequence as the postseason, but
// every series is a single game: round one is the 7v8 and 9v10 matchups in both
// conferences, round two the two elimination games between their losers and
// winners. Six games, and nba.com answers 503 rather than 404 for ids outside
// that set, so enumerating a wider space would look like an outage.
const PLAY_IN_SERIES_PER_ROUND = { 1: 4, 2: 2 };

function playInGameIds(season) {
  const ids = [];
  for (const round of Object.keys(PLAY_IN_SERIES_PER_ROUND)) {
    for (let series = 0; series < PLAY_IN_SERIES_PER_ROUND[round]; series++) {
      ids.push(buildGameId(season, "playin", `${round}${series}1`));
    }
  }
  return ids;
}

function gameURL(gameId) {
  return `/game/${gameId}`;
}

// "PT36M12.00S" and "36:12" both appear in NBA feeds depending on endpoint.
function normalizeMinutes(minutes) {
  if (!minutes) {
    return "0:00";
  }
  const iso = String(minutes).match(/^PT(\d+)M([\d.]+)S$/);
  if (iso) {
    return `${iso[1]}:${String(Math.floor(parseFloat(iso[2]))).padStart(2, "0")}`;
  }
  return String(minutes);
}

// Maps nba.com's verbose statistics object onto the short column names the
// BoxScoreStats model and the game view already use.
function mapStats(statistics) {
  const s = statistics || {};
  return {
    min: normalizeMinutes(s.minutes),
    fgm: s.fieldGoalsMade,
    fga: s.fieldGoalsAttempted,
    fg_pct: s.fieldGoalsPercentage,
    fg3m: s.threePointersMade,
    fg3a: s.threePointersAttempted,
    fg3_pct: s.threePointersPercentage,
    ftm: s.freeThrowsMade,
    fta: s.freeThrowsAttempted,
    ft_pct: s.freeThrowsPercentage,
    oreb: s.reboundsOffensive,
    dreb: s.reboundsDefensive,
    reb: s.reboundsTotal,
    ast: s.assists,
    stl: s.steals,
    blk: s.blocks,
    to: s.turnovers,
    pf: s.foulsPersonal,
    pts: s.points,
    plus_minus: s.plusMinusPoints === undefined || s.plusMinusPoints === null
      ? "-"
      : String(s.plusMinusPoints)
  };
}

// db.js expects { teamId, playerStats: [...] } with the team totals as the last row.
function buildTeamBoxScore(team) {
  const playerStats = (team.players || []).map(player => {
    const didNotPlay = player.comment && player.comment.trim();
    if (didNotPlay) {
      return { player: player.personId, status: player.comment.trim() };
    }
    // only the five starters carry a position in this feed; the bench has ""
    const started = Boolean(player.position && player.position.trim());
    return { player: player.personId, started, ...mapStats(player.statistics) };
  });

  playerStats.push({ player: "totals", ...mapStats(team.statistics) });

  return { teamId: team.teamId, playerStats };
}

function formatDate(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

function buildSummaryText(game) {
  const home = game.homeTeam;
  const away = game.awayTeam;
  const homeWon = (home.score || 0) >= (away.score || 0);
  const winner = homeWon ? home : away;
  const loser = homeWon ? away : home;
  const overtime = game.gameStatusText && game.gameStatusText.includes("OT")
    ? ` (${game.gameStatusText.split("/")[1]})`
    : "";
  return `${winner.teamCity} ${winner.teamName} ${winner.score}, ${loser.teamCity} ${loser.teamName} ${loser.score}${overtime}`;
}

async function scrapeGame(gameId) {
  const pageProps = await fetchNextData(gameURL(gameId));
  const game = pageProps.game;

  if (!game || !game.homeTeam || !game.awayTeam) {
    // Enumerated ids include candidates that never existed (sweeps, byes).
    // Flag as permanent so the retry wrapper doesn't back off on a known miss.
    const err = new Error(`no game data for ${gameId}`);
    err.permanent = true;
    throw err;
  }
  if (game.gameStatus !== 3) {
    // 1 = scheduled, 2 = live, 3 = final. Only finished games have a box score.
    const err = new Error(`game ${gameId} is not final (status ${game.gameStatus})`);
    err.permanent = true;
    throw err;
  }

  const arena = game.arena || {};
  const officials = (game.officials || []).map(o => o.name).filter(Boolean);

  return {
    id: game.gameId,
    date: formatDate(game.gameTimeUTC),
    dateEpoch: Date.parse(game.gameTimeUTC),
    location: [arena.arenaName, arena.arenaCity, arena.arenaState].filter(Boolean).join(", "),
    summaryLocation: [arena.arenaCity, arena.arenaState].filter(Boolean).join(", "),
    summaryText: buildSummaryText(game),
    officials: officials.length ? officials.join(", ") : "Not reported",
    attendance: game.attendance ? String(game.attendance) : "Not reported",
    // index 0 = away, index 1 = home (db.js relies on this ordering)
    boxScore: [buildTeamBoxScore(game.awayTeam), buildTeamBoxScore(game.homeTeam)]
  };
}

module.exports.scrapeGame = scrapeUntilSuccessful(scrapeGame);
module.exports.regularSeasonGameIds = regularSeasonGameIds;
module.exports.postSeasonGameIds = postSeasonGameIds;
module.exports.playInGameIds = playInGameIds;
module.exports.buildGameId = buildGameId;
module.exports.gameURL = gameURL;
