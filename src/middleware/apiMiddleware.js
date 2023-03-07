
module.exports.requireBody = async function (req, res, next) {
  if (Object.values(req.body).length == 0) {
    return res.json({ error: "Please provide request body." });
  } else {
    next();
  }
}
