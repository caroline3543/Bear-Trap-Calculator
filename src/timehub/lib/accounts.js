/* ============================================================
   ACCOUNTS — any number of game accounts in one dashboard.
   Account: { id, name, type: "main"|"farm"|"other", color: 1..6, notes, isPrimary, order }
   Colour is only ever a secondary cue: every tag also shows the name.
   The 6 colours are CSS variables (--acct-1 … --acct-6) in timehub.css.
   ============================================================ */
export const ACCOUNT_COLORS = [1, 2, 3, 4, 5, 6];
/** Players can have up to 4 accounts. */
export const MAX_ACCOUNTS = 4;
export const ACCOUNT_TYPES = ["main", "farm", "other"];
export const ALL = "all";

export function emptyAccountData() {
  return {
    bookings: [],
    timers: [],
    contrib: { count: 20, anchorAt: 0, max: 20, intervalMs: 10 * 60000, whenFull: "pause" },
    campMax: { infantry_camp: null, lancer_camp: null, marksman_camp: null },
    plans: [],
    lastEnded: {},
    stamina: null,
    claims: {},
    helios: { classes: [], max: { infantry_camp: null, lancer_camp: null, marksman_camp: null } },
  };
}

export function makeAccount(partial, existing = []) {
  const used = new Set(existing.map((a) => a.color));
  const color = partial.color || ACCOUNT_COLORS.find((c) => !used.has(c)) || ((existing.length % 6) + 1);
  return {
    id: partial.id,
    name: (partial.name || "").trim() || "Account",
    type: ACCOUNT_TYPES.includes(partial.type) ? partial.type : "other",
    color,
    notes: partial.notes || "",
    icon: partial.icon || "",
    isPrimary: !!partial.isPrimary,
    order: partial.order ?? existing.length,
  };
}

/** Exactly one primary, dense order. */
export function normalizeAccounts(list) {
  const sorted = [...list].sort((a, b) => a.order - b.order).map((a, i) => ({ ...a, order: i }));
  const pIdx = sorted.findIndex((a) => a.isPrimary);
  return sorted.map((a, i) => ({ ...a, isPrimary: i === (pIdx === -1 ? 0 : pIdx) }));
}

export function primaryAccount(accounts) {
  return accounts.find((a) => a.isPrimary) || accounts[0] || null;
}

/** Account ids visible under a filter ("all" or an id). Unknown ids fall back to all. */
export function visibleAccountIds(accounts, filter) {
  if (filter && filter !== ALL && accounts.some((a) => a.id === filter)) return [filter];
  return accounts.map((a) => a.id);
}

/** Does an item with this accountId (null = shared) show under the filter? */
export function matchesFilter(accountId, accounts, filter) {
  if (accountId == null) return true;
  return visibleAccountIds(accounts, filter).includes(accountId);
}

/** Pure update of ONE account's data; every other account is returned by reference untouched. */
export function updateAccountData(state, accountId, fn) {
  if (!state.accounts.some((a) => a.id === accountId)) return state;
  const cur = state.accountData[accountId] || emptyAccountData();
  return { ...state, accountData: { ...state.accountData, [accountId]: fn(cur) } };
}

/** Remove an account and everything tied to it. Refuses to remove the last account. */
export function deleteAccount(state, accountId) {
  if (state.accounts.length <= 1) return state;
  const accounts = normalizeAccounts(state.accounts.filter((a) => a.id !== accountId));
  const { [accountId]: _gone, ...accountData } = state.accountData;
  const reminders = Object.fromEntries(Object.entries(state.reminders || {}).filter(([k]) => !k.endsWith(`|${accountId}`)));
  return {
    ...state, accounts, accountData, reminders,
    events: state.events.filter((e) => e.accountId !== accountId),
    settings: { ...state.settings, accountFilter: state.settings.accountFilter === accountId ? ALL : state.settings.accountFilter },
  };
}

export function accountUsage(state, accountId) {
  const d = state.accountData[accountId] || emptyAccountData();
  return { bookings: d.bookings.length, timers: d.timers.length, events: state.events.filter((e) => e.accountId === accountId).length };
}
