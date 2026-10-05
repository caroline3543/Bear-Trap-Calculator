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

/** Optional: this camp's full-batch time WHILE Education is active, as the player measured it.
 *  The app never derives it from "+50% speed / +200 capacity" — it has no speed/capacity formula. */
export function campMaxEduFor(data, camp) {
  const v = data?.campMaxEdu?.[camp];
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function hasHelios(data, camp) {
  return !!data?.helios?.classes?.includes(camp);
}

export const RESEARCH_LOCATIONS = ["research_center", "dawn_academy", "war_academy"];

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

/** Research always lists in the configured type order (Research Center → Dawn Academy → War
 *  Academy), never by which finishes first. Missing buildings are simply omitted. */
export function sortResearch(timers) {
  return [...timers].sort((a, b) => RESEARCH_LOCATIONS.indexOf(a.category) - RESEARCH_LOCATIONS.indexOf(b.category));
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
    ...(e.mode ? { mode: e.mode } : {}),
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

/* ---------- troops ⇄ time (optional) ----------
   In the game, training time grows in step with the number of troops. If the player tells us a
   camp's full batch size (troops) and how long that full batch takes, one converts to the other. */

/** Full batch size for a camp (troops), or null if not set. Helios uses the same batch size. */
export function campTroopsFor(data, camp) {
  const n = data?.campTroops?.[camp];
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** How many troops fit in `durationMs` (rounded down, never above the full batch). */
export function troopsForDuration(durationMs, fullMs, fullTroops) {
  if (!(fullMs > 0) || !(fullTroops > 0) || !(durationMs > 0)) return 0;
  return Math.min(fullTroops, Math.floor((fullTroops * durationMs) / fullMs));
}

/** How long `troops` take (to the second), capped at the full batch time. */
export function durationForTroops(troops, fullMs, fullTroops) {
  if (!(fullMs > 0) || !(fullTroops > 0) || !(troops > 0)) return 0;
  return Math.min(fullMs, Math.round(((troops / fullTroops) * fullMs) / 1000) * 1000);
}

/* ---------- learning the player's real maximum ----------
   The stored maximum is only the app's last-known value; the game may allow longer (research,
   buffs, upgrades). A longer duration the player actually entered is treated as new information,
   not an error. Only a dramatic jump asks first, so a typo can't silently corrupt the planner. */

/** A jump counts as "dramatic" (ask first) above both limits: +25% and +30 minutes. */
export const LEARN_CONFIRM_RATIO = 1.25;
export const LEARN_CONFIRM_MIN_MS = 30 * MINUTE;

/**
 * What a typed duration means for the stored maximum.
 * → "none"    — nothing to learn (no stored max, or not longer than it)
 *   "update"  — a modest increase: adopt it silently
 *   "confirm" — a big jump: ask "Use 18h as new maximum?" first
 */
export function learnMax(storedMs, enteredMs) {
  if (!(storedMs > 0) || !(enteredMs > storedMs)) return "none";
  return enteredMs > storedMs * LEARN_CONFIRM_RATIO && enteredMs - storedMs >= LEARN_CONFIRM_MIN_MS ? "confirm" : "update";
}

/** Entries whose duration is longer than their camp's stored maximum for that troop type.
 *  → [{ camp, troop, prevMs, ms, kind: "update"|"confirm" }] */
export function maxIncreases(data, entries) {
  return entries.map((e) => {
    const troop = e.troop === "helios" ? "helios" : "normal";
    const prevMs = campMaxFor(data, e.camp, troop);
    return { camp: e.camp, troop, prevMs, ms: e.durationMs, kind: learnMax(prevMs, e.durationMs) };
  }).filter((x) => x.kind !== "none");
}

export const learnedKey = (camp, troop) => `${camp}:${troop === "helios" ? "helios" : "normal"}`;

/** Store new maximums (per camp and troop type), remembering the ORIGINAL value so Settings can
 *  undo a learned maximum. Keeps "same for all camps" honest: it turns off if the camps now differ. */
export function applyLearnedMax(data, increases, now) {
  if (!increases.length) return data;
  const campMax = { ...(data.campMax || {}) };
  const heliosMax = { ...(data.helios?.max || {}) };
  const maxLearned = { ...(data.maxLearned || {}) };
  for (const x of increases) {
    const k = learnedKey(x.camp, x.troop);
    maxLearned[k] = { prev: maxLearned[k]?.prev ?? x.prevMs, at: now };
    if (x.troop === "helios") heliosMax[x.camp] = x.ms;
    else campMax[x.camp] = x.ms;
  }
  const same = new Set(TRAINING_CAMPS.map((c) => campMax[c] || 0)).size === 1;
  return {
    ...data, campMax, maxLearned,
    helios: { classes: data.helios?.classes || [], max: heliosMax },
    campSame: data.campSame === true && !same ? false : data.campSame,
  };
}

/** Put one learned maximum back to what it was before the app learned it. */
export function resetLearnedMax(data, key) {
  const rec = data.maxLearned?.[key];
  if (!rec) return data;
  const [camp, troop] = key.split(":");
  const { [key]: _drop, ...rest } = data.maxLearned;
  if (troop === "helios") return { ...data, maxLearned: rest, helios: { ...data.helios, max: { ...data.helios.max, [camp]: rec.prev ?? null } } };
  return { ...data, maxLearned: rest, campMax: { ...data.campMax, [camp]: rec.prev ?? null } };
}

/** The troop type a camp's form should start on: the player's last choice for that camp,
 *  never Helios unless that camp has Helios set up. */
export function defaultTroop(data, camp) {
  if (!hasHelios(data, camp)) return "normal";
  if (data?.campTroop?.[camp]) return data.campTroop[camp] === "helios" ? "helios" : "normal";
  const last = (data?.timers || []).filter((t) => t.kind === "training" && t.category === camp).sort((a, b) => b.endAt - a.endAt)[0];
  return last?.troop === "helios" ? "helios" : "normal";
}

/** Remember each camp's troop choice from a restart. */
export function rememberTroops(data, entries) {
  const campTroop = { ...(data.campTroop || {}) };
  for (const e of entries) campTroop[e.camp] = e.troop === "helios" ? "helios" : "normal";
  return { ...data, campTroop };
}

/**
 * The compact "before you restart" summary. Camps only "finish together" when every one lands in
 * the same minute — it never implies a shared finish that isn't real.
 * → { rows: [{ camp, troop, durationMs, finishAt }], together: boolean, finishAt|null }
 */
export function restartSummary(entries, now) {
  const rows = entries.map((e) => ({ camp: e.camp, troop: e.troop === "helios" ? "helios" : "normal", durationMs: e.durationMs, finishAt: now + e.durationMs }))
    .sort((a, b) => TRAINING_CAMPS.indexOf(a.camp) - TRAINING_CAMPS.indexOf(b.camp));
  const minutes = new Set(rows.map((r) => Math.floor(r.finishAt / MINUTE)));
  const together = rows.length > 0 && minutes.size === 1;
  return { rows, together, finishAt: together ? rows[0].finishAt : null };
}
