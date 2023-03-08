const express = require("express");
const router = express.Router();

const { teamdetails_get, teamsdetails_get } = require("../controllers/teamController");

router.get("/team/:teamId", teamdetails_get);
router.get("/teams", teamsdetails_get);

module.exports = router;
