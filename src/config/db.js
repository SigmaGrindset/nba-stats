const mongoose = require("mongoose");
const logger = require("./logger");

// On Vercel each request may hit a cold or warm serverless instance. Opening a
// new connection per invocation would exhaust the Atlas connection limit fast,
// so the promise is cached on the global object, which survives between
// invocations that reuse the same instance.
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set. Copy .env.example to .env and fill it in.");
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGO_URI, {
        // fail fast instead of hanging a serverless request for 30s
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10
      })
      .then(m => {
        logger.info("connected to db");
        return m;
      })
      .catch(err => {
        // clear the cache so the next request can retry rather than reusing
        // a permanently rejected promise
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectToDatabase;
