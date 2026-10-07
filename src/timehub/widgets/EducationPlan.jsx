/* Ministry of Education × Training — action first.
   The plan reads the SAME booking record as the Bookings tab (position "minister_education");
   this file only displays what lib/education.js works out. Recomputed on the minute clock and when
   its inputs change — never per second.
   Compact card: status → next action → then → check-ins → [View full plan]. Everything else
   (timeline, comparison, priority) lives behind the one toggle. */
import React, { useMemo, useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useMinute } from "../hooks/useNow.jsx";
import { TRAINING_CAMPS, campMaxFor, campMaxEduFor } from "../lib/timers.js";
import { eduBooking, buildEducationPlan, findEducationSlots, eduDoneKey, eduGapHeight, EDU_POSITION } from "../lib/education.js";
import { inSleepWindow } from "../lib/sleep.js";
import { formatTime, formatDate, formatSpan, parseCompactTime, zonedParts, MINUTE, DAY } from "../lib/time.js";
import { Btn, Seg, Ltr, Remaining } from "../components/ui.jsx";
import { success } from "../lib/feedback.js";

/** The account's camps as the planner needs them (running timer → its finish; otherwise idle). */
export function eduCampsFor(data, now) {
  return TRAINING_CAMPS.map((camp) => {
    const last = (data.timers || []).filter((x) => x.kind === "training" && x.category === camp).sort((a, b) => b.endAt - a.endAt)[0];
    const running = !!last && last.endAt > now;
    const troop = last?.troop === "helios" ? "helios" : "normal";
    return { camp, troop, running, finishAt: running ? last.endAt : null, lastEnd: last && !running ? last.endAt : null, normalMs: campMaxFor(data, camp, troop) || null, eduMs: campMaxEduFor(data, camp) };
  });
}

/** Booking + plan for one account (memoised on the inputs; `now` is the minute clock). */
export function useEduPlan(acc) {
  const { state, dataFor, tz } = useTimeHub();
  const now = useMinute();
  const data = dataFor(acc);
  const booking = eduBooking(data.bookings, now);
  const key = booking ? eduDoneKey(booking) : null;
  const done = (key && data.eduDone?.[key]) || {};
  const { eduPri, eduFinish, eduBufferMin, sleep } = state.settings;
  const plan = useMemo(() => (booking ? buildEducationPlan({
    now, camps: eduCampsFor(data, now), booking, priority: eduPri,
    desired: eduPri === "finish" && eduFinish ? { hhmm: eduFinish, tz } : null, bufferMs: eduBufferMin * MINUTE, sleep, tz, done,
  }) : null), [booking?.id, booking?.startAt, data.timers, data.campMax, data.campMaxEdu, data.helios, now, eduPri, eduFinish, eduBufferMin, tz, sleep, done.bridge, done.buff]); // eslint-disable-line react-hooks/exhaustive-deps
  return { booking, plan, now, data, done, key };
}

