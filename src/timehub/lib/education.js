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
   restart, but never claims an exact finish time.

   Two kinds of entries, kept apart on purpose:
     ACTION    — the player must open the game and do something (restart camps). Only these
                 count as check-ins.
     MILESTONE — happens by itself (camps finish, Education starts/ends, final finish).

   It never suggests cancelling a running training order.
   ============================================================ */
import { MINUTE, HOUR, DAY } from "./time.js";
import { BOOKING_MS, daySlots, bookingWindow, bookingEnd } from "./bookings.js";
import { nextLocalTime, inSleepWindow } from "./sleep.js";

export const EDU_POSITION = "minister_education";
export const EDU_BUFFER_MS = 5 * MINUTE; // aim to be restarted this long before the window closes
export const EDU_MIN_BRIDGE_MS = 15 * MINUTE; // a short training shorter than this isn't worth a visit
export const EDU_SKIP_BRIDGE_MS = 45 * MINUTE; // "fewest check-ins": waits shorter than this aren't bridged
export const EDU_TARGET_OFFSET_MS = 3 * MINUTE; // finish this long after the window opens (comfortably inside)

const floorMin = (ms) => Math.floor(ms / MINUTE) * MINUTE;
/** Camps should be ready a little BEFORE the window opens, so there's time to open the game,
 *  collect, take the minister position and restart: half the safety buffer, at least 1 minute (0 if buffer is 0). */
export const prepMs = (bufferMs) => (bufferMs > 0 ? Math.max(MINUTE, Math.ceil(bufferMs / 2 / MINUTE) * MINUTE) : 0);

/** The next Education appointment on this account that hasn't expired. */
export function eduBooking(bookings, now) {
  return (bookings || [])
    .filter((b) => b.position === EDU_POSITION && bookingEnd(b) > now)
    .sort((a, b) => a.startAt - b.startAt || String(a.id).localeCompare(String(b.id)))[0] || null;
}

export function eduWindow(booking, bufferMs = EDU_BUFFER_MS) {
  const start = booking.startAt;
  return { start, end: start + BOOKING_MS, latest: start + BOOKING_MS - bufferMs, ready: start - prepMs(bufferMs) };
}

/** Key for recording that the player did an action for THIS appointment (a moved booking starts fresh). */
export const eduDoneKey = (booking) => `${booking.id}:${booking.startAt}`;

/** Where a moment `t` (the earliest a camp can be restarted) falls against the window. */
export function classifyAt(t, win) {
  if (t < win.start) return "before";
  if (t <= win.latest) return "inside";
  if (t < win.end) return "tight";
  return "after";
}

/** Height (px) for a wait between two plan entries: constrained, so 7 hours feels longer than 30 minutes
 *  without becoming enormous. */
export function eduGapHeight(ms) {
  const m = Math.min(Math.max(ms, 0) / MINUTE, 480);
  return Math.round(24 + 72 * Math.sqrt(m / 480));
}

/**
 * One camp's plan.
 * c = { camp, troop, running, finishAt, normalMs, eduMs, lastEnd }
 * opts = { priority, desired:{hhmm,tz}, sleep, tz, bridgeDone }
 * → { camp, troop, cls, readyAt, restartAt, steps:[{ at, durationMs }], idleMs, gapMs, restartMs,
 *     finalFinish, eduKnown, sleepShift, readySince }
 * cls: "over" | "now" | "inside" | "before" (short training / wait) | "tight" | "after"
 */
