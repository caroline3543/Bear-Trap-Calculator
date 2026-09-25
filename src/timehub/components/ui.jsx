import React, { useId, useMemo, useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import {
  formatTime, formatDate, formatCountdown, offsetLabel, zoneCity, isValidTimeZone,
  parseUtcInput, toUtcFields, parseDuration, formatDurationInput,
} from "../lib/time.js";
import { searchZones } from "../lib/cities.js";
import { parseTimerDigits, formatSpan, parseDaysTime, splitDaysTime, tidyHHMM, formatCountdownClock } from "../lib/time.js";
import { useNow } from "../hooks/useNow.jsx";
import { buildICS, googleCalendarLink, downloadICS } from "../lib/ics.js";

/* ---------- icons (simple strokes, colour from CSS) ---------- */
export const Icon = {
  chevron: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  sun: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor" /><g stroke="currentColor" strokeWidth="2" strokeLinecap="round">{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1="12" y1="2.8" x2="12" y2="5.2" transform={`rotate(${a} 12 12)`} />)}</g></svg>
  ),
  dusk: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16a7 7 0 0114 0z" fill="currentColor" /><g stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2.5" y1="19.5" x2="21.5" y2="19.5" /><line x1="12" y1="4.5" x2="12" y2="6.8" /><line x1="4.8" y1="8.6" x2="6.4" y2="10.1" /><line x1="19.2" y1="8.6" x2="17.6" y2="10.1" /></g></svg>
  ),
  moon: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" fill="currentColor" /></svg>
  ),
  plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
  ),
  globe: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" /></g></svg>
  ),
  up: () => (<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  calendar: () => (<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></g></svg>),
  warn: () => (<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5L2.5 20h19z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /><path d="M12 10v4.5M12 17.2v.3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>),
  gear: () => (<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8" strokeLinecap="round" /></g></svg>),
  check: () => (<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>),
  down: () => (<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>),
};

/* Hand-painted underline, same stroke as the calculator's section headers. */
export function BrushUnderline() {
  return (
    <svg className="th-brush" width="54" height="8" viewBox="0 0 54 8" aria-hidden="true">
      <path d="M1 5.5 Q13 1.5 27 5 T53 4" fill="none" stroke="var(--goldBorder)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Btn({ tone = "ghost", small, icon, block, className = "", children, ...rest }) {
  return (
    <button type="button" className={`th-btn ${tone} ${small ? "small" : ""} ${block ? "block" : ""} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function Pill({ tone = "neutral", children }) {
  return <span className={`th-pill ${tone}`}>{children}</span>;
}

/** Isolates a localized duration ("2 س 5 د") so it reads in its own language's direction. */
export function Bidi({ children }) {
  return <bdi>{children}</bdi>;
}

/** Keeps clock times / zone ids (18:03, America/Chicago) left-to-right inside RTL text. */
export function Ltr({ children }) {
  return <bdi className="th-ltr">{children}</bdi>;
}

/* ---------- collapsible section card (with rearrange controls) ---------- */
export function Section({ id, title, count, action, children, move, icon, sub }) {
  const { state, dispatch, t, rearrange } = useTimeHub();
  const closed = rearrange || !!state.settings.collapsed[id];
  const bodyId = useId();
  return (
    <section className={`th-card ${rearrange ? "th-rearranging" : ""}`} aria-label={title} id={`th-sec-${id}`} data-section={id}>
      <div className="th-sec-head">
        {rearrange && move && <span className="th-drag" aria-hidden="true" onPointerDown={move.onDragStart}>⠿</span>}
        {icon && <SectionIcon name={icon} />}
        <button
          type="button" className="th-sec-toggle" aria-expanded={!closed} aria-controls={bodyId} disabled={rearrange}
          title={closed ? t("expand") : t("collapse")}
          onClick={() => dispatch({ type: "toggleSection", id })}
        >
          {!rearrange && <Icon.chevron className={`th-chevron ${closed ? "closed" : ""}`} />}
          <span className="th-sec-title">{title}</span>
          {count > 0 && <span className="th-count">{count}</span>}
        </button>
        {rearrange && move ? (
          <span className="th-move">
            <Btn small className="icon big" onClick={move.up} disabled={!move.up} aria-label={`${t("moveUp")}: ${title}`} title={t("moveUp")}><Icon.up /></Btn>
            <Btn small className="icon big" onClick={move.down} disabled={!move.down} aria-label={`${t("moveDown")}: ${title}`} title={t("moveDown")}><Icon.down /></Btn>
          </span>
        ) : (!closed && action)}
      </div>
      {!rearrange && <BrushUnderline />}
      {sub && !closed && <p className="th-sec-sub">{sub}</p>}
      {!closed && <div className="th-sec-body" id={bodyId}>{children}</div>}
    </section>
  );
}

/* ---------- accounts ---------- */
export function AccountTag({ accountId, shared }) {
  const { accountById, t, multi } = useTimeHub();
  if (shared) return multi ? <span className="th-acct shared">{t("allAccountsShared")}</span> : null;
  const a = accountById(accountId);
  if (!a || !multi) return null;
  return <span className={`th-acct c${a.color}`}>{a.icon ? <b aria-hidden="true">{a.icon}</b> : <i aria-hidden="true" />}{a.name}</span>;
}

export function AccountSelect({ value, onChange, allowShared }) {
  const { accounts, t, multi } = useTimeHub();
  if (!multi && !allowShared) return null;
  return (
    <Field label={t("account")}>
      <select className="th-input" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        {allowShared && <option value="">{t("allAccountsShared")}</option>}
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    </Field>
  );
}

/** Account accent on a card (colour is secondary; the tag carries the name). */
export function acctClass(account) {
  return account ? `th-acct-edge c${account.color}` : "";
}

/* ---------- digits-only timer input ---------- */
export function DigitsInput({ value, onChange, label, optional, compactLabel }) {
  const { t, lang } = useTimeHub();
  const r = value ? parseTimerDigits(value) : null;
  const errKey = { chars: "errDigitsChars", minutes: "errDigitsMinutes", hours: "errDigitsHours", zero: "errDigitsZero" }[r?.error];
  return (
    <Field label={label || t("timeLeft")} optional={optional} error={errKey && t(errKey)} hint={!value ? t("digitsHint") : null}>
      <input
        className={`th-input th-digits ${errKey ? "invalid" : ""}`} inputMode="numeric" autoComplete="off" placeholder={optional ? "" : compactLabel || "20928"}
        value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d\s]/g, ""))}
        onPaste={(e) => { const txt = e.clipboardData.getData("text"); if (/[^\d\s]/.test(txt)) { e.preventDefault(); onChange(txt); } }}
      />
      {r && !r.error && (
        <span className={`th-readout ${r.long ? "warn" : ""}`}>
          = <Bidi>{formatSpan(r.ms, lang)}</Bidi>{r.long ? ` · ${t("checkThis")}` : ""}
        </span>
      )}
    </Field>
  );
}

/* ---------- round pastel icon per kind of item ---------- */
const KIND_PATHS = {
  bear: '<circle cx="12" cy="15" r="4.5"/><circle cx="6.5" cy="9" r="2"/><circle cx="10" cy="5.5" r="2"/><circle cx="14" cy="5.5" r="2"/><circle cx="17.5" cy="9" r="2"/>',
  foundry: '<path d="M4 20h16"/><path d="M6 20V11l6-5 6 5v9"/><path d="M10 20v-5h4v5"/>',
  frostfire: '<path d="M12 3l6 7-6 11-6-11z"/><path d="M6 10h12"/>',
  event: '<path d="M5 21V4l7 3 7-3v12l-7 3-7-3"/>',
  booking: '<circle cx="12" cy="14" r="6"/><path d="M9 3l3 5 3-5"/>',
  training: '<path d="M4 4l10 10M14 18l4-4M16 16l4 4"/><path d="M20 4L10 14M6 14l4 4M4 20l4-4"/>',
  research: '<path d="M9 3h6"/><path d="M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>',
  contrib: '<path d="M4 12l4-4 4 3 4-3 4 4-8 8z"/>',
  plan: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14a5 5 0 0 1 5.5 5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  boot: '<path d="M7 3h6v8l6 3v5H5V3"/><path d="M5 16h14"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/>',
  trap: '<path d="M3 16h18"/><path d="M5 16l2-6 2 6M9 16l2-6 2 6M13 16l2-6 2 6"/><path d="M4 16a8 5 0 0 0 16 0"/>',
  reset: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/>',
};
export function kindOf(item) {
  if (item.kind !== "event") return item.kind;
  const tid = item.ref?.ev?.templateId || "";
  if (tid.startsWith("bear_trap")) return "bear";
  if (tid === "foundry" || tid === "canyon_clash") return "foundry";
  if (tid === "frostfire_mine") return "frostfire";
  if (tid === "daily_reset") return "reset";
  return "event";
}
export function KindIcon({ kind, size = 34 }) {
  return (
    <span className={`th-kicon k-${kind}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg width={Math.round(size * 0.52)} height={Math.round(size * 0.52)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: KIND_PATHS[kind] || KIND_PATHS.event }} />
    </span>
  );
}
/** Amber circle with a two-tone icon — the calculator's numbered-step look. */
export function SectionIcon({ name }) {
  return (
    <span className="th-num" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" fillOpacity=".22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: KIND_PATHS[name] || KIND_PATHS.event }} />
    </span>
  );
}
export function TabIcon({ name, size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" fillOpacity=".22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: KIND_PATHS[name] || KIND_PATHS.event }} />;
}

