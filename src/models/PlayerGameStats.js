const mongoose = require("mongoose");

const playerGameStatsSchema = new mongoose.Schema({
  game: {
    type: Number,
    ref: "Game",
    required: true
  },
  player: {
    type: Number,
    ref: "Player",
    required: true
  },

  stats: {
    type: mongoose.Types.ObjectId,
    ref: "BoxScoreStats",
    unique: true,
    required: true
  }
});

playerGameStatsSchema.index({ player: 1, game: 1 }, { unique: true });
const PlayerGameStats = mongoose.model("PlayerGameStats", playerGameStatsSchema);
module.exports = PlayerGameStats;
