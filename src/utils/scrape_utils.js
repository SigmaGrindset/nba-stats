const fs = require("fs").promises;
const puppeteer = require("puppeteer");
const logger = require("../config/logger");

module.exports.transformLabel = function (label) {
  label = label.toLowerCase();

  // pretvara label u mala slova i joina sa _
  if (label == "+/-") {
    label = "plus_minus";
  }
  if (label[0] == "3") {
    label = label.replace("3p", "fg3");

  }
  label = label.replaceAll("%", "_PCT").toLowerCase().replaceAll(" ", "_");
  return label;
}

module.exports.mergeColumnRow = function (columnNames, rowStats) {
  // spaja listu imena columna sa odgovarajuim vrijednostima
  const obj = {};
  for (let i = 0; i < columnNames.length; i++) {
    obj[columnNames[i]] = rowStats[i];
  }
  return obj
}

module.exports.loadDynamicPage = async function (fullLink) {
  const browser = await puppeteer.launch({
    headless: false, args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });
  try {
    const page = await browser.newPage();
    await page.goto(fullLink);
    await page.waitForSelector("#onetrust-accept-btn-handler");
    await page.click("#onetrust-accept-btn-handler");

    const content = await page.content();
    await browser.close();
    return content;
  } catch (err) {
    await browser.close();
    logger.error("page load error", err);
  }

};


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports.sleep = sleep;

module.exports.scrapeUntilSuccessful = function (wrapped) {
  return async function () {
    while (true) {
      try {
        const data = await wrapped.apply(this, arguments);
        return data;
      } catch (err) {
        logger.error(err);
        await sleep(1000);
      }
    }
  }
}
