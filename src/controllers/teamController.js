const Team = require("../models/Team");
const Game = require("../models/Game");
const TeamCurrentRoster = require("../models/TeamCurrentRoster");
const { seasonFromGameId, seasonIdPattern } = require("../utils/season");
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

  // Team._id is a String but Game's refs to it are Numbers. Model queries paper
  // over that by casting to the schema type; the raw driver query below doesn't,
  // and would silently match nothing.
  const teamRef = Number(team._id);
  const playedBy = { $or: [{ awayTeam: teamRef }, { homeTeam: teamRef }] };

  // Which seasons this team has games for. Ids only, because Game autopopulates
  // four refs and this query exists purely to build the season picker - with
  // several seasons stored, hydrating every game to list them would fetch a few
  // thousand documents to render a dropdown.
  const seasons = [...new Set(
    (await Game.collection
      .find(playedBy, { projection: { _id: 1 } })
      .toArray())
      .map(game => seasonFromGameId(game._id))
      .filter(Boolean)
  )].sort().reverse();

  // Default to the most recent season rather than everything: a team plays ~82
  // games a year, so "all seasons" grows without bound as more are scraped.
  const requested = req.query.season;
  const season = seasons.includes(requested) ? requested : seasons[0];

  const allGames = season
    ? await Game
      .find({ ...playedBy, _id: seasonIdPattern(season) })
      .sort({ dateEpoch: 1 })
    : [];

  // autopopulate leaves the ref null if the referenced team is missing
  const games = allGames.filter(game => game.awayTeam && game.homeTeam);

  return res.render("team_details.ejs", { team, teamPlayers, games, seasons, season });
}


module.exports.teamsdetails_get = async (req, res) => {
  return res.render("teams.ejs");
}
