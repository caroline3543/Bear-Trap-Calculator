/* ============================================================
   TIME — UTC parsing, IANA-zone formatting, duration parsing.
   Every scheduled instant in the Time Hub is an absolute epoch-ms
   number (UTC). Zones are only used when *displaying* an instant.
   ============================================================ */

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/** Build an epoch-ms instant from explicit UTC date ("YYYY-MM-DD") and time ("HH:MM[:SS]") fields.
 *  Returns null for anything invalid (including impossible dates like 2026-02-30). */
export function parseUtcInput(dateStr, timeStr) {
  const d = DATE_RE.exec(String(dateStr || "").trim());
  const t = TIME_RE.exec(String(timeStr || "").trim());
  if (!d || !t) return null;
  const [y, mo, da] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const [h, mi, s] = [Number(t[1]), Number(t[2]), Number(t[3] || 0)];
  if (mo < 1 || mo > 12 || da < 1 || da > 31 || h > 23 || mi > 59 || s > 59) return null;
  const ms = Date.UTC(y, mo - 1, da, h, mi, s);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== da) return null;
  return ms;
}

/** Split an instant back into UTC form fields (for editing). */
export function toUtcFields(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return {
    date: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`,
    time: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`,
  };
}

export function isValidTimeZone(tz) {
  if (!tz || typeof tz !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function allTimeZones() {
  try {
    if (typeof Intl.supportedValuesOf === "function") return Intl.supportedValuesOf("timeZone");
  } catch {
    /* fall through */
  }
  return ["UTC"];
}

/** Map app language → Intl locale. Arabic keeps Latin digits so times read like the game. */
export function intlLocale(lang) {
  return lang === "ar" ? "ar-u-nu-latn" : lang || "en";
}

const dtfCache = new Map();
/** Cached Intl.DateTimeFormat. `id` is a cheap cache key (avoids JSON-stringifying options on every call). */
function dtf(locale, opts, id) {
  const key = id ? `${id}|${locale}|${opts.timeZone || ""}` : locale + JSON.stringify(opts);
  let f = dtfCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, opts);
    dtfCache.set(key, f);
  }
  return f;
}

/* Results of pure time functions are memoised (same inputs → same answer, so nothing can go
   stale — a zone's DST rule is part of the input instant). Bounded so memory stays flat. */
function memo(limit = 3000) {
  const m = new Map();
  return (key, compute) => {
    let v = m.get(key);
    if (v === undefined) {
      v = compute();
      if (m.size >= limit) m.clear();
      m.set(key, v);
    }
    return v;
  };
}
const partsMemo = memo();
const timeMemo = memo();
const dateMemo = memo();

/** Wall-clock parts of an instant in a zone (numbers). */
export function zonedParts(ms, tz) {
  return partsMemo(`${tz}|${ms}`, () => zonedPartsRaw(ms, tz));
}
function zonedPartsRaw(ms, tz) {
  const parts = dtf("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
  }, "parts").formatToParts(new Date(ms));
  const o = {};
  for (const p of parts) o[p.type] = p.value;
  return {
    year: Number(o.year), month: Number(o.month), day: Number(o.day),
    hour: Number(o.hour) % 24, minute: Number(o.minute), second: Number(o.second), weekday: o.weekday,
  };
}

