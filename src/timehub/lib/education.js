/* ============================================================
   MINISTRY OF EDUCATION × TRAINING PLANNER
   Pure functions (tested). The Education appointment is a 30-minute booking on the SAME
   booking record the Bookings tab uses (position "minister_education"); nothing here stores
   its own copy of the time.

   Game rule modelled (kept configurable via the constants below): what matters is starting /
   restarting a training order WHILE the appointment is active ("+50% training speed,
   +200 training capacity"). The app has no speed/capacity formula, so it never derives a
   buffed duration from those numbers — it only uses figures the player entered
   (`campMaxEdu`, "full batch with Education"). Without that figure the plan still says WHEN to
   restart; it just can't say how much more gets trained.

   It never suggests cancelling a running training order.
   ============================================================ */
import { MINUTE, HOUR, DAY } from "./time.js";
import { BOOKING_MS, daySlots, bookingWindow, bookingEnd } from "./bookings.js";
import { nextLocalTime } from "./sleep.js";

export const EDU_POSITION = "minister_education";
export const EDU_BUFFER_MS = 5 * MINUTE; // aim to have camps restarted this long before the window closes
export const EDU_MIN_BRIDGE_MS = 15 * MINUTE; // a bridge cycle shorter than this isn't worth a visit
export const EDU_SKIP_BRIDGE_MS = 45 * MINUTE; // "fewest check-ins": waits shorter than this aren't bridged
export const EDU_TARGET_OFFSET_MS = 3 * MINUTE; // finish this long after the window opens (comfortably inside)

const floorMin = (ms) => Math.floor(ms / MINUTE) * MINUTE;

/** The next Education appointment on this account that hasn't expired. */
export function eduBooking(bookings, now) {
  return (bookings || [])
    .filter((b) => b.position === EDU_POSITION && bookingEnd(b) > now)
    .sort((a, b) => a.startAt - b.startAt || String(a.id).localeCompare(String(b.id)))[0] || null;
}

export function eduWindow(booking, bufferMs = EDU_BUFFER_MS) {
  return { start: booking.startAt, end: booking.startAt + BOOKING_MS, latest: booking.startAt + BOOKING_MS - bufferMs };
}

/** Where a moment `t` (the earliest a camp can be restarted) falls against the window. */
export function classifyAt(t, win) {
  if (t < win.start) return "before";
  if (t <= win.latest) return "inside";
  if (t < win.end) return "tight";
  return "after";
}

/**
 * One camp's plan.
 * c = { camp, troop, running, finishAt, normalMs, eduMs }   (finishAt only meaningful when running)
 * → { camp, troop, cls, readyAt, restartAt, steps:[{ at, durationMs }], idleMs, gapMs, restartMs, finalFinish, eduKnown }
 * cls: "over" | "now" | "inside" | "before" (bridge/wait) | "tight" | "after"
 */
export function planCamp(c, win, now, opts = {}) {
  const priority = opts.priority || "checkins";
  const ready = c.running && Number.isFinite(c.finishAt) ? c.finishAt : now;
  const t = Math.max(ready, now);
  const base = { camp: c.camp, troop: c.troop, readyAt: t, finishAt: c.running ? c.finishAt : null, steps: [], idleMs: 0, gapMs: 0, restartAt: null, restartMs: null, finalFinish: null, eduKnown: !!c.eduMs };
  if (win.end <= now) return { ...base, cls: "over" };

  const full = c.eduMs || c.normalMs || null; // what a restart inside the window can run for
  const finalize = (cls, restartAt) => {
    let restartMs = full;
    if (priority === "finish" && opts.desired) {
      const want = nextLocalTime(restartAt, opts.desired.hhmm, opts.desired.tz) - restartAt;
      restartMs = full ? Math.min(full, want) : want;
      if (restartMs < EDU_MIN_BRIDGE_MS) restartMs = full; // unreachable target → fall back to a full batch
    }
    return { ...base, cls, restartAt, restartMs, finalFinish: restartMs ? restartAt + restartMs : null };
  };

  const at = classifyAt(t, win);
  if (at === "inside") return finalize(t === now && ready <= now && now >= win.start ? "now" : "inside", t);
  if (at === "tight") return { ...base, cls: "tight" };
  if (at === "after") return { ...base, cls: "after" }; // a running order finishing after the window: Education can't help this cycle

  // before the window: bridge or wait
  const gap = win.start - t;
  const bridgeWorth = priority === "checkins" ? gap >= EDU_SKIP_BRIDGE_MS : gap >= EDU_MIN_BRIDGE_MS;
  const steps = [];
  let cursor = t;
  let idle = 0;
  if (bridgeWorth) {
    for (let i = 0; i < 6 && win.start - cursor > 0; i++) {
      const remaining = win.start - cursor;
      if (remaining < EDU_MIN_BRIDGE_MS) { idle = remaining; break; }
      const dur = c.normalMs && remaining > c.normalMs ? c.normalMs : floorMin(remaining);
      steps.push({ at: cursor, durationMs: dur });
      cursor += dur;
    }
  } else idle = gap;
  return { ...finalize("before", win.start), steps, idleMs: idle, gapMs: gap };
}

