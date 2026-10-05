/* ============================================================
   STORAGE v2 — localStorage key "timehub:v1" (kept so upgrades are
   in place), schema version 2. Loading always sanitises; v1 data is
   migrated without loss.

   v2 shape:
   { version: 2,
     settings: { displayTz, compact, collapsed, showArchived, layout[], accountFilter,
                 calendarAlarmMin, setupDismissed },
     accounts: [{ id, name, type, color, notes, isPrimary, order }],
     accountData: { [id]: { bookings[], timers[], contrib, campMax{}, plans[] } },
     events: [Event v2],            timeOptions: { foundry[], canyon[] },
     reminders: { key: { state, buff } },   friends: [...] }
   ============================================================ */
import { isValidTimeZone, hhmmToMinutes } from "./time.js";
import { MINISTER_POSITIONS } from "./bookings.js";
import { TRAINING_CAMPS, RESEARCH_LOCATIONS } from "./timers.js";
import { validateHours } from "./dayNight.js";
import { emptyAccountData, makeAccount, normalizeAccounts, ACCOUNT_TYPES, ALL, MAX_ACCOUNTS } from "./accounts.js";
import { sanitizeLayout } from "./layout.js";
import { TEMPLATES, DEFAULT_TIME_OPTIONS, REMINDER_LEAD_MS, seedTemplates } from "./eventTemplates.js";
import { RECURRENCE_TYPES } from "./events.js";
import { BUFF_CHOICES } from "./reminders.js";
import { DEFAULT_SLEEP } from "./sleep.js";
import { isThursdayStart } from "./championship.js";
import { cleanFriendAccounts } from "./friends.js";
import { cleanTodoFields, keepTask, SUGGEST_LEVELS, ENERGY } from "./todo.js";

