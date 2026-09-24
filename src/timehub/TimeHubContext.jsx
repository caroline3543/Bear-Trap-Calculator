/* ============================================================
   Context + store (v2). One unified dashboard for every account.
   Wrap any widget in <TimeHubProvider> to use it on its own.
   ============================================================ */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { loadState, saveState, newId } from "./lib/storage.js";
import { deviceTimeZone } from "./lib/time.js";
import { makeT, RTL_LANGS } from "./i18n/index.js";
import { updateAccountData, visibleAccountIds, primaryAccount, emptyAccountData, ALL } from "./lib/accounts.js";
import { TEMPLATES } from "./lib/eventTemplates.js";

const Ctx = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case "update":
      return action.fn(state);
    case "settings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "toggleSection":
      return { ...state, settings: { ...state.settings, collapsed: { ...state.settings.collapsed, [action.id]: !state.settings.collapsed[action.id] } } };
    case "upsert": {
      const list = state[action.collection];
      const exists = list.some((x) => x.id === action.item.id);
      return { ...state, [action.collection]: exists ? list.map((x) => (x.id === action.item.id ? action.item : x)) : [...list, action.item] };
    }
    case "remove":
      return { ...state, [action.collection]: state[action.collection].filter((x) => x.id !== action.id) };
    case "setFriends":
      return { ...state, friends: action.friends.map((f, i) => ({ ...f, order: i })) };
    case "accountData":
      return updateAccountData(state, action.accountId, action.fn);
    default:
      return state;
  }
}

export function TimeHubProvider({ lang = "en", children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState());
  // UI-only state (not saved): rearrange mode and a booking to prefill from a reminder
  const [rearrange, setRearrange] = useState(false);
  const [bookingDraft, setBookingDraft] = useState(null);
  const [trainDraft, setTrainDraft] = useState(null);
  const setTab = useCallback((tab) => {
    dispatch({ type: "settings", patch: { tab } });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const openBooking = useCallback((draft) => {
    dispatch({ type: "settings", patch: { tab: "events" } });
    setBookingDraft({ ...draft, nonce: Date.now() });
    setTimeout(() => document.getElementById("th-sec-bookings")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, []);
  /** From an idle-camps card: open the training form pre-filled on the Timers tab. */
  const startTraining = useCallback((draft) => {
    dispatch({ type: "settings", patch: { tab: "timers" } });
    setTrainDraft({ ...draft, nonce: Date.now() });
    setTimeout(() => document.getElementById("th-sec-training")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, []);

  const value = useMemo(() => {
    const t = makeT(lang);
    const tz = state.settings.displayTz || deviceTimeZone();
    const filter = state.settings.accountFilter;
    const accountIds = visibleAccountIds(state.accounts, filter);
    const primary = primaryAccount(state.accounts);
    const accountById = (id) => state.accounts.find((a) => a.id === id) || null;
    return {
      state, dispatch, lang, t, tz, newId, templates: TEMPLATES,
      dir: RTL_LANGS.has(lang) ? "rtl" : "ltr",
      compact: state.settings.compact,
      accounts: state.accounts, filter, accountIds, primary, accountById,
      multi: state.accounts.length > 1,
      /** Where new items go by default: the filtered account, else the primary one. */
      defaultAccountId: filter !== ALL && accountById(filter) ? filter : primary?.id,
      dataFor: (id) => state.accountData[id] || emptyAccountData(),
      update: (fn) => dispatch({ type: "update", fn }),
      updateAccount: (accountId, fn) => dispatch({ type: "accountData", accountId, fn }),
      setFilter: (f) => dispatch({ type: "settings", patch: { accountFilter: f } }),
      rearrange, setRearrange, bookingDraft, setBookingDraft, openBooking,
      trainDraft, setTrainDraft, startTraining, setTab, tab: state.settings.tab || "today",
    };
  }, [state, lang, rearrange, bookingDraft, openBooking, trainDraft, startTraining, setTab]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTimeHub() {
  const v = useContext(Ctx);
  if (!v) throw new Error("Time Hub widgets must be inside <TimeHubProvider>.");
  return v;
}
