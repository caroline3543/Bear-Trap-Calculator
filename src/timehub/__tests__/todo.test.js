/* Round 22: recurring flexible to-dos, lifecycle, Minimum Day, suggestions, ordering. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MINUTE, HOUR, DAY, dayKey } from "../lib/time.js";
import { todayView, setDone, notToday, removeToday, endSeries, placeAt, unplace, dueOn, history, keepTask,
  splitEssentials, todaySummary, remindersDue, snoozeHour, fitsIn, gapHint, whatNow, routineTasks, moveTask,
  toggleSubtask, subDone, cleanTodoFields, scheduledToday, bestOpening, addDays } from "../lib/todo.js";
import { sanitizeState, emptyState } from "../lib/storage.js";

const TZ = "Pacific/Auckland";
const MON = Date.UTC(2026, 8, 27, 20, 0); // Mon 28 Sep 2026 09:00 NZDT (DST began 27 Sep)
const K = dayKey(MON, TZ);
let n = 0; const id = () => `id${++n}`;
const rec = (o = {}) => ({ id: id(), title: "Brush teeth", category: "personal", durationMs: 3 * MINUTE, start: null, end: null, done: false, createdAt: MON - 10 * DAY, repeat: { type: "daily" }, when: "anytime", occ: {}, subtasks: [], ...o });
const one = (o = {}) => ({ id: id(), title: "Post letter", category: "personal", durationMs: 10 * MINUTE, start: null, end: null, done: false, createdAt: MON - DAY, subtasks: [], ...o });

test("recurrence rules: daily, weekdays, weekly, custom; ended series and pre-creation days excluded", () => {
  assert.equal(K, "2026-09-28");
  assert.equal(dueOn(rec(), K), true);
  assert.equal(dueOn(rec({ repeat: { type: "weekdays" } }), K), true);
  assert.equal(dueOn(rec({ repeat: { type: "weekdays" } }), "2026-09-27"), false); // Sunday
  assert.equal(dueOn(rec({ repeat: { type: "weekly", days: [1] } }), K), true);
  assert.equal(dueOn(rec({ repeat: { type: "custom", days: [2, 4] } }), K), false);
  assert.equal(dueOn(rec({ endedOn: K }), K), false);
  assert.equal(dueOn(rec({ createdDay: addDays(K, 1) }), K), false);
});

test("ticking a recurring task completes TODAY only; the definition stays and tomorrow is fresh", () => {
  const t = rec();
  const d = setDone(t, true, MON, TZ);
  assert.equal(d.repeat.type, "daily");
  let v = todayView([d], MON, TZ);
  assert.equal(v.open.length, 0); assert.equal(v.done.length, 1);
  v = todayView([d], MON + DAY, TZ); // next day: clean, no crossed-out leftovers
  assert.equal(v.open.length, 1); assert.equal(v.done.length, 0);
  assert.equal(history([d], MON + DAY, TZ)[0].items[0].state, "done"); // yesterday archived to History
  assert.equal(todayView([setDone(d, false, MON, TZ)], MON, TZ).open.length, 1); // untick works
});

test("Not today hides only today's occurrence (recurring) or moves a one-off to tomorrow — never deletes", () => {
  const r = notToday(rec(), MON, TZ);
  assert.equal(todayView([r], MON, TZ).open.length, 0);
  assert.equal(todayView([r], MON + DAY, TZ).open.length, 1);
  const o = notToday(one(), MON, TZ);
  assert.equal(todayView([o], MON, TZ).skipped.length, 1);
  assert.equal(todayView([o], MON + DAY, TZ).open.length, 1);
  assert.equal(o.deferrals, 1);
});

test("Delete: 'Today's task' vs 'This and future' — history survives an ended series", () => {
  const t = setDone(rec(), true, MON - DAY, TZ);
  const today = removeToday(t, MON, TZ);
  assert.equal(todayView([today], MON, TZ).open.length, 0);
  assert.equal(todayView([today], MON + DAY, TZ).open.length, 1);
  const ended = endSeries(t, MON, TZ);
  assert.equal(todayView([ended], MON, TZ).open.length, 0);
  assert.equal(todayView([ended], MON + 5 * DAY, TZ).open.length, 0);
  assert.equal(history([ended], MON, TZ)[0].items[0].title, "Brush teeth");
  assert.equal(keepTask(ended, MON + 10 * DAY), true);
  assert.equal(keepTask(ended, MON + 40 * DAY), false);
});

test("one-off completed on an earlier day is archived (History), not crossed out on today's list", () => {
  const o = setDone(one(), true, MON - DAY, TZ);
  assert.equal(todayView([o], MON, TZ).done.length, 0);
  assert.equal(history([o], MON, TZ).length, 1);
});

test("retention: open to-dos never silently expire; live recurring definitions never expire", () => {
  assert.equal(keepTask(one({ createdAt: MON - 60 * DAY }), MON), true);
  assert.equal(keepTask(rec({ createdAt: MON - 400 * DAY }), MON), true);
  assert.equal(keepTask(one({ start: MON - 9 * DAY, end: MON - 9 * DAY + HOUR }), MON), false); // old timeline block
});

test("recurring tasks are not forced onto the Timeline; a specific time or an explicit placement is", () => {
  const day = { start: MON - 9 * HOUR, end: MON + 15 * HOUR };
  const anytime = rec();
  const timed = rec({ when: "time", at: "20:00" });
  let placed = placeAt(rec(), MON + HOUR, MON + HOUR + 3 * MINUTE, MON, TZ);
  const v = todayView([anytime, timed, placed], MON, TZ);
  const s = scheduledToday(v, day.start, day.end);
  assert.deepEqual(s.map((x) => x.id), [timed.id, placed.id]);
  assert.equal(todayView([placed], MON + DAY, TZ).open[0].start, null); // placement is for that day only
  assert.equal(unplace(placed).placed, null);
});

test("subtasks of a recurring task reset each day", () => {
  let t = rec({ subtasks: [{ id: "s1", title: "Gather dishes", doneOn: null }] });
  t = toggleSubtask(t, "s1", MON, TZ);
  assert.equal(subDone(t, t.subtasks[0], K), true);
  assert.equal(subDone(t, t.subtasks[0], addDays(K, 1)), false);
});

test("Minimum Day split + neutral today summary", () => {
  const v = todayView([rec({ essential: true }), rec({ title: "Gym" }), setDone(rec({ essential: true }), true, MON, TZ)], MON, TZ);
  const { essentials, rest } = splitEssentials(v.open);
  assert.equal(essentials.length, 1); assert.equal(rest.length, 1);
  assert.deepEqual(todaySummary(v), { completed: 1, open: 2, essentialsLeft: 1 });
});

test("reminders are separate from repeat: none by default; due after their time; snooze an hour", () => {
  const quiet = rec();
  const morning = rec({ reminder: "morning" });
  const v = todayView([quiet, morning], MON, TZ); // 09:00 local
  assert.deepEqual(remindersDue(v, MON, TZ).map((x) => x.id), [morning.id]);
  assert.deepEqual(remindersDue(v, MON - MINUTE, TZ), []);
  const sn = snoozeHour(morning, MON, TZ);
  assert.deepEqual(remindersDue(todayView([sn], MON + 30 * MINUTE, TZ), MON + 30 * MINUTE, TZ), []);
  assert.equal(remindersDue(todayView([sn], MON + 61 * MINUTE, TZ), MON + 61 * MINUTE, TZ).length, 1);
});

test("fitsIn never suggests a task longer than the gap, and needs a duration", () => {
  const list = [one({ title: "Clean apartment", durationMs: 90 * MINUTE }), one({ title: "Shower", durationMs: 15 * MINUTE }), one({ title: "Meds", durationMs: 2 * MINUTE, essential: true }), one({ title: "No length", durationMs: null })];
  assert.deepEqual(fitsIn(list, 23 * MINUTE).map((t) => t.title), ["Meds", "Shower"]);
});

test("gapHint respects the free-time preference (breathing room)", () => {
  const list = [one({ durationMs: 15 * MINUTE })];
  assert.equal(gapHint(list, 23 * MINUTE, "minimal"), null);
  assert.equal(gapHint(list, 23 * MINUTE, "balanced"), null); // < 30m: leave it alone
  assert.equal(gapHint(list, 45 * MINUTE, "balanced").count, 1);
  assert.equal(gapHint(list, 20 * MINUTE, "balanced"), null);
  assert.equal(gapHint(list, 16 * MINUTE, "frequent").count, 1);
  assert.equal(gapHint([one({ durationMs: 40 * MINUTE })], 45 * MINUTE, "balanced"), null); // would fill the gap
});

test("whatNow: at most three picks; low energy keeps essentials/urgent even if high effort", () => {
  const list = [
    one({ title: "Shower", durationMs: 15 * MINUTE, effort: "low" }),
    one({ title: "Meds", durationMs: 2 * MINUTE, essential: true }),
    one({ title: "Tidy room", durationMs: 20 * MINUTE, effort: "medium" }),
    one({ title: "Clean apartment", durationMs: 90 * MINUTE, effort: "high" }),
    one({ title: "Tax form", durationMs: 30 * MINUTE, effort: "high", important: true }),
  ];
  const okay = whatNow(list, 42 * MINUTE, { energy: "okay", now: MON, tz: TZ });
  const titles = [okay.good, okay.tiny, okay.stretch].filter(Boolean).map((t) => t.title);
  assert.ok(titles.length <= 3);
  assert.ok(!titles.includes("Clean apartment")); // doesn't fit 42m
  assert.equal(okay.tiny.title, "Meds");
  const low = whatNow(list, 42 * MINUTE, { energy: "low", now: MON, tz: TZ });
  assert.equal(low.stretch, null);
  assert.equal(low.good.title, "Tax form"); // important + high effort is NOT hidden on low energy
});

test("routines create independent recurring tasks in a named group", () => {
  const tasks = routineTasks({ name: "Morning basics", when: "morning", items: [{ title: "Meds", durationMs: 2 * MINUTE, essential: true }, { title: "Teeth", durationMs: 3 * MINUTE }, { title: " " }] }, MON, TZ, id);
  assert.equal(tasks.length, 2);
  assert.ok(tasks.every((t) => t.group === "Morning basics" && t.repeat.type === "daily" && t.when === "morning"));
  const v = todayView([setDone(tasks[0], true, MON, TZ), tasks[1]], MON, TZ);
  assert.equal(v.open.length, 1); // each item completes on its own
});

test("moveTask: reorder within a section and drag across categories/groups", () => {
  const a = one({ title: "A", order: 0 }), b = one({ title: "B", order: 1 }), c = one({ title: "C", order: 2 });
  let r = moveTask([a, b, c], c.id, { category: "personal", group: null, beforeId: a.id });
  assert.deepEqual([...r].sort((x, y) => x.order - y.order).map((t) => t.title), ["C", "A", "B"]);
  r = moveTask(r, a.id, { category: "work", group: null });
  assert.equal(r.find((t) => t.id === a.id).category, "work");
  r = moveTask(r, b.id, { category: "personal", group: "House" });
  assert.equal(r.find((t) => t.id === b.id).group, "House");
});

test("bestOpening: first gap that fits, flags 'fits now' and what it's before", () => {
  const gaps = [{ start: MON - 30 * MINUTE, ms: 40 * MINUTE, before: "Bear Trap" }, { start: MON + 2 * HOUR, ms: 3 * HOUR }];
  assert.deepEqual(bestOpening(one({ durationMs: 3 * MINUTE }), gaps, MON), { start: MON, now: true, before: "Bear Trap" });
  assert.equal(bestOpening(one({ durationMs: HOUR }), gaps, MON).start, MON + 2 * HOUR);
  assert.equal(bestOpening(one({ durationMs: null }), gaps, MON), null);
});

test("schema: new fields round-trip; junk is cleaned; old tasks behave as before", () => {
  const s = emptyState(MON);
  s.tasks = [
    rec({ id: "r", essential: true, effort: "tiny", group: "Morning basics", reminder: "time", remindAt: "08:30", occ: { [K]: { s: "done", at: MON }, junk: { s: "x" } }, subtasks: [{ id: "s", title: "x", doneOn: K }], createdAt: MON - 400 * DAY }),
    one({ id: "o", repeat: { type: "weekly", days: [] }, when: "time", at: "99:00", effort: "huge" }),
  ];
  const r = sanitizeState(JSON.parse(JSON.stringify(s)), MON);
  const t = r.tasks.find((x) => x.id === "r");
  assert.deepEqual(t.occ, { [K]: { s: "done", at: MON } });
  assert.equal(t.reminder, "time"); assert.equal(t.remindAt, "08:30"); assert.equal(t.effort, "tiny"); assert.equal(t.essential, true);
  const o = r.tasks.find((x) => x.id === "o");
  assert.equal(o.repeat, null); assert.equal(o.when, "anytime"); assert.equal(o.effort, null);
  assert.deepEqual(cleanTodoFields({}).repeat, null);
});

test("Minimum Day, energy and suggestion settings persist (today-scoped values)", () => {
  const s = emptyState(MON);
  s.settings = { ...s.settings, minDay: K, energy: { day: K, level: "low" }, taskSuggest: "minimal", focus: { taskId: "x", startedAt: MON, endsAt: MON + 5 * MINUTE } };
  const r = sanitizeState(JSON.parse(JSON.stringify(s)), MON).settings;
  assert.equal(r.minDay, K); assert.deepEqual(r.energy, { day: K, level: "low" }); assert.equal(r.taskSuggest, "minimal"); assert.equal(r.focus.taskId, "x");
});
