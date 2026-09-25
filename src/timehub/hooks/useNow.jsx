/* ============================================================
   ONE shared clock for every widget. A single timer ticks on each
   whole second; all subscribers read the same `now`.
   • useNow()    — changes every second (countdowns).
   • useMinute() — changes once a minute (lists, schedules, "needs you"),
                   so heavy screens don't rebuild every second.
   • Screens that are hidden (other tabs) stop ticking via <ActiveTab>.
   Correctness never depends on the tick: every countdown is computed
   from absolute timestamps, and returning to the app recalculates at once.
   ============================================================ */
import React, { createContext, useContext, useSyncExternalStore } from "react";

const listeners = new Set();
let now = Date.now();
let timer = null;

function emit() {
  now = Date.now();
  listeners.forEach((l) => l());
}

function schedule() {
  timer = setTimeout(() => {
    emit();
    schedule();
  }, 1000 - (Date.now() % 1000) + 5);
}

function onWake() {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  emit();
}

function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) {
    schedule();
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onWake);
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onWake);
      window.addEventListener("pageshow", onWake);
    }
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(timer);
      timer = null;
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onWake);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onWake);
        window.removeEventListener("pageshow", onWake);
      }
    }
  };
}
const noSubscribe = () => () => {};

const getSnapshot = () => now;
const getMinute = () => Math.floor(now / 60000) * 60000;

/** False inside a tab that isn't showing: its clocks pause until you come back. */
const ActiveCtx = createContext(true);
export function ActiveTab({ active, children }) {
  return <ActiveCtx.Provider value={active}>{children}</ActiveCtx.Provider>;
}

export function useNow() {
  const active = useContext(ActiveCtx);
  return useSyncExternalStore(active ? subscribe : noSubscribe, getSnapshot, getSnapshot);
}

export function useMinute() {
  const active = useContext(ActiveCtx);
  return useSyncExternalStore(active ? subscribe : noSubscribe, getMinute, getMinute);
}
