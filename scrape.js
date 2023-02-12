const jsdom = require("jsdom")
const { JSDOM } = jsdom
const axios = require("axios")
const axiosInstance = axios.create({ baseURL: "https://www.nba.com" })
const puppeteer = require("puppeteer");
const { getTeamLinks, mergeColumnRow, transformLabel } = require("./utils/scrape_utils");

const BASELINK = "https://www.nba.com"



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
    // console.log(teamData);
  });
}


async function getPlayerLinks(teamLink) {
  // vraca linkove svih igraca iz nekoga tima
  const res = await axiosInstance.get(teamLink);
  const dom = new JSDOM(res.data);
  const document = dom.window.document;

  const links = [];
  const playersTable = document.querySelector(".MockStatsTable_statsTable__V_Skx").querySelector("table");
  const playerLinksContainers = playersTable.querySelector("tbody").querySelectorAll(".primary.text");
  playerLinksContainers.forEach(container => {
    const link = container.querySelector("a").getAttribute("href");
    links.push(link);
  });
  return links;
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

  const playerLinks = await getPlayerLinks(link);
  playerLinks.forEach(async link => {
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
  const res = await axiosInstance.get(link);
  const dom = new JSDOM(res.data);
  const document = dom.window.document;

  const headerInfo = document.querySelector(".PlayerSummary_mainInnerInfo__jv3LO");
  const headerInfoArr = headerInfo.textContent.split("|");
  const number = headerInfoArr[1].trim();
  const position = headerInfoArr[2].trim();
  const playerNameContainers = document.querySelectorAll(".PlayerSummary_playerNameText___MhqC");
  const playerName = playerNameContainers.item(0).textContent.concat(" ", playerNameContainers.item(1).textContent);

  const statsContainers = document.querySelectorAll(".PlayerSummary_playerStat__rmEOP");
  const stats = {};
  statsContainers.forEach(container => {
    const label = transformLabel(container.querySelector(".PlayerSummary_playerStatLabel__I3TO3").textContent);
    const value = parseFloat(container.querySelector(".PlayerSummary_playerStatValue___EDg_").textContent);
    const stat = {};
    stats[label] = value;
  });

  const playerInfo = {};
  const playerInfoMainContainer = document.querySelector(".PlayerSummary_hw__HNuGb");
  const playerInfoContainers = playerInfoMainContainer.querySelectorAll(".PlayerSummary_playerInfo__om2G4");
  playerInfoContainers.forEach(container => {
    const label = transformLabel(container.querySelector(".PlayerSummary_playerInfoLabel__hb5fs").textContent);
    const value = container.querySelector(".PlayerSummary_playerInfoValue__JS8_v").textContent;
    playerInfo[label] = value;
  });


  const playerData = {
    playerName, number, position, stats, playerInfo
  };
  return playerData;
}


async function getPlayerStatsLink(profileDom = undefined, profileLink = undefined, playerId = undefined) {
  let profileDocument;
  console.log(profileLink)
  if (playerId) {
    return `/stats/player/${(playerId.toString())}/career`;
  }
  else if (profileLink) {
    const res = await axiosInstance.get(profileLink);
    const profileDom = new JSDOM(res.data);
    profileDocument = profileDom.window.document;
  }

  const viewMode = profileDocument.querySelector(".InnerNavTabs_list__tIFRN");
  const statsButton = viewMode.querySelectorAll(".InnerNavTab_tab__bs7aN").item(1);
  const statsLink = statsButton.querySelector("a").getAttribute("href");


  const statsRes = await axiosInstance.get(statsLink);
  const statsDom = new JSDOM(statsRes.data);
  const statsDocument = statsDom.window.document;

  const optionList = statsDocument.querySelector(".StatsQuickNavSelector_list__nb3l1").querySelectorAll("li");
  const careerStatsLink = optionList.item(2).querySelector("a").getAttribute("href");
  // drugi li je za career stats
  return careerStatsLink;
}

async function scrapePlayerStats(statsLink) {
  const pageContent = await loadDynamicPage(BASELINK.concat(statsLink));
  const dom = new JSDOM(pageContent);

  const stats = [];
  const columnNames = [];

  const statsTable = dom.window.document.querySelector(".Crom_table__p1iZz");
  const columns = statsTable.querySelector("thead").querySelectorAll("tr").item(1).querySelectorAll("th");

  columns.forEach(column => {
    const columnName = column.getAttribute("field");
    columnNames.push(transformLabel(columnName));
  });


  const rows = statsTable.querySelector("tbody").querySelectorAll("tr");
  rows.forEach(row => {
    const rowStats = [];
    const cells = row.querySelectorAll("td");
    cells.forEach(cell => {
      let cellValue = cell.textContent;
      if (!cellValue.includes("-")) {
        // season je oblika 2018-19
        if (!isNaN(parseFloat(cellValue))) {
          cellValue = parseFloat(cellValue);
        }
      }
      rowStats.push(cellValue);
    });

    const rowStatsObj = mergeColumnRow(columnNames, rowStats);
    stats.push(rowStatsObj);
  });
  return stats;
}


async function loadDynamicPage(fullLink) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(fullLink);

  await page.waitForSelector("#onetrust-accept-btn-handler");
  await page.click("#onetrust-accept-btn-handler");

  const content = await page.content();
  await browser.close();
  return content;

}


scrapePlayerStats("/stats/player/1628369/career")
  .then(val => console.log(val));



module.exports.getTeamLinks = getTeamLinks;
module.exports.scrapeTeam = scrapeTeam;
module.exports.scrapePlayer = scrapePlayer;
module.exports.getPlayerLinks = getPlayerLinks;


