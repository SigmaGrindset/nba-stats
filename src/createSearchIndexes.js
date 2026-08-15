/**
 * Creates the Atlas Search indexes the search page depends on.
 *
 * src/controllers/searchController.js runs $search with no index name, which
 * Atlas resolves to the index called "default". Both the teams and players
 * collections are queried the same way, so both need one.
 *
 * Idempotent: an index that already exists is left alone.
 *
 *   node src/createSearchIndexes.js
 */
require("dotenv").config();

const mongoose = require("mongoose");
const connectToDatabase = require("./config/db");
const logger = require("./config/logger");

const COLLECTIONS = ["teams", "players"];

const DEFINITION = {
  mappings: {
    dynamic: false,
    fields: {
      name: {
        type: "autocomplete",
        tokenization: "edgeGram",
        minGrams: 2,
        maxGrams: 15,
        foldDiacritics: true
      }
    }
  }
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function existingIndex(collection, name) {
  // listSearchIndexes throws on a collection that does not exist yet
  try {
    const indexes = await collection.listSearchIndexes().toArray();
    return indexes.find(index => index.name === name);
  } catch (err) {
    return undefined;
  }
}

/**
 * Atlas builds search indexes asynchronously; a query against one that is still
 * building returns no results rather than an error, which would look like a bug
 * in the app. Wait for it to report queryable.
 */
async function waitUntilReady(collection, name, timeoutMs = 300000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const index = await existingIndex(collection, name);
    if (index && index.queryable) {
      return index;
    }
    logger.info(`  ${collection.collectionName}.${name}: ${index ? index.status : "not found"} ...`);
    await sleep(5000);
  }

  throw new Error(`${collection.collectionName}.${name} did not become queryable in time`);
}

async function main() {
  await connectToDatabase();
  const db = mongoose.connection.db;

  const names = (await db.listCollections().toArray()).map(c => c.name);

  for (const name of COLLECTIONS) {
    if (!names.includes(name)) {
      throw new Error(`collection "${name}" does not exist yet - run the scrape first`);
    }

    const collection = db.collection(name);
    const already = await existingIndex(collection, "default");

    if (already) {
      logger.info(`${name}: "default" already exists (${already.status})`);
    } else {
      await collection.createSearchIndex({ name: "default", definition: DEFINITION });
      logger.info(`${name}: created "default"`);
    }
  }

  logger.info("waiting for indexes to become queryable");
  for (const name of COLLECTIONS) {
    const index = await waitUntilReady(db.collection(name), "default");
    logger.info(`${name}: READY (${index.status})`);
  }

  await mongoose.disconnect();
}

main().catch(async err => {
  logger.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
