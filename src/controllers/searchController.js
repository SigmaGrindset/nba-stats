const Player = require("../models/Player");
const Team = require("../models/Team");
const Game = require("../models/Game");
const logger = require("../config/logger");


module.exports.searchdata_get = async (req, res) => {
  // read from the query string: this is a GET route, and its body was dropped
  // once the app sat behind a proxy
  const query = req.query.query;
  if (!query) {
    return res.status(400).json({ error: "Provide a query parameter." });
  }

  const teams = await Team
    .aggregate()
    .search({
      autocomplete: {
        query,
        path: "name"
      }
    });

  const players = await Player
    .aggregate()
    .search({
      autocomplete: {
        query,
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
