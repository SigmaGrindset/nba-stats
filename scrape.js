const jsdom = require("jsdom")
const { JSDOM } = jsdom
const axios = require("axios")
const axiosInstance = axios.create({ baseURL: "https://www.basketball-reference.com" })

async function scrapeTeams() {
  const res = await axios.get("https://www.basketball-reference.com/teams/")
  const dom = new JSDOM(res.data)
  const teamsActiveTable = dom.window.document.querySelector("#teams_active")
  const activeTeams = teamsActiveTable.querySelectorAll(".full_table")

  link = activeTeams[0].querySelector("a").getAttribute("href")
  currentSeasonTeamLink = await getCurrentSeasonTeam(link)
  scrapeTeam(currentSeasonTeamLink)

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
    const text = p.textContent.split(":")
    console.log(p.textContent.split("\n"))
    // if (text.length == 2) {
    //   let [name, value] = text

    //   name = name.replaceAll(" ", "").replaceAll("\n", "").trim()
    //   name = name[0].toLowerCase() + name.slice(1)
    //   value = removeWhitespace(value.replaceAll("\n", "").trim())

    //   teamData[name] = value;

    // } else {
    //   // console.log(p.textContent.split("\n"))
    //   p = p.textContent.split("\n")
    //   p = removeWhitespaceFromArr(p)
    //   p.forEach(item => {
    //     if (item.splice(-2) == ":") {

    //     }
    //   });
    // }
  });
  // console.log(teamData)

}

function removeWhitespaceFromArr(arr) {
  arr2 = []
  arr.forEach(item => {
    item = removeWhitespace(item)
    if (item !== "") {
      arr2.push(item)
    }
  });
  return arr2
}

scrapeTeams()
