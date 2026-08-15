const {
  scrapeGame,
  regularSeasonGameIds,
  postSeasonGameIds,
  buildGameId
} = require("../src/scrape/games");

jest.setTimeout(90 * 1000);

const SEASON = "2025-26";

const STAT_FIELDS = [
  "min", "fgm", "fga", "fg_pct", "fg3m", "fg3a", "fg3_pct",
  "ftm", "fta", "ft_pct", "oreb", "dreb", "reb", "ast",
  "stl", "blk", "to", "pf", "pts", "plus_minus"
];

describe("game id enumeration", () => {

  test("builds well formed ids for a season", () => {
    expect(buildGameId(SEASON, "regular", 1)).toEqual("0022500001");
    expect(buildGameId(SEASON, "regular", 1230)).toEqual("0022501230");
    // series are numbered from 0, so the Finals are round 4 series 0
    expect(buildGameId(SEASON, "playoffs", "401")).toEqual("0042500401");
  });

  test("covers a full regular season", () => {
    const ids = regularSeasonGameIds(SEASON);
    expect(ids.length).toEqual(1230);
    expect(new Set(ids).size).toEqual(1230);
    ids.forEach(id => expect(id).toMatch(/^00225\d{5}$/));
  });

  test("postseason candidates shrink each round", () => {
    const ids = postSeasonGameIds(SEASON);
    // (8 + 4 + 2 + 1) series * up to 7 games
    expect(ids.length).toEqual(105);
    expect(new Set(ids).size).toEqual(ids.length);
  });
});

describe("game scrape", () => {

  test("returns game metadata and both box scores", async () => {
    const gameData = await scrapeGame(regularSeasonGameIds(SEASON)[0]);

    expect(typeof gameData.id).toEqual("string");
    expect(gameData.attendance).toBeDefined();
    expect(gameData.officials).toBeDefined();
    expect(gameData.location).toBeDefined();
    expect(gameData.summaryText).toBeDefined();
    expect(gameData.summaryLocation).toBeDefined();
    expect(gameData.date).toBeDefined();
    expect(typeof gameData.dateEpoch).toEqual("number");
    expect(isNaN(gameData.dateEpoch)).toBe(false);

    const boxScore = gameData.boxScore;
    expect(boxScore.length).toEqual(2);

    boxScore.forEach(teamBoxScore => {
      expect(typeof teamBoxScore.teamId).toEqual("number");
      expect(teamBoxScore.playerStats.length >= 3).toBeTruthy();

      // db.js reads the team totals off the end of the list
      const totals = teamBoxScore.playerStats.slice(-1)[0];
      expect(totals.player).toEqual("totals");
      expect(typeof totals.pts).toEqual("number");

      teamBoxScore.playerStats.forEach(player => {
        expect(player.player).toBeDefined();
        if (player.status === undefined) {
          STAT_FIELDS.forEach(field => expect(player[field]).toBeDefined());
        } else {
          expect(typeof player.player).toEqual("number");
          expect(typeof player.status).toEqual("string");
        }
      });
    });
  });

  test("rejects an id that never existed, without retrying", async () => {
    // one past the end of the regular season
    await expect(scrapeGame("0022501231")).rejects.toMatchObject({ permanent: true });
  });
});
