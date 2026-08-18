const { fetchNextData } = require("./main");
const { scrapeUntilSuccessful } = require("../utils/scrape_utils");

// Which games exist, and which ids they carry, comes from schedule.js.
// utils/season.js documents the id format and derives the season back out of it.

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

// How much of a game a row actually represents: one that took the floor beats a
// recorded DNP, which beats an empty placeholder.
function rowWeight(player) {
  const minutes = (player.statistics || {}).minutes;
  if (minutes && minutes !== "PT00M00.00S" && minutes !== "0:00") {
    return 2;
  }
  return player.comment && player.comment.trim() ? 1 : 0;
}

// nba.com sometimes lists the same player twice in one box score, under one
// personId: a rename leaves both spellings side by side, one of them an empty
// placeholder. Seen as "Bobby Portis Jr." next to "Bobby Portis" with his actual
// 14:42 and 11 points, and as "Lester Quiñones" next to "Lester Quinones".
//
// It is intermittent rather than fixed - games that returned two rows during a
// scrape have since served one - so this can't be pinned to a list of known ids;
// the feed just has to be treated as capable of repeating a player. Two rows for
// one player breaks the one-row-per-player-per-game index, so the fuller row
// wins and the placeholder is dropped. A Map keeps the feed's original order.
function dedupePlayers(players) {
  const byId = new Map();
  for (const player of players) {
    const seen = byId.get(player.personId);
    if (!seen || rowWeight(player) > rowWeight(seen)) {
      byId.set(player.personId, player);
    }
  }
  return [...byId.values()];
}

// db.js expects { teamId, playerStats: [...] } with the team totals as the last row.
function buildTeamBoxScore(team) {
  const playerStats = dedupePlayers(team.players || []).map(player => {
    const didNotPlay = player.comment && player.comment.trim();
    // db.js falls back to this when nba.com has dropped the player's own page
    const name = [player.firstName, player.familyName].filter(Boolean).join(" ");

    if (didNotPlay) {
      return { player: player.personId, name, status: player.comment.trim() };
    }
    // only the five starters carry a position in this feed; the bench has ""
    const started = Boolean(player.position && player.position.trim());
    return { player: player.personId, name, started, ...mapStats(player.statistics) };
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
    // Not flagged permanent, deliberately. An empty page used to be the expected
    // answer for enumerated ids that never existed, but every id now comes from
    // a schedule card that reported the game final, so it means one of two
    // things and they are indistinguishable from here: nba.com hiccupping
    // (0022000816 came back empty once and served fine three times after), or a
    // page it will never render (0022500259 through 0022500261 are empty every
    // time, while the rest of that night's games are fine). Retrying costs a few
    // seconds and recovers the first; the second fails and gets reported. Called
    // permanent, the first was silently dropped from the run - the worse of the
    // two mistakes, because nothing said so.
    throw new Error(`no game data for ${gameId}`);
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
module.exports.gameURL = gameURL;
