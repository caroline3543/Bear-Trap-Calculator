/* Round 21: proactive relationships — contributions spend, learned maximums, restart summary,
   Education-aware Maximum, VP reminder states, friends × accounts. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MINUTE, HOUR } from "../lib/time.js";
import { spendAll, contribState } from "../lib/contributions.js";
import { learnMax, maxIncreases, applyLearnedMax, resetLearnedMax, learnedKey, restartSummary, defaultTroop, rememberTroops } from "../lib/timers.js";
import { eduAwareMax, eduWindow, EDU_MIN_BRIDGE_MS } from "../lib/education.js";
import { researchReminder, vpReminderKey, researchSlotFor } from "../lib/research.js";
import { eventAccounts, friendsForAccounts, friendDayOffset } from "../lib/friends.js";
import { sanitizeState, emptyState } from "../lib/storage.js";
import { emptyAccountData } from "../lib/accounts.js";

const T0 = Date.UTC(2026, 8, 24, 6, 30); // Thu 24 Sep 2026 06:30 UTC (18:30 NZST)

/* ---------- contributions: Spend all ---------- */
const full = { count: 20, anchorAt: T0 - 5 * HOUR, max: 20, intervalMs: 10 * MINUTE, whenFull: "pause" };

test("spendAll spends every available attempt through the existing regen rule", () => {
  const r = spendAll(full, T0);
  assert.equal(r.spent, 20);
  assert.equal(contribState(r.contrib, T0).count, 0);
  assert.equal(r.nextAt, T0 + 10 * MINUTE); // pause rule: a fresh interval starts on spend
  assert.equal(r.fullAt, T0 + 200 * MINUTE);
  assert.deepEqual(r.contrib.lastSpent, { at: T0, n: 20 });
});

test("spendAll: a second tap before refresh spends nothing (no double spend)", () => {
  const once = spendAll(full, T0);
  assert.equal(spendAll(once.contrib, T0), null);
  assert.equal(spendAll(once.contrib, T0 + 1000), null);
});

test("spendAll on a partly refilled pool spends the live count and keeps the refresh phase", () => {
  const part = { ...full, count: 5, anchorAt: T0 - 25 * MINUTE }; // +2 earned → 7, next tick at T0+5m
  const r = spendAll(part, T0);
  assert.equal(r.spent, 7);
  assert.equal(r.nextAt, T0 + 5 * MINUTE);
});

test("lastSpent survives a save/load round trip", () => {
  const s = emptyState(T0);
  s.accountData.A.contrib = spendAll(full, T0).contrib;
  const back = sanitizeState(JSON.parse(JSON.stringify(s)), T0);
  assert.deepEqual(back.accountData.A.contrib.lastSpent, { at: T0, n: 20 });
});

/* ---------- learned maximum ---------- */
test("learnMax: modest increase adopts silently, big jump asks, shorter/none learns nothing", () => {
  assert.equal(learnMax(12 * HOUR, 13 * HOUR + 20 * MINUTE), "update");
  assert.equal(learnMax(12 * HOUR, 18 * HOUR), "confirm");
  assert.equal(learnMax(12 * HOUR, 11 * HOUR), "none");
  assert.equal(learnMax(12 * HOUR, 12 * HOUR), "none");
  assert.equal(learnMax(null, 20 * HOUR), "none"); // no stored max: a duration isn't proof of a maximum
  assert.equal(learnMax(1 * HOUR, 1 * HOUR + 20 * MINUTE), "update"); // +33% but under 30 min
});

test("maxIncreases is per camp AND per troop type", () => {
  const d = { ...emptyAccountData(), campMax: { infantry_camp: 12 * HOUR, lancer_camp: 12 * HOUR, marksman_camp: 12 * HOUR },
    helios: { classes: ["infantry_camp"], max: { infantry_camp: 14 * HOUR, lancer_camp: null, marksman_camp: null } } };
  const inc = maxIncreases(d, [
    { camp: "infantry_camp", troop: "helios", durationMs: 13 * HOUR }, // below Helios max → nothing
    { camp: "lancer_camp", troop: "normal", durationMs: 13 * HOUR },
  ]);
  assert.equal(inc.length, 1);
  assert.equal(inc[0].camp, "lancer_camp");
  assert.equal(inc[0].prevMs, 12 * HOUR);
});

