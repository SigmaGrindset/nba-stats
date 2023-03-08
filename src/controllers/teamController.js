const Team = require("../models/Team");
const TeamCurrentRoster = require("../models/TeamCurrentRoster");
const logger = require("../config/logger");

module.exports.teamdetails_get = async (req, res) => {
  const teamId = req.params.teamId;
  const team = await Team.findOne({ _id: teamId });
  const teamPlayers = await TeamCurrentRoster.find({ team: team.id });
  if (team) {
    res.render("team_details.ejs", { team, teamPlayers })
  } else {
    res.render("errors/error.ejs", { error: { name: "Error 404 not found", desc: "The resource you requested doesn't exist." } })
  }

}


module.exports.teamsdetails_get = async (req, res) => {
  return res.render("teams.ejs");
}
