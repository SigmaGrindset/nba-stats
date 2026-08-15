
// GET requests carry their parameters in the query string, not a body.
module.exports.requireQuery = function (req, res, next) {
  if (Object.keys(req.query).length === 0) {
    return res.status(400).json({ error: "Please provide query parameters." });
  }
  return next();
}
