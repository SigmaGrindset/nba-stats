const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");

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
app.get("/team", (req, res) => {
  res.render("team.ejs")
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


