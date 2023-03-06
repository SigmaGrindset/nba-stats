

module.exports.requireBody = async function(req, res, next) {
    console.log(req.body)
    if (Object.values(req.body).length == 0) {
        return res.json({error:"Please provide request body."});
    } else {
        next();
    }
}