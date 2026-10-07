/* ============================================================
   MULTI-BATCH TRAINING PLANS — "keep these camps training and finish at my chosen time".

   A finish time further away than one maximum batch is valid: it just needs restarts. The game
   can't queue batches, so every restart is a CHECK-IN the player has to do.

   Two facts shape the planner:
   1. Troop output depends only on time spent training. Any plan with no idle gap trains for the
      whole window, so "maximum troops" = continuous training, and the only thing left to choose is
      how many times the player has to log in.
   2. Camps restart together. The camp with the SHORTEST maximum dictates the fewest check-ins any
      continuous plan can have (ceil(window / shortestMax) − 1). Its restart times are shared;
      a camp with a longer maximum simply skips a check-in when its batch can run past it. So every
      camp trains continuously, every batch respects that camp's own maximum, and the player logs in
      as few times as possible. Batch lengths can still differ per camp.

   Modes:
     "max"    — maximum troops: continuous, maximum-length batches first, shorter final batch.
     "fewest" — one check-in only: a maximum batch now, then a final batch timed to end at the
                target. Leaves a gap when the window is longer than two batches (reported, never hidden).
   ============================================================ */
import { MINUTE } from "./time.js";

const floorMin = (ms) => Math.floor(ms / MINUTE) * MINUTE;

/** camps: [{ camp, troop, maxMs }] (every maxMs > 0)
 *  → { ok, error?, windowMs, multi, checkIns: [{ at, camps: [camp] }],
 *      camps: [{ camp, troop, maxMs, batches: [{ start, end, ms, isMax }], trainedMs, idleMs }],
 *      trainedMs (per camp, the minimum), idleMs (largest gap), mode } */
export function planBatches(now, target, camps, mode = "max") {
  if (!Number.isFinite(target) || target - now < MINUTE) return { ok: false, error: "errPlanPast" };
  const list = camps.filter((c) => c.maxMs > 0);
  if (!list.length) return { ok: false, error: "noMax" };
  const start = now; // batch 1 starts now
  const windowMs = floorMin(target - start);
  const end = start + windowMs;
  const minMax = Math.min(...list.map((c) => c.maxMs));
  const multi = list.some((c) => windowMs > c.maxMs);

  // Shared restart times
  let restarts;
  if (mode === "fewest" && windowMs > 2 * minMax) {
    restarts = [end - minMax]; // one check-in: the final batch, timed to end at the target
  } else {
    const n = Math.ceil(windowMs / minMax);
    restarts = Array.from({ length: n - 1 }, (_, i) => start + (i + 1) * minMax);
  }

  const out = list.map((c) => {
    const batches = [];
    let pos = start;
    let idle = 0;
    // greedy over the shared restart times: at each point continue as long as this camp's max allows
    const pts = restarts.filter((r) => r > start && r < end);
    while (end - pos > c.maxMs) {
      const reach = pts.filter((r) => r > pos && r - pos <= c.maxMs);
      if (reach.length) {
        const next = reach[reach.length - 1];
        batches.push({ start: pos, end: next, ms: next - pos });
        pos = next;
      } else {
        // no restart within reach ("fewest" mode): one maximum batch, then wait for the next check-in
        const next = pts.find((r) => r > pos);
        batches.push({ start: pos, end: pos + c.maxMs, ms: c.maxMs });
        idle += next - (pos + c.maxMs);
        pos = next;
      }
    }
    batches.push({ start: pos, end, ms: end - pos });
    for (const b of batches) b.isMax = b.ms === c.maxMs;
    return { ...c, batches, trainedMs: windowMs - idle, idleMs: idle };
  });

  // check-ins: the restart times some camp actually uses, with which camps restart then
  const byTime = new Map();
  for (const c of out) for (const b of c.batches.slice(1)) byTime.set(b.start, [...(byTime.get(b.start) || []), c.camp]);
  const checkIns = [...byTime.entries()].sort((a, b) => a[0] - b[0]).map(([at, cs]) => ({ at, camps: cs }));
  return {
    ok: true, mode, windowMs, multi, start, end, checkIns, camps: out,
    trainedMs: Math.min(...out.map((c) => c.trainedMs)), idleMs: Math.max(...out.map((c) => c.idleMs)),
    // the per-camp breakdown is only worth showing when camps' batches differ
    sameBatches: out.every((c) => c.batches.length === out[0].batches.length && c.batches.every((b, i) => b.ms === out[0].batches[i].ms)),
  };
}

/** Is "fewest check-ins" a different plan at all? Only when the window is longer than two batches
 *  of the shortest-max camp; otherwise both modes need the same single check-in. */
export function fewestDiffers(windowMs, camps) {
  const list = camps.filter((c) => c.maxMs > 0);
  return list.length > 0 && windowMs > 2 * Math.min(...list.map((c) => c.maxMs));
}

/** The next daily reset (00:00 UTC) after `now`, and whether `target` is past it. */
export function nextReset(now) {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}
export const crossesReset = (now, target) => Number.isFinite(target) && target >= nextReset(now);

/** Planned-restart reminders for the check-ins (the existing `plans` records, so the Timeline and
 *  the Training card show them with no changes). Each one's target is the end of the batch it starts. */
export function checkInPlans(plan, newId) {
  return plan.checkIns.map((ci) => ({
    id: newId(), camps: ci.camps, startAt: ci.at,
    target: Math.max(...plan.camps.filter((c) => ci.camps.includes(c.camp)).map((c) => c.batches.find((b) => b.start === ci.at).end)),
  }));
}