test("applyLearnedMax updates the right table, turns off 'same for all' when camps now differ, and reset restores the original", () => {
  const d = { ...emptyAccountData(), campSame: true, campMax: { infantry_camp: 12 * HOUR, lancer_camp: 12 * HOUR, marksman_camp: 12 * HOUR },
    helios: { classes: ["marksman_camp"], max: { infantry_camp: null, lancer_camp: null, marksman_camp: 10 * HOUR } } };
  let n = applyLearnedMax(d, [{ camp: "lancer_camp", troop: "normal", prevMs: 12 * HOUR, ms: 13 * HOUR }, { camp: "marksman_camp", troop: "helios", prevMs: 10 * HOUR, ms: 11 * HOUR }], T0);
  assert.equal(n.campMax.lancer_camp, 13 * HOUR);
  assert.equal(n.campMax.infantry_camp, 12 * HOUR);
  assert.equal(n.helios.max.marksman_camp, 11 * HOUR);
  assert.equal(n.campSame, false);
  // learning again keeps the ORIGINAL value as the reset point
  n = applyLearnedMax(n, [{ camp: "lancer_camp", troop: "normal", prevMs: 13 * HOUR, ms: 14 * HOUR }], T0 + 1);
  assert.equal(n.maxLearned[learnedKey("lancer_camp", "normal")].prev, 12 * HOUR);
  const r = resetLearnedMax(n, learnedKey("lancer_camp", "normal"));
  assert.equal(r.campMax.lancer_camp, 12 * HOUR);
  assert.equal(r.maxLearned[learnedKey("lancer_camp", "normal")], undefined);
  assert.equal(resetLearnedMax(r, learnedKey("marksman_camp", "helios")).helios.max.marksman_camp, 10 * HOUR);
});

test("learned maximums and troop choices persist through sanitize", () => {
  const s = emptyState(T0);
  s.accountData.A = { ...s.accountData.A, maxLearned: { "lancer_camp:normal": { prev: 12 * HOUR, at: T0 }, "bogus:x": { prev: 1, at: 1 } }, campTroop: { infantry_camp: "helios", lancer_camp: "weird" } };
  const back = sanitizeState(JSON.parse(JSON.stringify(s)), T0);
  assert.deepEqual(back.accountData.A.maxLearned, { "lancer_camp:normal": { prev: 12 * HOUR, at: T0 } });
  assert.deepEqual(back.accountData.A.campTroop, { infantry_camp: "helios" });
});

test("defaultTroop remembers the player's choice, but never Helios for a camp without Helios", () => {
  const d = { ...emptyAccountData(), helios: { classes: ["infantry_camp"], max: {} } };
  assert.equal(defaultTroop(d, "infantry_camp"), "normal");
  const r = rememberTroops(d, [{ camp: "infantry_camp", troop: "helios" }, { camp: "lancer_camp", troop: "helios" }]);
  assert.equal(defaultTroop(r, "infantry_camp"), "helios");
  assert.equal(defaultTroop(r, "lancer_camp"), "normal");
});

/* ---------- restart summary ---------- */
test("restartSummary: same duration → finishes together; different Helios time → shows separate finishes", () => {
  const same = restartSummary([{ camp: "lancer_camp", troop: "normal", durationMs: 4.5 * HOUR }, { camp: "infantry_camp", troop: "helios", durationMs: 4.5 * HOUR }], T0);
  assert.equal(same.together, true);
  assert.equal(same.finishAt, T0 + 4.5 * HOUR);
  assert.equal(same.rows[0].camp, "infantry_camp"); // camp order, not input order
  const diff = restartSummary([{ camp: "infantry_camp", troop: "helios", durationMs: 9 * HOUR }, { camp: "lancer_camp", durationMs: 8 * HOUR }], T0);
  assert.equal(diff.together, false);
  assert.equal(diff.finishAt, null);
  assert.equal(diff.rows[1].troop, "normal");
});

/* ---------- Education-aware Maximum ---------- */
const eduB = { id: "e", position: "minister_education", startAt: T0 + 3 * HOUR + 30 * MINUTE };
const win = eduWindow(eduB, 5 * MINUTE);

test("eduAwareMax: Maximum would run through Education → train just until it, restart with the buff", () => {
  const r = eduAwareMax(T0, 8 * HOUR, win);
  assert.equal(r.kind, "bridge");
  assert.equal(r.readyAt, win.ready);
  assert.equal(r.trainFor, win.ready - T0);
  assert.equal(r.restartAt, eduB.startAt);
});

test("eduAwareMax: no advice when Maximum is already fine", () => {
  assert.equal(eduAwareMax(T0, 2 * HOUR, win), null); // ready before Education
  assert.equal(eduAwareMax(T0, 3 * HOUR + 40 * MINUTE, win), null); // lands inside the window
  assert.equal(eduAwareMax(eduB.startAt + MINUTE, 8 * HOUR, win), null); // window running: restart now uses it
  assert.equal(eduAwareMax(T0, 8 * HOUR, null), null);
});

