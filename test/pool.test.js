const { runPool } = require("../src/utils/pool");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

describe("worker pool", () => {

  test("visits every item exactly once, in order", async () => {
    const items = [...Array(20).keys()];
    const seen = [];

    await runPool(items, async item => {
      seen.push(item);
    }, 4);

    expect(seen.sort((a, b) => a - b)).toEqual(items);
  });

  test("keeps the requested number of workers busy", async () => {
    let running = 0;
    let peak = 0;

    await runPool([...Array(30).keys()], async () => {
      running++;
      peak = Math.max(peak, running);
      await sleep(5);
      running--;
    }, 5);

    expect(peak).toEqual(5);
  });

  test("doesn't let a slow item hold up the ones behind it", async () => {
    // Held open rather than timed: the first item finishes only once every other
    // item has, which pins the ordering exactly instead of racing two sleeps.
    // (An earlier version slept 60ms against 1ms and flaked - Windows rounds a
    // 1ms timer up to its ~15ms resolution, so five "fast" items outlasted it.)
    const finished = [];
    let releaseFirstItem;
    const firstItem = new Promise(resolve => { releaseFirstItem = resolve; });

    await runPool([0, 1, 2, 3, 4, 5], async index => {
      if (index === 0) {
        await firstItem;
      }
      finished.push(index);
      if (finished.length === 5) {
        releaseFirstItem();
      }
    }, 2);

    // the second worker kept pulling new items the whole time the first was busy
    expect(finished).toEqual([1, 2, 3, 4, 5, 0]);
  });

  test("never runs more workers than there are items", async () => {
    let peak = 0;
    let running = 0;

    await runPool(["only one"], async () => {
      running++;
      peak = Math.max(peak, running);
      await sleep(5);
      running--;
    }, 8);

    expect(peak).toEqual(1);
  });

  test("does nothing with an empty list", async () => {
    const worker = jest.fn();
    await runPool([], worker, 4);
    expect(worker).not.toHaveBeenCalled();
  });
});
