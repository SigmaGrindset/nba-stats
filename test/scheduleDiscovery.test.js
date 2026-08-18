const {
  fetchDatesWithGames,
  fetchGamesOnDate,
  calendarYearsFor
} = require("../src/scrape/schedule");

jest.setTimeout(90 * 1000);

describe("calendar years", () => {

  test("spans both years of every season, without repeating the shared ones", () => {
    expect(calendarYearsFor(["2020-21"])).toEqual([2020, 2021]);
    expect(calendarYearsFor(["2020-21", "2021-22"])).toEqual([2020, 2021, 2022]);
  });

  test("refuses a season it can't read a start year out of", () => {
    expect(() => calendarYearsFor(["last year"])).toThrow(/2024-25/);
  });
});

describe("schedule discovery", () => {

  test("lists the dates a calendar year had games on", async () => {
    const dates = await fetchDatesWithGames(2021);

    // 2021 held the back half of 2020-21 and the front half of 2021-22
    expect(dates.length).toBeGreaterThan(200);
    dates.forEach(date => expect(date).toMatch(/^2021-\d{2}-\d{2}$/));
    expect(dates).toEqual([...dates].sort());
  });

  test("labels every game on a date with its season and type", async () => {
    const games = await fetchGamesOnDate("2021-01-15");

    expect(games.length).toEqual(7);
    games.forEach(game => {
      expect(game.season).toEqual("2020-21");
      expect(game.type).toEqual("regular");
      expect(game.status).toEqual(3);
      expect(game.id).toMatch(/^002\d{7}$/);
    });
  });

  test("keeps the play-in and the NBA Cup final, drops preseason", async () => {
    const playIn = await fetchGamesOnDate("2021-05-19");
    expect(playIn.length).toBeGreaterThan(0);
    playIn.forEach(game => expect(game.type).toEqual("playin"));

    const cupFinal = await fetchGamesOnDate("2024-12-17");
    expect(cupFinal.map(game => game.type)).toEqual(["cup"]);

    // preseason, All-Star and Summer League aren't NBA games for our purposes
    expect(await fetchGamesOnDate("2023-10-10")).toEqual([]);
    expect(await fetchGamesOnDate("2024-02-18")).toEqual([]);
  });
});
