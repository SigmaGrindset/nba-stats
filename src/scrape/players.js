const jsdom = require("jsdom")
const { JSDOM } = jsdom
const { axiosInstance, BASEURL } = require("./main");
const { mergeColumnRow, transformLabel, loadDynamicPage } = require("../utils/scrape_utils");



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
    playerName, number, position, stats, ...playerInfo
  };
  return playerData;
}




async function getPlayerStatsLink(profileDom = undefined, profileLink = undefined, playerId = undefined) {
  let profileDocument;
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


async function scrapePlayerStatsTable(table) {
  const theadRows = table.querySelector("thead").querySelectorAll("tr")
  const columns = theadRows.item(1).querySelectorAll("th");
  const tableName = theadRows.item(0).querySelector("th").textContent;

  const columnNames = [];
  const stats = {
    statsGroup: tableName,
    seasons: []
  };

  columns.forEach(column => {
    const columnName = column.getAttribute("field");
    columnNames.push(transformLabel(columnName));
  });


  const rows = table.querySelector("tbody").querySelectorAll("tr");
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
    stats.seasons.push(rowStatsObj);
  });
  return stats;
}


async function scrapePlayerStats(statsLink) {
  const pageContent = await loadDynamicPage(BASEURL.concat(statsLink));
  const dom = new JSDOM(pageContent);


  const statsTable = dom.window.document.querySelectorAll(".Crom_table__p1iZz");
  const regSeasonStats = await scrapePlayerStatsTable(statsTable.item(0));
  const playoffStats = await scrapePlayerStatsTable(statsTable.item(1));
  return {
    regSeason: regSeasonStats,
    playoffs: playoffStats
  };
}




module.exports.getPlayerLinks = getPlayerLinks;
module.exports.scrapePlayer = scrapePlayer;
module.exports.scrapePlayerStats = scrapePlayerStats;
module.exports.getPlayerStatsLink = getPlayerStatsLink;