/**
 * The whole account's plan.
 * input: { now, camps:[c…], booking, priority, desired:{hhmm,tz}|null, bufferMs }
 * → { win, camps:[planCamp…], headline:{ key, vars }, timeline:[…], checkIns, latest, eduKnown }
 */
export function buildEducationPlan({ now, camps, booking, priority = "checkins", desired = null, bufferMs = EDU_BUFFER_MS }) {
  const win = eduWindow(booking, bufferMs);
  const plans = camps.map((c) => planCamp(c, win, now, { priority, desired }));

  // ---- headline: one concise instruction
  const usable = plans.filter((p) => ["now", "inside", "before"].includes(p.cls));
  const lead = usable.sort((a, b) => a.readyAt - b.readyAt)[0];
  const kinds = new Set(plans.map((p) => p.cls));
  let headline;
  if (plans.every((p) => p.cls === "over")) headline = { key: "over", vars: {} };
  else if (!usable.length) headline = { key: kinds.has("tight") ? "tight" : "after", vars: { end: win.end, latest: win.latest } };
  else if (usable.length < plans.length) headline = { key: "mixed", vars: { fit: usable.length, total: plans.length, start: win.start, latest: win.latest } };
  else if (lead.cls === "now") headline = { key: "now", vars: { latest: win.latest } };
  else if (lead.cls === "inside") headline = { key: "inside", vars: { latest: win.latest, finish: lead.readyAt } };
  else if (lead.steps.length) headline = { key: "bridge", vars: { finish: lead.readyAt, dur: lead.steps[0].durationMs, start: win.start } };
  else headline = { key: "wait", vars: { finish: lead.readyAt, start: win.start } };

  // ---- timeline
  const evs = [];
  const add = (at, type, p, extra = {}) => evs.push({ at, type, camps: [p.camp], ...extra });
  for (const p of plans) {
    if (p.cls === "over") continue;
    if (p.finishAt != null && p.finishAt > now) add(p.finishAt, "finish", p);
    for (const s of p.steps) add(s.at, "bridge", p, { durationMs: s.durationMs });
    if (p.restartAt != null) add(p.restartAt, "restart", p, { durationMs: p.restartMs });
    if (p.finalFinish != null) add(p.finalFinish, "final", p);
  }
  evs.push({ at: win.start, type: "edu_start", camps: [] }, { at: win.end, type: "edu_end", camps: [] });
  const merged = [];
  for (const e of evs) {
    const m = merged.find((x) => x.type === e.type && x.at === e.at && (x.durationMs || 0) === (e.durationMs || 0));
    if (m) m.camps.push(...e.camps); else merged.push({ ...e, camps: [...e.camps] });
  }
  const order = { finish: 0, bridge: 1, edu_start: 2, restart: 3, edu_end: 4, final: 5 };
  const timeline = merged.filter((e) => e.at >= now - MINUTE || (e.type === "edu_start" && win.end > now) || e.type === "edu_end").sort((a, b) => a.at - b.at || order[a.type] - order[b.type]);
  const checkIns = new Set(merged.filter((e) => e.type === "bridge" || e.type === "restart").map((e) => Math.floor(e.at / MINUTE))).size;

  return { win, camps: plans, headline, timeline, checkIns, latest: win.latest, eduKnown: camps.some((c) => c.eduMs) };
}

/**
 * Best real, bookable 30-minute slots for this account's camps (nothing hypothetical: only slots
 * from the existing booking window that haven't started and aren't already an Education booking here).
 * → [{ start, end, inside, before, total, firstReady }] best first (at most `limit`)
 */
export function findEducationSlots({ now, camps, bookings, bufferMs = EDU_BUFFER_MS, limit = 2 }) {
  const { from, to } = bookingWindow(now);
  const taken = new Set((bookings || []).filter((b) => b.position === EDU_POSITION).map((b) => b.startAt));
  const ready = camps.map((c) => Math.max(c.running && Number.isFinite(c.finishAt) ? c.finishAt : now, now));
  const out = [];
  for (let day = from; day < to; day += DAY) {
    for (const s of daySlots(day, now)) {
      if (!s.open || taken.has(s.start)) continue;
      const win = { start: s.start, end: s.end, latest: s.end - bufferMs };
      let inside = 0, before = 0;
      camps.forEach((c, i) => {
        const cls = classifyAt(ready[i], win);
        if (cls === "inside") inside++;
        else if (cls === "before" && win.start - ready[i] <= (c.normalMs || 12 * HOUR)) before++;
      });
      if (inside + before === 0) continue;
      out.push({ start: s.start, end: s.end, inside, before, total: camps.length, firstReady: Math.min(...ready) });
    }
  }
  out.sort((a, b) => b.inside - a.inside || b.before - a.before || a.start - b.start);
  return out.slice(0, limit);
}

/** A finish time inside the window for a cycle that's about to start (used to fix a Finish-At that would miss it). */
export function insideFinishTarget(win) {
  return Math.min(win.start + EDU_TARGET_OFFSET_MS, win.latest);
}

/** Does a typed finish time (for a cycle started now) land after the window closes? */
export function finishMissesWindow(finishAt, win, now) {
  return win.end > now && finishAt > win.latest;
}
