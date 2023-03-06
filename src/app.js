const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");

const Team = require("./models/Team");
const Player = require("./models/Player");
const Game = require("./models/Game");
const TeamCurrentRoster = require("./models/TeamCurrentRoster");
const PlayerCareerStats = require("./models/PlayerCareerStats");
const PlayerGameStats = require("./models/PlayerGameStats");
const BoxScoreStats = require("./models/BoxScoreStats");

const app = express();
// app.use(helmet());
app.use(morgan("dev"))
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.get("/", (req, res) => {
  res.render("home.ejs")
});

app.get("/team/:teamId", async (req, res) => {
  const teamId = req.params.teamId;
  const team = await Team.findOne({ _id: teamId });
  const teamPlayers = await TeamCurrentRoster.find({ team: team.id });
  if (team) {
    res.render("team.ejs", { team, teamPlayers })
  } else {
    res.render("errors/error.ejs", { error: { name: "Error 404 not found", desc: "The resource you requested doesn't exist." } })
  }

});

app.get("/error", async (req, res) => {
  res.render("errors/error.ejs", { error: { name: "error 404", desc: "page not found" } });
});

app.get("/player/:playerId", async (req, res) => {
  const playerId = req.params.playerId;
  const player = await Player.findOne({ _id: playerId });
  const regSeasonStats = await PlayerCareerStats.find({ type: "Career Regular Season Stats", player: player._id });
  const playoffsStats = await PlayerCareerStats.find({ type: "Career Playoffs Stats", player: player._id });
  const teamRoster = await TeamCurrentRoster.findOne({ player: player._id });
  const stats = [regSeasonStats, playoffsStats];
  if (player) {
    res.render("player.ejs", { player, stats, team: teamRoster.team });
  } else {
    res.render("errors/error.ejs", { error: { name: "Error 404 not found", desc: "The resource you requested doesn't exist." } })

  }
});
app.get("/game/:gameId", async (req, res) => {
  const gameId = req.params.gameId;
  const game = await Game.findOne({ _id: gameId });
  const allPlayerStats = await PlayerGameStats.find({ game: gameId });
  const awayTeamStats = await PlayerGameStats.find({ game: gameId, team: game.awayTeam._id });
  const homeTeamStats = await PlayerGameStats.find({ game: gameId, team: game.homeTeam._id });

  const teamStats = [
    {
      teamName: game.homeTeam.name,
      stats: homeTeamStats,
      teamBoxScore: game.homeTeamStats
    },
    {
      teamName: game.awayTeam.name,
      stats: awayTeamStats,
      teamBoxScore: game.awayTeamStats
    }
  ];
  console.log(game.awayTeamStats);
  if (game) {
    res.render("game.ejs", { game, teams: teamStats });
  } else {
    res.render("errors/error.ejs", { error: { name: "Error 404 not found", desc: "The resource you requested doesn't exist." } })
  }
});


const {player_get, game_get, team_get, playercareerstats_get, playergamestats_get} = require("./controllers/apiController");
const {requireBody} = require("./middleware/apiMiddleware");

app.get("/api/player",app.use(express.urlencoded({ extended: false })) ,requireBody, player_get);
app.get("/api/game",app.use(express.urlencoded({ extended: false })) ,requireBody, game_get);
app.get("/api/team",app.use(express.urlencoded({ extended: false })) ,requireBody, team_get);
app.get("/api/player-career-stats",app.use(express.urlencoded({ extended: false })) ,requireBody, playercareerstats_get);
app.get("/api/player-game-stats",app.use(express.urlencoded({ extended: false })) ,requireBody, playergamestats_get);


mongoose.connect("mongodb+srv://sanji:diablejambe@nba-stats.9dwaife.mongodb.net/nba-stats?retryWrites=true&w=majority")
  .then(() => {
    app.listen(3000);
    console.log("app listening on port 3000");
  })
  .catch(err => console.log(err));


