const mongoose = require("mongoose");
const BoxScoreStats = require("./models/BoxScoreStats");
const Game = require("./models/Game");
const Player = require("./models/Player");
const PlayerCareerStats = require("./models/PlayerCareerStats");
const PlayerGameStats = require("./models/PlayerGameStats");
const Team = require("./models/Team");
const TeamCurrentRoster = require("./models/TeamCurrentRoster");


mongoose.connect("mongodb+srv://sanji:diablejambe@nba-stats.9dwaife.mongodb.net/?retryWrites=true&w=majority")
  .then(console.log("connected to db"))
  .catch(err => console.log(err));



