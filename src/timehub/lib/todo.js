/* ============================================================
   TO-DO DAYS — recurring tasks, today's occurrences, history, and small suggestions.

   Designed for "I know what to do, starting is the hard part": fewer decisions, no shame.

   ONE definition per task, never copies. A recurring task keeps a tiny per-day record
     occ: { "2026-10-02": { s: "done" | "skipped" | "removed", at } }
   and "today's occurrence" is DERIVED from it. So at the day boundary nothing has to run:
   yesterday's ticks and "Not today"s simply stop being today's — they're history — and the
   definition shows up fresh. One-off tasks keep `done` + `doneAt`; a one-off finished on an
   earlier day is likewise archived (History only) without any mutation.

   Extra task fields (all optional; see cleanTodoFields):
     repeat   null | { type: "daily"|"weekdays"|"weekly"|"custom", days?: [0..6] }  (0 = Sunday)
     when     "anytime"|"morning"|"afternoon"|"evening"|"time"   (+ at: "HH:MM" for "time")
     reminder "none"|"time"|"morning"|"afternoon"|"evening"|"later"  (+ remindAt: "HH:MM")
              — independent of repeat: Daily never implies a notification.
     essential  true = keep on a Minimum Day
     effort   null|"tiny"|"low"|"medium"|"high"
     group    subgroup / routine name within the category (null = none)
     order    manual order (drag and drop)
     subtasks [{ id, title, doneOn }]  doneOn = dayKey (recurring: counts only on that day)
     placed   { day, start, end }  a recurring task added to TODAY's timeline (one-offs use start/end)
     deferredTo  dayKey  a one-off "Not today" (back on that day)
     deferrals   how many times it was put off (used gently in suggestions, never shown as blame)
     endedOn  dayKey  a recurring series deleted "this and future" (history kept)
   ============================================================ */
import { MINUTE, HOUR, DAY, dayKey, zonedParts, zonedTimeToUtc, hhmmToMinutes } from "./time.js";

export const REPEAT_TYPES = ["never", "daily", "weekdays", "weekly", "custom"];
export const WHEN_TYPES = ["anytime", "morning", "afternoon", "evening", "time"];
export const REMINDER_TYPES = ["none", "time", "morning", "afternoon", "evening", "later"];
export const EFFORTS = ["tiny", "low", "medium", "high"];
export const ENERGY = ["low", "okay", "good"];
export const SUGGEST_LEVELS = ["minimal", "balanced", "frequent"];

/** Parts of the day, in local hours [from, to). Only used to sort and to time in-app reminders —
 *  a "Morning" task is still available all day. */
export const PARTS = { morning: [5, 12], afternoon: [12, 17], evening: [17, 24] };
/** When an in-app reminder for a part of the day appears (local clock). "later" = an evening
 *  check, only if the task is still open then. */
export const REMIND_AT = { morning: "09:00", afternoon: "13:00", evening: "18:00", later: "18:00" };

const HISTORY_DAYS = 45;
const DONE_KEEP_MS = 30 * DAY;

