/* ============================================================
   CALENDAR EXPORT — RFC 5545 .ics + Google Calendar links.
   No backend: files are generated in the browser. Apple Calendar opens .ics
   directly; Google Calendar imports .ics or uses the per-item link.
   ============================================================ */

function pad(n) { return String(n).padStart(2, "0"); }

/** 20260924T190000Z */
export function icsDate(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function escapeText(s) {
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold to 75 octets per line (UTF-8 aware), continuation lines start with a space. */
export function foldLine(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = out.length ? 74 : 75;
    if (bytes + b > limit) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.map((l, i) => (i ? " " + l : l)).join("\r\n");
}

/** Repeating rule for an event recurrence (null for one-offs). */
export function rruleFor(rec) {
  switch (rec?.type) {
    case "daily": return "FREQ=DAILY";
    case "everyNDays": return `FREQ=DAILY;INTERVAL=${rec.n}`;
    case "everyNWeeks": return `FREQ=WEEKLY;INTERVAL=${rec.n}`;
    case "weekly": return `FREQ=WEEKLY;BYDAY=${(rec.weekdays || []).map((d) => ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][d]).join(",")}`;
    default: return null;
  }
}

/**
 * items: [{ uid, start, end?, title, description?, alarmMin?, rrule?, exdates?[] }]
 */
export function buildICS(items, { now = Date.now(), calName = "Time Hub" } = {}) {
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//State 3543//Time Hub//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${escapeText(calName)}`];
  for (const it of items) {
    const end = it.end && it.end > it.start ? it.end : it.start + 5 * 60000;
    L.push("BEGIN:VEVENT");
    L.push(`UID:${String(it.uid).replace(/[^\w.@-]/g, "-")}@timehub`);
    L.push(`DTSTAMP:${icsDate(now)}`);
    L.push(`DTSTART:${icsDate(it.start)}`);
    L.push(`DTEND:${icsDate(end)}`);
    L.push(`SUMMARY:${escapeText(it.title)}`);
    if (it.description) L.push(`DESCRIPTION:${escapeText(it.description)}`);
    if (it.rrule) L.push(`RRULE:${it.rrule}`);
    for (const x of it.exdates || []) L.push(`EXDATE:${icsDate(x)}`);
    if (it.alarmMin > 0) {
      L.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(it.title)}`, `TRIGGER:-PT${Math.round(it.alarmMin)}M`, "END:VALARM");
    }
    L.push("END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return L.map(foldLine).join("\r\n") + "\r\n";
}

export function googleCalendarLink(it) {
  const end = it.end && it.end > it.start ? it.end : it.start + 5 * 60000;
  const q = new URLSearchParams({ action: "TEMPLATE", text: it.title, dates: `${icsDate(it.start)}/${icsDate(end)}`, details: it.description || "" });
  if (it.rrule) q.set("recur", `RRULE:${it.rrule}`);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Browser download helper (no-op outside the browser). */
export function downloadICS(filename, text) {
  if (typeof document === "undefined") return;
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : filename + ".ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