export function planCamp(c, win, now, opts = {}) {
  const priority = opts.priority || "checkins";
  const rawReady = c.running && Number.isFinite(c.finishAt) ? c.finishAt : now;
  let t = Math.max(rawReady, now);
  // Don't ask for a check-in while the player is asleep: move it to when they wake.
  let sleepShift = null;
  if (opts.sleep && opts.tz && t > now && inSleepWindow(t, opts.tz, opts.sleep)) {
    const wake = nextLocalTime(t, opts.sleep.end, opts.tz);
    sleepShift = { from: t, to: wake };
    t = wake;
  }
  const readySince = !c.running && Number.isFinite(c.lastEnd) && c.lastEnd < now - 5 * MINUTE && now < win.start ? c.lastEnd : null;
  const base = { camp: c.camp, troop: c.troop, readyAt: t, finishAt: c.running ? c.finishAt : null, steps: [], idleMs: 0, gapMs: 0, restartAt: null, restartMs: null, finalFinish: null, eduKnown: !!c.eduMs, sleepShift, readySince };
  if (win.end <= now) return { ...base, cls: "over" };

  const eduMs = c.eduMs || null; // only the player's own Education figure; never derived
  const finalize = (cls, restartAt) => {
    let restartMs = eduMs;
    if (priority === "finish" && opts.desired) {
      const want = nextLocalTime(restartAt, opts.desired.hhmm, opts.desired.tz) - restartAt;
      restartMs = eduMs ? Math.min(eduMs, want) : want;
      if (restartMs < EDU_MIN_BRIDGE_MS) restartMs = eduMs;
    }
    return { ...base, cls, restartAt, restartMs: restartMs || null, finalFinish: restartMs ? restartAt + restartMs : null };
  };

  const at = classifyAt(t, win);
  if (at === "inside") return finalize(t === now && rawReady <= now && now >= win.start ? "now" : "inside", t);
  if (at === "tight") return { ...base, cls: "tight" };
  if (at === "after") return { ...base, cls: "after" }; // a running order finishing after the window: Education can't help this cycle

  // before the window: a short training to get the camps ready, or just wait
  const target = Math.max(win.ready, t); // be ready a few minutes early
  const gap = target - t;
  const bridgeWorth = !opts.bridgeDone && (priority === "checkins" ? gap >= EDU_SKIP_BRIDGE_MS : gap >= EDU_MIN_BRIDGE_MS);
  const steps = [];
  let cursor = t;
  let idle = 0;
  if (bridgeWorth) {
    for (let i = 0; i < 6 && target - cursor > 0; i++) {
      const remaining = target - cursor;
      if (remaining < EDU_MIN_BRIDGE_MS) { idle = remaining; break; }
      const dur = c.normalMs && remaining > c.normalMs ? c.normalMs : floorMin(remaining);
      steps.push({ at: cursor, durationMs: dur });
      cursor += dur;
    }
  } else idle = opts.bridgeDone ? 0 : win.start - t;
  return { ...finalize("before", win.start), steps, idleMs: idle, gapMs: gap };
}

/**
 * The whole account's plan.
 * input: { now, camps:[c…], booking, priority, desired, bufferMs, sleep, tz, done:{bridge?,buff?} }
 * → { win, camps, actions, timeline, checkIns, mode, active, next, then, notices, compare, latest, eduKnown }
 * mode: "over" | "done" | "doNow" | "wait" | "missed"      (active = the window is open now)
 */
