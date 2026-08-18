
const logger = require("../config/logger");
const Player = require("../models/Player");
const PlayerCareerStats = require("../models/PlayerCareerStats");
const PlayerGameStats = require("../models/PlayerGameStats");
const TeamCurrentRoster = require("../models/TeamCurrentRoster");

module.exports.playerdetails_get = async (req, res) => {
  const playerId = req.params.playerId;
  const player = await Player.findOne({ _id: playerId });

  // the null check used to come after player._id was already dereferenced,
  // so an unknown id threw a TypeError instead of rendering the 404 page
  if (!player) {
    return res.status(404).render("errors/error.ejs", {
      error: { name: "Error 404 not found", desc: "The resource you requested doesn't exist." }
    });
  }

  // oldest season first, the way a career table reads. Only mattered once more
  // than one season was scraped, before which every player had a single row.
  const bySeason = { season_id: 1, team: 1 };
  const regSeasonStats = await PlayerCareerStats
    .find({ type: "Career Regular Season Stats", player: player._id })
    .sort(bySeason);
  const playoffsStats = await PlayerCareerStats
    .find({ type: "Career Playoffs Stats", player: player._id })
    .sort(bySeason);
  let team = await TeamCurrentRoster.findOne({ player: player._id });
  if (team) {
    team = team.team;
  };
  const stats = [regSeasonStats, playoffsStats];

  return res.render("player_details.ejs", { player, stats, team });
}

