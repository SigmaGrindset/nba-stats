// Vercel serverless entrypoint. An Express app is itself a (req, res) handler,
// so the platform can invoke it directly. src/app.js only calls listen() when it
// is the main module, so importing it here starts no server.
module.exports = require("../src/app");
