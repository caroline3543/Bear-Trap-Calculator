/* Round 31: a plan with a check-in in the player's sleep gets an easier alternative. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MINUTE, HOUR } from "../lib/time.js";
import { planBatches, planJourney, restOpts, sleepyCheckIns, easierPlan } from "../lib/batches.js";

const TZ = "Pacific/Auckland";
const SLEEP = { start: "22:00", end: "07:00", target: "21:45" };
const rest = restOpts(TZ, SLEEP);
const nz = (iso) => Date.parse(iso + "+13:00");
const camps = (...h) => ["infantry_camp", "lancer_camp", "marksman_camp"].slice(0, h.length).map((camp, i) => ({ camp, troop: "normal", maxMs: h[i] }));
const MAX = 13 * HOUR + 14 * MINUTE;

test("restOpts: asleep / wake / bedtime of that night", () => {
  assert.equal(rest.asleep(nz("2026-10-09T04:23")), true);
  assert.equal(rest.asleep(nz("2026-10-09T08:00")), false);
  assert.equal(rest.wake(nz("2026-10-09T04:23")), nz("2026-10-09T07:00"));
  assert.equal(rest.bed(nz("2026-10-09T04:23")), nz("2026-10-08T21:45"));
  assert.equal(rest.bed(nz("2026-10-08T23:10")), nz("2026-10-08T21:45"));
});

test("a 4:23 AM check-in moves to bedtime: nothing lost, nobody woken", () => {
  const now = nz("2026-10-08T15:09"); // max batch → 4:23 AM
  const target = nz("2026-10-11T15:05");
  const max = planBatches(now, target, camps(MAX, MAX, MAX), "max");
  assert.equal(max.checkIns[0].at, nz("2026-10-09T04:23"));
  assert.ok(sleepyCheckIns(max, rest).length >= 1);
  const rested = planBatches(now, target, camps(MAX, MAX, MAX), "rested", rest);
  assert.equal(sleepyCheckIns(rested, rest).length, 0);
  assert.equal(rested.checkIns[0].at, nz("2026-10-08T21:45")); // before bed instead
  assert.equal(rested.end, max.end); // the target never moves
  assert.ok(rested.camps.every((c) => c.batches.every((b) => b.ms <= MAX && b.ms > 0)));
  const e = easierPlan(max, rested, rest);
  assert.equal(e.moved, nz("2026-10-09T04:23"));
  assert.equal(e.lostMs, 0);
});

test("a night longer than the batch: wait until you're up — the lost training is reported", () => {
  const now = nz("2026-10-08T12:00");
  const target = nz("2026-10-09T20:00");
  const six = camps(6 * HOUR, 6 * HOUR);
  const max = planBatches(now, target, six, "max"); // 6 PM, midnight, 6 AM, noon, 6 PM
  const rested = planBatches(now, target, six, "rested", rest);
  assert.equal(sleepyCheckIns(rested, rest).length, 0);
  assert.ok(rested.idleMs > 0);
  const e = easierPlan(max, rested, rest);
  assert.equal(e.lostMs, max.trainedMs - rested.trainedMs);
  assert.ok(e.lostMs > 0);
  assert.equal(rested.end, max.end);
});

test("no sleepy check-in → no easier plan offered; planJourney passes the mode through", () => {
  const now = nz("2026-10-08T08:00");
  const target = nz("2026-10-08T20:00");
  const max = planBatches(now, target, camps(8 * HOUR), "max"); // one check-in at 4 PM
  assert.equal(easierPlan(max, planBatches(now, target, camps(8 * HOUR), "rested", rest), rest), null);
  const j = planJourney(nz("2026-10-08T15:09"), nz("2026-10-11T15:05"), camps(MAX), { mode: "rested", rest });
  assert.equal(j.mode, "rested");
  assert.equal(sleepyCheckIns(j, rest).length, 0);
});
