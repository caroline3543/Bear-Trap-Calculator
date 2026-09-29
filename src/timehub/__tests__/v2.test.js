import { test } from "node:test";
import assert from "node:assert/strict";
import { MINUTE, HOUR, DAY, parseTimerDigits, toTimerDigits, formatSpan, localDayRange, zonedTimeToUtc, formatTime } from "../lib/time.js";
import { occurrencesBetween, eventOccurrence, overrideOccurrence, splitSeries, validateEvent, sortEvents } from "../lib/events.js";
import { bookingWindow, daySlots, validateBooking, findConflicts, bookingStatus, isCustomTime, slotContaining, MINISTER_POSITIONS } from "../lib/bookings.js";
import { planFinish, applyTraining, finishTogether, busyCamps, RESEARCH_LOCATIONS, sortResearch } from "../lib/timers.js";
import { computeReminders, reminderKey, needsAttention, suggestedBuff } from "../lib/reminders.js";
import { buildAgenda, nextUp } from "../lib/agenda.js";
import { buildICS, rruleFor, googleCalendarLink, foldLine, escapeText } from "../lib/ics.js";
import { makeAccount, normalizeAccounts, updateAccountData, deleteAccount, visibleAccountIds, matchesFilter, emptyAccountData, MAX_ACCOUNTS, ACCOUNT_COLORS } from "../lib/accounts.js";
import { sanitizeLayout, moveSection, placeSection, splitColumns, DEFAULT_LAYOUT } from "../lib/layout.js";
import { spendAttempt, contribState, setAttempts, DEFAULT_CONTRIB } from "../lib/contributions.js";
import { emptyState } from "../lib/storage.js";
import { eventFromTemplate, restoreTemplate } from "../lib/eventTemplates.js";
import { searchZones } from "../lib/cities.js";

const T0 = Date.UTC(2026, 8, 24, 6, 30); // Thu 24 Sep 2026 06:30 UTC (18:30 NZST)
let n = 0;
const mkId = () => `x${++n}`;

/* ---------- digits-only timer input ---------- */
test("parseTimerDigits: right-to-left minutes / hours / days, no seconds", () => {
  const ok = (s, d, h, m) => {
    const r = parseTimerDigits(s);
    assert.equal(r.error, undefined, s);
    assert.deepEqual([r.days, r.hours, r.minutes], [d, h, m], s);
    assert.equal(r.ms, d * DAY + h * HOUR + m * MINUTE);
  };
  ok("45", 0, 0, 45);
  ok("928", 0, 9, 28);
  ok("1305", 0, 13, 5);
  ok("10000", 1, 0, 0);
  ok("20928", 2, 9, 28); // game: 2d 09:28:09
  ok("32144", 3, 21, 44); // game: 3d 21:44:46
  ok("0928", 0, 9, 28);
  ok(" 2 09 28 ", 2, 9, 28);
  assert.equal(parseTimerDigits("125300").error, "hours");
  assert.equal(parseTimerDigits("975").error, "minutes");
  assert.equal(parseTimerDigits("2400").error, "hours");
  assert.equal(parseTimerDigits("0").error, "zero");
  assert.equal(parseTimerDigits("").error, "empty");
  assert.equal(parseTimerDigits("2d 09:28").error, "chars");
  assert.equal(parseTimerDigits("450000").long, true); // 45 days → check-this warning
  assert.equal(parseTimerDigits("20928").long, false);
  for (const s of ["45", "928", "20928", "32144", "10000"]) assert.equal(toTimerDigits(parseTimerDigits(s).ms), s);
  assert.equal(formatSpan(parseTimerDigits("20928").ms, "en"), "2d 9h 28m");
  assert.equal(formatSpan(72 * HOUR, "en"), "3d");
});

test("local day ranges handle NZ daylight saving (23-hour day) and Auckland vs UTC dates", () => {
  const dst = localDayRange(Date.UTC(2026, 8, 26, 20), "Pacific/Auckland"); // Sun 27 Sep NZ
  assert.equal(dst.end - dst.start, 23 * HOUR);
  const normal = localDayRange(T0, "Pacific/Auckland");
  assert.equal(normal.end - normal.start, 24 * HOUR);
  assert.equal(normal.start, Date.UTC(2026, 8, 23, 12)); // 24 Sep 00:00 NZST
  assert.equal(zonedTimeToUtc(2026, 9, 24, 22, 0, "Pacific/Auckland"), Date.UTC(2026, 8, 24, 10));
  const lon = localDayRange(Date.UTC(2026, 9, 25, 12), "Europe/London"); // UK clocks go back
  assert.equal(lon.end - lon.start, 25 * HOUR);
});

/* ---------- recurrence ---------- */
const ev = (over) => ({ id: "e", name: "E", startAt: T0, durationMs: 30 * MINUTE, recurrence: { type: "once" }, overrides: {}, enabled: true, createdAt: 0, ...over });

test("every-2-days (Bear Trap) repeats in exact UTC across NZ/US/UK DST changes", () => {
  const bt = ev({ startAt: Date.UTC(2026, 8, 20, 12), recurrence: { type: "everyNDays", n: 2 } });
  const occ = occurrencesBetween(bt, Date.UTC(2026, 8, 20), Date.UTC(2026, 10, 5));
  assert.ok(occ.every((o, i) => i === 0 || o.start - occ[i - 1].start === 2 * DAY));
  assert.ok(occ.every((o) => new Date(o.start).getUTCHours() === 12));
  // local display shifts by an hour across NZ DST — the game time doesn't
  assert.equal(formatTime(Date.UTC(2026, 8, 26, 12), "Pacific/Auckland", "en"), "12:00\u00A0AM");
  assert.equal(formatTime(Date.UTC(2026, 8, 28, 12), "Pacific/Auckland", "en"), "1:00\u00A0AM");
  assert.equal(formatTime(Date.UTC(2026, 8, 28, 12), "UTC", "en"), "12:00"); // UTC stays 24-hour
  const o = eventOccurrence(bt, Date.UTC(2026, 8, 21, 5));
  assert.equal(o.start, Date.UTC(2026, 8, 22, 12));
  assert.equal(o.status, "upcoming");
});

test("daily, weekly (weekdays), every 2 weeks and once", () => {
  const daily = ev({ startAt: Date.UTC(2026, 0, 1), durationMs: null, recurrence: { type: "daily" } });
  assert.equal(eventOccurrence(daily, T0).start, Date.UTC(2026, 8, 25));
  const wk = ev({ startAt: Date.UTC(2026, 8, 1, 19), recurrence: { type: "weekly", weekdays: [1, 4] } }); // Mon, Thu 19:00
  const starts = occurrencesBetween(wk, Date.UTC(2026, 8, 21), Date.UTC(2026, 8, 28)).map((o) => new Date(o.start).getUTCDay());
  assert.deepEqual(starts, [1, 4]);
  const fd = ev({ startAt: Date.UTC(2026, 8, 13, 19), durationMs: HOUR, recurrence: { type: "everyNWeeks", n: 2 } });
  assert.equal(eventOccurrence(fd, T0).start, Date.UTC(2026, 8, 27, 19));
  assert.equal(eventOccurrence(ev({ startAt: T0 - HOUR }), T0).status, "completed");
  assert.equal(eventOccurrence(ev({ startAt: null }), T0).status, "unset");
  assert.equal(eventOccurrence(ev({ enabled: false }), T0).status, "disabled");
  assert.deepEqual(validateEvent({ templateId: "bear_trap_1", startAt: null, recurrence: { type: "everyNDays", n: 2 } }), {});
  assert.equal(validateEvent({ name: "x", startAt: T0, recurrence: { type: "weekly", weekdays: [] } }).recurrence, "errWeekdays");
  // unset templates sort after scheduled ones
  const ids = sortEvents([ev({ id: "u", startAt: null }), ev({ id: "s", startAt: T0 + HOUR })], T0).map((r) => r.ev.id);
  assert.deepEqual(ids, ["s", "u"]);
});

test("editing one occurrence vs this-and-future vs whole schedule", () => {
  const bt = ev({ startAt: Date.UTC(2026, 8, 20, 12), recurrence: { type: "everyNDays", n: 2 } });
  const k = Date.UTC(2026, 8, 24, 12);
  const moved = overrideOccurrence(bt, k, { startAt: k + HOUR });
  const occ = occurrencesBetween(moved, Date.UTC(2026, 8, 22), Date.UTC(2026, 8, 27));
  assert.deepEqual(occ.map((o) => o.start), [Date.UTC(2026, 8, 22, 12), k + HOUR, Date.UTC(2026, 8, 26, 12)]);
  assert.equal(occ[1].moved, true);
  const cancelled = overrideOccurrence(bt, k, { cancelled: true });
  assert.equal(occurrencesBetween(cancelled, k - HOUR, k + HOUR).length, 0);
  const [old, next] = splitSeries(bt, k, { startAt: k + 2 * HOUR }, "new");
  assert.equal(occurrencesBetween(old, k - 1, Date.UTC(2026, 9, 30)).length, 0);
  assert.deepEqual(occurrencesBetween(old, Date.UTC(2026, 8, 20), k).map((o) => o.start).at(-1), Date.UTC(2026, 8, 22, 12));
  assert.equal(next.id, "new");
  assert.equal(occurrencesBetween(next, k, k + 5 * DAY)[0].start, k + 2 * HOUR);
});

test("templates: no invented time, restore default keeps the user's time", () => {
  const e = eventFromTemplate("bear_trap_1", { id: "t", now: T0 });
  assert.equal(e.startAt, null);
  assert.equal(e.combat, true);
  const edited = { ...e, startAt: T0, recurrence: { type: "daily" }, enabled: false };
  const r = restoreTemplate(edited);
  assert.deepEqual(r.recurrence, { type: "everyNDays", n: 2 });
  assert.equal(r.startAt, T0);
  assert.equal(r.enabled, true);
  assert.equal(eventFromTemplate("daily_reset", { id: "d", now: T0 }).startAt, Date.UTC(2026, 8, 24));
});

/* ---------- minister bookings ---------- */
test("booking window is today + tomorrow in UTC, 30-minute slots, started slots closed", () => {
  const now = Date.UTC(2026, 8, 23, 6, 34); // like the screenshot
  const { from, to } = bookingWindow(now);
  assert.equal(from, Date.UTC(2026, 8, 23));
  assert.equal(to, Date.UTC(2026, 8, 25));
  const today = daySlots(from, now);
  assert.equal(today.length, 48);
  assert.equal(today.find((s) => s.open).start, Date.UTC(2026, 8, 23, 7)); // first open slot 07:00, as in-game
  assert.ok(daySlots(from + DAY, now).every((s) => s.open));
  assert.ok(daySlots(from + 2 * DAY, now).every((s) => !s.open));
  const last = daySlots(from + DAY, now).at(-1);
  assert.equal(last.end, to); // 23:30–00:00 slot ends at the window edge
  const ok = { position: "minister_defense", startAt: Date.UTC(2026, 8, 24, 23, 30) };
  assert.deepEqual(validateBooking(ok, now), {});
  assert.equal(validateBooking({ ...ok, startAt: Date.UTC(2026, 8, 25, 0) }, now).startAt, "errSlotWindow");
  assert.equal(validateBooking({ ...ok, startAt: Date.UTC(2026, 8, 24, 12, 15) }, now).startAt, "errSlot");
  assert.equal(validateBooking({ ...ok, startAt: Date.UTC(2026, 8, 23, 6, 30) }, now).startAt, "errSlotPast");
  assert.equal(validateBooking({ ...ok, position: "king" }, now).position, "errPosition");
  assert.ok(MINISTER_POSITIONS.includes("minister_strategy"));
});