/** Calendar-day key in a zone, e.g. "2026-09-24" — used to decide when to show dates. */
export function dayKey(ms, tz) {
  const p = zonedParts(ms, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Whole-day difference between two instants' calendar dates in a zone (b - a). */
export function calendarDayDiff(a, b, tz) {
  const ka = dayKey(a, tz).split("-").map(Number);
  const kb = dayKey(b, tz).split("-").map(Number);
  return Math.round((Date.UTC(kb[0], kb[1] - 1, kb[2]) - Date.UTC(ka[0], ka[1] - 1, ka[2])) / DAY);
}

/** UTC (the game's clock) is always 24-hour; every local/other-zone time is 12-hour. */
export function formatTime(ms, tz, lang) {
  return timeMemo(`${lang}|${tz}|${ms}`, () => {
    if (tz === "UTC") return dtf(intlLocale(lang), { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, "t24").format(new Date(ms));
    return dtf(intlLocale(lang), { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }, "t12").format(new Date(ms)).replace(/[ \u202F]/g, "\u00A0");
  });
}

/** Live clock with seconds (12-hour for local, 24-hour for UTC). */
export function formatClock(ms, tz, lang) {
  if (tz === "UTC") return dtf(intlLocale(lang), { timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }, "c24").format(new Date(ms));
  return dtf(intlLocale(lang), { timeZone: tz, hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }, "c12").format(new Date(ms)).replace(/[ \u202F]/g, "\u00A0");
}

export function formatDate(ms, tz, lang) {
  return dateMemo(`${lang}|${tz}|${ms}`, () => dtf(intlLocale(lang), { timeZone: tz, weekday: "short", day: "numeric", month: "short" }, "date").format(new Date(ms)));
}

/** "GMT+13" style label for a zone at a given instant (reflects DST at that instant). */
export function offsetLabel(tz, ms = Date.now()) {
  try {
    const parts = dtf("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date(ms));
    const name = parts.find((p) => p.type === "timeZoneName");
    return name ? name.value.replace(/^GMT$/, "GMT+0") : "";
  } catch {
    return "";
  }
}

/** Offset of a zone from UTC in minutes at an instant. */
export function offsetMinutes(tz, ms) {
  const p = zonedParts(ms, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / MINUTE);
}

/** "America/Los_Angeles" → "Los Angeles" */
export function zoneCity(tz) {
  if (!tz) return "";
  if (tz === "UTC" || tz === "Etc/UTC") return "UTC";
  const last = tz.split("/").pop();
  return last.replace(/_/g, " ");
}

/* ---------- Durations ---------- */

/** Parse durations the way players copy them from the game.
 *  Accepts: "1d 03:12:44", "03:12:44", "3:12" (h:mm), "2h 30m", "90m", "1d2h", "45s", "1 d 4 h".
 *  Returns ms, or null if unparseable / not positive. */
export function parseDuration(input) {
  const s = String(input || "").trim().toLowerCase();
  if (!s) return null;
  let total = 0;
  let rest = s;
  const dayPrefix = /^(\d+)\s*d\s*/.exec(rest);
  if (dayPrefix && /\d+:\d/.test(rest)) {
    total += Number(dayPrefix[1]) * DAY;
    rest = rest.slice(dayPrefix[0].length);
  }
  if (/^\d+(:\d{1,2}){1,2}$/.test(rest)) {
    const nums = rest.split(":").map(Number);
    if (nums.slice(1).some((n) => n > 59)) return null;
    const [h, m, sec = 0] = nums;
    total += h * HOUR + m * MINUTE + sec * SECOND;
    return total > 0 ? total : null;
  }
  if (dayPrefix && total > 0) return null;
  const unitRe = /(\d+(?:\.\d+)?)\s*(d|h|m|s)/g;
  let matched = "";
  let m;
  while ((m = unitRe.exec(s))) {
    const n = Number(m[1]);
    total += n * { d: DAY, h: HOUR, m: MINUTE, s: SECOND }[m[2]];
    matched += m[0];
  }
  if (!matched || s.replace(/\s+/g, "") !== matched.replace(/\s+/g, "")) {
    if (/^\d+$/.test(s)) return Number(s) > 0 ? Number(s) * MINUTE : null; // bare number = minutes
    return null;
  }
  total = Math.round(total);
  return total > 0 ? total : null;
}

/** Break a (non-negative) ms span into d/h/m/s. Negative input is treated as 0. */
export function splitDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** Round a remaining-time span UP to the next whole second so a countdown
 *  never shows 0 while the deadline is still in the future. */
export function ceilSeconds(ms) {
  return ms <= 0 ? 0 : Math.ceil(ms / 1000) * 1000;
}

const nfCache = new Map();
function unitFmt(lang, unit) {
  const key = lang + unit;
  let f = nfCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(intlLocale(lang), { style: "unit", unit, unitDisplay: "narrow" });
    nfCache.set(key, f);
  }
  return f;
}

/** Compact localized countdown for lists: "2d 4h", "4h 13m", "13m 5s", "45s", "0s". */
export function formatCountdown(ms, lang = "en") {
  const { days, hours, minutes, seconds } = splitDuration(ceilSeconds(ms));
  const u = (n, unit) => unitFmt(lang, unit).format(n);
  if (days > 0) return hours ? `${u(days, "day")} ${u(hours, "hour")}` : u(days, "day");
  if (hours > 0) return `${u(hours, "hour")} ${u(minutes, "minute")}`;
  if (minutes > 0) return `${u(minutes, "minute")} ${u(seconds, "second")}`;
  return u(seconds, "second");
}

/** Large clock-style countdown: "04:13:05", or "1d 04:13:05" beyond a day. */
export function formatCountdownClock(ms, lang = "en") {
  const { days, hours, minutes, seconds } = splitDuration(ceilSeconds(ms));
  const p = (n) => String(n).padStart(2, "0");
  const clock = `${p(hours)}:${p(minutes)}:${p(seconds)}`;
  return days > 0 ? `${unitFmt(lang, "day").format(days)} ${clock}` : clock;
}

/** Game-style duration for editing forms: "1d 03:12:44" / "03:12:44". */
export function formatDurationInput(ms) {
  const { days, hours, minutes, seconds } = splitDuration(ms);
  const p = (n) => String(n).padStart(2, "0");
  const clock = `${p(hours)}:${p(minutes)}:${p(seconds)}`;
  return days > 0 ? `${days}d ${clock}` : clock;
}

/** "3h" / "5h 30m" style span for zone differences (minutes, sign ignored). */
export function formatHoursMinutes(mins, lang = "en") {
  const a = Math.abs(Math.round(mins));
  const h = Math.floor(a / 60);
  const m = a % 60;
  if (h && m) return `${unitFmt(lang, "hour").format(h)} ${unitFmt(lang, "minute").format(m)}`;
  if (h) return unitFmt(lang, "hour").format(h);
  return unitFmt(lang, "minute").format(m);
}

/* ---------- v2 additions ---------- */

/**
 * Digits-only timer entry, read right to left: last 2 = minutes (00–59),
 * previous 2 = hours (00–23), everything before = days (no limit). No seconds.
 *   "45" → 45 min · "928" → 9 h 28 min · "20928" → 2 d 9 h 28 min · "32144" → 3 d 21 h 44 min
 * Returns { ms, days, hours, minutes, long } or { error } ("empty" | "chars" | "minutes" | "hours" | "zero").
 * `long` flags anything over 30 days so the UI can ask the user to double-check.
 */
export function parseTimerDigits(input) {
  const raw = String(input ?? "");
  if (!raw.trim()) return { error: "empty" };
  if (/[^\d\s]/.test(raw)) return { error: "chars" };
  const d = raw.replace(/\s+/g, "").replace(/^0+(?=\d)/, "");
  const minutes = Number(d.slice(-2));
  const hours = d.length > 2 ? Number(d.slice(-4, -2)) : 0;
  const days = d.length > 4 ? Number(d.slice(0, -4)) : 0;
  if (minutes > 59) return { error: "minutes" };
  if (hours > 23) return { error: "hours" };
  const ms = days * DAY + hours * HOUR + minutes * MINUTE;
  if (!(ms > 0)) return { error: "zero" };
  return { ms, days, hours, minutes, long: ms > 30 * DAY };
}

/** Inverse of parseTimerDigits for prefilling edit forms (rounds down to the minute). */
export function toTimerDigits(ms) {
  const total = Math.max(0, Math.floor(ms / MINUTE));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  const p = (n) => String(n).padStart(2, "0");
  if (days) return `${days}${p(hours)}${p(minutes)}`;
  if (hours) return `${hours}${p(minutes)}`;
  return String(minutes);
}

/** "2d 9h 28m" — every non-zero unit down to minutes (localized narrow units). */
export function formatSpan(ms, lang = "en") {
  const total = Math.max(0, Math.round(ms / MINUTE));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  const parts = [];
  if (days) parts.push(unitFmt(lang, "day").format(days));
  if (hours) parts.push(unitFmt(lang, "hour").format(hours));
  if (minutes || !parts.length) parts.push(unitFmt(lang, "minute").format(minutes));
  return parts.join(" ");
}

/** The instant at which the wall clock in `tz` reads y-mo-d h:mi (DST-safe; a skipped
 *  local time resolves to the instant just after the gap). */
export function zonedTimeToUtc(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const off1 = offsetMinutes(tz, guess);
  let t = guess - off1 * MINUTE;
  const off2 = offsetMinutes(tz, t);
  if (off2 !== off1) t = guess - off2 * MINUTE;
  return t;
}

/** [start, end) of the local calendar day containing `ms` in `tz`, plus `offsetDays`. 23/25-hour DST days are handled. */
export function localDayRange(ms, tz, offsetDays = 0) {
  const p = zonedParts(ms, tz);
  const base = new Date(Date.UTC(p.year, p.month - 1, p.day + offsetDays));
  const next = new Date(Date.UTC(p.year, p.month - 1, p.day + offsetDays + 1));
  return {
    start: zonedTimeToUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), 0, 0, tz),
    end: zonedTimeToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0, tz),
  };
}

