/* ============================================================
   FRIENDS × ACCOUNTS — which friends matter for which event.
   A friend is linked to the accounts the player plays with them on (any number). A friend with
   no linked accounts is simply not surfaced on events — never treated as global.
   ============================================================ */
import { zonedParts, DAY } from "./time.js";

/** Accounts taking part in an event: its own account if it has one, otherwise every shown
 *  account (the same rule the minister reminders use). */
export function eventAccounts(ev, accountIds) {
  if (!ev) return [];
  return ev.accountId ? accountIds.filter((a) => a === ev.accountId) : [...accountIds];
}

/** Friends linked to at least one of these accounts, in the player's own friend order. */
export function friendsForAccounts(friends, accountIds) {
  const set = new Set(accountIds);
  return (friends || []).filter((f) => (f.accounts || []).some((a) => set.has(a)));
}

/** Calendar-day difference of one instant as seen by the friend vs. the player:
 *  0 same date, +1 their tomorrow, −1 their yesterday. */
export function friendDayOffset(instant, friendTz, userTz) {
  const f = zonedParts(instant, friendTz);
  const u = zonedParts(instant, userTz);
  return Math.round((Date.UTC(f.year, f.month - 1, f.day) - Date.UTC(u.year, u.month - 1, u.day)) / DAY);
}

/** Keeps friends whose accounts are still valid; drops ids of deleted accounts. */
export function cleanFriendAccounts(list, accountIds) {
  if (!Array.isArray(list)) return [];
  const ok = new Set(accountIds);
  return [...new Set(list.filter((a) => typeof a === "string" && ok.has(a)))];
}
