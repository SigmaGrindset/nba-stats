const express = require("express");
const router = express.Router();

const { gamedetails_get } = require("../controllers/gameController");

router.get("/game/:gameId", gamedetails_get);

module.exports = router;
