const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  _id: String,
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
  summaryText: {
    type: String,
    required: true
  },
  summaryLocation: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  dateEpoch: {
    type: Number,
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

// The team page asks for one franchise's games on every request, which without
// these is a full scan of the collection - tolerable at one season, less so now
// that it holds several. Mongo can union the two for the $or the query uses.
gameSchema.index({ homeTeam: 1, dateEpoch: 1 });
gameSchema.index({ awayTeam: 1, dateEpoch: 1 });

gameSchema.plugin(require("mongoose-autopopulate"));

const Game = mongoose.model("Game", gameSchema);
module.exports = Game;
