/* ============================================================
   DAY / NIGHT — a simple estimate from a friend's local clock.
   It says nothing about whether they are actually awake.
   Hours are "HH:MM" strings; ranges wrap past midnight.
   ============================================================ */
import { zonedParts } from "./time.js";

export const DEFAULT_HOURS = { day: "07:00", evening: "19:00", sleep: "22:00" };

export function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

function inRange(t, a, b) {
  return a <= b ? t >= a && t < b : t >= a || t < b;
}

/** "day" | "evening" | "sleep" for a minute-of-day with the given boundaries. */
export function classifyMinutes(minuteOfDay, hours = DEFAULT_HOURS) {
  const d = toMinutes(hours.day) ?? toMinutes(DEFAULT_HOURS.day);
  const e = toMinutes(hours.evening) ?? toMinutes(DEFAULT_HOURS.evening);
  const s = toMinutes(hours.sleep) ?? toMinutes(DEFAULT_HOURS.sleep);
  if (inRange(minuteOfDay, d, e)) return "day";
  if (inRange(minuteOfDay, e, s)) return "evening";
  return "sleep";
}

export function classifyAt(ms, tz, hours = DEFAULT_HOURS) {
  const p = zonedParts(ms, tz);
  return classifyMinutes(p.hour * 60 + p.minute, hours);
}

export function validateHours(h) {
  return ["day", "evening", "sleep"].every((k) => toMinutes(h[k]) != null);
}
