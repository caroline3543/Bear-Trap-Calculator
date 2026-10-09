/* Training camps: the widget asks for each camp's full-batch time (normal and Helios),
   one form starts timers for all camps (same time or each camp), and "Finish at" says how long
   to train using the right full-batch time for the troop type. */
import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { success } from "../lib/feedback.js";
import { useMinute, useClockFor } from "../hooks/useNow.jsx";
import { TRAINING_CAMPS, applyTraining, busyCamps, planFinish, finishTogether, sortTimers, campMaxFor, hasHelios, campTroopsFor, troopsForDuration, durationForTroops, maxIncreases, applyLearnedMax, rememberTroops, defaultTroop, restartSummary, effectiveMax, capMaxFor, capEstimate, capKey, setCapMax, setCapOn, CAPACITY_FACTOR } from "../lib/timers.js";
import { crossesReset, checkInPlans, planJourney, modesDiffer, restOpts, sleepyCheckIns, easierPlan } from "../lib/batches.js";
import { backPlan, resetTarget, startReminders, START_GRACE_MS } from "../lib/backplan.js";
import { timingCheck, nextCycleCheck, finishAdvice, nextFinishTarget, inSleepWindow, idleUntilWake } from "../lib/sleep.js";
import { EducationStrip, useEduPlan } from "./EducationPlan.jsx";
import { eduWindow, insideFinishTarget, eduAwareMax } from "../lib/education.js";
import { MINUTE, HOUR, DAY, parseCompactTime, zonedParts, zonedTimeToUtc, formatTime, formatDate, formatSpan, formatCountdown, formatCountdownClock, localDayRange, hhmmToMinutes, intlLocale, formatWeekdayShort } from "../lib/time.js";
import { Section, Btn, Field, Seg, DurationFields, EMPTY_DUR, durFrom, durParse, FormActions, Icon, Ltr, Bidi, Remaining, GroupName, CalendarButtons } from "../components/ui.jsx";
import { useWhenLocal } from "./TimerCard.jsx";
import { rememberEnd } from "../lib/today.js";

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
        <Btn tone="gold" onClick={() => onConfirm({ go: true })} disabled={ask.length > 0}>{t(review.change ? "trUpdate" : "trStart")}</Btn>
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
          <p className="th-advice-rec"><span className="th-advice-tag">{t("recommended")}</span> {t("trEduRecBridge", { dur: formatSpan(advice.trainFor, lang), time: at })}</p>
        </>
      ) : <p className="th-advice-rec"><span className="th-advice-tag">{t("recommended")}</span> {t("trEduRecWait", { time: at })}</p>}
      <div className="th-item-actions">
        <Btn small tone="gold" onClick={onUse}>{advice.kind === "bridge" ? t("useThisPlan") : t("remindAtTime", { time: at })}</Btn>
        <button type="button" className="th-link" aria-expanded={why} onClick={() => setWhy(!why)}>{t("whyThis")}</button>
      </div>
      {why && <p className="th-advice-why">{advice.kind === "bridge" ? t("trWhyBridge") : t("trWhyWait")}</p>}
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
function CapCalibration({ accountId, rows, onDone, onCancel, turnOn = true }) {
  const { t, lang, updateAccount } = useTimeHub();
  const [editing, setEditing] = useState(rows.some((r) => !r.est));
  const [vals, setVals] = useState(() => Object.fromEntries(rows.map((r) => [r.key, durFrom(r.cur || r.est)])));
  const name = (r) => (r.troop === "helios" ? t("heliosCamp", { camp: t(r.camp) }) : t(r.camp));
  const ests = [...new Set(rows.map((r) => r.est))];
  const save = (values) => { updateAccount(accountId, (d) => (turnOn ? setCapOn(setCapMax(d, values), true) : setCapMax(d, values))); onDone(); };
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

/** "13h 14m ×5 + 6h 32m" — a camp's batches, without repeating equal lengths. */
function batchRuns(batches, lang) {
  const runs = [];
  for (const b of batches) {
    const last = runs[runs.length - 1];
    if (last && last.ms === b.ms) last.n += 1; else runs.push({ ms: b.ms, n: 1 });
  }
  return runs.map((r) => `${formatSpan(r.ms, lang)}${r.n > 1 ? ` ×${r.n}` : ""}`).join(" + ");
}

/** The full sequence, shown only after "View plan": one line per moment — when, and what to do.
 *  The times themselves carry the rhythm; batch lengths sit in one quiet line underneath. */
function PlanSteps({ plan }) {
  const { t, tz, lang, state } = useTimeHub();
  const sleep = state.settings.sleep;
  const day = (ms) => (localDayRange(plan.start, tz, 0).end > ms ? "" : localDayRange(plan.start, tz, 1).end > ms ? `${t("tomorrow")} `
    : ms - plan.start < 6 * DAY ? `${formatWeekdayShort(ms, tz, lang)} ` : `${formatDate(ms, tz, lang)} `);
  const when = (ms) => <span className="th-steps-when">{day(ms)}<Ltr>{formatTime(ms, tz, lang)}</Ltr></span>;
  return (
    <>
      <ol className="th-steps">
        <li><span className="th-steps-when">{t("bpNow")}</span><span>{t("bpStartTraining")}</span></li>
        {plan.checkIns.map((ci, i) => (
          <li key={ci.at} className={ci.edu ? "edu" : ""}>
            {when(ci.at)}
            <span>
              {ci.edu ? `🎓 ${t("trNextBatchEdu")}` : i === plan.checkIns.length - 1 ? t("trFinalBatch") : t("trNextBatch")}
              {ci.camps.length < plan.camps.length && <>: {ci.camps.map((c) => t(`short_${c}`)).join(", ")}</>}
              {inSleepWindow(ci.at, tz, sleep) && <small className="th-steps-note">{t("trUsuallyAsleep")}</small>}
            </span>
          </li>
        ))}
        <li className="end">{when(plan.end)}<span>✓ {t("trTargetReached")}</span></li>
      </ol>
      <p className="th-steps-batches">
        {plan.sameBatches
          ? <>{t("trBatches")}: {batchRuns(plan.camps[0].batches, lang)}</>
          : plan.camps.map((c) => <span key={c.camp}>{t(`short_${c.camp}`)}{c.troop === "helios" ? ` · ${t("helios")}` : ""}: {batchRuns(c.batches, lang)}</span>)}
      </p>
    </>
  );
}

function TrainForm({ onDone, preset, accountId, onEditTimes, onPerCamp }) {
  const { t, lang, tz, newId, dataFor, updateAccount, state, notify, dispatch } = useTimeHub();
  const sleep = state.settings.sleep;
  const now = useMinute(); // the planner works in minutes
  const data = dataFor(accountId);
  const restart = !!preset?.restart;
  const changing = !!preset?.change; // opened from a running training: "Change", not "Start"
  // finish (Finish at) | custom (Duration) | max — the first two are equal choices; each account
  // remembers the one it used last
  const [mode, setMode] = useState(preset?.ms && !restart ? "custom" : data.trainMode === "custom" ? "custom" : "finish");
  const [share, setShare] = useState(preset?.camp ? "each" : "same");
  const [shared, setShared] = useState(preset?.camps && preset.ms ? durFrom(preset.ms)
    : preset?.endAt > now ? durFrom(Math.floor((preset.endAt - now) / MINUTE) * MINUTE) : EMPTY_DUR);
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
  const [tgtKind, setTgtKind] = useState(preset?.eduTarget ? "edu" : "time"); // time | reset | edu
  const [resetOpen, setResetOpen] = useState(false);
  const [resetOff, setResetOff] = useState(null);
  // a target more than a day away is a calendar day, not "the next time the clock shows this"
  const startAt0 = preset?.endAt > now ? preset.endAt : duePlan ? duePlan.target : null;
  const [customDate, setCustomDate] = useState(() => (startAt0 && startAt0 - now >= DAY ? ymdAt(startAt0, tz) : "")); // a local day "YYYY-MM-DD"
  const [dateOpen, setDateOpen] = useState(false);
  const [eduNote, setEduNote] = useState(false);
  const [batch, setBatch] = useState("max"); // each camp's own maximum | one typed duration
  const [bdur, setBdur] = useState(EMPTY_DUR);
  // finish together (each camp its own start — the default) | start together (shorter batches end earlier)
  const [sync, setSync] = useState(() => (duePlan && new Set(duePlan.camps.map((c) => effectiveMax(data, c, hasHelios(data, c) ? defaultTroop(data, c) : "normal", data.trainCap?.on === true))).size > 1 ? "start" : "finish"));
  const timeRef = React.useRef(null);
  // a target further away than one batch: one batch started later ("back"), or non-stop from now
  const [style, setStyle] = useState(null);
  const [planOpen, setPlanOpen] = useState(false); // the full sequence stays folded until asked for
  const [rested, setRested] = useState(false); // the easier plan: no check-ins during sleep
  const [moreOpen, setMoreOpen] = useState(false);
  const [why, setWhy] = useState(false);
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
  const [raw, setRaw] = useState(() => (startAt0 ? digitsAt(startAt0, tz) : sAdvice ? digitsAt(sAdvice.finishAt, tz) : ""));
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
  // a check-in in the player's sleep isn't just flagged: there's an easier plan to switch to
  const rest = restOpts(tz, sleep);
  const jRest = canPlan ? planJourney(now, target, specs, { ...jOpts, mode: "rested", rest }) : null;
  const easier = pmode === "max" ? easierPlan(jMax, jRest, rest) : null;
  const bplan = pmode === "max" ? (rested && easier ? jRest : jMax) : jFew;
  const showModes = modesDiffer(jMax, jFew);
  const multi = !!(bplan?.ok && bplan.checkIns.length > 0 && !longOk); // needs at least one check-in
  const nonstop = later.length > 0 && !!bplan?.ok && bplan.checkIns.length > 0;
  // Training Capacity and Education are about ONE batch timed to the target; everyday training keeps the camps busy
  const planStyle = !nonstop ? "back" : style || (capOn || eduGoal || batch === "custom" ? "back" : "nonstop");
  const asleepN = bplan?.ok ? sleepyCheckIns(bplan, rest).length : 0;
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
    notify([`✓ ${changing ? t("trUpdated") : t("trainingStartedN", { n: list.length })}`,
      sum.together ? t("finishAround", { time: formatTime(sum.finishAt, tz, lang) }) : t("finishDifferent")]);
    onDone();
  }

  /** The form already says what will happen (duration + finish under the button, or the plan card),
   *  so the summary step only appears when there is something to decide: a running camp would be
   *  replaced, or a stored maximum would change. */
  function withReview(list, extraPlan, chain = null) {
    const busy = changing ? [] : busyCamps(data.timers, list.map((e) => e.camp), now);
    const increases = capOn ? [] : maxIncreases(data, list); // capacity runs never change the normal maximum
    if (!busy.length && !increases.length) return commit(list, extraPlan);
    setReview({ list, extraPlan, busy, increases, at: Date.now(), change: changing, chain });
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

  const title = t(changing ? "trChangeTitle" : "trStartTitle");
  const cta = t(changing ? "trUpdate" : "trStart");
  if (review) {
    return (
      <div className="th-form th-tf">
        <ReviewCard title={title} review={review} onConfirm={confirmReview} onKeepOld={keepOld} onBack={() => setReview(null)} />
      </div>
    );
  }

  /* ---------- shared pieces of the three ways to say how long ---------- */
  const head = (
    <div className="th-tf-head">
      <b>{title}</b>
      <button type="button" className="th-tf-close" aria-label={t("close")} onClick={onDone}>✕</button>
    </div>
  );
  const switchMode = (v) => {
    setMode(v);
    setError(null);
    if (v === "finish" || v === "custom") updateAccount(accountId, (d) => (d.trainMode === v ? d : { ...d, trainMode: v }));
  };
  const modeSeg = (
    <Seg value={mode} onChange={switchMode} label={t("trainingMode")} options={[
      { value: "finish", label: t("modeFinishShort") },
      { value: "custom", label: t("modeDurationShort") },
    ]} />
  );
  // the summary under the button reads the same whichever way the time was given
  const underLines = (durMs, end) => (
    <>
      <span>{t("bkTrainFor")} <b>{span(durMs)}</b></span>
      <span>{t("finishes")} <b>{clock(end)}</b>{localDayRange(now, tz, 0).end > end ? "" : ` ${dayWordFor(end)}`} · {utcOf(end)}</span>
    </>
  );
  // Training Capacity: one checkbox. The large calibration form only the first time, or after "Edit".
  const capBox = (
    <>
      <div className="th-cap th-tf-cap">
        <label className="th-check">
          <input type="checkbox" checked={capOn} onChange={(e) => toggleCap(e.target.checked)} />
          <span>
            <b>{t("capLabel")}</b>
            {capOn && !capMissing.length && planCamps.length > 0
              ? <small>{t("trCapMax", { max: new Set(planCamps.map((c) => maxOf(c))).size === 1 ? span(maxOf(planCamps[0])) : `${span(Math.min(...planCamps.map((c) => maxOf(c))))} – ${span(Math.max(...planCamps.map((c) => maxOf(c))))}` })}</small>
              : !capOn && <small>{t("trCapSub")}</small>}
          </span>
        </label>
        {capOn && !capMissing.length && !calibrate && planCamps.length > 0 && (
          <button type="button" className="th-link" onClick={() => setCalibrate(true)}>{t("edit")}</button>
        )}
      </div>
      {capOn && (calibrate || capMissing.length > 0) && capRows.length > 0 && (
        <CapCalibration key={capRows.map((r) => r.key).join()} accountId={accountId} rows={capRows}
          onDone={() => setCalibrate(false)} onCancel={() => { setCalibrate(false); if (capMissing.length) toggleCap(false); }} />
      )}
    </>
  );
  // which camps: tap to include / leave out (Normal / Helios beside a camp that has both)
  const campChips = (
    <div className="th-tf-camps" role="group" aria-label={t("whichCamps")}>
      {TRAINING_CAMPS.map((c) => (
        <span key={c} className="th-tf-camp">
          <button type="button" className="th-chip-btn small" aria-pressed={ticked[c]} onClick={() => { setTicked({ ...ticked, [c]: !ticked[c] }); setError(null); }}>
            {ticked[c] && <span aria-hidden="true">✓ </span>}{t(`short_${c}`)}
          </button>
          {ticked[c] && troopToggle(c)}
        </span>
      ))}
    </div>
  );

  if (mode === "max") {
    return (
      <div className="th-form th-tf">
        {head}
        {modeSeg}
        <span className="th-finish-q">{t("trOptMax")}</span>
        <p className="th-hint th-mode-note">{t("modeMaxHelp")}</p>
        {campChips}
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
        {capBox}
        <EduAdvice advice={advice} onUse={useAdvice} />
        {error && <span className="th-error" role="alert">{error}</span>}
        <Btn tone={advice ? "ghost" : "gold"} block onClick={startMax} disabled={!maxKnown.length}>
          {advice ? t("startMaxAnyway") : t("trStartMax")}
        </Btn>
      </div>
    );
  }
  if (mode === "custom") {
    const one = share === "same" ? durParse(shared) : null;
    const ok = one && !one.error && one.ms > 0;
    return (
      <div className="th-form th-tf">
        {head}
        {modeSeg}
        <span className="th-finish-q">{t("trHowLong")}</span>
        {share === "same" ? (
          <>
            <DurationFields value={shared} onChange={setShared} label={t("trainAllFor")} />
            {ok && <span className="th-finish-read">{t("finishes")} <b>{clock(now + one.ms)}</b> {dayWordFor(now + one.ms)} · <Ltr>{formatTime(now + one.ms, "UTC", lang)}</Ltr> UTC</span>}
          </>
        ) : (
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
        {capBox}
        {share === "same" && campChips}
        {error && <span className="th-error" role="alert">{error}</span>}
        <Btn tone="gold" block onClick={saveLeft}>{cta}</Btn>
        {ok ? <div className="th-tf-under">{underLines(one.ms, now + one.ms)}</div> : share === "each" && <FinishPreview entries={entries} now={now} />}
        <details className="th-secondary th-tf-more" open={moreOpen} onToggle={(e) => setMoreOpen(e.currentTarget.open)}>
          <summary>{t("trMoreOptions")}</summary>
          <div className="th-tf-morebody">
            <label className="th-check">
              <input type="checkbox" checked={share === "each"} onChange={(e) => switchShare(e.target.checked ? "each" : "same")} />
              {t("trPerCampDur")}
            </label>
            {share === "each" && <p className="th-hint">{t("syncSomeHint")}</p>}
            <button type="button" className="th-tf-opt" onClick={() => switchMode("max")}>{t("trOptMax")}<span className="th-tf-chev" aria-hidden="true">›</span></button>
            {onPerCamp && <button type="button" className="th-tf-opt" onClick={onPerCamp}>{t("trOptPerCamp")}<span className="th-tf-chev" aria-hidden="true">›</span></button>}
            {onEditTimes && <button type="button" className="th-tf-opt" onClick={onEditTimes}>{t("trSettings")}<span className="th-tf-chev" aria-hidden="true">›</span></button>}
          </div>
        </details>
      </div>
    );
  }

  /* ---------- Finish at a time (the default): the goal first, the arithmetic behind it ---------- */
  const utcDay = targetOk && ymdAt(target, tz) !== ymdAt(target, "UTC") ? ` (${formatDate(target, "UTC", lang)})` : "";
  const showCamps = !!back && (back.groups.length > 1 || back.rows.length < planCamps.length);
  const oneGo = longOk && tooLong.length > 0; // "my camps can train this long in one batch"
  // the common case: everything starts now and ends on the target — a button and one line, no plan
  const simple = !!back && later.length === 0 && (missed.length === 0 || calm);
  const underLine = (durMs, end) => (
    <>{t("bkTrainFor")} <b>{span(durMs)}</b> · {t("finishes")} <b>{clock(end)}</b>{localDayRange(now, tz, 0).end > end ? "" : ` ${dayWordFor(end)}`} · {utcOf(end)}</>
  );
  const eduAvail = !!eduWin && eduWin.start - now >= MINUTE;
  const sleepNotes = (
    <>
      {isAdvice && sAdvice.kind === "bed" && <p className="th-note">{t("trOvernight", { end: formatTime(sAdvice.overnightEnd, tz, lang) })}</p>}
      {!isAdvice && sAdvice && tgtKind === "time" && inSleepWindow(target, tz, sleep) && <p className="th-note">🌙 {t("trFinishAsleep")}</p>}
    </>
  );
  const eduThen = eduGoal && <p className="th-bk-then">{t("trEduThen", { time: formatTime(eduWin.start, tz, lang) })}</p>;

  return (
    <div className="th-form th-finishform th-tf">
      {head}
      {modeSeg}
      {/* 1. the goal */}
      <label className="th-finish">
        <span className="th-finish-q">{t("trWhenFinish")}</span>
        <input ref={timeRef} className="th-finish-input" inputMode="numeric" autoComplete="off" placeholder="2200" maxLength={5}
          aria-describedby="th-finish-read" value={eduGoal ? digitsAt(eduWin.start, tz) : raw} onChange={(e) => { setRaw(e.target.value.replace(/[^\d:.]/g, "")); setError(null); setLongOk(false); setDayAdd(0); pickTime(); }} />
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
      {hhmm && !eduGoal && (
        <div className="th-todos-filter th-dayadd" role="group" aria-label={t("finishDay")}>
          {[0, 1].map((n) => (
            <button key={n} type="button" className={`th-chip-btn small ${!customDate && dayAdd === n ? "on" : ""}`} aria-pressed={!customDate && dayAdd === n}
              onClick={() => { setDayAdd(n); setCustomDate(""); setDateOpen(false); setLongOk(false); }}>{dayWordFor(dayTarget(n))}</button>
          ))}
          <button type="button" className={`th-chip-btn small ${customDate ? "on" : ""}`} aria-pressed={!!customDate} aria-expanded={dateOpen} onClick={() => setDateOpen(!dateOpen)}>
            {customDate && Number.isFinite(customTarget) ? formatDate(customTarget, tz, lang) : t("trChooseDate")}
          </button>
        </div>
      )}
      {dateOpen && !eduGoal && (
        <input className="th-input th-bk-date" type="date" aria-label={t("trChooseDate")} min={ymdAt(now, tz)} value={customDate}
          onChange={(e) => { setCustomDate(e.target.value); setLongOk(false); }} />
      )}
      {/* contextual shortcuts: just after reset (SvS / capacity planning), Education (only with a booking) */}
      {(eduAvail || capOn || tgtKind === "reset") && (
        <div className="th-todos-filter th-dayadd" role="group" aria-label={t("bkShortcuts")}>
          {(capOn || tgtKind === "reset") && (
            <button type="button" className={`th-chip-btn small ${tgtKind === "reset" ? "on" : ""}`} aria-pressed={tgtKind === "reset"} aria-expanded={resetOpen} onClick={() => setResetOpen(!resetOpen)}>
              {t("bkJustAfterReset")}{tgtKind === "reset" && resetOff != null && <>&nbsp;· <Ltr>00:{String(resetOff).padStart(2, "0")} UTC</Ltr></>}
            </button>
          )}
          {eduAvail && (
            <button type="button" className={`th-chip-btn small ${eduGoal ? "on" : ""}`} aria-pressed={eduGoal} onClick={pickEdu}>
              🎓 {t("trFinishForEdu")} · <Ltr>{formatTime(eduWin.start, tz, lang)}</Ltr>
            </button>
          )}
        </div>
      )}
      {resetOpen && (
        <div className="th-todos-filter th-dayadd" role="group" aria-label={t("bkResetOffsetQ")}>
          {RESET_OFFSETS.map((off) => (
            <button key={off} type="button" className={`th-chip-btn small ${tgtKind === "reset" && resetOff === off ? "on" : ""}`} aria-pressed={tgtKind === "reset" && resetOff === off}
              onClick={() => pickReset(off)}><Ltr>00:{String(off).padStart(2, "0")} UTC</Ltr></button>
          ))}
        </div>
      )}
      {sAdvice && sAdvice.kind === "bed" && !isAdvice && !eduGoal && !capOn && !changing && tgtKind === "time" && !customDate && (
        <button type="button" className="th-suggest-btn" onClick={() => { setRaw(digitsAt(sAdvice.finishAt, tz)); setDayAdd(0); }}>
          {t("suggestBed", { time: formatTime(sAdvice.finishAt, tz, lang) })}
        </button>
      )}

      {/* 2. the two things that change the answer */}
      {capBox}
      {campChips}

      {/* 3. the answer */}
      {simple && !oneGo && (
        <>
          {error && <span className="th-error" role="alert">{error}</span>}
          <Btn tone="gold" block onClick={() => startBack(eduGoal)}>{cta}</Btn>
          <div className="th-tf-under">
            {back.groups.length === 1 ? underLines(back.groups[0].durMs, back.groups[0].end) : back.groups.map((g) => (
              <span key={`${g.camps[0]}|${g.end}`}><b>{campNames(g.camps)}: </b>{underLine(g.durMs, g.end)}</span>
            ))}
          </div>
          {eduThen}
          {sleepNotes}
        </>
      )}
      {oneGo && (
        <>
          {error && <span className="th-error" role="alert">{error}</span>}
          <Btn tone="gold" block onClick={startPlanNow}>{cta}</Btn>
          <div className="th-tf-under">{underLines(need, target)}</div>
          <p className="th-note">{t("oneGoNote", { dur: span(need) })} <button type="button" className="th-link" onClick={() => setLongOk(false)}>{t("bpShowPlan")}</button></p>
        </>
      )}

      {/* a target that needs planning: the first sentence says what matters; detail stays folded */}
      {back && !simple && !oneGo && (
        <div className={`th-bk ${back.state}`} role="group" aria-label={t("bpTitle")}>
          <div className="th-bk-kicker">{t("bpTitle")}</div>
          {planStyle === "nonstop" ? (
            <>
              <p className="th-bk-lead">{t("trMoreThanOne")}</p>
              <b className="th-bk-head">{t("trHeadNonstop", { n: bplan.checkIns.length })}</b>
              <p className="th-bk-finish">{t("bpFinal")} <b>{whenShort(bplan.end)}</b> {utcOf(bplan.end)}</p>
              {bplan.usesEdu && <p className="th-bk-sub">🎓 {t("bpUsesEdu")}</p>}
              {pmode === "fewest" && bplan.idleMs > 0 && <p className="th-bk-sub">{t("trIdle", { time: span(bplan.idleMs) })}</p>}
              {/* sleep: not just a warning — an easier plan to switch to */}
              {rested && easier ? (
                <p className="th-bk-rest on">✓ {t("trUsingEasier")} <button type="button" className="th-link" onClick={() => setRested(false)}>{t("trBackToMax")}</button></p>
              ) : easier ? (
                <div className="th-bk-rest">
                  <span>🌙 {asleepN > 1 ? t("trSleepN", { n: asleepN }) : t("trSleepNeed", { time: whenShort(easier.moved) })}</span>
                  <span>{t("trEasier")} {easier.lostMs > 0 ? t("trEasierLost", { time: span(easier.lostMs) }) : easier.extra > 0 ? t("trEasierExtra", { n: easier.extra }) : t("trEasierFree")}</span>
                  <Btn small onClick={() => setRested(true)}>{t("trUseEasier")}</Btn>
                </div>
              ) : asleepN > 0 && <p className="th-bk-sub">🌙 {t("trSleepN", { n: asleepN })}</p>}
              <button type="button" className="th-link th-bk-toggle" aria-expanded={planOpen} onClick={() => setPlanOpen(!planOpen)}>{t(planOpen ? "trHidePlan" : "trViewPlan")}</button>
              {planOpen && (
                <>
                  {showModes && !(rested && easier) && (
                    <>
                      <Seg value={pmode} onChange={setPmode} label={t("bpModeQ")} options={[{ value: "max", label: t("bpModeMax") }, { value: "fewest", label: t("bpModeFewest") }]} />
                      <p className="th-hint">{t(pmode === "max" ? "trModeMaxHelp" : "trModeFewHelp")}</p>
                    </>
                  )}
                  <PlanSteps plan={bplan} />
                </>
              )}
              {error && <span className="th-error" role="alert">{error}</span>}
              <div className="th-bk-actions"><Btn tone="gold" block onClick={startPlanNow}>{cta}</Btn></div>
              <button type="button" className="th-link th-bk-alt" onClick={() => setStyle("back")}>{t("trOrOneBatch", { time: whenShort(later[0].start) })}</button>
            </>
          ) : (
            <>
              {eduGoal && <p className="th-bk-lead">🎓 {t("bkEduFree")}</p>}
              {missed.length > 0 && !calm && (
                <div className="th-bk-miss" role="status">
                  <b>{t(batch === "custom" ? "bkNoFitCustom" : `bkNoFit${capOn ? "Cap" : "Full"}${eduGoal ? "Edu" : ""}`, { dur: span(missed[0].fullMs) })}</b>
                  <span>{t("trMostFits", { dur: missed[0].durMs >= DAY ? `${hoursSpan(missed[0].durMs, lang)} (${span(missed[0].durMs)})` : span(missed[0].durMs) })}</span>
                </div>
              )}
              <ul className="th-bk-starts">
                {back.groups.map((g) => (
                  <li key={`${g.camps[0]}|${g.start}`} className={g.state}>
                    <b className="th-bk-head">
                      {g.state === "future"
                        ? t(showCamps ? "trHeadStartCamps" : "trHeadStart", { camps: campNames(g.camps), day: weekdayOf(g.start, tz, lang), time: formatTime(g.start, tz, lang) })
                        : t(showCamps ? "trHeadNowCamps" : "trHeadNow", { camps: campNames(g.camps) })}
                    </b>
                    {g.state === "future" && (
                      <span className="th-bk-sub">{dayWordFor(g.start)} · {utcOf(g.start)} · <b>{t("bkStartsIn", { time: span(g.start - now) })}</b>
                        {inSleepWindow(g.start, tz, sleep) && <> · 🌙 {t("trUsuallyAsleep")}</>}
                        {g === later[0] && <> · <button type="button" className="th-link th-bk-why" aria-expanded={why} onClick={() => setWhy(!why)}>{t("trWhy")}</button></>}</span>
                    )}
                    {g.state === "future" && g === later[0] && why && (
                      <span className="th-bk-whytext">{t(batch === "custom" ? "trWhyCustom" : capOn ? "trWhyCap" : "trWhyFull", { dur: span(g.durMs) })}</span>
                    )}
                    <span className="th-bk-fact">{t("bkTrainFor")} <b>{span(g.durMs)}</b>{endsDiffer && <> → {whenShort(g.end)}</>}</span>
                  </li>
                ))}
              </ul>
              <p className="th-bk-finish">{t("finishes")} <b>{whenShort(target)}</b> {utcOf(target)}</p>
              {eduThen}
              {busyPast.length > 0 && (
                <p className="th-bk-busy">{t("bkBusy", { camps: campNames(busyPast.map((x) => x.category)), time: whenShort(Math.max(...busyPast.map((x) => x.endAt))) })}</p>
              )}
              {error && <span className="th-error" role="alert">{error}</span>}
              {/* a start that is still ahead never gets a Start button: starting now would finish too early */}
              <div className="th-bk-actions">
                {nowG.length > 0
                  ? <Btn tone="gold" block onClick={() => startBack(eduGoal)}>{cta}</Btn>
                  : <Btn tone="gold" block onClick={() => addStartReminder(eduGoal)}>{t("bkAddReminder")}</Btn>}
              </div>
              {nowG.length > 0 && later.length > 0 && <p className="th-note">{t("trLaterReminder")}</p>}
              {missed.length > 0 && !calm && (
                <span className="th-bk-links">
                  {capOn && <button type="button" className="th-link" onClick={() => toggleCap(false)}>{t("bkNormalInstead")}</button>}
                  {!eduGoal && <button type="button" className="th-link" onClick={() => setTargetAt(now + missed[0].fullMs)}>{t("trFullInstead", { time: whenShort(now + missed[0].fullMs) })}</button>}
                </span>
              )}
              {nonstop && <button type="button" className="th-link th-bk-alt" onClick={() => setStyle("nonstop")}>{t("bkNonstop")}</button>}
            </>
          )}
        </div>
      )}
      {!back && (
        <>
          {targetOk && !capMissing.length && batch === "custom" && !customMs && <p className="th-note">{t("bkEnterDuration")}</p>}
          {targetOk && batch === "max" && !known.length && planCamps.length > 0 && <p className="th-note">{t("noMaxNote")}</p>}
          {error && <span className="th-error" role="alert">{error}</span>}
          <Btn tone="gold" block disabled onClick={() => {}}>{cta}</Btn>
        </>
      )}

      {/* everything else: there when wanted, out of the way otherwise */}
      <details className="th-secondary th-tf-more" open={moreOpen} onToggle={(e) => setMoreOpen(e.currentTarget.open)}>
        <summary>{t("trMoreOptions")}</summary>
        <div className="th-tf-morebody">
          <button type="button" className="th-tf-opt" onClick={() => switchMode("max")}>{t("trOptMax")}<span className="th-tf-chev" aria-hidden="true">›</span></button>
          {onPerCamp && <button type="button" className="th-tf-opt" onClick={onPerCamp}>{t("trOptPerCamp")}<span className="th-tf-chev" aria-hidden="true">›</span></button>}
          {/* just after reset: the player picks how long after — none is assumed */}
          <div className="th-bk-opt">
            <span className="th-bk-optlabel">{t("bkJustAfterReset")}</span>
            <span className="th-todos-filter th-dayadd" role="group" aria-label={t("bkJustAfterReset")}>
              {RESET_OFFSETS.map((off) => (
                <button key={off} type="button" className={`th-chip-btn small ${tgtKind === "reset" && resetOff === off ? "on" : ""}`} aria-pressed={tgtKind === "reset" && resetOff === off}
                  onClick={() => pickReset(off)}><Ltr>00:{String(off).padStart(2, "0")} UTC</Ltr></button>
              ))}
            </span>
          </div>
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
          {/* the stored maximum may be out of date: the player can say ONE batch really is this long */}
          {multi && !capOn && batch === "max" && (
            <button type="button" className="th-link th-onego" onClick={() => setLongOk(true)}>{t("canTrainLonger", { dur: formatSpan(need, lang) })}</button>
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
          {/* per-camp maximums, troop type and troop counts */}
          {planCamps.length > 0 && (
            <div className="th-bk-opt">
              <span className="th-bk-optlabel">{t("trainingDetails")}</span>
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
            </div>
          )}
          {onEditTimes && <button type="button" className="th-tf-opt" onClick={onEditTimes}>{t("trSettings")}<span className="th-tf-chev" aria-hidden="true">›</span></button>}
        </div>
      </details>
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
    const increases = maxIncreases(data, list2);
    if (!increases.length) return commit(list2, plan, []); // nothing to decide: just start
    setReview({ list: list2, busy: [], increases, at: Date.now(), extraPlan: plan });
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
    notify([`✓ ${t("trainingStartedN", { n: list2.length })}`, sum.together ? t("finishAround", { time: formatTime(sum.finishAt, tz, lang) }) : t("finishDifferent")]);
    onDone();
  }
  if (review) {
    return (
      <div className="th-form th-restart">
        <ReviewCard title={t("trStartTitle")} review={review} onBack={() => setReview(null)}
          onConfirm={(a) => answerReview(review, setReview, a, commit)}
          onKeepOld={(items) => keepOldMaxes(review, setReview, items)} />
      </div>
    );
  }
  return (
    <div className="th-form th-restart">
      <div className="th-tf-head">
        <b>{t("trStartTitle")}</b>
        <button type="button" className="th-tf-close" aria-label={t("close")} onClick={onDone}>✕</button>
      </div>
      <span className="th-finish-q">{t("trOptPerCamp")}</span>
      {!plan && <EduAdvice advice={advice} onUse={useAdvice} />}
      {plan && <p className="th-note">✓ {t("trEduPlanSet", { time: formatTime(plan.startAt, tz, lang) })}</p>}
      {rows.some((c) => c.check?.suggestion) && (
        <MoonNote>{t("trTimingShort", { n: rows.filter((c) => c.check?.suggestion).length, finish: formatTime(rows.find((c) => c.check?.suggestion).check.suggestion.finishAt, tz, lang) })}</MoonNote>
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
      <Btn tone="gold" block onClick={go} disabled={!valid.length || values.some((x) => x.ms && x.ms.over)}>{t("trStart")}</Btn>
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

/** What an account's camps are doing now: running (grouped by when they finish), and idle. */
function campState(data, now) {
  const timers = (data.timers || []).filter((x) => x.kind === "training");
  const running = timers.filter((x) => x.endAt > now).sort((a, b) => a.endAt - b.endAt || TRAINING_CAMPS.indexOf(a.category) - TRAINING_CAMPS.indexOf(b.category));
  const groups = finishTogether(running);
  const together = groups.length === 1 && groups[0].timers.length === running.length && running.length > 1 ? groups[0] : null;
  const idle = restartable(data, now);
  // one row per finish time: camps that end in the same minute are one thing to the player
  const byEnd = new Map();
  for (const x of running) {
    const k = Math.floor(x.endAt / MINUTE);
    byEnd.set(k, [...(byEnd.get(k) || []), x]);
  }
  const rows = [...byEnd.entries()].map(([k, list]) => ({ key: String(k), endAt: list[0].endAt, timers: list }));
  return { timers, running, together, idle, next: running[0] || null, rows };
}

/** Everything about training that used to sit behind several links, in one place:
 *  full-batch times (per camp, Helios, with Education), batch sizes, and Training Capacity maximums. */
function TrainingSettings({ accountId, focusEdu, onClose }) {
  const { t, lang, dataFor } = useTimeHub();
  const data = dataFor(accountId);
  const [editCap, setEditCap] = useState(false);
  const rows = TRAINING_CAMPS.flatMap((c) => (hasHelios(data, c) ? ["normal", "helios"] : ["normal"]).map((troop) => ({
    camp: c, troop, key: capKey(c, troop), normal: campMaxFor(data, c, troop), est: capEstimate(data, c, troop), cur: capMaxFor(data, c, troop),
  })));
  const set = rows.filter((r) => r.cur > 0);
  const name = (r) => `${t(`short_${r.camp}`)}${r.troop === "helios" ? ` ${t("helios")}` : ""}`;
  return (
    <div className="th-form th-tf th-tset">
      <div className="th-tf-head">
        <b>{t("trSettings")}</b>
        <button type="button" className="th-tf-close" aria-label={t("close")} onClick={onClose}>✕</button>
      </div>
      <CampTimes accountId={accountId} focusEdu={focusEdu} />
      {editCap ? (
        <CapCalibration key={rows.map((r) => r.key).join()} accountId={accountId} rows={rows} turnOn={false} onDone={() => setEditCap(false)} onCancel={() => setEditCap(false)} />
      ) : (
        <div className="th-camptimes closed">
          <div>
            <span className="th-label">{t("capLabel")}</span>
            <div className="th-camptimes-sum">
              {set.length
                ? (new Set(set.map((r) => r.cur)).size === 1 && set.length === rows.length ? t("trCapMax", { max: formatSpan(set[0].cur, lang) }) : set.map((r) => `${name(r)} ${formatSpan(r.cur, lang)}`).join(" · "))
                : t("trCapSub")}
            </div>
          </div>
          <span className="th-item-actions"><Btn small onClick={() => setEditCap(true)}>{t("edit")}</Btn></span>
        </div>
      )}
    </div>
  );
}

/** A row with one action tucked behind its trailing edge. Swipe toward the start (left; right in
 *  right-to-left languages) to reveal it, then tap it — or swipe all the way across. A short swipe
 *  never does anything by itself, and tapping the row again closes it. */
const SWIPE_W = 92;
function SwipeRow({ label, onAction, onFull, children }) {
  const ref = React.useRef(null);
  const g = React.useRef(null); // the gesture in progress
  const moved = React.useRef(false); // a drag just ended: swallow the click it produces
  const [dx, setDx] = useState(0); // how far the row is pulled open (px)
  const [drag, setDrag] = useState(false);
  const down = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const rtl = getComputedStyle(ref.current).direction === "rtl";
    g.current = { x: e.clientX, y: e.clientY, base: dx, dx, sign: rtl ? 1 : -1, on: false, id: e.pointerId, w: ref.current.offsetWidth };
  };
  const move = (e) => {
    const s = g.current;
    if (!s) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!s.on) {
      if (Math.abs(mx) < 10) return;
      if (Math.abs(my) > Math.abs(mx)) { g.current = null; return; } // scrolling the page, not swiping the row
      s.on = true;
      setDrag(true);
      try { ref.current.setPointerCapture(s.id); } catch { /* not capturable: the gesture still works */ }
    }
    s.dx = Math.max(0, Math.min(s.w, s.base + mx * s.sign));
    setDx(s.dx);
  };
  const end = (full) => () => {
    const s = g.current;
    g.current = null;
    if (!s || !s.on) return;
    setDrag(false);
    moved.current = true;
    setTimeout(() => { moved.current = false; }, 300);
    if (full && s.dx > s.w * 0.6) { setDx(0); (onFull || onAction)(); } else setDx(s.dx > SWIPE_W / 2 ? SWIPE_W : 0);
  };
  const click = (e) => {
    if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false; return; }
    if (dx > 0 && !e.target.closest(".th-swipe-act")) { e.preventDefault(); e.stopPropagation(); setDx(0); }
  };
  return (
    <div ref={ref} className={`th-swipe ${drag ? "drag" : ""} ${dx > 0 ? "open" : ""}`}
      onPointerDown={down} onPointerMove={move} onPointerUp={end(true)} onPointerCancel={end(false)} onClickCapture={click}>
      <button type="button" className="th-swipe-act" style={{ width: Math.max(dx, SWIPE_W) }} tabIndex={dx > 0 ? 0 : -1} aria-hidden={dx === 0}
        onClick={() => { setDx(0); onAction(); }}>{label}</button>
      <div className="th-swipe-body" style={{ insetInlineStart: -dx }}>{children}</div>
    </div>
  );
}

/** How long the "Training removed · Undo" line stays. */
const UNDO_MS = 10000;

function TrainGroup({ acc, showName, open, setOpen }) {
  const { t, tz, lang, dataFor, updateAccount, accountById } = useTimeHub();
  const data = dataFor(acc);
  const trainTimes = data.timers.filter((x) => x.kind === "training").map((x) => x.endAt);
  const plans = (data.plans || []).filter((p) => p.target > Date.now()).sort((a, b) => a.startAt - b.startAt);
  const now = useClockFor([...trainTimes, ...plans.map((p) => p.startAt)]);
  const when = useWhenLocal();
  const st = campState(data, now);
  const campsSet = TRAINING_CAMPS.some((c) => data.campMax?.[c]);
  const kind = open?.kind;
  const [menu, setMenu] = useState(null); // row key whose ⋯ menu is open
  const [details, setDetails] = useState(null); // row key showing its details
  const [confirm, setConfirm] = useState(null); // row key being asked "Remove training?"
  const [undo, setUndo] = useState(null); // { timers, lastEnded } of the training just removed
  const [morePlans, setMorePlans] = useState(false);
  const undoTimer = React.useRef(null);
  React.useEffect(() => () => clearTimeout(undoTimer.current), []);

  const nm = (x) => `${t(`short_${x.category}`)}${x.troop === "helios" ? ` · ${t("helios")}` : ""}`;
  const allTogether = st.rows.length === 1 && st.rows[0].timers.length === TRAINING_CAMPS.length;
  const rowTitle = (r) => (allTogether ? t("trAllTraining") : t("trCampsTraining", { camps: r.timers.map(nm).join(" + ") }));
  const startTraining = (camps) => setOpen({ acc, kind: "finish", preset: { accountId: acc, camps }, key: Date.now() });
  const change = (r) => setOpen({
    acc, kind: "finish", key: Date.now(),
    preset: { accountId: acc, change: true, camps: r.timers.map((x) => x.category), endAt: r.endAt, troops: Object.fromEntries(r.timers.map((x) => [x.category, x.troop === "helios" ? "helios" : "normal"])) },
  });

  /** Removes the app's timer only — the game keeps training. Always undoable for a moment. */
  function remove(r) {
    const at = Date.now();
    setUndo({ timers: r.timers, lastEnded: data.lastEnded || {} });
    updateAccount(acc, (d) => r.timers.reduce((dd, x) => rememberEnd(dd, x, at), { ...d, timers: d.timers.filter((y) => !r.timers.some((x) => x.id === y.id)) }));
    setConfirm(null); setMenu(null); setDetails(null);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
  }
  function undoRemove() {
    const u = undo;
    clearTimeout(undoTimer.current);
    setUndo(null);
    if (!u) return;
    updateAccount(acc, (d) => {
      // a camp that has been started again in the meantime keeps its new training
      const back = u.timers.filter((x) => !d.timers.some((y) => y.kind === "training" && y.category === x.category && y.endAt > Date.now()));
      const lastEnded = { ...(d.lastEnded || {}) };
      for (const x of back) { if (u.lastEnded[x.category] != null) lastEnded[x.category] = u.lastEnded[x.category]; else delete lastEnded[x.category]; }
      return { ...d, timers: [...d.timers.filter((y) => !back.some((x) => x.id === y.id)), ...back], lastEnded };
    });
  }
  const dropPlan = (p) => updateAccount(acc, (d) => ({ ...d, plans: d.plans.filter((x) => x.id !== p.id) }));
  const [leftA, leftB] = t("trLeft", { time: "\u0001" }).split("\u0001");
  const acct = accountById(acc);
  const shownPlans = morePlans ? plans : plans.slice(0, 1);

  return (
    <div className="th-group th-train-group">
      {showName && <GroupName accountId={acc} />}

      {/* what is happening → when it finishes → how long is left. Tap to change, swipe to remove. */}
      {st.rows.map((r) => (
        <React.Fragment key={r.key}>
          <SwipeRow label={t("trRemove")} onAction={() => { setConfirm(r.key); setMenu(null); }} onFull={() => remove(r)}>
            <div className="th-tc-row">
              <button type="button" className="th-tc-card" onClick={() => change(r)} aria-label={`${rowTitle(r)}. ${t("trTapToChange")}`}>
                <span className="th-tc-title">{rowTitle(r)}</span>
                <span className="th-tc-when">{t("finishes")} <b><Ltr>{when(r.endAt)}</Ltr></b> <small className="th-utc">· <Ltr>{formatTime(r.endAt, "UTC", lang)}</Ltr> UTC</small></span>
                <span className="th-tc-left" role="timer">{leftA}<Remaining to={r.endAt} />{leftB}</span>
                {allTogether && <span className="th-tc-camps">{r.timers.map(nm).join(" · ")}</span>}
              </button>
              <button type="button" className="th-more" aria-expanded={menu === r.key} aria-label={`${t("options")}: ${rowTitle(r)}`} onClick={() => setMenu(menu === r.key ? null : r.key)}>⋯</button>
            </div>
          </SwipeRow>
          {menu === r.key && confirm !== r.key && (
            <div className="th-item-actions th-tc-menu">
              <Btn small onClick={() => { setDetails(details === r.key ? null : r.key); setMenu(null); }}>{t(details === r.key ? "trHideDetails" : "trViewDetails")}</Btn>
              <Btn small tone="danger" onClick={() => { setConfirm(r.key); setMenu(null); }}>{t("trRemoveFromHub")}</Btn>
            </div>
          )}
          {confirm === r.key && (
            <div className="th-tc-confirm" role="alertdialog" aria-label={t("trRemoveQ")}>
              <b>{t("trRemoveQ")}</b>
              <p>{t("trRemoveBody")}</p>
              <div className="th-item-actions">
                <Btn small tone="danger" onClick={() => remove(r)}>{t("trRemove")}</Btn>
                <Btn small onClick={() => setConfirm(null)}>{t("trKeep")}</Btn>
              </div>
            </div>
          )}
          {details === r.key && (
            <div className="th-tc-details">
              <ul>
                {r.timers.map((x) => (
                  <li key={x.id}>
                    <b>{t(x.category)}</b>
                    <span>{t(x.troop === "helios" ? "helios" : "normalTroops")} · {formatSpan(x.durationMs, lang)}</span>
                  </li>
                ))}
              </ul>
              <NextCycleNotes acc={acc} timers={r.timers} />
              <CalendarButtons items={[{ uid: `tm:${r.timers[0].id}`, start: r.endAt, title: `${rowTitle(r)}${acct ? ` (${acct.name})` : ""}` }]} filename={`training-${r.key}`} />
            </div>
          )}
        </React.Fragment>
      ))}
      {st.rows.length > 0 && !kind && !undo && <p className="th-tc-hint">{t("trGestures")}</p>}
      {undo && (
        <div className="th-tc-undo" role="status">
          <span>{t("trRemoved")}</span>
          <button type="button" className="th-link" onClick={undoRemove}>{t("trUndo")}</button>
        </div>
      )}

      {/* camps with nothing running */}
      {st.idle.length > 0 && (
        <div className="th-tc-ready">
          {st.idle.length === TRAINING_CAMPS.length ? t("trCampsReady", { n: st.idle.length }) : t("trNamesReady", { camps: st.idle.map((c) => t(`short_${c.camp}`)).join(", ") })}
        </div>
      )}

      {/* planned starts: the next one; the rest behind "+N more" */}
      {shownPlans.map((p) => (
        <div key={p.id} className="th-tc-plan">
          <span>{p.edu ? "🎓" : "⏰"} {t(p.edu ? "trPlanEdu" : "trPlanStart", { camps: p.camps.length === TRAINING_CAMPS.length ? t("eduCampsAll") : p.camps.map((c) => t(`short_${c}`)).join(", ") })} · <b><Ltr>{when(p.startAt)}</Ltr></b>
            {p.startAt > now && <small> · <Remaining to={p.startAt} /></small>}</span>
          <button type="button" className="th-tc-x" aria-label={t("trRemoveReminder")} onClick={() => dropPlan(p)}>✕</button>
        </div>
      ))}
      {plans.length > 1 && (
        <button type="button" className="th-link th-tc-moreplans" aria-expanded={morePlans} onClick={() => setMorePlans(!morePlans)}>
          {morePlans ? t("trFewer") : t("trMoreN", { n: plans.length - 1 })}
        </button>
      )}

      {/* Education: a short prompt, not a standing box */}
      {(!kind || kind === "edu" || kind === "edufind") && <EducationStrip acc={acc} open={open} setOpen={setOpen} hasCamps={campsSet}
        onAddTime={() => setOpen({ acc, kind: "times", focusEdu: true })} onRestart={() => startTraining(st.idle.map((c) => c.camp))}
        onPlan={() => setOpen({ acc, kind: "finish", preset: { accountId: acc, eduTarget: true, ...(st.rows.length ? { change: true } : {}) }, key: Date.now() })} />}

      {/* one editor at a time */}
      {kind === "finish" && <TrainForm key={open.key} accountId={acc} preset={open.preset} onDone={() => setOpen(null)}
        onEditTimes={() => setOpen({ acc, kind: "times" })} onPerCamp={st.idle.some((c) => c.fullMs) ? () => setOpen({ acc, kind: "restart" }) : null} />}
      {kind === "restart" && <RestartAll acc={acc} onDone={() => setOpen(null)} />}
      {kind === "times" && <TrainingSettings accountId={acc} focusEdu={!!open.focusEdu} onClose={() => setOpen(null)} />}

      {/* ONE primary action: start what's ready, otherwise change what's running */}
      {!kind && (
        <div className="th-tc-actions">
          {st.idle.length > 0
            ? <Btn tone="gold" block onClick={() => startTraining(st.idle.map((c) => c.camp))}>{t("trStart")}</Btn>
            : st.rows.length > 0 && <Btn block onClick={() => change(st.rows[0])}>{t("trChange")}</Btn>}
          <button type="button" className="th-tc-settings" onClick={() => setOpen({ acc, kind: "times" })}>
            {t("trSettings")}<span className="th-tf-chev" aria-hidden="true">›</span>
          </button>
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
