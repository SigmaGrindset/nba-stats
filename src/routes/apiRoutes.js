
const { player_get, game_get, team_get, playercareerstats_get, playergamestats_get } = require("../controllers/apiController");
const { requireQuery } = require("../middleware/apiMiddleware");
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

router.use("/api", apiLimiter);

router.get("/api/player", requireQuery, player_get);
router.get("/api/game", requireQuery, game_get);
router.get("/api/team", requireQuery, team_get);
router.get("/api/player-career-stats", requireQuery, playercareerstats_get);
router.get("/api/player-game-stats", requireQuery, playergamestats_get);


module.exports = router;
