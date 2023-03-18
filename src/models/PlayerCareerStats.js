const mongoose = require("mongoose");


const playerCareerStatsSchema = new mongoose.Schema({
  season_id: {
    type: String,
    required: true
  },
  player: {
    type: Number,
    ref: "Player",
    required: true,
    autopopulate: true
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

playerCareerStatsSchema.statics.findGroup = async function (query, groupId) {
  // reg season - 0
  // playoffs - 1
  let groupShortName;
  if (groupId == 0) {
    query.type = "Career Regular Season Stats";
    groupShortName = "Regular Season"
    // mozda staviti da ide u bazu podataka dok se bude scrapealo
  } else if (groupId == 1) {
    query.type = "Career Playoffs Stats";
    groupShortName = "Playoffs"
  }
  const data = await this.find(query);
  return {
    statsGroupName: groupShortName,
    data: data
  };
}

playerCareerStatsSchema.index({ season_id: 1, team: 1, player: 1, type: 1 }, { unique: true });
playerCareerStatsSchema.plugin(require("mongoose-autopopulate"));

const PlayerCareerStats = mongoose.model("PlayerCareerStats", playerCareerStatsSchema);
module.exports = PlayerCareerStats;
