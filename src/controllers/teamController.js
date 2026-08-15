const Team = require("../models/Team");
const Game = require("../models/Game");
const TeamCurrentRoster = require("../models/TeamCurrentRoster");
const logger = require("../config/logger");

module.exports.teamdetails_get = async (req, res) => {
  const teamId = req.params.teamId;
  const team = await Team.findOne({ _id: teamId });

  // same as the player page: team.id was dereferenced before the null check
  if (!team) {
    return res.status(404).render("errors/error.ejs", {
      error: { name: "Error 404 not found", desc: "The resource you requested doesn't exist." }
    });
  }

  const teamPlayers = await TeamCurrentRoster.find({ team: team.id });

  const allGames = await Game
    .find({
      $or: [{ awayTeam: team._id }, { homeTeam: team._id }],
    })
    .sort({ dateEpoch: 1 });

  // autopopulate leaves the ref null if the referenced team is missing
  const games = allGames.filter(game => game.awayTeam && game.homeTeam);

  return res.render("team_details.ejs", { team, teamPlayers, games });
}


module.exports.teamsdetails_get = async (req, res) => {
  return res.render("teams.ejs");
}
