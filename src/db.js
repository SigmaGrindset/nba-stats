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



async function scrapeTeamWrapper() {
  const teamLinks = await getTeamLinks();
  const teamData = await scrapeTeam(teamLinks[0])
  // const team = await Team.create({ ...teamData });

  const playerId = teamData.players[0];

  const playerData = await scrapePlayer(createLinkFromPlayerId(playerId));
  // console.log(playerData);

  // const roster = await TeamCurrentRoster.create({
  //   player: playerId,
  //   team: teamData.id
  // });
  // const player = await Player.create({
  //   ...playerData
  // });

  
}


scrapeTeamWrapper();
