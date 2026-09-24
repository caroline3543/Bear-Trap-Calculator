/* Events: built-in templates (Bear Trap 1/2, Foundry, Canyon Clash, SvS, daily reset) plus
   custom events. Times chosen by an alliance start as "Set your time". Repeating events can be
   edited for one occurrence, this-and-future, or the whole schedule. */
import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useNow } from "../hooks/useNow.js";
import { partitionEvents, validateEvent, eventName, isRecurring, overrideOccurrence, splitSeries, occurrencesBetween } from "../lib/events.js";
import { TEMPLATES, eventFromTemplate, restoreTemplate } from "../lib/eventTemplates.js";
import { computeReminders } from "../lib/reminders.js";
import { matchesFilter } from "../lib/accounts.js";
import { formatTime, formatDate, formatSpan, toUtcFields, parseUtcInput, hhmmToMinutes, DAY, HOUR, MINUTE } from "../lib/time.js";
import { Section, Btn, Pill, Countdown, Field, Seg, UtcDateTime, DurationFields, durFrom, durParse, FormActions, Icon, Ltr, AccountTag, AccountSelect, CalendarButtons, acctClass } from "../components/ui.jsx";
import { seriesToCalendarItem } from "../components/labels.js";
import { ReminderRow } from "./ReminderRow.jsx";

const SOON_MS = 15 * MINUTE;
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

export function recurrenceText(rec, t) {
  switch (rec?.type) {
    case "daily": return t("repeatDaily");
    case "everyNDays": return t("everyNDays", { n: rec.n });
    case "everyNWeeks": return rec.n === 1 ? t("repeatWeekly") : t("everyNWeeks", { n: rec.n });
    case "weekly": return t("weeklyOn", { days: (rec.weekdays || []).map((d) => t(`wd${d}`)).join(", ") });
    default: return t("repeatNone");
  }
}

function statusPill(occ, now, t) {
  if (occ.status === "unset") return <Pill tone="amber">{t("setYourTime")}</Pill>;
  if (occ.status === "disabled") return <Pill>{t("disabled")}</Pill>;
  if (occ.status === "in_progress") return <Pill tone="solid">{t("stInProgress")}</Pill>;
  if (occ.status === "started") return <Pill tone="green">{t("stStarted")}</Pill>;
  if (occ.start - now <= SOON_MS) return <Pill tone="t9">{t("stSoon")}</Pill>;
  return <Pill>{t("stUpcoming")}</Pill>;
}

/* ---------- time options (Foundry / Canyon registration times) ---------- */
function TimeOptionsEditor({ group, onClose }) {
  const { t, state, update } = useTimeHub();
  const [val, setVal] = useState("");
  const opts = state.timeOptions[group] || [];
  const set = (list) => update((s) => ({ ...s, timeOptions: { ...s.timeOptions, [group]: [...new Set(list)].sort() } }));
  const ok = hhmmToMinutes(val) != null;
  return (
    <div className="th-subform">
      <p className="th-note">{t("timeOptionsHelp")}</p>
      <div className="th-chips">
        {opts.map((o) => (
          <span key={o} className="th-chip"><Ltr>{o}</Ltr> UTC <button type="button" aria-label={`${t("delete")} ${o}`} onClick={() => set(opts.filter((x) => x !== o))}>×</button></span>
        ))}
        {!opts.length && <span className="th-note">{t("noTimeOptions")}</span>}
      </div>
      <div className="th-inline">
        <input className="th-input" type="time" step="1800" value={val} onChange={(e) => setVal(e.target.value)} aria-label={t("addTimeOption")} />
        <Btn small onClick={() => { if (ok) { set([...opts, val]); setVal(""); } }} disabled={!ok}>{t("add")}</Btn>
        <Btn small onClick={onClose}>{t("done")}</Btn>
      </div>
    </div>
  );
}

