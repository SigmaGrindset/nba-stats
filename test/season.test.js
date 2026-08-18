const { seasonSuffix, seasonFromGameId, seasonIdPattern } = require("../src/utils/season");

describe("season helpers", () => {

  test("derives the season from a game id, whatever its type", () => {
    expect(seasonFromGameId("0022000180")).toEqual("2020-21");   // regular season
    expect(seasonFromGameId("0042000402")).toEqual("2020-21");   // playoffs
    expect(seasonFromGameId("0052000131")).toEqual("2020-21");   // play-in
    expect(seasonFromGameId("0062500001")).toEqual("2025-26");   // NBA Cup final
  });

  test("reads two-digit years as the century they belong to", () => {
    // the id only carries two digits and the league began in 1946-47
    expect(seasonFromGameId("0029900001")).toEqual("1999-00");
    expect(seasonFromGameId("0020000001")).toEqual("2000-01");
    expect(seasonFromGameId("0024600001")).toEqual("1946-47");
  });

  test("suffixes a season the way ids encode it", () => {
    expect(seasonSuffix("2020-21")).toEqual("20");
    expect(seasonSuffix("1999-00")).toEqual("99");
  });

  test("matches every id in a season and nothing outside it", () => {
    const pattern = seasonIdPattern("2020-21");

    expect(pattern.test("0022000180")).toBe(true);
    expect(pattern.test("0042000402")).toBe(true);
    expect(pattern.test("0062000001")).toBe(true);

    expect(pattern.test("0022100180")).toBe(false);
    expect(pattern.test("0022500001")).toBe(false);
    // a Summer League id: different league, and the season digits sit elsewhere
    expect(pattern.test("1522000024")).toBe(false);
  });
});
