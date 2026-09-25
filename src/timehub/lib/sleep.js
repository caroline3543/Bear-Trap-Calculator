/* ============================================================
   24/7 TRAINING — gentle timing guidance around the sleep window.
   Only time maths: now → training duration → finish time. No troop numbers.
   Defaults: sleep 22:00–07:00 local, aim to finish around 21:45 so the camp can be
   restarted before bed and run overnight. Editable under ⚙ (settings.sleep).
   ============================================================ */
import { zonedParts, zonedTimeToUtc, hhmmToMinutes, MINUTE, DAY } from "./time.js";

export const DEFAULT_SLEEP = { start: "22:00", end: "07:00", target: "21:45" };
const ROUND = 5 * MINUTE;

/** Is this instant inside the local sleep window (which may wrap past midnight)? */
export function inSleepWindow(ms, tz, sleep = DEFAULT_SLEEP) {
  const p = zonedParts(ms, tz);
  const m = p.hour * 60 + p.minute;
  const a = hhmmToMinutes(sleep.start), b = hhmmToMinutes(sleep.end);
  if (a == null || b == null || a === b) return false;
  return a < b ? m >= a && m < b : m >= a || m < b;
}

/** The next local HH:MM strictly after `ms` (DST-safe). */
export function nextLocalTime(ms, hhmm, tz) {
  const mins = hhmmToMinutes(hhmm);
  const p = zonedParts(ms, tz);
  for (let d = 0; d < 3; d++) {
    const base = new Date(Date.UTC(p.year, p.month - 1, p.day + d));
    const at = zonedTimeToUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), Math.floor(mins / 60), mins % 60, tz);
    if (at > ms) return at;
  }
  return ms + DAY;
}

/**
 * Timing check for one training started at `start` with a full length of `fullMs`.
 * → { fullEnd, overnight, suggestion: null | { durationMs, finishAt, kind: "bed" } }
 * "bed": shorten so it finishes around the target (default 21:45) — restart before sleeping.
 * Started too late for that (shortening would only end it earlier in the night): no suggestion,
 * it simply waits until morning.
 */
export function timingCheck(start, fullMs, tz, sleep = DEFAULT_SLEEP) {
  const fullEnd = start + fullMs;
  const overnight = inSleepWindow(fullEnd, tz, sleep);
  if (!overnight) return { fullEnd, overnight, suggestion: null };
  const bed = nextLocalTime(start, sleep.target, tz);
  const toBed = Math.floor((bed - start) / ROUND) * ROUND;
  if (toBed >= 15 * MINUTE && toBed < fullMs) {
    return { fullEnd, overnight, suggestion: { durationMs: toBed, finishAt: start + toBed, kind: "bed" } };
  }
  return { fullEnd, overnight, suggestion: null };
}

/** For a camp that's training now: advice for its NEXT cycle, started when you'd restart it. */
export function nextCycleCheck(endAt, fullMs, tz, sleep = DEFAULT_SLEEP) {
  if (!inSleepWindow(endAt, tz, sleep)) return null;
  const restartAt = nextLocalTime(endAt - 1, sleep.end, tz); // it finishes while you sleep → you restart when up
  const check = timingCheck(restartAt, fullMs, tz, sleep);
  return { endsOvernight: true, restartAt, ...check };
}
