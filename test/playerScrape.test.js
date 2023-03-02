
const { getTeamLinks } = require("../src/scrape/teams.js");
const { getPlayerLinks, getPlayerStatsLink, scrapePlayerStats, scrapePlayer } = require("../src/scrape/players.js");
jest.setTimeout(60 * 1000);

describe("player scrape test", () => {

  test("general info for players of one team", async () => {

    const teamLinks = await getTeamLinks();
    const playerLinks = await getPlayerLinks(teamLinks[0]);
    playerLinks.forEach(async link => {
      const data = await scrapePlayer(link);
      expect(typeof data.id).toBeDefined();
      expect(typeof data.name).toEqual("string");
      expect(typeof data.imageURL).toEqual("string");
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
    const statsLink = await getPlayerStatsLink({ profileLink: playerLinks[0] });
    const playerStats = await scrapePlayerStats(statsLink);
    const yearStat = playerStats.regSeason.seasons[0];

    expect(typeof playerStats).toEqual("object");
    expect(typeof playerStats.regSeason.type).toEqual("string");
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
