const Team = require("../models/Team");
const Game = require("../models/Game");
const TeamCurrentRoster = require("../models/TeamCurrentRoster");
const logger = require("../config/logger");

module.exports.teamdetails_get = async (req, res) => {
  const teamId = req.params.teamId;
  const team = await Team.findOne({ _id: teamId });
  const teamPlayers = await TeamCurrentRoster.find({ team: team.id });

  const games = await Game
    .find({
      $or: [{ awayTeam: team._id }, { homeTeam: team._id }]
    })
    .sort({ date: 1 });
  if (team) {
    res.render("team_details.ejs", { team, teamPlayers, games })
  } else {
    res.render("errors/error.ejs", { error: { name: "Error 404 not found", desc: "The resource you requested doesn't exist." } })
  }

}


module.exports.teamsdetails_get = async (req, res) => {
  return res.render("teams.ejs");
}