export function Snowflakes() {
  return (
    <svg className="th-flakes" width="46" height="30" viewBox="0 0 46 30" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M8 4v10M3 6.5l10 5M13 6.5l-10 5" /><path d="M34 14v8M30 16l8 4M38 16l-8 4" /><circle cx="24" cy="6" r="1.4" />
    </svg>
  );
}
export function SleepingBear({ text }) {
  return (
    <div className="th-bear">
      <svg width="72" height="44" viewBox="0 0 64 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 34c3-11 12-17 26-17s23 6 26 17z" /><circle cx="21" cy="16" r="4.5" /><circle cx="43" cy="16" r="4.5" /><path d="M26 26q6 4 12 0" /><path d="M50 6h6l-6 6h6" />
      </svg>
      <span>{text}</span>
    </div>
  );
}

/* ---------- duration: days + HH:MM (24h) ---------- */
export const EMPTY_DUR = { days: "", hhmm: "" };
export function durFrom(ms) { return ms > 0 ? splitDaysTime(ms) : EMPTY_DUR; }
export function durParse(v) { return parseDaysTime(v?.days, v?.hhmm); }

export function DurationFields({ value, onChange, label, optional }) {
  const { t, lang } = useTimeHub();
  const id = useId();
  const touched = value.days || value.hhmm;
  const r = touched ? durParse(value) : null;
  const errKey = { days: "errDays", hhmm: "errHHMM", zero: "errDigitsZero" }[r?.error];
  return (
    <fieldset className="th-dur">
      <legend className="th-label">{label || t("timeLeft")}{optional && <span className="th-hint"> ({t("optional")})</span>}</legend>
      <div className="th-dur-row">
        <label className="th-dur-days" htmlFor={`${id}d`}>
          <span>{t("daysLabel")}</span>
          <input id={`${id}d`} className={`th-input ${r?.error === "days" ? "invalid" : ""}`} inputMode="numeric" autoComplete="off" maxLength={3}
            placeholder="0" value={value.days} onChange={(e) => onChange({ ...value, days: e.target.value.replace(/\D/g, "") })} />
        </label>
        <label className="th-dur-time" htmlFor={`${id}t`}>
          <span>{t("hhmmLabel")}</span>
          <input id={`${id}t`} className={`th-input ${r?.error === "hhmm" ? "invalid" : ""}`} inputMode="numeric" autoComplete="off" maxLength={5}
            placeholder="09:28" value={value.hhmm} onChange={(e) => onChange({ ...value, hhmm: tidyHHMM(e.target.value) })} />
        </label>
      </div>
      {errKey ? <span className="th-error" role="alert">{t(errKey)}</span>
        : r && !r.error ? <span className={`th-readout ${r.long ? "warn" : ""}`}>= <Bidi>{formatSpan(r.ms, lang)}</Bidi>{r.long ? ` · ${t("checkThis")}` : ""}</span>
        : !optional ? <span className="th-hint">{t("durHint")}</span> : null}
    </fieldset>
  );
}