export const STORAGE_KEY = "timehub:v1";
export const SCHEMA_VERSION = 2;

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const str = (v, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");
const id = (v) => (typeof v === "string" && v ? v.slice(0, 64) : null);
const list = (arr, fn) => (Array.isArray(arr) ? arr.map(fn).filter(Boolean) : []);

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function defaultSettings() {
  return {
    displayTz: null, compact: false, collapsed: {}, showArchived: false,
    layout: sanitizeLayout([]), accountFilter: ALL, calendarAlarmMin: 10, setupDismissed: false,
    knownTemplates: Object.keys(TEMPLATES), timeOptionsRev: TIME_OPTIONS_REV, tab: "today", haptics: true, showSpeed: false, tour: null, eduPri: "checkins", eduFinish: null, eduBufferMin: 5, eduDismiss: {},
    timelineFilter: "all", todoView: "list", todoFilter: "all", homeReadyOpen: false, ministerMute: { accounts: [], combat: false }, minDay: null, energy: null, taskSuggest: "balanced", focus: null, todoHistory: false, todoOpen: { game: true, personal: true, work: true }, prioOpen: { next: true, plan: true, quick: true, later: true },
    track: { reset: true, store: true, trek: true, stamina: true, contrib: true, intel: true }, sleep: { ...DEFAULT_SLEEP },
    champ: { leader: null, anchor: null },
  };
}

/** Brand-new user: one Main account + the built-in templates (no invented times). */
export function emptyState(now = Date.now(), makeId = newId) {
  const main = makeAccount({ id: "A", name: "Main Account", type: "main", isPrimary: true, color: 1 }, []);
  return {
    version: SCHEMA_VERSION,
    settings: defaultSettings(),
    accounts: [main],
    accountData: { A: emptyAccountData() },
    events: seedTemplates(now, makeId, main.id),
    timeOptions: Object.fromEntries(Object.entries(DEFAULT_TIME_OPTIONS).map(([k, v]) => [k, [...v]])),
    reminders: {},
    friends: [],
    tasks: [],
  };
}

/* ---------- item cleaners ---------- */

function cleanRecurrence(r) {
  if (!r || !RECURRENCE_TYPES.includes(r.type)) return { type: "once" };
  const out = { type: r.type };
  if (r.type === "everyNDays" || r.type === "everyNWeeks") out.n = Number.isInteger(r.n) && r.n >= 1 && r.n <= 365 ? r.n : 2;
  if (r.type === "weekly") out.weekdays = [...new Set((r.weekdays || []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  if (isNum(r.until)) out.until = r.until;
  return out;
}

function cleanOverrides(o) {
  const out = {};
  if (o && typeof o === "object") {
    for (const [k, v] of Object.entries(o)) {
      if (!isNum(Number(k)) || !v || typeof v !== "object") continue;
      const e = {};
      if (isNum(v.startAt)) e.startAt = v.startAt;
      if (v.cancelled === true) e.cancelled = true;
      if (Object.keys(e).length) out[k] = e;
    }
  }
  return out;
}

function cleanEvent(e, accountIds) {
  if (!e || !id(e.id)) return null;
  const templateId = e.templateId && TEMPLATES[e.templateId] ? e.templateId : null;
  if (!templateId && !str(e.name).trim()) return null;
  if (!templateId && !isNum(e.startAt)) return null;
  return {
    id: id(e.id), templateId, name: str(e.name, 120),
    accountId: e.accountId && accountIds.includes(e.accountId) ? e.accountId : null,
    startAt: isNum(e.startAt) ? e.startAt : null,
    durationMs: isNum(e.durationMs) && e.durationMs > 0 ? e.durationMs : null,
    recurrence: cleanRecurrence(e.recurrence), overrides: cleanOverrides(e.overrides),
    combat: e.combat === true, legion: e.legion === 1 || e.legion === 2 ? e.legion : null,
    enabled: e.enabled !== false, archived: e.archived === true,
    notes: str(e.notes), category: str(e.category, 40), createdAt: isNum(e.createdAt) ? e.createdAt : 0,
    reminderHidden: e.reminderHidden === true,
    reminderLeadMs: isNum(e.reminderLeadMs) && e.reminderLeadMs > 0 ? e.reminderLeadMs : REMINDER_LEAD_MS,
  };
}

function cleanBooking(b) {
  if (!b || !id(b.id) || !isNum(b.startAt) || !MINISTER_POSITIONS.includes(b.position)) return null;
  return { id: id(b.id), position: b.position, startAt: b.startAt, notes: str(b.notes), createdAt: isNum(b.createdAt) ? b.createdAt : 0 };
}

function cleanTimer(t) {
  if (!t || !id(t.id) || !["training", "research"].includes(t.kind) || !isNum(t.endAt)) return null;
  const cats = t.kind === "training" ? TRAINING_CAMPS : RESEARCH_LOCATIONS;
  if (t.kind === "research" && !cats.includes(t.category)) return null; // removed building (e.g. Experts)
  const startedAt = isNum(t.startedAt) ? t.startedAt : t.endAt;
  return {
    id: id(t.id), kind: t.kind, category: cats.includes(t.category) ? t.category : cats[0],
    label: str(t.label, 120), notes: str(t.notes), startedAt, endAt: t.endAt,
    ...(t.kind === "training" && t.troop === "helios" ? { troop: "helios" } : {}),
    ...(t.kind === "training" && ["finish", "max", "custom"].includes(t.mode) ? { mode: t.mode } : {}),
    durationMs: isNum(t.durationMs) && t.durationMs >= 0 ? t.durationMs : Math.max(0, t.endAt - startedAt),
    createdAt: isNum(t.createdAt) ? t.createdAt : 0,
  };
}

function cleanContrib(c) {
  const d = emptyAccountData().contrib;
  if (!c || typeof c !== "object") return d;
  const max = isNum(c.max) && c.max >= 1 && c.max <= 999 ? Math.floor(c.max) : d.max;
  return {
    max, count: isNum(c.count) ? Math.min(max, Math.max(0, Math.floor(c.count))) : max,
    anchorAt: isNum(c.anchorAt) ? c.anchorAt : 0,
    intervalMs: isNum(c.intervalMs) && c.intervalMs >= 1000 ? c.intervalMs : d.intervalMs,
    whenFull: c.whenFull === "continue" ? "continue" : "pause",
    ...(c.lastSpent && isNum(c.lastSpent.at) && isNum(c.lastSpent.n) && c.lastSpent.n > 0 ? { lastSpent: { at: c.lastSpent.at, n: Math.floor(c.lastSpent.n) } } : {}),
  };
}

function cleanCampMax(m) {
  const out = {};
  for (const c of TRAINING_CAMPS) out[c] = m && isNum(m[c]) && m[c] > 0 ? m[c] : null;
  return out;
}

function cleanHelios(h) {
  const classes = [...new Set((h && Array.isArray(h.classes) ? h.classes : []).filter((c) => TRAINING_CAMPS.includes(c)))];
  return { classes, max: cleanCampMax(h?.max) };
}

function cleanPlan(p) {
  if (!p || !id(p.id) || !isNum(p.startAt) || !isNum(p.target)) return null;
  const camps = (Array.isArray(p.camps) ? p.camps : []).filter((c) => TRAINING_CAMPS.includes(c));
  return camps.length ? { id: id(p.id), camps, startAt: p.startAt, target: p.target, ...(p.troop === "helios" ? { troop: "helios" } : {}), ...(p.edu === true ? { edu: true } : {}) } : null;
}

function cleanAccountData(a) {
  if (!a || typeof a !== "object") return emptyAccountData();
  return {
    bookings: list(a.bookings, cleanBooking), timers: list(a.timers, cleanTimer), contrib: cleanContrib(a.contrib),
    campMax: cleanCampMax(a.campMax), helios: cleanHelios(a.helios), plans: list(a.plans, cleanPlan),
    lastEnded: Object.fromEntries(TRAINING_CAMPS.filter((c) => isNum(a.lastEnded?.[c])).map((c) => [c, a.lastEnded[c]])),
    campMaxEdu: cleanCampMax(a.campMaxEdu),
    campTroop: Object.fromEntries(TRAINING_CAMPS.filter((c) => a.campTroop?.[c] === "helios" || a.campTroop?.[c] === "normal").map((c) => [c, a.campTroop[c]])),
    maxLearned: Object.fromEntries(Object.entries(a.maxLearned && typeof a.maxLearned === "object" ? a.maxLearned : {})
      .filter(([k, v]) => /^(infantry|lancer|marksman)_camp:(normal|helios)$/.test(k) && v && isNum(v.at) && (v.prev === null || isNum(v.prev)))
      .map(([k, v]) => [k, { prev: v.prev, at: v.at }])),
    vpDismiss: Object.fromEntries(Object.entries(a.vpDismiss && typeof a.vpDismiss === "object" ? a.vpDismiss : {})
      .filter(([k, v]) => typeof k === "string" && k.length <= 120 && isNum(v)).slice(-40)),
    eduDone: Object.fromEntries(Object.entries(a.eduDone && typeof a.eduDone === "object" ? a.eduDone : {}).slice(-12)
      .filter(([k, v]) => typeof k === "string" && k.length <= 80 && v && typeof v === "object")
      .map(([k, v]) => [k, { ...(isNum(v.bridge) ? { bridge: v.bridge } : {}), ...(isNum(v.buff) ? { buff: v.buff } : {}) }])),
    campSame: typeof a.campSame === "boolean" ? a.campSame : null,
    campTroops: Object.fromEntries(TRAINING_CAMPS.filter((c) => isNum(a.campTroops?.[c]) && a.campTroops[c] > 0 && a.campTroops[c] < 1e7).map((c) => [c, Math.floor(a.campTroops[c])])),
    stamina: a.stamina && isNum(a.stamina.value) && isNum(a.stamina.at) && a.stamina.value >= 0 && a.stamina.value <= 9999 ? { value: Math.floor(a.stamina.value), at: a.stamina.at } : null,
    claims: Object.fromEntries(Object.entries(a.claims && typeof a.claims === "object" ? a.claims : {}).filter(([k, v]) => (/^(store0|store12|trek8|trek16)@\d{4}-\d{2}-\d{2}$/.test(k) || /^intel@\d{4}-\d{2}-\d{2}T\d{2}$/.test(k)) && isNum(v))),
  };
}

function cleanFriend(f, i, accountIds = []) {
  if (!f || !id(f.id) || !str(f.name).trim() || !isValidTimeZone(f.tz)) return null;
  const hours = f.hours && validateHours(f.hours) ? { day: f.hours.day, evening: f.hours.evening, sleep: f.hours.sleep } : null;
  return { id: id(f.id), name: str(f.name, 80), location: str(f.location, 80), tz: f.tz, notes: str(f.notes), hours, order: isNum(f.order) ? f.order : i, accounts: cleanFriendAccounts(f.accounts, accountIds) };
}

/** Bump when DEFAULT_TIME_OPTIONS gains game-confirmed times: saved lists get them merged in once. */
export const TIME_OPTIONS_REV = 2;

function cleanTimeOptions(o, merge) {
  const out = {};
  for (const k of Object.keys(DEFAULT_TIME_OPTIONS)) {
    const saved = o && Array.isArray(o[k]) ? o[k] : null;
    const src = !saved ? DEFAULT_TIME_OPTIONS[k] : merge ? [...saved, ...DEFAULT_TIME_OPTIONS[k]] : saved;
    out[k] = [...new Set(src.filter((s) => hhmmToMinutes(s) != null).map((s) => s.padStart(5, "0")))].sort();
  }
  return out;
}

function cleanReminders(r) {
  const out = {};
  if (r && typeof r === "object") {
    for (const [k, v] of Object.entries(r)) {
      if (!/^[^|]+\|\d+\|[^|]+$/.test(k) || !v) continue;
      if (v.state === "dismissed") out[k] = { state: "dismissed", buff: null };
      else if (v.state === "booked") out[k] = { state: "booked", buff: BUFF_CHOICES.includes(v.buff) ? v.buff : "unsure" };
    }
  }
  return out;
}

/* ---------- migration ---------- */

/** v1 → v2: A/B accounts become named accounts; repeat → recurrence; templates added (no times). */
export function migrateV1(raw, now = Date.now(), makeId = newId) {
  const oldAcc = raw.accounts && typeof raw.accounts === "object" && !Array.isArray(raw.accounts) ? raw.accounts : {};
  const ids = Object.keys(oldAcc).filter((k) => oldAcc[k] && typeof oldAcc[k] === "object");
  if (!ids.includes("A")) ids.unshift("A");
  const names = { A: ["Main Account", "main"], B: ["Farm Account", "farm"] };
  const accounts = [];
  for (const k of ids) accounts.push(makeAccount({ id: k, name: names[k]?.[0] || `Account ${k}`, type: names[k]?.[1] || "other", isPrimary: k === "A" }, accounts));
  const accountData = {};
  for (const k of ids) accountData[k] = { ...(oldAcc[k] || {}), campMax: null, plans: [] };
  const repeatMap = { daily: { type: "daily" }, weekly: { type: "everyNWeeks", n: 1 } };
  const events = (Array.isArray(raw.events) ? raw.events : []).map((e) => e && ({
    ...e, templateId: null, accountId: null, recurrence: repeatMap[e.repeat] || { type: "once" }, overrides: {}, combat: false, enabled: true,
  }));
  return {
    version: 2,
    settings: { ...(raw.settings || {}), layout: null, accountFilter: ALL },
    accounts, accountData,
    events: [...events, ...seedTemplates(now, makeId, "A")],
    timeOptions: null, reminders: {}, friends: raw.friends,
  };
}

/** Validate + migrate any parsed value into a well-formed v2 state. Never throws. */
export function sanitizeState(raw, now = Date.now(), makeId = newId) {
  if (!raw || typeof raw !== "object") return emptyState(now, makeId);
  if (raw.version !== 2) raw = migrateV1(raw, now, makeId);

  let accounts = list(raw.accounts, (a) => (a && id(a.id) ? {
    id: id(a.id), name: str(a.name, 40).trim() || "Account", type: ACCOUNT_TYPES.includes(a.type) ? a.type : "other",
    color: Number.isInteger(a.color) && a.color >= 1 && a.color <= 6 ? a.color : 1, notes: str(a.notes),
    isPrimary: a.isPrimary === true, order: isNum(a.order) ? a.order : 0,
    icon: [...str(a.icon, 16).trim()].slice(0, 2).join(""),
  } : null));
  const seen = new Set();
  accounts = accounts.filter((a) => !seen.has(a.id) && seen.add(a.id));
  if (!accounts.length) accounts = [makeAccount({ id: "A", name: "Main Account", type: "main", isPrimary: true, color: 1 }, [])];
  accounts = normalizeAccounts(accounts).slice(0, MAX_ACCOUNTS);
  const accountIds = accounts.map((a) => a.id);

  const accountData = {};
  for (const aid of accountIds) accountData[aid] = cleanAccountData(raw.accountData?.[aid]);

  const s = raw.settings && typeof raw.settings === "object" ? raw.settings : {};
  const collapsed = {};
  if (s.collapsed && typeof s.collapsed === "object") for (const k of Object.keys(s.collapsed)) if (typeof s.collapsed[k] === "boolean") collapsed[k] = s.collapsed[k];
  const friends = list(raw.friends, (f, i) => cleanFriend(f, i, accountIds)).sort((a, b) => a.order - b.order).map((f, i) => ({ ...f, order: i }));

  // Seed templates added after this state was created (once — a deleted template stays deleted).
  // Templates are only kept once they have a time (no "set up" placeholders).
  let events = list(raw.events, (e) => cleanEvent(e, accountIds)).filter((e) => !(e.templateId && e.startAt == null));
  const known = Array.isArray(s.knownTemplates) ? s.knownTemplates.filter((k) => TEMPLATES[k]) : ["daily_reset", "bear_trap_1", "bear_trap_2", "foundry", "canyon_clash", "svs_castle"];
  const fresh = Object.keys(TEMPLATES).filter((k) => !known.includes(k));
  if (fresh.length) {
    const primaryId = accounts.find((a) => a.isPrimary)?.id || accountIds[0];
    events = [...events, ...seedTemplates(now, makeId, primaryId).filter((e) => fresh.includes(e.templateId) && e.startAt != null)];
  }

  return {
    version: SCHEMA_VERSION,
    settings: {
      knownTemplates: Object.keys(TEMPLATES), timeOptionsRev: TIME_OPTIONS_REV,
      displayTz: isValidTimeZone(s.displayTz) ? s.displayTz : null,
      compact: s.compact === true, collapsed, showArchived: s.showArchived === true,
      layout: sanitizeLayout(s.layout),
      accountFilter: s.accountFilter === ALL || accountIds.includes(s.accountFilter) ? s.accountFilter : ALL,
      calendarAlarmMin: isNum(s.calendarAlarmMin) && s.calendarAlarmMin >= 0 && s.calendarAlarmMin <= 1440 ? s.calendarAlarmMin : 10,
      setupDismissed: s.setupDismissed === true,
      tab: ["today", "timers", "events", "todos", "calc"].includes(s.tab) ? s.tab : "today",
      haptics: s.haptics !== false,
      showSpeed: s.showSpeed === true,
      tour: s.tour === "done" || s.tour === "skipped" ? s.tour : null,
      eduPri: ["checkins", "uptime", "finish"].includes(s.eduPri) ? s.eduPri : "checkins",
      eduFinish: hhmmToMinutes(s.eduFinish) != null ? s.eduFinish : null,
      eduBufferMin: isNum(s.eduBufferMin) && s.eduBufferMin >= 0 && s.eduBufferMin <= 15 ? Math.round(s.eduBufferMin) : 5,
      eduDismiss: Object.fromEntries(Object.entries(s.eduDismiss && typeof s.eduDismiss === "object" ? s.eduDismiss : {}).filter(([k, v]) => v === true && typeof k === "string").slice(0, 20)),
      track: Object.fromEntries(["reset", "store", "trek", "stamina", "contrib", "intel"].map((k) => [k, s.track?.[k] !== false])),
      champ: { leader: s.champ?.leader === true ? true : s.champ?.leader === false ? false : null, anchor: isThursdayStart(s.champ?.anchor) ? s.champ.anchor : null },
      sleep: ["start", "end", "target"].every((k) => hhmmToMinutes(s.sleep?.[k]) != null) ? { start: s.sleep.start, end: s.sleep.end, target: s.sleep.target } : { ...DEFAULT_SLEEP },
      timelineFilter: ["all", "game", "personal", "work"].includes(s.timelineFilter) ? s.timelineFilter : "all",
      todoView: s.todoView === "priority" ? "priority" : "list",
      todoFilter: ["all", "game", "personal", "work"].includes(s.todoFilter) ? s.todoFilter : "all",
      homeReadyOpen: s.homeReadyOpen === true,
      ministerMute: { accounts: Array.isArray(s.ministerMute?.accounts) ? [...new Set(s.ministerMute.accounts.filter((a) => typeof a === "string"))].slice(0, 50) : [], combat: s.ministerMute?.combat === true },
      minDay: /^\d{4}-\d{2}-\d{2}$/.test(s.minDay || "") ? s.minDay : null,
      energy: s.energy && /^\d{4}-\d{2}-\d{2}$/.test(s.energy.day || "") && ENERGY.includes(s.energy.level) ? { day: s.energy.day, level: s.energy.level } : null,
      taskSuggest: SUGGEST_LEVELS.includes(s.taskSuggest) ? s.taskSuggest : "balanced",
      focus: s.focus && typeof s.focus.taskId === "string" && isNum(s.focus.startedAt) && isNum(s.focus.endsAt) ? { taskId: s.focus.taskId, startedAt: s.focus.startedAt, endsAt: s.focus.endsAt } : null,
      todoHistory: s.todoHistory === true,
      todoOpen: Object.fromEntries(["game", "personal", "work"].map((k) => [k, s.todoOpen?.[k] !== false])),
      prioOpen: Object.fromEntries(["next", "plan", "quick", "later"].map((k) => [k, s.prioOpen?.[k] !== false])),
    },
    accounts, accountData,
    events,
    timeOptions: cleanTimeOptions(raw.timeOptions, s.timeOptionsRev !== TIME_OPTIONS_REV),
    reminders: cleanReminders(raw.reminders),
    friends,
    tasks: cleanTasks(raw.tasks, now),
  };
}

/** Personal/Game/Work tasks: { id, title, category, durationMs|null, start|null, end|null,
 *  accountId|null, important|null, done, createdAt }. A task with no `start` is unscheduled — it
 *  lives in the To-do lists only, never on the timeline. Kept for 7 days past its last-relevant
 *  moment (scheduled end, or creation time if it was never scheduled). */
function cleanTasks(list, now) {
  if (!Array.isArray(list)) return [];
  const cats = new Set(["game", "personal", "work"]);
  return list
    .filter((t) => t && typeof t.id === "string" && typeof t.title === "string" && t.title.trim())
    .filter((t) => {
      // scheduled tasks must have a sane, bounded range; unscheduled ones just need a title
      if (t.start == null && t.end == null) return true;
      return isNum(t.start) && isNum(t.end) && t.end > t.start && t.end - t.start <= 24 * 3600000;
    })
    .filter((t) => keepTask({ ...t, repeat: t.repeat && cleanTodoFields(t).repeat }, now))
    .slice(-300)
    .map((t) => ({
      id: t.id, title: t.title.trim().slice(0, 120),
      category: cats.has(t.category) ? t.category : "personal",
      durationMs: isNum(t.durationMs) && t.durationMs > 0 && t.durationMs <= 24 * 3600000 ? Math.round(t.durationMs) : (isNum(t.start) && isNum(t.end) ? t.end - t.start : null),
      start: isNum(t.start) ? t.start : null, end: isNum(t.end) ? t.end : null,
      accountId: typeof t.accountId === "string" ? t.accountId : null,
      important: t.important === true ? true : t.important === false ? false : null,
      notes: typeof t.notes === "string" ? t.notes.trim().slice(0, 500) : "",
      done: t.done === true, createdAt: isNum(t.createdAt) ? t.createdAt : now,
      ...cleanTodoFields(t),
    }));
}

export function loadState(storage = globalThis.localStorage, now = Date.now()) {
  try {
    const txt = storage?.getItem(STORAGE_KEY);
    if (!txt) return emptyState(now);
    return sanitizeState(JSON.parse(txt), now);
  } catch {
    return emptyState(now);
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
