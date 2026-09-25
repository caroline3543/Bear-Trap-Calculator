/* ============================================================
   ALLIANCE CHAMPIONSHIP (prep phase) — for the leader in charge.
   Every two weeks. Prep rounds in UTC, from the Thursday it starts
   (times supplied by Caroline, Sep 2026):
     Round 1  Thu 00:00 – Thu 11:00
     Round 2  Thu 12:00 – Fri 00:00
     Round 3  Fri 01:00 – Fri 12:00
     Round 4  Fri 13:00 – Sat 00:00
     Round 5  Sat 01:00 – Sat 12:00
   Which Thursday starts a championship week isn't guessed: the leader picks it once
   (settings.champ.anchor = that Thursday 00:00 UTC); the app repeats every 14 days.
   ============================================================ */
import { HOUR, DAY } from "./time.js";

export const CHAMP_CYCLE_MS = 14 * DAY;
/** [start, end] in hours after Thursday 00:00 UTC. */
export const PREP_ROUNDS = [[0, 11], [12, 24], [25, 36], [37, 48], [49, 60]];

export function isThursdayStart(ms) {
  return Number.isFinite(ms) && ms % DAY === 0 && new Date(ms).getUTCDay() === 4;
}

/** The next `n` Thursdays 00:00 UTC from `now` (this week's if it hasn't finished its prep yet). */
export function upcomingThursdays(now, n = 2) {
  const day = Math.floor(now / DAY) * DAY;
  const back = (new Date(day).getUTCDay() - 4 + 7) % 7;
  let thu = day - back * DAY;
  if (thu + 60 * HOUR <= now) thu += 7 * DAY;
  return Array.from({ length: n }, (_, i) => thu + i * 7 * DAY);
}

/** Prep rounds overlapping [from, to). → [{ round, start, end, key }] */
export function champRounds(anchor, from, to) {
  if (!isThursdayStart(anchor)) return [];
  const out = [];
  let k = Math.floor((from - 60 * HOUR - anchor) / CHAMP_CYCLE_MS);
  for (let cycle = anchor + k * CHAMP_CYCLE_MS; cycle < to; cycle += CHAMP_CYCLE_MS) {
    PREP_ROUNDS.forEach(([a, b], i) => {
      const start = cycle + a * HOUR;
      const end = cycle + b * HOUR;
      if (end > from && start < to) out.push({ round: i + 1, start, end, key: `champ${i + 1}@${new Date(cycle).toISOString().slice(0, 10)}` });
    });
  }
  return out;
}
