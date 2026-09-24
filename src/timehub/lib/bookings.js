/* ============================================================
   MINISTER BOOKINGS v2 — mirrors the in-game appointment screen.
   From Caroline's screenshot (23 Sep 2026): every position uses the same
   booking screen — a UTC date header ("UTC: 2026/09/23") with a swap button
   for the other day, and fixed 30-minute UTC slots (07:00–07:30, 07:30–08:00…).
   Booking: { id, position, startAt (UTC, on :00/:30), notes, createdAt, eventRef? }
   The app is a planner: it never claims a position was granted in-game.
   ============================================================ */
import { DAY, MINUTE } from "./time.js";

export const BOOKING_MS = 30 * MINUTE;
export const SLOT_MS = 30 * MINUTE;
export const SLOTS_PER_DAY = 48;

/** Same booking screen for every position; effects only where verified. */
export const MINISTER_POSITIONS = ["vice_president", "minister_education", "minister_strategy", "minister_defense"];
export const POSITION_EFFECT = {
  minister_defense: "effectDefense", // "Appointment-based Troop's Lethality +15.00%" (screenshot)
  minister_strategy: "effectStrategy", // attack; percentage not verified, so none shown
};

/** Bookable days: the current UTC date and the next one (day boundary = 00:00 UTC). One place to change it. */
export const BOOKABLE_DAYS = 2;
export function bookingWindow(now) {
  const from = Math.floor(now / DAY) * DAY;
  return { from, to: from + BOOKABLE_DAYS * DAY };
}

export function isSlotStart(ms) {
  return Number.isFinite(ms) && ms % SLOT_MS === 0;
}

export function slotContaining(ms) {
  return Math.floor(ms / SLOT_MS) * SLOT_MS;
}

/** All 48 slots of a UTC day with availability. A slot is open only if it hasn't started yet
 *  (the in-game list hides the slot already under way). */
export function daySlots(dayStart, now) {
  const { to } = bookingWindow(now);
  return Array.from({ length: SLOTS_PER_DAY }, (_, i) => {
    const start = dayStart + i * SLOT_MS;
    return { start, end: start + SLOT_MS, open: start > now && start < to };
  });
}

export function bookingEnd(b) {
  return b.startAt + BOOKING_MS;
}

/** "upcoming" | "active" | "expired" (expires exactly at +30 min). */
export function bookingStatus(b, now) {
  if (now < b.startAt) return "upcoming";
  if (now < bookingEnd(b)) return "active";
  return "expired";
}

/** Old v1 bookings may start off the :00/:30 grid — kept, shown as "custom time". */
export function isCustomTime(b) {
  return !isSlotStart(b.startAt);
}

/**
 * Conflicts for a candidate inside ONE account's bookings:
 *  duplicates: same position, overlapping window → blocked
 *  otherPositions: a different position at an overlapping time → warning, can save anyway
 */
export function findConflicts(candidate, existing) {
  const s = candidate.startAt;
  const e = s + BOOKING_MS;
  const overl = existing.filter((b) => b.id !== candidate.id && b.startAt < e && s < bookingEnd(b));
  return {
    duplicates: overl.filter((b) => b.position === candidate.position),
    otherPositions: overl.filter((b) => b.position !== candidate.position),
  };
}

/** Kept for compatibility: same-position overlaps. */
export function findOverlaps(candidate, existing) {
  return findConflicts(candidate, existing).duplicates;
}

export function validateBooking(draft, now) {
  const errors = {};
  if (!MINISTER_POSITIONS.includes(draft.position)) errors.position = "errPosition";
  if (!Number.isFinite(draft.startAt)) errors.startAt = "errSlot";
  else if (!isSlotStart(draft.startAt)) errors.startAt = "errSlot";
  else {
    const { from, to } = bookingWindow(now);
    if (draft.startAt < from || draft.startAt >= to) errors.startAt = "errSlotWindow";
    else if (draft.startAt <= now) errors.startAt = "errSlotPast";
  }
  return errors;
}

/** A booking of this account that covers instant `ms` (optionally limited to positions). */
export function bookingCovering(bookings, ms, positions) {
  return bookings.find((b) => b.startAt <= ms && ms < bookingEnd(b) && (!positions || positions.includes(b.position))) || null;
}

export function partitionBookings(bookings, now) {
  const current = [];
  const expired = [];
  for (const b of bookings) (bookingStatus(b, now) === "expired" ? expired : current).push(b);
  const byTime = (a, b) => a.startAt - b.startAt || (a.createdAt || 0) - (b.createdAt || 0) || String(a.id).localeCompare(String(b.id));
  current.sort(byTime);
  expired.sort((a, b) => -byTime(a, b));
  return { current, expired };
}
