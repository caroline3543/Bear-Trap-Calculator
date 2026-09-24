import { test } from "node:test";
import assert from "node:assert/strict";
import { MINUTE, HOUR, DAY, SECOND } from "../lib/time.js";
import { eventOccurrence, sortEvents, partitionEvents, validateEvent, JUST_STARTED_MS } from "../lib/events.js";
import { bookingStatus, bookingEnd, findOverlaps, partitionBookings, BOOKING_MS } from "../lib/bookings.js";
import { createTimerTimes, timerStatus, timerRemaining, restartTimer, sortTimers, timerProgress } from "../lib/timers.js";
import { contribState, spendAttempt, setAttempts, adjustAttempts, reconfigure, DEFAULT_CONTRIB } from "../lib/contributions.js";
import { classifyMinutes, classifyAt } from "../lib/dayNight.js";

const T0 = Date.UTC(2026, 8, 24, 12, 0, 0);
const ev = (id, startAt, extra = {}) => ({ id, name: id, startAt, durationMs: null, repeat: "none", createdAt: 0, ...extra });

/* ---------- events ---------- */
test("event lifecycle with duration", () => {
  const e = ev("a", T0, { durationMs: HOUR });
  assert.equal(eventOccurrence(e, T0 - 1).status, "upcoming");
  assert.equal(eventOccurrence(e, T0).status, "in_progress"); // starting immediately
  assert.equal(eventOccurrence(e, T0 + HOUR - 1).status, "in_progress");
  assert.equal(eventOccurrence(e, T0 + HOUR).status, "completed");
});

test("event without duration: started, then completed", () => {
  const e = ev("a", T0);
  assert.equal(eventOccurrence(e, T0).status, "started");
  assert.equal(eventOccurrence(e, T0 + JUST_STARTED_MS - 1).status, "started");
  assert.equal(eventOccurrence(e, T0 + JUST_STARTED_MS).status, "completed");
  assert.equal(eventOccurrence(e, T0 - DAY * 30).status, "upcoming");
});

test("already-expired events go to past, newest first", () => {
  const events = [ev("old", T0 - 3 * DAY), ev("older", T0 - 5 * DAY), ev("next", T0 + HOUR)];
  const { current, past } = partitionEvents(events, T0);
  assert.deepEqual(current.map((r) => r.ev.id), ["next"]);
  assert.deepEqual(past.map((r) => r.ev.id), ["old", "older"]);
});

test("sorting: live first, then soonest; identical start times stay in stable order", () => {
  const events = [
    ev("later", T0 + 2 * HOUR, { createdAt: 1 }),
    ev("same-b", T0 + HOUR, { createdAt: 5 }),
    ev("same-a", T0 + HOUR, { createdAt: 3 }),
    ev("live", T0 - 10 * MINUTE, { durationMs: HOUR, createdAt: 9 }),
  ];
  const ids = sortEvents(events, T0).map((r) => r.ev.id);
  assert.deepEqual(ids, ["live", "same-a", "same-b", "later"]);
  // same result a second later — no jumps
  assert.deepEqual(sortEvents(events, T0 + SECOND).map((r) => r.ev.id), ids);
  // same createdAt → id tiebreak
  const tie = [ev("z", T0 + HOUR), ev("y", T0 + HOUR)];
  assert.deepEqual(sortEvents(tie, T0).map((r) => r.ev.id), ["y", "z"]);
});

test("event crossing midnight UTC keeps absolute timing", () => {
  const start = Date.UTC(2026, 8, 24, 23, 30);
  const e = ev("x", start, { durationMs: HOUR });
  assert.equal(eventOccurrence(e, Date.UTC(2026, 8, 25, 0, 15)).status, "in_progress");
  assert.equal(eventOccurrence(e, start).end, Date.UTC(2026, 8, 25, 0, 30));
});

test("daily recurring events roll forward and never complete", () => {
  const e = ev("daily", T0 - 3 * DAY, { durationMs: 30 * MINUTE, recurrence: { type: "daily" } });
  const o = eventOccurrence(e, T0 - HOUR);
  assert.deepEqual([o.start, o.end, o.status], [T0, T0 + 30 * MINUTE, "upcoming"]);
  assert.equal(eventOccurrence(e, T0 + 10 * MINUTE).status, "in_progress");
  const after = eventOccurrence(e, T0 + 31 * MINUTE);
  assert.equal(after.status, "upcoming");
  assert.equal(after.start, T0 + DAY);
  const w = ev("weekly", T0 - 8 * DAY, { recurrence: { type: "everyNWeeks", n: 1 } });
  assert.equal(eventOccurrence(w, T0).start, T0 - DAY + 7 * DAY);
});

