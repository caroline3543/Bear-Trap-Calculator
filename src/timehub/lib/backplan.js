/* ============================================================
   WORK-BACKWARDS PLANNER — "I want this finished then. When do I press Train?"

   For each selected camp: start = target − that camp's batch duration (its own maximum — normal,
   Helios or Training Capacity — or a custom duration). The answer is a START TIME:
     future — start later (offer a reminder; never encourage starting now: it would finish early)
     now    — the start falls within a few minutes of now: start now
     passed — a full batch no longer fits: the most that fits is (target − now), started now
   Camps can FINISH TOGETHER (each its own start — the default; right for SvS, reset, Education) or
   START TOGETHER (one start; the longest batch ends at the target, the others earlier).
   ============================================================ */
import { MINUTE } from "./time.js";

/** Opening the planner this long after the calculated start still counts as "start now" (the batch
 *  is trimmed by those minutes so it still finishes ON the target). A start that is still ahead
 *  — even by two minutes — stays "start later": starting early would finish before the target,
 *  which matters when the target is "just after reset". */
export const START_GRACE_MS = 5 * MINUTE;
const floorMin = (ms) => Math.floor(ms / MINUTE) * MINUTE;

/**
 * camps: [{ camp, troop, durMs }]  (durMs > 0)
 * → { ok, rows: [{ camp, troop, fullMs, durMs, ideal, start, end, state, fits }],
 *     groups: [{ start, end, state, durMs, fullMs, ideal, camps }],
 *     state: "future" | "now" | "mixed" | "passed", firstStart, windowMs, longest }
 *   ideal = when this batch needed to start; fits = false when the full batch no longer fits
 *   (then durMs is the most that fits, started now). Nothing here ever ends after the target.
 */
export function backPlan(now, target, camps, { sync = "finish", graceMs = START_GRACE_MS } = {}) {
  const list = camps.filter((c) => c.durMs > 0);
  if (!Number.isFinite(target) || target - now < MINUTE || !list.length) return { ok: false };
  const windowMs = floorMin(target - now);
  const longest = Math.max(...list.map((c) => c.durMs));
  const rows = list.map((c) => {
    const ideal = sync === "start" ? target - longest : target - c.durMs;
    let start = ideal;
    let durMs = c.durMs;
    let fits = true;
    if (ideal - now < MINUTE) {
      // the start is now, or has gone by: start now and train what still fits before the target
      start = now;
      durMs = Math.min(c.durMs, windowMs);
      fits = durMs === c.durMs || ideal >= now - graceMs;
    }
    const state = start === now ? (fits ? "now" : "passed") : "future";
    return { camp: c.camp, troop: c.troop, fullMs: c.durMs, durMs, ideal, start, end: start + durMs, state, fits };
  });
  const groups = [];
  for (const r of [...rows].sort((a, b) => a.start - b.start || b.durMs - a.durMs)) {
    const g = groups.find((x) => x.start === r.start && x.durMs === r.durMs && x.state === r.state);
    if (g) g.camps.push(r.camp);
    else groups.push({ start: r.start, end: r.end, state: r.state, durMs: r.durMs, fullMs: r.fullMs, ideal: r.ideal, camps: [r.camp] });
  }
  const later = rows.filter((r) => r.state === "future").length;
  const state = later === rows.length ? "future" : later > 0 ? "mixed" : rows.some((r) => !r.fits) ? "passed" : "now";
  return { ok: true, rows, groups, state, firstStart: Math.min(...rows.map((r) => r.start)), windowMs, longest };
}

/** The reset target: the next 00:00 UTC + offset (5, 10 or 30 minutes — the player's choice). */
export function resetTarget(now, offsetMin) {
  const d = new Date(now);
  const r = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + offsetMin * MINUTE;
  return r > now ? r : r + 24 * 60 * MINUTE;
}

/** Start-reminders for camps that start later (the existing planned-restart records). */
export function startReminders(plan, target, newId) {
  return plan.groups.filter((g) => g.state === "future").map((g) => ({ id: newId(), camps: g.camps, startAt: g.start, target }));
}
