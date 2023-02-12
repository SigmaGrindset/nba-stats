const fs = require("fs").promises;

module.exports.getTeamLinks = async function () {
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

module.exports.transformLabel = function (label) {
  // pretvara label u mala slova i joina sa _
  label = label.toLowerCase().replaceAll(" ", "_");
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