test("event validation", () => {
  assert.deepEqual(validateEvent({ name: "Bear", startAt: T0 }), {});
  const errs = validateEvent({ name: "  ", startAt: null, durationMs: 0, recurrence: { type: "once" } });
  assert.deepEqual(Object.keys(errs).sort(), ["durationMs", "name", "startAt"]);
});

/* ---------- minister bookings ---------- */
test("booking expires exactly 30 minutes after start", () => {
  const b = { id: "b1", position: "vice_president", startAt: T0 };
  assert.equal(BOOKING_MS, 30 * MINUTE);
  assert.equal(bookingEnd(b), T0 + 30 * MINUTE);
  assert.equal(bookingStatus(b, T0 - 1), "upcoming");
  assert.equal(bookingStatus(b, T0), "active");
  assert.equal(bookingStatus(b, T0 + 30 * MINUTE - 1), "active");
  assert.equal(bookingStatus(b, T0 + 30 * MINUTE), "expired");
});

test("overlapping bookings are detected per position; back-to-back is fine", () => {
  const existing = [
    { id: "1", position: "vice_president", startAt: T0 },
    { id: "2", position: "minister_education", startAt: T0 },
  ];
  assert.deepEqual(findOverlaps({ id: "n", position: "vice_president", startAt: T0 + 15 * MINUTE }, existing).map((b) => b.id), ["1"]);
  assert.deepEqual(findOverlaps({ id: "n", position: "vice_president", startAt: T0 - 15 * MINUTE }, existing).map((b) => b.id), ["1"]);
  assert.equal(findOverlaps({ id: "n", position: "vice_president", startAt: T0 + 30 * MINUTE }, existing).length, 0);
  assert.equal(findOverlaps({ id: "n", position: "vice_president", startAt: T0 - 30 * MINUTE }, existing).length, 0);
  // editing a booking doesn't clash with itself
  assert.equal(findOverlaps({ id: "1", position: "vice_president", startAt: T0 + 5 * MINUTE }, existing).length, 0);
});

test("bookings partition into current and history", () => {
  const list = [
    { id: "a", position: "vice_president", startAt: T0 - HOUR },
    { id: "b", position: "vice_president", startAt: T0 + HOUR },
    { id: "c", position: "minister_education", startAt: T0 - 10 * MINUTE },
  ];
  const { current, expired } = partitionBookings(list, T0);
  assert.deepEqual(current.map((b) => b.id), ["c", "b"]);
  assert.deepEqual(expired.map((b) => b.id), ["a"]);
});

/* ---------- training & research timers ---------- */
test("timers from duration or exact finish time; multiple simultaneous", () => {
  const a = { id: "a", createdAt: 1, ...createTimerTimes({ mode: "duration", durationMs: 2 * HOUR }, T0) };
  const b = { id: "b", createdAt: 2, ...createTimerTimes({ mode: "finish", endAt: T0 + 30 * MINUTE }, T0) };
  const c = { id: "c", createdAt: 3, ...createTimerTimes({ mode: "duration", durationMs: 10 * MINUTE }, T0 - HOUR) };
  assert.equal(a.endAt, T0 + 2 * HOUR);
  assert.equal(b.durationMs, 30 * MINUTE);
  assert.equal(timerStatus(c, T0), "ready");
  assert.equal(timerRemaining(c, T0), 0);
  assert.equal(timerStatus(a, T0 + 2 * HOUR - 1), "running");
  assert.equal(timerStatus(a, T0 + 2 * HOUR), "ready");
  assert.deepEqual(sortTimers([a, b, c], T0).map((t) => t.id), ["c", "b", "a"]);
  assert.equal(timerProgress(a, T0 + HOUR), 0.5);
  assert.equal(createTimerTimes({ mode: "duration", durationMs: 0 }, T0), null);
  assert.equal(createTimerTimes({ mode: "finish", endAt: NaN }, T0), null);
});

test("restart keeps the same length", () => {
  const t = { id: "a", startedAt: T0 - HOUR, endAt: T0, durationMs: HOUR };
  const r = restartTimer(t, T0 + 5 * MINUTE);
  assert.equal(r.endAt, T0 + 5 * MINUTE + HOUR);
  assert.equal(r.startedAt, T0 + 5 * MINUTE);
});

