const mongoose = require("mongoose");

const teamCurrentRosterSchema = new mongoose.Schema({
  player: {
    type: Number,
    ref: "Player",
    required: true,
    autopopulate: true,
    unique: true // jedan igrac moze biti samo u jednom timu
  },
  team: {
    type: Number,
    autopopulate: true,
    ref: "Team",
    required: true
  }
});


teamCurrentRosterSchema.statics.assignPlayer = async function (playerId, teamId) {
  // dodaje igraca u tim i provjerava jeli igra vec u nekom timu
  const existingTeam = await this.findOne({ player: playerId });
  if (existingTeam) {
    if (existingTeam.team != teamId) {
      // filter on the player alone: the stale row holds the *old* team, so
      // filtering by the new teamId matched nothing and the insert below then
      // tripped the unique index on player.
      await this.deleteOne({ player: playerId });
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

teamCurrentRosterSchema.plugin(require('mongoose-autopopulate'));

const TeamCurrentRoster = mongoose.model("TeamCurrentRoster", teamCurrentRosterSchema);
module.exports = TeamCurrentRoster;
