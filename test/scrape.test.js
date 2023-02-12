
const { getTeamLinks, scrapeTeam } = require("../scrape/teams.js");
const { getPlayerLinks, getPlayerStatsLink, scrapePlayerStats, scrapePlayer } = require("../scrape/players.js");
jest.setTimeout(40 * 1000);

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
    teamData.ranksData.forEach(rankData => {
      expect(rankData).toHaveProperty("label")
      expect(rankData).toHaveProperty("placement")
      expect(rankData).toHaveProperty("value")
      expect(typeof rankData.value).toEqual("number")
    });
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
      expect(data.playerInfo.height).toBeDefined();
      expect(data.playerInfo.weight).toBeDefined();
      expect(data.playerInfo.country).toBeDefined();
      expect(data.playerInfo.last_attended).toBeDefined();
      expect(data.playerInfo.age).toBeDefined();
      expect(data.playerInfo.birthdate).toBeDefined();
      expect(data.playerInfo.draft).toBeDefined();
      expect(data.playerInfo.experience).toBeDefined();
    });
  });


  test.only("player stats", async () => {
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
