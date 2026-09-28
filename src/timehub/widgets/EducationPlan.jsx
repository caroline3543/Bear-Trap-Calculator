/* Ministry of Education × Training. The plan reads the SAME booking record as the Bookings tab
   (position "minister_education"); this file only displays what lib/education.js works out.
   Recomputed with the minute clock and when its inputs change — never per second. */
import React, { useMemo, useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useMinute } from "../hooks/useNow.jsx";
import { TRAINING_CAMPS, campMaxFor, campMaxEduFor } from "../lib/timers.js";
import { eduBooking, buildEducationPlan, findEducationSlots, EDU_POSITION } from "../lib/education.js";
import { formatTime, formatDate, formatSpan, parseCompactTime, MINUTE } from "../lib/time.js";
import { Btn, Seg, Ltr, Remaining } from "../components/ui.jsx";

/** The account's camps as the planner needs them (running timer → its finish; otherwise idle). */
export function eduCampsFor(data, now) {
  return TRAINING_CAMPS.map((camp) => {
    const last = (data.timers || []).filter((x) => x.kind === "training" && x.category === camp).sort((a, b) => b.endAt - a.endAt)[0];
    const running = !!last && last.endAt > now;
    const troop = last?.troop === "helios" ? "helios" : "normal";
    return { camp, troop, running, finishAt: running ? last.endAt : null, normalMs: campMaxFor(data, camp, troop) || null, eduMs: campMaxEduFor(data, camp) };
  });
}

/** Booking + plan for one account (memoised on the inputs; `now` is the minute clock). */
export function useEduPlan(acc) {
  const { state, dataFor, tz } = useTimeHub();
  const now = useMinute();
  const data = dataFor(acc);
  const booking = eduBooking(data.bookings, now);
  const { eduPri, eduFinish, eduBufferMin } = state.settings;
  const plan = useMemo(() => (booking ? buildEducationPlan({
    now, camps: eduCampsFor(data, now), booking, priority: eduPri,
    desired: eduPri === "finish" && eduFinish ? { hhmm: eduFinish, tz } : null, bufferMs: eduBufferMin * MINUTE,
  }) : null), [booking?.id, booking?.startAt, data.timers, data.campMax, data.campMaxEdu, data.helios, now, eduPri, eduFinish, eduBufferMin, tz]); // eslint-disable-line react-hooks/exhaustive-deps
  return { booking, plan, now, data };
}

function useNames() {
  const { t } = useTimeHub();
  return (camps) => (camps.length === TRAINING_CAMPS.length ? t("allCamps") : camps.map((c) => t(`short_${c}`)).join(" · "));
}

function useVars() {
  const { tz, lang } = useTimeHub();
  const timeKeys = new Set(["finish", "start", "latest", "end", "restart"]);
  return (vars) => Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, timeKeys.has(k) ? formatTime(v, tz, lang) : k === "dur" || k === "idle" ? formatSpan(v, lang) : v]));
}

const TL_ICON = { finish: "◔", bridge: "↻", edu_start: "🎓", restart: "↻", edu_end: "🎓", final: "●" };

