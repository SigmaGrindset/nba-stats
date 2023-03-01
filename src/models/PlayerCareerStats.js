const mongoose = require("mongoose");


const playerCareerStatsSchema = new mongoose.Schema({
  season_id: {
    type: String,
    required: true
  },
  player: {
    type: Number,
    ref: "Player"
  },
  type: {
    type: String,
    required: true
  },
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

playerCareerStatsSchema.statics.handlePlayerStats = async function (stats, playerId) {
  // stats je {type, seasons:[]}
  if (stats) {
    stats.seasons.forEach(async (season) => {
      const existingSeasonStats = await this.findOne({ type: stats.type, player: playerId, season_id: season.season_id, team: season.team });
      if (!existingSeasonStats) {
        const newStats = await this.create({ ...season, player: playerId, type: stats.type });
        return newStats;
      }
      return existingSeasonStats
    });
  }
}

playerCareerStatsSchema.index({ season_id: 1, team: 1, player: 1, type: 1 }, { unique: true });

const PlayerCareerStats = mongoose.model("PlayerCareerStats", playerCareerStatsSchema);
module.exports = PlayerCareerStats;
