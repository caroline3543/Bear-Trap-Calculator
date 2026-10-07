/* Training camps: the widget asks for each camp's full-batch time (normal and Helios),
   one form starts timers for all camps (same time or each camp), and "Finish at" says how long
   to train using the right full-batch time for the troop type. */
import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { success } from "../lib/feedback.js";
import { useMinute, useClockFor } from "../hooks/useNow.jsx";
import { TRAINING_CAMPS, applyTraining, busyCamps, planFinish, finishTogether, sortTimers, campMaxFor, hasHelios, campTroopsFor, troopsForDuration, durationForTroops, maxIncreases, applyLearnedMax, rememberTroops, defaultTroop, restartSummary, effectiveMax, capMaxFor, capEstimate, capKey, setCapMax, setCapOn, CAPACITY_FACTOR } from "../lib/timers.js";
import { crossesReset, checkInPlans, planJourney, modesDiffer } from "../lib/batches.js";
import { backPlan, resetTarget, startReminders, START_GRACE_MS } from "../lib/backplan.js";
import { timingCheck, nextCycleCheck, finishAdvice, nextFinishTarget, inSleepWindow, idleUntilWake } from "../lib/sleep.js";
import { EducationStrip, useEduPlan } from "./EducationPlan.jsx";
import { eduWindow, insideFinishTarget, eduAwareMax } from "../lib/education.js";
import { MINUTE, HOUR, DAY, parseCompactTime, zonedParts, zonedTimeToUtc, formatTime, formatDate, formatSpan, formatCountdown, formatCountdownClock, localDayRange, hhmmToMinutes, intlLocale } from "../lib/time.js";
import { Section, Btn, Field, Seg, DurationFields, EMPTY_DUR, durFrom, durParse, FormActions, Icon, Ltr, Bidi, Remaining, GroupName } from "../components/ui.jsx";
import { TimerRow, useWhenLocal } from "./TimerCard.jsx";

/** Local "HH:MM" of an instant, as the digits typed into Finish At (e.g. "2145"). */
function digitsAt(ms, tz) {
  const p = zonedParts(ms, tz);
  return `${String(p.hour).padStart(2, "0")}${String(p.minute).padStart(2, "0")}`;
}

