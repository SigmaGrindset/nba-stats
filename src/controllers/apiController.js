const Player = require("../models/Player");
const Team = require("../models/Team");
const Game = require("../models/Game");
const TeamCurrentRoster = require("../models/TeamCurrentRoster");
const PlayerCareerStats = require("../models/PlayerCareerStats");
const logger = require("../config/logger");

module.exports.player_get = async function (req, res) {
  try {

    if (req.body.playerId) {
      const player = await Player.findOne({ _id: req.body.playerId });
      if (player) {
        return res.json({ player });
      } else {
        return res.json({ error: "Error 404, player not found." });
      }
    } else if (req.body.name) {
      const players = await Player.find({ name: req.body.name });
      return res.json({
        players
      });
    } else if (req.body.number) {
      const players = await Player.find({ number: req.body.number });
      return res.json({
        players
      });
    } else if (req.body.teamId) {
      const playerRosters = await TeamCurrentRoster.find({ team: req.body.teamId });
      const players = [];
      playerRosters.forEach(roster => {
        players.push(roster.player);
      });
      return res.json({
        players
      });
    }
  } catch (err) {
    logger.error(err);
    return res.json({ error: "400 error" });
  }
}

module.exports.game_get = async function (req, res) {
  try {

    if (req.body.gameId) {
      const game = await Game.findOne({ _id: req.body.gameId });
      if (game) {
        return res.json(game);
      } else {
        return res.json({ error: "Error 404, game not found." })
      }
    } else if (req.body.teamId) {
      const games = [];
      const homeGames = await Game.find({ homeTeam: req.body.teamId });
      const awayGames = await Game.find({ awayTeam: req.body.teamId });
      games.push(...homeGames);
      games.push(...awayGames);
      return res.json(games)
    }
  } catch (err) {
    logger.error(err);
    return res.json({ error: "400 error" });
  }
}


module.exports.team_get = async function (req, res) {
  try {

    if (req.body.teamId) {
      const team = await Team.findOne({ _id: req.body.teamId });
      if (team) {
        return res.json(team);
      } else {
        return res.json({ error: "Error 404, team not found" })
      }
    } else if (req.body.name) {
      const team = await Team.findOne({ name: req.body.name });
      if (team) {
        return res.json(team);
      } else {
        return res.json({ error: "Error 404, team not found" });
      }
    }
  } catch (err) {
    logger.error(err);
    return res.json({ error: "400 error" });
  }
}


module.exports.playercareerstats_get = async function (req, res) {
  try {
    if (req.body.playerId) {
      const stats = await PlayerCareerStats.find({ player: req.body.playerId });
      return res.json(stats)
    }
  } catch (err) {
    logger.error(err);
    return res.json({ error: "400 error" });
  }
}

module.exports.playergamestats_get = async function (req, res) {
  try {
    // player game team
    const playerQuery = await Player.find({ player: req.body.playerId });
    const teamQuery = await Player.find({ team: req.body.teamId });
    const gameQuery = await Player.find({ game: req.body.gameId });

  } catch (err) {
    logger.error(err);
    return res.json({ error: "400 error" });
  }
}
