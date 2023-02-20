const fs = require("fs").promises;
const puppeteer = require("puppeteer");

module.exports.transformLabel = function (label) {
  // pretvara label u mala slova i joina sa _
  if (label == "+/-") {
    label = "plus_minus";
  }
  if (label[0] == "3") {
    label.replace("3p", "fg3");

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
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(fullLink);

  await page.waitForSelector("#onetrust-accept-btn-handler");
  await page.click("#onetrust-accept-btn-handler");

  const content = await page.content();
  await browser.close();
  return content;

}
