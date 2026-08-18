const PlayerGameStats = require("../models/PlayerGameStats");
const PlayerCareerStats = require("../models/PlayerCareerStats");
const Player = require("../models/Player");
const Team = require("../models/Team");
const logger = require("../config/logger");

// nba.com's own career table lives behind stats.nba.com, which rate-limits by IP
// and can refuse for long stretches. Every number in that table for the scraped
// season is already derivable from the box scores we store, so this rebuilds it
// with an aggregation instead of another network dependency.
//
// It only fills gaps: rows that already exist (from stats.nba.com, which carries
// full multi-season history) are left alone.

const SEASON_TYPES = {
  "002": "Career Regular Season Stats",
  "004": "Career Playoffs Stats"
};

// counting stats are averaged per game; shooting percentages must come from
// summed makes and attempts, since averaging per-game percentages is wrong
const AVERAGED = ["pts", "fgm", "fga", "fg3m", "fg3a", "ftm", "fta",
  "oreb", "dreb", "reb", "ast", "stl", "blk", "pf"];

function round(value, places) {
  if (value === null || value === undefined || isNaN(value)) {
    return 0;
  }
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function percentage(made, attempted) {
  return attempted > 0 ? round(made / attempted, 3) : 0;
}

// Player.age is whatever the player's age was on the day they were scraped, so
// using it directly would stamp today's age onto every season a player ever
// played. The NBA quotes a season's age as of February 1st, midway through it.
//
// birthdate is stored as the display string players.js formatted ("Mar 3, 1998"),
// which Date parses to local midnight - so the reference date is built with local
// accessors too rather than mixing the two calendars.
function ageDuringSeason(birthdate, season) {
  const born = new Date(birthdate);
  if (!birthdate || isNaN(born.getTime())) {
    return null;
  }
  const reference = new Date(Number(String(season).split("-")[0]) + 1, 1, 1);
  let age = reference.getFullYear() - born.getFullYear();
  if (reference.getMonth() < born.getMonth()
    || (reference.getMonth() === born.getMonth() && reference.getDate() < born.getDate())) {
    age -= 1;
  }
  return age;
}

function buildPipeline(seasonSuffix) {
  const averages = {};
  AVERAGED.forEach(field => {
    averages[field] = { $avg: `$box.${field}` };
  });

  return [
    // game ids encode league(2) + type(1) + season(2) + sequence(5)
    {
      $match: {
        $expr: {
          $and: [
            { $in: [{ $substrBytes: ["$game", 0, 3] }, Object.keys(SEASON_TYPES)] },
            { $eq: [{ $substrBytes: ["$game", 3, 2] }, seasonSuffix] }
          ]
        }
      }
    },
    {
      $lookup: {
        from: "boxscorestats",
        localField: "stats",
        foreignField: "_id",
        as: "box"
      }
    },
    { $unwind: "$box" },
    // rows carrying a status are DNPs and shouldn't count towards games played
    { $match: { "box.status": { $exists: false } } },
    {
      $addFields: {
        seasonType: { $substrBytes: ["$game", 0, 3] },
        // "38:30" -> 38.5
        minutesDecimal: {
          $let: {
            vars: { parts: { $split: [{ $ifNull: ["$box.min", "0:00"] }, ":"] } },
            in: {
              $add: [
                { $convert: { input: { $arrayElemAt: ["$$parts", 0] }, to: "double", onError: 0, onNull: 0 } },
                {
                  $divide: [
                    { $convert: { input: { $arrayElemAt: ["$$parts", 1] }, to: "double", onError: 0, onNull: 0 } },
                    60
                  ]
                }
              ]
            }
          }
        }
      }
    },
    {
      $group: {
        _id: { player: "$player", team: "$team", seasonType: "$seasonType" },
        gp: { $sum: 1 },
        gs: { $sum: { $cond: ["$started", 1, 0] } },
        min: { $avg: "$minutesDecimal" },
        tov: { $avg: "$box.to" },
        // totals, so percentages can be computed correctly below
        totalFgm: { $sum: "$box.fgm" },
        totalFga: { $sum: "$box.fga" },
        totalFg3m: { $sum: "$box.fg3m" },
        totalFg3a: { $sum: "$box.fg3a" },
        totalFtm: { $sum: "$box.ftm" },
        totalFta: { $sum: "$box.fta" },
        ...averages
      }
    }
  ];
}

async function deriveCareerStats(season) {
  const seasonSuffix = String(season).split("-")[0].slice(-2);
  const rows = await PlayerGameStats.aggregate(buildPipeline(seasonSuffix));

  if (!rows.length) {
    logger.warn(`no ${season} game stats found to derive career stats from - scrape games first`);
    return { inserted: 0, existing: 0 };
  }

  // team tricodes and birthdates come from documents we already scraped
  const teams = await Team.find({}, { abbreviation: 1 }).lean();
  const teamAbbrev = new Map(teams.map(t => [String(t._id), t.abbreviation]));
  const players = await Player.find({}, { age: 1, birthdate: 1 }).lean();
  const playerRecords = new Map(players.map(p => [p._id, p]));

  // One query rather than one per row. Across several seasons this is thousands
  // of rows, and on a re-run every one of them already exists.
  const storedKeys = new Set(
    (await PlayerCareerStats.find({ season_id: season }, { player: 1, team: 1, type: 1 }).lean())
      .map(row => `${row.type}|${row.player}|${row.team}`)
  );

  let inserted = 0;
  let existing = 0;

  for (const row of rows) {
    const { player, team, seasonType } = row._id;
    const type = SEASON_TYPES[seasonType];
    const teamCode = teamAbbrev.get(String(team)) || "NBA";

    if (storedKeys.has(`${type}|${player}|${teamCode}`)) {
      existing++;
      continue;
    }

    const record = playerRecords.get(player) || {};
    const age = ageDuringSeason(record.birthdate, season);

    const document = {
      season_id: season,
      player,
      type,
      team: teamCode,
      player_age: age === null ? parseInt(record.age, 10) || 0 : age,
      gp: row.gp,
      gs: row.gs,
      min: round(row.min, 1),
      tov: round(row.tov, 1),
      fg_pct: percentage(row.totalFgm, row.totalFga),
      fg3_pct: percentage(row.totalFg3m, row.totalFg3a),
      ft_pct: percentage(row.totalFtm, row.totalFta)
    };
    AVERAGED.forEach(field => {
      document[field] = round(row[field], 1);
    });

    try {
      await PlayerCareerStats.create(document);
      inserted++;
    } catch (err) {
      logger.warn(`could not store derived career stats for player ${player}: ${err.message}`);
    }
  }

  logger.info(`derived ${season} career stats: ${inserted} inserted, ${existing} already present`);
  return { inserted, existing };
}

module.exports = deriveCareerStats;