/** "Tomorrow" / a date / "" (today) for a moment, in the player's local calendar. */
function dayPrefix(at, now, tz, lang, t) {
  const a = zonedParts(at, tz), b = zonedParts(now, tz);
  const diff = Math.round((Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / DAY);
  if (diff === 0) return "";
  if (diff === 1) return t("tomorrow");
  return formatDate(at, tz, lang);
}

function useLabels(now) {
  const { t, tz, lang } = useTimeHub();
  const time = (at) => formatTime(at, tz, lang);
  const when = (at) => { const p = dayPrefix(at, now, tz, lang, t); return p ? `${p} · ${time(at)}` : time(at); };
  const camps = (list) => (list.length >= TRAINING_CAMPS.length ? t("eduCampsAll") : list.map((c) => t(`short_${c}`)).join(", "));
  const title = (a) => (a.type === "bridge" ? t("trEduA", { camps: camps(a.camps) }) : t("trPlanEdu", { camps: camps(a.camps) }));
  const detail = (a) => (a.durationMs ? t("eduTrainFor", { dur: formatSpan(a.durationMs, lang) }) : null);
  return { time, when, camps, title, detail };
}

function Action({ a, L, big }) {
  const { t } = useTimeHub();
  const d = L.detail(a);
  return (
    <div className={`th-edu-act ${big ? "big" : ""}`}>
      <div className="th-edu-act-title">{L.title(a)}</div>
      {d && <div className="th-edu-act-detail">{d}</div>}
      {a.type === "bridge" && <div className="th-edu-act-tag">{t("eduShortTraining")}</div>}
    </div>
  );
}

function EduFull({ acc, plan, now, done, onAddTime }) {
  const { t, tz, lang, state, dispatch } = useTimeHub();
  const L = useLabels(now);
  const [raw, setRaw] = useState(state.settings.eduFinish ? state.settings.eduFinish.replace(":", "") : "");
  const sleep = state.settings.sleep;
  const anyRunning = plan.camps.some((p) => p.finishAt != null && p.finishAt > now);
  const items = plan.timeline;
  const rows = [];
  let prev = { at: now, type: "now" };
  const gapKind = (p, n) => {
    if (p.type === "bridge" || (p.type === "buff" && n.type !== "edu_end")) return "train";
    if (p.type === "buff" || p.type === "edu_start") return n.type === "edu_end" ? "active" : "train";
    if (p.type === "edu_end") return "train";
    return "none";
  };
  items.forEach((e, i) => {
    const gapMs = e.at - prev.at;
    if (gapMs >= 10 * MINUTE) {
      let k = gapKind(prev, e);
      if (k === "none" && sleep && inSleepWindow(prev.at + gapMs / 2, tz, sleep)) k = "sleep";
      rows.push({ gap: true, ms: gapMs, k, id: `g${i}` });
    }
    rows.push({ e, id: `e${i}` });
    prev = e;
  });
  const saveFinish = () => dispatch({ type: "settings", patch: { eduFinish: parseCompactTime(raw) } });
  return (
    <div className="th-edu-full">
      <ol className="th-edu-flow" aria-label={t("eduTimeline")}>
        <li className="now"><span className="dot" /><span className="tm"><Ltr>{L.time(now)}</Ltr></span><span className="tx"><b>{t("now")}</b> · {anyRunning ? t("eduTL_training") : t("eduTL_ready")}</span></li>
        {done.bridge && <li className="checked"><span className="dot" /><span className="tm"><Ltr>{L.time(done.bridge)}</Ltr></span><span className="tx">✓ {t("eduBridgeDoneLine", { time: L.time(done.bridge) })}</span></li>}
        {rows.map((r) => {
          if (r.gap) {
            return <li key={r.id} className="gap" style={{ minHeight: eduGapHeight(r.ms) }}><span className="rail" /><span className="tx">{t(`eduGap_${r.k}`, { dur: formatSpan(r.ms, lang) })}</span></li>;
          }
          const e = r.e;
          if (e.kind === "action") {
            return (
              <li key={r.id} className="action">
                <span className="dot" /><span className="tm"><Ltr>{L.when(e.at)}</Ltr></span>
                <span className="tx">
                  <span className="tag">{t("eduTag_action")}{plan.actions.length > 1 ? ` ${e.n}` : ""}</span>
                  {e.eduStart && <span className="edu">🎓 {t("eduTL_edu_start")}</span>}
                  <Action a={e} L={L} />
                  {e.type === "bridge" && <span className="purpose">{L.time(e.at)}–{L.time(e.at + e.durationMs)} · {t("eduShortPurpose")}</span>}
                  {e.sleepShifted && <span className="purpose">{t("eduSleepShift", { from: L.time(plan.camps.find((p) => p.sleepShift)?.sleepShift.from ?? e.at), to: L.time(e.at) })}</span>}
                </span>
              </li>
            );
          }
          const label = e.type === "edu_start" ? `🎓 ${t("eduTL_edu_start")}` : e.type === "edu_end" ? t("eduTL_edu_end") : e.type === "final" ? t("eduTL_final") : t("eduTL_ready");
          return (
            <li key={r.id} className="milestone"><span className="dot" /><span className="tm"><Ltr>{L.when(e.at)}</Ltr></span><span className="tx">{label}<span className="info">{t("eduTag_info")}</span></span></li>
          );
        })}
        {!plan.eduKnown && plan.mode !== "over" && plan.mode !== "missed" && (
          <li className="milestone unknown"><span className="dot" /><span className="tm">—</span><span className="tx">{t("eduFinishUnknown")}
            <button type="button" className="th-link" onClick={onAddTime}>{t("eduNeedBtn")}</button></span></li>
        )}
      </ol>

      {plan.compare && (
        <div className="th-edu-compare">
          <b>{t("eduCompareTitle")}</b>
          {plan.compare.every((c) => c.normalMs === plan.compare[0].normalMs && c.eduMs === plan.compare[0].eduMs)
            ? (<div>{t("eduCompareNormal")} <b>{formatSpan(plan.compare[0].normalMs, lang)}</b> · {t("eduCompareEdu")} <b>{formatSpan(plan.compare[0].eduMs, lang)}</b>{plan.compare[0].diffMs > 0 && <> · {t("eduCompareDiff", { diff: formatSpan(plan.compare[0].diffMs, lang) })}</>}</div>)
            : plan.compare.map((c) => <div key={c.camp}>{t(`short_${c.camp}`)}: {formatSpan(c.normalMs, lang)} → <b>{formatSpan(c.eduMs, lang)}</b></div>)}
        </div>
      )}

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
          <p>{s.inside > 0 ? t("trEduWhyInside", { n: s.inside, total: s.total }) : t("trEduWhyBridge", { time: formatTime(s.firstReady, tz, lang) })}</p>
          <Btn small tone="gold" onClick={() => openBooking({ accountId: acc, startAt: s.start, position: EDU_POSITION })}>{t("eduBook")}</Btn>
        </div>
      ))}
    </div>
  );
}

