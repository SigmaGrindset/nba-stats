const Player = require("../models/Player");
const Team = require("../models/Team");
const Game = require("../models/Game");
const TeamCurrentRoster = require("../models/TeamCurrentRoster");
const PlayerCareerStats = require("../models/PlayerCareerStats");
const PlayerGameStats = require("../models/PlayerGameStats");
const logger = require("../config/logger");

// These endpoints read their parameters from the query string. They previously
// read req.body on GET requests, which proxies and CDNs are free to discard -
// so the API worked locally and returned "please provide request body" once
// deployed behind one.

function notFound(res, message) {
  return res.status(404).json({ error: message });
}

function serverError(res, err) {
  logger.error(err);
  return res.status(500).json({ error: "Internal server error." });
}

module.exports.player_get = async function (req, res) {
  try {
    const { playerId, name, number, teamId } = req.query;

    if (playerId) {
      const player = await Player.findOne({ _id: playerId });
      return player ? res.json({ player }) : notFound(res, "Player not found.");
    }
    if (name) {
      return res.json({ players: await Player.find({ name }) });
    }
    if (number) {
      return res.json({ players: await Player.find({ number }) });
    }
    if (teamId) {
      const playerRosters = await TeamCurrentRoster.find({ team: teamId });
      return res.json({ players: playerRosters.map(roster => roster.player) });
    }

    return res.status(400).json({
      error: "Provide one of: playerId, name, number, teamId."
    });
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports.game_get = async function (req, res) {
  try {
    const { gameId, teamId } = req.query;

    if (gameId) {
      const game = await Game.findOne({ _id: gameId });
      return game ? res.json(game) : notFound(res, "Game not found.");
    }
    if (teamId) {
      const games = await Game.find({
        $or: [{ homeTeam: teamId }, { awayTeam: teamId }]
      }).sort({ dateEpoch: 1 });
      return res.json(games);
    }

    return res.status(400).json({ error: "Provide one of: gameId, teamId." });
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports.team_get = async function (req, res) {
  try {
    const { teamId, name } = req.query;

    if (teamId) {
      const team = await Team.findOne({ _id: teamId });
      return team ? res.json(team) : notFound(res, "Team not found.");
    }
    if (name) {
      const team = await Team.findOne({ name });
      return team ? res.json(team) : notFound(res, "Team not found.");
    }

    return res.status(400).json({ error: "Provide one of: teamId, name." });
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports.playercareerstats_get = async function (req, res) {
  try {
    const { playerId } = req.query;
    if (!playerId) {
      return res.status(400).json({ error: "Provide playerId." });
    }
    return res.json(await PlayerCareerStats.find({ player: playerId }));
  } catch (err) {
    return serverError(res, err);
  }
}

module.exports.playergamestats_get = async function (req, res) {
  try {
    const { playerId, teamId, gameId } = req.query;

    // previously queried the Player model on fields it doesn't have, and never
    // sent a response - so the request hung until the client timed out
    const query = {};
    if (playerId) query.player = playerId;
    if (teamId) query.team = teamId;
    if (gameId) query.game = gameId;

    if (Object.keys(query).length === 0) {
      return res.status(400).json({
        error: "Provide at least one of: playerId, teamId, gameId."
      });
    }

    return res.json(await PlayerGameStats.find(query));
  } catch (err) {
    return serverError(res, err);
  }
}