/** The local calendar day of an instant, as a date input wants it ("2026-10-10"). */
function ymdAt(ms, tz) {
  const p = zonedParts(ms, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}
/** "Thursday" — the start time is read as a day + clock time. */
const weekdayOf = (ms, tz, lang) => new Intl.DateTimeFormat(intlLocale(lang), { timeZone: tz, weekday: "long" }).format(new Date(ms));
/** "36h 5m" — a long window also as plain hours (the game and players count SvS prep in hours). */
const hoursSpan = (ms, lang) => {
  const total = Math.max(0, Math.round(ms / MINUTE));
  const u = (unit, n) => new Intl.NumberFormat(intlLocale(lang), { style: "unit", unit, unitDisplay: "narrow" }).format(n);
  return total % 60 ? `${u("hour", Math.floor(total / 60))} ${u("minute", total % 60)}` : u("hour", total / 60);
};
/** Minutes after 00:00 UTC offered for "Just after reset" — the player picks; none is assumed. */
const RESET_OFFSETS = [5, 10, 30];
/** Add planned starts, replacing older reminders for the same camps (and a duplicate Education restart). */
const mergePlans = (old, extra, at, camps) => [...(old || []).filter((x) => x.startAt > at && (x.edu
  ? !extra.some((n) => n.edu && Math.abs(n.startAt - x.startAt) <= 30 * MINUTE)
  : !x.camps.some((c) => camps.includes(c)))), ...extra];

/** "Starts now · finishes 10:30 PM · 09:30 UTC" for each distinct finish — never implies camps
 *  finish together unless they do. */
function FinishPreview({ entries, now }) {
  const { t, tz, lang } = useTimeHub();
  const ok = entries.filter((e) => e.r && !e.r.error && e.r.ms > 0);
  if (!ok.length) return null;
  const byFinish = new Map();
  for (const e of ok) {
    const at = now + e.r.ms;
    const k = Math.floor(at / 60000);
    byFinish.set(k, { at, camps: [...(byFinish.get(k)?.camps || []), e.camp] });
  }
  return (
    <ul className="th-finish-preview">
      {[...byFinish.values()].sort((a, b) => a.at - b.at).map((g) => (
        <li key={g.at}>
          <span>{byFinish.size === 1 ? t("startsNowWord") : g.camps.map((c) => t(`short_${c}`)).join(", ")}</span>
          <b>{t("finishWord")} <Ltr>{formatTime(g.at, tz, lang)}</Ltr> · <Ltr>{formatTime(g.at, "UTC", lang)}</Ltr> UTC</b>
        </li>
      ))}
    </ul>
  );
}

/* ---------- shared pieces: the "before you restart" review, and Education-aware advice ---------- */

/** The compact summary shown before camps (re)start. Shows one shared finish only when every camp
 *  really does finish in the same minute; otherwise each camp's own finish time. Also where a
 *  longer-than-stored duration is either adopted (small increase) or confirmed (big jump). */
function ReviewCard({ title, review, onConfirm, onBack, onKeepOld }) {
  const { t, tz, lang } = useTimeHub();
  const sum = restartSummary(review.list, review.at);
  const name = (r) => `${t(r.camp)} · ${t(r.troop === "helios" ? "helios" : "normalTroops")}`;
  const ask = review.increases.filter((x) => x.kind === "confirm");
  const silent = review.increases.filter((x) => x.kind === "update");
  // one question per distinct change (same duration for all camps → asked once, not three times)
  const groups = Object.values(ask.reduce((m, x) => {
    const k = `${x.prevMs}|${x.ms}`;
    (m[k] = m[k] || { key: k, prevMs: x.prevMs, ms: x.ms, items: [] }).items.push(x);
    return m;
  }, {}));
  return (
    <div className="th-review" role="group" aria-label={title}>
      <b className="th-review-title">{title}</b>
      {sum.together && <div className="th-review-when">{t("finishAround", { time: formatTime(sum.finishAt, tz, lang) })} <span className="th-utc">· <Ltr>{formatTime(sum.finishAt, "UTC", lang)}</Ltr> UTC</span></div>}
      {!sum.together && <div className="th-review-when">{t("finishDifferent")}</div>}
      <ul className="th-review-list">
        {sum.rows.map((r) => (
          <li key={r.camp}><span>{name(r)}</span><span><b>{formatSpan(r.durationMs, lang)}</b>{!sum.together && <> → <Ltr>{formatTime(r.finishAt, tz, lang)}</Ltr></>}</span></li>
        ))}
      </ul>
      {review.chain && <p className="th-note">{t("chainNote", { n: review.chain.n, time: formatTime(review.chain.end, tz, lang) })}</p>}
      {review.busy?.length > 0 && <div className="th-warn">{t("replaceCamps", { camps: review.busy.map((c) => t(c)).join(", ") })}</div>}
      {silent.length > 0 && <p className="th-note">{t("maxLearnedNote", { list: silent.map((x) => `${t(`short_${x.camp}`)}${x.troop === "helios" ? ` ${t("helios")}` : ""} ${formatSpan(x.ms, lang)}`).join(", ") })}</p>}
      {groups.map((g) => (
        <div key={g.key} className="th-limit" role="alert">
          <span><b>{t("updateMaxQ")}</b> {t("updateMaxBody", { camp: g.items.map((x) => t(x.camp)).join(", "), prev: formatSpan(g.prevMs, lang), ms: formatSpan(g.ms, lang) })}</span>
          <span className="th-item-actions">
            <Btn small tone="gold" onClick={() => onConfirm({ accept: g.items.map((x) => `${x.camp}:${x.troop}`) })}>{t("useAsNewMax", { ms: formatSpan(g.ms, lang) })}</Btn>
            <Btn small onClick={() => onKeepOld(g.items)}>{t("keepOldMax", { prev: formatSpan(g.prevMs, lang) })}</Btn>
          </span>
        </div>
      ))}
      <div className="th-form-actions">
        <Btn tone="gold" onClick={() => onConfirm({ go: true })} disabled={ask.length > 0}>{review.restart ? t("restartVerb") : t("startVerb")}</Btn>
        <Btn onClick={onBack}>{t("back")}</Btn>
      </div>
    </div>
  );
}

/** Answering "Update maximum?" only resolves the question — the player still taps Restart. */
function answerReview(review, setReview, { accept, go }, commit) {
  if (accept) return setReview({ ...review, increases: review.increases.map((x) => (accept.includes(`${x.camp}:${x.troop}`) ? { ...x, kind: "update" } : x)) });
  if (go && !review.increases.some((x) => x.kind === "confirm")) commit(review.list, review.extraPlan, review.increases);
}
/** "Keep 7h": treat the long value as a typo and train for the stored maximum instead. */
function keepOldMaxes(review, setReview, items) {
  const hit = (e) => items.some((x) => x.camp === e.camp && x.troop === (e.troop === "helios" ? "helios" : "normal"));
  setReview({
    ...review,
    list: review.list.map((e) => (hit(e) ? { ...e, durationMs: items.find((x) => x.camp === e.camp).prevMs, mode: "max" } : e)),
    increases: review.increases.filter((y) => !hit(y)),
  });
}

/** "Maximum would keep your camps busy through Education" → a short run now, restart with the buff.
 *  Advice only: the Maximum button stays right there. */
function EduAdvice({ advice, onUse }) {
  const { t, tz, lang } = useTimeHub();
  const now = useMinute();
  const [why, setWhy] = useState(false);
  if (!advice) return null;
  const at = formatTime(advice.restartAt, tz, lang);
  return (
    <div className="th-advice" role="note">
      <div className="th-advice-head">{t("eduInLine", { time: formatSpan(advice.restartAt - now, lang) })}</div>
      {advice.kind === "bridge" ? (
        <>
          <p>{t("eduCanBeReady")}</p>
          <p className="th-advice-rec"><span className="th-advice-tag">{t("recommended")}</span> {t("eduRecBridge", { dur: formatSpan(advice.trainFor, lang), time: at })}</p>
        </>
      ) : <p className="th-advice-rec"><span className="th-advice-tag">{t("recommended")}</span> {t("eduRecWait", { time: at })}</p>}
      <div className="th-item-actions">
        <Btn small tone="gold" onClick={onUse}>{advice.kind === "bridge" ? t("useThisPlan") : t("remindAtTime", { time: at })}</Btn>
        <button type="button" className="th-link" aria-expanded={why} onClick={() => setWhy(!why)}>{t("whyThis")}</button>
      </div>
      {why && <p className="th-advice-why">{advice.kind === "bridge" ? t("whyBridge") : t("whyWait")}</p>}
    </div>
  );
}

/** Advice for a set of camps' maximums against this account's next Education appointment. */
function useEduAdvice(accountId, maxMsList) {
  const { state } = useTimeHub();
  const { booking } = useEduPlan(accountId);
  const now = useMinute();
  if (!booking || !maxMsList.length) return null;
  const win = eduWindow(booking, state.settings.eduBufferMin * 60000);
  return eduAwareMax(now, Math.max(...maxMsList), win);
}

/** Training Capacity calibration: shows the normal maximum and the ×3 estimate for each selected
 *  camp, and saves only what the player confirms (or types from the game). Never a warning. */
function CapCalibration({ accountId, rows, onDone, onCancel }) {
  const { t, lang, updateAccount } = useTimeHub();
  const [editing, setEditing] = useState(rows.some((r) => !r.est));
  const [vals, setVals] = useState(() => Object.fromEntries(rows.map((r) => [r.key, durFrom(r.cur || r.est)])));
  const name = (r) => (r.troop === "helios" ? t("heliosCamp", { camp: t(r.camp) }) : t(r.camp));
  const ests = [...new Set(rows.map((r) => r.est))];
  const save = (values) => { updateAccount(accountId, (d) => setCapOn(setCapMax(d, values), true)); onDone(); };
  const typed = rows.map((r) => ({ r, v: durParse(vals[r.key] || EMPTY_DUR) }));
  const bad = typed.some(({ v }) => v.error || !v.ms);
  return (
    <div className="th-capcal" role="group" aria-label={t("capLabel")}>
      <b className="th-capcal-title">{t("capLabel")}</b>
      <p className="th-capcal-sub">{t("capCalTriples")}</p>
      <ul className="th-capcal-list">
        {rows.map((r) => (
          <li key={r.key}>
            <span className="th-capcal-name">{name(r)}</span>
            <span className="th-hint">{r.normal ? t("capCalNormal", { max: formatSpan(r.normal, lang) }) : t("capCalNoNormal")}</span>
            {!editing && r.est && <b>{t("capCalEstimate", { max: formatSpan(r.est, lang) })}</b>}
            {editing && <DurationFields value={vals[r.key] || EMPTY_DUR} onChange={(v) => setVals({ ...vals, [r.key]: v })} label={t("capActualQ")} />}
          </li>
        ))}
      </ul>
      {!editing ? (
        <>
          <p className="th-capcal-q">{t("capCalQ")}</p>
          <div className="th-item-actions">
            <Btn small tone="gold" onClick={() => save(Object.fromEntries(rows.map((r) => [r.key, r.est])))}>{ests.length === 1 ? t("capUseEst", { max: formatSpan(ests[0], lang) }) : t("capUseEsts")}</Btn>
            <Btn small onClick={() => setEditing(true)}>{t("capChange")}</Btn>
            <Btn small onClick={onCancel}>{t("cancel")}</Btn>
          </div>
        </>
      ) : (
        <div className="th-item-actions">
          <Btn small tone="gold" disabled={bad} onClick={() => save(Object.fromEntries(typed.map(({ r, v }) => [r.key, v.ms])))}>{t("save")}</Btn>
          <Btn small onClick={onCancel}>{t("cancel")}</Btn>
        </div>
      )}
    </div>
  );
}

/** The plan as a short sequence: Now → check-ins → target. The typed target is always the end.
 *  Education (when it's between now and the target) is shown as fitting into the plan or skipped. */
function JourneyPlan({ plan, mode, setMode, showModes, win, minMax, other }) {
  const { t, tz, lang, state } = useTimeHub();
  const sleep = state.settings.sleep;
  const span = (ms) => formatSpan(ms, lang);
  const loc = (ms) => <Ltr>{formatTime(ms, tz, lang)}</Ltr>;
  const utc = (ms) => <small className="th-utc"><Ltr>{formatTime(ms, "UTC", lang)}</Ltr> UTC</small>;
  const day = (ms) => (localDayRange(plan.start, tz, 0).end > ms ? "" : `${localDayRange(plan.start, tz, 1).end > ms ? t("tomorrowLower") : formatDate(ms, tz, lang)} `);
  const needsCycles = plan.camps.some((c) => plan.windowMs > c.maxMs);
  const points = [plan.start, ...plan.checkIns.map((c) => c.at), plan.end];
  const sub = (p) => `${p.usesEdu ? t("bpUsesEdu") : plan.eduIn ? t("bpSkipsEdu") : ""}${p.usesEdu || plan.eduIn ? " · " : ""}${t("bpCheckinsN", { n: p.checkIns.length })}`;
  return (
    <div className="th-bplan" role="group" aria-label={t("bpTitle")}>
      <p className="th-bplan-why">
        🎯 {t("bpTargetAway", { time: span(plan.windowMs) })}
        {minMax > 0 && <> · {t("bpYourMax", { max: span(minMax) })}</>}
        {needsCycles && <> {t("bpNeedsCycles")}</>}
      </p>
      {win && plan.eduIn && (
        <p className="th-bplan-edu">
          🎓 <b>{t("eduWord")}</b> {day(win.start)}{loc(win.start)}–{loc(win.end)} <small className="th-utc"><Ltr>{formatTime(win.start, "UTC", lang)}–{formatTime(win.end, "UTC", lang)}</Ltr> UTC</small>
          <br /><span className={plan.usesEdu ? "th-bplan-ok" : "th-bplan-skip"}>{plan.usesEdu ? t("bpEduFits", { time: formatTime(plan.end, tz, lang) }) : t("bpEduSkipped")}</span>
        </p>
      )}
      {showModes && (
        <>
          <Seg value={mode} onChange={setMode} label={t("bpModeQ")} options={[{ value: "max", label: t("bpModeMax") }, { value: "fewest", label: t("bpModeFewest") }]} />
          <p className="th-bplan-modesub">{sub(plan)}<span className="th-hint"> · {t("bpOtherOption", { what: sub(other) })}</span></p>
        </>
      )}
      {mode === "fewest" && plan.idleMs > 0 && (
        <p className="th-bplan-warn">{t("bpFewestNote", { n: plan.checkIns.length, idle: span(plan.idleMs), trained: span(plan.trainedMs), window: span(plan.windowMs) })}</p>
      )}
      <ol className="th-seq">
        {points.map((at, i) => {
          const ci = i > 0 && i < points.length - 1 ? plan.checkIns[i - 1] : null;
          const last = i === points.length - 1;
          const label = i === 0 ? t("bpStartTraining")
            : last ? <>✓ {t("bpTargetFinish")}{crossesReset(plan.start, at) && <> · {t("afterReset")}</>}</>
            : ci.edu ? <>🎓 {t("bpRestartEdu")}</>
            : i === points.length - 2 ? (ci.camps.length === plan.camps.length ? t("bpRestartFinal") : t("bpRestartSome", { camps: ci.camps.map((c) => t(`short_${c}`)).join(", ") }))
            : ci.camps.length === plan.camps.length ? t("bpRestart") : t("bpRestartSome", { camps: ci.camps.map((c) => t(`short_${c}`)).join(", ") });
          return (
            <React.Fragment key={at}>
              {i > 0 && <li className="th-seq-gap" aria-hidden="true">↓ {span(at - points[i - 1])}</li>}
              <li className={`th-seq-pt ${last ? "end" : ""} ${ci?.edu ? "edu" : ""}`}>
                <span className="th-seq-time">{i === 0 ? <b>{t("bpNow")}</b> : <><b>{day(at)}{loc(at)}</b> {utc(at)}</>}</span>
                <span className="th-seq-what">{label}{ci && inSleepWindow(at, tz, sleep) && <span className="th-bplan-sleep"> · 🌙 {t("bpAsleep")}</span>}</span>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
      {plan.checkIns.length > 0 && <p className="th-bplan-count">{t("bpCheckinsN", { n: plan.checkIns.length })}</p>}
      {!plan.sameBatches && (
        <details className="th-secondary">
          <summary>{t("bpViewFull")}</summary>
          <ul className="th-bplan-percamp">
            {plan.camps.map((c) => (
              <li key={c.camp}><b>{t(`short_${c.camp}`)}{c.troop === "helios" ? ` · ${t("helios")}` : ""}</b> <span>{c.batches.map((b) => span(b.ms)).join(" + ")}</span></li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function TrainForm({ onDone, preset, accountId, onEditTimes }) {
  const { t, lang, tz, newId, dataFor, updateAccount, state, notify, dispatch } = useTimeHub();
  const sleep = state.settings.sleep;
  const now = useMinute(); // the planner works in minutes
  const data = dataFor(accountId);
  const restart = !!preset?.restart;
  const [mode, setMode] = useState(preset?.ms && !restart ? "custom" : "finish"); // finish (default) | custom (Duration) | max
  const [share, setShare] = useState(preset?.camp ? "each" : "same");
  const [shared, setShared] = useState(preset?.camps && preset.ms ? durFrom(preset.ms) : EMPTY_DUR);
  const [each, setEach] = useState(() => Object.fromEntries(TRAINING_CAMPS.map((c) => [c, preset?.camp === c ? durFrom(preset.ms) : EMPTY_DUR])));
  // Opened at (or after) a start reminder: carry on with that reminder's target and camps.
  const [duePlan] = useState(() => {
    if (preset?.ms) return null;
    const cap = data.trainCap?.on === true;
    const longest = (p) => Math.max(0, ...p.camps.map((c) => effectiveMax(data, c, hasHelios(data, c) ? defaultTroop(data, c) : "normal", cap) || 0));
    return (data.plans || []).filter((p) => !p.edu && p.startAt <= now + 10 * MINUTE && p.target - now > 10 * MINUTE && p.target - p.startAt <= longest(p) + 10 * MINUTE)
      .sort((a, b) => b.startAt - a.startAt)[0] || null;
  });
  const [ticked, setTicked] = useState(() => Object.fromEntries(TRAINING_CAMPS.map((c) => [c, preset?.camps ? preset.camps.includes(c) : preset?.camp ? preset.camp === c : duePlan ? duePlan.camps.includes(c) : true])));
  // troop type per camp: what the player last chose for that camp (only if it has Helios)
  const [troops, setTroops] = useState(() => Object.fromEntries(TRAINING_CAMPS.map((c) => {
    const want = preset?.camp === c && preset.troop ? preset.troop : preset?.troops?.[c];
    return [c, hasHelios(data, c) ? (want === "helios" || want === "normal" ? want : defaultTroop(data, c)) : "normal"];
  })));
  const [review, setReview] = useState(null); // { list, extraPlan, busy, increases, at, restart }
  const [longOk, setLongOk] = useState(false); // "my camps can train this long in ONE batch" (explicit, learns the max)
  // Training Capacity (×3 capacity and duration) — remembered per account; uses its own confirmed maximum
  const [capOn, setCapOnState] = useState(data.trainCap?.on === true);
  const [calibrate, setCalibrate] = useState(false);
  const [dayAdd, setDayAdd] = useState(0); // finish 1–3 days after the next occurrence of the time typed
  // the target: a typed time (+ day), "just after reset" (+ the offset the player picked), or the Education booking
  const [tgtKind, setTgtKind] = useState("time"); // time | reset | edu
  const [resetOpen, setResetOpen] = useState(false);
  const [resetOff, setResetOff] = useState(null);
  const [customDate, setCustomDate] = useState(() => (duePlan ? ymdAt(duePlan.target, tz) : "")); // a local day "YYYY-MM-DD"
  const [dateOpen, setDateOpen] = useState(false);
  const [eduNote, setEduNote] = useState(false);
  const [batch, setBatch] = useState("max"); // each camp's own maximum | one typed duration
  const [bdur, setBdur] = useState(EMPTY_DUR);
  // finish together (each camp its own start — the default) | start together (shorter batches end earlier)
  const [sync, setSync] = useState(() => (duePlan && new Set(duePlan.camps.map((c) => effectiveMax(data, c, hasHelios(data, c) ? defaultTroop(data, c) : "normal", data.trainCap?.on === true))).size > 1 ? "start" : "finish"));
  const timeRef = React.useRef(null);
  // planning goal: the player's last choice (remembered); first time it depends on the target
  const [pmodeRaw, setPmodeRaw] = useState(state.settings.trainPlanMode || null);
  const setPmode = (v) => { setPmodeRaw(v); dispatch({ type: "settings", patch: { trainPlanMode: v } }); };
  const maxOf = (c) => effectiveMax(data, c, troopOf(c), capOn);
  const [error, setError] = useState(null);
  const troopOf = (c) => (hasHelios(data, c) ? troops[c] : "normal");
  const toggleCap = (on) => {
    setCapOnState(on);
    setLongOk(false);
    updateAccount(accountId, (d) => setCapOn(d, on)); // a first-time calibration opens by itself (capMissing)
    setCalibrate(false);
  };
  const troopToggle = (c) => hasHelios(data, c) && (
    <span className="th-troop" role="group" aria-label={t(c)}>
      {["normal", "helios"].map((tp) => (
        <button key={tp} type="button" aria-pressed={troops[c] === tp} onClick={() => setTroops({ ...troops, [c]: tp })}>{t(tp === "helios" ? "helios" : "normalTroops")}</button>
      ))}
    </span>
  );
  const campChecks = (
    <div className="th-checks">
      {TRAINING_CAMPS.map((c) => (
        <div key={c} className="th-camp-pick">
          <label className="th-check"><input type="checkbox" checked={ticked[c]} onChange={(e) => setTicked({ ...ticked, [c]: e.target.checked })} />{t(c)}</label>
          {ticked[c] && troopToggle(c)}
        </div>
      ))}
    </div>
  );

  const switchShare = (v) => {
    if (v === "each" && (shared.days || shared.hhmm)) setEach((e) => Object.fromEntries(TRAINING_CAMPS.map((c) => [c, e[c].days || e[c].hhmm ? e[c] : shared])));
    setShare(v);
  };

  // --- Duration entries
  const entries = share === "same"
    ? TRAINING_CAMPS.filter((c) => ticked[c]).map((camp) => ({ camp, troop: troopOf(camp), r: durParse(shared) }))
    : TRAINING_CAMPS.filter((c) => each[c].days || each[c].hhmm).map((camp) => ({ camp, troop: troopOf(camp), r: durParse(each[camp]) }));

  // --- Maximum: run each selected camp for ITS OWN known maximum
  const maxEntries = TRAINING_CAMPS.filter((c) => ticked[c]).map((camp) => ({ camp, troop: troopOf(camp), max: maxOf(camp) }));
  const maxKnown = maxEntries.filter((x) => x.max > 0);
  const advice = useEduAdvice(accountId, mode === "max" ? maxKnown.map((x) => x.max) : []);

  function startMax() {
    if (!maxKnown.length) return setError(t("errPickCamp"));
    setError(null);
    withReview(maxKnown.map(({ camp, troop, max }) => ({ camp, troop, durationMs: max, mode: "max" })));
  }
  function useAdvice() {
    const at = Date.now();
    const plan = { id: newId(), camps: maxKnown.map((x) => x.camp), startAt: advice.restartAt, target: advice.restartAt + 30 * MINUTE, edu: true };
    if (advice.kind === "wait") {
      updateAccount(accountId, (d) => ({ ...d, plans: [...(d.plans || []).filter((x) => x.startAt > at), plan] }));
      notify([`✓ ${t("remindAtTime", { time: formatTime(advice.restartAt, tz, lang) })}`]);
      return onDone();
    }
    withReview(maxKnown.map(({ camp, troop, max }) => ({ camp, troop, durationMs: Math.min(max, advice.trainFor), mode: "custom" })), plan);
  }

  // --- Finish at (default): WORK BACKWARDS from the target → "when do I press Train?"
  const planCamps = TRAINING_CAMPS.filter((c) => ticked[c]);
  const maxes = planCamps.map((c) => ({ camp: c, max: maxOf(c) }));
  // Training Capacity on, but a selected camp has no confirmed capacity maximum yet → calibrate first
  const capMissing = capOn ? planCamps.filter((c) => !(capMaxFor(data, c, troopOf(c)) > 0)) : [];
  const capRows = (calibrate ? planCamps : capMissing).map((c) => ({
    camp: c, troop: troopOf(c), key: capKey(c, troopOf(c)), normal: campMaxFor(data, c, troopOf(c)),
    est: capEstimate(data, c, troopOf(c)), cur: capMaxFor(data, c, troopOf(c)),
  }));
  const known = maxes.filter((m) => m.max > 0);
  const limit = known.length ? known.reduce((a, b) => (b.max < a.max ? b : a)) : null; // the camp that runs out first
  const sAdvice = limit ? finishAdvice(now, limit.max, tz, sleep) : null;
  const [raw, setRaw] = useState(() => (duePlan ? digitsAt(duePlan.target, tz) : sAdvice ? digitsAt(sAdvice.finishAt, tz) : ""));
  const { booking: eduB } = useEduPlan(accountId);
  const eduWin = eduB ? eduWindow(eduB, state.settings.eduBufferMin * 60000) : null;
  // "Minister booking" target: camps free when Education STARTS, so they can be restarted with the buff
  const eduGoal = tgtKind === "edu" && !!eduWin && eduWin.start - now >= MINUTE;
  const hhmm = parseCompactTime(raw);
  const target0 = hhmm ? nextFinishTarget(now, hhmm, tz) : NaN;
  // n days later, same local clock time (via the next occurrence, so daylight saving can't shift it)
  const dayTarget = (n) => (n === 0 ? target0 : nextFinishTarget(target0 + n * DAY - 2 * HOUR, hhmm, tz));
  const customTarget = customDate && hhmm ? (() => {
    const [y, mo, d] = customDate.split("-").map(Number);
    const m = hhmmToMinutes(hhmm);
    return zonedTimeToUtc(y, mo, d, Math.floor(m / 60), m % 60, tz);
  })() : NaN;
  const target = eduGoal ? eduWin.start : customDate ? customTarget : Number.isFinite(target0) ? dayTarget(dayAdd) : NaN;
  const targetOk = Number.isFinite(target) && target - now >= MINUTE;
  // each camp's batch: its own maximum (normal / Helios / Training Capacity), or one typed duration
  const bd = durParse(bdur);
  const customMs = !bd.error && bd.ms > 0 ? bd.ms : 0;
  const rowsIn = planCamps.map((c) => ({ camp: c, troop: troopOf(c), durMs: batch === "custom" ? customMs : maxOf(c) }));
  const bp = targetOk && !capMissing.length ? backPlan(now, target, rowsIn, { sync }) : null;
  const back = bp?.ok ? bp : null; // start = target − duration, per camp
  const later = back ? back.groups.filter((g) => g.state === "future") : [];
  const nowG = back ? back.groups.filter((g) => g.state !== "future") : [];
  const missed = back ? back.groups.filter((g) => g.state === "passed") : [];
  // everyday case ("finish at 10 PM" with less than a full normal batch left): calm, not a problem
  const calm = missed.length > 0 && !capOn && batch === "max";
  const endsDiffer = !!back && new Set(back.rows.map((r) => r.end)).size > 1;
  // Normal vs Training Capacity for this target — only from confirmed maximums, only when it helps
  const cmp = (() => {
    if (!targetOk || batch !== "max" || !planCamps.length) return null;
    if (!planCamps.every((c) => capMaxFor(data, c, troopOf(c)) > 0 && campMaxFor(data, c, troopOf(c)) > 0)) return null;
    const mk = (cap) => backPlan(now, target, planCamps.map((c) => ({ camp: c, troop: troopOf(c), durMs: effectiveMax(data, c, troopOf(c), cap) })), { sync });
    const normal = mk(false);
    const cap = mk(true);
    return normal.ok && cap.ok && (capOn || normal.state === "future" || normal.state === "mixed") ? { normal, cap } : null;
  })();

  // The alternative to waiting for the start: train non-stop until the target (batches + check-ins).
  const plans = planCamps.map((camp) => ({ camp, troop: troopOf(camp), plan: planFinish(target, now, maxOf(camp)) }));
  const tooLong = plans.filter((x) => x.plan.ok && !x.plan.fitsMax);
  const specs = planCamps.map((c) => ({ camp: c, troop: troopOf(c), maxMs: maxOf(c) }));
  const canPlan = targetOk && batch === "max" && !capMissing.length && specs.some((x) => x.maxMs > 0);
  const jOpts = eduGoal ? { win: null, eduAt: null } : { win: eduWin, eduAt: eduWin ? insideFinishTarget(eduWin) : null };
  const jMax = canPlan ? planJourney(now, target, specs, { ...jOpts, mode: "max" }) : null;
  const jFew = canPlan ? planJourney(now, target, specs, { ...jOpts, mode: "fewest" }) : null;
  const pmode = pmodeRaw || (jFew?.ok && !jFew.multi ? "fewest" : "max");
  const bplan = pmode === "max" ? jMax : jFew;
  const showModes = modesDiffer(jMax, jFew);
  const multi = !!(bplan?.ok && bplan.checkIns.length > 0 && !longOk); // needs at least one check-in
  const nonstop = later.length > 0 && !!bplan?.ok && bplan.checkIns.length > 0;
  const isAdvice = sAdvice && Number.isFinite(target) && Math.abs(target - sAdvice.finishAt) < 60000;
  const dayWordFor = (x) => (localDayRange(now, tz, 0).end > x ? t("today") : localDayRange(now, tz, 1).end > x ? t("tomorrow") : formatDate(x, tz, lang));
  const dayWord = Number.isFinite(target) ? dayWordFor(target) : "";
  const afterReset = crossesReset(now, target);
  const need = Number.isFinite(target) ? Math.floor((target - now) / MINUTE) * MINUTE : 0;
  const span = (ms) => formatSpan(ms, lang);
  const clock = (ms) => <Ltr>{formatTime(ms, tz, lang)}</Ltr>;
  const utcOf = (ms) => <small className="th-utc"><Ltr>{formatTime(ms, "UTC", lang)}</Ltr> UTC</small>;
  // "Today 9:23 PM"; a moment before today (a start that has gone by) is named by its weekday
  const whenShort = (ms) => `${ms < localDayRange(now, tz, 0).start ? weekdayOf(ms, tz, lang) : dayWordFor(ms)} ${formatTime(ms, tz, lang)}`;
  const whenDay = (ms) => `${weekdayOf(ms, tz, lang)} ${formatTime(ms, tz, lang)}`;
  const campNames = (cs) => cs.map((c) => t(`short_${c}`)).join(", ");
  // a camp still training past its planned start can't start then
  const busyPast = back ? (data.timers || []).filter((x) => x.kind === "training" && back.rows.some((r) => r.camp === x.category && r.state === "future" && x.endAt > r.start + START_GRACE_MS)) : [];

  function commit(list, extraPlan, accepted = []) {
    const at = Date.now();
    updateAccount(accountId, (d) => {
      const learned = applyLearnedMax(d, accepted, at);
      return {
        ...rememberTroops(learned, list),
        timers: applyTraining(d.timers, list, at, newId),
        plans: Array.isArray(extraPlan)
          ? mergePlans(d.plans, extraPlan, at, [...list.map((e) => e.camp), ...extraPlan.filter((x) => !x.edu).flatMap((x) => x.camps)])
          : extraPlan ? [...(d.plans || []).filter((x) => x.startAt > at), extraPlan]
          // these camps are training now: their start reminder (if it was due) is done
          : (d.plans || []).filter((x) => x.edu || x.startAt > at + START_GRACE_MS || !x.camps.some((c) => list.some((e) => e.camp === c))),
      };
    });
    success();
    const sum = restartSummary(list, at);
    notify([`✓ ${restart ? t("campsRestarted", { n: list.length }) : t("trainingStartedN", { n: list.length })}`,
      sum.together ? t("finishAround", { time: formatTime(sum.finishAt, tz, lang) }) : t("finishDifferent")]);
    onDone();
  }

  /** Every start goes through the compact summary, except editing a single camp's time with
   *  nothing to replace or learn (that stays a one-tap correction). */
  function withReview(list, extraPlan, chain = null) {
    const busy = busyCamps(data.timers, list.map((e) => e.camp), now);
    const increases = capOn ? [] : maxIncreases(data, list); // capacity runs never change the normal maximum
    if (list.length === 1 && !busy.length && !increases.length && !restart && !chain) return commit(list, extraPlan);
    setReview({ list, extraPlan, busy, increases, at: Date.now(), restart, chain });
  }
  function confirmReview(a) { answerReview(review, setReview, a, commit); }
  function keepOld(items) { keepOldMaxes(review, setReview, items); }

  function saveLeft() {
    if (!entries.length) return setError(t("errPickCamp"));
    if (entries.some((e) => e.r.error)) return setError(t("errDigitsFix"));
    setError(null);
    withReview(entries.map((e) => ({ camp: e.camp, troop: e.troop, durationMs: e.r.ms, mode: "custom" })));
  }

  /** Non-stop alternative: batch 1 starts now, the restarts become planned check-ins. */
  function startPlanNow() {
    if (!plans.length) return setError(t("errPickCamp"));
    if (!targetOk || plans.some((x) => !x.plan.ok)) return setError(t("errPlanPast"));
    if (capMissing.length) return setCalibrate(true);
    setError(null);
    if (multi) {
      const list = bplan.camps.map((c) => ({ camp: c.camp, troop: c.troop, durationMs: c.batches[0].ms, mode: "finish" }));
      return withReview(list, checkInPlans(bplan, newId), { n: bplan.checkIns.length, end: bplan.end });
    }
    // "my camps can train this long in ONE batch" (the review offers to save it as the new maximum)
    withReview(plans.map(({ camp, troop, plan }) => ({ camp, troop, durationMs: plan.fitsMax ? plan.trainFor : need, mode: "finish" })));
  }

  const eduRestart = () => ({ id: newId(), camps: planCamps, startAt: eduWin.start, target: eduWin.start + 30 * MINUTE, edu: true });
  /** The start is later: add it as planned starts — the records the Timeline and reminders already use. */
  function addStartReminder(withEdu) {
    if (!back) return;
    const rem = startReminders(back, target, newId);
    const extra = withEdu && eduGoal ? [...rem, eduRestart()] : rem;
    if (!extra.length) return;
    const at = Date.now();
    updateAccount(accountId, (d) => ({ ...d, plans: mergePlans(d.plans, extra, at, rem.flatMap((x) => x.camps)) }));
    success();
    notify([`✓ ${t("bkReminderAdded")}`, ...rem.map((x) => `${campNames(x.camps)} · ${whenShort(x.startAt)}`)]);
    onDone();
  }
  /** Start what starts now (already trimmed to finish ON the target); later camps get start reminders. */
  function startBack(withEdu) {
    if (!planCamps.length) return setError(t("errPickCamp"));
    if (!back) return;
    const list = back.rows.filter((r) => r.state !== "future").map((r) => ({ camp: r.camp, troop: r.troop, durationMs: r.durMs, mode: batch === "max" && r.durMs === r.fullMs ? "max" : "finish" }));
    if (!list.length) return addStartReminder(withEdu);
    setError(null);
    const extra = [...startReminders(back, target, newId), ...(withEdu && eduGoal ? [eduRestart()] : [])];
    withReview(list, extra.length ? extra : undefined);
  }
  const pickTime = () => { setTgtKind("time"); setResetOff(null); };
  const setTargetAt = (ms) => { setRaw(digitsAt(ms, tz)); setCustomDate(ymdAt(ms, tz)); setDayAdd(0); pickTime(); setLongOk(false); };
  const pickReset = (off) => {
    setRaw(digitsAt(resetTarget(now, off), tz)); setDayAdd(0); setCustomDate(""); setDateOpen(false);
    setTgtKind("reset"); setResetOff(off); setResetOpen(false); setLongOk(false);
  };
  const pickEdu = () => {
    setResetOpen(false);
    if (tgtKind === "edu") { setEduNote(false); return pickTime(); }
    if (!eduWin) return setEduNote("none");
    if (eduWin.start - now < MINUTE) return setEduNote("active");
    setRaw(digitsAt(eduWin.start, tz)); setDayAdd(0); setCustomDate(""); setDateOpen(false);
    setTgtKind("edu"); setResetOff(null); setEduNote(false); setLongOk(false);
  };

  const title = restart ? t("restartAllCampsTitle") : null;
  if (review) {
    return (
      <div className="th-form">
        <ReviewCard title={restart ? t("restartAllCampsTitle") : t("startTrainingTitle")} review={review} onConfirm={confirmReview} onKeepOld={keepOld} onBack={() => setReview(null)} />
      </div>
    );
  }

  const modeTabs = (
    <>
      {title && <b className="th-restart-title">{title}</b>}
      <Seg value={mode} onChange={(v) => { setMode(v); setError(null); }} label={t("trainingMode")} options={[
        { value: "finish", label: t("modeFinishShort") },
        { value: "custom", label: t("modeDurationShort") },
        { value: "max", label: t("modeMaxShort") },
      ]} />
      <p className="th-hint th-mode-note">{t(mode === "finish" ? "modeFinishHelp" : mode === "custom" ? "modeDurationHelp" : "modeMaxHelp")}</p>
    </>
  );
  // the large calibration form: only the first time, or after "Edit maximums"
  const capCal = capOn && (calibrate || capMissing.length > 0) && capRows.length > 0 && (
    <CapCalibration key={capRows.map((r) => r.key).join()} accountId={accountId} rows={capRows}
      onDone={() => setCalibrate(false)} onCancel={() => { setCalibrate(false); if (capMissing.length) toggleCap(false); }} />
  );
  const modeBar = (
    <>
      {modeTabs}
      <div className="th-cap">
        <label className="th-check">
          <input type="checkbox" checked={capOn} onChange={(e) => toggleCap(e.target.checked)} />
          <span><b>{t("capLabel")}</b><small>{t("capSub")}</small></span>
        </label>
        {capOn && !capMissing.length && !calibrate && planCamps.length > 0 && (
          <span className="th-cap-max">
            {t("capMaxLine", { list: [...new Set(planCamps.map((c) => formatSpan(maxOf(c), lang)))].length === 1
              ? formatSpan(maxOf(planCamps[0]), lang)
              : planCamps.map((c) => `${t(`short_${c}`)} ${formatSpan(maxOf(c), lang)}`).join(" · ") })}{" "}
            <button type="button" className="th-link" onClick={() => setCalibrate(true)}>{t("bkEditMax")}</button>
          </span>
        )}
      </div>
      {capCal}
    </>
  );

  if (mode === "max") {
    return (
      <div className="th-form">
        {modeBar}
        {campChecks}
        {maxKnown.length > 0 && (
          <ul className="th-max-list">
            {maxKnown.map((x) => (
              <li key={x.camp}>
                <span>{x.troop === "helios" ? t("heliosCamp", { camp: t(x.camp) }) : t(x.camp)}</span>
                <b>{t("maxLabel", { time: formatSpan(x.max, lang) })}</b>
              </li>
            ))}
          </ul>
        )}
        {!maxKnown.length && <p className="th-note">{t("noMaxNote")}</p>}
        <EduAdvice advice={advice} onUse={useAdvice} />
        {error && <span className="th-error" role="alert">{error}</span>}
        <Btn tone={advice ? "ghost" : "gold"} block onClick={startMax} disabled={!maxKnown.length}>
          {advice ? t("startMaxAnyway") : t("startMaxTraining")}
        </Btn>
        <button type="button" className="th-link" onClick={onDone}>{t("cancel")}</button>
      </div>
    );
  }
  if (mode === "custom") {
    return (
      <div className="th-form">
        {modeBar}
        <label className="th-check th-same-check">
          <input type="checkbox" checked={share === "same"} onChange={(e) => switchShare(e.target.checked ? "same" : "each")} />
          {t("trainSameDurationQ")}
        </label>
        {share === "each" && <p className="th-hint">{t("syncSomeHint")}</p>}
        {share === "same" && (<><DurationFields value={shared} onChange={setShared} label={t("trainAllFor")} />{campChecks}</>)}
        <FinishPreview entries={entries} now={now} />
        {share === "each" && (
          <div className="th-camp-rows">
            {TRAINING_CAMPS.map((c) => (
              <div key={c} className="th-camp-each">
                <DurationFields value={each[c]} onChange={(v) => setEach({ ...each, [c]: v })} label={t(c)} optional />
                {troopToggle(c)}
              </div>
            ))}
            <p className="th-note">{t("emptyRowNote")}</p>
          </div>
        )}
        {error && <span className="th-error" role="alert">{error}</span>}
        <FormActions onSave={saveLeft} onCancel={onDone} saveLabel={restart ? t("restartAllCampsBtn") : t("startTimers")} />
      </div>
    );
  }

  const utcDay = targetOk && ymdAt(target, tz) !== ymdAt(target, "UTC") ? ` (${formatDate(target, "UTC", lang)})` : "";
  const showCamps = !!back && (back.groups.length > 1 || back.rows.length < planCamps.length);
  const primaryLabel = missed.length && !calm ? t("bkUseMostFits")
    : eduGoal ? t("useThisPlan")
    : later.length ? t("bkStartCampsNow", { camps: campNames(nowG.flatMap((g) => g.camps)) })
    : calm ? t(restart ? "restartFinishing" : "startFinishing", { time: formatTime(target, tz, lang) })
    : t(restart ? "restartAllCampsBtn" : "startTimers");

  return (
    <div className="th-form th-finishform">
      {modeTabs}
      {/* 1. The target comes first: "I want it finished then" */}
      <label className="th-finish">
        <span className="th-finish-q">{t("finishAtQ")}</span>
        <input ref={timeRef} className="th-finish-input" inputMode="numeric" autoComplete="off" placeholder="2200" maxLength={5}
          aria-describedby="th-finish-read" value={raw} onChange={(e) => { setRaw(e.target.value.replace(/[^\d:.]/g, "")); setError(null); setLongOk(false); setDayAdd(0); pickTime(); }} />
        <span id="th-finish-read" className="th-finish-read">
          {eduGoal ? <>🎓 <b>{t("eduWord")}</b> {dayWordFor(eduWin.start)} {clock(eduWin.start)}–{clock(eduWin.end)} · <Ltr>{formatTime(eduWin.start, "UTC", lang)}–{formatTime(eduWin.end, "UTC", lang)}</Ltr> UTC</>
            : hhmm && Number.isFinite(target) ? (targetOk
              ? <><b>{clock(target)}</b> {dayWord} · <Ltr>{formatTime(target, "UTC", lang)}</Ltr> UTC{utcDay}{tgtKind === "reset" && resetOff != null
                ? <> · <b className="th-reset-tag">{t("bkAfterResetN", { n: resetOff })}</b></>
                : afterReset && <> · <b className="th-reset-tag">{t("afterReset")}</b></>}</>
              : t("errPlanPast"))
            : raw ? t("finishInvalid") : t("finishHint")}
        </span>
      </label>
      {/* which day: the next time the clock shows this, the following days, or any date */}
      {hhmm && !eduGoal && (
        <div className="th-todos-filter th-dayadd" role="group" aria-label={t("finishDay")}>
          {[0, 1, 2, 3].map((n) => (
            <button key={n} type="button" className={`th-chip-btn small ${!customDate && dayAdd === n ? "on" : ""}`} aria-pressed={!customDate && dayAdd === n}
              onClick={() => { setDayAdd(n); setCustomDate(""); setDateOpen(false); setLongOk(false); }}>{dayWordFor(dayTarget(n))}</button>
          ))}
          <button type="button" className={`th-chip-btn small ${customDate ? "on" : ""}`} aria-pressed={!!customDate} aria-expanded={dateOpen} onClick={() => setDateOpen(!dateOpen)}>
            {customDate && Number.isFinite(customTarget) ? formatDate(customTarget, tz, lang) : t("bkCustomDate")}
          </button>
        </div>
      )}
      {dateOpen && !eduGoal && (
        <input className="th-input th-bk-date" type="date" aria-label={t("bkCustomDate")} min={ymdAt(now, tz)} value={customDate}
          onChange={(e) => { setCustomDate(e.target.value); setLongOk(false); }} />
      )}
      {/* target shortcuts: just after reset (the player picks how long after), or the Education booking */}
      <div className="th-todos-filter th-dayadd" role="group" aria-label={t("bkShortcuts")}>
        <button type="button" className={`th-chip-btn small ${tgtKind === "reset" ? "on" : ""}`} aria-pressed={tgtKind === "reset"} aria-expanded={resetOpen} onClick={() => setResetOpen(!resetOpen)}>
          {t("bkJustAfterReset")}{tgtKind === "reset" && resetOff != null && <>&nbsp;· <Ltr>00:{String(resetOff).padStart(2, "0")} UTC</Ltr></>}
        </button>
        <button type="button" className={`th-chip-btn small ${eduGoal ? "on" : ""}`} aria-pressed={eduGoal} onClick={pickEdu}>🎓 {t("kind_booking")}</button>
      </div>
      {resetOpen && (
        <div className="th-bk-offsets" role="group" aria-label={t("bkResetOffsetQ")}>
          <span className="th-hint">{t("bkResetOffsetQ")}</span>
          <span className="th-todos-filter">
            {RESET_OFFSETS.map((off) => (
              <button key={off} type="button" className={`th-chip-btn small ${tgtKind === "reset" && resetOff === off ? "on" : ""}`} aria-pressed={tgtKind === "reset" && resetOff === off}
                onClick={() => pickReset(off)}><Ltr>00:{String(off).padStart(2, "0")} UTC</Ltr></button>
            ))}
          </span>
        </div>
      )}
      {eduNote && !eduGoal && <p className="th-note" role="status">{eduNote === "active" ? t("bkEduActive") : t("bkNoEdu", { position: t("minister_education"), where: t("secBookings") })}</p>}
      {/* troop type per camp stays visible here: Helios and normal troops have different times */}
      {TRAINING_CAMPS.some((c) => ticked[c] && hasHelios(data, c)) && campChecks}

      {sAdvice && !isAdvice && !eduGoal && tgtKind === "time" && !customDate && (sAdvice.kind === "bed" || !capOn) && (
        <button type="button" className="th-suggest-btn" onClick={() => { setRaw(digitsAt(sAdvice.finishAt, tz)); setDayAdd(0); }}>
          {t(sAdvice.kind === "bed" ? "suggestBed" : "suggestFull", { time: formatTime(sAdvice.finishAt, tz, lang) })}
        </button>
      )}

      {/* 2. Train with: Normal capacity or Training Capacity ×3 (its own confirmed maximums) */}
      <div className="th-bk-opt">
        <span className="th-bk-optlabel">{t("bkTrainWith")}</span>
        <Seg value={capOn ? "cap" : "normal"} onChange={(v) => toggleCap(v === "cap")} label={t("bkTrainWith")} options={[
          { value: "normal", label: t("bkNormalCap") },
          { value: "cap", label: t("bkCapX3") },
        ]} />
        {capOn && !capMissing.length && !calibrate && planCamps.length > 0 && (
          <div className="th-bk-capsum">
            <span><b>✓ {t("capLabel")}</b> · {t("bkCapSub")}</span>
            <span className="th-bk-maxes">{t("bkMaximums")}: {planCamps.map((c) => (
              <span key={c}>{t(`short_${c}`)}{troopOf(c) === "helios" ? ` ${t("helios")}` : ""} · <b>{span(maxOf(c))}</b></span>
            ))}</span>
            <button type="button" className="th-link" onClick={() => setCalibrate(true)}>{t("bkEditMax")}</button>
          </div>
        )}
      </div>
      {capCal}

      {/* 3. Batch: each camp's maximum, or one duration */}
      <div className="th-bk-opt">
        <span className="th-bk-optlabel">{t("bkBatch")}</span>
        <Seg value={batch} onChange={(v) => { setBatch(v); setLongOk(false); }} label={t("bkBatch")} options={[
          { value: "max", label: t("bpModeMax") },
          { value: "custom", label: t("bkCustomDur") },
        ]} />
        {batch === "custom" && <div data-bk-dur=""><DurationFields value={bdur} onChange={setBdur} label={t("bkCustomDurQ")} /></div>}
      </div>

      {/* camps with different batch lengths: each its own start (finish together), or one start */}
      {new Set(rowsIn.filter((r) => r.durMs > 0).map((r) => r.durMs)).size > 1 && (
        <div className="th-bk-opt">
          <span className="th-bk-optlabel">{t("bkPlanCampsTo")}</span>
          <Seg value={sync} onChange={setSync} label={t("bkPlanCampsTo")} options={[
            { value: "finish", label: t("bkFinishTogether") },
            { value: "start", label: t("bkStartTogether") },
          ]} />
          <span className="th-hint">{t(sync === "finish" ? "bkFinishTogetherHelp" : "bkStartTogetherHelp")}</span>
        </div>
      )}

      {/* 4. THE ANSWER: when to press Train */}
      {back && (
        <div className={`th-bk ${back.state}`} role="group" aria-label={t("bkResult")}>
          <div className="th-bk-kicker">{capOn ? t("bkCapX3") : t("bkNormalCap")} · {batch === "max" ? t("bpModeMax") : t("bkCustomDur")}</div>
          {eduGoal && (
            <p className="th-bk-edu">
              🎓 <b>{t("bkEduPlan")}</b> · {dayWordFor(eduWin.start)} {clock(eduWin.start)}–{clock(eduWin.end)} <small className="th-utc"><Ltr>{formatTime(eduWin.start, "UTC", lang)}–{formatTime(eduWin.end, "UTC", lang)}</Ltr> UTC</small>
              <br />{t("bkEduFree")}
            </p>
          )}
          {missed.length > 0 && !calm && (
            <div className="th-bk-miss" role="status">
              <b>{t(batch === "custom" ? "bkNoFitCustom" : `bkNoFit${capOn ? "Cap" : "Full"}${eduGoal ? "Edu" : ""}`, { dur: span(missed[0].fullMs) })}</b>
              <span>{t("bkNeededStart", { time: whenDay(missed[0].ideal) })} {utcOf(missed[0].ideal)}</span>
              <span>{t("bkWindowLeft", { time: whenShort(target), left: back.windowMs >= DAY ? `${hoursSpan(back.windowMs, lang)} (${span(back.windowMs)})` : span(back.windowMs) })}</span>
            </div>
          )}
          <ul className="th-bk-starts">
            {back.groups.map((g) => (
              <li key={`${g.camps[0]}|${g.start}`} className={g.state}>
                {showCamps && <span className="th-bk-camps">{campNames(g.camps)}</span>}
                {(g.state === "future" || (g.state === "passed" && !calm)) && <span className="th-bk-label">{g.state === "future" ? t("bpStartTraining") : t("bkMostFits")}</span>}
                <b className="th-bk-when">{g.state === "future" ? <>{weekdayOf(g.start, tz, lang)} {clock(g.start)}</> : t("startNow")}</b>
                {g.state === "future" && (
                  <span className="th-bk-sub">{dayWordFor(g.start)} · {utcOf(g.start)} · <b>{t("bkStartsIn", { time: span(g.start - now) })}</b>
                    {inSleepWindow(g.start, tz, sleep) && <span className="th-bplan-sleep"> · 🌙 {t("bpAsleep")}</span>}</span>
                )}
                <span className="th-bk-fact">{t("bkTrainFor")} <b>{g.state === "passed" && !calm && g.durMs >= DAY ? hoursSpan(g.durMs, lang) : span(g.durMs)}</b>
                  {g.state === "passed" && !calm && g.durMs >= DAY && <span className="th-bk-alt"> ({span(g.durMs)})</span>}{endsDiffer && <> → {whenShort(g.end)}</>}</span>
              </li>
            ))}
          </ul>
          <p className="th-bk-finish">
            {t(endsDiffer ? "bkLastFinish" : "bkFinishes")} <b>{weekdayOf(target, tz, lang)} {clock(target)}</b> {utcOf(target)}
            {tgtKind === "reset" && resetOff != null && !eduGoal && <> · <span className="th-reset-tag">{t("bkAfterResetN", { n: resetOff })}</span></>}
          </p>
          {eduGoal && <p className="th-bk-then"><b>{t("bkThen")}</b> {clock(eduWin.start)} — {t("bkRestartWithEdu")}</p>}

          {busyPast.length > 0 && (
            <p className="th-bk-busy">{t("bkBusy", { camps: campNames(busyPast.map((x) => x.category)), time: whenShort(Math.max(...busyPast.map((x) => x.endAt))) })}</p>
          )}
          {error && <span className="th-error" role="alert">{error}</span>}

          {/* a start that is still ahead never gets a Start button: starting now would finish too early */}
          <div className="th-bk-actions">
            {nowG.length > 0
              ? <Btn tone="gold" block onClick={() => startBack(eduGoal)}>{primaryLabel}</Btn>
              : <Btn tone="gold" block onClick={() => addStartReminder(eduGoal)}>{eduGoal ? t("useThisPlan") : t("bkAddReminder")}</Btn>}
            {eduGoal && later.length > 0 && nowG.length === 0 && <Btn block onClick={() => addStartReminder(false)}>{t("bkAddReminder")}</Btn>}
          </div>
          {eduGoal && <p className="th-note">{t("bkEduPlanNote")}</p>}
          {!eduGoal && nowG.length === 0 && <p className="th-note">{t("bkReminderNote")}</p>}
          {nowG.length > 0 && later.map((g) => (
            <p key={g.start} className="th-note">{t("bkLaterReminder", { camps: campNames(g.camps), time: whenShort(g.start) })}</p>
          ))}
          {nowG.length === 0 && later.length > 0 && (
            <p className="th-note">{t("bkIfNow", { time: whenShort(now + later[0].durMs) })}</p>
          )}
          {calm && !isAdvice && <p className="th-note">{t("bkFullNeeded", { dur: span(missed[0].fullMs), time: whenShort(missed[0].ideal) })}</p>}
          {isAdvice && sAdvice.kind === "bed" && nowG.length > 0 && <p className="th-note">{t("outcomeOvernight", { end: formatTime(sAdvice.overnightEnd, tz, lang) })}</p>}
          {!isAdvice && sAdvice && tgtKind === "time" && nowG.length > 0 && inSleepWindow(target, tz, sleep) && <p className="th-note">{t("outcomeAsleep")}</p>}

          {/* the full batch no longer fits: other ways out, each one tap */}
          {missed.length > 0 && !calm && (
            <>
              <div className="th-item-actions th-bk-alts">
                {!eduGoal && <Btn small onClick={() => { timeRef.current?.focus(); timeRef.current?.select?.(); }}>{t("bkChooseLater")}</Btn>}
                {batch === "max" && <Btn small onClick={() => { setBatch("custom"); requestAnimationFrame(() => document.querySelector("[data-bk-dur] input")?.focus()); }}>{t("bkUseCustom")}</Btn>}
                {capOn && <Btn small onClick={() => toggleCap(false)}>{t("bkNormalInstead")}</Btn>}
              </div>
              {!eduGoal && (
                <p className="th-note">{t("bkFullFromNow", { time: whenShort(now + missed[0].fullMs) })}{" "}
                  <button type="button" className="th-link" onClick={() => setTargetAt(now + missed[0].fullMs)}>{t("bkUseThatTime")}</button></p>
              )}
            </>
          )}
          {nowG.length === 0 && !eduGoal && (
            <button type="button" className="th-link th-onego" onClick={() => { timeRef.current?.focus(); timeRef.current?.select?.(); }}>{t("bkChangeTarget")}</button>
          )}
        </div>
      )}
      {!back && (
        <>
          {targetOk && !capMissing.length && batch === "custom" && !customMs && <p className="th-note">{t("bkEnterDuration")}</p>}
          {targetOk && batch === "max" && !known.length && planCamps.length > 0 && <p className="th-note">{t("noMaxNote")}</p>}
          {error && <span className="th-error" role="alert">{error}</span>}
          <Btn tone="gold" block disabled onClick={() => {}}>{t(restart ? "restartAllCampsBtn" : "startTimers")}</Btn>
        </>
      )}

      {/* Normal vs Training Capacity for this target (confirmed maximums only) */}
      {cmp && back && (
        <div className="th-bk-cmp" role="group" aria-label={t("bkCompare", { time: whenShort(target) })}>
          <span className="th-bk-optlabel">{t("bkCompare", { time: whenShort(target) })}</span>
          {[["normal", cmp.normal], ["cap", cmp.cap]].map(([k, p]) => {
            const g = p.groups[0];
            return (
              <div key={k} className={`th-bk-cmprow ${(k === "cap") === capOn ? "on" : ""}`}>
                <b>{t(k === "cap" ? "capLabel" : "bkNormalCap")}</b>
                <span>{g.state === "future" ? t("bkCmpStart", { time: whenShort(g.start) }) : g.state === "passed" ? t("bkCmpNoFit", { dur: span(g.durMs) }) : t("startNow")}</span>
                <span className="th-bk-cmpdur">{span(g.fullMs)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* waiting isn't the only way: keep the camps busy until the target (batches + check-ins) */}
      {nonstop && (
        <details className="th-secondary th-bk-nonstop">
          <summary>{t("bkNonstop")}</summary>
          {!longOk && <JourneyPlan plan={bplan} mode={pmode} setMode={setPmode} showModes={showModes} win={eduGoal ? null : eduWin}
            minMax={Math.min(...specs.filter((x) => x.maxMs > 0).map((x) => x.maxMs))} other={pmode === "max" ? jFew : jMax} />}
          {/* The stored maximum may be out of date: the player can say ONE batch really is this long
              (the review then offers to update the normal maximum). Never assumed from a long target. */}
          {multi && !capOn && (
            <button type="button" className="th-link th-onego" onClick={() => setLongOk(true)}>{t("canTrainLonger", { dur: formatSpan(need, lang) })}</button>
          )}
          {longOk && tooLong.length > 0 && (
            <p className="th-note">{t("oneGoNote", { dur: formatSpan(need, lang) })} <button type="button" className="th-link" onClick={() => setLongOk(false)}>{t("bpShowPlan")}</button></p>
          )}
          <Btn block onClick={startPlanNow}>{multi ? t("bpUse") : t(restart ? "restartFinishing" : "startFinishing", { time: formatTime(target, tz, lang) })}</Btn>
          {multi && (
            <p className="th-bplan-foot">
              <span>{t("bpFirstCheckin")}: <b><Ltr>{formatTime(bplan.checkIns[0].at, tz, lang)}</Ltr></b> <small className="th-utc"><Ltr>{formatTime(bplan.checkIns[0].at, "UTC", lang)}</Ltr> UTC</small></span>
              <span>{t("bpFinal")}: <b><Ltr>{formatTime(bplan.end, tz, lang)}</Ltr> {dayWordFor(bplan.end).toLocaleLowerCase(lang)}</b> <small className="th-utc"><Ltr>{formatTime(bplan.end, "UTC", lang)}</Ltr> UTC</small></span>
            </p>
          )}
        </details>
      )}

      {/* per-camp maximums, troop type and troop counts: there when wanted, out of the way otherwise */}
      {planCamps.length > 0 && (
        <details className="th-secondary">
          <summary>{t("trainingDetails")}</summary>
          <ul className="th-bk-details">
            {planCamps.map((c) => {
              const r = back?.rows.find((x) => x.camp === c);
              const n = campTroopsFor(data, c);
              return (
                <li key={c}>
                  <b>{t(c)}</b>
                  <span>{maxOf(c) > 0 ? t("maxLabel", { time: span(maxOf(c)) }) : "—"} · {t(troopOf(c) === "helios" ? "helios" : "normalTroops")}</span>
                  {r && n > 0 && maxOf(c) > 0 && r.durMs <= maxOf(c) && (
                    <span>{t("troopsToTrain")}: {troopsForDuration(r.durMs, maxOf(c), n * (capOn ? CAPACITY_FACTOR : 1)).toLocaleString(lang)}</span>
                  )}
                </li>
              );
            })}
          </ul>
          {capOn ? (!calibrate && !capMissing.length && <button type="button" className="th-link" onClick={() => setCalibrate(true)}>{t("bkEditMax")}</button>)
            : onEditTimes && <button type="button" className="th-link" onClick={onEditTimes}>{t("bkEditMax")}</button>}
        </details>
      )}

      {/* Secondary */}
      {!TRAINING_CAMPS.some((c) => ticked[c] && hasHelios(data, c)) && (
        <details className="th-secondary">
          <summary>{t("whichCamps")}</summary>
          {campChecks}
        </details>
      )}
      <button type="button" className="th-link" onClick={onDone}>{t("cancel")}</button>
    </div>
  );
}

/* Asked right in the widget (not a settings page) and always editable. Per account:
   a full-batch time for each camp, plus Helios classes with their own times. */
function CampTimes({ accountId, forceOpen, focusEdu, onClose }) {
  const { t, lang, dataFor, updateAccount } = useTimeHub();
  const data = dataFor(accountId);
  const anySet = TRAINING_CAMPS.some((c) => data.campMax?.[c]);
  const [open, setOpenRaw] = useState(!anySet || !!forceOpen || !!focusEdu);
  const setOpen = (v) => { setOpenRaw(v); if (!v && onClose) onClose(); };
  React.useEffect(() => {
    if (!focusEdu || !open) return undefined;
    const id = requestAnimationFrame(() => {
      const el = document.querySelector(`[data-edu-batch="${accountId}"] input`);
      if (el) { el.scrollIntoView({ block: "center" }); el.focus(); }
    });
    return () => cancelAnimationFrame(id);
  }, [focusEdu, open, accountId]);
  const sameNow = (d) => d.campSame ?? (new Set(TRAINING_CAMPS.map((c) => d.campMax?.[c] || 0)).size === 1);
  const load = (d) => ({
    same: sameNow(d),
    all: durFrom(TRAINING_CAMPS.map((c) => d.campMax?.[c]).find((x) => x > 0)),
    troopsAll: String(TRAINING_CAMPS.map((c) => d.campTroops?.[c]).find((x) => x > 0) || ""),
    eduAll: durFrom(TRAINING_CAMPS.map((c) => d.campMaxEdu?.[c]).find((x) => x > 0)),
    edu: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, durFrom(d.campMaxEdu?.[c])])),
    troops: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, d.campTroops?.[c] ? String(d.campTroops[c]) : ""])),
    normal: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, durFrom(d.campMax?.[c])])),
    heliosOn: (d.helios?.classes || []).length > 0,
    classes: [...(d.helios?.classes || [])],
    helios: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, durFrom(d.helios?.max?.[c])])),
  });
  const [f, setF] = useState(() => load(data));
  const [saved, setSaved] = useState(false);
  React.useEffect(() => { setF(load(dataFor(accountId))); setOpenRaw(!TRAINING_CAMPS.some((c) => dataFor(accountId).campMax?.[c]) || !!forceOpen); setSaved(false); }, [accountId]); // eslint-disable-line react-hooks/exhaustive-deps
  const bad = (v) => (v.days || v.hhmm) && durParse(v).error;
  const val = (v) => { const r = durParse(v); return r.error ? null : r.ms; };
  const invalid = (f.same ? bad(f.all) || bad(f.eduAll) : TRAINING_CAMPS.some((c) => bad(f.normal[c]) || bad(f.edu[c]))) || TRAINING_CAMPS.some((c) => f.heliosOn && f.classes.includes(c) && bad(f.helios[c]));
  function save() {
    if (invalid) return;
    const classes = f.heliosOn ? TRAINING_CAMPS.filter((c) => f.classes.includes(c)) : [];
    updateAccount(accountId, (d) => ({
      ...d,
      campMaxEdu: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, f.same ? val(f.eduAll) : val(f.edu[c])])),
      campSame: f.same,
      campTroops: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, Number(f.same ? f.troopsAll : f.troops[c]) || 0]).filter(([, n]) => n > 0)),
      campMax: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, f.same ? val(f.all) : val(f.normal[c])])),
      helios: { classes, max: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, classes.includes(c) ? val(f.helios[c]) : d.helios?.max?.[c] ?? null])) },
    }));
    setSaved(true);
    setOpenRaw(false);
  }
  const span = (ms) => (ms ? formatSpan(ms, lang) : "—");
  const summary = [
    ...(sameNow(data) ? [`${t("allCamps")} ${span(data.campMax?.infantry_camp)}${data.campTroops?.infantry_camp ? ` (${data.campTroops.infantry_camp.toLocaleString(lang)})` : ""}`]
      : TRAINING_CAMPS.map((c) => `${t(`short_${c}`)} ${span(data.campMax?.[c])}${data.campTroops?.[c] ? ` (${data.campTroops[c].toLocaleString(lang)})` : ""}`)),
    ...(data.helios?.classes || []).map((c) => `${t("heliosCamp", { camp: t(`short_${c}`) })} ${span(data.helios.max?.[c])}`),
  ].join(" · ");

  if (!open) {
    return (
      <div className="th-camptimes closed">
        <div>
          <span className="th-label">{t("fullBatchTimes")}</span>
          <div className="th-camptimes-sum">{summary}</div>
        </div>
        <span className="th-item-actions">
          <Btn small onClick={() => { setF(load(data)); setOpenRaw(true); }}>{t("edit")}</Btn>
          {onClose && <Btn small onClick={onClose}>{t("done")}</Btn>}
        </span>
      </div>
    );
  }
  return (
    <div className="th-camptimes">
      <b className="th-camptimes-q">{anySet ? t("fullBatchTimes") : t("campTimesPrompt")}</b>
      <p className="th-note">{t("campTimesHelp")}</p>
      <Seg value={f.same ? "same" : "each"} onChange={(v) => setF({ ...f, same: v === "same", normal: v === "each" && (f.all.days || f.all.hhmm) ? Object.fromEntries(TRAINING_CAMPS.map((c) => [c, f.normal[c].days || f.normal[c].hhmm ? f.normal[c] : f.all])) : f.normal })}
        label={t("campTimesSameQ")} options={[{ value: "same", label: t("sameAllCamps") }, { value: "each", label: t("differentPerCamp") }]} />
      {f.same
        ? <DurationFields value={f.all} onChange={(v) => setF({ ...f, all: v })} label={t("everyCamp")} optional />
        : TRAINING_CAMPS.map((c) => (
          <DurationFields key={c} value={f.normal[c]} onChange={(v) => setF({ ...f, normal: { ...f.normal, [c]: v } })} label={t(c)} optional />
        ))}
      <div data-edu-batch={accountId} style={{ display: "grid", gap: 8 }}>
        <span className="th-label">{t("eduBatchQ")}</span>
        {f.same
          ? <DurationFields value={f.eduAll} onChange={(v) => setF({ ...f, eduAll: v })} label={t("everyCamp")} optional />
          : TRAINING_CAMPS.map((c) => <DurationFields key={c} value={f.edu[c]} onChange={(v) => setF({ ...f, edu: { ...f.edu, [c]: v } })} label={t(c)} optional />)}
        <p className="th-note">{t("eduBatchHelp")}</p>
      </div>
      <span className="th-label">{t("batchSizeQ")}</span>
      <div className="th-batch-row">
        {(f.same ? [["all", t("everyCamp")]] : TRAINING_CAMPS.map((c) => [c, t(`short_${c}`)])).map(([k, lab]) => (
          <label key={k} className="th-troops-in">
            <span className="th-hint">{lab}</span>
            <input className="th-input" inputMode="numeric" placeholder="3400" value={k === "all" ? f.troopsAll : f.troops[k]}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); setF(k === "all" ? { ...f, troopsAll: v } : { ...f, troops: { ...f.troops, [k]: v } }); }} />
          </label>
        ))}
      </div>
      <p className="th-note">{t("batchSizeHelp")}</p>
      <label className="th-check"><input type="checkbox" checked={f.heliosOn} onChange={(e) => setF({ ...f, heliosOn: e.target.checked })} />{t("haveHelios")}</label>
      {f.heliosOn && (
        <>
          <span className="th-label">{t("heliosWhich")}</span>
          <div className="th-checks">
            {TRAINING_CAMPS.map((c) => (
              <label key={c} className="th-check">
                <input type="checkbox" checked={f.classes.includes(c)} onChange={(e) => setF({ ...f, classes: e.target.checked ? [...f.classes, c] : f.classes.filter((x) => x !== c) })} />
                {t(`short_${c}`)}
              </label>
            ))}
          </div>
          {TRAINING_CAMPS.filter((c) => f.classes.includes(c)).map((c) => (
            <DurationFields key={c} value={f.helios[c]} onChange={(v) => setF({ ...f, helios: { ...f.helios, [c]: v } })} label={t("heliosCamp", { camp: t(c) })} optional />
          ))}
        </>
      )}
      <div className="th-form-actions">
        <Btn tone="gold" onClick={save} disabled={!!invalid}>{t("save")}</Btn>
        {anySet && <Btn onClick={() => setOpenRaw(false)}>{t("cancel")}</Btn>}
      </div>
    </div>
  );
}

