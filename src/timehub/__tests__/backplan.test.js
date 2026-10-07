/* Round 30: work backwards from the target — acceptance tests from the brief. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MINUTE, HOUR } from "../lib/time.js";
import { backPlan, resetTarget, startReminders } from "../lib/backplan.js";

const CAP = 39 * HOUR + 42 * MINUTE; // 1d 15h 42m
const SAT_0005 = Date.UTC(2026, 9, 10, 0, 5); // Sat 00:05 UTC = Sat 1:05 PM NZDT
const nz = (iso) => Date.parse(iso + "+13:00");
const camps = (...durs) => ["infantry_camp", "lancer_camp", "marksman_camp"].slice(0, durs.length).map((camp, i) => ({ camp, troop: "normal", durMs: durs[i] }));
const hhmmUTC = (t) => new Date(t).toISOString().slice(11, 16);

test("SvS: 00:05 UTC target, Training Capacity → start Thu 08:23 UTC (9:23 PM NZ); Marksman 9h28m starts separately", () => {
  assert.equal(resetTarget(nz("2026-10-08T13:00"), 5), Date.UTC(2026, 9, 8, 0, 5)); // 1:00 PM NZDT is 00:00 UTC, so reset + 5 min is five minutes away
  assert.equal(resetTarget(nz("2026-10-08T13:10"), 5), Date.UTC(2026, 9, 9, 0, 5)); // once 00:05 UTC has passed: the NEXT reset + 5 min
  const p = backPlan(nz("2026-10-08T13:00"), SAT_0005, camps(CAP, CAP, 9 * HOUR + 28 * MINUTE));
  assert.equal(p.state, "future");
  const inf = p.rows[0], mk = p.rows[2];
  assert.equal(inf.start, nz("2026-10-09T21:23") - 24 * HOUR); // Thu 9:23 PM
  assert.equal(hhmmUTC(inf.start), "08:23");
  assert.equal(mk.start, SAT_0005 - (9 * HOUR + 28 * MINUTE)); // Sat 3:37 AM NZ
  assert.ok(p.rows.every((r) => r.end === SAT_0005)); // finish together
  assert.equal(p.groups.length, 2); // Infantry+Lancer share a start; Marksman separate
  assert.deepEqual(p.groups[0].camps, ["infantry_camp", "lancer_camp"]);
});

test("future start: never 'start now' — 8h 23m until the start", () => {
  const now = nz("2026-10-08T13:00");
  const p = backPlan(now, SAT_0005, camps(CAP));
  assert.equal(p.state, "future");
  assert.equal(p.firstStart - now, 8 * HOUR + 23 * MINUTE);
  let n = 0;
  assert.deepEqual(startReminders(p, SAT_0005, () => `r${++n}`), [{ id: "r1", camps: ["infantry_camp"], startAt: p.firstStart, target: SAT_0005 }]);
});

test("a few minutes late → start now, trimmed so it still finishes ON the target", () => {
  const now = SAT_0005 - CAP + 3 * MINUTE;
  const p = backPlan(now, SAT_0005, camps(CAP));
  assert.equal(p.state, "now");
  assert.equal(p.rows[0].start, now);
  assert.equal(p.rows[0].durMs, CAP - 3 * MINUTE);
  assert.equal(p.rows[0].end, SAT_0005);
});

test("a few minutes early is still 'start later' — never finish before the target (reset!)", () => {
  const now = SAT_0005 - CAP - 3 * MINUTE;
  const p = backPlan(now, SAT_0005, camps(CAP));
  assert.equal(p.state, "future");
  assert.equal(p.firstStart - now, 3 * MINUTE);
  assert.equal(backPlan(SAT_0005 - CAP, SAT_0005, camps(CAP)).state, "now"); // exactly on time
});

test("nothing ever ends after the target, in any state", () => {
  for (const h of [1, 9, 20, 36, 40, 60]) {
    for (const sync of ["finish", "start"]) {
      const p = backPlan(SAT_0005 - h * HOUR - 7 * MINUTE, SAT_0005, camps(CAP, 13 * HOUR, 9 * HOUR + 28 * MINUTE), { sync });
      assert.ok(p.rows.every((r) => r.end <= SAT_0005 && r.durMs > 0), `${h}h ${sync}`);
    }
  }
});

test("missed start: Fri 1:00 AM → full batch no longer fits; most that fits is 36h 05m, ending at the target", () => {
  const now = nz("2026-10-09T01:00");
  const p = backPlan(now, SAT_0005, camps(CAP));
  assert.equal(p.state, "passed");
  assert.equal(p.rows[0].fits, false);
  assert.equal(p.rows[0].durMs, 36 * HOUR + 5 * MINUTE);
  assert.equal(p.rows[0].end, SAT_0005);
});

test("mixed: Infantry's full batch has passed, Marksman still starts later", () => {
  const now = nz("2026-10-09T01:00");
  const p = backPlan(now, SAT_0005, camps(CAP, 9 * HOUR));
  assert.equal(p.state, "mixed");
  assert.equal(p.rows[1].start, SAT_0005 - 9 * HOUR);
});

test("Education: finish when Education starts — each camp's own start", () => {
  const edu = Date.UTC(2026, 9, 9, 21, 30); // Sat 10:30 AM NZDT
  const p = backPlan(nz("2026-10-08T09:00"), edu, camps(CAP, CAP, 12 * HOUR));
  assert.equal(hhmmUTC(p.rows[0].start), "05:48"); // Thu 6:48 PM NZ
  assert.equal(p.rows[2].start, edu - 12 * HOUR); // Fri 10:30 PM NZ
  assert.ok(p.rows.every((r) => r.end === edu));
});

test("start together: one start; the longest ends at the target, others earlier", () => {
  const p = backPlan(nz("2026-10-08T09:00"), SAT_0005, camps(CAP, 9 * HOUR), { sync: "start" });
  assert.equal(p.rows[0].start, p.rows[1].start);
  assert.equal(p.rows[0].end, SAT_0005);
  assert.equal(p.rows[1].end, p.rows[1].start + 9 * HOUR);
});
