const axios = require("axios");

const BASEURL = "https://www.nba.com";
const STATSURL = "https://stats.nba.com";

// nba.com serves every page as Next.js SSR and embeds the page's data as JSON in
// a __NEXT_DATA__ script tag. Reading that JSON is far more stable than parsing
// the rendered DOM, whose CSS-module class names are rehashed on every deploy.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

// stats.nba.com rejects requests that don't look like they came from the site.
const STATS_HEADERS = {
  ...BROWSER_HEADERS,
  Accept: "application/json, text/plain, */*",
  Referer: "https://www.nba.com/",
  Origin: "https://www.nba.com",
  "x-nba-stats-origin": "stats",
  "x-nba-stats-token": "true",
};

const axiosInstance = axios.create({
  baseURL: BASEURL,
  timeout: 30000,
  headers: BROWSER_HEADERS,
});

// stats.nba.com either answers in a few seconds or not at all - when it throttles
// it simply stops responding. A long timeout therefore buys nothing and costs a
// lot: every player would stall the run for the full duration before failing.
const statsInstance = axios.create({
  baseURL: STATSURL,
  timeout: 20000,
  headers: { ...STATS_HEADERS, Connection: "keep-alive" },
});

const NEXT_DATA_RE =
  /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;

async function fetchNextData(path) {
  const res = await axiosInstance.get(path);
  const match = String(res.data).match(NEXT_DATA_RE);
  if (!match) {
    throw new Error(`no __NEXT_DATA__ found at ${path}`);
  }
  const parsed = JSON.parse(match[1]);
  if (!parsed.props || !parsed.props.pageProps) {
    throw new Error(`unexpected __NEXT_DATA__ shape at ${path}`);
  }
  return parsed.props.pageProps;
}

// stats.nba.com returns column-oriented result sets: { headers: [...], rowSet: [[...]] }.
// Turn a named set into an array of plain objects with lowercased keys.
async function fetchStatsResultSet(path, params, resultSetName) {
  const res = await statsInstance.get(path, { params });
  const set = (res.data.resultSets || []).find((s) => s.name === resultSetName);
  if (!set) {
    return [];
  }
  return set.rowSet.map((row) => {
    const obj = {};
    set.headers.forEach((header, i) => {
      obj[header.toLowerCase()] = row[i];
    });
    return obj;
  });
}

module.exports = {
  BASEURL,
  STATSURL,
  axiosInstance,
  statsInstance,
  fetchNextData,
  fetchStatsResultSet,
};
