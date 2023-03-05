const jsdom = require("jsdom")
const { JSDOM } = jsdom
const fs = require("fs").promises;
const axios = require("axios");
const { axiosInstance, BASEURL } = require("./main");
const { transformLabel, loadDynamicPage, mergeColumnRow, scrapeUntilSuccessful } = require("../utils/scrape_utils");
const { boxScore } = require("nba/src/data");


async function getGameLinks(teamLink) {
  // pronalazi linkove za svaki game
  const res = await axiosInstance.get(teamLink.concat("/schedule"));
  const dom = new JSDOM(res.data);
  const document = dom.window.document;
  const links = [];

  const gameContainers = document.querySelectorAll(".TeamScheduleTable_game__STLzU");
  gameContainers.forEach(container => {
    const result = container.querySelectorAll(".Crom_text__NpR1_").item(2);
    if (result.textContent.toUpperCase().includes("W") || result.textContent.toUpperCase().includes("L")) {
      links.push(result.querySelector("a").getAttribute("href"));
    }
  });
  return links;
}


async function scrapeGame(gameLink) {
  // gameLink - /game/game-id/

  const gameId = parseInt(gameLink.split("/").slice(-2, -1));
  const pageContent = await loadDynamicPage(BASEURL.concat(gameLink));
  const dom = new JSDOM(pageContent);
  const document = dom.window.document;

  const gameData = {
    id: gameId
  };

  const gameSummaryText = document.querySelector(".GameHeroHeadline_headline__GYjHE").textContent;
  const gameSummaryLocation = document.querySelector(".GameHeroLocation_location__Q_ID_").textContent;
  gameData.summaryText = gameSummaryText
  gameData.summaryLocation = gameSummaryLocation

  const gameInfoContainer = document.querySelector(".GameSummary_sumContainer__WBZiw").querySelector("section");
  const infoCards = gameInfoContainer.querySelectorAll(".InfoCard_row__FO1v_");
  infoCards.forEach(card => {
    const columns = card.querySelectorAll("div");
    const label = transformLabel(columns.item(0).textContent);
    if (label.toLowerCase() == "gamebook") {
      // gamebook je dokument pa skipaj
      return;
    }
    const value = columns.item(1).textContent;
    gameData[label] = value;
  });
  const boxScoreLink = document.querySelectorAll(".InnerNavTabLink_tab__T1vNe").item(1)
    .querySelector("a").getAttribute("href");
  const boxScoreData = await scrapeBoxScore(boxScoreLink);
  gameData.boxScore = boxScoreData;
  return gameData;
}

function getTeamIdFromImageUrl(imageURL) {
  // src="https://cdn.nba.com/logos/nba/1610612766/global/D/logo.svg"
  // src="https://cdn.nba.com/logos/nba/1610612738/global/D/logo.svg"
  const arr = imageURL.split("/");
  arr.pop();
  arr.pop();
  arr.pop();
  return parseInt(arr.pop());
}

async function scrapeBoxScore(boxScoreLink) {
  const pageContent = await loadDynamicPage(BASEURL.concat(boxScoreLink));
  const dom = new JSDOM(pageContent);
  const document = dom.window.document;

  // tim ciji je box score prvi je isti tim cija je slika prva odnosno s lijeve strane.
  const imageContainer = document.querySelector(".MatchupCard_block__RWCas");
  const images = imageContainer.querySelectorAll(".TeamLogo_logo__PclAJ");
  const teamAId = getTeamIdFromImageUrl(images.item(0).getAttribute("src"));
  const teamBId = getTeamIdFromImageUrl(images.item(1).getAttribute("src"));

  const statsTables = document.querySelectorAll(".StatsTable_table__Ejk5X");
  const teamA = await scrapeGameStatsTable(statsTables.item(0), teamAId);
  const teamB = await scrapeGameStatsTable(statsTables.item(1), teamBId);
  return [teamA, teamB];
}

async function scrapeGameStatsTable(table, teamId) {
  const headCells = table.querySelector(".StatsTableHead_thead__omZuF").querySelectorAll("th");
  const columnNamesStats = []; // za statistiku
  const boxScoreData = {
    teamId,
    playerStats: []
  };

  headCells.forEach(cell => {
    const label = transformLabel(cell.textContent);
    columnNamesStats.push(label);
  });
  const columnNamesNotPlayed = [columnNamesStats[0], "status"]
  // column names za one koji nisu igrali
  // playerId, status(razlog zasto nije igrao)

  const rows = table.querySelector(".StatsTableBody_tbody__uvj_P").querySelectorAll("tr");
  rows.forEach(row => {

    const rowData = [];
    const cells = row.querySelectorAll("td");

    if (cells.length <= 5) {
      // 5 je random brojka
      // ako igrac nije igrao imati ce dva columna: playerId, razlog zasto nije igrao (DNP - Injury/Illness)
      const playerLinkSplit = cells.item(0).querySelector("a").getAttribute("href").split("/");
      playerLinkSplit.pop();
      const playerId = playerLinkSplit.pop();
      const status = cells.item(1).textContent;
      rowData.push(parseInt(playerId));
      rowData.push(status);

    } else {
      // ako je igrao i ima statistiku
      cells.forEach(cell => {
        if (rowData.length == 0) {
          // ako jos nije uzeo playerId ili TOTAL
          if (cell.textContent == "TOTALS") {
            rowData.push("totals");
          } else {
            const playerLinkSplit = cells.item(0).querySelector("a").getAttribute("href").split("/");
            playerLinkSplit.pop();
            const playerId = playerLinkSplit.pop();
            rowData.push(parseInt(playerId));
          }
        } else {
          if (cell.textContent.includes(":")) {
            rowData.push(cell.textContent);
          } else {
            rowData.push(parseFloat(cell.textContent));
          }
        }
      });

    }

    let rowDataObj = undefined;
    if (rowData.length == 2) {
      rowDataObj = mergeColumnRow(columnNamesNotPlayed, rowData);
    } else {
      rowDataObj = mergeColumnRow(columnNamesStats, rowData);
    }
    boxScoreData.playerStats.push(rowDataObj);
  });

  return boxScoreData;
}

// scrapeGame("/game/0022200264/").then(val => console.log(val));

module.exports.scrapeGame = scrapeUntilSuccessful(scrapeGame);
module.exports.getGameLinks = scrapeUntilSuccessful(getGameLinks);
