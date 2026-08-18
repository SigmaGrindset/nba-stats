// NBA game ids are structured, not arbitrary:
//   <2-digit league><1-digit season type><2-digit season start year><5-digit sequence>
// e.g. 0022500001 = league 00, type 2 (regular season), season 2025-26, game 1.
// Types in play here are 002 regular season, 004 playoffs, 005 play-in and 006
// the NBA Cup final.
//
// Because the id carries the season, nothing needs to store it a second time on
// every game document - the aggregation and the team page both read it off the
// key. These helpers live in utils rather than in scrape/ so the web app can use
// them without pulling the scraper (and its HTTP clients) into the bundle.

// "2025-26" -> "25"
function seasonSuffix(season) {
  return String(season).split("-")[0].slice(-2);
}

// "0022000180" -> "2020-21". Ids only carry two digits of the start year, and
// the NBA's first season was 1946-47, so anything below 46 belongs to the 2000s.
function seasonFromGameId(gameId) {
  const twoDigit = Number(String(gameId).slice(3, 5));
  if (isNaN(twoDigit)) {
    return null;
  }
  const startYear = twoDigit >= 46 ? 1900 + twoDigit : 2000 + twoDigit;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

// Matches every NBA id belonging to one season, whatever its type. Pinned to
// league 00 so a Summer League id (league 15) can't collide: its season digits
// sit in the same columns, so "1522000024" would otherwise read as 2020-21.
function seasonIdPattern(season) {
  return new RegExp(`^00\\d${seasonSuffix(season)}\\d{5}$`);
}

module.exports.seasonSuffix = seasonSuffix;
module.exports.seasonFromGameId = seasonFromGameId;
module.exports.seasonIdPattern = seasonIdPattern;
