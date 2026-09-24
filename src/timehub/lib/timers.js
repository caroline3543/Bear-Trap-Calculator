/* ============================================================
   TIMERS — training camps and research (one reusable engine).
   Timer: { id, kind: "training"|"research", category, label?, notes,
            startedAt, endAt (UTC), durationMs, createdAt }
   Training: one active timer per camp per account. Research: several allowed.
   ============================================================ */
import { MINUTE } from "./time.js";

export const TRAINING_CAMPS = ["infantry_camp", "lancer_camp", "marksman_camp"];
/** Helios troops train in the same camps but take a different time than normal troops. */
export const TROOP_TYPES = ["normal", "helios"];

/** Full-batch time for a camp and troop type (null if the user hasn't said). */
export function campMaxFor(data, camp, troop = "normal") {
  if (troop === "helios") return data?.helios?.classes?.includes(camp) ? data.helios.max?.[camp] ?? null : null;
  return data?.campMax?.[camp] ?? null;
}

export function hasHelios(data, camp) {
  return !!data?.helios?.classes?.includes(camp);
}

export const RESEARCH_LOCATIONS = ["war_academy", "research_center", "dawn_academy"];

export function createTimerTimes({ mode = "duration", durationMs, endAt }, now) {
  if (mode === "duration") {
    if (!(durationMs > 0)) return null;
    return { startedAt: now, endAt: now + durationMs, durationMs };
  }
  if (!Number.isFinite(endAt) || endAt <= now) return null;
  return { startedAt: now, endAt, durationMs: endAt - now };
}

export function timerStatus(t, now) {
  return now >= t.endAt ? "ready" : "running";
}

export function timerRemaining(t, now) {
  return Math.max(0, t.endAt - now);
}

export function timerProgress(t, now) {
  const span = t.endAt - t.startedAt;
  if (!(span > 0)) return now >= t.endAt ? 1 : 0;
  return Math.min(1, Math.max(0, (now - t.startedAt) / span));
}

export function restartTimer(t, now) {
  const len = t.durationMs > 0 ? t.durationMs : Math.max(0, t.endAt - t.startedAt);
  return { ...t, startedAt: now, endAt: now + len, durationMs: len };
}

export function sortTimers(timers, now) {
  return [...timers].sort((a, b) => {
    const ra = timerStatus(a, now) === "ready" ? 0 : 1;
    const rb = timerStatus(b, now) === "ready" ? 0 : 1;
    return ra - rb || a.endAt - b.endAt || (a.createdAt || 0) - (b.createdAt || 0) || String(a.id).localeCompare(String(b.id));
  });
}

/**
 * Save training for several camps at once (same or individual durations).
 * entries: [{ camp, durationMs }]. Replaces any existing timer for those camps.
 * Returns the new timers array for the account.
 */
export function applyTraining(timers, entries, now, newId) {
  const camps = new Set(entries.map((e) => e.camp));
  const kept = timers.filter((t) => !(t.kind === "training" && camps.has(t.category)));
  const added = entries.map((e) => ({
    id: newId(), kind: "training", category: e.camp, label: "", notes: "", ...(e.troop === "helios" ? { troop: "helios" } : {}),
    startedAt: now, endAt: now + e.durationMs, durationMs: e.durationMs, createdAt: now,
  }));
  return [...kept, ...added];
}

/** Camps that already have a running timer (for the replace confirmation). */
export function busyCamps(timers, camps, now) {
  return camps.filter((c) => timers.some((t) => t.kind === "training" && t.category === c && timerStatus(t, now) === "running"));
}

/**
 * "Finish at" planner. target = desired finish instant, maxMs = the camp's longest batch (or null).
 * → { ok, trainFor, startAt, fitsMax, error }
 *   fitsMax: start now and train for `trainFor` (= target − now)
 *   !fitsMax: a full batch is shorter than needed → start at target − maxMs
 */
export function planFinish(target, now, maxMs) {
  if (!Number.isFinite(target) || target - now < MINUTE) return { ok: false, error: "errPlanPast" };
  const need = Math.floor((target - now) / MINUTE) * MINUTE;
  if (maxMs > 0 && need > maxMs) return { ok: true, fitsMax: false, trainFor: maxMs, startAt: target - maxMs };
  return { ok: true, fitsMax: true, trainFor: need, startAt: now };
}

/** Groups of ≥2 timers finishing in the same minute: [{ endAt, timers }]. */
export function finishTogether(timers) {
  const map = new Map();
  for (const t of timers) {
    const k = Math.floor(t.endAt / MINUTE);
    map.set(k, [...(map.get(k) || []), t]);
  }
  return [...map.values()].filter((g) => g.length > 1).map((g) => ({ endAt: g[0].endAt, timers: g }));
}
