const mongoose = require("mongoose");

const teamCurrentRosterSchema = new mongoose.Schema({
  _id: {
    player: {
      type: mongoose.Types.ObjectId,
      ref: "Player"
    },
    team: {
      type: mongoose.Types.ObjectId,
      ref: "Team"
    }
  }
});

const TeamCurrentRoster = mongoose.model("TeamCurrentRoster", teamCurrentRosterSchema);
module.exports = TeamCurrentRoster;
