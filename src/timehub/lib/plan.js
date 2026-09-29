/* ============================================================
   TODAY PLAN — free time between scheduled items + personal tasks.
   Pure functions (tested). Called from the Schedule with the minute
   clock, so nothing here runs every second.
   ============================================================ */
import { MINUTE, HOUR, parseDaysTime } from "./time.js";

export const MIN_GAP_MS = 10 * MINUTE;
export const TASK_KEEP_MS = 7 * 24 * HOUR;

/* ---------- proportional sizing (time blindness): more elapsed time = more visual space,
   clamped so an 8-hour gap doesn't produce an 800px empty page. Pure functions — one inline
   style per render, no animation, no per-second work. ---------- */
const sqrtScale = (ms, capMinutes, minPx, maxPx) => {
  const minutes = Math.min(ms / MINUTE, capMinutes);
  const t = Math.sqrt(Math.max(0, minutes) / capMinutes);
  return Math.round(minPx + (maxPx - minPx) * t);
};

/** Free-time block height in px: a perceptual, clamped scale (16–260): 14m → tiny, 30m → 40,
 *  1h → 72, 2h → 130, 3h37m → ~215, 6h+ → 260 (capped). A long stretch should visibly read as a
 *  substantial block of the day — the space itself communicates the time, not just the label. */
const GAP_STOPS = [[0, 16], [15, 28], [30, 40], [60, 72], [120, 130], [240, 200], [360, 260]];
export function gapVisualHeight(ms) {
  const m = Math.max(0, ms / MINUTE);
  if (m >= GAP_STOPS[GAP_STOPS.length - 1][0]) return GAP_STOPS[GAP_STOPS.length - 1][1];
  for (let i = 1; i < GAP_STOPS.length; i++) {
    const [m1, h1] = GAP_STOPS[i];
    if (m <= m1) { const [m0, h0] = GAP_STOPS[i - 1]; return Math.round(h0 + ((h1 - h0) * (m - m0)) / (m1 - m0)); }
  }
  return 96;
}

/** Personal-task block height in px: a small nudge for longer tasks, capped around 3h. */
export function taskVisualHeight(ms) {
  return sqrtScale(ms, 3 * 60, 48, 96);
}

/**
 * How much time an agenda item takes up:
 *  "range"   — a known start and end (events with a duration, minister bookings, championship rounds)
 *  "instant" — a moment (timer/research finishes, contributions full, claims, stamina 200, intel, daily reset)
 *  "unknown" — an event with no known length: no free time is claimed straight after it.
 */
export function occupancy(item) {
  if (item.kind === "event") {
    if (item.ref?.ev?.templateId === "daily_reset") return "instant";
    return item.end != null && item.end > item.start ? "range" : "unknown";
  }
  if (item.kind === "booking" || item.kind === "champ") return item.end != null && item.end > item.start ? "range" : "instant";
  return "instant";
}

/**
 * Timeline for one day: scheduled items and personal tasks in time order, with free-time gaps
 * between them. Overlapping busy periods merge (no gap inside them). Gaps are only shown from `now`
 * onwards and when at least MIN_GAP_MS long. Tasks marked done are shown but take no time.
 * → [{ type: "item", item } | { type: "task", task } | { type: "gap", start, end, ms }]
 */
export function buildTimeline(items, tasks, dayStart, dayEnd, now, minGap = MIN_GAP_MS) {
  const entries = [
    ...items.map((item) => ({ type: "item", item, start: item.start, end: item.end, occ: occupancy(item) })),
    ...tasks.map((task) => ({ type: "task", task, start: task.start, end: task.end, occ: task.done ? "ignore" : "range" })),
  ].sort((a, b) => a.start - b.start || (a.type === "task") - (b.type === "task") || (a.end ?? a.start) - (b.end ?? b.start));

  const out = [];
  let freeFrom = dayStart; // null = unknown (after an event with no known end)
  const pushGap = (until) => {
    if (freeFrom == null) return;
    const start = Math.max(freeFrom, now, dayStart);
    const end = Math.min(until, dayEnd);
    if (end - start >= minGap) out.push({ type: "gap", start, end, ms: end - start });
  };
  for (const e of entries) {
    if (e.occ !== "ignore") pushGap(e.start);
    out.push(e.type === "item" ? { type: "item", item: e.item } : { type: "task", task: e.task });
    if (e.occ === "range") freeFrom = Math.max(freeFrom ?? e.start, e.end);
    else if (e.occ === "instant") freeFrom = Math.max(freeFrom ?? e.start, e.start);
    else if (e.occ === "unknown") freeFrom = null;
  }
  pushGap(dayEnd);
  return out;
}

/**
 * Task length as typed: 1–2 digits are minutes ("30" → 30m, "90" → 1h 30m); 3–4 digits are
 * hours+minutes like the rest of the app ("130" → 1h 30m, "230" → 2h 30m); "1:30" also works.
 * → milliseconds, or null.
 */
export function parseTaskDuration(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  if (/^\d{1,2}$/.test(raw)) {
    const m = Number(raw);
    return m > 0 ? m * MINUTE : null;
  }
  if (/^\d{3,4}$/.test(raw) || /^\d{1,2}:\d{2}$/.test(raw)) {
    const r = parseDaysTime("", raw);
    return r.error ? null : r.ms;
  }
  return null;
}

/**
 * Adding a task into a free gap: it starts where the gap starts. If it doesn't fit,
 * say by how much instead of silently running into the next item.
 * → { fits, task: { start, end }, over }
 */
export function placeTask(gap, durationMs) {
  const start = gap.start;
  const end = start + durationMs;
  return { fits: end <= gap.end, start, end, over: Math.max(0, end - gap.end) };
}

/** Changing a task's length keeps its start. */
export function resizeTask(task, durationMs) {
  return { ...task, end: task.start + durationMs };
}

/** Tasks worth keeping (last 7 days and later). */
export function pruneTasks(tasks, now) {
  return (tasks || []).filter((t) => t.end > now - TASK_KEEP_MS);
}

/**
 * A task whose planned time has passed but that hasn't been marked done or deleted.
 * Time passing is never treated as completion — the task stays visible until the
 * person says otherwise.
 */
export function overdueTasks(tasks, now) {
  return (tasks || []).filter((t) => !t.done && t.end <= now);
}

/** The first free gap (already only from `now` onward) that fits `durationMs`, or null. */
export function findNextGap(timeline, durationMs) {
  return timeline.find((e) => e.type === "gap" && e.ms >= durationMs) || null;
}

/**
 * Account chips for a schedule row, decided in one place so an account can't appear twice:
 * the item's own account chip once; minister-status lines only carry a chip when they're
 * about a different account (shared events list every account).
 */
export function rowChips(itemAccountId, reminders) {
  return {
    itemChip: itemAccountId || null,
    reminders: reminders.map((r) => ({ ...r, chip: r.accountId !== itemAccountId })),
  };
}
