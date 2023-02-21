const mongoose = require("mongoose");
const BoxScoreStats = require("./models/BoxScoreStats");
const Game = require("./models/Game");
const Player = require("./models/Player");
const PlayerCareerStats = require("./models/PlayerCareerStats");
const PlayerGameStats = require("./models/PlayerGameStats");
const Team = require("./models/Team");
const TeamCurrentRoster = require("./models/TeamCurrentRoster");


const { getTeamLinks, scrapeTeam } = require("./scrape/teams");
const { getPlayerLinks, scrapePlayer, scrapePlayerStats, createLinkFromPlayerId, getPlayerStatsLink } = require("./scrape/players");
const { getGameLinks, scrapeGame } = require("./scrape/games");



mongoose.connect("mongodb+srv://sanji:diablejambe@nba-stats.9dwaife.mongodb.net/nba-stats?retryWrites=true&w=majority")
  .then(console.log("connected to db"))
  .catch(err => console.log(err));


async function addPlayer(playerId, teamId) {
  const existingPlayer = await Player.findOne({ id: playerId });
  if (!existingPlayer) {
    const playerData = await scrapePlayer(createLinkFromPlayerId(playerId));
    const player = await Player.create({ ...playerData });
    console.log("player created", player.name);
  } else {
    console.log("player exists", existingPlayer.name);
  }
  if (teamId) {
    // ako je retired igrac onda nece biti u timu
    await TeamCurrentRoster.assignPlayer(playerId, teamId);
  }

  // career stats;
  const playerStatsLink = await getPlayerStatsLink({ playerId });
  const careerStats = await scrapePlayerStats(playerStatsLink);
  await PlayerCareerStats.handlePlayerStats(careerStats.regSeason, playerId);
  await PlayerCareerStats.handlePlayerStats(careerStats.playoffs, playerId);
}


async function addGame(gameLink) {

  const gameData = await scrapeGame(gameLink);
  const existingGame = await Game.findOne({ id: gameData.id });
  if (!existingGame) {

    const awayTeamBoxScore = await BoxScoreStats.create({ ...gameData.boxScore[0].playerStats.slice(-1)[0] });
    const homeTeamBoxScore = await BoxScoreStats.create({ ...gameData.boxScore[1].playerStats.slice(-1)[0] });
    const game = await Game.create({
      id: gameData.id,
      date: gameData.date,
      location: gameData.location,
      attendance: gameData.attendance,
      officials: gameData.officials,
      awayTeam: gameData.boxScore[0].teamId,
      homeTeam: gameData.boxScore[1].teamId,
      homeTeamStats: homeTeamBoxScore._id,
      awayTeamStats: awayTeamBoxScore._id,
    });
    console.log("game created:", game.id);
    await addGameStats(gameData);
  }
}


async function addGameStats(gameData) {
  for (teamStats of gameData.boxScore) {
    for (playerStats of teamStats.playerStats) {
      if (playerStats.player != "totals") {
        const existingPlayer = await Player.findOne({ id: playerStats.player });
        // if (!existingPlayer) {
        // ako je u gameu igrao igrač koji nije dodan u bazu podataka
        // await addPlayer(playerStats.player);
        // }
        const stats = await BoxScoreStats.create({ ...playerStats });
        console.log("stats created:", stats)
        const gameStats = await PlayerGameStats.create({
          game: gameData.id,
          player: playerStats.player,
          stats: stats._id
        });
        console.log("player game stats created:", gameStats);
      }
    }
  }
}


async function scrapeTeamWrapper() {
  const teamLinks = await getTeamLinks();

  [teamLinks[0]].forEach(async (link) => {
    // const teamId = parseInt(link.split("/").slice(-2, -1));
    const teamData = await scrapeTeam(link);
    await sleep(1000);
    let team = await Team.findOne({ id: teamData.id });
    if (!team) {
      team = await Team.create({ ...teamData });
      console.log("team created:", team.name)
    }

    for (playerId of teamData.players) {
      await sleep(1500);
      await addPlayer(playerId, teamData.id);
    }

    const teamGames = await getGameLinks(link);
    for (gameLink of teamGames) {
      await sleep(3000);
      await addGame(gameLink);
    }

  });
}


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

scrapeTeamWrapper();
