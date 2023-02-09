const jsdom = require("jsdom")
const { JSDOM } = jsdom
const axios = require("axios")
const axiosInstance = axios.create({ baseURL: "https://www.basketball-reference.com" })

async function scrapeTeams() {
  const res = await axios.get("https://www.basketball-reference.com/teams/")
  const dom = new JSDOM(res.data)
  const teamsActiveTable = dom.window.document.querySelector("#teams_active")
  const activeTeams = teamsActiveTable.querySelectorAll(".full_table")

  // activeTeams.forEach(async team => {
  link = activeTeams[0].querySelector("a").getAttribute("href")
  currentSeasonTeamLink = await getCurrentSeasonTeam(link)
  const teamData = scrapeTeam(currentSeasonTeamLink)
  console.log(teamData)
  // });

}

async function getCurrentSeasonTeam(link) {
  // link za team opcenito, vraca link za team u trenutnoj sezoni
  const res = await axiosInstance.get(link)
  const dom = new JSDOM(res.data)
  const table = dom.window.document.querySelector(".stats_table")
  const body = table.querySelector("tbody")
  const row = body.querySelector("tr")
  const team = row.querySelectorAll("td")[1].querySelector("a").getAttribute("href")
  return team
}

function removeWhitespace(expression) {
  expression = expression.split(" ")
  expression = expression.filter(word => word !== "")
  res = ""
  expression.forEach(word => {
    res = res.concat(word, " ")
  });
  res.trim()
  return res
}


async function scrapeTeam(link) {
  const res = await axiosInstance.get(link)
  const dom = new JSDOM(res.data)

  const general = dom.window.document.querySelector("#meta")
  const dataWrapper = general.querySelectorAll("div")[1]
  const dataParagraphs = dataWrapper.querySelectorAll("p")

  let teamData = {}

  dataParagraphs.forEach(p => {
    row = p.textContent.split("\n")
    if (row.length == 1) {
      [name, value] = oneStatParagraph(row)
      teamData[name] = value
    }
    else {
      // ako u redu ima vise statistika
      row = removeWhitespaceFromArr(row)
      let currentStatValue = ""
      let currentName = ""
      let rowStats = {}
      row.forEach(item => {
        if (item.split(":").length == 2 && item.split(":")[1] !== "") {
          // ako je oblika ["name: value", "name:value"]
          [name, value] = oneStatParagraph([item])
          rowStats[name] = value
        } else {
          if (item.slice(-1) == ":") {
            // ako je samo name, znaci da nakon njega dolaze vrijednosti i mozda opet name
            if (currentName !== "") {
              rowStats[currentName] = currentStatValue
              currentName = ""
              currentStatValue = ""
            }
            currentName = item.replace(":", "")
          } else {
            // ako je vrijednost statistike
            currentStatValue = currentStatValue.concat(item).concat(" ")
          }
          if (currentName !== "") {
            rowStats[currentName] = currentStatValue
          }
        }

      })
      teamData = {
        ...teamData,
        ...rowStats
      }
    }
  })
  return teamData
}

function oneStatParagraph(row) {
  // ako je jedna statistika u redu
  [statName, value] = row[0].split(":")
  statName = removeWhitespace(statName).replaceAll("\n", "").trim()
  value = removeWhitespace(value).replaceAll("\n", "").trim()
  return [statName, value]
}

function removeWhitespaceFromArr(arr) {
  arr2 = []
  arr.forEach(item => {
    item = removeWhitespace(item)
    item = item.trim()
    if (item !== "") {
      arr2.push(item)
    }
  });
  return arr2
}

// scrapeTeams()

async function dsadsa() {

  const res = await axios.get("https://www.basketball-reference.com/teams/")
}

dsadsa()
