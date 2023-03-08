const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const logger = require("./config/logger");
require("./models/Team");
require("./models/Player");
require("./models/Game");
require("./models/BoxScoreStats");
require("./models/TeamCurrentRoster");
require("./models/PlayerCareerStats");
require("./models/PlayerGameStats");


const port = process.env.PORT || 3000;
const app = express();
// app.use(helmet());
mongoose.connect("mongodb+srv://sanji:diablejambe@nba-stats.9dwaife.mongodb.net/nba-stats?retryWrites=true&w=majority")
  .then(() => {
    app.listen(port);
    logger.info(`app listening on port ${port}`);
  })
  .catch(err => logger.error(err));


app.use(morgan("dev"))
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.get("/", (req, res) => {
  res.render("home.ejs")
});

app.get("/error", async (req, res) => {
  res.render("errors/error.ejs", { error: { name: "error 404", desc: "page not found" } });
});


const apiRouter = require("./routes/apiRoutes.js");
const teamRouter = require("./routes/teamRoutes.js");
const gameRouter = require("./routes/gameRoutes.js");
const playerRouter = require("./routes/playerRoutes.js");
app.use(apiRouter);
app.use(teamRouter);
app.use(gameRouter);
app.use(playerRouter);




