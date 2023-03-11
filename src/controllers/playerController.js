
const logger = require("../config/logger");
const Player = require("../models/Player");
const PlayerCareerStats = require("../models/PlayerCareerStats");
const TeamCurrentRoster = require("../models/TeamCurrentRoster");

module.exports.playerdetails_get = async (req, res) => {
  const playerId = req.params.playerId;
  const player = await Player.findOne({ _id: playerId });
  const regSeasonStats = await PlayerCareerStats.find({ type: "Career Regular Season Stats", player: player._id });
  const playoffsStats = await PlayerCareerStats.find({ type: "Career Playoffs Stats", player: player._id });
  let team = await TeamCurrentRoster.findOne({ player: player._id });
  if (team) {
    team = team.team;
  };
  const stats = [regSeasonStats, playoffsStats];

  if (player) {
    res.render("player_details.ejs", { player, stats, team });
  } else {
    res.render("errors/error.ejs", { error: { name: "Error 404 not found", desc: "The resource you requested doesn't exist." } })

  }
}

