
/// <reference types="cypress" />
// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)
/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars
const mongoose = require("mongoose");
const Team = require("../../../src/models/Team");
const TeamCurrentRoster = require("../../../src/models/TeamCurrentRoster");
const Player = require("../../../src/models/Player");
const Game = require("../../../src/models/Game");
const BoxScoreStats = require("../../../src/models/BoxScoreStats");
const PlayerGameStats = require("../../../src/models/PlayerGameStats");
const PlayerCareerStats = require("../../../src/models/PlayerCareerStats");

mongoose.connect("mongodb+srv://sanji:diablejambe@nba-stats.9dwaife.mongodb.net/nba-stats?retryWrites=true&w=majority")
  .then(() => {
    console.log(`connected to db for tests`);
  })
  .catch(err => { console.log(err) });

module.exports = (on, config) => {
  // on("before:spec", function () {
  // }),


  on("task", {
    async getTeams({ project }) {
      const teams = await Team.find(null, project);
      return teams;
    },

    async getTeamPlayers({ teamId }) {
      const players = await TeamCurrentRoster.find({ team: teamId }, { player: 1, _id: 0, team: 0 });
      return players;
    },

    async teamRosterQuery(query) {
      const roster = await TeamCurrentRoster.find(query);
      return roster;
    },

    async careerStatsQuery(query) {
      const regSeasonStats = await PlayerCareerStats.findGroup(query, 0);
      const playoffsStats = await PlayerCareerStats.findGroup(query, 1);
      return [regSeasonStats, playoffsStats];
    },

    async getTeamGames({ teamId }) {
      const games = [];
      const homeGames = await Game.find({ homeTeam: teamId });
      const awayGames = await Game.find({ awayTeam: teamId });
      games.push(...homeGames);
      games.push(...awayGames);

      return games;
    },
    async getGame() {
      const game = await Game.findOne({});
      return game;
    },
    async getTeamPlayersGameStats({ gameId, teamId }) {
      const playerStats = await PlayerGameStats.find({ game: gameId, team: teamId });
      return playerStats;
    },

    async getPlayer({ playerId }) {
      const player = await Player.findOne({ _id: playerId });
      return player;
    }

  });


}
