import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeState, loadState, saveState, emptyState, migrateV1, STORAGE_KEY } from "../lib/storage.js";
import { TEMPLATES } from "../lib/eventTemplates.js";
import { SECTION_IDS } from "../lib/layout.js";

const NOW = Date.UTC(2026, 8, 24, 6, 0);
let n = 0;
const mkId = () => `id${++n}`;

function memStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
}

test("empty / corrupt storage gives a fresh v2 state with one Main account and only daily reset", () => {
  for (const s of [loadState(memStorage(), NOW), loadState(memStorage({ [STORAGE_KEY]: "{bad" }), NOW), loadState(null, NOW)]) {
    assert.equal(s.version, 2);
    assert.deepEqual(s.accounts.map((a) => [a.id, a.name, a.isPrimary]), [["A", "Main Account", true]]);
    assert.deepEqual(s.events.map((e) => e.templateId), ["daily_reset"]); // no invented times, no placeholders
    assert.deepEqual(s.settings.layout, SECTION_IDS);
  }
});

const V1 = {
  version: 1,
  settings: { displayTz: "Pacific/Auckland", compact: true, collapsed: { research: true } },
  events: [
    { id: "e1", name: "Bear Trap", startAt: NOW + 3600000, durationMs: 1800000, repeat: "daily", createdAt: 1 },
    { id: "e2", name: "", startAt: 5 },
  ],
  friends: [{ id: "f1", name: "Sam", tz: "America/Chicago", order: 0 }],
  accounts: {
    A: { bookings: [{ id: "b1", position: "vice_president", startAt: NOW + 12 * 60000 }], timers: [{ id: "t1", kind: "training", category: "lancer_camp", label: "T10", endAt: NOW + 1e6, startedAt: NOW }], contrib: { count: 7, anchorAt: NOW, max: 20, intervalMs: 600000 } },
    B: { bookings: [], timers: [{ id: "t2", kind: "research", category: "war_academy", endAt: NOW + 5e6 }], contrib: { count: 20 } },
  },
};

test("v1 → v2 migration keeps every valid item and names the accounts", () => {
  const s = sanitizeState(structuredClone(V1), NOW, mkId);
  assert.equal(s.version, 2);
  assert.deepEqual(s.accounts.map((a) => [a.id, a.name, a.type, a.isPrimary]), [["A", "Main Account", "main", true], ["B", "Farm Account", "farm", false]]);
  assert.notEqual(s.accounts[0].color, s.accounts[1].color);
  assert.equal(s.accountData.A.bookings[0].id, "b1"); // off-grid booking kept (shown as custom time)
  assert.equal(s.accountData.A.timers[0].label, "T10"); // old label kept in storage
  assert.equal(s.accountData.A.contrib.count, 7);
  assert.equal(s.accountData.B.timers[0].id, "t2");
  const e1 = s.events.find((e) => e.id === "e1");
  assert.deepEqual(e1.recurrence, { type: "daily" });
  assert.equal(e1.accountId, null);
  assert.equal(s.events.find((e) => e.id === "e2"), undefined); // was invalid in v1 too
  assert.ok(!s.events.some((e) => e.templateId && e.startAt == null)); // no unset placeholders
  assert.equal(s.settings.displayTz, "Pacific/Auckland");
  assert.equal(s.settings.collapsed.research, true);
  assert.equal(s.friends[0].name, "Sam");
  // round trip is stable
  assert.deepEqual(sanitizeState(JSON.parse(JSON.stringify(s)), NOW, mkId), s);
});

test("migration of corrupt v1 pieces never throws", () => {
  const s = migrateV1({ accounts: { A: "junk", B: null }, events: "nope" }, NOW, mkId);
  const clean = sanitizeState(s, NOW, mkId);
  assert.deepEqual(clean.accounts.map((a) => a.id), ["A"]);
});

test("v2 sanitising drops invalid pieces individually", () => {
  const base = emptyState(NOW, mkId);
  const raw = {
    ...base,
    accounts: [...base.accounts, { id: "B", name: "Farm", type: "farm", color: 9 }, { id: "A", name: "dup" }],
    accountData: { A: { bookings: [{ id: "x", position: "king", startAt: 1 }], timers: [{ id: "u", kind: "cooking", endAt: 1 }], campMax: { infantry_camp: -5, lancer_camp: 3600000 } } },
    events: [...base.events, { id: "c1", name: "Custom", startAt: NOW, accountId: "ghost", recurrence: { type: "everyNDays", n: 0 } }],
    timeOptions: { foundry: ["19:00", "2:00", "25:00", "19:00"] },
    reminders: { "c1|123|A": { state: "booked", buff: "bogus" }, bad: { state: "booked" } },
    settings: { ...base.settings, layout: ["friends", "nope", "friends"], accountFilter: "ghost" },
  };
  const s = sanitizeState(raw, NOW, mkId);
  assert.deepEqual(s.accounts.map((a) => a.id), ["A", "B"]);
  assert.equal(s.accounts[1].color, 1);
  assert.deepEqual(s.accountData.A.bookings, []);
  assert.deepEqual(s.accountData.A.timers, []);
  assert.deepEqual(s.accountData.A.campMax, { infantry_camp: null, lancer_camp: 3600000, marksman_camp: null });
  const c1 = s.events.find((e) => e.id === "c1");
  assert.equal(c1.accountId, null);
  assert.deepEqual(c1.recurrence, { type: "everyNDays", n: 2 });
  assert.deepEqual(s.timeOptions.foundry, ["02:00", "19:00"]);
  assert.deepEqual(s.reminders, { "c1|123|A": { state: "booked", buff: "unsure" } });
  assert.ok(s.settings.layout.includes("friends"));
  assert.equal(s.settings.layout.length, SECTION_IDS.length);
  assert.equal(s.settings.accountFilter, "all");
});

test("save/load round trip under the namespaced key only", () => {
  const st = memStorage({ bearTrapCalculator: "calculator data" });
  const state = emptyState(NOW, mkId);
  assert.equal(saveState(state, st), true);
  assert.equal(st.m.get("bearTrapCalculator"), "calculator data");
  assert.deepEqual(loadState(st, NOW), state);
  assert.equal(saveState(state, { setItem() { throw new Error("quota"); } }), false);
});
