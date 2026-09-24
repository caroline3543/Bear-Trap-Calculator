/* ============================================================
   BUILT-IN EVENT TEMPLATES
   Game facts checked 24 Sep 2026. Times chosen by an alliance or state are
   NOT invented: those templates ship with startAt = null ("Set your time").

   Bear Hunt / Bear Trap — 30-minute hunt, repeatable every 2 days, time set by the
     alliance; since 13 Jan 2025 an alliance can run a second trap for other time zones.
     https://outof.games/realms/whiteoutsurvival/guides/397-everything-you-need-to-know-about-bear-hunt-in-whiteout-survival/
     (BlueStacks guide says "about every 47.5 hours"; we use 2 days, editable.)
   Foundry Battle — once every 14 days; 1-hour battle; 2-day vote on battle time,
     R4/R5 then pick the time at registration; up to 2 Legions.
     https://centurygames.helpshift.com/hc/en/64-whiteout-survival/faq/6576-foundry-schedule/
     https://centurygames.helpshift.com/hc/en/64-whiteout-survival/section/1264-foundry/
     Registration offers FIXED battle-time choices in-game (list below, editable).
   Canyon Clash — monthly; Sat & Sun voting, Mon & Tue registration, Wed matchmaking,
     Thu battle; 1-hour battlefield; up to 2 Legions; R4/R5 choose the final time.
     https://centurygames.helpshift.com/hc/en/64-whiteout-survival/faq/7874-what-is-canyon-clash/
     Battle-time choices: same as Foundry (below).
   Battle-time choices (from Caroline, 24 Sep 2026): Foundry and Canyon 02:00, 12:00, 14:00,
     19:00, 21:00 UTC. Frostfire Mine 02:00, 05:00, 11:00, 14:00, 16:00, 18:00, 21:00 UTC;
     every 2 weeks (often Tuesdays, alternating with Foundry), 30-minute battle.
   SvS / Sunfire Castle — timing varies by state; not verified → no time.
   Daily reset — the game's booking screen labels days in UTC (screenshot, 23 Sep 2026).
   ============================================================ */
import { DAY, HOUR, MINUTE } from "./time.js";

export const TEMPLATES = {
  daily_reset: { nameKey: "tplDailyReset", durationMs: null, recurrence: { type: "daily" }, combat: false, defaultTime: "00:00", enabled: true },
  bear_trap_1: { nameKey: "tplBearTrap1", durationMs: 30 * MINUTE, recurrence: { type: "everyNDays", n: 2 }, combat: true },
  bear_trap_2: { nameKey: "tplBearTrap2", durationMs: 30 * MINUTE, recurrence: { type: "everyNDays", n: 2 }, combat: true },
  foundry: { nameKey: "tplFoundry", durationMs: HOUR, recurrence: { type: "everyNWeeks", n: 2 }, combat: true, timeOptions: "foundry", legion: true },
  canyon_clash: { nameKey: "tplCanyon", durationMs: HOUR, recurrence: { type: "once" }, combat: true, timeOptions: "canyon", legion: true },
  frostfire_mine: { nameKey: "tplFrostfire", durationMs: 30 * MINUTE, recurrence: { type: "everyNWeeks", n: 2 }, combat: true, timeOptions: "frostfire" },
  svs_castle: { nameKey: "tplSvs", durationMs: null, recurrence: { type: "once" }, combat: true },
};

/** Registration time choices (UTC "HH:MM"), user-editable. */
export const DEFAULT_TIME_OPTIONS = {
  foundry: ["02:00", "12:00", "14:00", "19:00", "21:00"],
  canyon: ["02:00", "12:00", "14:00", "19:00", "21:00"],
  frostfire: ["02:00", "05:00", "11:00", "14:00", "16:00", "18:00", "21:00"],
};

export const REMINDER_LEAD_MS = 24 * HOUR;

/** A fresh event built from a template. Only daily reset gets a time (00:00 UTC is a game fact). */
export function eventFromTemplate(templateId, { id, now, accountId = null }) {
  const t = TEMPLATES[templateId];
  let startAt = null;
  if (t.defaultTime === "00:00") startAt = Math.floor(now / DAY) * DAY;
  return {
    id, templateId, name: "", accountId, startAt, durationMs: t.durationMs,
    recurrence: { ...t.recurrence }, combat: t.combat, legion: t.legion ? 1 : null,
    enabled: t.enabled !== false, notes: "", category: "", createdAt: now, archived: false,
    overrides: {}, reminderHidden: false, reminderLeadMs: REMINDER_LEAD_MS,
  };
}

/** Put a template event back to its defaults, keeping its id, account and any time the user set. */
export function restoreTemplate(ev) {
  const t = TEMPLATES[ev.templateId];
  if (!t) return ev;
  return {
    ...ev, name: "", durationMs: t.durationMs, recurrence: { ...t.recurrence }, combat: t.combat,
    legion: t.legion ? (ev.legion || 1) : null, enabled: true, overrides: {}, reminderHidden: false, reminderLeadMs: REMINDER_LEAD_MS,
  };
}

/** First run: only templates with a game-fixed time (daily reset). Everything else is added
 *  from the Add → Event dropdown once the user knows the time. */
export function seedTemplates(now, newId, primaryId) {
  return Object.keys(TEMPLATES)
    .filter((tid) => TEMPLATES[tid].defaultTime)
    .map((tid) => eventFromTemplate(tid, { id: newId(), now, accountId: TEMPLATES[tid].legion ? primaryId : null }));
}
