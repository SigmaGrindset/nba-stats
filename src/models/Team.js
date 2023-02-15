const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  record: {
    type: String,
    required: true
  },
  placementText: {
    type: String,
    required: true
  },
  ranksData: new mongoose.Schema({
    ppg: { type: Number, required: true },
    apg: { type: Number, required: true },
    rpg: { type: Number, required: true },
    oppg: { type: Number, required: true }
  })
});


const Team = mongoose.model("Team", teamSchema);

module.exports = Team;
