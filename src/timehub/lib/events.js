/* ============================================================
   EVENTS v2 — recurrence, occurrence overrides, lifecycle, sorting.
   Event:
   { id, templateId|null, name, accountId|null (null = shared by all accounts),
     startAt|null (anchor, epoch ms UTC; null = "set your time"), durationMs|null,
     recurrence: { type: "once"|"daily"|"everyNDays"|"weekly"|"everyNWeeks", n?, weekdays?, until? },
     overrides: { [originalStartMs]: { startAt?, cancelled? } },
     combat, legion, enabled, archived, notes, category, createdAt,
     reminderHidden, reminderLeadMs }
   All recurrence maths is in exact UTC days, so the game's UTC schedule never
   shifts when the viewer's zone changes to/from daylight saving.
   ============================================================ */
import { DAY, MINUTE } from "./time.js";

export const JUST_STARTED_MS = 5 * MINUTE;
export const RECURRENCE_TYPES = ["once", "daily", "everyNDays", "weekly", "everyNWeeks"];

export function periodOf(rec) {
  switch (rec?.type) {
    case "daily": return DAY;
    case "everyNDays": return Math.max(1, rec.n | 0) * DAY;
    case "everyNWeeks": return Math.max(1, rec.n | 0) * 7 * DAY;
    default: return null; // once / weekly handled separately
  }
}

export function isRecurring(ev) {
  return ev.recurrence && ev.recurrence.type !== "once";
}

export function isScheduled(ev) {
  return Number.isFinite(ev.startAt) && ev.enabled !== false;
}

/** Raw (un-overridden) occurrence starts that fall in [from, to]. */
function rawStarts(ev, from, to) {
  const a = ev.startAt;
  const rec = ev.recurrence || { type: "once" };
  const until = Number.isFinite(rec.until) ? rec.until : Infinity;
  const out = [];
  if (rec.type === "once") {
    if (a >= from && a <= to) out.push(a);
    return out;
  }
  if (rec.type === "weekly") {
    const days = (rec.weekdays || []).filter((d) => d >= 0 && d <= 6);
    if (!days.length) return a >= from && a <= to ? [a] : [];
    const timeOfDay = a - Math.floor(a / DAY) * DAY;
    let day = Math.floor(Math.max(from, a) / DAY) * DAY;
    for (; day <= to; day += DAY) {
      const s = day + timeOfDay;
      if (s < a || s < from || s > to || s >= until) continue;
      if (days.includes(new Date(day).getUTCDay())) out.push(s);
    }
    return out;
  }
  const p = periodOf(rec);
  let k = Math.max(0, Math.ceil((from - a) / p));
  for (let s = a + k * p; s <= to && s < until; s = a + ++k * p) out.push(s);
  return out;
}

/**
 * Occurrences in [from, to] after applying overrides.
 * Returns [{ key (original start), start, end|null, moved }], sorted by start.
 */
export function occurrencesBetween(ev, from, to) {
  if (!isScheduled(ev)) return [];
  const dur = ev.durationMs > 0 ? ev.durationMs : 0;
  const ov = ev.overrides || {};
  const pad = 7 * DAY; // pick up occurrences moved into the window
  const out = [];
  for (const key of rawStarts(ev, from - pad, to + pad)) {
    const o = ov[key];
    if (o?.cancelled) continue;
    const start = Number.isFinite(o?.startAt) ? o.startAt : key;
    if (start + (dur || 0) < from || start > to) continue;
    out.push({ key, start, end: dur ? start + dur : null, moved: start !== key });
  }
  return out.sort((x, y) => x.start - y.start || x.key - y.key);
}

function activeEnd(o) {
  return o.end ?? o.start + JUST_STARTED_MS;
}

/**
 * The occurrence that matters now: { key, start, end, status } where status is
 * "unset" | "disabled" | "upcoming" | "in_progress" | "started" | "completed".
 * Recurring events roll forward and never complete (unless ended by `until`).
 */
