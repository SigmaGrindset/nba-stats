const mongoose = require("mongoose");

const requiredNumber = {
  type: Number,
  required: true
};

const boxScoreStatsSchema = new mongoose.Schema({
  min: String,
  fgm: requiredNumber,
  fga: requiredNumber,
  fg_pct: requiredNumber,
  fg3m: requiredNumber,
  fg3a: requiredNumber,
  fg3_pct: requiredNumber,
  ftm: requiredNumber,
  fta: requiredNumber,
  ft_pct: requiredNumber,
  oreb: requiredNumber,
  dreb: requiredNumber,
  reb: requiredNumber,
  ast: requiredNumber,
  stl: requiredNumber,
  blk: requiredNumber,
  to: requiredNumber,
  pf: requiredNumber,
  pts: requiredNumber,
  plus_minus: requiredNumber

});

const BoxScoreStats = mongoose.model("BoxScoreStats", boxScoreStatsSchema);

module.exports = BoxScoreStats;
