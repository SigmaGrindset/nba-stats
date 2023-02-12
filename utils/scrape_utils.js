const fs = require("fs").promises;


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
