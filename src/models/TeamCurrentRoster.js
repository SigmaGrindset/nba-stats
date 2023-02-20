const mongoose = require("mongoose");

const teamCurrentRosterSchema = new mongoose.Schema({
  player: {
    type: Number,
    ref: "Player",
    required: true,
    unique: true // jedan igrac moze biti samo u jednom timu
  },
  team: {
    type: Number,
    ref: "Team",
    required: true
  }
});


teamCurrentRosterSchema.statics.assignPlayer = async function (playerId, teamId) {
  // dodaje igraca u tim i provjerava jeli igra vec u nekom timu
  const existingTeam = await this.findOne({ player: playerId });
  if (existingTeam) {
    if (existingTeam.team != teamId) {
      await this.deleteOne({ player: playerId, team: teamId });
      const newTeam = await this.create({ player: playerId, team: teamId });
      return newTeam
    } else {
      return existingTeam;
    }
  } else {
    const newTeam = await this.create({ player: playerId, team: teamId });
    return newTeam;
  }

};


const TeamCurrentRoster = mongoose.model("TeamCurrentRoster", teamCurrentRosterSchema);
module.exports = TeamCurrentRoster;