export function eventOccurrence(ev, now) {
  if (!Number.isFinite(ev.startAt)) return { key: null, start: null, end: null, status: "unset" };
  if (ev.enabled === false) return { key: null, start: ev.startAt, end: null, status: "disabled" };
  const horizon = Math.max(periodOf(ev.recurrence) || 0, 8 * DAY);
  const dur = ev.durationMs > 0 ? ev.durationMs : JUST_STARTED_MS;
  const lookFrom = isRecurring(ev) ? now - dur - DAY : -Infinity;
  const list = isRecurring(ev) ? occurrencesBetween(ev, lookFrom, now + horizon * 2) : occurrencesBetween(ev, -8.64e15, 8.64e15);
  const current = list.find((o) => activeEnd(o) > now);
  if (current) {
    let status = "upcoming";
    if (now >= current.start) status = current.end ? "in_progress" : "started";
    return { ...current, status };
  }
  const last = list[list.length - 1];
  if (last) return { ...last, status: "completed" };
  // recurring series fully cancelled/ended in the window
  return { key: ev.startAt, start: ev.startAt, end: null, status: "completed" };
}

const STATUS_RANK = { in_progress: 0, started: 0, upcoming: 1, unset: 2, disabled: 3, completed: 4 };

export function relevantTime(occ) {
  if (occ.status === "in_progress") return occ.end;
  if (occ.status === "started") return occ.start + JUST_STARTED_MS;
  if (occ.status === "completed") return occ.end ?? occ.start ?? 0;
  return occ.start ?? Number.MAX_SAFE_INTEGER;
}

/** Stable: live → upcoming (soonest) → unset → disabled; ties by createdAt then id. */
export function sortEvents(events, now) {
  return events
    .map((ev) => ({ ev, occ: eventOccurrence(ev, now) }))
    .sort((a, b) =>
      STATUS_RANK[a.occ.status] - STATUS_RANK[b.occ.status] ||
      relevantTime(a.occ) - relevantTime(b.occ) ||
      (a.ev.createdAt || 0) - (b.ev.createdAt || 0) ||
      String(a.ev.id).localeCompare(String(b.ev.id))
    );
}

export function partitionEvents(events, now) {
  const current = [];
  const past = [];
  for (const row of sortEvents(events, now)) (row.occ.status === "completed" ? past : current).push(row);
  past.sort((a, b) => relevantTime(b.occ) - relevantTime(a.occ) || String(a.ev.id).localeCompare(String(b.ev.id)));
  return { current, past };
}

/* ---------- editing repeating events ---------- */

/** Only this occurrence: move it (or cancel it). */
export function overrideOccurrence(ev, key, patch) {
  return { ...ev, overrides: { ...(ev.overrides || {}), [key]: { ...(ev.overrides?.[key] || {}), ...patch } } };
}

/**
 * This and future occurrences: end the old series before `key` and return a new series
 * starting at `newStart` with the patch applied. Returns [oldSeries, newSeries].
 */
export function splitSeries(ev, key, patch, newId) {
  const keptOverrides = Object.fromEntries(Object.entries(ev.overrides || {}).filter(([k]) => Number(k) < key));
  const movedOverrides = Object.fromEntries(Object.entries(ev.overrides || {}).filter(([k]) => Number(k) > key));
  const old = { ...ev, overrides: keptOverrides, recurrence: { ...ev.recurrence, until: key } };
  const { until: _u, ...recNoUntil } = ev.recurrence;
  const next = {
    ...ev, ...patch, id: newId, templateId: null, overrides: patch.startAt === undefined || patch.startAt === key ? movedOverrides : {},
    recurrence: { ...recNoUntil, ...(patch.recurrence || {}) }, startAt: patch.startAt ?? key, createdAt: ev.createdAt,
  };
  return [old, next];
}

export function validateEvent(draft) {
  const errors = {};
  if (!draft.templateId && (!draft.name || !draft.name.trim())) errors.name = "errName";
  if (draft.startAt != null && !Number.isFinite(draft.startAt)) errors.startAt = "errDateTime";
  if (!draft.templateId && draft.startAt == null) errors.startAt = "errDateTime";
  if (draft.durationMs != null && !(draft.durationMs > 0)) errors.durationMs = "errDuration";
  const r = draft.recurrence || { type: "once" };
  if (!RECURRENCE_TYPES.includes(r.type)) errors.recurrence = "errRepeat";
  if ((r.type === "everyNDays" || r.type === "everyNWeeks") && !(Number.isInteger(r.n) && r.n >= 1 && r.n <= 365)) errors.recurrence = "errRepeat";
  if (r.type === "weekly" && !(r.weekdays || []).length) errors.recurrence = "errWeekdays";
  return errors;
}

/** Display name: custom name, or the template's translated name. */
export function eventName(ev, t, templates) {
  if (ev.name) return ev.name;
  const tpl = templates[ev.templateId];
  return tpl ? t(tpl.nameKey) : "";
}
