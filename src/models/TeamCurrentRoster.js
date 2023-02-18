const mongoose = require("mongoose");

const teamCurrentRosterSchema = new mongoose.Schema({
  player: {
    type: Number,
    ref: "Player",
    required: true
  },
  team: {
    type: Number,
    ref: "Team",
    required: true
  }
});

teamCurrentRosterSchema.index({ player: 1, team: 1 }, { unique: true });

const TeamCurrentRoster = mongoose.model("TeamCurrentRoster", teamCurrentRosterSchema);
module.exports = TeamCurrentRoster;