test("eduAwareMax: too little time for a worthwhile short run → wait for Education", () => {
  const now = win.ready - (EDU_MIN_BRIDGE_MS - MINUTE);
  assert.deepEqual(eduAwareMax(now, 8 * HOUR, win), { kind: "wait", restartAt: eduB.startAt });
});

/* ---------- VP reminder states ---------- */
test("VP reminder: PENDING → DISMISSED (this occurrence only) → a moved slot is a new occurrence; BOOKED wins", () => {
  const timer = { id: "r1", kind: "research", category: "research_center", endAt: T0 + 5 * HOUR + 17 * MINUTE };
  const r = researchReminder(timer, [], T0);
  assert.equal(r.status, "pending");
  assert.equal(r.key, vpReminderKey(timer, researchSlotFor(timer.endAt).start));
  const dismissed = { [r.key]: T0 };
  assert.equal(researchReminder(timer, [], T0, dismissed).status, "dismissed");
  // other research timers are unaffected
  assert.equal(researchReminder({ ...timer, id: "r2" }, [], T0, dismissed).status, "pending");
  // research estimate moves an hour → different slot → reminder is back
  assert.equal(researchReminder({ ...timer, endAt: timer.endAt + HOUR }, [], T0, dismissed).status, "pending");
  // a real VP booking covering it is BOOKED, regardless of dismissal
  const vp = [{ id: "b", position: "vice_president", startAt: researchSlotFor(timer.endAt).start }];
  assert.equal(researchReminder(timer, vp, T0, dismissed).status, "booked");
});

test("vpDismiss persists through sanitize", () => {
  const s = emptyState(T0);
  s.accountData.A.vpDismiss = { "r1@123": T0 };
  assert.deepEqual(sanitizeState(JSON.parse(JSON.stringify(s)), T0).accountData.A.vpDismiss, { "r1@123": T0 });
});

/* ---------- friends × accounts ---------- */
const friends = [
  { id: "1", name: "Jax", tz: "America/Los_Angeles", accounts: ["A", "F1"] },
  { id: "2", name: "TJ", tz: "Europe/London", accounts: ["A"] },
  { id: "3", name: "Mia", tz: "Asia/Tokyo", accounts: ["F5"] },
  { id: "4", name: "Old", tz: "Europe/Paris", accounts: [] },
];

test("friendsForAccounts: only friends linked to a participating account; unlinked friends are never global", () => {
  assert.deepEqual(friendsForAccounts(friends, ["A", "F1", "F3"]).map((f) => f.name), ["Jax", "TJ"]);
  assert.deepEqual(friendsForAccounts(friends, ["F1"]).map((f) => f.name), ["Jax"]);
  assert.deepEqual(friendsForAccounts(friends, ["F3"]), []);
});

test("eventAccounts: an account-specific event only involves that account", () => {
  assert.deepEqual(eventAccounts({ accountId: "F1" }, ["A", "F1"]), ["F1"]);
  assert.deepEqual(eventAccounts({ accountId: null }, ["A", "F1"]), ["A", "F1"]);
  assert.deepEqual(eventAccounts({ accountId: "F9" }, ["A"]), []);
});

test("friendDayOffset: 23:30 NZ Thursday is Thursday morning in LA? no — Thursday 03:30 → same day; Tokyo sees the next day at NZ 03:30", () => {
  const nz = "Pacific/Auckland";
  // Thu 24 Sep 10:30 UTC = Thu 22:30 NZST = Thu 03:30 PDT = Thu 19:30 JST
  const at = Date.UTC(2026, 8, 24, 10, 30);
  assert.equal(friendDayOffset(at, "America/Los_Angeles", nz), 0);
  assert.equal(friendDayOffset(at, "Asia/Tokyo", nz), 0);
  // Thu 24 Sep 12:30 UTC = Fri 00:30 NZST, Thu 05:30 PDT → LA is "yesterday" relative to NZ
  assert.equal(friendDayOffset(Date.UTC(2026, 8, 24, 12, 30), "America/Los_Angeles", nz), -1);
  // Thu 24 Sep 20:00 UTC = Fri 08:00 NZST... Kiritimati (UTC+14) = Fri 10:00 → same; use Honolulu? check +1:
  // Thu 24 Sep 11:30 UTC = Thu 23:30 NZST = Fri 00:30 in Kiritimati (UTC+14)
  assert.equal(friendDayOffset(Date.UTC(2026, 8, 24, 11, 30), "Pacific/Kiritimati", nz), 1);
});

