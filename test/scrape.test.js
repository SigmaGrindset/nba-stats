const { getTeamLinks, scrapeTeam, getPlayerLinks, scrapePlayer } = require("../scrape.js");

describe("team scrape", () => {

  test("getTeamLinks, should contain 30 links", async () => {
    const links = await getTeamLinks();
    expect(links.length).toEqual(30);
  });

  test("scrapeTeam single team, should contain all data", async () => {
    const links = await getTeamLinks();
    const teamData = await scrapeTeam(links[5]);
    expect(typeof teamData.id).toEqual("number");
    expect(typeof teamData.name).toEqual("string");
    expect(typeof teamData.record).toEqual("string");
    expect(typeof teamData.placementText).toEqual("string");
    expect(teamData).toHaveProperty("ranksData");
    teamData.ranksData.forEach(rankData => {
      expect(rankData).toHaveProperty("label")
      expect(rankData).toHaveProperty("placement")
      expect(rankData).toHaveProperty("value")
      expect(typeof rankData.value).toEqual("number")
    });
  });

  test("test if 30 teams can be scraped", async () => {
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

  test.only("general info and stats for players of one team", async () => {
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

});
