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

  [teamLinks[0]].forEach(async (link) => {
    // const teamId = parseInt(link.split("/").slice(-2, -1));
    const teamData = await scrapeTeam(link);
    await sleep(1000);
    let team = await Team.findOne({ id: teamData.id });
    if (!team) {
      team = await Team.create({ ...teamData });
    }



    teamData.players.forEach(async (playerId) => {
      const existingPlayer = await Player.findOne({ id: playerId });
      console.log(playerId);
      if (!existingPlayer) {
        await sleep(1000);
        const playerData = await scrapePlayer(createLinkFromPlayerId(playerId));
        const player = await Player.create({ ...playerData });
        console.log("player created", player.name);
      } else {
        console.log("player exists", existingPlayer.name);
      }
      await TeamCurrentRoster.assignPlayer(playerId, teamData.id);

      // career stats;
      sleep(5000)
      const playerStatsLink = await getPlayerStatsLink({ playerId });
      const careerStats = await scrapePlayerStats(playerStatsLink);
      await PlayerCareerStats.handlePlayerStats(careerStats.regSeason);
      await PlayerCareerStats.handlePlayerStats(careerStats.playoffs);
    });
  });


}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

scrapeTeamWrapper();