/** Education prompts set aside with "Not now": hidden for this session, back the next time the app opens. */
const snoozed = new Set();

/** What lives in a Training group for Education: a one-line prompt while there is nothing to do
 *  yet (tap it for the full plan), the action card when it's time to act, or a quiet hint. */
export function EducationStrip({ acc, open, setOpen, hasCamps, onAddTime, onRestart, onPlan }) {
  const { t, tz, lang, state, updateAccount } = useTimeHub();
  const { booking, plan, now, data, done, key } = useEduPlan(acc);
  const L = useLabels(now);
  const [, bump] = useState(0);
  const snooze = (k) => { snoozed.add(k); bump((n) => n + 1); };
  const kind = open?.kind;
  if (booking && plan) {
    const { win, next, then, mode, active } = plan;
    const expanded = kind === "edu";
    const dayP = dayPrefix(win.start, now, tz, lang, t);
    // nothing to do yet: one line. The full card is for when it's time to act (or when asked for).
    // The full card is for the moment that matters — Education is active now (or was missed) — and for when it's asked for.
    if (!active && mode !== "missed" && mode !== "over" && !expanded && kind !== "edufind") {
      if (snoozed.has(`${acc}:${key}`)) return null;
      return (
        <div className="th-edu-mini">
          <button type="button" className="th-edu-mini-what" aria-expanded="false" onClick={() => setOpen({ acc, kind: "edu" })}>
            <span>🎓 <b>{t("eduCardTitle")}</b></span>
            <span><Ltr>{L.when(win.start)}</Ltr> <small><Ltr>{formatTime(win.start, "UTC", lang)}</Ltr> UTC</small></span>
          </button>
          <span className="th-item-actions">
            {onPlan && mode !== "done" && <Btn small onClick={onPlan}>{t("trPlanAround")}</Btn>}
            <button type="button" className="th-link" onClick={() => snooze(`${acc}:${key}`)}>{t("eduNotNow")}</button>
          </span>
        </div>
      );
    }
    const mark = (type) => { updateAccount(acc, (d) => ({ ...d, eduDone: { ...(d.eduDone || {}), [key]: { ...(d.eduDone?.[key] || {}), [type]: Date.now() } } })); success(); };
    const needTime = !plan.eduKnown && mode !== "over" && mode !== "missed" && mode !== "done";
    return (
      <div className={`th-edu-card mode-${mode} ${active ? "active" : ""}`}>
        {/* 1. which appointment: local time first, UTC and countdown quieter */}
        <div className="th-edu-top">
          <span className="th-edu-name">🎓 {t("eduCardTitle")}</span>
          <span className="th-edu-when">
            {mode === "over" ? t("eduOver") : active ? <>{t("eduActiveTitle")} · <Remaining to={win.end} /> {t("eduLeftWord")}</> : <>{t("startsIn")} <Remaining to={win.start} /></>}
          </span>
        </div>
        <div className="th-edu-window"><b><Ltr>{L.time(win.start)}–{L.time(win.end)}</Ltr></b><small>{dayP ? `${dayP} · ` : ""}<Ltr>{formatTime(win.start, "UTC", lang)}–{formatTime(win.end, "UTC", lang)}</Ltr> UTC</small></div>

        {/* 2. what to do */}
        {mode === "wait" && next && (
          <>
            <div className="th-edu-ok">✓ {t("eduSetForNow")}</div>
            <div className="th-edu-next">
              <div className="th-edu-kicker">{t("eduNextAction")} · {t("eduInWord")} <Remaining to={next.at} /></div>
              <div className="th-edu-when-big"><Ltr>{L.when(next.at)}</Ltr></div>
              <Action a={next} L={L} big />
            </div>
            {then && <div className="th-edu-then">{t("eduThen", { time: L.when(then.at), what: t("trPlanEdu", { camps: L.camps(then.camps) }) })}</div>}
          </>
        )}
        {mode === "doNow" && next && (
          <div className="th-edu-next now">
            <div className="th-edu-kicker">{t("eduDoNow")}</div>
            <Action a={next} L={L} big />
            <div className="th-item-actions">
              <Btn tone="gold" onClick={() => mark(next.type === "bridge" ? "bridge" : "buff")}>{t("eduDoneBtn")}</Btn>
              {onRestart && <button type="button" className="th-link" onClick={onRestart}>{t("trStart")}</button>}
            </div>
            {then && <div className="th-edu-then">{t("eduThen", { time: L.when(then.at), what: t("trPlanEdu", { camps: L.camps(then.camps) }) })}</div>}
          </div>
        )}
        {mode === "done" && (
          <div className="th-edu-ok">✓ {t("trEduDone", { time: L.time(done.buff) })}{plan.camps.find((p) => p.finalFinish) && <small>{t("eduTL_final")} · <Ltr>{L.when(plan.camps.find((p) => p.finalFinish).finalFinish)}</Ltr></small>}</div>
        )}
        {mode === "missed" && (
          <div className="th-edu-warn">{t("eduMissed")} <button type="button" className="th-link" onClick={() => setOpen({ acc, kind: "edufind" })}>{t("eduFind")}</button></div>
        )}

        {/* calm notes */}
        {plan.notices.map((n) => (
          <div key={n.key} className="th-edu-note">
            {n.key === "changed" && t("eduChanged", { since: L.when(n.since) })}
            {n.key === "sleepShift" && t("eduSleepShift", { from: L.time(n.from), to: L.time(n.to) })}
            {n.key === "asleepWindow" && t("eduAsleepWindow")}
          </div>
        ))}

        {/* 3. check-ins (only real player actions) */}
        {(mode === "wait" || mode === "doNow") && plan.checkIns > 0 && <div className="th-edu-check">{t(plan.checkIns === 1 ? "eduCheckinsOne" : "eduCheckinsMany", { n: plan.checkIns })}</div>}

        {/* 4. missing data, made actionable */}
        {needTime && (
          <div className="th-edu-need">
            <div><b>{t("eduNeedTitle")}</b><small>{t("eduNeedWhy")}</small></div>
            <Btn small onClick={onAddTime}>{t("eduNeedBtn")}</Btn>
          </div>
        )}

        {mode !== "over" && (
          <button type="button" className="th-edu-toggle" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : { acc, kind: "edu" })}>
            {expanded ? t("eduHideFull") : t("eduViewFull")}
          </button>
        )}
        {expanded && <EduFull acc={acc} plan={plan} now={now} done={done} onAddTime={onAddTime} />}
        {kind === "edufind" && <EducationFind acc={acc} onClose={() => setOpen(null)} />}
      </div>
    );
  }
  // planning first: one quiet, dismissible hint
  const soon = (data.timers || []).some((x) => x.kind === "training" && x.endAt > now && x.endAt < now + 12 * 3600000);
  const idle = TRAINING_CAMPS.some((c) => !(data.timers || []).some((x) => x.kind === "training" && x.category === c && x.endAt > now) && data.campMax?.[c]);
  if (!hasCamps || state.settings.eduDismiss?.[acc] || snoozed.has(acc) || !(soon || idle)) return null;
  if (kind === "edufind") return <div className="th-edu-strip"><EducationFind acc={acc} onClose={() => setOpen(null)} /></div>;
  return (
    <div className="th-edu-mini hint">
      <span>🎓 {t("trEduAsk")}</span>
      <span className="th-item-actions">
        <button type="button" className="th-link" onClick={() => setOpen({ acc, kind: "edufind" })}>{t("eduFind")}</button>
        <button type="button" className="th-link" onClick={() => snooze(acc)}>{t("eduNotNow")}</button>
      </span>
    </div>
  );
}