test("UTC day boundary, not Auckland midnight", () => {
  // 23:00 NZ on 24 Sep is 11:00 UTC on 24 Sep → still "today" in UTC; 25 Sep UTC is "tomorrow"
  const now = Date.UTC(2026, 8, 24, 11);
  assert.equal(bookingWindow(now).from, Date.UTC(2026, 8, 24));
  assert.equal(slotContaining(Date.UTC(2026, 8, 24, 19, 10)), Date.UTC(2026, 8, 24, 19));
});

test("booking conflicts, expiry and custom-time legacy bookings", () => {
  const s = Date.UTC(2026, 8, 24, 19);
  const list = [{ id: "a", position: "minister_strategy", startAt: s }, { id: "b", position: "minister_defense", startAt: s + 30 * MINUTE }];
  const c1 = findConflicts({ id: "n", position: "minister_strategy", startAt: s }, list);
  assert.deepEqual(c1.duplicates.map((b) => b.id), ["a"]);
  const c2 = findConflicts({ id: "n", position: "vice_president", startAt: s }, list);
  assert.deepEqual([c2.duplicates.length, c2.otherPositions.map((b) => b.id)], [0, ["a"]]);
  assert.equal(findConflicts({ id: "a", position: "minister_strategy", startAt: s }, list).duplicates.length, 0);
  assert.equal(bookingStatus(list[0], s + 30 * MINUTE), "expired");
  assert.equal(isCustomTime({ startAt: s + 12 * MINUTE }), true);
});

/* ---------- training & research ---------- */
test("shared vs individual camp durations, one timer per camp, finish-together groups", () => {
  const existing = [{ id: "old", kind: "training", category: "lancer_camp", endAt: T0 + HOUR, startedAt: T0 }, { id: "r", kind: "research", category: "experts", endAt: T0 + DAY, startedAt: T0 }];
  const d = parseTimerDigits("928").ms;
  const shared = applyTraining(existing, ["infantry_camp", "lancer_camp", "marksman_camp"].map((camp) => ({ camp, durationMs: d })), T0, mkId);
  assert.equal(shared.filter((t) => t.kind === "training").length, 3);
  assert.ok(!shared.some((t) => t.id === "old"));
  assert.ok(shared.some((t) => t.id === "r"));
  const groups = finishTogether(shared.filter((t) => t.kind === "training"));
  assert.equal(groups.length, 1);
  assert.equal(groups[0].timers.length, 3);
  const mixed = applyTraining([], [{ camp: "infantry_camp", durationMs: 9 * MINUTE }, { camp: "lancer_camp", durationMs: parseTimerDigits("215").ms }, { camp: "marksman_camp", durationMs: 9 * MINUTE }], T0, mkId);
  assert.equal(finishTogether(mixed)[0].timers.length, 2);
  assert.deepEqual(busyCamps(existing, ["lancer_camp", "infantry_camp"], T0), ["lancer_camp"]);
  const long = applyTraining([], [{ camp: "infantry_camp", durationMs: parseTimerDigits("30000").ms }], T0, mkId)[0];
  assert.equal(long.endAt - T0, 3 * DAY);
  assert.deepEqual(RESEARCH_LOCATIONS, ["research_center", "dawn_academy", "war_academy"]);
});

test("finish-at planner: fits max, exceeds max, past target", () => {
  const target = zonedTimeToUtc(2026, 9, 24, 22, 0, "Pacific/Auckland"); // 22:00 NZ = 10:00 UTC
  const now = target - (6 * HOUR + 12 * MINUTE + 30 * 1000);
  const p = planFinish(target, now, 8 * HOUR);
  assert.deepEqual([p.fitsMax, p.trainFor], [true, 6 * HOUR + 12 * MINUTE]);
  const q = planFinish(target, now, 5 * HOUR + 40 * MINUTE);
  assert.equal(q.fitsMax, false);
  assert.equal(q.startAt, target - (5 * HOUR + 40 * MINUTE));
  assert.equal(formatTime(q.startAt, "Pacific/Auckland", "en"), "4:20\u00A0PM");
  assert.equal(planFinish(target, target + 1, 8 * HOUR).error, "errPlanPast");
  assert.equal(planFinish(target, now, null).fitsMax, true); // no max saved → just the time needed
});

/* ---------- accounts ---------- */
test("accounts: colours, primary, filter, isolated writes, delete", () => {
  let accs = [];
  accs.push(makeAccount({ id: "A", name: "Main", type: "main", isPrimary: true }, accs));
  accs.push(makeAccount({ id: "B", name: "Farm 1", type: "farm" }, accs));
  accs.push(makeAccount({ id: "C", name: "A very long farm account name that wraps", type: "farm", isPrimary: true }, accs));
  accs = normalizeAccounts(accs);
  assert.equal(accs.filter((a) => a.isPrimary).length, 1);
  assert.equal(new Set(accs.map((a) => a.color)).size, 3);
  const state = { ...emptyState(T0, mkId), accounts: accs, accountData: { A: emptyAccountData(), B: emptyAccountData(), C: emptyAccountData() } };
  const before = state.accountData.B;
  const next = updateAccountData(state, "A", (d) => ({ ...d, bookings: [{ id: "k", position: "vice_president", startAt: T0 }] }));
  assert.equal(next.accountData.B, before); // untouched by reference
  assert.equal(next.accountData.A.bookings.length, 1);
  assert.equal(updateAccountData(state, "ghost", (d) => d), state);
  assert.deepEqual(visibleAccountIds(accs, "B"), ["B"]);
  assert.deepEqual(visibleAccountIds(accs, "all"), ["A", "B", "C"]);
  assert.equal(matchesFilter(null, accs, "B"), true);
  assert.equal(matchesFilter("A", accs, "B"), false);
  const withEv = { ...next, events: [...next.events, { id: "farmEv", accountId: "B" }], reminders: { "e|1|B": { state: "booked" }, "e|1|A": { state: "booked" } } };
  const del = deleteAccount(withEv, "B");
  assert.deepEqual(del.accounts.map((a) => a.id), ["A", "C"]);
  assert.equal(del.accountData.B, undefined);
  assert.ok(!del.events.some((e) => e.id === "farmEv"));
  assert.deepEqual(Object.keys(del.reminders), ["e|1|A"]);
  const single = { ...state, accounts: [accs[0]] };
  assert.equal(deleteAccount(single, "A"), single); // never delete the last one
});

/* ---------- layout ---------- */
test("section order: move, drag place, sanitise, reset, columns", () => {
  let l = moveSection(DEFAULT_LAYOUT, "friends", -1);
  assert.equal(l.indexOf("friends"), DEFAULT_LAYOUT.indexOf("friends") - 1);
  assert.deepEqual(moveSection(l, l[0], -1), l);
  l = placeSection(l, "contrib", 0);
  assert.equal(l[0], "contrib");
  const cleaned = sanitizeLayout(["contrib", "zzz", "contrib"]);
  assert.deepEqual([...cleaned].sort(), [...DEFAULT_LAYOUT].sort());
  const custom = placeSection(DEFAULT_LAYOUT, "friends", 0);
  assert.deepEqual(sanitizeLayout(custom), custom); // a complete saved order is kept as-is
  assert.deepEqual(sanitizeLayout(undefined), DEFAULT_LAYOUT);
  const [left, right] = splitColumns(["a", "b", "c", "d", "e"]);
  assert.deepEqual([left, right], [["a", "c", "e"], ["b", "d"]]);
});

/* ---------- reminders ---------- */
function reminderState(now) {
  const s = emptyState(now, mkId);
  s.accounts = normalizeAccounts([makeAccount({ id: "A", name: "Main", isPrimary: true }, []), makeAccount({ id: "B", name: "Farm", color: 2 }, [])]);
  s.accountData = { A: emptyAccountData(), B: emptyAccountData() };
  const bt = eventFromTemplate("bear_trap_1", { id: "bt1", now });
  bt.startAt = Date.UTC(2026, 8, 24, 19); // shared, every 2 days
  s.events.push(bt);
  return { s, bt };
}

test("reminders appear at lead time only while bookable, per account", () => {
  const { s, bt } = reminderState(T0);
  const early = computeReminders(s, Date.UTC(2026, 8, 23, 18), ["A", "B"]); // 25h before → not yet
  assert.equal(early.filter((r) => r.ev.id === bt.id).length, 0);
  const now = Date.UTC(2026, 8, 24, 6);
  const rs = computeReminders(s, now, ["A", "B"]).filter((r) => r.ev.id === bt.id);
  assert.deepEqual(rs.map((r) => [r.accountId, r.status]), [["A", "open"], ["B", "open"]]);
  assert.equal(needsAttention(rs).length, 2);
  // a covering Strategy booking for A changes A only
  s.accountData.A.bookings.push({ id: "k", position: "minister_strategy", startAt: Date.UTC(2026, 8, 24, 19) });
  const rs2 = computeReminders(s, now, ["A", "B"]).filter((r) => r.ev.id === bt.id);
  assert.deepEqual(rs2.map((r) => r.status), ["covered", "open"]);
  assert.equal(suggestedBuff(rs2[0].booking), "strategy");
  // answers are saved per occurrence × account
  s.reminders[reminderKey(bt.id, bt.startAt, "B")] = { state: "booked", buff: "unsure" };
  const rs3 = computeReminders(s, now, ["A", "B"]).filter((r) => r.ev.id === bt.id);
  assert.equal(rs3[1].status, "unsure");
  assert.equal(needsAttention(rs3).length, 1);
  s.reminders[reminderKey(bt.id, bt.startAt, "B")] = { state: "booked", buff: "defense" };
  const nextOcc = computeReminders(s, Date.UTC(2026, 8, 26, 6), ["B"]).filter((r) => r.ev.id === bt.id);
  assert.equal(nextOcc[0].status, "open"); // not copied to the next Bear Trap
  // dismissed / hidden / after start
  s.reminders[reminderKey(bt.id, bt.startAt, "A")] = { state: "dismissed" };
  assert.equal(computeReminders(s, now, ["A"]).find((r) => r.ev.id === bt.id).status, "dismissed");
  assert.equal(computeReminders(s, Date.UTC(2026, 8, 24, 19, 1), ["A", "B"]).filter((r) => r.ev.id === bt.id && r.occ.start === bt.startAt).length, 0);
  bt.reminderHidden = true;
  assert.equal(computeReminders(s, now, ["A", "B"]).filter((r) => r.ev.id === bt.id).length, 0);
});

test("reminder hidden when the covering slot has already started and nothing is booked", () => {
  const { s, bt } = reminderState(T0);
  bt.startAt = Date.UTC(2026, 8, 24, 19, 10);
  assert.equal(computeReminders(s, Date.UTC(2026, 8, 24, 19, 5), ["A"]).filter((r) => r.ev.id === bt.id).length, 0);
});

/* ---------- contributions: spend all ---------- */
test("spend all keeps the refresh phase / respects the when-full rule", () => {
  let st = setAttempts(DEFAULT_CONTRIB, T0, 13);
  st = spendAttempt(st, T0 + 4 * MINUTE, contribState(st, T0 + 4 * MINUTE).count);
  assert.equal(contribState(st, T0 + 4 * MINUTE).count, 0);
  assert.equal(contribState(st, T0 + 4 * MINUTE).nextAt, T0 + 10 * MINUTE);
  const full = setAttempts(DEFAULT_CONTRIB, T0, 20);
  const p = spendAttempt(full, T0 + 3 * MINUTE, 20);
  assert.equal(contribState(p, T0 + 3 * MINUTE).nextAt, T0 + 13 * MINUTE);
  const c = spendAttempt({ ...setAttempts(DEFAULT_CONTRIB, T0, 19), whenFull: "continue" }, T0 + 17 * MINUTE, 20);
  assert.equal(contribState(c, T0 + 17 * MINUTE).nextAt, T0 + 20 * MINUTE);
});

