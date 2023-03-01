
const { getTeamLinks } = require("../src/scrape/teams.js");
const { scrapeGame, getGameLinks } = require("../src/scrape/games");
jest.setTimeout(60 * 1000);


describe("game scrape", () => {

  test("getGameLinks", async () => {
    const teamLinks = await getTeamLinks();
    const gameLinks = await getGameLinks(teamLinks[0]);

    expect(gameLinks.length >= 1).toBeTruthy();
  });

  test("single game", async () => {
    const teamLinks = await getTeamLinks();
    const gameLinks = await getGameLinks(teamLinks[0]);
    const gameData = await scrapeGame(gameLinks[0]);

    expect(gameData.id).toBeDefined();
    expect(gameData.attendance).toBeDefined();
    expect(gameData.officials).toBeDefined();
    expect(gameData.location).toBeDefined();
    expect(gameData.date).toBeDefined();
    expect(gameData.boxScore).toBeDefined();
    const boxScore = gameData.boxScore;
    expect(boxScore.length).toEqual(2);
    const teamBoxScore = boxScore[0];
    expect(typeof teamBoxScore.teamId).toEqual("number");
    expect(teamBoxScore.playerStats.length >= 3).toBeTruthy();
    teamBoxScore.playerStats.forEach(player => {
      if (player.status == undefined) {
        // ako ima neku statistiku, odnosno ako je igrao
        expect(player.player).toBeDefined();
        expect(player.min).toBeDefined();
        expect(player.fgm).toBeDefined();
        expect(player.fga).toBeDefined();
        expect(player.fg_pct).toBeDefined();
        expect(player.fg3m).toBeDefined();
        expect(player.fg3a).toBeDefined();
        expect(player.fg3_pct).toBeDefined();
        expect(player.ftm).toBeDefined();
        expect(player.fta).toBeDefined();
        expect(player.ft_pct).toBeDefined();
        expect(player.oreb).toBeDefined();
        expect(player.dreb).toBeDefined();
        expect(player.reb).toBeDefined();
        expect(player.ast).toBeDefined();
        expect(player.stl).toBeDefined();
        expect(player.blk).toBeDefined();
        expect(player.to).toBeDefined();
        expect(player.pf).toBeDefined();
        expect(player.pts).toBeDefined();
        expect(player.plus_minus).toBeDefined();

      } else {
        expect(typeof player.player).toEqual("number");
        expect(typeof player.status).toEqual("string");
      }
    });
  });
});
