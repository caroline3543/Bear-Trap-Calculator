/* ============================================================
   ONE shared clock for every widget. A single timer ticks on each
   whole second; all subscribers read the same `now`. The tick only
   triggers re-renders — correctness never depends on it, because
   every countdown is computed from absolute timestamps.
   Returning to the tab/app recalculates immediately.
   ============================================================ */
import { useSyncExternalStore } from "react";

const listeners = new Set();
let now = Date.now();
let timer = null;

function emit() {
  now = Date.now();
  listeners.forEach((l) => l());
}

function schedule() {
  // Align to the next whole second so every countdown flips together (no drift accumulates:
  // each tick re-reads the real clock rather than adding 1000).
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

export function useNow() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