/* ---------- agenda + calendar ---------- */
test("today's agenda mixes every kind, follows the account filter and the local (not UTC) day", () => {
  const { s, bt } = reminderState(T0);
  s.accountData.A.timers.push({ id: "t", kind: "training", category: "infantry_camp", startedAt: T0, endAt: T0 + 2 * HOUR });
  s.accountData.B.timers.push({ id: "r", kind: "research", category: "dawn_academy", startedAt: T0, endAt: T0 + 3 * HOUR });
  s.accountData.A.bookings.push({ id: "k", position: "vice_president", startAt: Date.UTC(2026, 8, 24, 8) });
  s.accountData.A.contrib = setAttempts(DEFAULT_CONTRIB, T0, 18);
  s.accountData.A.plans = [{ id: "p", camps: ["lancer_camp"], startAt: T0 + HOUR, target: T0 + 6 * HOUR }];
  const day = localDayRange(T0, "Pacific/Auckland"); // 24 Sep NZ = 23 Sep 12:00 → 24 Sep 12:00 UTC
  const all = buildAgenda(s, day.start, day.end, ["A", "B"], T0);
  const kinds = new Set(all.map((i) => i.kind));
  for (const k of ["event", "booking", "training", "research", "contrib", "plan"]) assert.ok(kinds.has(k), k);
  assert.ok(!all.some((i) => i.ref?.ev?.id === bt.id)); // 19:00 UTC is 25 Sep in NZ → not today
  const onlyA = buildAgenda(s, day.start, day.end, ["A"], T0);
  assert.ok(!onlyA.some((i) => i.accountId === "B"));
  assert.ok(onlyA.every((x, i) => i === 0 || onlyA[i - 1].start <= x.start));
  const { primary } = nextUp(all, T0);
  assert.equal(primary.item.kind, "plan"); // contributions are a status widget, never "next up"
  assert.equal(primary.phase, "upcoming");
});