/* ---------- Restart All Camps + 24/7 timing guidance ---------- */
/** Camps of one account that aren't training, with the length to restart them for. */
function restartable(data, now) {
  return TRAINING_CAMPS.map((camp) => {
    const mine = (data.timers || []).filter((x) => x.kind === "training" && x.category === camp);
    if (mine.some((x) => x.endAt > now)) return null;
    const last = mine.sort((a, b) => b.endAt - a.endAt)[0];
    const troop = defaultTroop(data, camp);
    const fullMs = campMaxFor(data, camp, troop) || (last?.durationMs > 0 ? last.durationMs : null);
    return { camp, troop, fullMs: fullMs > 0 ? fullMs : null };
  }).filter(Boolean);
}

function MoonNote({ children }) {
  return <div className="th-moon"><span aria-hidden="true">🌙</span><div>{children}</div></div>;
}

function RestartAll({ acc, onDone }) {
  const { t, tz, lang, dataFor, updateAccount, newId, state, notify } = useTimeHub();
  const sleep = state.settings.sleep;
  const now = useMinute();
  const data = dataFor(acc);
  const base = restartable(data, now);
  // troop type per camp (toggle only where Helios is set up); the full batch follows the troop type
  const [troopSel, setTroopSel] = useState(() => Object.fromEntries(base.map((c) => [c.camp, c.troop])));
  const list = base.map((c) => {
    const troop = troopSel[c.camp] || c.troop;
    const fullMs = campMaxFor(data, c.camp, troop) || (troop === c.troop ? c.fullMs : null);
    return { ...c, troop, fullMs };
  });
  const label = (c) => (c.troop === "helios" ? t("heliosCamp", { camp: t(c.camp) }) : t(c.camp));
  const rows = list.map((c) => ({ ...c, batch: campTroopsFor(data, c.camp), check: c.fullMs ? timingCheck(now, c.fullMs, tz, sleep) : null }));
  const ready = rows.filter((c) => c.fullMs);
  const troopsKnown = ready.some((c) => c.batch);
  const [unit, setUnit] = useState(troopsKnown ? "troops" : "time"); // how the player enters it: time | troops
  const [dur, setDur] = useState(() => Object.fromEntries(ready.map((c) => [c.camp, durFrom(c.fullMs)])));
  const [troops, setTroops] = useState(() => Object.fromEntries(ready.map((c) => [c.camp, c.batch ? String(c.batch) : ""])));
  const [review, setReview] = useState(null);
  const [plan, setPlan] = useState(null); // Education restart reminder accepted from the advice
  const switchTroop = (c, tp) => {
    setTroopSel({ ...troopSel, [c.camp]: tp });
    const ms = campMaxFor(data, c.camp, tp);
    if (ms) setDur({ ...dur, [c.camp]: durFrom(ms) });
  };
  // A duration longer than the stored full batch is NOT blocked: the stored value may be out of
  // date, so it's learned (asked first only when it's a big jump). Troop counts above the batch
  // size still can't be converted, so those remain an input error.
  const msFor = (c) => {
    if (unit === "troops" && c.batch) {
      const n = Number(String(troops[c.camp] || "").replace(/\D/g, ""));
      return n > 0 && n <= c.batch ? durationForTroops(n, c.fullMs, c.batch) : n > c.batch ? { over: true } : null;
    }
    const r = durParse(dur[c.camp] || EMPTY_DUR);
    return r.error || !r.ms ? null : r.ms;
  };
  const values = ready.map((c) => ({ c, ms: msFor(c) }));
  const valid = values.filter((v) => typeof v.ms === "number" && v.ms > 0);
  const advice = useEduAdvice(acc, valid.map((v) => v.ms));
  const useSuggestion = (c) => {
    const ms = c.check.suggestion.durationMs;
    setDur({ ...dur, [c.camp]: durFrom(ms) });
    if (c.batch) setTroops({ ...troops, [c.camp]: String(troopsForDuration(ms, c.fullMs, c.batch)) });
  };
  function useAdvice() {
    const p = { id: newId(), camps: ready.map((c) => c.camp), startAt: advice.restartAt, target: advice.restartAt + 30 * MINUTE, edu: true };
    if (advice.kind === "wait") {
      updateAccount(acc, (d) => ({ ...d, plans: [...(d.plans || []).filter((x) => x.startAt > Date.now()), p] }));
      notify([`✓ ${t("remindAtTime", { time: formatTime(advice.restartAt, tz, lang) })}`]);
      return onDone();
    }
    setUnit("time");
    setDur(Object.fromEntries(ready.map((c) => [c.camp, durFrom(Math.min(c.fullMs, advice.trainFor))])));
    setPlan(p);
  }
  function go() {
    const list2 = valid.map(({ c, ms }) => ({ camp: c.camp, troop: c.troop, durationMs: ms, mode: ms >= c.fullMs ? "max" : "custom" }));
    setReview({ list: list2, busy: [], increases: maxIncreases(data, list2), at: Date.now(), restart: true, extraPlan: plan });
  }
  function commit(list2, extraPlan, accepted) {
    const at = Date.now();
    updateAccount(acc, (d) => ({
      ...rememberTroops(applyLearnedMax(d, accepted, at), list2),
      timers: applyTraining(d.timers, list2, at, newId),
      plans: extraPlan ? [...(d.plans || []).filter((x) => x.startAt > at), extraPlan] : d.plans,
    }));
    success();
    const sum = restartSummary(list2, at);
    notify([`✓ ${t("campsRestarted", { n: list2.length })}`, sum.together ? t("finishAround", { time: formatTime(sum.finishAt, tz, lang) }) : t("finishDifferent")]);
    onDone();
  }
  if (review) {
    return (
      <div className="th-form th-restart">
        <ReviewCard title={t("restartAllCampsTitle")} review={review} onBack={() => setReview(null)}
          onConfirm={(a) => answerReview(review, setReview, a, commit)}
          onKeepOld={(items) => keepOldMaxes(review, setReview, items)} />
      </div>
    );
  }
  return (
    <div className="th-form th-restart">
      <b className="th-restart-title">{t("restartAllTitle")}</b>
      {!plan && <EduAdvice advice={advice} onUse={useAdvice} />}
      {plan && <p className="th-note">✓ {t("eduPlanSet", { time: formatTime(plan.startAt, tz, lang) })}</p>}
      {rows.some((c) => c.check?.suggestion) && (
        <MoonNote>{t("timingSuggestionShort", { n: rows.filter((c) => c.check?.suggestion).length, finish: formatTime(rows.find((c) => c.check?.suggestion).check.suggestion.finishAt, tz, lang) })}</MoonNote>
      )}
      {troopsKnown
        ? <Seg value={unit} onChange={setUnit} label={t("enterAs")} options={[{ value: "troops", label: t("byTroops") }, { value: "time", label: t("byTime") }]} />
        : <p className="th-note">{t("troopsHint")}</p>}
      {rows.map((c) => {
        const v = values.find((x) => x.c.camp === c.camp)?.ms;
        const ms = typeof v === "number" ? v : null;
        const useTroops = unit === "troops" && c.batch;
        const sug = c.check?.suggestion;
        const longer = ms && c.fullMs && ms > c.fullMs;
        return (
          <div key={c.camp} className="th-restart-row">
            <div className="th-restart-head">
              <b>{label(c)}</b>
              {hasHelios(data, c.camp) && (
                <span className="th-troop" role="group" aria-label={t(c.camp)}>
                  {["normal", "helios"].map((tp) => <button key={tp} type="button" aria-pressed={c.troop === tp} onClick={() => switchTroop(c, tp)}>{t(tp === "helios" ? "helios" : "normalTroops")}</button>)}
                </span>
              )}
            </div>
            {c.fullMs
              ? <span className={c.check.overnight ? "t-warn" : "t-ok"}>{t("fullTraining")} {formatSpan(c.fullMs, lang)}{c.batch ? ` · ${c.batch.toLocaleString(lang)}` : ""} → <Ltr>{formatTime(c.check.fullEnd, tz, lang)}</Ltr> {c.check.overnight ? "🌙" : "✓"}</span>
              : <span className="th-hint">{t("noFullBatch")}</span>}
            {c.fullMs && (
              <>
                {useTroops ? (
                  <label className="th-troops-in">
                    <span className="th-label">{t("troopsToTrain")}</span>
                    <input className="th-input" inputMode="numeric" value={troops[c.camp] ?? ""} placeholder={String(c.batch)}
                      onChange={(e) => setTroops({ ...troops, [c.camp]: e.target.value.replace(/[^\d]/g, "") })} />
                  </label>
                ) : (
                  <DurationFields value={dur[c.camp] || EMPTY_DUR} onChange={(x) => setDur({ ...dur, [c.camp]: x })} label={t("trainForLabel")} />
                )}
                <span className={`th-restart-read ${v && v.over ? "bad" : ""}`}>
                  {v && v.over
                    ? t("overBatchTroops", { max: c.batch.toLocaleString(lang) })
                    : ms ? <>{useTroops ? `= ${formatSpan(ms, lang)} → ` : "→ "}<b><Ltr>{formatTime(now + ms, tz, lang)}</Ltr></b>{!useTroops && c.batch && !longer ? ` · ≈ ${troopsForDuration(ms, c.fullMs, c.batch).toLocaleString(lang)} ${t("troopsWord")}` : ""}{longer ? ` · ${t("longerThanKnown")}` : ""}</> : ""}
                </span>
                {sug && !plan && (
                  <button type="button" className="th-suggest-btn" onClick={() => useSuggestion(c)}>
                    {useTroops
                      ? t("suggestTroops", { n: troopsForDuration(sug.durationMs, c.fullMs, c.batch).toLocaleString(lang), finish: formatTime(sug.finishAt, tz, lang) })
                      : t("suggestedLine", { dur: formatSpan(sug.durationMs, lang), finish: formatTime(sug.finishAt, tz, lang) })}
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
      <p className="th-note">💡 {t("tip247")}</p>
      <div className="th-form-actions">
        <Btn tone="gold" onClick={go} disabled={!valid.length || values.some((x) => x.ms && x.ms.over)}>{t("restartNCamps", { n: valid.length })}</Btn>
        <Btn onClick={onDone}>{t("cancel")}</Btn>
      </div>
    </div>
  );
}

/** For camps training now whose finish lands in the night: a gentle note about the next cycle. */
function NextCycleNotes({ acc, timers }) {
  const { t, tz, lang, dataFor, state } = useTimeHub();
  const sleep = state.settings.sleep;
  const data = dataFor(acc);
  const now = Date.now();
  const seen = new Set();
  const notes = [];
  for (const x of timers.filter((y) => y.endAt > now)) {
    const key = Math.floor(x.endAt / 60000);
    if (seen.has(key)) continue;
    seen.add(key);
    const fullMs = x.durationMs > 0 ? x.durationMs : campMaxFor(data, x.category, x.troop === "helios" ? "helios" : "normal");
    if (!fullMs) continue;
    const nc = nextCycleCheck(x.endAt, fullMs, tz, sleep);
    if (!nc) continue;
    const names = timers.filter((y) => Math.floor(y.endAt / 60000) === key).map((y) => t(`short_${y.category}`)).join(", ");
    const idle = idleUntilWake(x.endAt, tz, sleep);
    notes.push(
      <MoonNote key={key}>
        {t("currentEndsAt", { camps: names, time: formatTime(x.endAt, tz, lang) })}{" "}
        {idle && <>{t("idleUntilWake", { idle: formatSpan(idle.idleMs, lang), wake: formatTime(idle.wakeAt, tz, lang) })}{" "}</>}
        {nc.suggestion
          ? t("nextCycleTip", { dur: formatSpan(nc.suggestion.durationMs, lang), finish: formatTime(nc.suggestion.finishAt, tz, lang) })
          : t("waitsTillMorning")}
      </MoonNote>
    );
  }
  return notes;
}

/** What an account's camps are doing now: running (grouped when they finish together), ready, idle. */
function campState(data, now) {
  const timers = (data.timers || []).filter((x) => x.kind === "training");
  const running = timers.filter((x) => x.endAt > now).sort((a, b) => a.endAt - b.endAt || TRAINING_CAMPS.indexOf(a.category) - TRAINING_CAMPS.indexOf(b.category));
  const groups = finishTogether(running);
  const together = groups.length === 1 && groups[0].timers.length === running.length && running.length > 1 ? groups[0] : null;
  const idle = restartable(data, now);
  return { timers, running, together, idle, next: running[0] || null };
}

function TrainGroup({ acc, showName, open, setOpen }) {
  const { t, tz, lang, dataFor, updateAccount } = useTimeHub();
  const data = dataFor(acc);
  const trainTimes = data.timers.filter((x) => x.kind === "training").map((x) => x.endAt);
  const plans = (data.plans || []).filter((p) => p.target > Date.now());
  const now = useClockFor([...trainTimes, ...plans.map((p) => p.startAt)]);
  const when = useWhenLocal();
  const st = campState(data, now);
  const campsSet = TRAINING_CAMPS.some((c) => data.campMax?.[c]);
  const lab = (x) => (x.troop === "helios" ? t("heliosCamp", { camp: t(x.category) }) : t(x.category));
  const shortLab = (x) => (x.troop === "helios" ? t("heliosCamp", { camp: t(`short_${x.category}`) }) : t(`short_${x.category}`));
  const edit = (x) => () => setOpen({ acc, kind: "finish", preset: { accountId: acc, camp: x.category, troop: x.troop, ms: x.endAt - Date.now() }, key: Date.now() });
  const kind = open?.kind;
  const hero = st.together || st.next;

  return (
    <div className="th-group th-train-group">
      {showName && <GroupName accountId={acc} />}
      {!campsSet && kind !== "times" && <CampTimes accountId={acc} />}

      {/* primary: the countdown */}
      {hero ? (
        <div className="th-hero">
          <div className="th-hero-label">
            {st.together
              ? (st.together.timers.length === TRAINING_CAMPS.length ? t("allCampsCaps") : st.together.timers.map(shortLab).join(" · "))
              : <>{t("nextCaps")} · {lab(st.next)}</>}
            {(() => {
              const grp = st.together ? st.together.timers : st.next ? [st.next] : [];
              const modes = new Set(grp.map((x) => x.mode).filter(Boolean));
              return modes.size === 1 ? <span className="th-mode-tag">{t(`modeTag_${[...modes][0]}`)}</span> : null;
            })()}
          </div>
          <div className="th-hero-count" role="timer"><Remaining to={hero.endAt} fmt="clock" /></div>
          <div className="th-hero-when">{t("finishWord")} <Ltr>{when(hero.endAt)}</Ltr> · <Ltr>{formatTime(hero.endAt, "UTC", lang)}</Ltr> UTC</div>
        </div>
      ) : null}
      {/* every camp, always visible (the earlier layout): slim rows under a shared countdown, full
          rows (each with its own countdown, local + UTC finish, ✎) when they finish apart */}
      {hero ? (
        <div className={`th-camp-rows-live ${st.together ? "together" : ""}`}>
          {st.timers.filter((x) => x.endAt > now).map((x) => <TimerRow key={x.id} timer={x} accountId={acc} onEdit={edit(x)} label={x.troop === "helios" ? lab(x) : undefined} slim={!!st.together} />)}
        </div>
      ) : (
        !st.idle.length && <div className="th-empty">{t("emptyTraining")}</div>
      )}

      {/* secondary: what's waiting */}
      {st.idle.length > 0 && (
        <div className="th-idle-line">{t("campsIdleNow", { camps: st.idle.map((c) => (c.troop === "helios" ? t("heliosCamp", { camp: t(`short_${c.camp}`) }) : t(`short_${c.camp}`))).join(", ") })}</div>
      )}
      {plans.map((p) => (
        <div key={p.id} className="th-plan-row reminder">
          <span>{t("startTrainingAt", { camps: p.camps.map((c) => t(c)).join(", ") })} · <b><Ltr>{when(p.startAt)}</Ltr></b>
            {p.startAt > now && <> · <Remaining to={p.startAt} /></>}</span>
          <Btn small onClick={() => updateAccount(acc, (d) => ({ ...d, plans: d.plans.filter((x) => x.id !== p.id) }))}>{t("dismiss")}</Btn>
        </div>
      ))}
      <NextCycleNotes acc={acc} timers={st.running} />

      {/* Ministry of Education: the booking (or a quiet hint) with a way into the plan */}
      {(!kind || kind === "edu" || kind === "edufind") && <EducationStrip acc={acc} open={open} setOpen={setOpen} hasCamps={campsSet}
        onAddTime={() => setOpen({ acc, kind: "times", focusEdu: true })} onRestart={() => setOpen({ acc, kind: "restart" })} />}


      {/* tertiary: editing */}
      {kind === "finish" && <TrainForm key={open.key} accountId={acc} preset={open.preset} onDone={() => setOpen(null)} onEditTimes={() => setOpen({ acc, kind: "times" })} />}
      {kind === "restart" && <RestartAll acc={acc} onDone={() => setOpen(null)} />}
      {kind === "times" && <CampTimes accountId={acc} focusEdu={!!open.focusEdu} onClose={() => setOpen(null)} />}
      {!kind && (
        <div className="th-group-actions">
          <Btn small onClick={() => setOpen({ acc, kind: "finish", key: Date.now() })}>{t("setFinishTime")}</Btn>
          {st.idle.length > 0 && <Btn small tone="gold" onClick={() => setOpen({ acc, kind: "finish", preset: { accountId: acc, restart: true, camps: st.idle.map((c) => c.camp) }, key: Date.now() })}>↻ {st.idle.length === TRAINING_CAMPS.length ? t("restartAllCampsBtn") : t("restartAll", { n: st.idle.length })}</Btn>}
          {st.idle.some((c) => c.fullMs) && <button type="button" className="th-link" onClick={() => setOpen({ acc, kind: "restart" })}>{t("restartPerCamp")}</button>}
          {campsSet && <button type="button" className="th-link" onClick={() => setOpen({ acc, kind: "times" })}>{t("trainingTimes")}</button>}
        </div>
      )}
    </div>
  );
}

/** Folded view: what finishes next across the shown accounts, and whether anything is idle. */
function TrainingSummary() {
  const { t, accountIds, dataFor, accountById, multi } = useTimeHub();
  const now = useClockFor(accountIds.flatMap((a) => dataFor(a).timers.filter((x) => x.kind === "training").map((x) => x.endAt)));
  let best = null;
  let idle = 0;
  for (const acc of accountIds) {
    const st = campState(dataFor(acc), now);
    idle += st.idle.filter((c) => c.fullMs).length;
    const h = st.together || st.next;
    if (h && (!best || h.endAt < best.h.endAt)) best = { acc, h, together: !!st.together };
  }
  if (!best) return idle ? <span className="attn">{t("nIdleCamps", { n: idle })}</span> : <span>{t("noCampsTraining")}</span>;
  return (
    <span>
      {t("nextWord")}: {best.together ? t("allCamps") : t(`short_${best.h.category}`)}{multi ? ` · ${accountById(best.acc)?.name}` : ""} · <b><Remaining to={best.h.endAt} fmt="clock" /></b>
      {idle > 0 && <span className="attn"> · {t("nIdleCamps", { n: idle })}</span>}
    </span>
  );
}

export function TrainingWidget({ move }) {
  const { t, accountIds, dataFor, trainDraft, setTrainDraft, multi, dispatch } = useTimeHub();
  const [open, setOpen] = useState(null); // { acc, kind: "finish" | "restart" | "times", preset?, key? }
  React.useEffect(() => {
    if (!trainDraft) return;
    dispatch({ type: "setSection", id: "training", closed: false });
    setOpen({ acc: trainDraft.accountId, kind: trainDraft.times ? "times" : trainDraft.edu ? "edu" : "finish", preset: trainDraft, key: trainDraft.nonce });
    setTimeout(() => document.querySelector(".th-train-group .th-form")?.scrollIntoView({ block: "center" }), 120);
    setTrainDraft(null);
  }, [trainDraft]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = accountIds.reduce((n, a) => n + dataFor(a).timers.filter((x) => x.kind === "training" && x.endAt > Date.now()).length, 0);
  return (
    <Section id="training" icon="training" title={t("secTraining")} count={count} move={move} defaultClosed summary={<TrainingSummary />}>
      {accountIds.map((acc) => (
        <TrainGroup key={acc} acc={acc} showName={multi} open={open?.acc === acc ? open : null} setOpen={setOpen} />
      ))}
    </Section>
  );
}
