const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

const BoxScoreStats = require("../src/models/BoxScoreStats");
const PlayerGameStats = require("../src/models/PlayerGameStats");
const PlayerCareerStats = require("../src/models/PlayerCareerStats");
const Player = require("../src/models/Player");
const Team = require("../src/models/Team");
// PlayerGameStats autopopulates its game ref, so the model must be registered
require("../src/models/Game");

const deriveCareerStats = require("../src/aggregate/careerStats");

// The first run downloads a MongoDB binary; later runs use the cached copy.
jest.setTimeout(10 * 60 * 1000);

const TEAM_ID = 1610612738;
const PLAYER_ID = 1628369;
// a second player, with a birthdate and games five seasons apart
const VETERAN_ID = 201939;

const REGULAR_SEASON_GAMES = [
  { game: "0022500001", started: true, min: "30:00", fgm: 10, fga: 20, fg3m: 2, fg3a: 5, ftm: 4, fta: 4, pts: 26, reb: 8, oreb: 2, dreb: 6, ast: 5, stl: 1, blk: 0, to: 3, pf: 2 },
  { game: "0022500002", started: true, min: "20:30", fgm: 5, fga: 10, fg3m: 1, fg3a: 4, ftm: 0, fta: 2, pts: 11, reb: 4, oreb: 1, dreb: 3, ast: 3, stl: 2, blk: 1, to: 1, pf: 3 },
  { game: "0022500003", started: false, min: "10:00", fgm: 3, fga: 6, fg3m: 0, fg3a: 1, ftm: 2, fta: 2, pts: 8, reb: 3, oreb: 0, dreb: 3, ast: 1, stl: 0, blk: 0, to: 2, pf: 1 }
];

const PLAYOFF_GAME = { game: "0042500101", started: true, min: "40:00", fgm: 12, fga: 24, fg3m: 3, fg3a: 8, ftm: 6, fta: 6, pts: 33, reb: 10, oreb: 3, dreb: 7, ast: 6, stl: 2, blk: 1, to: 4, pf: 2 };

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri("nba-stats-test"));

  await Team.create({
    _id: TEAM_ID, name: "Boston Celtics", abbreviation: "BOS", pageColor: "#008348",
    globalImageURL: "x", imageURL: "x", record: "1-0", placementText: "1st",
    records: [], coaching: [], background: [], achievements: []
  });
  // no birthdate, so the stored age is the only thing to fall back on
  await Player.create({ _id: PLAYER_ID, name: "Jayson Tatum", imageURL: "x", age: "28" });
  await Player.create({
    _id: VETERAN_ID, name: "Stephen Curry", imageURL: "x",
    age: "38", birthdate: "Mar 14, 1988"
  });

  for (const game of [...REGULAR_SEASON_GAMES, PLAYOFF_GAME]) {
    const box = await BoxScoreStats.create({ ...game, fg_pct: 0, fg3_pct: 0, ft_pct: 0, plus_minus: "0" });
    await PlayerGameStats.create({
      game: game.game, player: PLAYER_ID, team: TEAM_ID, stats: box._id, started: game.started
    });
  }

  // a DNP row, which must not count towards games played or the averages
  const dnpBox = await BoxScoreStats.create({ status: "DNP - Coach's Decision" });
  await PlayerGameStats.create({
    game: "0022500004", player: PLAYER_ID, team: TEAM_ID, stats: dnpBox._id, started: false
  });

  // the same player in two seasons, five years apart
  for (const gameId of ["0022000001", "0022500005"]) {
    const box = await BoxScoreStats.create({
      min: "35:00", fgm: 10, fga: 20, fg3m: 6, fg3a: 12, ftm: 4, fta: 4, pts: 30,
      reb: 5, oreb: 0, dreb: 5, ast: 6, stl: 1, blk: 0, to: 3, pf: 2,
      fg_pct: 0, fg3_pct: 0, ft_pct: 0, plus_minus: "0"
    });
    await PlayerGameStats.create({
      game: gameId, player: VETERAN_ID, team: TEAM_ID, stats: box._id, started: true
    });
  }

  await deriveCareerStats("2020-21");
  await deriveCareerStats("2025-26");
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("derived career stats", () => {

  test("counts only games actually played", async () => {
    const reg = await PlayerCareerStats.findOne({
      player: PLAYER_ID, type: "Career Regular Season Stats"
    }).lean();

    expect(reg.gp).toEqual(3);   // four rows exist, one is a DNP
    expect(reg.gs).toEqual(2);
  });

  test("averages counting stats and converts MM:SS minutes", async () => {
    const reg = await PlayerCareerStats.findOne({
      player: PLAYER_ID, type: "Career Regular Season Stats"
    }).lean();

    expect(reg.pts).toBeCloseTo(15, 1);        // (26 + 11 + 8) / 3
    expect(reg.min).toBeCloseTo(20.2, 1);      // (30 + 20.5 + 10) / 3
    expect(reg.reb).toBeCloseTo(5, 1);
    expect(reg.tov).toBeCloseTo(2, 1);         // mapped from the box score's "to"
  });

  test("computes percentages from totals, not from per-game percentages", async () => {
    const reg = await PlayerCareerStats.findOne({
      player: PLAYER_ID, type: "Career Regular Season Stats"
    }).lean();

    // 18/36 made. Averaging the per-game percentages would give .528 instead.
    expect(reg.fg_pct).toBeCloseTo(0.5, 3);
    expect(reg.fg3_pct).toBeCloseTo(0.3, 3);   // 3/10
    expect(reg.ft_pct).toBeCloseTo(0.75, 3);   // 6/8
  });

  test("keeps postseason separate from the regular season", async () => {
    const post = await PlayerCareerStats.findOne({
      player: PLAYER_ID, type: "Career Playoffs Stats"
    }).lean();

    expect(post.gp).toEqual(1);
    expect(post.pts).toBeCloseTo(33, 1);
    expect(post.min).toBeCloseTo(40, 1);
  });

  test("labels rows with the team tricode, player age and season", async () => {
    const reg = await PlayerCareerStats.findOne({
      player: PLAYER_ID, type: "Career Regular Season Stats"
    }).lean();

    expect(reg.team).toEqual("BOS");
    // no birthdate on this player, so the age falls back to the stored one
    expect(reg.player_age).toEqual(28);
    expect(reg.season_id).toEqual("2025-26");
  });

  test("keeps each season's row separate", async () => {
    const rows = await PlayerCareerStats
      .find({ player: VETERAN_ID, type: "Career Regular Season Stats" })
      .sort({ season_id: 1 }).lean();

    expect(rows.map(row => row.season_id)).toEqual(["2020-21", "2025-26"]);
    rows.forEach(row => expect(row.gp).toEqual(1));
  });

  test("ages a player as of the season played, not as of today", async () => {
    const rows = await PlayerCareerStats
      .find({ player: VETERAN_ID, type: "Career Regular Season Stats" })
      .sort({ season_id: 1 }).lean();

    // born Mar 14 1988, measured at February 1st in each season
    expect(rows.map(row => row.player_age)).toEqual([32, 37]);
  });

  test("is idempotent - a second run inserts nothing", async () => {
    const before = await PlayerCareerStats.countDocuments();
    const result = await deriveCareerStats("2025-26");

    expect(result.inserted).toEqual(0);
    expect(await PlayerCareerStats.countDocuments()).toEqual(before);
  });
});
