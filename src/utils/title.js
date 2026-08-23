const SITE_NAME = "nbastats";

// What the tab says when a page has nothing more specific to say - the home
// page, and any render that forgets to pass a title of its own.
const DEFAULT_TITLE = `${SITE_NAME} - NBA teams, rosters and box scores`;

// Builds a <title> from the page's own words, most specific first: tabs
// truncate from the right, so "Boston Celtics | nbastats" stays readable
// squeezed down to a favicon and a few characters, while the reverse doesn't.
// Empty parts drop out, which keeps optional details (a game's date, say)
// from leaving a dangling separator behind.
function pageTitle(...parts) {
  const subject = parts.filter(Boolean).join(" - ");
  return subject ? `${subject} | ${SITE_NAME}` : DEFAULT_TITLE;
}

module.exports = { SITE_NAME, DEFAULT_TITLE, pageTitle };
