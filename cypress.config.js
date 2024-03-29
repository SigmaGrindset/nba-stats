const { defineConfig } = require('cypress')

module.exports = defineConfig({
  downloadsFolder: 'test/cypress/downloads',
  fixturesFolder: 'test/cypress/fixtures',
  screenshotsFolder: 'test/cypress/screenshots',
  videosFolder: 'test/cypress/videos',
  e2e: {
    setupNodeEvents(on, config) {
      return require('./test/cypress/plugins/index.js')(on, config)
    },
    baseUrl: 'http://localhost:3000',
    specPattern: 'test/cypress/integration/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'test/cypress/support/index.js',
  },
})