test("friend account links persist, and links to deleted accounts are dropped", () => {
  const s = emptyState(T0);
  s.friends = [{ id: "f", name: "Jax", tz: "America/Los_Angeles", accounts: ["A", "GONE", "A"] }, { id: "g", name: "Old", tz: "Europe/Paris" }];
  const back = sanitizeState(JSON.parse(JSON.stringify(s)), T0);
  assert.deepEqual(back.friends[0].accounts, ["A"]);
  assert.deepEqual(back.friends[1].accounts, []);
});

test("an Education plan reminder keeps its edu flag", () => {
  const s = emptyState(T0);
  s.accountData.A.plans = [{ id: "p", camps: ["infantry_camp"], startAt: T0 + HOUR, target: T0 + 9 * HOUR, edu: true }];
  assert.equal(sanitizeState(JSON.parse(JSON.stringify(s)), T0).accountData.A.plans[0].edu, true);
});

/* ---------- round 23: "Don't remind me" scopes ---------- */
import { computeReminders } from "../lib/reminders.js";
test("Don't remind me: per account and per type, never global by accident; event scope unchanged", () => {
  const s = emptyState(T0);
  s.accounts = [{ id: "A", name: "A" }, { id: "B", name: "B" }];
  s.events = [{ id: "e", templateId: "bear_trap_1", name: "", accountId: null, startAt: T0 + 3 * HOUR, durationMs: 30 * MINUTE, recurrence: { type: "everyNDays", n: 2 }, combat: true, enabled: true, archived: false, overrides: {}, reminderHidden: false, reminderLeadMs: 24 * HOUR }];
  s.accountData = { A: { bookings: [] }, B: { bookings: [] } };
  const accs = (st) => [...new Set(computeReminders(st, T0, ["A", "B"]).map((r) => r.accountId))];
  assert.deepEqual(accs(s), ["A", "B"]);
  assert.deepEqual(accs({ ...s, settings: { ...s.settings, ministerMute: { accounts: ["B"], combat: false } } }), ["A"]);
  assert.deepEqual(accs({ ...s, settings: { ...s.settings, ministerMute: { accounts: [], combat: true } } }), []);
  assert.deepEqual(accs({ ...s, events: [{ ...s.events[0], reminderHidden: true }] }), []);
  const back = sanitizeState(JSON.parse(JSON.stringify({ ...s, settings: { ...s.settings, ministerMute: { accounts: ["B", "B", 3], combat: "yes" } } })), T0);
  assert.deepEqual(back.settings.ministerMute, { accounts: ["B"], combat: false });
});

import { idleUntilWake } from "../lib/sleep.js";
test("idleUntilWake: a batch ending at 6:14 while asleep idles until wake-up; daytime finishes don't", () => {
  const tz = "Pacific/Auckland";
  const sleep = { start: "23:00", end: "08:00", target: "21:45" };
  const at614 = Date.UTC(2026, 9, 5, 17, 14); // Tue 6 Oct 06:14 NZDT
  const r = idleUntilWake(at614, tz, sleep);
  assert.equal(r.idleMs, 106 * MINUTE); // 1h 46m
  assert.equal(r.wakeAt, Date.UTC(2026, 9, 5, 19, 0)); // 08:00 NZDT
  assert.equal(idleUntilWake(Date.UTC(2026, 9, 5, 22, 0), tz, sleep), null); // 11:00 — awake
  assert.equal(idleUntilWake(Date.UTC(2026, 9, 5, 18, 50), tz, sleep), null); // 07:50 — only 10m
});

import { groupVpReminders } from "../lib/research.js";
test("VP reminders: same account + same slot → ONE booking covering both researches", () => {
  const T = Date.UTC(2026, 9, 6, 0, 0);
  const war = { id: "w", kind: "research", category: "war_academy", endAt: T + 39 * MINUTE };
  const rc = { id: "r", kind: "research", category: "research_center", endAt: T + 43 * MINUTE };
  const other = { id: "o", kind: "research", category: "research_center", endAt: T + 17 * HOUR + 14 * MINUTE };
  const now = T - 5 * HOUR;
  const e = (acc, x) => ({ acc, x, r: researchReminder(x, [], now) });
  const g = groupVpReminders([e("A", rc), e("A", war), e("B", war), e("A", other)].filter((x) => x.r));
  const a = g.filter((x) => x.acc === "A");
  assert.equal(a[0].slot.start, T + 30 * MINUTE);
  assert.deepEqual(a[0].items.map((i) => i.x.id), ["w", "r"]); // covers both, earliest finish first
  assert.equal(a[0].keys.length, 2);
  assert.equal(g.filter((x) => x.acc === "B").length, 1); // other account stays separate
});
