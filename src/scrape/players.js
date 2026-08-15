const { fetchNextData, fetchStatsResultSet } = require("./main");
const { scrapeUntilSuccessful } = require("../utils/scrape_utils");

function createLinkFromPlayerId(playerId) {
  return `/player/${playerId}/`;
}

function headshotURL(playerId) {
  return `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`;
}

// nba.com sends birthdates without a timezone ("1998-03-03T00:00:00"), which
// JS parses as local midnight. Reading that back as UTC shifts the date a day
// earlier, so pin it to UTC explicitly.
function parseUTC(dateString) {
  if (!dateString) {
    return null;
  }
  const normalized = /(Z|[+-]\d{2}:?\d{2})$/.test(dateString)
    ? dateString
    : `${dateString}Z`;
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
}

function formatBirthdate(birthdate) {
  const date = parseUTC(birthdate);
  if (!date) {
    return undefined;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

function ageFromBirthdate(birthdate) {
  const born = parseUTC(birthdate);
  if (!born) {
    return undefined;
  }
  const now = new Date();
  let age = now.getUTCFullYear() - born.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - born.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < born.getUTCDate())) {
    age -= 1;
  }
  return String(age);
}

// nba.com leaves fields blank for fringe roster players, and sometimes sends the
// literal string "null" rather than an empty one - which would otherwise be
// stored and rendered verbatim. Returning undefined lets the Player model apply
// its "Unknown" defaults instead.
function cleanValue(value) {
  if (value === null || value === undefined) {
    return undefined;
  }
  const text = String(value).trim();
  if (!text || text.toLowerCase() === "null" || text.toLowerCase() === "undefined") {
    return undefined;
  }
  return text;
}

function formatDraft(info) {
  if (!info.DRAFT_YEAR || info.DRAFT_YEAR === "Undrafted") {
    return "Undrafted";
  }
  return `${info.DRAFT_YEAR} Rd ${info.DRAFT_ROUND} Pick ${info.DRAFT_NUMBER}`;
}

function formatExperience(seasonExp) {
  if (seasonExp === undefined || seasonExp === null) {
    return undefined;
  }
  return seasonExp === 0 ? "Rookie" : String(seasonExp);
}

// The Player model stores these as strings and only accepts a stats subdocument
// when ppg/rpg/apg are all present, so a player with no recorded season is
// stored without one rather than failing validation.
function buildStats(stats) {
  if (!stats || stats.PTS === undefined || stats.REB === undefined || stats.AST === undefined) {
    return undefined;
  }
  const built = {
    ppg: String(stats.PTS),
    rpg: String(stats.REB),
    apg: String(stats.AST)
  };
  if (stats.PIE !== undefined && stats.PIE !== null) {
    built.pie = String(stats.PIE);
  }
  return built;
}

async function scrapePlayer(playerId) {
  const pageProps = await fetchNextData(createLinkFromPlayerId(playerId));
  const player = pageProps.player;

  if (!player || !player.info || !player.info.PERSON_ID) {
    // nba.com redirects unknown ids to the players index
    return {};
  }

  const info = player.info;

  return {
    id: info.PERSON_ID,
    name: info.DISPLAY_FIRST_LAST,
    imageURL: headshotURL(info.PERSON_ID),
    // the views render this verbatim, and the original scraper captured it with
    // the "#" already attached
    number: info.JERSEY !== undefined && cleanValue(info.JERSEY) !== undefined
      ? `#${cleanValue(info.JERSEY)}`
      : undefined,
    position: cleanValue(info.POSITION),
    height: cleanValue(info.HEIGHT),
    weight: cleanValue(info.WEIGHT),
    country: cleanValue(info.COUNTRY),
    last_attended: cleanValue(info.SCHOOL) || cleanValue(info.LAST_AFFILIATION),
    birthdate: formatBirthdate(info.BIRTHDATE),
    draft: formatDraft(info),
    experience: formatExperience(info.SEASON_EXP),
    age: ageFromBirthdate(info.BIRTHDATE),
    stats: buildStats(player.stats)
  };
}

// PlayerCareerStats.handlePlayerStats expects { type, seasons: [...] } where each
// season's keys already match the model's columns. stats.nba.com returns exactly
// those columns, so lowercasing the headers is the whole transformation.
const CAREER_TYPES = {
  regSeason: {
    resultSet: "SeasonTotalsRegularSeason",
    type: "Career Regular Season Stats"
  },
  playoffs: {
    resultSet: "SeasonTotalsPostSeason",
    type: "Career Playoffs Stats"
  }
};

function toSeasonRows(rows) {
  return rows.map(row => ({
    season_id: row.season_id,
    team: row.team_abbreviation,
    player_age: row.player_age,
    gp: row.gp,
    gs: row.gs,
    min: row.min,
    pts: row.pts,
    fgm: row.fgm,
    fga: row.fga,
    fg_pct: row.fg_pct,
    fg3m: row.fg3m,
    fg3a: row.fg3a,
    fg3_pct: row.fg3_pct,
    ftm: row.ftm,
    fta: row.fta,
    ft_pct: row.ft_pct,
    oreb: row.oreb,
    dreb: row.dreb,
    reb: row.reb,
    ast: row.ast,
    stl: row.stl,
    blk: row.blk,
    tov: row.tov,
    pf: row.pf
  }));
}

async function scrapePlayerStats(playerId) {
  const stats = { regSeason: undefined, playoffs: undefined };

  for (const [key, config] of Object.entries(CAREER_TYPES)) {
    const rows = await fetchStatsResultSet(
      "/stats/playercareerstats",
      { PerMode: "PerGame", PlayerID: playerId, LeagueID: "00" },
      config.resultSet
    );
    if (rows.length) {
      stats[key] = { type: config.type, seasons: toSeasonRows(rows) };
    }
  }

  return stats;
}

module.exports.scrapePlayer = scrapeUntilSuccessful(scrapePlayer);
// Few attempts on purpose. When stats.nba.com is throttling, retries don't help,
// and each one costs a full timeout - so the caller's circuit breaker detects the
// outage quickly instead of stalling the run player by player.
module.exports.scrapePlayerStats = scrapeUntilSuccessful(scrapePlayerStats, 3);
module.exports.createLinkFromPlayerId = createLinkFromPlayerId;
module.exports.headshotURL = headshotURL;
module.exports.CAREER_TYPES = CAREER_TYPES;