/* ---------- add to calendar ---------- */
export function CalendarButtons({ items, filename, small = true, label }) {
  const { t, state } = useTimeHub();
  if (!items.length) return null;
  const alarm = state.settings.calendarAlarmMin;
  const withAlarm = items.map((i) => ({ alarmMin: alarm, ...i }));
  return (
    <span className="th-cal">
      <Btn small={small} icon={<Icon.calendar />} onClick={() => downloadICS(filename, buildICS(withAlarm))}>{label || t("addToCalendar")}</Btn>
      {items.length === 1 && (
        <a className="th-btn ghost small" href={googleCalendarLink(withAlarm[0])} target="_blank" rel="noopener noreferrer">{t("googleCalendar")}</a>
      )}
    </span>
  );
}

/* ---------- UTC + local time pair ---------- */
export function TimePair({ ms, label }) {
  const { tz, lang, t } = useTimeHub();
  return (
    <div className="th-times" aria-label={label}>
      <div className="th-time">
        <span className="th-time-tag utc">{t("utc")}</span>
        <div className="th-time-main"><Ltr>{formatTime(ms, "UTC", lang)}</Ltr></div>
        <div className="th-time-date">{formatDate(ms, "UTC", lang)}</div>
      </div>
      <div className="th-time">
        <span className="th-time-tag local" title={tz}>{t("local")} · {zoneCity(tz)}</span>
        <div className="th-time-main"><Ltr>{formatTime(ms, tz, lang)}</Ltr></div>
        <div className="th-time-date">{formatDate(ms, tz, lang)}</div>
      </div>
    </div>
  );
}

