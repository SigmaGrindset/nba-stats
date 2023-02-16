const jsdom = require("jsdom")
const { JSDOM } = jsdom
const fs = require("fs").promises;
const axios = require("axios");
const { axiosInstance } = require("./main");
const { scrapePlayer, getPlayerLinks } = require("./players");
const { transformLabel } = require("../utils/scrape_utils");


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

getTeamLinks();

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


async function scrapeTeams() {
  // ide kroz sve timove i scrapea svaki tim posebno sa zasebnom funkcijom
  const teamLinks = await getTeamLinks();

  // const teamData = await scrapeTeam(teamLinks[0]);
  teamLinks.forEach(async link => {
    const teamData = await scrapeTeam(link);
    // console.log(teamData);
  });
}




async function scrapeTeam(link) {
  const res = await axiosInstance.get(link);
  const dom = new JSDOM(res.data);
  const document = dom.window.document

  const id = parseInt(link.split("/").slice(-2, -1)[0]);
  const name = document.querySelector(".TeamHeader_name__MmHlP").textContent;
  const recordContainers = document.querySelector(".TeamHeader_record__wzofp").querySelectorAll("span")
  const record = recordContainers.item(0).textContent;
  const placementText = recordContainers.item(1).textContent.replace("|", "").replace(" ", "").replace(" ", "");

  const ranksData = {};
  const ranksContainer = document.querySelectorAll(".TeamHeader_rank__lMnzF");
  ranksContainer.forEach(rankConainer => {
    const label = rankConainer.querySelector(".TeamHeader_rankLabel__5mPf9").textContent;
    const placement = rankConainer.querySelector(".TeamHeader_rankOrdinal__AaXPR").textContent;
    const value = parseFloat(rankConainer.querySelector(".TeamHeader_rankValue__ZGDCq").textContent);
    ranksData[transformLabel(label)] = { placement, value };
  });

  const playerIds = []
  const playerLinks = await getPlayerLinks(link);
  playerLinks.forEach(async link => {
    const playerId = parseInt(link.split("/").slice(-3));
    playerIds.push(playerId);
    const playerData = await scrapePlayer(link);
  });

  const teamData = {
    id,
    name,
    record,
    players: playerIds,
    placementText,
    ranksData
  };
  return teamData;
}



module.exports.getTeamLinks = getTeamLinks;
module.exports.scrapeTeam = scrapeTeam;
