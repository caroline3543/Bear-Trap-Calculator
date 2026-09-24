/* ============================================================
   ALLIANCE CONTRIBUTION ATTEMPTS — anchor model. Pure functions.

   Instead of a ticking counter, we persist a single anchor:
     { count, anchorAt, max, intervalMs, whenFull }
   meaning "at anchorAt the player had `count` attempts, and the refresh
   clock's last tick was at anchorAt". The live count is always derived:

     count(now) = min(max, count + floor((now - anchorAt) / intervalMs))

   So the app can be closed for hours and still show the right number,
   refreshes can never be double-counted, and the count can never pass max.

   `whenFull` is configurable because the exact game rule is unconfirmed:
     "pause"    — refresh clock stops at max; spending restarts a full
                  interval from the moment you spend (default).
     "continue" — clock keeps ticking in the background at max; after
                  spending, the next attempt arrives on the next tick.
   ============================================================ */
import { MINUTE } from "./time.js";

export const DEFAULT_CONTRIB = { count: 20, anchorAt: 0, max: 20, intervalMs: 10 * MINUTE, whenFull: "pause" };

function cfg(state) {
  const max = Math.max(1, Math.floor(state.max || DEFAULT_CONTRIB.max));
  const intervalMs = state.intervalMs > 0 ? state.intervalMs : DEFAULT_CONTRIB.intervalMs;
  const whenFull = state.whenFull === "continue" ? "continue" : "pause";
  return { max, intervalMs, whenFull };
}

/**
 * Derived live state.
 * { count, max, full, gained, nextAt|null, fullAt|null, progress (0..1 toward next) }
 */
export function contribState(state, now) {
  const { max, intervalMs } = cfg(state);
  const base = Math.min(max, Math.max(0, Math.floor(state.count || 0)));
  if (base >= max) return { count: max, max, full: true, gained: 0, nextAt: null, fullAt: null, progress: 1 };
  const elapsed = Math.max(0, now - state.anchorAt);
  const gained = Math.floor(elapsed / intervalMs);
  const count = Math.min(max, base + gained);
  if (count >= max) return { count: max, max, full: true, gained, nextAt: null, fullAt: null, progress: 1 };
  const nextAt = state.anchorAt + (gained + 1) * intervalMs;
  const fullAt = state.anchorAt + (max - base) * intervalMs;
  const progress = Math.min(1, Math.max(0, (now - (nextAt - intervalMs)) / intervalMs));
  return { count, max, full: false, gained, nextAt, fullAt, progress };
}

/** Spend n attempts. Returns the new anchor, or null if not enough attempts. */
export function spendAttempt(state, now, n = 1) {
  const { max, intervalMs, whenFull } = cfg(state);
  const live = contribState(state, now);
  if (live.count < n) return null;
  if (live.full) {
    let anchorAt = now;
    if (whenFull === "continue") {
      const origin = state.anchorAt || now;
      const ticks = Math.floor(Math.max(0, now - origin) / intervalMs);
      anchorAt = origin + ticks * intervalMs;
    }
    return { ...state, count: max - n, anchorAt };
  }
  // Below max: keep the refresh clock's phase — move the anchor forward by the whole ticks already earned.
  return { ...state, count: live.count - n, anchorAt: state.anchorAt + live.gained * intervalMs };
}

/**
 * Manual correction to match the game.
 * nextInMs (optional): time until the game's next refresh. When omitted, a full interval starts now
 * (unless the count is at max). Values are clamped to 0..max and (0, interval].
 */
export function setAttempts(state, now, count, nextInMs) {
  const { max, intervalMs } = cfg(state);
  const c = Math.min(max, Math.max(0, Math.floor(Number(count) || 0)));
  let anchorAt = now;
  if (c < max && nextInMs != null && Number.isFinite(nextInMs)) {
    const n = Math.min(intervalMs, Math.max(1000, nextInMs));
    anchorAt = now + n - intervalMs;
  }
  return { ...state, count: c, anchorAt };
}

/** +/- 1 nudge that keeps the current refresh clock phase. */
export function adjustAttempts(state, now, delta) {
  const { max, intervalMs } = cfg(state);
  const live = contribState(state, now);
  const c = Math.min(max, Math.max(0, live.count + delta));
  if (live.full) return { ...state, count: c, anchorAt: now };
  return { ...state, count: c, anchorAt: state.anchorAt + live.gained * intervalMs };
}

/** Change max / interval / rule while keeping today's live count. */
export function reconfigure(state, now, patch) {
  const live = contribState(state, now);
  const next = { ...state, ...patch };
  const { max } = cfg(next);
  return setAttempts(next, now, Math.min(live.count, max), live.nextAt ? live.nextAt - now : undefined);
}
