const PlayerGameStats = require("../models/PlayerGameStats");
const Game = require("../models/Game");
const logger = require("../config/logger");


module.exports.gamedetails_get = async (req, res) => {
  const gameId = req.params.gameId;
  const game = await Game.findOne({ _id: gameId });
  const awayTeamStats = await PlayerGameStats.find({ game: gameId, team: game.awayTeam._id });
  const homeTeamStats = await PlayerGameStats.find({ game: gameId, team: game.homeTeam._id });

  const teamStats = [
    {
      teamName: game.homeTeam.name,
      stats: homeTeamStats,
      teamBoxScore: game.homeTeamStats
    },
    {
      teamName: game.awayTeam.name,
      stats: awayTeamStats,
      teamBoxScore: game.awayTeamStats
    }
  ];
  logger.info(game.awayTeamStats);
  if (game) {
    res.render("game.ejs", { game, teams: teamStats });
  } else {
    res.render("errors/error.ejs", { error: { name: "Error 404 not found", desc: "The resource you requested doesn't exist." } })
  }
}
