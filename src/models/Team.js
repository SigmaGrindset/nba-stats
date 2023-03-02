const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    unique: true,
    type: String,
    required: true
  },
  pageColor: {
    type: String,
    required: true,
  },
  imageURL: {
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
    ppg: new mongoose.Schema({
      placement: {
        required: true,
        type: String
      },
      value: {
        required: true,
        type: Number
      }
    }),
    apg: new mongoose.Schema({
      placement: {
        required: true,
        type: String
      },
      value: {
        required: true,
        type: Number
      }
    }),
    rpg: new mongoose.Schema({
      placement: {
        required: true,
        type: String
      },
      value: {
        required: true,
        type: Number
      }
    }),
    oppg: new mongoose.Schema({
      placement: {
        required: true,
        type: String
      },
      value: {
        required: true,
        type: Number
      }
    })
  }),
  records: {
    type: Object,
    required: true
  },
  coaching: {
    type: Object,
    required: true
  },
  background: {
    type: Object,
    required: true
  },
  achievements: {
    type: Object,
    required: true
  },
});


const Team = mongoose.model("Team", teamSchema);

module.exports = Team;
