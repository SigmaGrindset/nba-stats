
const { getTeamLinks, scrapeTeam } = require("../src/scrape/teams.js");
jest.setTimeout(80 * 1000);

describe("team scrape", () => {

  test("getTeamLinks, should contain 30 links", async () => {
    const links = await getTeamLinks();
    expect(links.length).toEqual(30);
  });

  test.only("scrape single team, should contain all data", async () => {
    const links = await getTeamLinks();
    const teamData = await scrapeTeam(links[9]);
    expect(isNaN(teamData.id)).toBeFalsy();
    expect(typeof teamData.id).toEqual("string");
    expect(typeof teamData.name).toEqual("string");
    expect(typeof teamData.record).toEqual("string");
    expect(typeof teamData.imageURL).toEqual("string");
    expect(typeof teamData.globalImageURL).toEqual("string");
    expect(typeof teamData.pageColor).toEqual("string");
    expect(teamData.pageColor.length > 0).toBeTruthy();
    expect(typeof teamData.records).toBeDefined();
    expect(typeof teamData.achievements).toBeDefined();
    expect(typeof teamData.coaching).toBeDefined();
    expect(typeof teamData.background).toBeDefined();
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
      expect(teamsData.name).toBeDefined();
    });
  });

});

