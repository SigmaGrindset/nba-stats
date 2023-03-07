
const { player_get, game_get, team_get, playercareerstats_get, playergamestats_get } = require("../controllers/apiController");
const { requireBody } = require("../middleware/apiMiddleware");
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

router.use(express.urlencoded({ extended: false }));
// router.use(apiLimiter);

router.get("/api/player", requireBody, player_get);
router.get("/api/game", requireBody, game_get);
router.get("/api/team", requireBody, team_get);
router.get("/api/player-career-stats", requireBody, playercareerstats_get);
router.get("/api/player-game-stats", requireBody, playergamestats_get);


module.exports = router;
