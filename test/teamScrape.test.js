const { getTeamLinks, scrapeTeam } = require("../src/scrape/teams.js");

jest.setTimeout(120 * 1000);

describe("team scrape", () => {

  // this file previously marked the test below as test.only, which silently
  // skipped every sibling test in the suite
  test("getTeamLinks, should contain 30 links", async () => {
    const links = await getTeamLinks();
    expect(links.length).toEqual(30);
  });

  test("scrape single team, should contain all data", async () => {
    const links = await getTeamLinks();
    const teamData = await scrapeTeam(links[9]);

    expect(isNaN(teamData.id)).toBeFalsy();
    expect(typeof teamData.id).toEqual("number");
    expect(typeof teamData.name).toEqual("string");
    expect(typeof teamData.abbreviation).toEqual("string");
    expect(teamData.record).toMatch(/^\d+-\d+$/);
    expect(teamData.imageURL).toContain("cdn.nba.com");
    expect(teamData.globalImageURL).toContain("global");
    expect(teamData.pageColor).toMatch(/^#/);
    expect(typeof teamData.placementText).toEqual("string");

    teamData.players.forEach(playerId => {
      expect(isNaN(playerId)).toBeFalsy();
      expect(typeof playerId).toEqual("number");
    });

    ["ppg", "rpg", "apg", "oppg"].forEach(key => {
      expect(teamData.ranksData).toHaveProperty(key);
      expect(typeof teamData.ranksData[key].placement).toEqual("string");
      expect(typeof teamData.ranksData[key].value).toEqual("number");
    });

    // the info cards render each row as [label, ...cells], joining any cell that
    // is itself an array
    [teamData.coaching, teamData.achievements, teamData.background, teamData.records]
      .forEach(group => {
        expect(Array.isArray(group)).toBe(true);
        group.forEach(row => {
          expect(Array.isArray(row)).toBe(true);
          expect(typeof row[0]).toEqual("string");
        });
      });
  });

  test("scrapes every team without gaps", async () => {
    const links = await getTeamLinks();
    const names = new Set();

    // await in sequence: the previous version pushed from inside
    // forEach(async ...), so the test finished before any request resolved and
    // its assertion never ran
    for (const link of links.slice(0, 3)) {
      const teamData = await scrapeTeam(link);
      expect(teamData.name).toBeDefined();
      expect(teamData.players.length > 0).toBe(true);
      names.add(teamData.name);
    }

    expect(names.size).toEqual(3);
  });
});