export function utcDayStart(ms) {
  return Math.floor(ms / DAY) * DAY;
}

/** "HH:MM" → minutes after midnight, or null. */
export function hhmmToMinutes(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "").trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Two-field duration entry: whole days + "HH:MM" (24-hour clock style, 00:00–23:59).
 * "0928" / "928" / "9:28" are all read as 09:28. Days may be empty (= 0).
 * → { ms, days, hours, minutes, long } or { error: "days" | "hhmm" | "zero" | "empty" }
 */
export function parseDaysTime(daysText, hhmmText) {
  const dRaw = String(daysText ?? "").trim();
  const tRaw = String(hhmmText ?? "").trim();
  if (!dRaw && !tRaw) return { error: "empty" };
  if (dRaw && !/^\d{1,3}$/.test(dRaw)) return { error: "days" };
  const days = dRaw ? Number(dRaw) : 0;
  let hours = 0;
  let minutes = 0;
  if (tRaw) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(tRaw) || /^(\d{1,2})(\d{2})$/.exec(tRaw);
    if (!m) return { error: "hhmm" };
    hours = Number(m[1]);
    minutes = Number(m[2]);
    if (hours > 23 || minutes > 59) return { error: "hhmm" };
  }
  const ms = days * DAY + hours * HOUR + minutes * MINUTE;
  if (!(ms > 0)) return { error: "zero" };
  return { ms, days, hours, minutes, long: ms > 30 * DAY };
}

