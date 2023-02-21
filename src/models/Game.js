const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  homeTeam: {
    type: Number,
    ref: "Team",
    required: true
  },
  awayTeam: {
    type: Number,
    ref: "Team",
    required: true
  },
  homeTeamStats: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BoxScoreStats",
    required: true
  },
  awayTeamStats: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BoxScoreStats",
    required: true
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