export function EducationPlan({ acc, onClose }) {
  const { t, tz, lang, state, dispatch } = useTimeHub();
  const { booking, plan, now } = useEduPlan(acc);
  const names = useNames();
  const fmt = useVars();
  const [raw, setRaw] = useState(state.settings.eduFinish ? state.settings.eduFinish.replace(":", "") : "");
  if (!booking || !plan) return null;
  const { win } = plan;
  const lineOf = (p, label) => {
    const base = { camp: label };
    if (p.cls === "before") {
      return p.steps.length
        ? t("eduC_bridge", { ...base, ...fmt({ finish: p.readyAt, dur: p.steps[0].durationMs, start: win.start }) })
        : t("eduC_wait", { ...base, ...fmt({ finish: p.readyAt, start: win.start }) });
    }
    if (p.cls === "over") return null;
    return t(`eduC_${p.cls}`, { ...base, ...fmt({ finish: p.readyAt, latest: win.latest, end: win.end, start: win.start }) });
  };
  // camps in the same situation share one line ("All camps: …") so identical text isn't repeated
  const groups = [];
  for (const p of plan.camps) {
    const key = `${p.cls}|${p.readyAt}|${p.steps[0]?.durationMs || 0}`;
    const g = groups.find((x) => x.key === key);
    if (g) g.camps.push(p); else groups.push({ key, camps: [p] });
  }
  const active = now >= win.start;
  const saveFinish = () => {
    const hhmm = parseCompactTime(raw);
    dispatch({ type: "settings", patch: { eduFinish: hhmm } });
  };
  const edu = plan.eduKnown;
  return (
    <div className="th-edu-plan">
      <div className="th-edu-head">
        <b>🎓 {t("eduPlanTitle")}</b>
        <button type="button" className="th-link" onClick={onClose}>{t("close")}</button>
      </div>
      <div className="th-edu-when">
        <Ltr>{formatTime(win.start, tz, lang)}–{formatTime(win.end, tz, lang)}</Ltr> · {formatDate(win.start, tz, lang)} · <Ltr>{formatTime(win.start, "UTC", lang)}</Ltr> UTC ·{" "}
        {win.end <= now ? t("eduOver") : active ? <>{t("endsIn")} <Remaining to={win.end} /></> : <>{t("startsIn")} <Remaining to={win.start} /></>}
      </div>

      {/* 1. what to do — one sentence */}
      <div className="th-edu-what">
        <span className="th-label">{t("eduWhatToDo")}</span>
        <p>{t(`eduH_${plan.headline.key}`, fmt(plan.headline.vars))}</p>
      </div>

      {/* 2. each camp on its own */}
      <ul className="th-edu-camps">
        {groups.map((g) => { const line = lineOf(g.camps[0], names(g.camps.map((c) => c.camp))); return line ? <li key={g.key} className={`c-${g.camps[0].cls}`}>{line}</li> : null; })}
      </ul>

      {/* 3. the timeline */}
      <ol className="th-edu-tl" aria-label={t("eduTimeline")}>
        <li className="now"><span className="ic">•</span><span className="tm"><Ltr>{formatTime(now, tz, lang)}</Ltr></span><span className="tx">{t("now")}</span></li>
        {plan.timeline.map((e, i) => {
          const label = e.type === "edu_start" ? t("eduT_edu_start") : e.type === "edu_end" ? t("eduT_edu_end")
            : t(`eduT_${e.type}`, { camps: names(e.camps), dur: e.durationMs ? formatSpan(e.durationMs, lang) : "" });
          return (
            <li key={`${e.type}-${e.at}-${i}`} className={e.type}>
              <span className="ic" aria-hidden="true">{TL_ICON[e.type]}</span>
              <span className="tm"><Ltr>{formatTime(e.at, tz, lang)}</Ltr></span>
              <span className="tx">{label}</span>
            </li>
          );
        })}
      </ol>
      <div className="th-edu-foot">
        <span>{t("eduCheckins", { n: plan.checkIns })}</span>
        <span>{edu ? t("eduBatchUsed") : t("eduSetBatch")}</span>
      </div>

      {/* 4. how to plan */}
      <div className="th-edu-pri">
        <span className="th-label">{t("eduPlanFor")}</span>
        <Seg value={state.settings.eduPri} onChange={(v) => dispatch({ type: "settings", patch: { eduPri: v } })} label={t("eduPlanFor")} options={[
          { value: "checkins", label: t("eduPri_checkins") }, { value: "uptime", label: t("eduPri_uptime") }, { value: "finish", label: t("eduPri_finish") },
        ]} />
        {state.settings.eduPri === "finish" && (
          <label className="th-edu-finish">
            <span className="th-label">{t("eduFinishAtLabel")}</span>
            <input className="th-input" inputMode="numeric" placeholder="0445" maxLength={5} value={raw}
              onChange={(e) => setRaw(e.target.value.replace(/[^\d:]/g, ""))} onBlur={saveFinish}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
            <span className="th-hint">{raw && !parseCompactTime(raw) ? t("finishInvalid") : t("eduFinishHint")}</span>
          </label>
        )}
      </div>
    </div>
  );
}

