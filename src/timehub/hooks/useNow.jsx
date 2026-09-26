/* ============================================================
   ONE shared clock for every widget. A single timer ticks on each
   whole second; all subscribers read the same `now`.
   • useNow()          — every second. Only the small countdown texts use it.
   • useMinute()       — once a minute (lists, "in 3h 42m", schedules).
   • useClockFor(ts[]) — re-renders only when the minute changes OR one of the
                         given timestamps is crossed (a timer finishing, an event
                         starting), so widgets update exactly when their state changes.
   • Screens that are hidden (other tabs) stop ticking via <ActiveTab>.
   Correctness never depends on the tick: every countdown is computed
   from absolute timestamps, and returning to the app recalculates at once.
   ============================================================ */
import React, { createContext, useCallback, useContext, useLayoutEffect, useRef, useSyncExternalStore } from "react";

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

const getSnapshot = () => now;
const getMinute = () => Math.floor(now / 60000) * 60000;

/**
 * Hidden tabs don't tick, and showing a tab costs almost nothing:
 * the gate object is stable (flipping it never re-renders the tab), hidden clocks simply don't
 * notify, and on reveal each clock is poked once — React then re-renders only the pieces whose
 * value actually changed (countdown texts; minute-level widgets only if the minute moved).
 * The hidden tab's DOM stays untouched while hidden, so the browser can reuse its layout.
 */
const ActiveCtx = createContext(null);
export function ActiveTab({ active, children }) {
  const gate = useRef(null);
  if (!gate.current) gate.current = { active, listeners: new Set() };
  gate.current.active = active;
  useLayoutEffect(() => {
    if (active) gate.current.listeners.forEach((l) => l());
  }, [active]);
  return <ActiveCtx.Provider value={gate.current}>{children}</ActiveCtx.Provider>;
}

function useGatedSubscribe() {
  const gate = useContext(ActiveCtx);
  return useCallback((listener) => {
    if (!gate) return subscribe(listener);
    const wrapped = () => { if (gate.active) listener(); };
    gate.listeners.add(listener);
    const off = subscribe(wrapped);
    return () => { gate.listeners.delete(listener); off(); };
  }, [gate]);
}

export function useNow() {
  return useSyncExternalStore(useGatedSubscribe(), getSnapshot, getSnapshot);
}

export function useMinute() {
  return useSyncExternalStore(useGatedSubscribe(), getMinute, getMinute);
}

/**
 * Re-render when the minute changes or when `now` passes any of `times` (ms timestamps).
 * Returns the current time. Use this for status (ready / started / done), and put the
 * per-second text in <Remaining>.
 */
export function useClockFor(times) {
  const sub = useGatedSubscribe();
  const snap = () => {
    let crossed = 0;
    for (const t of times) if (Number.isFinite(t) && t <= now) crossed++;
    return Math.floor(now / 60000) * 1000 + crossed;
  };
  useSyncExternalStore(sub, snap, snap);
  return now;
}

/** The current time without subscribing (for one-off reads in handlers/initial state). */
export function nowOnce() {
  return Date.now();
}
