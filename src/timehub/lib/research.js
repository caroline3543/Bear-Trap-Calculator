/* ============================================================
   RESEARCH → MINISTER BOOKING REMINDERS
   Research (Research Center, Dawn Academy, War Academy) finishing soon is a natural moment to
   have a minister appointment booked, so the player doesn't have to work out on their own which
   30-minute slot to pick. This module only recommends a SLOT (using the app's existing 30-minute
   booking grid) and reports whether the account already has something booked there — it does not
   assert which minister position affects research, since that isn't reliably known; "booked" means
   any booking at all covering the moment, matching the plain "book your minister appointment"
   framing rather than inventing a specific position.
   ============================================================ */
import { MINUTE, HOUR } from "./time.js";
import { slotContaining, bookingCovering, bookingWindow } from "./bookings.js";

/** How close to the end of the recommended slot counts as "cutting it close" — a plain,
 *  disclosed safety margin rather than false precision. */
export const RESEARCH_SLOT_TIGHT_MS = 3 * MINUTE;

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
 * One research timer's reminder, or null if it's too far out, already finished, or the
 * recommended slot isn't a real bookable slot right now (outside the booking window).
 * → { tier: "day"|"soon", finishAt, slot: {start,end,tight}, booked: boolean }
 */
export function researchReminder(timer, bookings, now) {
  const tier = researchReminderTier(timer.endAt, now);
  if (!tier) return null;
  const slot = researchSlotFor(timer.endAt);
  const { from, to } = bookingWindow(now);
  if (slot.start < from || slot.start >= to) return null; // not a slot the app can actually offer
  const booked = !!bookingCovering(bookings, timer.endAt);
  return { tier, finishAt: timer.endAt, slot, booked };
}
