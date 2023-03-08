const express = require("express");
const router = express.Router();

const { teamdetails_get } = require("../controllers/teamControllers");

router.get("/team/:teamId", teamdetails_get);

module.exports = router;