/* ---------- event form ---------- */
function EventForm({ initial, occKey, onDone, templateId, picker }) {
  const { t, lang, tz, state, dispatch, update, newId, templates, defaultAccountId } = useTimeHub();
  const now = useNow();
  const base = initial || (templateId ? eventFromTemplate(templateId, { id: newId(), now, accountId: TEMPLATES[templateId].legion ? defaultAccountId : null }) : null);
  const tpl = base?.templateId ? templates[base.templateId] : null;
  const recurring = !!initial && isRecurring(initial) && occKey != null;
  const [scope, setScope] = useState(recurring ? "one" : "all");
  const occStart0 = recurring ? (initial.overrides?.[occKey]?.startAt ?? occKey) : null;
  const [name, setName] = useState(base?.name || "");
  const [accountId, setAccountId] = useState(base ? base.accountId : null);
  const [startAt, setStartAt] = useState(recurring ? occStart0 : base?.startAt ?? null);
  const [hasDur, setHasDur] = useState(!!base?.durationMs);
  const [dur, setDur] = useState(durFrom(base?.durationMs));
  const durationMs = durParse(dur).ms ?? null;
  const [repeatOpen, setRepeatOpen] = useState(!tpl);
  const [rec, setRec] = useState(base?.recurrence ? { n: 2, weekdays: [], ...base.recurrence } : { type: "once", n: 2, weekdays: [] });
  const [legion, setLegion] = useState(base?.legion || 1);
  const [combat, setCombat] = useState(!!base?.combat);
  const [leadH, setLeadH] = useState(String(Math.round((base?.reminderLeadMs || 24 * HOUR) / HOUR)));
  const [notes, setNotes] = useState(base?.notes || "");
  const [errors, setErrors] = useState({});
  const [optsOpen, setOptsOpen] = useState(false);
  const optGroup = tpl?.timeOptions;
  const options = optGroup ? state.timeOptions[optGroup] || [] : [];
  // time-option events: pick the UTC date + one of the registration times
  const f0 = startAt != null ? toUtcFields(startAt) : { date: "", time: "" };
  const [optDate, setOptDate] = useState(f0.date);
  const [optTime, setOptTime] = useState(options.includes(f0.time) ? f0.time : (f0.time || options[0] || ""));
  const onlyThis = scope === "one";

  function save() {
    const at = optGroup && !onlyThis ? parseUtcInput(optDate, optTime) : startAt;
    const recurrence = { type: rec.type, ...(rec.type === "everyNDays" || rec.type === "everyNWeeks" ? { n: Number(rec.n) } : {}), ...(rec.type === "weekly" ? { weekdays: rec.weekdays } : {}) };
    const lead = Number(leadH);
    const draft = {
      ...base, name: name.trim(), accountId: accountId || null, startAt: at, durationMs: hasDur ? durationMs : null,
      recurrence, legion: tpl?.legion || base?.legion ? legion : null, combat, notes: notes.trim(),
      reminderLeadMs: lead > 0 ? lead * HOUR : 24 * HOUR, enabled: base?.enabled !== false,
    };
    const errs = onlyThis ? (Number.isFinite(at) ? {} : { startAt: "errDateTime" }) : validateEvent(draft);
    if (!onlyThis && at == null) errs.startAt = "errDateTime"; // every event needs a time
    if (hasDur && durationMs == null) errs.durationMs = "errDuration";
    if (combat && !(lead > 0 && lead <= 72)) errs.lead = "errLead";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (onlyThis) {
      dispatch({ type: "upsert", collection: "events", item: overrideOccurrence(initial, occKey, { startAt: at }) });
    } else if (scope === "future") {
      const [old, next] = splitSeries(initial, occKey, { ...draft, startAt: at }, newId());
      update((s) => ({ ...s, events: [...s.events.map((e) => (e.id === old.id ? old : e)), next] }));
    } else {
      dispatch({ type: "upsert", collection: "events", item: draft });
    }
    onDone();
  }

  return (
    <div className="th-form">
      {picker}
      {recurring && (
        <Field label={t("editWhich")} as="div">
          <Seg value={scope} onChange={setScope} label={t("editWhich")} options={[
            { value: "one", label: t("scopeOne") }, { value: "future", label: t("scopeFuture") }, { value: "all", label: t("scopeAll") },
          ]} />
        </Field>
      )}
      {!onlyThis && (
        <Field label={t("fName")} optional={!!tpl} error={errors.name && t(errors.name)}>
          <input className={`th-input ${errors.name ? "invalid" : ""}`} value={name} maxLength={120} placeholder={tpl ? t(tpl.nameKey) : ""} onChange={(e) => setName(e.target.value)} />
        </Field>
      )}
      {!onlyThis && <AccountSelect value={accountId} onChange={setAccountId} allowShared />}
      {optGroup && !onlyThis ? (
        <>
          <div className="th-row">
            <Field label={t("fDateUtc")}>
              <input className="th-input" type="date" value={optDate} onChange={(e) => setOptDate(e.target.value)} />
            </Field>
            <Field label={t("battleTimeUtc")}>
              <select className="th-input" aria-label={t("battleTimeUtc")} value={optTime} onChange={(e) => setOptTime(e.target.value)}>
                {!options.includes(optTime) && optTime && <option value={optTime}>{optTime}</option>}
                {!optTime && <option value="">—</option>}
                {options.map((o) => <option key={o} value={o}>{o} UTC</option>)}
              </select>
            </Field>
          </div>
          {parseUtcInput(optDate, optTime) != null && (
            <span className="th-hint">{t("local")}: <Ltr>{formatTime(parseUtcInput(optDate, optTime), tz, lang)}</Ltr> · {formatDate(parseUtcInput(optDate, optTime), tz, lang)}</span>
          )}
          {errors.startAt && <span className="th-error">{t(errors.startAt)}</span>}
          {optsOpen ? <TimeOptionsEditor group={optGroup} onClose={() => setOptsOpen(false)} />
            : <button type="button" className="th-link" onClick={() => setOptsOpen(true)}>{t("editTimeOptions")}</button>}
        </>
      ) : (
        <UtcDateTime key={scope} value={startAt} onChange={setStartAt} error={errors.startAt && t(errors.startAt)} />
      )}
      {!onlyThis && (tpl?.legion || base?.legion) && (
        <Field label={t("legion")} as="div">
          <Seg value={legion} onChange={setLegion} label={t("legion")} options={[{ value: 1, label: t("legionN", { n: 1 }) }, { value: 2, label: t("legionN", { n: 2 }) }]} />
        </Field>
      )}
      {!onlyThis && (
        <>
          {!repeatOpen ? (
            <div className="th-repeat-summary">
              <span className="th-label">{t("fRepeat")}</span>
              <b>{recurrenceText({ ...rec, n: Number(rec.n) }, t)}</b>
              {rec.type === "once" && tpl?.timeOptions === "canyon" && <span className="th-hint">{t("canyonRepeatNote")}</span>}
              <button type="button" className="th-link" onClick={() => setRepeatOpen(true)}>{t("changeRepeat")}</button>
            </div>
          ) : (<>
          <Field label={t("fRepeat")} as="div">
            <select className="th-input" value={rec.type} onChange={(e) => setRec({ ...rec, type: e.target.value })} aria-label={t("fRepeat")}>
              <option value="once">{t("repeatNone")}</option>
              <option value="daily">{t("repeatDaily")}</option>
              <option value="everyNDays">{t("everyXDays")}</option>
              <option value="weekly">{t("weeklyDays")}</option>
              <option value="everyNWeeks">{t("everyXWeeks")}</option>
            </select>
          </Field>
          {(rec.type === "everyNDays" || rec.type === "everyNWeeks") && (
            <Field label={rec.type === "everyNDays" ? t("everyHowManyDays") : t("everyHowManyWeeks")} error={errors.recurrence && t(errors.recurrence)}>
              <input className="th-input" inputMode="numeric" value={rec.n} onChange={(e) => setRec({ ...rec, n: e.target.value.replace(/\D/g, "") })} />
            </Field>
          )}
          {rec.type === "weekly" && (
            <div className="th-weekdays" role="group" aria-label={t("weeklyDays")}>
              {WEEKDAYS.map((d) => (
                <button key={d} type="button" aria-pressed={rec.weekdays.includes(d)} onClick={() => setRec({ ...rec, weekdays: rec.weekdays.includes(d) ? rec.weekdays.filter((x) => x !== d) : [...rec.weekdays, d] })}>
                  {t(`wd${d}`)}
                </button>
              ))}
              {errors.recurrence && <span className="th-error">{t(errors.recurrence)}</span>}
            </div>
          )}
          </>)}
          {rec.type !== "once" && <p className="th-note">{t("repeatUtcNote")}</p>}
          <label className="th-check"><input type="checkbox" checked={hasDur} onChange={(e) => setHasDur(e.target.checked)} />{t("fDuration")} <span className="th-hint">({t("optional")})</span></label>
          {hasDur && <DurationFields value={dur} onChange={setDur} label={t("fDuration")} />}
          {hasDur && errors.durationMs && <span className="th-error">{t(errors.durationMs)}</span>}
          {!tpl && <label className="th-check"><input type="checkbox" checked={combat} onChange={(e) => setCombat(e.target.checked)} />{t("combatEvent")}</label>}
          {combat && (
            <Field label={t("reminderLead")} error={errors.lead && t(errors.lead)}>
              <input className="th-input" inputMode="numeric" value={leadH} onChange={(e) => setLeadH(e.target.value.replace(/\D/g, ""))} />
            </Field>
          )}
          <Field label={t("fNotes")} optional>
            <textarea className="th-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </>
      )}
      <FormActions onSave={save} onCancel={onDone} />
    </div>
  );
}

