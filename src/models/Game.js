const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  homeTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team"
  },
  awayTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team"
  },
  homeTeamStats: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BoxScoreStats"
  },
  awayTeamStats: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BoxScoreStats"
  },
  date: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  officials: {
    type: String,
    required: true
  },
  attendance: {
    type: String,
    required: true
  }
});


const Game = mongoose.model("Game", gameSchema);
module.exports = Game;
