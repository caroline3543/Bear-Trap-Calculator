/* Round 28: Finish-at beyond one batch (multi-batch plans) + Training Capacity. Tests A–I follow
   the acceptance list in the brief. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MINUTE, HOUR } from "../lib/time.js";
import { planBatches, fewestDiffers, crossesReset, nextReset, checkInPlans } from "../lib/batches.js";
import { effectiveMax, capEstimate, capMaxFor, setCapMax, setCapOn, campMaxFor } from "../lib/timers.js";
import { emptyAccountData } from "../lib/accounts.js";
import { sanitizeState, emptyState } from "../lib/storage.js";

const NOW = Date.UTC(2026, 9, 7, 19, 0); // Thu 8 Oct 08:00 NZDT
const ms = (p) => p.batches.map((b) => b.ms / HOUR);
const one = (max, target) => planBatches(NOW, NOW + target, [{ camp: "infantry_camp", troop: "normal", maxMs: max }]);

test("A: max 12h, target 8h away → one 8h batch, no check-ins", () => {
  const p = one(12 * HOUR, 8 * HOUR);
  assert.equal(p.multi, false);
  assert.deepEqual(ms(p.camps[0]), [8]);
  assert.equal(p.checkIns.length, 0);
});

test("B: max 12h, target 29h away → 12h + 12h + 5h, two check-ins, no idle", () => {
  const p = one(12 * HOUR, 29 * HOUR);
  assert.equal(p.multi, true);
  assert.deepEqual(ms(p.camps[0]), [12, 12, 5]);
  assert.deepEqual(p.checkIns.map((c) => (c.at - NOW) / HOUR), [12, 24]);
  assert.equal(p.trainedMs, 29 * HOUR);
  assert.equal(p.idleMs, 0);
  assert.equal(p.camps[0].batches.at(-1).end, NOW + 29 * HOUR); // final batch lands on the target
});

test("C: Training Capacity on, confirmed 36h, target 29h → one 29h batch", () => {
  let d = setCapMax({ ...emptyAccountData(), campMax: { infantry_camp: 12 * HOUR } }, { "infantry_camp:normal": 36 * HOUR });
  d = setCapOn(d, true);
  const p = one(effectiveMax(d, "infantry_camp", "normal", d.trainCap.on), 29 * HOUR);
  assert.deepEqual(ms(p.camps[0]), [29]);
  assert.equal(p.checkIns.length, 0);
});

test("D: Training Capacity max 36h, target 48h → 36h + 12h", () => {
  assert.deepEqual(ms(one(36 * HOUR, 48 * HOUR).camps[0]), [36, 12]);
});

test("E: target past 00:00 UTC is flagged 'after reset'", () => {
  assert.equal(nextReset(NOW), Date.UTC(2026, 9, 8));
  assert.equal(crossesReset(NOW, NOW + 4 * HOUR), false); // 23:00 UTC same day
  assert.equal(crossesReset(NOW, NOW + 6 * HOUR), true); // 01:00 UTC next day
});

test("F: different maximums → every camp ends at the target, shared check-ins, each batch ≤ its own max", () => {
  const camps = [
    { camp: "infantry_camp", troop: "normal", maxMs: 12 * HOUR },
    { camp: "lancer_camp", troop: "normal", maxMs: 11 * HOUR + 40 * MINUTE },
    { camp: "marksman_camp", troop: "normal", maxMs: 12 * HOUR + 15 * MINUTE },
  ];
  const p = planBatches(NOW, NOW + 29 * HOUR, camps);
  for (const c of p.camps) {
    assert.equal(c.batches.at(-1).end, NOW + 29 * HOUR);
    assert.ok(c.batches.every((b) => b.ms <= c.maxMs && b.ms > 0));
    assert.equal(c.trainedMs, 29 * HOUR); // continuous: no troops lost
  }
  // the 11h40 camp needs 2 restarts; nobody needs more, and they share the same 2 times
  assert.equal(p.checkIns.length, 2);
  assert.ok(p.checkIns.every((ci) => ci.camps.length === 3));
});

test("F2: a camp with a much longer maximum skips check-ins it doesn't need", () => {
  const p = planBatches(NOW, NOW + 12 * HOUR, [
    { camp: "infantry_camp", troop: "normal", maxMs: 6 * HOUR },
    { camp: "lancer_camp", troop: "normal", maxMs: 12 * HOUR },
  ]);
  assert.deepEqual(ms(p.camps[0]), [6, 6]);
  assert.deepEqual(ms(p.camps[1]), [12]);
  assert.deepEqual(p.checkIns.map((c) => c.camps), [["infantry_camp"]]);
  assert.equal(p.sameBatches, false);
});

test("G: Helios uses the Helios maximum (and its own capacity calibration)", () => {
  let d = { ...emptyAccountData(), campMax: { infantry_camp: 8 * HOUR }, helios: { classes: ["infantry_camp"], max: { infantry_camp: 9 * HOUR + 30 * MINUTE } } };
  assert.equal(effectiveMax(d, "infantry_camp", "helios", false), 9 * HOUR + 30 * MINUTE);
  assert.equal(capEstimate(d, "infantry_camp", "helios"), 28 * HOUR + 30 * MINUTE);
  d = setCapMax(d, { "infantry_camp:helios": 28 * HOUR });
  assert.equal(effectiveMax(d, "infantry_camp", "helios", true), 28 * HOUR);
  assert.equal(effectiveMax(d, "infantry_camp", "normal", true), null); // normal troops not calibrated yet
});

test("H: an edited capacity maximum is kept (not overwritten by the ×3 estimate)", () => {
  let d = setCapMax({ ...emptyAccountData(), campMax: { infantry_camp: 12 * HOUR } }, { "infantry_camp:normal": 35 * HOUR + 42 * MINUTE });
  d = setCapOn(setCapOn(d, false), true);
  assert.equal(capMaxFor(d, "infantry_camp", "normal"), 35 * HOUR + 42 * MINUTE);
  const back = sanitizeState(JSON.parse(JSON.stringify({ ...emptyState(NOW), accountData: { A: d } })), NOW).accountData.A;
  assert.equal(back.trainCap.max["infantry_camp:normal"], 35 * HOUR + 42 * MINUTE);
});

test("I: turning Training Capacity off returns the normal maximum and keeps the calibration", () => {
  let d = setCapOn(setCapMax({ ...emptyAccountData(), campMax: { infantry_camp: 12 * HOUR } }, { "infantry_camp:normal": 36 * HOUR }), true);
  d = setCapOn(d, false);
  assert.equal(effectiveMax(d, "infantry_camp", "normal", d.trainCap.on), 12 * HOUR);
  assert.equal(campMaxFor(d, "infantry_camp"), 12 * HOUR); // normal max never touched
  assert.equal(capMaxFor(d, "infantry_camp", "normal"), 36 * HOUR);
});

test("fewest check-ins: one restart, idle reported, only offered when it actually differs", () => {
  const camps = [{ camp: "infantry_camp", troop: "normal", maxMs: 12 * HOUR }];
  assert.equal(fewestDiffers(20 * HOUR, camps), false); // max mode already needs just 1 check-in
  assert.equal(fewestDiffers(29 * HOUR, camps), true);
  const p = planBatches(NOW, NOW + 29 * HOUR, camps, "fewest");
  assert.deepEqual(ms(p.camps[0]), [12, 12]);
  assert.deepEqual(p.checkIns.map((c) => (c.at - NOW) / HOUR), [17]);
  assert.equal(p.idleMs, 5 * HOUR);
  assert.equal(p.trainedMs, 24 * HOUR);
});

test("check-ins become planned-restart reminders (shown on the Timeline as before)", () => {
  let n = 0;
  const p = one(12 * HOUR, 29 * HOUR);
  const plans = checkInPlans(p, () => `p${++n}`);
  assert.deepEqual(plans.map((x) => [(x.startAt - NOW) / HOUR, (x.target - NOW) / HOUR, x.camps]), [[12, 24, ["infantry_camp"]], [24, 29, ["infantry_camp"]]]);
  const st = sanitizeState(JSON.parse(JSON.stringify({ ...emptyState(NOW), accountData: { A: { ...emptyAccountData(), plans } } })), NOW);
  assert.equal(st.accountData.A.plans.length, 2);
});

test("a target in the past or under a minute is rejected", () => {
  assert.equal(one(12 * HOUR, 30 * 1000).ok, false);
  assert.equal(planBatches(NOW, NOW + HOUR, [{ camp: "infantry_camp", maxMs: null }]).error, "noMax");
});
