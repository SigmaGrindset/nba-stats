const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");

const Team = require("./models/Team");
const Player = require("./models/Player");
const Game = require("./models/Game");
const TeamCurrentRoster = require("./models/TeamCurrentRoster");

const app = express();
// app.use(helmet());
app.use(morgan("dev"))
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.get("/", (req, res) => {
  res.render("home.ejs")
});

app.get("/team/:teamId", async (req, res) => {
  const teamId = req.params.teamId;
  const team = await Team.findOne({ id: teamId });
  const teamPlayers = await TeamCurrentRoster.find({ team: team.id });
  console.log(teamPlayers[0]);
  // console.log(team);
  if (team) {
    res.render("team.ejs", { team: team })
  } else {
    res.render("errors/error.ejs", { error: { name: "Error 404 not found", desc: "The resource you requested doesn't exist." } })
  }

});

app.get("/error", async (req, res) => {
  res.render("errors/error.ejs", { error: { name: "error 404", desc: "page not found" } });
});

app.get("/player", (req, res) => {
  res.render("player.ejs")
});
app.get("/game", (req, res) => {
  res.render("game.ejs")
});


mongoose.connect("mongodb+srv://sanji:diablejambe@nba-stats.9dwaife.mongodb.net/nba-stats?retryWrites=true&w=majority")
  .then(() => {
    app.listen(3000);
    console.log("app listening on port 3000");
  })
  .catch(err => console.log(err));


