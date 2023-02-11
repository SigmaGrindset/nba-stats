const jsdom = require("jsdom")
const { JSDOM } = jsdom
const axios = require("axios")
const axiosInstance = axios.create({ baseURL: "https://www.nba.com" })
const fs = require("fs").promises


async function getTeamLinks() {
  // daje linkove svih timova
  const data = JSON.parse(await fs.readFile("team_links.json"));
  if (data.links.length !== 30) {
    // ako nema sve timove onda treb scrapeati
    const links = await scrapeTeamLinks();
    data.links = links;
    await fs.writeFile("team_links.json", JSON.stringify(data), err => {
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
    const teamLink = container.querySelector("a").getAttribute("href"); // uvijek je prvi link za profile
    teamLinks.push(teamLink);
  });
  return teamLinks;
}



async function scrapeTeams() {
  // ide kroz sve timove i scrapea svaki tim posebno sa zasebnom funkcijom
  const teamLinks = await getTeamLinks();

  // const teamData = await scrapeTeam(teamLinks[0]);
  teamLinks.forEach(async link => {
    const teamData = await scrapeTeam(link);
    console.log(teamData.name);
  });
}


async function scrapeTeam(link) {
  const res = await axiosInstance.get(link);
  const dom = new JSDOM(res.data);
  const document = dom.window.document

  const id = parseInt(link.split("/").slice(-3));
  const name = document.querySelector(".TeamHeader_name__MmHlP").textContent;
  const recordContainers = document.querySelector(".TeamHeader_record__wzofp").querySelectorAll("span")
  const record = recordContainers.item(0).textContent;
  const placementText = recordContainers.item(1).textContent.replace("|", "").replace(" ", "").replace(" ", "");

  const ranksData = []
  const ranksContainer = document.querySelectorAll(".TeamHeader_rank__lMnzF");
  ranksContainer.forEach(rankConainer => {
    const label = rankConainer.querySelector(".TeamHeader_rankLabel__5mPf9").textContent;
    const placement = rankConainer.querySelector(".TeamHeader_rankOrdinal__AaXPR").textContent;
    const value = parseFloat(rankConainer.querySelector(".TeamHeader_rankValue__ZGDCq").textContent);
    ranksData.push({ label, placement, value });
  });

  const playersTable = document.querySelector(".MockStatsTable_statsTable__V_Skx").querySelector("table");
  const playerLinks = playersTable.querySelector("tbody").querySelectorAll(".primary.text");
  playerLinks.forEach(async link => {
    link = link.querySelector("a").getAttribute("href");
    const playerData = await scrapePlayer(link);
  });

  const teamData = {
    id,
    name,
    record,
    placementText,
    ranksData
  };
  return teamData;
}


async function scrapePlayer(link) {
}

scrapeTeams()