test(".ics output is valid and Google links are encoded", () => {
  const text = buildICS([
    { uid: "ev:1:2", start: Date.UTC(2026, 8, 24, 19), end: Date.UTC(2026, 8, 24, 19, 30), title: "Bear Trap, Main; test", description: "Line 1\nLine 2", alarmMin: 10, rrule: rruleFor({ type: "everyNDays", n: 2 }) },
    { uid: "tm:9", start: Date.UTC(2026, 8, 25, 3), title: "Marksman camp ready (Main) — " + "ü".repeat(60) },
  ], { now: T0 });
  assert.ok(text.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(text.endsWith("END:VCALENDAR\r\n"));
  assert.ok(!/[^\r]\n/.test(text));
  assert.match(text, /DTSTART:20260924T190000Z/);
  assert.match(text, /RRULE:FREQ=DAILY;INTERVAL=2/);
  assert.match(text, /SUMMARY:Bear Trap\\, Main\\; test/);
  assert.match(text, /DESCRIPTION:Line 1\\nLine 2/);
  assert.match(text, /TRIGGER:-PT10M/);
  assert.equal((text.match(/BEGIN:VEVENT/g) || []).length, 2);
  for (const line of text.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  assert.equal(rruleFor({ type: "everyNWeeks", n: 2 }), "FREQ=WEEKLY;INTERVAL=2");
  assert.equal(rruleFor({ type: "once" }), null);
  assert.equal(escapeText("a,b;c\\"), "a\\,b\\;c\\\\");
  assert.equal(foldLine("x".repeat(80)).split("\r\n")[1], " " + "x".repeat(5));
  const g = googleCalendarLink({ start: Date.UTC(2026, 8, 24, 19), end: Date.UTC(2026, 8, 24, 19, 30), title: "Bear Trap & Foundry" });
  assert.match(g, /dates=20260924T190000Z%2F20260924T193000Z/);
  assert.match(g, /text=Bear\+Trap\+%26\+Foundry/);
});

/* ---------- cities ---------- */
test("city search: Palestine, Belarus and the rest of Europe; hidden zone ids", () => {
  assert.equal(searchZones("minsk")[0].tz, "Europe/Minsk");
  assert.ok(searchZones("palest").length >= 5);
  assert.ok(searchZones("gaza").some((r) => r.tz === "Asia/Gaza"));
  assert.equal(searchZones("israel").length, 0);
  assert.ok(!searchZones("jerusalem").some((r) => r.tz === "Asia/Jerusalem"));
  for (const c of ["Belarus", "Moldova", "Lithuania", "Latvia", "Estonia", "Czechia", "Slovakia", "Hungary", "Serbia", "Albania", "Iceland", "Georgia"]) {
    assert.ok(searchZones(c).length, c);
  }
});

/* ---------- registration time lists (Caroline, 24 Sep 2026) ---------- */
test("battle-time choices: Foundry/Canyon and Frostfire Mine", async () => {
  const { DEFAULT_TIME_OPTIONS, TEMPLATES } = await import("../lib/eventTemplates.js");
  assert.deepEqual(DEFAULT_TIME_OPTIONS.foundry, ["02:00", "12:00", "14:00", "19:00", "21:00"]);
  assert.deepEqual(DEFAULT_TIME_OPTIONS.canyon, DEFAULT_TIME_OPTIONS.foundry);
  assert.deepEqual(DEFAULT_TIME_OPTIONS.frostfire, ["02:00", "05:00", "11:00", "14:00", "16:00", "18:00", "21:00"]);
  const ff = TEMPLATES.frostfire_mine;
  assert.deepEqual([ff.durationMs, ff.recurrence, ff.combat, ff.timeOptions], [30 * MINUTE, { type: "everyNWeeks", n: 2 }, true, "frostfire"]);
  const e = eventFromTemplate("frostfire_mine", { id: "f", now: T0 });
  assert.equal(e.startAt, null); // day/time still chosen by the user
});

test("old unset template placeholders are dropped; new times merge into saved lists once", async () => {
  const { sanitizeState } = await import("../lib/storage.js");
  const old = emptyState(T0, mkId);
  old.events.push({ ...eventFromTemplate("foundry", { id: "placeholder", now: T0 }), startAt: null });
  old.events.push({ ...eventFromTemplate("bear_trap_1", { id: "kept", now: T0 }), startAt: T0 });
  delete old.settings.knownTemplates;
  delete old.settings.timeOptionsRev;
  old.timeOptions = { foundry: ["02:00", "19:00", "23:30"], canyon: [] }; // 23:30 = user-added, kept
  const s = sanitizeState(JSON.parse(JSON.stringify(old)), T0, mkId);
  assert.equal(s.events.some((e) => e.id === "placeholder"), false);
  assert.equal(s.events.some((e) => e.id === "kept"), true);
  assert.equal(s.events.some((e) => e.templateId === "frostfire_mine"), false); // never auto-added without a time
  assert.deepEqual(s.timeOptions.foundry, ["02:00", "12:00", "14:00", "19:00", "21:00", "23:30"]);
  assert.deepEqual(s.timeOptions.canyon, ["02:00", "12:00", "14:00", "19:00", "21:00"]);
  assert.equal(s.timeOptions.frostfire.length, 7);
  // after that, deleting a time sticks
  s.timeOptions.foundry = ["19:00"];
  const again = sanitizeState(JSON.parse(JSON.stringify(s)), T0, mkId);
  assert.deepEqual(again.timeOptions.foundry, ["19:00"]);
});

/* ---------- round 3: two-field durations, lifecycle hero, layout ---------- */
import { parseDaysTime, splitDaysTime, tidyHHMM } from "../lib/time.js";
import { layoutRuns, FULL_WIDTH } from "../lib/layout.js";

test("days + HH:MM duration fields", () => {
  const ok = (d, h, ms) => assert.equal(parseDaysTime(d, h).ms, ms, `${d} ${h}`);
  ok("2", "09:28", 2 * DAY + 9 * HOUR + 28 * MINUTE);
  ok("", "09:28", 9 * HOUR + 28 * MINUTE);
  ok("3", "", 3 * DAY);
  ok("0", "0045", 45 * MINUTE);
  ok("", "928", 9 * HOUR + 28 * MINUTE);
  assert.equal(parseDaysTime("", "24:00").error, "hhmm");
  assert.equal(parseDaysTime("", "09:75").error, "hhmm");
  assert.equal(parseDaysTime("x", "09:00").error, "days");
  assert.equal(parseDaysTime("", "00:00").error, "zero");
  assert.equal(parseDaysTime("", "").error, "empty");
  assert.equal(parseDaysTime("45", "00:00").long, true);
  assert.deepEqual(splitDaysTime(2 * DAY + 9 * HOUR + 28 * MINUTE + 40000), { days: "2", hhmm: "09:28" });
  assert.deepEqual(splitDaysTime(45 * MINUTE), { days: "", hhmm: "00:45" });
  assert.equal(tidyHHMM("0928"), "09:28");
  assert.equal(tidyHHMM("9:2a8"), "9:28");
});

test("Next up: finished items never show, an active event takes the hero, contributions excluded", () => {
  const items = [
    { id: "done", kind: "training", start: T0 - HOUR, end: null, status: "done" },
    { id: "bt", kind: "event", start: T0 - 12 * MINUTE, end: T0 + 18 * MINUTE, status: "now" },
    { id: "ct", kind: "contrib", start: T0 + MINUTE, end: null, status: "upcoming" },
    { id: "tr", kind: "training", start: T0 + 2 * HOUR, end: null, status: "upcoming" },
    { id: "rs", kind: "research", start: T0 + 3 * HOUR, end: null, status: "upcoming" },
  ];
  const a = nextUp(items, T0);
  assert.deepEqual([a.primary.item.id, a.primary.phase, a.then.id], ["bt", "active", "tr"]);
  const b = nextUp(items.filter((i) => i.id !== "bt"), T0);
  assert.deepEqual([b.primary.item.id, b.primary.phase, b.then.id], ["tr", "upcoming", "rs"]);
  assert.equal(nextUp([items[0]], T0).primary, null);
});

test("layout: Next up is gone (old saves load fine); Schedule is a movable full-width section", () => {
  const old = sanitizeLayout(["nextup", "today", "bookings", "events", "training", "research", "contrib", "friends", "history"]);
  assert.ok(!old.includes("nextup"));
  assert.deepEqual(sanitizeLayout(["bookings", "events", "training", "research", "contrib", "friends", "history"]).slice(0, 2), ["today", "bookings"]);
  const runs = layoutRuns(["bookings", "events", "today", "training"]);
  assert.deepEqual(runs.map((r) => r.type), ["cols", "full", "cols"]);
  assert.ok(FULL_WIDTH.has("today"));
});

/* ---------- round 4: Helios ---------- */
import { campMaxFor, hasHelios } from "../lib/timers.js";

test("Helios: separate full-batch times per class, planner and timers use the troop type", async () => {
  const { sanitizeState } = await import("../lib/storage.js");
  const st = emptyState(T0, mkId);
  st.accountData.A.campMax = { infantry_camp: 5 * HOUR, lancer_camp: 5 * HOUR + 40 * MINUTE, marksman_camp: 6 * HOUR };
  st.accountData.A.helios = { classes: ["marksman_camp", "bogus"], max: { marksman_camp: 8 * HOUR, lancer_camp: 7 * HOUR } };
  const s = sanitizeState(JSON.parse(JSON.stringify(st)), T0, mkId);
  const d = s.accountData.A;
  assert.deepEqual(d.helios.classes, ["marksman_camp"]);
  assert.equal(hasHelios(d, "marksman_camp"), true);
  assert.equal(hasHelios(d, "lancer_camp"), false);
  assert.equal(campMaxFor(d, "marksman_camp"), 6 * HOUR);
  assert.equal(campMaxFor(d, "marksman_camp", "helios"), 8 * HOUR);
  assert.equal(campMaxFor(d, "lancer_camp", "helios"), null); // class not ticked
  const target = T0 + 10 * HOUR;
  assert.equal(planFinish(target, T0, campMaxFor(d, "marksman_camp")).startAt, target - 6 * HOUR);
  assert.equal(planFinish(target, T0, campMaxFor(d, "marksman_camp", "helios")).startAt, target - 8 * HOUR);
  const timers = applyTraining([], [{ camp: "marksman_camp", durationMs: HOUR, troop: "helios" }, { camp: "infantry_camp", durationMs: HOUR }], T0, mkId);
  assert.equal(timers[0].troop, "helios");
  assert.equal(timers[1].troop, undefined);
  const round = sanitizeState(JSON.parse(JSON.stringify({ ...s, accountData: { A: { ...d, timers } } })), T0, mkId);
  assert.equal(round.accountData.A.timers.find((x) => x.category === "marksman_camp").troop, "helios");
});

test("Experts research is removed; saved Experts timers are dropped, others kept", async () => {
  const { sanitizeState } = await import("../lib/storage.js");
  const st = emptyState(T0, mkId);
  st.accountData.A.timers = [
    { id: "x", kind: "research", category: "experts", startedAt: T0, endAt: T0 + HOUR },
    { id: "w", kind: "research", category: "war_academy", startedAt: T0, endAt: T0 + HOUR },
  ];
  const s = sanitizeState(JSON.parse(JSON.stringify(st)), T0, mkId);
  assert.deepEqual(s.accountData.A.timers.map((t) => t.id), ["w"]);
});

/* ---------- redesign: Today screen logic + share ---------- */
import { idleCamps, rememberEnd, splitNow, stillRunning, weekStrip } from "../lib/today.js";
import { shareText, shareRows } from "../lib/share.js";

test("idle camps: from a finished timer or a remembered end; 15-minute grace; full batch by troop", () => {
  const d = { ...emptyAccountData(), campMax: { infantry_camp: 5 * HOUR, lancer_camp: 6 * HOUR, marksman_camp: 6 * HOUR }, helios: { classes: ["marksman_camp"], max: { marksman_camp: 8 * HOUR } } };
  assert.equal(idleCamps(d, T0), null); // no history → nothing claimed
  d.timers = [
    { id: "a", kind: "training", category: "infantry_camp", startedAt: T0 - 5 * HOUR, endAt: T0 - 130 * MINUTE },
    { id: "b", kind: "training", category: "lancer_camp", startedAt: T0, endAt: T0 + HOUR },
    { id: "c", kind: "training", category: "marksman_camp", troop: "helios", startedAt: T0 - 9 * HOUR, endAt: T0 - 10 * MINUTE },
  ];
  const r = idleCamps(d, T0);
  assert.deepEqual(r.camps.map((c) => c.camp), ["infantry_camp"]); // marksman only 10 min idle, lancer running
  assert.equal(T0 - r.since, 130 * MINUTE);
  assert.equal(r.fullBatchMs, 5 * HOUR);
  const later = idleCamps(d, T0 + HOUR + 20 * MINUTE);
  assert.deepEqual(later.camps.map((c) => [c.camp, c.troop]), [["infantry_camp", "normal"], ["lancer_camp", "normal"], ["marksman_camp", "helios"]]);
  assert.equal(later.fullBatchMs, 8 * HOUR);
  // dismissed timer: remembered end keeps the idle clock
  const gone = rememberEnd({ ...d, timers: d.timers.filter((t) => t.id !== "a") }, d.timers[0], T0);
  assert.equal(gone.lastEnded.infantry_camp, T0 - 130 * MINUTE);
  assert.equal(idleCamps(gone, T0).camps[0].camp, "infantry_camp");
  assert.equal(rememberEnd(gone, { kind: "research", category: "war_academy", endAt: T0 }, T0), gone);
});

test("Now split: finished items fold away, everything else stays in order after the marker", () => {
  const items = [{ id: 1, status: "done" }, { id: 2, status: "now" }, { id: 3, status: "upcoming" }, { id: 4, status: "done" }];
  const { past, rest } = splitNow(items);
  assert.deepEqual(past.map((i) => i.id), [1, 4]);
  assert.deepEqual(rest.map((i) => i.id), [2, 3]);
});

test("still running after tonight: past the day's end only; camps finishing together share a row", () => {
  const s = emptyState(T0, mkId);
  s.accounts = normalizeAccounts([makeAccount({ id: "A", name: "Main", isPrimary: true }, []), makeAccount({ id: "B", name: "Farm", color: 2 }, [])]);
  s.accountData = { A: emptyAccountData(), B: emptyAccountData() };
  const end = T0 + 5 * HOUR;
  s.accountData.A.timers = [{ id: "w", kind: "research", category: "war_academy", endAt: end + HOUR }, { id: "early", kind: "research", category: "research_center", endAt: end - HOUR }];
  s.accountData.B.timers = ["infantry_camp", "lancer_camp", "marksman_camp"].map((c, i) => ({ id: c, kind: "training", category: c, endAt: end + 2 * HOUR + i * 1000 }));
  const rows = stillRunning(s, ["A", "B"], end);
  assert.deepEqual(rows.map((r) => [r.acc, r.kind, r.camps.length]), [["A", "research", 1], ["B", "training", 3]]);
  assert.deepEqual(stillRunning(s, ["A"], end).length, 1);
});

test("week strip: dots on the LOCAL day, across NZ daylight saving (Foundry Sat 19:00 UTC → Sun)", () => {
  const now = Date.UTC(2026, 8, 24, 7, 43); // Thu 7:43 PM NZST
  const s = emptyState(now, mkId);
  const bt = { ...eventFromTemplate("bear_trap_1", { id: "bt", now }), startAt: Date.UTC(2026, 8, 24, 9, 30) };
  const fd = { ...eventFromTemplate("foundry", { id: "fd", now, accountId: "A" }), startAt: Date.UTC(2026, 8, 26, 19) };
  const ff = { ...eventFromTemplate("frostfire_mine", { id: "ff", now }), startAt: Date.UTC(2026, 8, 29, 14) };
  s.events.push(bt, fd, ff);
  const w = weekStrip(s, ["A"], now, "Pacific/Auckland");
  const byDay = w.map((d) => d.dots.join("+"));
  assert.deepEqual(byDay, ["bear", "", "bear", "foundry", "bear", "", "bear+frostfire"]);
  assert.equal(w[3].end - w[3].start, 23 * HOUR); // Sun 27 Sep is the 23-hour DST day
  assert.equal(formatTime(Date.UTC(2026, 8, 28, 9, 30), "Pacific/Auckland", "en"), "10:30\\u00A0PM".replace("\\u00A0", "\u00A0")); // Bear Trap moves an hour locally
  assert.deepEqual(weekStrip(s, ["B"], now, "Pacific/Auckland")[3].dots, []); // Foundry belongs to A
});

test("share text lists UTC then each city's local time, flagging a different date", () => {
  const start = Date.UTC(2026, 8, 24, 9, 30);
  const zones = [{ label: "Auckland", tz: "Pacific/Auckland" }, { label: "London", tz: "Europe/London" }, { label: "Chicago", tz: "America/Chicago" }, { label: "Honolulu", tz: "Pacific/Honolulu" }];
  const rows = shareRows(start, zones, "en");
  assert.deepEqual(rows.map((r) => r.time.replace(/\u00A0/g, " ")), ["9:30 PM", "10:30 AM", "4:30 AM", "11:30 PM"]);
  assert.equal(rows[3].day, "Wed, Sep 23");
  const txt = shareText({ title: "Bear Trap 1", start, repeat: "Every 2 days", zones, lang: "en", state: "State 3543" });
  assert.equal(txt.split("\n")[0], "Bear Trap 1 · State 3543");
  assert.match(txt, /09:30 UTC/);
  assert.match(txt, /Honolulu: 11:30 PM \(Wed, Sep 23\)/);
  assert.ok(!/\u00A0/.test(txt));
});

/* ---------- stamina + daily drops ---------- */
import { staminaNow, dropsBetween, dropStatus, dropsNeedingAction, dropKey, DAILY_DROPS, STAMINA_REGEN_MS } from "../lib/daily.js";

test("stamina: +1 every 5 min, stops at 200, above 200 stays put", () => {
  const s = staminaNow({ value: 164, at: T0 }, T0 + 17 * MINUTE);
  assert.equal(s.value, 167);
  assert.equal(s.fullAt, T0 + 36 * STAMINA_REGEN_MS); // 3 h
  assert.equal(staminaNow({ value: 196, at: T0 }, T0 + 3 * HOUR).value, 200);
  const over = staminaNow({ value: 212, at: T0 }, T0 + 5 * HOUR);
  assert.deepEqual([over.value, over.fullAt, over.over], [212, null, true]);
  assert.equal(staminaNow(null, T0), null);
});

test("daily drops in UTC: Storehouse 00 & 12, Trek 00 (auto) 08 16; claims per account", () => {
  const day = Date.UTC(2026, 8, 24);
  const list = dropsBetween(day, day + DAY);
  assert.deepEqual(list.map((d) => `${d.id}@${new Date(d.at).getUTCHours()}`), ["store0@0", "trek0@0", "trek8@8", "store12@12", "trek16@16"]);
  assert.equal(list.reduce((n, d) => n + (d.kind === "trek" ? d.amount : 0), 0), 40);
  assert.equal(list.reduce((n, d) => n + (d.kind === "store" ? d.amount : 0), 0), 240);
  const trek8 = list.find((d) => d.id === "trek8");
  assert.equal(dropKey(trek8, trek8.at), "trek8@2026-09-24");
  assert.equal(dropStatus(trek8, {}, trek8.at - MINUTE), "upcoming");
  assert.equal(dropStatus(trek8, {}, trek8.at + HOUR), "ready");
  assert.equal(dropStatus(trek8, { [trek8.key]: trek8.at + 5 * MINUTE }, trek8.at + HOUR), "claimed");
  assert.equal(dropStatus(list.find((d) => d.id === "trek0"), {}, day + HOUR), "auto");
  // 8:00 PM Auckland (NZST) = 08:00 UTC
  assert.equal(formatTime(trek8.at, "Pacific/Auckland", "en"), "8:00\u00A0PM");
  // needs-action: ready for one account, claimed for the other
  const s = emptyState(T0, mkId);
  s.accounts = normalizeAccounts([makeAccount({ id: "A", name: "Main", isPrimary: true }, []), makeAccount({ id: "B", name: "Farm", color: 2 }, [])]);
  s.accountData = { A: emptyAccountData(), B: emptyAccountData() };
  s.accountData.B.claims = { [trek8.key]: trek8.at + MINUTE };
  const need = dropsNeedingAction(s, ["A", "B"], trek8.at + 10 * MINUTE).filter((n) => n.drop.id === "trek8");
  assert.deepEqual(need.map((n) => [n.status, n.accounts]), [["ready", ["A"]]]);
  const soon = dropsNeedingAction(s, ["A"], trek8.at - 20 * MINUTE).find((n) => n.drop.key === trek8.key);
  assert.equal(soon.status, "upcoming");
  assert.equal(DAILY_DROPS.filter((d) => d.manual).length, 4);
});

test("stamina and claims survive save/load; junk is dropped", async () => {
  const { sanitizeState } = await import("../lib/storage.js");
  const s = emptyState(T0, mkId);
  s.accountData.A.stamina = { value: 164, at: T0 };
  s.accountData.A.claims = { "trek8@2026-09-24": T0, "bogus": 1, "trek0@2026-09-24": T0 };
  const r = sanitizeState(JSON.parse(JSON.stringify(s)), T0, mkId);
  assert.deepEqual(r.accountData.A.stamina, { value: 164, at: T0 });
  assert.deepEqual(Object.keys(r.accountData.A.claims), ["trek8@2026-09-24"]);
});

test("only the newest hand-claim drop of each kind asks for action", async () => {
  const { isCurrentDrop, latestManualDrop } = await import("../lib/daily.js");
  const now = Date.UTC(2026, 8, 24, 20, 17); // after 16:00 UTC trek + 12:00 storehouse
  assert.equal(new Date(latestManualDrop("trek", now).at).getUTCHours(), 16);
  assert.equal(new Date(latestManualDrop("store", now).at).getUTCHours(), 12);
  const s = emptyState(now, mkId);
  const need = dropsNeedingAction(s, ["A"], now);
  assert.deepEqual(need.map((n) => n.drop.id).sort(), ["store12", "trek16"]);
  const older = dropsBetween(now - DAY, now).find((d) => d.id === "trek8");
  assert.equal(isCurrentDrop(older, now), false);
});

/* ---------- what to track + 24/7 training guidance ---------- */
import { tracking, buildAgenda as agenda2 } from "../lib/agenda.js";
import { inSleepWindow, nextLocalTime, timingCheck, nextCycleCheck } from "../lib/sleep.js";

test("turning off Trek / Storehouse / reset / stamina / contributions removes them everywhere they're listed", () => {
  const now = Date.UTC(2026, 8, 24, 7, 43);
  const s = emptyState(now, mkId);
  s.accountData.A.stamina = { value: 190, at: now };
  s.accountData.A.contrib = setAttempts(DEFAULT_CONTRIB, now, 15);
  const day = [now, now + DAY];
  const kinds = (st) => new Set(agenda2(st, ...day, ["A"], now).map((i) => (i.kind === "drop" ? i.ref.drop.kind : i.kind === "event" ? i.ref.ev.templateId : i.kind)));
  const all = kinds(s);
  for (const k of ["store", "trek", "stamina", "contrib", "daily_reset"]) assert.ok(all.has(k), k);
  s.settings.track = { reset: false, store: false, trek: false, stamina: false, contrib: false };
  const none = kinds(s);
  for (const k of ["store", "trek", "stamina", "contrib", "daily_reset"]) assert.ok(!none.has(k), k);
  assert.equal(dropsNeedingAction(s, ["A"], Date.UTC(2026, 8, 24, 8, 5)).length, 0);
  assert.deepEqual(tracking({ settings: {} }), { reset: true, store: true, trek: true, stamina: true, contrib: true, intel: true });
});

test("sleep window 22:00–07:00 (wraps midnight) in local time", () => {
  const tz = "Pacific/Auckland"; // NZST +12 before 27 Sep
  const at = (h, m = 0) => zonedTimeToUtc(2026, 9, 24, h, m, tz);
  assert.equal(inSleepWindow(at(21, 59), tz), false);
  assert.equal(inSleepWindow(at(22, 0), tz), true);
  assert.equal(inSleepWindow(at(1, 30), tz), true);
  assert.equal(inSleepWindow(at(6, 59), tz), true);
  assert.equal(inSleepWindow(at(7, 0), tz), false);
  assert.equal(nextLocalTime(at(14, 5), "21:45", tz), at(21, 45));
  assert.equal(nextLocalTime(at(22, 5), "21:45", tz), zonedTimeToUtc(2026, 9, 25, 21, 45, tz));
});

test("timing check: overnight finish → suggest a shorter run ending ~21:45; fine finishes get no nagging", () => {
  const tz = "Pacific/Auckland";
  const start = zonedTimeToUtc(2026, 9, 24, 14, 5, tz);
  const ok = timingCheck(start, 6 * HOUR, tz); // 8:05 PM
  assert.deepEqual([ok.overnight, ok.suggestion], [false, null]);
  const late = timingCheck(start, 11 * HOUR + 25 * MINUTE, tz); // 1:30 AM
  assert.equal(late.overnight, true);
  assert.equal(late.suggestion.kind, "bed");
  assert.equal(late.suggestion.durationMs, 7 * HOUR + 40 * MINUTE); // 14:05 → 21:45
  assert.equal(formatTime(late.suggestion.finishAt, tz, "en"), "9:45\u00A0PM");
  // started late at night: shortening can't help (it would just end earlier in the night)
  const night = timingCheck(zonedTimeToUtc(2026, 9, 24, 23, 0, tz), 11 * HOUR, tz); // 10:00 AM → fine
  assert.equal(night.overnight, false);
  const night2 = timingCheck(zonedTimeToUtc(2026, 9, 24, 21, 50, tz), 6 * HOUR, tz); // 3:50 AM
  assert.deepEqual([night2.overnight, night2.suggestion], [true, null]);
  // a camp training now that ends at 1:20 AM: advice is for the next cycle (restart when up)
  const nc = nextCycleCheck(zonedTimeToUtc(2026, 9, 25, 1, 20, tz), 16 * HOUR, tz);
  assert.equal(formatTime(nc.restartAt, tz, "en"), "7:00\u00A0AM");
  assert.equal(nc.suggestion.kind, "bed");
  assert.equal(formatTime(nc.suggestion.finishAt, tz, "en"), "9:45\u00A0PM");
  assert.equal(nextCycleCheck(zonedTimeToUtc(2026, 9, 25, 20, 0, tz), 6 * HOUR, tz), null);
});

/* ---------- Alliance Championship prep + Lighthouse intel ---------- */
import { champRounds, upcomingThursdays, isThursdayStart, PREP_ROUNDS } from "../lib/championship.js";
import { intelPeriod, intelRefreshesBetween, intelNeedingAction } from "../lib/daily.js";

test("championship prep rounds: exact UTC windows, every 14 days from the chosen Thursday", () => {
  const thu = Date.UTC(2026, 9, 1); // Thu 1 Oct 2026
  assert.equal(isThursdayStart(thu), true);
  assert.equal(isThursdayStart(thu + HOUR), false);
  const r = champRounds(thu, thu, thu + 3 * DAY);
  const utc = (ms) => new Date(ms).toISOString().slice(5, 16).replace("T", " ");
  assert.deepEqual(r.map((x) => `R${x.round} ${utc(x.start)}–${utc(x.end)}`), [
    "R1 10-01 00:00–10-01 11:00", "R2 10-01 12:00–10-02 00:00", "R3 10-02 01:00–10-02 12:00",
    "R4 10-02 13:00–10-03 00:00", "R5 10-03 01:00–10-03 12:00",
  ]);
  assert.equal(champRounds(thu, thu + 7 * DAY, thu + 10 * DAY).length, 0); // the off week
  assert.equal(champRounds(thu, thu + 14 * DAY, thu + 17 * DAY)[0].start, thu + 14 * DAY);
  assert.equal(champRounds(thu, thu - 14 * DAY, thu - 11 * DAY).length, 5); // works backwards too
  assert.equal(PREP_ROUNDS.length, 5);
  // local view: Round 1 opens Thu 1 PM in Auckland (NZDT, +13)
  assert.equal(formatTime(r[0].start, "Pacific/Auckland", "en"), "1:00\u00A0PM");
  // picker offers this Thursday until its prep is over, then next
  assert.deepEqual(upcomingThursdays(Date.UTC(2026, 8, 29, 12)), [thu, thu + 7 * DAY]);
  assert.deepEqual(upcomingThursdays(Date.UTC(2026, 9, 3, 13)), [thu + 7 * DAY, thu + 14 * DAY]);
});

test("championship shows on the schedule only for the leader in charge", () => {
  const thu = Date.UTC(2026, 9, 1);
  const s = emptyState(thu, mkId);
  const rounds = (st) => agenda2(st, thu, thu + 3 * DAY, ["A"], thu).filter((i) => i.kind === "champ").length;
  assert.equal(rounds(s), 0);
  s.settings.champ = { leader: true, anchor: thu };
  assert.equal(rounds(s), 5);
  s.settings.champ = { leader: false, anchor: thu };
  assert.equal(rounds(s), 0);
});

test("Lighthouse intel: refreshes 00/08/16 UTC; nag within the hour before the next one until cleared", () => {
  const day = Date.UTC(2026, 8, 24);
  assert.deepEqual(intelRefreshesBetween(day, day + DAY).map((ms) => new Date(ms).getUTCHours()), [0, 8, 16]);
  const p = intelPeriod(day + 10 * HOUR);
  assert.deepEqual([new Date(p.start).getUTCHours(), new Date(p.next).getUTCHours()], [8, 16]);
  assert.equal(p.key, "intel@2026-09-24T08");
  assert.equal(new Date(intelPeriod(day + 20 * HOUR).next).toISOString(), "2026-09-25T00:00:00.000Z");
  const s = emptyState(day, mkId);
  assert.equal(intelNeedingAction(s, ["A"], day + 10 * HOUR), null); // next refresh 6 h away
  const soon = intelNeedingAction(s, ["A"], day + 15 * HOUR + 20 * MINUTE);
  assert.deepEqual([soon.accounts, soon.key], [["A"], "intel@2026-09-24T08"]);
  s.accountData.A.claims = { [soon.key]: day + 15 * HOUR };
  assert.equal(intelNeedingAction(s, ["A"], day + 15 * HOUR + 20 * MINUTE), null);
  s.settings.track = { ...s.settings.track, intel: false };
  s.accountData.A.claims = {};
  assert.equal(intelNeedingAction(s, ["A"], day + 15 * HOUR + 20 * MINUTE), null);
  const items = agenda2({ ...s, settings: { ...s.settings, track: { intel: true } } }, day, day + DAY, ["A"], day + 9 * HOUR).filter((i) => i.kind === "intel");
  assert.deepEqual(items.map((i) => i.status), ["done", "now", "upcoming"]);
});

/* ---------- Finish At: compact input + advice within the account's maximum ---------- */
import { parseCompactTime } from "../lib/time.js";
import { finishAdvice, nextFinishTarget } from "../lib/sleep.js";

test("Finish At accepts compact numbers: 2200, 0130, 928 …", () => {
  assert.equal(parseCompactTime("2200"), "22:00");
  assert.equal(parseCompactTime("0130"), "01:30");
  assert.equal(parseCompactTime("928"), "09:28");
  assert.equal(parseCompactTime("7"), "07:00");
  assert.equal(parseCompactTime("21"), "21:00");
  assert.equal(parseCompactTime("22:00"), "22:00");
  for (const bad of ["", "2400", "1260", "12345", "abc"]) assert.equal(parseCompactTime(bad), null, bad);
});

test("Finish At advice: bedtime when reachable, never beyond the maximum, else a full batch", () => {
  const tz = "Pacific/Auckland";
  const at = (d, h, m = 0) => zonedTimeToUtc(2026, 9, d, h, m, tz);
  // 6 PM, max 6 h: finish at 9:45 PM (3h45), then a full batch runs overnight until 3:45 AM
  const a = finishAdvice(at(24, 18), 6 * HOUR, tz);
  assert.equal(a.kind, "bed");
  assert.equal(a.durationMs, 3 * HOUR + 45 * MINUTE);
  assert.equal(formatTime(a.overnightEnd, tz, "en"), "3:45\u00A0AM");
  // 1 PM, max 6 h: bedtime is 8h45 away (too long) → full batch, ends 7:00 PM
  const b = finishAdvice(at(24, 13), 6 * HOUR, tz);
  assert.deepEqual([b.kind, b.durationMs, formatTime(b.finishAt, tz, "en")], ["full", 6 * HOUR, "7:00\u00A0PM"]);
  // 9:40 PM (5 min before bedtime): too close → full batch
  assert.equal(finishAdvice(at(24, 21, 40), 6 * HOUR, tz).kind, "full");
  for (const x of [a, b]) assert.ok(x.durationMs <= 6 * HOUR);
  assert.equal(finishAdvice(at(24, 18), 0, tz), null);
  // typed times land on the next occurrence
  assert.equal(nextFinishTarget(at(24, 18), "22:00", tz), at(24, 22));
  assert.equal(nextFinishTarget(at(24, 18), "01:30", tz), at(25, 1, 30));
});

/* ---------- first-visit language detection ---------- */
import { detectLanguage } from "../lib/language.js";
test("language: phone language first, then the time zone's country, then English", () => {
  const L = ["en", "it", "es", "ko", "de", "ru", "pl", "tr", "ar"];
  assert.equal(detectLanguage(L, ["it-IT", "en-GB"], "Pacific/Auckland"), "it");
  assert.equal(detectLanguage(L, ["en-NZ"], "Europe/Rome"), "en"); // English speaker in Italy keeps English
  assert.equal(detectLanguage(L, ["pt-BR"], "America/Sao_Paulo"), "en"); // Portuguese isn't in the app → English
  assert.equal(detectLanguage(L, ["pt-PT", "es-419"], "Europe/Lisbon"), "es"); // second phone language used
  assert.equal(detectLanguage(L, [], "Europe/Warsaw"), "pl");
  assert.equal(detectLanguage(L, ["xx"], "Asia/Riyadh"), "ar");
  assert.equal(detectLanguage(L, ["ko_KR"], null), "ko");
  assert.equal(detectLanguage(L, [], "Pacific/Auckland"), "en");
});

/* ---------- troops ⇄ time ---------- */
import { troopsForDuration, durationForTroops, campTroopsFor } from "../lib/timers.js";
test("troops ⇄ time: proportional to the full batch, never beyond it", () => {
  const full = 5 * HOUR + 40 * MINUTE, batch = 3400; // 6 s per troop
  assert.equal(troopsForDuration(3 * HOUR + 45 * MINUTE, full, batch), 2250);
  assert.equal(durationForTroops(2250, full, batch), 3 * HOUR + 45 * MINUTE);
  assert.equal(troopsForDuration(9 * HOUR, full, batch), batch); // capped
  assert.equal(durationForTroops(99999, full, batch), full);
  assert.equal(troopsForDuration(HOUR, full, null), 0);
  assert.equal(campTroopsFor({ campTroops: { infantry_camp: 3400 } }, "infantry_camp"), 3400);
  assert.equal(campTroopsFor({}, "lancer_camp"), null);
  const s = emptyState(T0, mkId);
  s.accountData.A.campTroops = { infantry_camp: 3400, lancer_camp: -5 };
  const r = (async () => (await import("../lib/storage.js")).sanitizeState(JSON.parse(JSON.stringify(s)), T0, mkId))();
  return r.then((x) => assert.deepEqual(x.accountData.A.campTroops, { infantry_camp: 3400 }));
});

/* ---------- Today plan: free time, personal tasks, one chip per account ---------- */
import { buildTimeline, parseTaskDuration, placeTask, rowChips, occupancy } from "../lib/plan.js";

const pev = (id, start, end, accountId) => ({ id, kind: "event", start, end, accountId, ref: { ev: { templateId: null } } });
const pinst = (id, kind, start, accountId) => ({ id, kind, start, end: null, accountId, ref: {} });
const view = (tl) => tl.map((e) => e.type === "gap" ? `gap ${(e.ms / MINUTE)}m` : e.type === "task" ? `task ${e.task.title}` : `item ${e.item.id}`);

test("acceptance: Bear Trap 09–10, research 12:00 → 2h free; add dinner 45 and kitchen 30", () => {
  const D = Date.UTC(2026, 8, 24), H = (h, m = 0) => D + h * HOUR + m * MINUTE;
  const items = [pev("bear", H(9), H(10), "A"), pinst("research", "research", H(12), "B")];
  const now = H(8);
  let tl = buildTimeline(items, [], D, D + DAY, now);
  assert.deepEqual(view(tl).slice(0, 4), ["gap 60m", "item bear", "gap 120m", "item research"]);
  const gap = tl.find((e) => e.type === "gap" && e.start === H(10));
  const dinnerMs = parseTaskDuration("45");
  const p1 = placeTask(gap, dinnerMs);
  assert.deepEqual([p1.fits, p1.start, p1.end], [true, H(10), H(10, 45)]);
  const tasks = [{ id: "t1", title: "Make dinner", start: p1.start, end: p1.end, done: false }];
  tl = buildTimeline(items, tasks, D, D + DAY, now);
  const g2 = tl.find((e) => e.type === "gap" && e.start === H(10, 45));
  assert.equal(g2.ms, 75 * MINUTE); // 1h 15m free
  const p2 = placeTask(g2, parseTaskDuration("30"));
  tasks.push({ id: "t2", title: "Clean kitchen", start: p2.start, end: p2.end, done: false });
  tl = buildTimeline(items, tasks, D, D + DAY, now);
  assert.deepEqual(view(tl).slice(1, 6), ["item bear", "task Make dinner", "task Clean kitchen", "gap 45m", "item research"]);
  assert.equal(p2.start, H(10, 45));
  assert.equal(p2.end, H(11, 15));
  // too long: say by how much, don't overlap silently
  const tooLong = placeTask(tl.find((e) => e.type === "gap" && e.start === H(11, 15)), 2 * HOUR);
  assert.deepEqual([tooLong.fits, tooLong.over], [false, 75 * MINUTE]);
});

test("free time: overlapping events merge, unknown ends claim no gap, done tasks take no time, only from now", () => {
  const D = Date.UTC(2026, 8, 24), H = (h, m = 0) => D + h * HOUR + m * MINUTE;
  const a = pev("a", H(10), H(11)), b = pev("b", H(10, 30), H(12)), c = pinst("c", "training", H(14));
  let tl = buildTimeline([a, b, c], [], D, D + DAY, H(9));
  assert.deepEqual(view(tl).slice(0, 5), ["gap 60m", "item a", "item b", "gap 120m", "item c"]);
  const unknown = pev("u", H(13), null);
  assert.equal(occupancy(unknown), "unknown");
  tl = buildTimeline([a, unknown, c], [], D, D + DAY, H(9));
  assert.deepEqual(view(tl).slice(0, 5), ["gap 60m", "item a", "gap 120m", "item u", "item c"]); // nothing between u and c
  const done = { id: "d", title: "Shower", start: H(11), end: H(11, 30), done: true };
  tl = buildTimeline([a, c], [done], D, D + DAY, H(9));
  assert.ok(view(tl).includes("gap 180m")); // 11:00 → 14:00 still free
  tl = buildTimeline([a, c], [], D, D + DAY, H(12)); // it's noon: past gaps disappear, the next one starts now
  assert.equal(tl.find((e) => e.type === "gap").start, H(12));
  assert.equal(occupancy({ kind: "event", start: 1, end: null, ref: { ev: { templateId: "daily_reset" } } }), "instant");
});

test("task length typing: 30 → 30m, 90 → 1h30, 130 → 1h30, 230 → 2h30", () => {
  assert.equal(parseTaskDuration("30"), 30 * MINUTE);
  assert.equal(parseTaskDuration("90"), 90 * MINUTE);
  assert.equal(parseTaskDuration("130"), 90 * MINUTE);
  assert.equal(parseTaskDuration("230"), 150 * MINUTE);
  assert.equal(parseTaskDuration("1:30"), 90 * MINUTE);
  for (const bad of ["", "0", "abc", "199", "12345"]) assert.equal(parseTaskDuration(bad), null, bad);
});

test("an account chip can't appear twice on one row", () => {
  const rems = [{ key: "k1", accountId: "B" }];
  const one = rowChips("B", rems); // Farm event: chip once, minister line without a second chip
  assert.equal(one.itemChip, "B");
  assert.equal(one.reminders[0].chip, false);
  const shared = rowChips(null, [{ key: "k1", accountId: "A" }, { key: "k2", accountId: "B" }]); // shared event: one per account line
  assert.deepEqual(shared.reminders.map((r) => r.chip), [true, true]);
  const chipsShown = [one.itemChip, ...one.reminders.filter((r) => r.chip).map((r) => r.accountId)];
  assert.equal(new Set(chipsShown).size, chipsShown.length);
});

test("tasks survive save/load; junk and old tasks are dropped", async () => {
  const { sanitizeState } = await import("../lib/storage.js");
  const s = emptyState(T0, mkId);
  s.tasks = [
    { id: "t1", title: " Make dinner ", start: T0, end: T0 + 45 * MINUTE, done: true },
    { id: "t2", title: "", start: T0, end: T0 + MINUTE },
    { id: "t3", title: "Old", start: T0 - 9 * DAY, end: T0 - 9 * DAY + HOUR },
  ];
  const r = sanitizeState(JSON.parse(JSON.stringify(s)), T0, mkId);
  assert.deepEqual(r.tasks, [{ id: "t1", title: "Make dinner", start: T0, end: T0 + 45 * MINUTE, done: true }]);
});

/* ---------- research: fixed display order, not by finish time ---------- */
test("research always lists Research Center, Dawn Academy, War Academy — never reordered by finish time", () => {
  const now = T0;
  const timers = [
    { id: "w", kind: "research", category: "war_academy", startedAt: now, endAt: now + MINUTE, durationMs: MINUTE, createdAt: now },
    { id: "r", kind: "research", category: "research_center", startedAt: now, endAt: now + 10 * HOUR, durationMs: 10 * HOUR, createdAt: now },
    { id: "d", kind: "research", category: "dawn_academy", startedAt: now, endAt: now + 5 * HOUR, durationMs: 5 * HOUR, createdAt: now },
  ];
  assert.deepEqual(sortResearch(timers).map((x) => x.category), ["research_center", "dawn_academy", "war_academy"]);
  // a missing building is simply omitted, not reordered
  assert.deepEqual(sortResearch(timers.filter((x) => x.category !== "dawn_academy")).map((x) => x.category), ["research_center", "war_academy"]);
});

/* ---------- training: three modes tag the resulting timer ---------- */
test("applyTraining tags each timer with its mode (finish / max / custom) when given", () => {
  const now = T0;
  const list = applyTraining([], [
    { camp: "infantry_camp", durationMs: HOUR, mode: "finish" },
    { camp: "lancer_camp", durationMs: 2 * HOUR, mode: "max" },
    { camp: "marksman_camp", durationMs: 30 * MINUTE, mode: "custom" },
  ], now, mkId);
  assert.deepEqual(list.map((x) => [x.category, x.mode]), [["infantry_camp", "finish"], ["lancer_camp", "max"], ["marksman_camp", "custom"]]);
  // mode survives a save/load round trip
  const s = emptyState(now, mkId);
  s.accountData.A.timers = list;
  return import("../lib/storage.js").then(({ sanitizeState }) => {
    const r = sanitizeState(JSON.parse(JSON.stringify(s)), now, mkId);
    assert.deepEqual(r.accountData.A.timers.map((x) => x.mode), ["finish", "max", "custom"]);
  });
});

/* ---------- time-blindness: proportional gaps, overdue tasks, reschedule ---------- */
import { gapVisualHeight, taskVisualHeight, overdueTasks, findNextGap } from "../lib/plan.js";

test("gap height grows with duration and is clamped (time blindness: more time looks bigger, never absurd)", () => {
  const h10 = gapVisualHeight(10 * MINUTE), h30 = gapVisualHeight(30 * MINUTE), h60 = gapVisualHeight(HOUR);
  const h120 = gapVisualHeight(2 * HOUR), h240 = gapVisualHeight(4 * HOUR), h480 = gapVisualHeight(8 * HOUR), h1000 = gapVisualHeight(20 * HOUR);
  assert.ok(h10 < h30 && h30 < h60 && h60 < h120 && h120 < h240 && h240 < h480, `${h10},${h30},${h60},${h120},${h240},${h480}`);
  assert.equal(h480, h1000); // capped — an 8h gap and a 20h gap don't blow out the page
  assert.ok(h10 >= 16 && h480 <= 260); // generous, old-design scale: 16–260px — a long gap should visibly read as a substantial block of the day
  assert.deepEqual([gapVisualHeight(30 * MINUTE), gapVisualHeight(HOUR), gapVisualHeight(2 * HOUR), gapVisualHeight(4 * HOUR), gapVisualHeight(6 * HOUR)], [40, 72, 130, 200, 260]);
});

test("task block height also scales, gently, and stays a comfortable tap size", () => {
  const short = taskVisualHeight(10 * MINUTE), long = taskVisualHeight(3 * HOUR), veryLong = taskVisualHeight(10 * HOUR);
  assert.ok(short < long);
  assert.equal(long, veryLong); // capped at 3h
  assert.ok(short >= 44); // comfortable touch target even for a tiny task
});

test("an unfinished task stays put when its time passes — never auto-completed, auto-archived, or hidden", () => {
  const now = T0;
  const tasks = [
    { id: "a", title: "Laundry", start: now - 2 * HOUR, end: now - 90 * MINUTE, done: false }, // planned time passed, not done
    { id: "b", title: "Shower", start: now - HOUR, end: now - 40 * MINUTE, done: true }, // done → not overdue
    { id: "c", title: "Later", start: now + HOUR, end: now + 90 * MINUTE, done: false }, // still upcoming, not overdue
  ];
  const over = overdueTasks(tasks, now);
  assert.deepEqual(over.map((t) => t.id), ["a"]);
});

test("finding the next free gap for a quick reschedule", () => {
  const D = Date.UTC(2026, 8, 24), H = (h, m = 0) => D + h * HOUR + m * MINUTE;
  const items = [pev("a", H(10), H(11), "A"), pev("b", H(13), H(14), "A")];
  const tl = buildTimeline(items, [], D, D + DAY, H(9));
  const g = findNextGap(tl, 90 * MINUTE);
  assert.equal(g.start, H(11)); // the 9–10 gap (1h) is too short; the next one that fits is 11–13 (2h)
  assert.ok(g.ms >= 90 * MINUTE);
  assert.equal(findNextGap(tl, 50 * HOUR), null);
});

/* ---------- Ministry of Education × training planner (action-first) ---------- */
import { eduBooking, eduWindow, classifyAt, planCamp, buildEducationPlan, findEducationSlots, insideFinishTarget, finishMissesWindow, EDU_BUFFER_MS, eduGapHeight, eduDoneKey, prepMs } from "../lib/education.js";
import { campMaxEduFor } from "../lib/timers.js";

const ED = Date.UTC(2026, 8, 24); // Thu 24 Sep 00:00 UTC
const EH = (h, m = 0) => ED + h * HOUR + m * MINUTE;
const eBook = (startAt, id = "e1") => ({ id, position: "minister_education", startAt, notes: "", createdAt: 0 });
const eCamp = (camp, finishAt, normalMs = 6 * HOUR, eduMs = null, running = finishAt != null) => ({ camp, troop: "normal", running, finishAt, normalMs, eduMs });
const eNames = (p) => p.camps.map((x) => `${x.camp.slice(0, 3)}:${x.cls}`).join(" ");
const NOSLEEP = { start: "00:00", end: "00:00", target: "21:45" }; // disabled window (start === end)

test("education: eduBooking picks the next unexpired Education booking (one record, others ignored)", () => {
  const bs = [{ id: "d", position: "minister_defense", startAt: EH(7) }, eBook(EH(9), "late"), eBook(EH(8), "soon"), eBook(EH(1), "gone")];
  assert.equal(eduBooking(bs, EH(7))?.id, "soon");
  assert.equal(eduBooking(bs.filter((b) => b.id !== "soon" && b.id !== "late"), EH(7)), null);
  assert.equal(eduBooking([eBook(EH(8))], EH(8, 30)), null);
  const w = eduWindow(eBook(EH(8)));
  assert.deepEqual([w.start, w.end, w.latest, w.ready], [EH(8), EH(8, 30), EH(8, 25), EH(7, 57)]); // ready 3 min early
  assert.equal(prepMs(0), 0);
  assert.equal(eduDoneKey(eBook(EH(8), "x")), `x:${EH(8)}`);
});

test("education: A/B/C — camp finishes before / during / after the window", () => {
  const win = eduWindow(eBook(EH(20))); const now = EH(17);
  assert.equal(planCamp(eCamp("infantry_camp", EH(18)), win, now).cls, "before");
  const inside = planCamp(eCamp("infantry_camp", EH(20, 12)), win, now);
  assert.deepEqual([inside.cls, inside.restartAt], ["inside", EH(20, 12)]);
  assert.equal(planCamp(eCamp("infantry_camp", EH(21, 15)), win, now).cls, "after");
  assert.equal(planCamp(eCamp("infantry_camp", EH(20, 27)), win, now).cls, "tight");
});

test("education: the short training ends a few minutes BEFORE the window opens, not at the last second", () => {
  const win = eduWindow(eBook(EH(20))); // ready by 19:57
  const p = planCamp(eCamp("infantry_camp", EH(18)), win, EH(16), { priority: "uptime" });
  const end = p.steps.at(-1).at + p.steps.at(-1).durationMs;
  assert.deepEqual([p.cls, p.steps.length, p.steps[0].at, p.steps[0].durationMs, end, p.restartAt], ["before", 1, EH(18), 117 * MINUTE, EH(19, 57), EH(20)]);
  assert.ok(end < win.start);
  // no safety buffer configured → it lines up with the start
  const zero = planCamp(eCamp("infantry_camp", EH(18)), eduWindow(eBook(EH(20)), 0), EH(16), { priority: "uptime" });
  assert.equal(zero.steps[0].durationMs, 2 * HOUR);
});

test("education: short trainings chain full batches when the gap is longer than a full batch, never past the window", () => {
  const win = eduWindow(eBook(EH(20)));
  const p = planCamp(eCamp("infantry_camp", EH(6), 6 * HOUR), win, EH(5), { priority: "uptime" });
  const end = p.steps.at(-1).at + p.steps.at(-1).durationMs;
  assert.ok(end <= win.ready);
  assert.equal(p.steps[0].durationMs, 6 * HOUR);
  assert.ok(win.ready - end < MINUTE * 2);
});

test("education: fewest check-ins waits out short gaps; more uptime bridges them", () => {
  const win = eduWindow(eBook(EH(20)));
  const short = eCamp("infantry_camp", EH(19, 25)); // ~32 min to be ready
  const fewest = planCamp(short, win, EH(17), { priority: "checkins" });
  assert.equal(fewest.steps.length, 0);
  const uptime = planCamp(short, win, EH(17), { priority: "uptime" });
  assert.equal(uptime.steps.length, 1);
  const tiny = planCamp(eCamp("infantry_camp", EH(19, 50)), win, EH(17), { priority: "uptime" });
  assert.equal(tiny.steps.length, 0);
});

test("education: already inside the window → restart now; under the buffer left → tight; over → nothing", () => {
  const win = eduWindow(eBook(EH(20)));
  const idle = eCamp("infantry_camp", null, 6 * HOUR, null, false);
  const now = planCamp(idle, win, EH(20, 10));
  assert.deepEqual([now.cls, now.restartAt], ["now", EH(20, 10)]);
  assert.equal(planCamp(idle, win, EH(20, 26)).cls, "tight");
  const over = planCamp(idle, win, EH(20, 30));
  assert.deepEqual([over.cls, over.restartAt], ["over", null]);
});

test("education: check-ins count only what the PLAYER does — passive milestones never count", () => {
  const booking = eBook(EH(10, 30));
  const p = buildEducationPlan({ now: EH(0), booking, camps: ["infantry_camp", "lancer_camp", "marksman_camp"].map((c) => eCamp(c, EH(6, 14), 6 * HOUR, 5 * HOUR)), priority: "uptime" });
  assert.deepEqual(p.timeline.filter((e) => e.kind === "action").map((e) => e.type), ["bridge", "buff"]);
  assert.equal(p.checkIns, 2); // 6:14 restart + Education restart
  const passive = p.timeline.filter((e) => e.kind === "milestone").map((e) => e.type);
  assert.ok(passive.includes("edu_end") && passive.includes("final")); // camps finishing / Education ending are info, not check-ins
  assert.equal(p.actions.length, 2);
  assert.equal(p.next.type, "bridge");
  assert.equal(p.then.type, "buff");
  assert.equal(p.mode, "wait"); // nothing to do yet
  // the opening of the appointment merges into the action at that moment
  assert.equal(p.actions[1].eduStart, true);
  assert.equal(p.timeline.some((e) => e.type === "edu_start"), false);
});

test("education: wait vs do-now vs done vs missed vs over", () => {
  const booking = eBook(EH(20));
  const cs = [eCamp("infantry_camp", EH(18))];
  assert.equal(buildEducationPlan({ now: EH(17), booking, camps: cs }).mode, "wait");
  assert.equal(buildEducationPlan({ now: EH(18), booking, camps: [eCamp("infantry_camp", EH(18))], priority: "uptime" }).mode, "doNow");
  assert.equal(buildEducationPlan({ now: EH(20, 5), booking, camps: [eCamp("infantry_camp", null, 6 * HOUR, null, false)] }).mode, "doNow");
  assert.equal(buildEducationPlan({ now: EH(20, 5), booking, camps: [eCamp("infantry_camp", null, 6 * HOUR, null, false)], done: { buff: EH(20, 2) } }).mode, "done");
  assert.equal(buildEducationPlan({ now: EH(17), booking, camps: [eCamp("infantry_camp", EH(21, 30))] }).mode, "missed");
  assert.equal(buildEducationPlan({ now: EH(20, 40), booking, camps: cs }).mode, "over");
  assert.equal(buildEducationPlan({ now: EH(20, 5), booking, camps: [eCamp("infantry_camp", null, 6 * HOUR, null, false)] }).active, true);
});

test("education: marking the short training done advances the plan to the Education restart", () => {
  const booking = eBook(EH(20));
  const idle = [eCamp("infantry_camp", null, 6 * HOUR, 5 * HOUR, false)];
  const before = buildEducationPlan({ now: EH(17), booking, camps: idle, priority: "uptime" });
  assert.equal(before.next.type, "bridge");
  const after = buildEducationPlan({ now: EH(17, 2), booking, camps: idle, priority: "uptime", done: { bridge: EH(17, 1) } });
  assert.equal(after.next.type, "buff");
  assert.equal(after.checkIns, 1);
});

test("education: without the player's Education full-batch time there is NO exact final finish", () => {
  const booking = eBook(EH(20));
  const without = buildEducationPlan({ now: EH(17), booking, camps: [eCamp("infantry_camp", EH(19, 50), 6 * HOUR, null)] });
  assert.equal(without.eduKnown, false);
  assert.equal(without.camps[0].finalFinish, null);
  assert.equal(without.camps[0].restartMs, null);
  assert.equal(without.timeline.some((e) => e.type === "final"), false);
  assert.equal(without.camps[0].restartAt, EH(20)); // it still says WHEN
  const withEdu = buildEducationPlan({ now: EH(17), booking, camps: [eCamp("infantry_camp", EH(19, 50), 6 * HOUR, 4 * HOUR + 20 * MINUTE)] });
  assert.equal(withEdu.eduKnown, true);
  assert.equal(withEdu.camps[0].finalFinish, EH(20) + 4 * HOUR + 20 * MINUTE);
  assert.equal(campMaxEduFor({ campMaxEdu: { infantry_camp: 3 * HOUR } }, "infantry_camp"), 3 * HOUR);
  assert.equal(campMaxEduFor({}, "infantry_camp"), null);
});

test("education: normal vs Education comparison only when every camp has both figures", () => {
  const booking = eBook(EH(20));
  const both = buildEducationPlan({ now: EH(17), booking, camps: [eCamp("infantry_camp", EH(19), 7 * HOUR + 16 * MINUTE, 5 * HOUR + 48 * MINUTE)] });
  assert.equal(both.compare[0].diffMs, 88 * MINUTE); // 1h 28m shorter
  const partial = buildEducationPlan({ now: EH(17), booking, camps: [eCamp("infantry_camp", EH(19), 7 * HOUR, 5 * HOUR), eCamp("lancer_camp", EH(19), 7 * HOUR, null)] });
  assert.equal(partial.compare, null);
});

test("education: D/E/H — camps together or different, each keeps its own maximum", () => {
  const booking = eBook(EH(20));
  const together = buildEducationPlan({ now: EH(17), booking, camps: ["infantry_camp", "lancer_camp", "marksman_camp"].map((c) => eCamp(c, EH(19))), priority: "uptime" });
  assert.equal(together.timeline.filter((e) => e.type === "bridge").length, 1);
  assert.equal(together.timeline.find((e) => e.type === "bridge").camps.length, 3);
  const mixed = buildEducationPlan({ now: EH(17), booking, camps: [eCamp("infantry_camp", EH(20, 4), 7 * HOUR, 6 * HOUR), eCamp("lancer_camp", EH(20, 18), 7 * HOUR, 6 * HOUR), eCamp("marksman_camp", EH(20, 42), 6 * HOUR + 16 * MINUTE, 5 * HOUR)] });
  assert.equal(eNames(mixed), "inf:inside lan:inside mar:after");
  assert.equal(mixed.camps[0].finalFinish, EH(20, 4) + 6 * HOUR);
  assert.equal(mixed.camps[1].finalFinish, EH(20, 18) + 6 * HOUR);
  assert.equal(mixed.checkIns, 2); // two different restart times
});

test("education: G/F — a full batch over 24 hours and absolute times across a date boundary", () => {
  const win = eduWindow(eBook(EH(23, 30)));
  const p = planCamp(eCamp("infantry_camp", EH(23, 40), 26 * HOUR, 26 * HOUR), win, EH(22));
  assert.equal(p.cls, "inside");
  assert.equal(new Date(p.finalFinish).getUTCDate(), 26);
});

test("education: L — a chosen final finish time shortens the buffed restart", () => {
  const tz = "UTC"; const win = eduWindow(eBook(EH(20)));
  const p = planCamp(eCamp("infantry_camp", EH(20, 5), 7 * HOUR, 7 * HOUR), win, EH(17), { priority: "finish", desired: { hhmm: "03:00", tz } });
  assert.deepEqual([p.restartMs, p.finalFinish], [6 * HOUR + 55 * MINUTE, ED + 27 * HOUR]);
  const far = planCamp(eCamp("infantry_camp", EH(20, 5), 7 * HOUR, 7 * HOUR), win, EH(17), { priority: "finish", desired: { hhmm: "20:00", tz } });
  assert.equal(far.restartMs, 7 * HOUR);
  const noData = planCamp(eCamp("infantry_camp", EH(20, 5), 7 * HOUR, null), win, EH(17), { priority: "finish", desired: { hhmm: "03:00", tz } });
  assert.equal(noData.finalFinish, ED + 27 * HOUR); // the player's own target is a real number
});

test("education: sleep-aware — a check-in that would land while asleep moves to when the player wakes", () => {
  const tz = "UTC"; const sleep = { start: "22:00", end: "07:00", target: "21:45" };
  const booking = eBook(EH(10, 30));
  const p = buildEducationPlan({ now: EH(22, 52) - DAY, booking, camps: [eCamp("infantry_camp", EH(6, 14), 6 * HOUR, 5 * HOUR)], priority: "uptime", sleep, tz });
  assert.equal(p.next.at, EH(7)); // not 6:14 AM
  assert.ok(p.notices.some((n) => n.key === "sleepShift" && n.from === EH(6, 14) && n.to === EH(7)));
  const end = p.next.at + p.next.durationMs;
  assert.ok(end <= p.win.ready);
  // a wake time after the window closes → the window is unusable, plan says so calmly
  const late = buildEducationPlan({ now: EH(22, 52) - DAY, booking: eBook(EH(3)), camps: [eCamp("infantry_camp", EH(1), 6 * HOUR, 5 * HOUR)], sleep, tz });
  assert.ok(late.notices.some((n) => n.key === "asleepWindow"));
  // awake now: doing something right now isn't shifted
  const nowAwake = buildEducationPlan({ now: EH(23), booking: eBook(EH(23, 30)), camps: [eCamp("infantry_camp", null, 6 * HOUR, 5 * HOUR, false)], sleep, tz });
  assert.equal(nowAwake.notices.some((n) => n.key === "sleepShift"), false);
});

test("education: missed action → the plan recalculates and says so kindly", () => {
  const booking = eBook(EH(10, 30));
  // camps finished at 6:14 and nothing was restarted; it is now 9:18
  const idle = [{ ...eCamp("infantry_camp", null, 6 * HOUR, 5 * HOUR, false), lastEnd: EH(6, 14) }];
  const p = buildEducationPlan({ now: EH(9, 18), booking, camps: idle, priority: "uptime" });
  assert.ok(p.notices.some((n) => n.key === "changed" && n.since === EH(6, 14)));
  assert.equal(p.mode, "doNow");
  assert.equal(p.next.type, "bridge");
  assert.ok(p.next.at + p.next.durationMs <= p.win.ready); // a fresh short training that still gets ready in time
  // a camp that just finished a minute ago isn't a "changed plan"
  const fresh = [{ ...eCamp("infantry_camp", null, 6 * HOUR, 5 * HOUR, false), lastEnd: EH(9, 17) }];
  assert.equal(buildEducationPlan({ now: EH(9, 18), booking, camps: fresh }).notices.some((n) => n.key === "changed"), false);
});

test("education: I/J/K — moving, cancelling, or no booking changes the answer from the same record", () => {
  const camps = [eCamp("infantry_camp", EH(19))];
  const at8 = buildEducationPlan({ now: EH(17), booking: eBook(EH(20)), camps, priority: "uptime" });
  const at830 = buildEducationPlan({ now: EH(17), booking: eBook(EH(20, 30)), camps, priority: "uptime" });
  assert.notEqual(at8.actions.at(-1).at, at830.actions.at(-1).at);
  assert.equal(eduBooking([], EH(17)), null);
  assert.notEqual(eduDoneKey(eBook(EH(20), "a")), eduDoneKey(eBook(EH(20, 30), "a"))); // a moved booking starts with a clean slate
});

test("education: waits are drawn in proportion, capped (7 hours feels longer than 30 minutes, without becoming huge)", () => {
  const h = (m) => eduGapHeight(m * MINUTE);
  assert.ok(h(30) < h(60) && h(60) < h(240) && h(240) < h(440));
  assert.ok(h(440) > 2 * h(30));
  assert.equal(h(600), h(9999)); // capped
  assert.ok(h(1) >= 24 && h(9999) <= 96);
});

test("education: recommended slots are real bookable slots that line up with camp finishes", () => {
  const now = EH(17, 10);
  const camps = [eCamp("infantry_camp", EH(20, 5)), eCamp("lancer_camp", EH(20, 8)), eCamp("marksman_camp", EH(22, 0))];
  const best = findEducationSlots({ now, camps, bookings: [] });
  assert.equal(best[0].start, EH(20));
  assert.deepEqual([best[0].inside, best[0].total], [2, 3]);
  assert.ok(best.every((s) => s.start > now && s.start % (30 * MINUTE) === 0));
  const again = findEducationSlots({ now, camps, bookings: [eBook(EH(20))] });
  assert.notEqual(again[0].start, EH(20));
  const far = findEducationSlots({ now, camps: [eCamp("infantry_camp", ED + 3 * DAY)], bookings: [] });
  assert.equal(far.length, 0);
});

test("education: a Finish-At that would miss the window is flagged, and a fix inside it is offered", () => {
  const win = eduWindow(eBook(EH(20)));
  assert.equal(finishMissesWindow(EH(21, 45), win, EH(17)), true);
  assert.equal(finishMissesWindow(EH(20, 10), win, EH(17)), false);
  assert.equal(finishMissesWindow(EH(19), win, EH(17)), false);
  assert.equal(finishMissesWindow(EH(21, 45), win, EH(21)), false);
  assert.equal(insideFinishTarget(win), EH(20, 3));
  assert.equal(EDU_BUFFER_MS, 5 * MINUTE);
});

test("education: settings and 'done' records round-trip through save/load", async () => {
  const { sanitizeState } = await import("../lib/storage.js");
  const s = emptyState(T0, mkId);
  s.settings.eduPri = "uptime"; s.settings.eduBufferMin = 8; s.settings.eduFinish = "04:45"; s.settings.eduDismiss = { A: true };
  s.accountData.A.campMaxEdu = { infantry_camp: 3 * HOUR, lancer_camp: -4 };
  s.accountData.A.eduDone = { "b1:123": { bridge: T0, buff: T0 + 5, junk: "x" }, bad: 5 };
  const r = sanitizeState(JSON.parse(JSON.stringify(s)), T0, mkId);
  assert.deepEqual([r.settings.eduPri, r.settings.eduBufferMin, r.settings.eduFinish, r.settings.eduDismiss], ["uptime", 8, "04:45", { A: true }]);
  assert.equal(r.accountData.A.campMaxEdu.infantry_camp, 3 * HOUR);
  assert.equal(r.accountData.A.campMaxEdu.lancer_camp, null);
  assert.deepEqual(r.accountData.A.eduDone, { "b1:123": { bridge: T0, buff: T0 + 5 } });
  const junk = sanitizeState({ ...JSON.parse(JSON.stringify(s)), settings: { ...s.settings, eduPri: "bogus", eduBufferMin: 999, eduFinish: "25:99" } }, T0, mkId);
  assert.deepEqual([junk.settings.eduPri, junk.settings.eduBufferMin, junk.settings.eduFinish], ["checkins", 5, null]);
});

test("education: actions are numbered in the timeline itself (Action 1, Action 2)", () => {
  const p = buildEducationPlan({ now: EH(0), booking: eBook(EH(10, 30)), camps: [eCamp("infantry_camp", EH(6, 14), 6 * HOUR, 5 * HOUR)], priority: "uptime" });
  assert.deepEqual(p.timeline.filter((e) => e.kind === "action").map((e) => e.n), [1, 2]);
});

/* ---------- up to 6 accounts ---------- */
test("accounts: up to 6 are supported, each with its own colour, and a 7th is dropped on save", async () => {
  const { sanitizeState } = await import("../lib/storage.js");
  assert.equal(MAX_ACCOUNTS, 6);
  assert.deepEqual(ACCOUNT_COLORS, [1, 2, 3, 4, 5, 6]);
  let accs = [];
  for (let i = 0; i < 7; i++) accs.push(makeAccount({ id: `A${i}`, name: `Acct ${i}` }, accs));
  assert.equal(accs.length, 7);
  assert.deepEqual(accs.slice(0, 6).map((a) => a.color), [1, 2, 3, 4, 5, 6]); // each of the 6 colours used once
  assert.equal(accs[6].color, 1); // the 7th cycles back rather than erroring
  const s = emptyState(T0, mkId);
  s.accounts = normalizeAccounts(accs);
  s.accountData = Object.fromEntries(accs.map((a) => [a.id, emptyAccountData()]));
  const r = sanitizeState(s, T0, mkId);
  assert.equal(r.accounts.length, 6); // capped at save time
  assert.deepEqual(r.accounts.map((a) => a.id), accs.slice(0, 6).map((a) => a.id));
});
