/* ============================================================
   DAILY RESOURCES — Chief stamina + free daily drops (UTC).
   Figures supplied by Caroline (Sep 2026):
   • Stamina: +1 every 5 min (12/h). Passive regen stops at 200.
     More can be held (≈500 with items) but regen doesn't run above 200.
   • Storehouse: 120 stamina at 00:00 UTC and 12:00 UTC (claim by hand).
   • Tundra Trek supplies: 40 free a day — 20 at 00:00 UTC (automatic),
     10 at 08:00 UTC and 10 at 16:00 UTC (claim from the Trek / Dawn Academy screen).
     Gems can buy up to 20 more (4 × 5).
   Change the numbers here if the game changes them.
   ============================================================ */
import { MINUTE, HOUR, DAY } from "./time.js";

export const STAMINA_REGEN_MS = 5 * MINUTE;
export const STAMINA_CAP = 200;
export const STAMINA_MAX_HELD = 500;

/** Free drops per UTC day. `manual` ones must be claimed in-game. */
export const DAILY_DROPS = [
  { id: "store0", kind: "store", hour: 0, amount: 120, manual: true },
  { id: "store12", kind: "store", hour: 12, amount: 120, manual: true },
  { id: "trek0", kind: "trek", hour: 0, amount: 20, manual: false },
  { id: "trek8", kind: "trek", hour: 8, amount: 10, manual: true },
  { id: "trek16", kind: "trek", hour: 16, amount: 10, manual: true },
];

/**
 * Stamina right now from the last value the player entered.
 * st = { value, at } → { value, fullAt (when it reaches 200, or null), over (above 200), atCap }
 */
export function staminaNow(st, now) {
  if (!st || !Number.isFinite(st.value) || !Number.isFinite(st.at)) return null;
  if (st.value >= STAMINA_CAP) return { value: Math.min(st.value, STAMINA_MAX_HELD), fullAt: null, over: st.value > STAMINA_CAP, atCap: true };
  const gained = Math.max(0, Math.floor((now - st.at) / STAMINA_REGEN_MS));
  const value = Math.min(STAMINA_CAP, st.value + gained);
  const fullAt = st.at + (STAMINA_CAP - st.value) * STAMINA_REGEN_MS;
  return { value, fullAt, over: false, atCap: value >= STAMINA_CAP };
}

/** Key for one drop on one UTC day, e.g. "trek8@2026-09-24". */
export function dropKey(drop, at) {
  return `${drop.id}@${new Date(at).toISOString().slice(0, 10)}`;
}

/** All drops whose time is in [from, to). → [{ ...drop, at, key }] sorted by time. */
export function dropsBetween(from, to) {
  const out = [];
  for (let day = Math.floor(from / DAY) * DAY; day < to; day += DAY) {
    for (const d of DAILY_DROPS) {
      const at = day + d.hour * HOUR;
      if (at >= from && at < to) out.push({ ...d, at, key: dropKey(d, at) });
    }
  }
  return out.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

/**
 * Status of a drop for one account:
 *  "upcoming" | "auto" (automatic, already given) | "ready" (claimable, not yet claimed) | "claimed"
 * A manual drop stays claimable until the same drop comes round again (24 h).
 */
export function dropStatus(drop, claims, now) {
  if (now < drop.at) return "upcoming";
  if (!drop.manual) return "auto";
  if (claims?.[drop.key]) return "claimed";
  return now < drop.at + DAY ? "ready" : "missed";
}

/** The most recent hand-claim drop of this kind that has already happened. */
export function latestManualDrop(kind, now) {
  const past = dropsBetween(now - DAY, now + 1).filter((d) => d.kind === kind && d.manual && d.at <= now);
  return past[past.length - 1] || null;
}

/** Is this the drop the player should still act on? (only the newest one of each kind nags) */
export function isCurrentDrop(d, now) {
  if (d.at > now) return true;
  return latestManualDrop(d.kind, now)?.key === d.key;
}

/** Manual drops that are claimable now (newest of each kind) or due within `soonMs`, for the given accounts. */
export function dropsNeedingAction(state, accountIds, now, soonMs = 30 * MINUTE) {
  const out = [];
  for (const d of dropsBetween(now - DAY, now + soonMs)) {
    if (!d.manual || !isCurrentDrop(d, now)) continue;
    const accs = accountIds.filter((a) => {
      const s = dropStatus(d, state.accountData[a]?.claims, now);
      return s === "ready" || s === "upcoming";
    });
    if (accs.length) out.push({ drop: d, accounts: accs, status: now < d.at ? "upcoming" : "ready" });
  }
  return out;
}

/** Keep only claims from the last 3 days. */
export function pruneClaims(claims, now) {
  const keep = {};
  for (const [k, v] of Object.entries(claims || {})) if (Number.isFinite(v) && now - v < 3 * DAY) keep[k] = v;
  return keep;
}
