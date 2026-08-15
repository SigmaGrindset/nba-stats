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

// 1 -> "1st", 2 -> "2nd", 23 -> "23rd"
module.exports.ordinal = function (n) {
  if (n === null || n === undefined || isNaN(n)) {
    return "-";
  }
  const num = Number(n);
  const mod100 = num % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${num}th`;
  }
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[num % 10] || "th";
  return `${num}${suffix}`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports.sleep = sleep;

// Retries a scrape a bounded number of times with exponential backoff, then gives
// up and rethrows. The previous version looped forever, so a selector change or a
// permanent 404 would spin silently instead of surfacing the failure.
module.exports.scrapeUntilSuccessful = function (wrapped, attempts = 4) {
  return async function () {
    let lastErr;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await wrapped.apply(this, arguments);
      } catch (err) {
        lastErr = err;
        const status = err.response && err.response.status;
        if (status === 404 || err.permanent) {
          // the resource genuinely isn't there - retrying can't help
          throw err;
        }
        if (attempt < attempts) {
          const backoff = 1000 * 2 ** (attempt - 1);
          logger.warn(`${wrapped.name} failed (attempt ${attempt}/${attempts}): ${err.message}. retrying in ${backoff}ms`);
          await sleep(backoff);
        }
      }
    }
    logger.error(`${wrapped.name} failed after ${attempts} attempts: ${lastErr.message}`);
    throw lastErr;
  }
}
