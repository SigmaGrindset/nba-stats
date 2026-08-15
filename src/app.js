const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const logger = require("./config/logger");
const connectToDatabase = require("./config/db");

require("./models/Team");
require("./models/Player");
require("./models/Game");
require("./models/BoxScoreStats");
require("./models/TeamCurrentRoster");
require("./models/PlayerCareerStats");
require("./models/PlayerGameStats");

const port = process.env.PORT || 3000;
const app = express();

// Vercel terminates TLS upstream, so trust the proxy for correct client IPs
// (which the rate limiter keys on).
app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // team logos and player headshots are served from nba.com's CDN
      imgSrc: ["'self'", "https://cdn.nba.com", "data:"],
      // the views set colours via inline style attributes
      styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(morgan("dev"));
app.use(cors());
app.use(compression());
app.use(express.static(path.join(__dirname, "public"), { maxAge: "1d" }));
app.use(express.json());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Every request needs the database, and on serverless the connection may not
// exist yet. Awaiting the cached connection here keeps controllers unchanged.
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/", (req, res) => {
  res.render("home.ejs");
});

// Atlas pauses a free cluster after 30 days with zero connections, which would
// silently take the site down. A daily Vercel cron hits this route to keep the
// cluster awake; it doubles as an uptime check.
app.get("/api/health", async (req, res) => {
  const counts = {};
  for (const name of ["teams", "players", "games"]) {
    counts[name] = await mongoose.connection.db.collection(name).estimatedDocumentCount();
  }

  return res.json({
    status: "ok",
    database: mongoose.connection.db.databaseName,
    counts,
    checkedAt: new Date().toISOString()
  });
});

const apiRouter = require("./routes/apiRoutes.js");
const teamRouter = require("./routes/teamRoutes.js");
const gameRouter = require("./routes/gameRoutes.js");
const playerRouter = require("./routes/playerRoutes.js");
const searchRouter = require("./routes/searchRoutes");
app.use(apiRouter);
app.use(teamRouter);
app.use(gameRouter);
app.use(playerRouter);
app.use(searchRouter);

// API clients get JSON; browsers get the rendered error page.
const isApiRequest = req => req.path.startsWith("/api/");

app.use((req, res) => {
  if (isApiRequest(req)) {
    return res.status(404).json({ error: "Endpoint not found." });
  }
  return res.status(404).render("errors/error.ejs", {
    error: { name: "Error 404", desc: "The page you requested doesn't exist." }
  });
});

// Without this an exception in any controller left the request hanging.
app.use((err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl} - ${err.stack || err.message}`);
  if (isApiRequest(req)) {
    return res.status(500).json({ error: "Internal server error." });
  }
  return res.status(500).render("errors/error.ejs", {
    error: { name: "Error 500", desc: "Something went wrong on our end." }
  });
});

// Only listen when started directly (local dev, pm2, Docker). Under Vercel the
// app is exported and invoked as a serverless handler instead.
if (require.main === module) {
  connectToDatabase()
    .then(() => {
      app.listen(port, () => logger.info(`app listening on port ${port}`));
    })
    .catch(err => {
      logger.error(`failed to start: ${err.message}`);
      process.exit(1);
    });
}

module.exports = app;
