const fs = require("fs").promises;
const path = require("path");
const { fetchNextData } = require("./main");
const { ordinal, scrapeUntilSuccessful } = require("../utils/scrape_utils");
const logger = require("../config/logger");

const TEAM_LINKS_PATH = path.join(__dirname, "..", "..", "team_links.json");

const teamColors = {
  "ATL": "#e03a3e",
  "BKN": "#000",
  "BOS": "#008348",
  "CHA": "#00788c",
  "CHI": "#ce1141",
  "CLE": "#6f263d",
  "DAL": "#0053bc",
  "DEN": "#0e2240",
  "DET": "#1d428a",
  "GSW": "#006bb6",
  "HOU": "#ce1141",
  "IND": "#002d62",
  "LAC": "#c8102e",
  "LAL": "#552583",
  "MEM": "#5d76a9",
  "MIA": "#98002e",
  "MIL": "#00471b",
  "MIN": "#0c2340",
  "NOP": "#002b5c",
  "NYK": "#006bb6",
  "OKC": "#007ac1",
  "ORL": "#0077c0",
  "PHI": "#006bb6",
  "PHX": "#1d1160",
  "POR": "#e03a3e",
  "SAC": "#5a2d81",
  "SAS": "#000",
  "TOR": "#000",
  "UTA": "#002b5c",
  "WAS": "#002b5c"
};

// Team ids are permanent, so the checked-in link list stays valid across seasons.
async function getTeamLinks() {
  const data = JSON.parse(await fs.readFile(TEAM_LINKS_PATH));
  if (data.links.length !== 30) {
    throw new Error(`team_links.json has ${data.links.length} links, expected 30`);
  }
  return data.links;
}

function teamLogoURL(teamId, variant) {
  return `https://cdn.nba.com/logos/nba/${teamId}/${variant}/D/logo.svg`;
}

// The info cards in the view render rows as [label, ...cells], and join any cell
// that is itself an array with ", ". These builders produce that shape.
function buildCoaching(coaches) {
  const byType = {};
  (coaches || []).forEach(coach => {
    const type = coach.COACH_TYPE || "Coach";
    if (!byType[type]) {
      byType[type] = [];
    }
    byType[type].push(coach.COACH_NAME);
  });
  return Object.entries(byType).map(([type, names]) => [type, names]);
}

function buildAchievements(awards) {
  const groups = [
    ["NBA Championships", (awards || {}).champ],
    ["Conference Titles", (awards || {}).conf],
    ["Division Titles", (awards || {}).div],
    ["NBA Cup", (awards || {}).commCupChamp]
  ];
  return groups
    .filter(([, list]) => list && list.length)
    .map(([label, list]) => [label, list.map(a => String(a.YEARAWARDED))]);
}

function buildBackground(background) {
  const labels = {
    YEARFOUNDED: "Founded",
    CITY: "City",
    ARENA: "Arena",
    ARENACAPACITY: "Capacity",
    OWNER: "Owner",
    GENERALMANAGER: "General Manager",
    HEADCOACH: "Head Coach",
    DLEAGUEAFFILIATION: "G League Affiliate"
  };
  return Object.entries(labels)
    .filter(([key]) => (background || {})[key])
    .map(([key, label]) => [label, String(background[key])]);
}

// The old "Records" card scraped a franchise-leaders table. That data is only
// available from stats.nba.com, which rate-limits aggressively, so the card now
// shows retired numbers - which the team page already ships in its JSON.
function buildRetired(retired) {
  return (retired || [])
    .filter(r => r.PLAYER)
    .map(r => [r.PLAYER, r.JERSEY ? `#${r.JERSEY}` : "-", r.SEASONSWITHTEAM || "-"]);
}

function buildRanks(ranks) {
  const r = ranks || {};
  return {
    ppg: { placement: ordinal(r.PTS_RANK), value: r.PTS_PG },
    apg: { placement: ordinal(r.AST_RANK), value: r.AST_PG },
    rpg: { placement: ordinal(r.REB_RANK), value: r.REB_PG },
    oppg: { placement: ordinal(r.OPP_PTS_RANK), value: r.OPP_PTS_PG }
  };
}

function conferenceName(conference) {
  if (conference === "East") return "Eastern Conference";
  if (conference === "West") return "Western Conference";
  return conference || "";
}

async function scrapeTeam(link) {
  const pageProps = await fetchNextData(link);
  const team = pageProps.team;
  if (!team || !team.info) {
    throw new Error(`no team data at ${link}`);
  }

  const info = team.info;
  const id = info.TEAM_ID;

  return {
    id,
    name: `${info.TEAM_CITY} ${info.TEAM_NAME}`,
    abbreviation: info.TEAM_ABBREVIATION,
    record: `${info.W}-${info.L}`,
    placementText: `${ordinal(info.CONF_RANK)} in ${conferenceName(info.TEAM_CONFERENCE)}`,
    players: (team.roster || []).map(p => p.PLAYER_ID),
    imageURL: teamLogoURL(id, "primary"),
    globalImageURL: teamLogoURL(id, "global"),
    pageColor: teamColors[info.TEAM_ABBREVIATION] || "#000",
    ranksData: buildRanks(team.ranks),
    coaching: buildCoaching(team.coaches),
    achievements: buildAchievements(team.awards),
    background: buildBackground(team.background),
    records: buildRetired(team.retired)
  };
}

module.exports.getTeamLinks = scrapeUntilSuccessful(getTeamLinks);
module.exports.scrapeTeam = scrapeUntilSuccessful(scrapeTeam);
module.exports.teamColors = teamColors;