/** Planning first, no booking yet: real bookable slots that fit these camps (never books by itself). */
export function EducationFind({ acc, onClose }) {
  const { t, tz, lang, state, dataFor, openBooking } = useTimeHub();
  const now = useMinute();
  const data = dataFor(acc);
  const slots = useMemo(() => findEducationSlots({ now, camps: eduCampsFor(data, now), bookings: data.bookings, bufferMs: state.settings.eduBufferMin * MINUTE }),
    [data.timers, data.bookings, data.campMax, now, state.settings.eduBufferMin]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="th-edu-plan">
      <div className="th-edu-head"><b>🎓 {t("eduFind")}</b><button type="button" className="th-link" onClick={onClose}>{t("close")}</button></div>
      {slots.length === 0 && <p className="th-note">{t("eduNoSlot")}</p>}
      {slots.map((s, i) => (
        <div key={s.start} className="th-edu-slot">
          <span className="th-label">{i === 0 ? t("eduBestFit") : t("eduAlt")}</span>
          <b><Ltr>{formatTime(s.start, tz, lang)}–{formatTime(s.end, tz, lang)}</Ltr> · {formatDate(s.start, tz, lang)}</b>
          <small><Ltr>{formatTime(s.start, "UTC", lang)}</Ltr> UTC</small>
          <p>{s.inside > 0 ? t("eduWhyInside", { n: s.inside, total: s.total }) : t("eduWhyBridge", { time: formatTime(s.firstReady, tz, lang) })}</p>
          <Btn small tone="gold" onClick={() => openBooking({ accountId: acc, startAt: s.start, position: EDU_POSITION })}>{t("eduBook")}</Btn>
        </div>
      ))}
    </div>
  );
}

/** The one line that lives in a Training group: the booking (with a way in to the plan) or a quiet hint. */
export function EducationStrip({ acc, open, setOpen, hasCamps }) {
  const { t, tz, lang, state, dispatch } = useTimeHub();
  const { booking, now, data } = useEduPlan(acc);
  const kind = open?.kind;
  if (booking) {
    const win = { start: booking.startAt, end: booking.startAt + 30 * MINUTE };
    const live = now >= win.start;
    return (
      <div className="th-edu-strip">
        <div className="th-edu-line">
          <span>🎓 {t("eduStripLine", { time: `${formatTime(win.start, tz, lang)}–${formatTime(win.end, tz, lang)}` })} · {live ? <>{t("endsIn")} <Remaining to={win.end} /></> : <>{t("startsIn")} <Remaining to={win.start} /></>}</span>
          <button type="button" className="th-link" aria-expanded={kind === "edu"} onClick={() => setOpen(kind === "edu" ? null : { acc, kind: "edu" })}>
            {kind === "edu" ? t("eduHidePlan") : t("eduViewPlan")}
          </button>
        </div>
        {kind === "edu" && <EducationPlan acc={acc} onClose={() => setOpen(null)} />}
      </div>
    );
  }
  // planning first: one quiet, dismissible hint
  const soon = (data.timers || []).some((x) => x.kind === "training" && x.endAt > now && x.endAt < now + 12 * 3600000);
  const idle = TRAINING_CAMPS.some((c) => !(data.timers || []).some((x) => x.kind === "training" && x.category === c && x.endAt > now) && data.campMax?.[c]);
  if (!hasCamps || state.settings.eduDismiss?.[acc] || !(soon || idle)) return null;
  if (kind === "edufind") return <div className="th-edu-strip"><EducationFind acc={acc} onClose={() => setOpen(null)} /></div>;
  return (
    <div className="th-edu-strip hint">
      <span>🎓 {t("eduHint")}</span>
      <span className="th-item-actions">
        <button type="button" className="th-link" onClick={() => setOpen({ acc, kind: "edufind" })}>{t("eduFind")}</button>
        <button type="button" className="th-link" onClick={() => dispatch({ type: "settings", patch: { eduDismiss: { ...state.settings.eduDismiss, [acc]: true } } })}>{t("eduNotNow")}</button>
      </span>
    </div>
  );
}
