
/// <reference types="cypress" />
// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)
/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars
const mongoose = require("mongoose");
const Team = require("../../../src/models/Team");
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
    }
  })


}