export function buildEducationPlan({ now, camps, booking, priority = "checkins", desired = null, bufferMs = EDU_BUFFER_MS, sleep = null, tz = null, done = {} }) {
  const win = eduWindow(booking, bufferMs);
  const bridgeDone = !!done.bridge;
  const plans = camps.map((c) => planCamp(c, win, now, { priority, desired, sleep, tz, bridgeDone }));
  const active = now >= win.start && now < win.end;

  // ---- entries: actions vs milestones
  const evs = [];
  const add = (at, kind, type, p, extra = {}) => evs.push({ at, kind, type, camps: [p.camp], ...extra });
  for (const p of plans) {
    if (p.cls === "over") continue;
    for (const s of p.steps) add(s.at, "action", "bridge", p, { durationMs: s.durationMs, sleepShifted: !!p.sleepShift });
    if (p.restartAt != null) add(p.restartAt, "action", "buff", p, { durationMs: p.restartMs, sleepShifted: !!p.sleepShift && !p.steps.length });
    if (p.cls === "before" && !p.steps.length && p.finishAt != null && p.finishAt > now) add(p.finishAt, "milestone", "ready", p);
    if (p.finalFinish != null) add(p.finalFinish, "milestone", "final", p);
  }
  const merged = [];
  for (const e of evs) {
    const m = merged.find((x) => x.type === e.type && x.at === e.at && (x.durationMs || 0) === (e.durationMs || 0));
    if (m) m.camps.push(...e.camps); else merged.push({ ...e, camps: [...e.camps] });
  }
  const buffDone = !!done.buff;
  // the appointment opening merges into an action at that exact moment
  const startAction = merged.find((e) => e.type === "buff" && e.at === win.start);
  if (startAction) startAction.eduStart = true;
  else merged.push({ at: win.start, kind: "milestone", type: "edu_start", camps: [] });
  merged.push({ at: win.end, kind: "milestone", type: "edu_end", camps: [] });
  const order = { ready: 0, bridge: 1, edu_start: 2, buff: 3, edu_end: 4, final: 5 };
  const timeline = merged.filter((e) => e.at >= now - MINUTE || e.type === "edu_end" || e.type === "edu_start" && active).sort((a, b) => a.at - b.at || order[a.type] - order[b.type]);
  let n = 0;
  timeline.forEach((e) => { if (e.kind === "action") e.n = ++n; });
  const actions = timeline.filter((e) => e.kind === "action");
  const pending = buffDone ? [] : actions;
  const checkIns = new Set(pending.map((e) => Math.floor(e.at / MINUTE))).size;
  const next = pending[0] || null;
  const then = pending.find((e) => e !== next && e.at !== next?.at) || null;

  // ---- mode
  const usable = plans.some((p) => ["now", "inside", "before"].includes(p.cls));
  let mode;
  if (plans.every((p) => p.cls === "over")) mode = "over";
  else if (buffDone) mode = "done";
  else if (!usable || !next) mode = "missed";
  else if (next.at <= now + MINUTE) mode = "doNow";
  else mode = "wait";

  // ---- notices (calm, never judgmental)
  const notices = [];
  const since = plans.map((p) => p.readySince).filter(Boolean).sort((a, b) => a - b)[0];
  if (since) notices.push({ key: "changed", since });
  const shifted = plans.find((p) => p.sleepShift);
  if (shifted) notices.push({ key: "sleepShift", from: shifted.sleepShift.from, to: shifted.sleepShift.to });
  if (sleep && tz && inSleepWindow(win.start, tz, sleep) && inSleepWindow(win.latest, tz, sleep)) notices.push({ key: "asleepWindow" });

  // ---- normal vs Education, only from the player's own figures
  const withBoth = camps.filter((c) => c.normalMs && c.eduMs);
  const compare = withBoth.length === camps.length && camps.length ? camps.map((c) => ({ camp: c.camp, normalMs: c.normalMs, eduMs: c.eduMs, diffMs: c.normalMs - c.eduMs })) : null;

  return { win, camps: plans, actions, timeline, checkIns, mode, active, next, then, notices, compare, latest: win.latest, eduKnown: camps.every((c) => !!c.eduMs) && camps.length > 0, anyEduKnown: camps.some((c) => !!c.eduMs) };
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

/**
 * Should "Maximum" really be maximum right now? If a full batch started now would keep the camps
 * busy right through an upcoming Education appointment, a shorter training that frees them just
 * before the window is usually better — so the restart can happen while the buff is active.
 * Advice only: the player can still choose Maximum.
 *
 * win — eduWindow(booking, buffer). Returns null when Maximum is fine:
 *   no appointment, it's already running (restarting now uses it), a full batch is ready in time,
 *   or a full batch would finish inside the window anyway.
 * → { kind: "bridge", trainFor, readyAt, restartAt }   train this long now, restart at Education
 *   { kind: "wait", restartAt }                         too little time to be worth a short run
 */
export function eduAwareMax(now, maxMs, win) {
  if (!win || !(maxMs > 0) || win.end <= now || now >= win.start) return null;
  const finish = now + maxMs;
  if (finish <= win.ready) return null; // ready before Education anyway
  if (finish <= win.latest) return null; // a full batch lands inside the window — perfect
  const bridge = floorMin(win.ready - now);
  if (bridge >= EDU_MIN_BRIDGE_MS) return { kind: "bridge", trainFor: bridge, readyAt: now + bridge, restartAt: win.start };
  return { kind: "wait", restartAt: win.start };
}
