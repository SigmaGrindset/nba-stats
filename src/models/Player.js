const mongoose = require("mongoose");




const playerSchema = new mongoose.Schema({
  _id: Number,
  pageColor: {
    type: String,
    required: true,
    default: "#000"
  },
  imageURL: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  number: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  stats: new mongoose.Schema({
    ppg: {
      required: true,
      type: String
    },
    rpg: {
      required: true,
      type: String
    },
    apg: {
      required: true,
      type: String
    },
    pie: {
      required: true,
      type: String
    },
  }),
  height: {
    type: String,
    required: true,
    default: "Unknown"
  },
  weight: {
    type: String,
    required: true,
    default: "Unknown"
  },
  country: {
    type: String,
    required: true,
    default: "Unknown"
  },
  last_attended: {
    type: String,
    required: true,
    default: "Unknown"
  },
  birthdate: {
    type: String,
    required: true,
    default: "Unknown"
  },
  draft: {
    type: String,
    required: true,
    default: "Unknown"
  },
  experience: {
    type: String,
    required: true,
    default: "Unknown"
  },
  age: {
    type: String,
    required: true,
    default: "Unknown"
  },


});

const Player = mongoose.model("Player", playerSchema);

module.exports = Player;
