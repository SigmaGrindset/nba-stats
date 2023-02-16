
const { getTeamLinks, scrapeTeam } = require("../src/scrape/teams.js");
const { getPlayerLinks, getPlayerStatsLink, scrapePlayerStats, scrapePlayer } = require("../src/scrape/players.js");
const { scrapeGame, getGameLinks } = require("../src/scrape/game");
jest.setTimeout(60 * 1000);

describe("team scrape", () => {

  test("getTeamLinks, should contain 30 links", async () => {
    const links = await getTeamLinks();
    expect(links.length).toEqual(30);
  });

  test("scrape single team, should contain all data", async () => {
    const links = await getTeamLinks();
    const teamData = await scrapeTeam(links[2]);
    expect(isNaN(teamData.id)).toBeFalsy();
    expect(typeof teamData.id).toEqual("number");
    expect(typeof teamData.name).toEqual("string");
    expect(typeof teamData.record).toEqual("string");
    expect(typeof teamData.placementText).toEqual("string");
    teamData.players.forEach(playerId => {
      expect(isNaN(playerId)).toBeFalsy();
      expect(typeof playerId).toEqual("number");
    });
    expect(teamData).toHaveProperty("ranksData");
    expect(teamData.ranksData).toHaveProperty("ppg");
    expect(teamData.ranksData).toHaveProperty("rpg");
    expect(teamData.ranksData).toHaveProperty("apg");
    expect(teamData.ranksData).toHaveProperty("oppg");
  });

  test.skip("scrape 30 teams", async () => {
    const teamsData = [];
    const links = await getTeamLinks();
    links.forEach(async link => {
      const teamData = await scrapeTeam(link);
      teamsData.push(teamData);
    });
    expect(teamsData.length).toEqual(30);
  });

});


describe("player scrape test", () => {

  test("general info for players of one team", async () => {

    const teamLinks = await getTeamLinks();
    const playerLinks = await getPlayerLinks(teamLinks[0]);
    playerLinks.forEach(async link => {
      const data = await scrapePlayer(link);
      expect(typeof data.playerName).toEqual("string");
      expect(typeof data.number).toEqual("string");
      expect(typeof data.position).toEqual("string");
      expect(data.number).toContain("#");
      expect(typeof data.stats.ppg).toEqual("number");
      expect(typeof data.stats.apg).toEqual("number");
      expect(typeof data.stats.rpg).toEqual("number");
      expect(data.height).toBeDefined();
      expect(data.weight).toBeDefined();
      expect(data.country).toBeDefined();
      expect(data.last_attended).toBeDefined();
      expect(data.age).toBeDefined();
      expect(data.birthdate).toBeDefined();
      expect(data.draft).toBeDefined();
      expect(data.experience).toBeDefined();
    });
  });


  test("player stats", async () => {
    const teamLinks = await getTeamLinks();
    const playerLinks = await getPlayerLinks(teamLinks[5]);
    const statsLink = await getPlayerStatsLink(undefined, profileLink = playerLinks[0]);
    const playerStats = await scrapePlayerStats(statsLink);
    const yearStat = playerStats.regSeason.seasons[0];

    expect(typeof playerStats).toEqual("object");
    expect(typeof playerStats.regSeason.statsGroup).toEqual("string");
    expect(yearStat.season_id).toContain("-");
    expect(yearStat.team.length <= 5).toBeTruthy();
    expect(typeof yearStat.gp).toEqual("number");
    expect(typeof yearStat.gs).toEqual("number");
    expect(typeof yearStat.min).toEqual("number");
    expect(typeof yearStat.pts).toEqual("number");
    expect(typeof yearStat.fgm).toEqual("number");
    expect(typeof yearStat.fga).toEqual("number");
    expect(typeof yearStat.fg_pct).toEqual("number");
    expect(typeof yearStat.fg3m).toEqual("number");
    expect(typeof yearStat.fg3a).toEqual("number");
    expect(typeof yearStat.fg3_pct).toEqual("number");
    expect(typeof yearStat.ftm).toEqual("number");
    expect(typeof yearStat.fta).toEqual("number");
    expect(typeof yearStat.ft_pct).toEqual("number");
    expect(typeof yearStat.oreb).toEqual("number");
    expect(typeof yearStat.dreb).toEqual("number");
    expect(typeof yearStat.reb).toEqual("number");
    expect(typeof yearStat.ast).toEqual("number");
    expect(typeof yearStat.stl).toEqual("number");
    expect(typeof yearStat.blk).toEqual("number");
    expect(typeof yearStat.tov).toEqual("number");
    expect(typeof yearStat.pf).toEqual("number");


  });


});


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
        expect(player["3pm"]).toBeDefined();
        expect(player["3pa"]).toBeDefined();
        expect(player["3p_pct"]).toBeDefined();
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
