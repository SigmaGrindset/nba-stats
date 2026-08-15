const { getTeamLinks, scrapeTeam } = require("../src/scrape/teams.js");
const { scrapePlayer, scrapePlayerStats } = require("../src/scrape/players.js");

jest.setTimeout(120 * 1000);

const CAREER_STAT_FIELDS = [
  "gp", "gs", "min", "pts", "fgm", "fga", "fg_pct", "fg3m", "fg3a", "fg3_pct",
  "ftm", "fta", "ft_pct", "oreb", "dreb", "reb", "ast", "stl", "blk", "tov", "pf"
];

// team scraping is covered by teamScrape.test.js

describe("player scrape", () => {

  test("returns the shape the Player model expects", async () => {
    const teamLinks = await getTeamLinks();
    const team = await scrapeTeam(teamLinks[0]);

    // await in sequence: the previous version used forEach(async ...), so the
    // assertions ran after the test had already resolved and never failed it
    for (const playerId of team.players.slice(0, 3)) {
      const data = await scrapePlayer(playerId);

      expect(typeof data.id).toEqual("number");
      expect(typeof data.name).toEqual("string");
      expect(data.imageURL).toContain("cdn.nba.com");
      expect(data.draft).toBeDefined();

      // nba.com leaves these blank for fringe roster players, so the contract is
      // "a usable string, or absent so the model's Unknown default applies" -
      // never an empty string and never the literal "null"
      ["height", "weight", "country", "last_attended", "age", "birthdate",
        "experience", "number", "position"].forEach(field => {
        const value = data[field];
        if (value !== undefined) {
          expect(typeof value).toEqual("string");
          expect(value.length > 0).toBe(true);
          expect(value.toLowerCase()).not.toEqual("null");
        }
      });

      // the views print the jersey verbatim, so the "#" belongs in the data
      if (data.number !== undefined) {
        expect(data.number).toMatch(/^#\d+$/);
      }

      // the model stores these as strings
      if (data.stats) {
        expect(typeof data.stats.ppg).toEqual("string");
        expect(typeof data.stats.apg).toEqual("string");
        expect(typeof data.stats.rpg).toEqual("string");
      }
    }
  });

  test("returns an empty object for an unknown player id", async () => {
    expect(await scrapePlayer(999999999)).toEqual({});
  });

  test("career stats match the PlayerCareerStats columns", async () => {
    let playerStats;
    try {
      playerStats = await scrapePlayerStats(1628369);
    } catch (err) {
      // stats.nba.com rate-limits by IP and can refuse for long stretches.
      // The populate script tolerates this, so the test does too rather than
      // failing for a reason unrelated to the code under test.
      console.warn(`skipping: stats.nba.com unavailable (${err.message})`);
      return;
    }

    expect(typeof playerStats).toEqual("object");
    expect(typeof playerStats.regSeason.type).toEqual("string");

    const yearStat = playerStats.regSeason.seasons[0];
    expect(yearStat.season_id).toContain("-");
    expect(yearStat.team.length <= 5).toBeTruthy();
    CAREER_STAT_FIELDS.forEach(field => {
      expect(typeof yearStat[field]).toEqual("number");
    });
  });
});
