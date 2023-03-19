const Player = require("../models/Player");
const Team = require("../models/Team");
const Game = require("../models/Game");
const logger = require("../config/logger");


module.exports.searchdata_get = async (req, res) => {
  const teams = await Team
    .aggregate()
    .search({
      autocomplete: {
        query: req.body.query,
        path: "name"
      }
    });

  const players = await Player
    .aggregate()
    .search({
      autocomplete: {
        query: req.body.query,
        path: "name"
      }
    });

  return res.json({ players, teams });
}


module.exports.search_get = async (req, res) => {
  const query = req.params.query;
  const teams = await Team
    .aggregate()
    .search({
      autocomplete: {
        query: query,
        path: "name"
      }
    });

  const players = await Player
    .aggregate()
    .search({
      autocomplete: {
        query: query,
        path: "name"
      }
    });


  return res.render("search.ejs", { query, queryResults: [players, teams] });
}
module.exports.search_post = async (req, res) => {
  logger.info(req.body);
  return res.redirect(`/search/${req.body.query}`);

}