/** Inverse of parseDaysTime for prefilling: { days: "2", hhmm: "09:28" } (rounded down to the minute). */
export function splitDaysTime(ms) {
  const total = Math.max(0, Math.floor(ms / MINUTE));
  const days = Math.floor(total / 1440);
  const p = (n) => String(n).padStart(2, "0");
  return { days: days ? String(days) : "", hhmm: `${p(Math.floor((total % 1440) / 60))}:${p(total % 60)}` };
}

/** Auto-format typing in the HH:MM box: "0928" → "09:28", "928" stays until a 4th digit/blur. */
export function tidyHHMM(text) {
  const d = String(text || "").replace(/[^\d:]/g, "");
  if (d.includes(":")) return d.slice(0, 5);
  if (d.length === 4) return `${d.slice(0, 2)}:${d.slice(2)}`;
  return d.slice(0, 4);
}

/* Cached formatters for UI labels (created once per locale/zone, not on every render). */
export function formatWeekdayShort(ms, tz, lang) {
  return dtf(intlLocale(lang), { timeZone: tz, weekday: "short" }, "wd").format(ms);
}
export function formatDayNumber(ms, tz, lang) {
  return dtf(intlLocale(lang), { timeZone: tz, day: "numeric" }, "dn").format(ms);
}
export function formatLongDay(ms, tz, lang) {
  return dtf(intlLocale(lang), { timeZone: tz, weekday: "long", day: "numeric", month: "short" }, "ld").format(ms);
}

/**
 * Compact clock entry without a colon: "2200" → "22:00", "0130" → "01:30", "928" → "09:28",
 * "7" → "07:00", "21" → "21:00". Also accepts "22:00" / "9.28". Returns "HH:MM" or null.
 */
export function parseCompactTime(input) {
  const d = String(input ?? "").replace(/\D/g, "");
  if (!d || d.length > 4) return null;
  let h, m;
  if (d.length <= 2) { h = +d; m = 0; }
  else if (d.length === 3) { h = +d.slice(0, 1); m = +d.slice(1); }
  else { h = +d.slice(0, 2); m = +d.slice(2); }
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
