const express = require("express");
const router = express.Router();

const { searchdata_get, search_get, search_post } = require("../controllers/searchController");

// router.get("/search", playerdetails_get);
router.get("/search-data", searchdata_get);
router.post("/search", search_post)
router.get("/search/:query", search_get)

module.exports = router;