/* ---------- contribution attempts ---------- */
const I = 10 * MINUTE;
test("spending below max keeps the refresh phase", () => {
  let s = setAttempts(DEFAULT_CONTRIB, T0, 10); // clock starts now
  assert.equal(contribState(s, T0).nextAt, T0 + I);
  s = spendAttempt(s, T0 + 4 * MINUTE);
  const live = contribState(s, T0 + 4 * MINUTE);
  assert.equal(live.count, 9);
  assert.equal(live.nextAt, T0 + I); // spending doesn't reset the clock
  assert.equal(contribState(s, T0 + I).count, 10);
});

test("reopening after hours recalculates without double counting, capped at 20", () => {
  const s = setAttempts(DEFAULT_CONTRIB, T0, 5);
  assert.equal(contribState(s, T0 + 3 * HOUR + 1).count, 20);
  assert.equal(contribState(s, T0 + 25 * MINUTE).count, 7);
  assert.equal(contribState(s, T0 + 25 * MINUTE).nextAt, T0 + 30 * MINUTE);
  assert.equal(contribState(s, T0).fullAt, T0 + 15 * I);
  // Asking twice at the same moment gives the same answer (no duplicate refresh)
  assert.deepEqual(contribState(s, T0 + 25 * MINUTE), contribState(s, T0 + 25 * MINUTE));
  assert.equal(contribState(s, T0 + 100 * DAY).count, 20);
});

test("reaching max stops accumulating; spending at max (pause rule) restarts a full interval", () => {
  let s = setAttempts(DEFAULT_CONTRIB, T0, 19);
  const full = contribState(s, T0 + I);
  assert.equal(full.count, 20);
  assert.equal(full.full, true);
  assert.equal(full.nextAt, null);
  s = spendAttempt(s, T0 + I + 7 * MINUTE);
  const live = contribState(s, T0 + I + 7 * MINUTE);
  assert.equal(live.count, 19);
  assert.equal(live.nextAt, T0 + I + 7 * MINUTE + I);
});

test("'continue' rule: at max the clock keeps ticking in the background", () => {
  let s = { ...setAttempts(DEFAULT_CONTRIB, T0, 19), whenFull: "continue" };
  s = spendAttempt(s, T0 + I + 7 * MINUTE); // was full since T0+I
  assert.equal(contribState(s, T0 + I + 7 * MINUTE).nextAt, T0 + 2 * I);
});

test("cannot spend with zero attempts; manual correction and nudges", () => {
  let s = setAttempts(DEFAULT_CONTRIB, T0, 0);
  assert.equal(spendAttempt(s, T0), null);
  s = setAttempts(DEFAULT_CONTRIB, T0, 12, 3 * MINUTE); // game says next refresh in 3 min
  assert.equal(contribState(s, T0).nextAt, T0 + 3 * MINUTE);
  assert.equal(contribState(s, T0 + 3 * MINUTE).count, 13);
  s = adjustAttempts(s, T0 + MINUTE, +1);
  assert.equal(contribState(s, T0 + MINUTE).count, 13);
  assert.equal(contribState(s, T0 + MINUTE).nextAt, T0 + 3 * MINUTE); // phase kept
  assert.equal(contribState(setAttempts(DEFAULT_CONTRIB, T0, 99), T0).count, 20);
  assert.equal(contribState(setAttempts(DEFAULT_CONTRIB, T0, -4), T0).count, 0);
  const r = reconfigure(s, T0 + MINUTE, { max: 10 });
  assert.equal(contribState(r, T0 + MINUTE).count, 10);
});

/* ---------- day / night ---------- */
test("day/evening/sleep boundaries and wrap past midnight", () => {
  const m = (h, mi = 0) => h * 60 + mi;
  assert.equal(classifyMinutes(m(6, 59)), "sleep");
  assert.equal(classifyMinutes(m(7)), "day");
  assert.equal(classifyMinutes(m(18, 59)), "day");
  assert.equal(classifyMinutes(m(19)), "evening");
  assert.equal(classifyMinutes(m(22)), "sleep");
  const owl = { day: "11:00", evening: "22:00", sleep: "03:00" };
  assert.equal(classifyMinutes(m(1), owl), "evening");
  assert.equal(classifyMinutes(m(4), owl), "sleep");
  assert.equal(classifyMinutes(m(12), owl), "day");
  assert.equal(classifyAt(Date.UTC(2026, 8, 24, 12), "America/Chicago"), "day"); // 07:00 CDT
  assert.equal(classifyAt(Date.UTC(2026, 8, 24, 12), "Pacific/Auckland"), "sleep"); // 00:00 NZST
});
