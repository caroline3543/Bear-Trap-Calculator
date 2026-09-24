/* ============================================================
   COMBAT REMINDERS — "have you booked a minister for this event?"
   Tracked per occurrence × account: key = eventId|occurrenceStart|accountId
   Stored state: { state: "booked"|"dismissed", buff: "strategy"|"defense"|"neither"|"unsure" }
   A reminder only shows while a covering slot can actually be booked
   (inside the booking window and not yet started), from `lead` before the event.
   ============================================================ */
import { occurrencesBetween, isScheduled } from "./events.js";
import { bookingWindow, bookingCovering, slotContaining } from "./bookings.js";
import { REMINDER_LEAD_MS } from "./eventTemplates.js";
import { DAY } from "./time.js";

export const BUFF_CHOICES = ["strategy", "defense", "neither", "unsure"];

export function reminderKey(eventId, occStart, accountId) {
  return `${eventId}|${occStart}|${accountId}`;
}

/**
 * Reminders relevant now for the given accounts.
 * → [{ key, ev, occ, accountId, status, buff, booking }]
 *   status: "open" | "unsure" | "booked" | "covered" | "dismissed"
 */
export function computeReminders(state, now, accountIds) {
  const out = [];
  const { to } = bookingWindow(now);
  for (const ev of state.events) {
    if (!ev.combat || ev.reminderHidden || ev.archived || !isScheduled(ev)) continue;
    const lead = ev.reminderLeadMs > 0 ? ev.reminderLeadMs : REMINDER_LEAD_MS;
    const accs = ev.accountId ? accountIds.filter((a) => a === ev.accountId) : accountIds;
    if (!accs.length) continue;
    for (const occ of occurrencesBetween(ev, now, now + Math.max(lead, 2 * DAY))) {
      if (occ.start <= now || now < occ.start - lead) continue;
      for (const accountId of accs) {
        const bookings = state.accountData[accountId]?.bookings || [];
        const booking = bookingCovering(bookings, occ.start);
        const saved = state.reminders?.[reminderKey(ev.id, occ.key, accountId)];
        const slot = slotContaining(occ.start);
        const bookable = slot > now && slot < to;
        let status;
        if (saved?.state === "dismissed") status = "dismissed";
        else if (saved?.state === "booked") status = saved.buff === "unsure" ? "unsure" : "booked";
        else if (booking) status = "covered";
        else if (bookable) status = "open";
        else continue; // can't be booked yet / any more → stay quiet
        out.push({ key: reminderKey(ev.id, occ.key, accountId), ev, occ, accountId, status, buff: saved?.buff || null, booking });
      }
    }
  }
  return out.sort((a, b) => a.occ.start - b.occ.start || a.key.localeCompare(b.key));
}

export function needsAttention(reminders) {
  return reminders.filter((r) => r.status === "open" || r.status === "unsure");
}

/** Preselect a buff from a covering booking (the user still confirms). */
export function suggestedBuff(booking) {
  if (!booking) return null;
  if (booking.position === "minister_strategy") return "strategy";
  if (booking.position === "minister_defense") return "defense";
  return null;
}
