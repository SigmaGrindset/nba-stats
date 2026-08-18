const { scrapeGame } = require("../src/scrape/games");

jest.setTimeout(90 * 1000);

const STAT_FIELDS = [
  "min", "fgm", "fga", "fg_pct", "fg3m", "fg3a", "fg3_pct",
  "ftm", "fta", "ft_pct", "oreb", "dreb", "reb", "ast",
  "stl", "blk", "to", "pf", "pts", "plus_minus"
];

describe("game scrape", () => {

  test("returns game metadata and both box scores", async () => {
    const gameData = await scrapeGame("0022500001");

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

  test("reads an older season the same way", async () => {
    // 2020-21 was a 72-game season played largely without crowds, so it exercises
    // both the shortened schedule and the "Not reported" attendance path
    const gameData = await scrapeGame("0022000180");

    expect(gameData.id).toEqual("0022000180");
    expect(gameData.date).toContain("2021");
    expect(gameData.boxScore.length).toEqual(2);
  });

  test("lists a player once even when nba.com lists them twice", async () => {
    // 2021 Conference Finals game 1 carries personId 1626171 twice: "Bobby
    // Portis Jr." with an empty line and "Bobby Portis" with the 14:42 he played.
    // Two rows for one player violates PlayerGameStats' unique index.
    const gameData = await scrapeGame("0042000301");

    const bucks = gameData.boxScore[1];
    const portis = bucks.playerStats.filter(player => player.player === 1626171);

    expect(portis.length).toEqual(1);
    expect(portis[0].min).toEqual("14:42");

    gameData.boxScore.forEach(teamBoxScore => {
      const ids = teamBoxScore.playerStats.map(player => player.player);
      expect(new Set(ids).size).toEqual(ids.length);
    });
  });

  test("marks exactly five starters per team", async () => {
    // started is inferred from the position field, which only the starting five
    // carry. It holds from 2019-20 on but over-reports in older seasons, which is
    // where the scraped range stops.
    for (const gameId of ["0022500001", "0022000180"]) {
      const gameData = await scrapeGame(gameId);
      gameData.boxScore.forEach(teamBoxScore => {
        const starters = teamBoxScore.playerStats.filter(player => player.started);
        expect(starters.length).toEqual(5);
      });
    }
  });

  test("treats an empty page as worth retrying, not as a game that never was", async () => {
    // Every id now comes from a schedule card that reported the game final, so a
    // page with no game object is either nba.com hiccupping or a page it will
    // never render, and the two look identical from here. Flagged permanent - as
    // this was while ids were enumerated rather than discovered - the retry
    // wrapper gives up on both, and a run is quietly short a game it could have
    // had. 0022000816 came back empty once and served fine three times after.
    const error = await scrapeGame("0022501231").catch(err => err);

    expect(error.message).toMatch(/no game data/);
    expect(error.permanent).toBeUndefined();
  });
});
