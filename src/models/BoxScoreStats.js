const mongoose = require("mongoose");

const stat = {
  type: Number,
};

const boxScoreStatsSchema = new mongoose.Schema({
  min: {
    type: String
  },
  fgm: stat,
  fga: stat,
  fg_pct: stat,
  fg3m: stat,
  fg3a: stat,
  fg3_pct: stat,
  ftm: stat,
  fta: stat,
  ft_pct: stat,
  oreb: stat,
  dreb: stat,
  reb: stat,
  ast: stat,
  stl: stat,
  blk: stat,
  to: stat,
  pf: stat,
  pts: stat,
  plus_minus: stat,
  status: {
    type: String
  }

});

const BoxScoreStats = mongoose.model("BoxScoreStats", boxScoreStatsSchema);

module.exports = BoxScoreStats;
