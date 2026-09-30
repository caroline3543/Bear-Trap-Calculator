/* ============================================================
   RESEARCH → VICE PRESIDENT BOOKING REMINDER
   In Whiteout Survival, the Vice President minister position gives +10% research speed while
   active. Time Hub already knows when a research timer is expected to finish, so it proactively
   works out which 30-minute booking slot that lines up with, using the app's existing 30-minute
   booking grid and its existing booking records — never a second, parallel booking system.

   The +10% buff's effect on the FINISH time itself is deliberately NOT modelled: the app has no
   speed/capacity formula (the same reasoning as the Ministry of Education planner), so a research
   timer's `endAt` is used as given, labelled as the current estimate rather than a corrected one.

   "Booked" is derived, not stored: it's true exactly when a Vice-President booking already covers
   the recommended slot's moment. If research timing later drifts to a different slot, any nearby
   Vice-President booking that no longer covers the new slot is surfaced as a possible conflict,
   without ever silently moving or cancelling a booking the player made in the game.
   ============================================================ */
import { MINUTE, HOUR } from "./time.js";
import { slotContaining, bookingCovering, bookingWindow } from "./bookings.js";

export const VP_POSITION = "vice_president";

/** How close to the end of the recommended slot counts as "cutting it close" — a plain,
 *  disclosed safety margin rather than false precision. */
export const RESEARCH_SLOT_TIGHT_MS = 3 * MINUTE;

/** A nearby Vice-President booking counts as a possible conflict candidate within this window —
 *  wide enough to catch "the player booked for the old estimate", narrow enough not to flag an
 *  unrelated booking made for a different reason entirely. */
export const VP_CONFLICT_WINDOW_MS = 6 * HOUR;

/** The recommended 30-minute booking slot for a research finishing at `finishAt`, and whether
 *  it's uncomfortably close to the slot's edge. */
export function researchSlotFor(finishAt) {
  const start = slotContaining(finishAt);
  const end = start + 30 * MINUTE;
  return { start, end, tight: end - finishAt <= RESEARCH_SLOT_TIGHT_MS };
}

/** Stable reminder tiers so a research reminder doesn't flicker in and out of view every minute:
 *  "day" from 24h out, "soon" from 3h out, else null (not yet worth mentioning). */
export function researchReminderTier(finishAt, now) {
  const left = finishAt - now;
  if (left <= 0) return null;
  if (left <= 3 * HOUR) return "soon";
  if (left <= 24 * HOUR) return "day";
  return null;
}

/**
 * One research timer's Vice-President reminder, or null if it's too far out, already finished, or
 * the recommended slot isn't a real bookable slot right now (outside the app's booking window).
 * → { tier, finishAt, slot: {start,end,tight}, booked: boolean, conflict: booking|null }
 *   conflict — a Vice-President booking that exists nearby but does not cover the recommended
 *   slot (only set when `booked` is false): "your booking may need updating".
 */
export function researchReminder(timer, bookings, now) {
  const tier = researchReminderTier(timer.endAt, now);
  if (!tier) return null;
  const slot = researchSlotFor(timer.endAt);
  const { from, to } = bookingWindow(now);
  if (slot.start < from || slot.start >= to) return null; // not a slot the app can actually offer
  const vp = (bookings || []).filter((b) => b.position === VP_POSITION);
  const booked = !!bookingCovering(vp, timer.endAt);
  const conflict = booked ? null : vp.find((b) => Math.abs(b.startAt - slot.start) <= VP_CONFLICT_WINDOW_MS && b.startAt !== slot.start) || null;
  return { tier, finishAt: timer.endAt, slot, booked, conflict };
}