/** Self-ticking countdown: only this little text re-renders every second.
 *  Pass `to` (target timestamp). `ms` is still accepted for fixed values. */
export function Countdown({ to, ms, label }) {
  return (
    <div style={{ textAlign: "end", flexShrink: 0 }}>
      {label && <div className="th-countdown-label">{label}</div>}
      <div className="th-countdown" role="timer" aria-live="off">{to != null ? <Remaining to={to} /> : <Remaining fixed={ms} />}</div>
    </div>
  );
}

const FORMATS = { countdown: formatCountdown, clock: formatCountdownClock, span: formatSpan };
/** Time left until `to` (or since, with `since`), re-rendering only itself each second. */
export const Remaining = React.memo(function Remaining({ to, since, fixed, fmt = "countdown" }) {
  const { lang } = useTimeHub();
  const now = useNow();
  const ms = fixed != null ? fixed : since != null ? now - since : to - now;
  return <Bidi>{FORMATS[fmt](Math.max(0, ms), lang)}</Bidi>;
});

/** Progress bar filled by the browser (a CSS animation), not by re-rendering every second. */
export function ProgressFill({ start, end, className = "" }) {
  const now = Date.now();
  const span = end - start;
  const p = span > 0 ? Math.min(1, Math.max(0, (now - start) / span)) : 1;
  const left = Math.max(0, end - now);
  return (
    <span key={`${start}-${end}`} className={`th-fill ${className}`}
      style={{ "--p": p, animationDuration: `${left}ms`, animationPlayState: left > 0 ? "running" : "paused" }} />
  );
}

/* ---------- form fields ---------- */
export function Field({ label, optional, hint, error, children, as }) {
  const { t } = useTimeHub();
  const Tag = as || "label";
  return (
    <Tag className="th-field">
      <span className="th-label">{label}{optional && <span className="opt"> ({t("optional")})</span>}</span>
      {children}
      {hint && !error && <span className="th-hint">{hint}</span>}
      {error && <span className="th-error" role="alert">{error}</span>}
    </Tag>
  );
}

