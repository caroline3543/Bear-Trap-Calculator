/* ============================================================
   AGENDA — one list of everything with a time, used by Next up,
   the Today card and calendar export.
   Item: { id, kind, start, end|null, accountId|null, ref, status }
     kind: "event" | "booking" | "training" | "research" | "contrib" | "plan"
   ============================================================ */
import { occurrencesBetween, JUST_STARTED_MS } from "./events.js";
import { bookingEnd } from "./bookings.js";
import { contribState } from "./contributions.js";
import { dropsBetween, dropStatus, staminaNow, isCurrentDrop, intelRefreshesBetween, intelPeriod } from "./daily.js";
import { champRounds } from "./championship.js";

function statusOf(start, end, now) {
  const e = end ?? start + JUST_STARTED_MS;
  if (now >= e) return "done";
  if (now >= start) return "now";
  return "upcoming";
}

/** Everything touching [from, to) for the given account ids (shared events always included). */
/** What the player chose to track (⚙ → What to track). Missing keys mean "yes". */
export function tracking(state) {
  const t = state.settings?.track || {};
  return { reset: t.reset !== false, store: t.store !== false, trek: t.trek !== false, stamina: t.stamina !== false, contrib: t.contrib !== false, intel: t.intel !== false };
}

export function buildAgenda(state, from, to, accountIds, now) {
  const items = [];
  const acc = new Set(accountIds);
  const track = tracking(state);
  for (const ev of state.events) {
    if (ev.archived || (ev.accountId && !acc.has(ev.accountId))) continue;
    if (!track.reset && ev.templateId === "daily_reset") continue;
    for (const o of occurrencesBetween(ev, from, to - 1)) {
      if ((o.end ?? o.start) < from && o.start < from) continue;
      items.push({ id: `ev:${ev.id}:${o.key}`, kind: "event", start: o.start, end: o.end, accountId: ev.accountId, ref: { ev, occ: o }, status: statusOf(o.start, o.end, now) });
    }
  }
  for (const id of accountIds) {
    const d = state.accountData[id];
    if (!d) continue;
    for (const b of d.bookings) {
      const end = bookingEnd(b);
      if (end <= from || b.startAt >= to) continue;
      items.push({ id: `bk:${b.id}`, kind: "booking", start: b.startAt, end, accountId: id, ref: b, status: statusOf(b.startAt, end, now) });
    }
    for (const t of d.timers) {
      if (t.endAt < from || t.endAt >= to) continue;
      items.push({ id: `tm:${t.id}`, kind: t.kind, start: t.endAt, end: null, accountId: id, ref: t, status: now >= t.endAt ? "done" : "upcoming" });
    }
    for (const p of d.plans || []) {
      if (p.startAt < from || p.startAt >= to) continue;
      items.push({ id: `pl:${p.id}`, kind: "plan", start: p.startAt, end: null, accountId: id, ref: p, status: now >= p.startAt ? "done" : "upcoming" });
    }
    const c = contribState(d.contrib, now);
    if (track.contrib && !c.full && c.fullAt >= from && c.fullAt < to) {
      items.push({ id: `ct:${id}`, kind: "contrib", start: c.fullAt, end: null, accountId: id, ref: c, status: "upcoming" });
    }
  }
  // free daily drops (shared by every account; claim state is per account)
  for (const d of dropsBetween(from, to)) {
    if (!track[d.kind]) continue;
    const st = accountIds.map((a) => dropStatus(d, state.accountData[a]?.claims, now));
    const allDone = st.every((x) => x === "auto" || x === "claimed" || x === "missed") || !isCurrentDrop(d, now);
    items.push({ id: `dr:${d.key}`, kind: "drop", start: d.at, end: null, accountId: null, ref: { drop: d, statuses: st }, status: now < d.at ? "upcoming" : allDone ? "done" : "now" });
  }
  // Lighthouse intel refreshes (shared; "cleared" is per account)
  if (track.intel) {
    for (const at of intelRefreshesBetween(from, to)) {
      const period = intelPeriod(at);
      items.push({ id: `in:${at}`, kind: "intel", start: at, end: null, accountId: null, ref: { at, key: period.key }, status: now < at ? "upcoming" : now < period.next ? "now" : "done" });
    }
  }
  // Alliance Championship prep rounds (only for the leader in charge)
  const champ = state.settings?.champ;
  if (champ?.leader && champ.anchor) {
    for (const r of champRounds(champ.anchor, from, to)) {
      items.push({ id: `ch:${r.key}`, kind: "champ", start: r.start, end: r.end, accountId: null, ref: r, status: now < r.start ? "upcoming" : now < r.end ? "now" : "done" });
    }
  }
  // stamina reaching the passive-regen cap (per account)
  for (const id of track.stamina ? accountIds : []) {
    const sn = staminaNow(state.accountData[id]?.stamina, now);
    if (sn && sn.fullAt && sn.fullAt >= from && sn.fullAt < to) {
      items.push({ id: `st:${id}`, kind: "stamina", start: sn.fullAt, end: null, accountId: id, ref: sn, status: now >= sn.fullAt ? "done" : "upcoming" });
    }
  }
  return items.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}

/**
 * Lifecycle-aware hero:
 *   completed / expired → never shown
 *   active (an event or booking under way) → primary, as "Active"
 *   upcoming → next, by its next relevant timestamp
 * Contributions are a status widget, not a "next" item.
 * → { primary: { item, phase: "active" | "upcoming" } | null, then: item | null, live: item[] }
 */
export function nextUp(items, now) {
  const eligible = items.filter((i) => i.kind !== "contrib");
  const live = eligible.filter((i) => i.status === "now" && (i.kind === "event" || i.kind === "booking"));
  const upcoming = eligible.filter((i) => i.start > now);
  if (live.length) {
    const act = [...live].sort((a, b) => (a.end ?? Infinity) - (b.end ?? Infinity))[0];
    return { primary: { item: act, phase: "active" }, then: upcoming[0] || null, live, next: upcoming[0] || null };
  }
  return { primary: upcoming[0] ? { item: upcoming[0], phase: "upcoming" } : null, then: upcoming[1] || null, live, next: upcoming[0] || null };
}
