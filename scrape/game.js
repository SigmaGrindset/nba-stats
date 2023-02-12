const jsdom = require("jsdom")
const { JSDOM } = jsdom
const fs = require("fs").promises;
const axios = require("axios");
const { axiosInstance, BASEURL } = require("./main");
const { transformLabel, loadDynamicPage, mergeColumnRow } = require("../utils/scrape_utils");
const { boxScore } = require("nba/src/data");


async function scrapeGame(gameLink) {
  // gameLink - /game/game-id

  const pageContent = await loadDynamicPage(BASEURL.concat(gameLink));
  const dom = new JSDOM(pageContent);
  const document = dom.window.document;

  const gameData = {};

  const gameSummaryContainer = document.querySelector(".GameSummary_sumContainer__WBZiw").querySelector("section");
  const infoCards = gameSummaryContainer.querySelectorAll(".InfoCard_row__FO1v_");
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

  return gameData;
}


async function scrapeBoxScore(boxScoreLink) {
  const pageContent = await loadDynamicPage(BASEURL.concat(boxScoreLink));
  const dom = new JSDOM(pageContent);
  const document = dom.window.document;

  const statsTables = document.querySelectorAll(".StatsTable_table__Ejk5X");
  const teamA = await scrapeGameStatsTable(statsTables.item(0));
  const teamB = await scrapeGameStatsTable(statsTables.item(1));
  console.log(teamA);

}

async function scrapeGameStatsTable(table) {
  const headCells = table.querySelector(".StatsTableHead_thead__omZuF").querySelectorAll("th");
  const columnNamesStats = []; // za statistiku
  const boxScoreData = {
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



scrapeBoxScore("/game/0012200005/box-score");