export function Seg({ value, options, onChange, label }) {
  return (
    <div className="th-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

/** Date + time inputs that always mean UTC. value/onChange use epoch ms (or null). */
export function UtcDateTime({ value, onChange, error }) {
  const { t, tz, lang } = useTimeHub();
  const initial = value != null ? toUtcFields(value) : { date: "", time: "" };
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const update = (d, tm) => {
    setDate(d);
    setTime(tm);
    onChange(parseUtcInput(d, tm));
  };
  const ms = parseUtcInput(date, time);
  return (
    <>
      <div className="th-row">
        <Field label={t("fDateUtc")}>
          <input className={`th-input ${error ? "invalid" : ""}`} type="date" value={date} onChange={(e) => update(e.target.value, time)} />
        </Field>
        <Field label={t("fTimeUtc")}>
          <input className={`th-input ${error ? "invalid" : ""}`} type="time" value={time} step="60" onChange={(e) => update(date, e.target.value)} />
        </Field>
      </div>
      {error ? (
        <span className="th-error" role="alert">{error}</span>
      ) : ms != null ? (
        <span className="th-hint">
          {t("local")} ({zoneCity(tz)}): <Ltr>{formatTime(ms, tz, lang)}</Ltr> · {formatDate(ms, tz, lang)}
        </span>
      ) : null}
    </>
  );
}

/** Game-style duration text box. onChange gets ms or null. */
export function DurationInput({ initialMs, onChange, error, label }) {
  const { t } = useTimeHub();
  const [text, setText] = useState(initialMs ? formatDurationInput(initialMs) : "");
  return (
    <Field label={label || t("fDuration")} hint={t("durationHint")} error={error}>
      <input
        className={`th-input ${error ? "invalid" : ""}`} inputMode="text" autoComplete="off" placeholder="1d 03:12:44"
        value={text} onChange={(e) => { setText(e.target.value); onChange(parseDuration(e.target.value)); }}
      />
    </Field>
  );
}

/** Search a city or IANA zone, or pick from the full list. */
export function TimeZonePicker({ value, onChange, error, label }) {
  const { t } = useTimeHub();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(!value);
  const results = useMemo(() => searchZones(q, 8), [q]);
  const listId = useId();
  if (!editing && isValidTimeZone(value)) {
    return (
      <Field as="div" label={label || t("timeZone")} error={error}>
        <div className="th-picked">
          <span><Ltr>{value}</Ltr> <span className="th-hint">({offsetLabel(value)})</span></span>
          <button type="button" className="th-link" onClick={() => setEditing(true)}>{t("changeZone")}</button>
        </div>
      </Field>
    );
  }
  return (
    <Field as="div" label={label || t("timeZone")} error={error}>
      <div className="th-picker">
        <input
          className={`th-input ${error ? "invalid" : ""}`} placeholder={t("findCity")} value={q} aria-controls={listId}
          autoComplete="off" onChange={(e) => setQ(e.target.value)}
        />
        {q.trim() && (
          results.length ? (
            <ul className="th-picker-list" id={listId}>
              {results.map((r) => (
                <li key={r.label + r.tz}>
                  <button type="button" onClick={() => { onChange(r.tz); setEditing(false); setQ(""); }}>
                    <span>{r.label} <span className="sub">{r.sub !== r.tz ? r.sub : ""}</span></span>
                    <span className="sub"><Ltr>{r.tz}</Ltr> · {offsetLabel(r.tz)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="th-hint" style={{ marginTop: 6 }}>{t("noCity")}</p>
          )
        )}
      </div>
    </Field>
  );
}

export function FormActions({ onSave, onCancel, saveLabel }) {
  const { t } = useTimeHub();
  return (
    <div className="th-form-actions">
      <Btn tone="gold" onClick={onSave}>{saveLabel || t("save")}</Btn>
      <Btn tone="ghost" onClick={onCancel}>{t("cancel")}</Btn>
    </div>
  );
}
