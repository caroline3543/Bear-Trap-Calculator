/* ============================================================
   TODAY screen logic: idle camps, Now split, week-strip dots,
   "still running after tonight". Pure functions, all tested.
   ============================================================ */
import { TRAINING_CAMPS, campMaxFor } from "./timers.js";
import { occurrencesBetween } from "./events.js";
import { localDayRange, MINUTE } from "./time.js";

export const IDLE_MIN_MS = 15 * MINUTE;

/**
 * Camps of one account with nothing training. Idle since = the end of that camp's most
 * recent timer (a ready timer still on the list, or `lastEnded` saved when it was dismissed).
 * Camps with no history are not reported (we can't know how long they've been idle).
 * → { camps: [{ camp, since, troop }], since (earliest), fullBatchMs (longest known) } | null
 */
export function idleCamps(data, now, minMs = IDLE_MIN_MS) {
  const out = [];
  for (const camp of TRAINING_CAMPS) {
    const mine = (data?.timers || []).filter((t) => t.kind === "training" && t.category === camp);
    if (mine.some((t) => t.endAt > now)) continue;
    const ends = [...mine.map((t) => t.endAt), data?.lastEnded?.[camp]].filter(Number.isFinite);
    if (!ends.length) continue;
    const since = Math.max(...ends);
    if (now - since < minMs) continue;
    const troop = mine.find((t) => t.endAt === since)?.troop === "helios" ? "helios" : "normal";
    out.push({ camp, since, troop });
  }
  if (!out.length) return null;
  const maxes = out.map((c) => campMaxFor(data, c.camp, c.troop)).filter((x) => x > 0);
  return { camps: out, since: Math.min(...out.map((c) => c.since)), fullBatchMs: maxes.length ? Math.max(...maxes) : null };
}

/** Record when a training timer went away (dismissed/cancelled after finishing). */
export function rememberEnd(data, timer, now) {
  if (timer.kind !== "training") return data;
  const end = Math.min(timer.endAt, now);
  return { ...data, lastEnded: { ...(data.lastEnded || {}), [timer.category]: Math.max(end, data.lastEnded?.[timer.category] || 0) } };
}

/** Split agenda items around now: finished ones fold away; the Now marker sits between. */
export function splitNow(items) {
  const past = items.filter((i) => i.status === "done");
  const rest = items.filter((i) => i.status !== "done");
  return { past, rest };
}

/** Timers (per account) that finish after the viewed day ends; camps finishing together → one row. */
export function stillRunning(state, accountIds, dayEnd) {
  const rows = [];
  for (const acc of accountIds) {
    for (const t of state.accountData[acc]?.timers || []) if (t.endAt >= dayEnd) rows.push({ t, acc });
  }
  rows.sort((a, b) => a.t.endAt - b.t.endAt || a.acc.localeCompare(b.acc));
  const out = [];
  for (const r of rows) {
    const prev = out[out.length - 1];
    if (prev && r.t.kind === "training" && prev.kind === "training" && prev.acc === r.acc && Math.floor(prev.endAt / MINUTE) === Math.floor(r.t.endAt / MINUTE)) {
      prev.camps.push(r.t.category);
    } else {
      out.push({ acc: r.acc, kind: r.t.kind, endAt: r.t.endAt, camps: [r.t.category], id: r.t.id, troop: r.t.troop });
    }
  }
  return out;
}

/** Colour group for the week strip. */
export function dotKind(ev) {
  if (ev.templateId?.startsWith("bear_trap")) return "bear";
  if (ev.templateId === "foundry" || ev.templateId === "canyon_clash") return "foundry";
  if (ev.templateId === "frostfire_mine") return "frostfire";
  return ev.combat ? "other" : null;
}

/** 7 local days from today: [{ start, end, dots: Set-like array of kinds }]. Daily reset is left out. */
export function weekStrip(state, accountIds, now, tz, days = 7) {
  const acc = new Set(accountIds);
  const out = [];
  for (let d = 0; d < days; d++) {
    const r = localDayRange(now, tz, d);
    const kinds = [];
    for (const ev of state.events) {
      if (ev.archived || (ev.accountId && !acc.has(ev.accountId))) continue;
      const k = dotKind(ev);
      if (!k || kinds.includes(k)) continue;
      if (occurrencesBetween(ev, r.start, r.end - 1).some((o) => o.start >= r.start && o.start < r.end)) kinds.push(k);
    }
    out.push({ offset: d, start: r.start, end: r.end, dots: kinds });
  }
  return out;
}