/* ---------- days ---------- */
const keyToUtc = (k) => { const [y, m, d] = k.split("-").map(Number); return Date.UTC(y, m - 1, d); };
export const weekdayOf = (k) => new Date(keyToUtc(k)).getUTCDay();
export const addDays = (k, n) => { const d = new Date(keyToUtc(k) + n * DAY); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`; };
/** Instant of local HH:MM on day `k` in `tz`. */
export function atLocal(k, hhmm, tz) {
  const [y, m, d] = k.split("-").map(Number);
  const mins = hhmmToMinutes(hhmm);
  if (mins == null) return null;
  return zonedTimeToUtc(y, m, d, Math.floor(mins / 60), mins % 60, tz);
}
export function partOfDay(now, tz) {
  const h = zonedParts(now, tz).hour;
  return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 17 ? "afternoon" : "evening";
}

/* ---------- recurrence ---------- */
export const isRecurring = (t) => !!t.repeat;

/** Does this recurring task have an occurrence on day `k`? */
export function dueOn(t, k) {
  if (!t.repeat) return false;
  if (t.endedOn && k >= t.endedOn) return false;
  if (t.createdDay && k < t.createdDay) return false;
  const dow = weekdayOf(k);
  switch (t.repeat.type) {
    case "daily": return true;
    case "weekdays": return dow >= 1 && dow <= 5;
    case "weekly":
    case "custom": return (t.repeat.days || []).includes(dow);
    default: return false;
  }
}

/** pending | done | skipped | removed — for a recurring task on day k, or a one-off "today". */
export function stateOn(t, k) {
  if (t.repeat) return t.occ?.[k]?.s || "pending";
  return t.done ? "done" : "pending";
}

/* ---------- today's view ---------- */
/**
 * Everything the To-do tab shows for today, from the definitions:
 *  open    — pending today (recurring due today, one-offs not done and not put off to later)
 *  done    — finished TODAY (recurring today's tick, one-offs ticked today)
 *  skipped — recurring "Not today"/removed today, one-offs put off to a later day
 * Each item is the task itself plus { day, recurring, state, start, end } for today.
 * Archived things (finished/skipped on earlier days, ended series) are not here — see history().
 */
export function todayView(tasks, now, tz) {
  const k = dayKey(now, tz);
  const open = [], done = [], skipped = [];
  for (const t of tasks || []) {
    if (t.repeat) {
      if (!dueOn(t, k)) continue;
      const s = stateOn(t, k);
      const timeStart = t.when === "time" && t.at ? atLocal(k, t.at, tz) : null;
      const placed = t.placed?.day === k ? t.placed : null;
      const start = placed ? placed.start : timeStart;
      const end = placed ? placed.end : timeStart != null && t.durationMs ? timeStart + t.durationMs : timeStart != null ? timeStart + 15 * MINUTE : null;
      const item = { ...t, day: k, recurring: true, state: s, start, end, done: s === "done" };
      (s === "pending" ? open : s === "done" ? done : skipped).push(item);
    } else {
      if (t.done) {
        if (t.doneAt != null && dayKey(t.doneAt, tz) === k) done.push({ ...t, day: k, recurring: false, state: "done" });
        else if (t.doneAt == null) done.push({ ...t, day: k, recurring: false, state: "done" }); // legacy ticks: keep visible
        continue;
      }
      if (t.deferredTo && t.deferredTo > k) { skipped.push({ ...t, day: k, recurring: false, state: "skipped" }); continue; }
      open.push({ ...t, day: k, recurring: false, state: "pending" });
    }
  }
  const ord = (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || (a.createdAt || 0) - (b.createdAt || 0);
  open.sort(ord); done.sort(ord);
  return { day: k, open, done, skipped };
}

/** Today's scheduled subset for the Timeline (one-offs with a slot today, recurring with a
 *  specific time or placed today), as plain task-shaped objects. */
export function scheduledToday(view, dayStart, dayEnd) {
  return [...view.open, ...view.done].filter((t) => t.start != null && t.start >= dayStart && t.start < dayEnd);
}

/* ---------- actions (pure: task → task) ---------- */
const trimOcc = (occ, k) => Object.fromEntries(Object.entries(occ || {}).filter(([d]) => d >= addDays(k, -HISTORY_DAYS)));

/** Tick / untick. Recurring: TODAY's occurrence only — the definition is untouched. */
export function setDone(t, done, now, tz) {
  const k = dayKey(now, tz);
  if (t.repeat) {
    const occ = { ...trimOcc(t.occ, k) };
    if (done) occ[k] = { s: "done", at: now }; else delete occ[k];
    return { ...t, occ };
  }
  return { ...t, done, doneAt: done ? now : null };
}

/** "Not today": recurring → only today's occurrence; one-off → back tomorrow. Never deletes. */
export function notToday(t, now, tz) {
  const k = dayKey(now, tz);
  if (t.repeat) return { ...t, occ: { ...trimOcc(t.occ, k), [k]: { s: "skipped", at: now } }, placed: t.placed?.day === k ? null : t.placed };
  return { ...t, deferredTo: addDays(k, 1), deferrals: (t.deferrals || 0) + 1, start: null, end: null };
}

/** Delete just today's occurrence of a recurring task (history says "removed", not "skipped"). */
export function removeToday(t, now, tz) {
  const k = dayKey(now, tz);
  return { ...t, occ: { ...trimOcc(t.occ, k), [k]: { s: "removed", at: now } }, placed: t.placed?.day === k ? null : t.placed };
}

/** Delete "this and future": the series stops today; past history is kept. */
export function endSeries(t, now, tz) {
  return { ...t, endedOn: dayKey(now, tz), placed: null };
}

/** Put a task on today's timeline. Recurring tasks are placed for TODAY only. */
export function placeAt(t, start, end, now, tz) {
  if (t.repeat) return { ...t, placed: { day: dayKey(now, tz), start, end } };
  return { ...t, start, end };
}

/** Take a task off the timeline (the to-do itself stays). */
export function unplace(t) {
  if (t.repeat) return { ...t, placed: null };
  return { ...t, start: null, end: null };
}

/** Subtask tick. For a recurring parent a tick only counts on the day it was made. */
export function toggleSubtask(t, subId, now, tz) {
  const k = dayKey(now, tz);
  return { ...t, subtasks: (t.subtasks || []).map((s) => (s.id === subId ? { ...s, doneOn: subDone(t, s, k) ? null : k } : s)) };
}
export const subDone = (t, s, k) => (t.repeat ? s.doneOn === k : s.doneOn != null);

/* ---------- retention ---------- */
/** What survives a save. Open to-dos are never silently dropped; a live recurring definition is
 *  never dropped; finished one-offs and ended series stay 30 days for History; a timeline block
 *  that slipped by more than a week (never ticked) is let go, as before. */
export function keepTask(t, now) {
  if (t.repeat) return !t.endedOn || keyToUtc(t.endedOn) > now - DONE_KEEP_MS;
  if (t.done) return (t.doneAt ?? t.end ?? t.createdAt ?? now) > now - DONE_KEEP_MS;
  // a plain to-do never expires; an old timeline block that slipped by a week does
  if (t.start != null && t.end != null) return t.end > now - 7 * DAY;
  return true;
}

/* ---------- history ---------- */
/**
 * Earlier days only (today stays on the main screen), newest first:
 * → [{ day, items: [{ id, title, state: "done"|"skipped"|"removed", at }] }]
 */
export function history(tasks, now, tz, days = 14) {
  const k = dayKey(now, tz);
  const from = addDays(k, -days);
  const byDay = {};
  const push = (d, item) => { (byDay[d] = byDay[d] || []).push(item); };
  for (const t of tasks || []) {
    if (t.repeat) {
      for (const [d, o] of Object.entries(t.occ || {})) if (d < k && d >= from) push(d, { id: t.id, title: t.title, state: o.s, at: o.at, recurring: true });
    } else if (t.done && t.doneAt != null) {
      const d = dayKey(t.doneAt, tz);
      if (d < k && d >= from) push(d, { id: t.id, title: t.title, state: "done", at: t.doneAt, recurring: false });
    }
  }
  return Object.keys(byDay).sort().reverse().map((d) => ({ day: d, items: byDay[d].sort((a, b) => (a.at || 0) - (b.at || 0)) }));
}

/* ---------- Minimum Day ---------- */
/** Minimum Day is for today only — tomorrow starts clean, nothing is rescheduled or deleted. */
export const minimumDayOn = (settings, now, tz) => settings?.minDay === dayKey(now, tz);
export const energyToday = (settings, now, tz) => (settings?.energy?.day === dayKey(now, tz) ? settings.energy.level : null);

/** The two lists the To-do tab shows on a Minimum Day: essentials, and everything else (kept,
 *  just quieter — never marked failed). */
export function splitEssentials(open) {
  return { essentials: open.filter((t) => t.essential), rest: open.filter((t) => !t.essential) };
}

/** "4 completed · 2 essentials remaining" — today only, no streaks, no record of yesterday. */
export function todaySummary(view) {
  return { completed: view.done.length, open: view.open.length, essentialsLeft: view.open.filter((t) => t.essential).length };
}

/* ---------- in-app reminders (no push notifications exist in the app) ---------- */
/** Instant at which this task's in-app reminder appears today, or null. */
export function reminderTime(t, k, tz) {
  const r = t.reminder || "none";
  if (r === "none") return null;
  const hhmm = r === "time" ? t.remindAt : REMIND_AT[r];
  return hhmm ? atLocal(k, hhmm, tz) : null;
}
/** Open items whose reminder time has passed today (and that weren't snoozed past now). */
export function remindersDue(view, now, tz) {
  return view.open.filter((t) => {
    const at = reminderTime(t, view.day, tz);
    if (at == null || at > now) return false;
    return !(t.snooze?.day === view.day && t.snooze.until > now);
  });
}
export function snoozeHour(t, now, tz) {
  return { ...t, snooze: { day: dayKey(now, tz), until: now + HOUR } };
}

/* ---------- fitting tasks into time ---------- */
/** Open unscheduled items that fit in `ms` (only tasks with a duration — never a guess),
 *  essentials first, then shortest. */
export function fitsIn(open, ms) {
  return open.filter((t) => t.start == null && t.durationMs && t.durationMs <= ms)
    .sort((a, b) => (b.essential ? 1 : 0) - (a.essential ? 1 : 0) || a.durationMs - b.durationMs);
}

/**
 * Free time is not task time. How much of a gap suggestions may claim, and whether the Timeline
 * shows the "N to-dos fit here" hint on its own (the "+ Add task" list always works):
 *   minimal  — never hint; suggestions only when asked
 *   balanced — hint on gaps of 30m+, suggest at most ~2/3 of the gap (default)
 *   frequent — hint on any gap something fits in
 */
export function gapHint(open, gapMs, level = "balanced") {
  if (level === "minimal") return null;
  if (level === "balanced" && gapMs < 30 * MINUTE) return null;
  const room = level === "balanced" ? Math.floor(gapMs * 2 / 3) : gapMs;
  const fits = fitsIn(open, room);
  return fits.length ? { count: fits.length, room } : null;
}

/** The first free window today a task fits in (from the timeline's gaps), for "Best opening"
 *  and "Fits before X" labels. gaps: [{ start, ms, before? }] chronological. */
export function bestOpening(t, gaps, now) {
  if (!t.durationMs) return null;
  const g = gaps.find((x) => x.ms >= t.durationMs && x.start + x.ms > now);
  if (!g) return null;
  return { start: Math.max(g.start, now), now: g.start <= now, before: g.before || null };
}

/**
 * "What should I do now?" — at most three picks, never a list:
 *   good    — the best fit for the time available
 *   tiny    — something very small (≤ 5 min or effort "tiny")
 *   stretch — only with energy to spare: something bigger that still fits
 * Considers time available, duration, importance, urgency, essentials, deferrals, part of day,
 * effort vs. energy. High effort never hides something essential or urgent.
 */
export function whatNow(open, availableMs, { energy = "okay", now, tz, dayEnd } = {}) {
  const part = now != null && tz ? partOfDay(now, tz) : null;
  const pool = open.filter((t) => t.durationMs && t.durationMs <= availableMs && (t.start == null || t.start <= now + 15 * MINUTE));
  const effortCost = { tiny: 0, low: 1, medium: 2, high: 3 };
  const score = (t) => {
    let s = 0;
    if (t.essential) s += 40;
    if (t.important) s += 25;
    if (t.start != null && t.start <= now + 15 * MINUTE) s += 30; // it's due about now
    if (t.dueAt != null && dayEnd != null && t.dueAt < dayEnd) s += 15;
    if (part && t.when === part) s += 10;
    s += Math.min(t.deferrals || 0, 3) * 3; // gently resurface, never shame
    const cost = effortCost[t.effort] ?? 1;
    const protectedTask = t.essential || t.important || (t.start != null && t.start <= now + 15 * MINUTE);
    if (energy === "low" && !protectedTask) s -= cost * 12;
    if (energy === "good") s += cost * 2;
    return s;
  };
  const ranked = pool.map((t) => ({ t, s: score(t) })).sort((a, b) => b.s - a.s || a.t.durationMs - b.t.durationMs);
  const isTiny = (t) => t.effort === "tiny" || t.durationMs <= 5 * MINUTE;
  const used = new Set();
  const take = (pred) => { const x = ranked.find(({ t }) => !used.has(t.id) && pred(t)); if (x) used.add(x.t.id); return x?.t || null; };
  const good = take((t) => !isTiny(t)) || take(() => true);
  const tiny = take(isTiny);
  const stretch = energy === "low" ? null : take((t) => ["medium", "high"].includes(t.effort) || t.durationMs >= 20 * MINUTE);
  return { good, tiny, stretch };
}

/* ---------- routines ---------- */
/** Starter routines — offered, never forced. Every item becomes its own independent task. */
export const ROUTINE_PRESETS = {
  morning: { nameKey: "routineMorning", when: "morning", items: [["routineMeds", 2], ["routineTeeth", 3], ["routineFace", 3]] },
  evening: { nameKey: "routineEvening", when: "evening", items: [["routineMeds", 2], ["routineTeeth", 3]] },
};

/** Build the tasks for a routine. items: [{ title, durationMs, essential }] */
export function routineTasks({ name, category = "personal", repeat = { type: "daily" }, when = "anytime", items }, now, tz, newId, startOrder = 0) {
  return items.filter((i) => i.title && i.title.trim()).map((i, n) => ({
    id: newId(), title: i.title.trim().slice(0, 120), category, durationMs: i.durationMs || null, start: null, end: null,
    accountId: null, important: null, notes: "", done: false, createdAt: now,
    repeat, when, reminder: "none", essential: !!i.essential, effort: null, group: name.trim().slice(0, 40) || null,
    order: startOrder + n, subtasks: [], occ: {}, createdDay: dayKey(now, tz),
  }));
}

/* ---------- ordering (drag and drop) ---------- */
/**
 * Move task `id` to sit before `beforeId` (or at the end) in `category`/`group`.
 * Renumbers that one section so orders stay small and stable.
 */
export function moveTask(tasks, id, { category, group = null, beforeId = null }) {
  const moving = tasks.find((t) => t.id === id);
  if (!moving) return tasks;
  const moved = { ...moving, category, group, accountId: category === "game" ? moving.accountId : null };
  const section = tasks.filter((t) => t.id !== id && t.category === category && (t.group || null) === group)
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || (a.createdAt || 0) - (b.createdAt || 0));
  const at = beforeId ? section.findIndex((t) => t.id === beforeId) : -1;
  const list = [...section];
  list.splice(at < 0 ? list.length : at, 0, moved);
  const orders = new Map(list.map((t, i) => [t.id, i]));
  return tasks.map((t) => (orders.has(t.id) ? { ...(t.id === id ? moved : t), order: orders.get(t.id) } : t));
}

/* ---------- schema ---------- */
const isNum = (x) => typeof x === "number" && Number.isFinite(x);
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAYKEY = /^\d{4}-\d{2}-\d{2}$/;

/** Sanitises the optional to-do fields (called from storage.cleanTasks). Old tasks migrate to
 *  "no repeat, anytime, no reminder" — exactly how they behaved before. */
export function cleanTodoFields(t) {
  let repeat = null;
  if (t.repeat && ["daily", "weekdays", "weekly", "custom"].includes(t.repeat.type)) {
    const days = [...new Set((t.repeat.days || []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
    repeat = t.repeat.type === "weekly" || t.repeat.type === "custom" ? (days.length ? { type: t.repeat.type, days } : null) : { type: t.repeat.type };
  }
  const occ = {};
  if (repeat && t.occ && typeof t.occ === "object") {
    for (const [d, o] of Object.entries(t.occ)) if (DAYKEY.test(d) && o && ["done", "skipped", "removed"].includes(o.s)) occ[d] = { s: o.s, at: isNum(o.at) ? o.at : null };
  }
  const when = WHEN_TYPES.includes(t.when) ? t.when : "anytime";
  const reminder = REMINDER_TYPES.includes(t.reminder) ? t.reminder : "none";
  return {
    repeat, occ,
    when: when === "time" && !HHMM.test(t.at || "") ? "anytime" : when,
    at: when === "time" && HHMM.test(t.at || "") ? t.at : null,
    reminder: reminder === "time" && !HHMM.test(t.remindAt || "") ? "none" : reminder,
    remindAt: reminder === "time" && HHMM.test(t.remindAt || "") ? t.remindAt : null,
    essential: t.essential === true,
    effort: EFFORTS.includes(t.effort) ? t.effort : null,
    group: typeof t.group === "string" && t.group.trim() ? t.group.trim().slice(0, 40) : null,
    order: isNum(t.order) ? t.order : null,
    subtasks: Array.isArray(t.subtasks) ? t.subtasks.filter((s) => s && typeof s.id === "string" && typeof s.title === "string" && s.title.trim())
      .slice(0, 20).map((s) => ({ id: s.id, title: s.title.trim().slice(0, 80), doneOn: DAYKEY.test(s.doneOn || "") ? s.doneOn : null })) : [],
    placed: repeat && t.placed && DAYKEY.test(t.placed.day) && isNum(t.placed.start) && isNum(t.placed.end) && t.placed.end > t.placed.start ? { day: t.placed.day, start: t.placed.start, end: t.placed.end } : null,
    doneAt: isNum(t.doneAt) ? t.doneAt : null,
    deferredTo: !repeat && DAYKEY.test(t.deferredTo || "") ? t.deferredTo : null,
    deferrals: Number.isInteger(t.deferrals) && t.deferrals > 0 ? Math.min(t.deferrals, 99) : 0,
    endedOn: repeat && DAYKEY.test(t.endedOn || "") ? t.endedOn : null,
    createdDay: DAYKEY.test(t.createdDay || "") ? t.createdDay : null,
    snooze: t.snooze && DAYKEY.test(t.snooze.day) && isNum(t.snooze.until) ? { day: t.snooze.day, until: t.snooze.until } : null,
  };
}
