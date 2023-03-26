const mongoose = require("mongoose");

const playerGameStatsSchema = new mongoose.Schema({
  game: {
    type: String,
    ref: "Game",
    required: true,
    autopopulate: true
  },
  player: {
    type: Number,
    ref: "Player",
    required: true,
    autopopulate: true
  },
  team: {
    type: Number,
    ref: "Team",
    required: true,
    autopopulate: true
  },

  stats: {
    type: mongoose.Types.ObjectId,
    ref: "BoxScoreStats",
    unique: true,
    required: true,
    autopopulate: true
  }
});

playerGameStatsSchema.index({ player: 1, game: 1 }, { unique: true });
playerGameStatsSchema.plugin(require("mongoose-autopopulate"));
const PlayerGameStats = mongoose.model("PlayerGameStats", playerGameStatsSchema);
module.exports = PlayerGameStats;
