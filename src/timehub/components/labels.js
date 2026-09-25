/* Human labels for agenda items + conversion to calendar entries. */
import { eventName } from "../lib/events.js";
import { rruleFor } from "../lib/ics.js";

/**
 * Title that matches the item's real state:
 * future → "Lancer camp finishes", "Bear Trap begins", "Minister of Education starts";
 * finished → "Lancer camp done". Never "done" for something still ahead.
 */
export function itemTitle(item, t, templates) {
  const past = item.status === "done";
  switch (item.kind) {
    case "event": {
      const ev = item.ref.ev;
      const legion = ev.legion ? ` · ${t("legionN", { n: ev.legion })}` : "";
      const name = eventName(ev, t, templates) + legion;
      return item.status === "upcoming" ? t("eventBegins", { name }) : name;
    }
    case "booking": return item.status === "upcoming" ? t("bookingStarts", { position: t(item.ref.position) }) : t(item.ref.position);
    case "training": return past ? t("campReady", { camp: t(item.ref.category) }) : t("campFinishes", { camp: t(item.ref.category) });
    case "research": return past ? t("researchReady", { place: t(item.ref.category) }) : t("researchFinishes", { place: t(item.ref.category) });
    case "contrib": return t("contribFull");
    case "drop": {
      const d = item.ref.drop;
      return d.kind === "store" ? t("dropStore", { n: d.amount }) : t(d.manual ? "dropTrek" : "dropTrekAuto", { n: d.amount });
    }
    case "stamina": return t("staminaFull");
    case "intel": return t("intelRefresh");
    case "champ": return t("champRound", { n: item.ref.round });
    case "plan": return t("startTrainingAt", { camps: item.ref.camps.map((c) => t(c)).join(", ") });
    default: return "";
  }
}

/** Calendar entry for one agenda item (optionally tagged with the account name). */
export function toCalendarItem(item, t, templates, accountName) {
  const title = itemTitle({ ...item, status: "now" }, t, templates) + (accountName ? ` (${accountName})` : "");
  return { uid: item.id, start: item.start, end: item.end, title, description: "Whiteout Survival · Time Hub" };
}

/** A whole repeating schedule as one calendar entry (cancelled occurrences excluded). */
export function seriesToCalendarItem(ev, t, templates) {
  const rrule = rruleFor(ev.recurrence);
  let r = rrule;
  if (rrule && Number.isFinite(ev.recurrence?.until)) {
    const d = new Date(ev.recurrence.until - 1000);
    const p = (n) => String(n).padStart(2, "0");
    r += `;UNTIL=${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
  }
  const exdates = Object.entries(ev.overrides || {}).filter(([, o]) => o.cancelled || Number.isFinite(o.startAt)).map(([k]) => Number(k));
  return {
    uid: `series:${ev.id}`, start: ev.startAt, end: ev.durationMs ? ev.startAt + ev.durationMs : null,
    title: eventName(ev, t, templates) + (ev.legion ? ` · ${t("legionN", { n: ev.legion })}` : ""), rrule: r, exdates,
    description: "Whiteout Survival · Time Hub",
  };
}