/* ---------- card ---------- */
function EventCard({ ev, occ, reminders, onEdit }) {
  const { t, tz, lang, dispatch, update, newId, templates, accountById, accountIds } = useTimeHub();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const acct = ev.accountId ? accountById(ev.accountId) : null;
  const name = eventName(ev, t, templates);
  const tpl = templates[ev.templateId];
  const live = occ.status === "in_progress" || occ.status === "started";
  const save = (item) => dispatch({ type: "upsert", collection: "events", item });
  const del = () => window.confirm(t("confirmDeleteSchedule")) && update((s) => ({
    ...s, events: s.events.filter((e) => e.id !== ev.id),
    reminders: Object.fromEntries(Object.entries(s.reminders).filter(([k]) => !k.startsWith(ev.id + "|"))),
  }));
  const occCal = occ.start != null ? [{ uid: `ev:${ev.id}:${occ.key}`, start: occ.start, end: occ.end, title: name + (ev.legion ? ` · ${t("legionN", { n: ev.legion })}` : "") + (acct ? ` (${acct.name})` : "") }] : [];

  return (
    <article className={`th-ev ${live ? "live" : ""} ${occ.status === "disabled" ? "muted" : ""} ${acctClass(acct)}`}>
      <div className="th-ev-top">
        <div className="th-ev-main">
          <div className="th-ev-name">{name}</div>
          <div className="th-ev-when">
            {occ.start != null && occ.status !== "unset" ? (
              <><Ltr>{formatTime(occ.start, tz, lang)}</Ltr> {formatDate(occ.start, tz, lang)} · <Ltr>{formatTime(occ.start, "UTC", lang)}</Ltr> UTC</>
            ) : t("setYourTimeHelp")}
          </div>
          <div className="th-tags">
            {(occ.status !== "upcoming" || occ.start - now <= SOON_MS) && statusPill(occ, now, t)}
            {ev.legion && <Pill tone="gold">{t("legionN", { n: ev.legion })}</Pill>}
            {ev.accountId ? <AccountTag accountId={ev.accountId} /> : null}
          </div>
        </div>
        {occ.status === "upcoming" && <Countdown ms={occ.start - now} label={t("startsIn")} />}
        {occ.status === "in_progress" && <Countdown ms={occ.end - now} label={t("endsIn")} />}
        {occ.status === "unset" && <Btn small tone="gold" onClick={onEdit}>{t("setTime")}</Btn>}
      </div>
      {reminders.map((r) => <ReminderRow key={r.key} r={r} showName={false} />)}
      <button type="button" className="th-link th-ev-more" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? t("lessDetails") : t("moreDetails")}</button>
      {open && (
        <div className="th-ev-details">
          <div className="th-item-sub">
            {recurrenceText(ev.recurrence, t)}
            {ev.durationMs ? ` · ${formatSpan(ev.durationMs, lang)}` : ""}
            {occ.end ? <> · {t("ends")} <Ltr>{formatTime(occ.end, tz, lang)}</Ltr></> : null}
            {occ.moved ? ` · ${t("movedOccurrence")}` : ""}
            {!ev.accountId ? ` · ${t("allAccountsShared")}` : ""}
          </div>
          {ev.combat && ev.reminderHidden && <div className="th-item-sub">{t("remindersOff")} <button type="button" className="th-link" onClick={() => save({ ...ev, reminderHidden: false })}>{t("turnOn")}</button></div>}
          {ev.notes && <div className="th-item-notes">{ev.notes}</div>}
          <div className="th-item-actions">
            <Btn small onClick={onEdit}>{t("edit")}</Btn>
            {isRecurring(ev) && occ.start != null && occ.status === "upcoming" && (
              <Btn small onClick={() => save(overrideOccurrence(ev, occ.key, { cancelled: true }))}>{t("skipThisOne")}</Btn>
            )}
            <Btn small onClick={() => save({ ...ev, id: newId(), createdAt: Date.now(), overrides: {} })}>{t("duplicate")}</Btn>
            <Btn small onClick={() => save({ ...ev, enabled: ev.enabled === false })}>{ev.enabled === false ? t("enable") : t("disable")}</Btn>
            {tpl && <Btn small onClick={() => window.confirm(t("confirmRestore")) && save(restoreTemplate(ev))}>{t("restoreDefault")}</Btn>}
            <Btn small tone="danger" onClick={del}>{t("delete")}</Btn>
          </div>
          {occ.start != null && occ.status !== "disabled" && occ.status !== "unset" && (
            <div className="th-item-actions">
              <CalendarButtons items={occCal} filename={`${name}-${occ.key}`} label={t("addThisOne")} />
              {isRecurring(ev) && <CalendarButtons items={[seriesToCalendarItem(ev, t, templates)]} filename={`${name}-schedule`} label={t("addWholeSchedule")} />}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/* ---------- Add: one form, the first field picks the event ---------- */
function NewEventForm({ onDone }) {
  const { t } = useTimeHub();
  const [kind, setKind] = useState("custom");
  const picker = (
    <Field label={t("eventType")}>
      <select className="th-input" value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="custom">{t("customEvent")}</option>
        {Object.keys(TEMPLATES).map((tid) => <option key={tid} value={tid}>{t(TEMPLATES[tid].nameKey)}</option>)}
      </select>
    </Field>
  );
  return <EventForm key={kind} templateId={kind === "custom" ? undefined : kind} picker={picker} onDone={onDone} />;
}

export function EventsWidget({ move }) {
  const { t, state, accounts, filter, accountIds, templates, dispatch, newId, defaultAccountId } = useTimeHub();
  const now = useNow();
  const [editing, setEditing] = useState(null); // null | "new" | "pick" | {id, occKey} | {tpl}
  const [showDisabled, setShowDisabled] = useState(false);
  const visible = state.events.filter((e) => !e.archived && matchesFilter(e.accountId, accounts, filter));
  const { current } = partitionEvents(visible, now);
  const active = current.filter((r) => r.occ.status !== "disabled");
  const disabled = current.filter((r) => r.occ.status === "disabled");
  const tplOrder = Object.keys(TEMPLATES);
  const unset = active.filter((r) => r.occ.status === "unset").sort((a, b) => tplOrder.indexOf(a.ev.templateId) - tplOrder.indexOf(b.ev.templateId));
  const reminders = computeReminders(state, now, accountIds);
  const close = () => setEditing(null);
  const editingUnset = unset.filter((r) => editing?.id === r.ev.id);
  const scheduled = active.filter((r) => r.occ.status !== "unset");
  const list = [...editingUnset, ...scheduled, ...(showDisabled ? disabled : [])];
  const scheduledCount = scheduled.length;

  return (
    <Section id="events" icon="foundry" title={t("secEvents")} count={scheduledCount} move={move}
      action={!editing && <Btn tone="gold" small icon={<Icon.plus />} onClick={() => setEditing("new")}>{t("add")}</Btn>}>
      {editing === "new" && <NewEventForm onDone={close} />}
      {scheduled.length === 0 && !editing && <div className="th-empty">{t("emptyEvents")}</div>}
      {list.map(({ ev, occ }) =>
        editing?.id === ev.id ? (
          <EventForm key={ev.id} initial={ev} occKey={editing.occKey} onDone={close} />
        ) : (
          <EventCard key={ev.id} ev={ev} occ={occ}
            reminders={reminders.filter((r) => r.ev.id === ev.id && r.occ.key === occ.key)}
            onEdit={() => setEditing({ id: ev.id, occKey: isRecurring(ev) && occ.status !== "unset" ? occ.key : null })} />
        )
      )}
      {disabled.length > 0 && (
        <button type="button" className="th-link" onClick={() => setShowDisabled(!showDisabled)}>
          {showDisabled ? t("hideDisabled") : t("showDisabled", { n: disabled.length })}
        </button>
      )}
    </Section>
  );
}
