const express = require("express");
const router = express.Router();

const { playerdetails_get, playersearch_get } = require("../controllers/playerController");

router.get("/player/:playerId", playerdetails_get);

module.exports = router;
