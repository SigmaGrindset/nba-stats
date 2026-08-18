// Runs an async worker over a list with a fixed number of concurrent slots.
//
// Written as N racing loops pulling from a shared cursor rather than as chunked
// batches: with batches the whole run waits on the slowest page in each chunk,
// and nba.com's response times vary by an order of magnitude.
//
// The worker must handle its own errors. A throw rejects the returned promise
// while the other slots carry on in the background, which is never what a
// caller wants - so callers catch per item and record the failure instead.
async function runPool(items, worker, concurrency) {
  const width = Math.max(1, Math.min(concurrency, items.length));
  let cursor = 0;

  async function slot() {
    while (cursor < items.length) {
      const index = cursor++;
      await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: width }, slot));
}

module.exports.runPool = runPool;
