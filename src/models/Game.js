const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  _id: Number,
  homeTeam: {
    type: Number,
    ref: "Team",
    required: true,
    autopopulate: true,
  },
  awayTeam: {
    type: Number,
    ref: "Team",
    required: true,
    autopopulate: true,
  },
  homeTeamStats: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BoxScoreStats",
    required: true,
    autopopulate: true
  },
  awayTeamStats: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BoxScoreStats",
    required: true,
    autopopulate: true
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

gameSchema.plugin(require("mongoose-autopopulate"));

const Game = mongoose.model("Game", gameSchema);
module.exports = Game;
