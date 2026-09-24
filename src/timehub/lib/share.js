/* Alliance share card: one occurrence in UTC plus local times in chosen zones. */
import { formatTime, formatDate } from "./time.js";

/** zones: [{ label, tz }] → [{ label, time, day }] (day shown only if it differs from the UTC date). */
export function shareRows(start, zones, lang = "en") {
  const utcDay = formatDate(start, "UTC", lang);
  return zones.map((z) => {
    const day = formatDate(start, z.tz, lang);
    return { label: z.label, time: formatTime(start, z.tz, lang), day: day === utcDay ? "" : day };
  });
}

/** Plain text for alliance chat. */
export function shareText({ title, start, repeat, zones, lang = "en", state = "" }) {
  const lines = [`${title}${state ? ` · ${state}` : ""}`, `${formatTime(start, "UTC", lang)} UTC · ${formatDate(start, "UTC", lang)}`];
  for (const r of shareRows(start, zones, lang)) lines.push(`${r.label}: ${r.time}${r.day ? ` (${r.day})` : ""}`.replace(/\u00A0/g, " "));
  if (repeat) lines.push(repeat);
  return lines.join("\n");
}
