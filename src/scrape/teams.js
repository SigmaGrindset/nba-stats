const jsdom = require("jsdom")
const { JSDOM } = jsdom
const fs = require("fs").promises;
const axios = require("axios");
const { axiosInstance, BASEURL } = require("./main");
const { getPlayerLinks } = require("./players");
const { transformLabel, loadDynamicPage, scrapeUntilSuccessful } = require("../utils/scrape_utils");


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

async function getTeamLinks() {
  // daje linkove svih timova
  const data = JSON.parse(await fs.readFile("./team_links.json"));
  if (data.links.length !== 30) {
    // ako nema sve timove onda treb scrapeati
    const links = await scrapeTeamLinks();
    data.links = links;
    await fs.writeFile("./team_links.json", JSON.stringify(data), err => {
      if (err) {
        console.log(err);
      }
    });
  }
  return data.links
}


async function scrapeTeamLinks() {
  // uzima linkove svih timova sa stranice
  const res = await axios.get("https://www.nba.com/teams");
  const dom = new JSDOM(res.data);
  const teamLinksContainer = dom.window.document.querySelectorAll(".TeamFigure_tfLinks__gwWFj");
  const teamLinks = []
  teamLinksContainer.forEach(async container => {
    let teamLink = container.querySelector("a").getAttribute("href"); // uvijek je prvi link za profile
    if (teamLink.slice(-1) == "/") {
      teamLinks.push(teamLink.slice(0, -1));
    } else {
      teamLinks.push(teamLink);
    }
  });
  return teamLinks;
}



function scrapeInfoBox(infoBox) {
  const blockContent = infoBox.querySelector(".Block_blockContent__6iJ_n");
  const rows = blockContent.querySelectorAll("div").item(1).querySelectorAll("div");
  const data = [];
  rows.forEach(row => {
    const name = row.querySelector("h3").textContent;
    const valuesArr = [];
    const values = row.querySelectorAll("li");
    values.forEach(value => {
      valuesArr.push(value.textContent);
    });
    data.push([name, valuesArr]);
  });

  return data;
}


async function scrapeTeam(link) {
  const res = await axiosInstance.get(link);
  const dom = new JSDOM(res.data);
  const document = dom.window.document;

  // general
  const teamFollowBtn = document.querySelector(".TeamFollowButton_follow__bJdBf").querySelector("button");
  const teamShortText = teamFollowBtn.getAttribute("data-content");
  const pageColor = teamColors[teamShortText];
  const imageURL = document.querySelector(".TeamHeader_teamLogoBW__s7vYd").getAttribute("src");

  const id = parseInt(link.split("/").slice(-2, -1)[0]);
  const name = document.querySelector(".TeamHeader_name__MmHlP").textContent;
  const recordContainers = document.querySelector(".TeamHeader_record__wzofp").querySelectorAll("span")
  const record = recordContainers.item(0).textContent;
  const placementText = recordContainers.item(1).textContent.replace("|", "").replace(" ", "").replace(" ", "");

  // info cards
  const coachingContainer = document.querySelector(".TeamProfile_sectionCoaches__e66bL");
  const coaching = scrapeInfoBox(coachingContainer);

  const triple = document.querySelectorAll(".TeamProfile_sectionTriple__kKQEx");
  const achievementsContainer = triple.item(1);
  const achievements = scrapeInfoBox(achievementsContainer);

  const records = [];
  const allTimeRecordsContainer = triple.item(0);
  const recordsRows = allTimeRecordsContainer.querySelector("table").querySelectorAll("tr");
  recordsRows.forEach(row => {
    const statName = row.querySelector(".TeamRecords_text__sr_pn").textContent;
    const player = row.querySelector(".TeamRecords_player__1qlhr").textContent;
    const value = parseInt(row.querySelector(".TeamRecords_stat__R8MJw").textContent);
    records.push([statName, player, value]);
  });

  const background = [];
  const backgroundContainer = document.querySelector(".TeamBackground_list__y1CMX");
  const names = backgroundContainer.querySelectorAll("dt");
  const values = backgroundContainer.querySelectorAll("dd");
  for (let i = 0; i < names.length; i++) {
    background.push([names.item(i).textContent, values.item(i).textContent]);
  }

  // ranks
  const ranksData = {};
  const ranksContainer = document.querySelectorAll(".TeamHeader_rank__lMnzF");
  ranksContainer.forEach(rankConainer => {
    const label = rankConainer.querySelector(".TeamHeader_rankLabel__5mPf9").textContent;
    const placement = rankConainer.querySelector(".TeamHeader_rankOrdinal__AaXPR").textContent;
    const value = parseFloat(rankConainer.querySelector(".TeamHeader_rankValue__ZGDCq").textContent);
    ranksData[transformLabel(label)] = { placement, value };
  });

  // players
  const playerIds = []
  const playerLinks = await getPlayerLinks(link);
  playerLinks.forEach(async link => {
    const playerId = parseInt(link.split("/").slice(-3));
    playerIds.push(playerId);
  });

  const teamData = {
    id,
    name,
    record,
    players: playerIds,
    placementText,
    imageURL,
    pageColor,
    ranksData,
    coaching,
    achievements,
    background,
    records
  };
  return teamData;
}



module.exports.getTeamLinks = scrapeUntilSuccessful(getTeamLinks);
module.exports.scrapeTeam = scrapeUntilSuccessful(scrapeTeam);
