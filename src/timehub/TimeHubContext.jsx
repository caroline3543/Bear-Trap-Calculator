/* ============================================================
   Context + store (v2). One unified dashboard for every account.
   Wrap any widget in <TimeHubProvider> to use it on its own.
   ============================================================ */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { setFeedbackPrefs } from "./lib/feedback.js";
import { loadState, saveState, newId } from "./lib/storage.js";
import { deviceTimeZone } from "./lib/time.js";
import { makeT, RTL_LANGS } from "./i18n/index.js";
import { updateAccountData, visibleAccountIds, primaryAccount, emptyAccountData, ALL } from "./lib/accounts.js";
import { TEMPLATES } from "./lib/eventTemplates.js";

const Ctx = createContext(null);
const TAB_KEY = "timehub:tab";
/** The open tab lives in its own context so switching tabs only re-renders the tab bar and panels. */
const TabCtx = createContext({ tab: "today", setTab: () => {} });
export function useTab() {
  return useContext(TabCtx);
}

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
  // Tab switches paint instantly (local state); remembering the tab happens in the background.
  // (stored under its own key so a tab switch never re-renders the other tabs)
  const [tab, setTabState] = useState(() => {
    try { return localStorage.getItem(TAB_KEY) || state.settings.tab || "today"; } catch { return state.settings.tab || "today"; }
  });
  const setTab = useCallback((next) => {
    setTabState(next);
    try { localStorage.setItem(TAB_KEY, next); } catch { /* private mode */ }
  }, []);

  // Save a moment after the last change (not on every tap), and always before the page goes away.
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    const id = setTimeout(() => saveState(latest.current), 400);
    return () => clearTimeout(id);
  }, [state]);
  useEffect(() => {
    const flush = () => saveState(latest.current);
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  useEffect(() => {
    setFeedbackPrefs({ haptics: state.settings.haptics !== false });
  }, [state.settings.haptics]);

  const openBooking = useCallback((draft) => {
    setTab("events");
    setBookingDraft({ ...draft, nonce: Date.now() });
    setTimeout(() => document.getElementById("th-sec-bookings")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, []);
  /** From an idle-camps card: open the training form pre-filled on the Timers tab. */
  const startTraining = useCallback((draft) => {
    setTab("timers");
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
      trainDraft, setTrainDraft, startTraining, setTab,
    };
  }, [state, lang, rearrange, bookingDraft, openBooking, trainDraft, startTraining, setTab]);

  const tabValue = useMemo(() => ({ tab, setTab }), [tab, setTab]);
  return (
    <Ctx.Provider value={value}>
      <TabCtx.Provider value={tabValue}>{children}</TabCtx.Provider>
    </Ctx.Provider>
  );
}

export function useTimeHub() {
  const v = useContext(Ctx);
  if (!v) throw new Error("Time Hub widgets must be inside <TimeHubProvider>.");
  return v;
}
