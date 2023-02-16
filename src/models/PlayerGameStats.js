const mongoose = require("mongoose");

const playerGameStatsSchema = new mongoose.Schema({
  _id: new mongoose.Schema({
    game: {
      type: mongoose.Types.ObjectId,
      ref: "Game"
    },
    player: {
      type: mongoose.Types.ObjectId,
      ref: "Player"
    }

  }),

  stats: {
    type: mongoose.Types.ObjectId,
    ref: "BoxScoreStats"
  }
});

const PlayerGameStats = mongoose.model("PlayerGameStats", playerGameStatsSchema);
module.exports = PlayerGameStats;
