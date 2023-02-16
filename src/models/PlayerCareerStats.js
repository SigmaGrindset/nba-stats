const mongoose = require("mongoose");

const playerCareerStatsSchema = new mongoose.Schema({
  _id: new mongoose.Schema({
    season_id: {
      type: String,
      required: true
    },
    player: {
      type: mongoose.Types.ObjectId,
      ref: "Player"
    },
    type: {
      type: String,
      required: true
    },
  }),


  team: {
    type: String,
    required: true
  },

  player_age: {
    type: Number,
    required: true
  },
  gp: {
    type: Number,
    required: true
  },
  gs: {
    type: Number,
    required: true
  },
  min: {
    type: Number,
    required: true
  },
  pts: {
    type: Number,
    required: true
  },
  fgm: {
    type: Number,
    required: true
  },
  fga: {
    type: Number,
    required: true
  },
  fg_pct: {
    type: Number,
    required: true
  },
  fg3m: {
    type: Number,
    required: true
  },
  fg3a: {
    type: Number,
    required: true
  },
  fg3_pct: {
    type: Number,
    required: true
  },
  ftm: {
    type: Number,
    required: true
  },
  fta: {
    type: Number,
    required: true
  },
  ft_pct: {
    type: Number,
    required: true
  },
  oreb: {
    type: Number,
    required: true
  },
  dreb: {
    type: Number,
    required: true
  },
  reb: {
    type: Number,
    required: true
  },
  ast: {
    type: Number,
    required: true
  },
  stl: {
    type: Number,
    required: true
  },
  blk: {
    type: Number,
    required: true
  },
  tov: {
    type: Number,
    required: true
  },
  pf: {
    type: Number,
    required: true
  }


});

const PlayerCareerStats = mongoose.model("PlayerCareerStats", playerCareerStatsSchema);
module.exports = PlayerCareerStats;
