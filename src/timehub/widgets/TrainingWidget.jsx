/* Training camps: the widget asks for each camp's full-batch time (normal and Helios),
   one form starts timers for all camps (same time or each camp), and "Finish at" says how long
   to train using the right full-batch time for the troop type. */
import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { success } from "../lib/feedback.js";
import { useMinute, useClockFor } from "../hooks/useNow.jsx";
import { TRAINING_CAMPS, applyTraining, busyCamps, planFinish, finishTogether, sortTimers, campMaxFor, hasHelios, campTroopsFor, troopsForDuration, durationForTroops } from "../lib/timers.js";
import { timingCheck, nextCycleCheck, finishAdvice, nextFinishTarget, inSleepWindow } from "../lib/sleep.js";
import { EducationStrip, useEduPlan } from "./EducationPlan.jsx";
import { eduWindow, finishMissesWindow, insideFinishTarget } from "../lib/education.js";
import { parseCompactTime, zonedParts, zonedTimeToUtc, formatTime, formatDate, formatSpan, formatCountdown, formatCountdownClock, localDayRange, hhmmToMinutes } from "../lib/time.js";
import { Section, Btn, Field, Seg, DurationFields, EMPTY_DUR, durFrom, durParse, FormActions, Icon, Ltr, Bidi, Remaining, GroupName } from "../components/ui.jsx";
import { TimerRow, useWhenLocal } from "./TimerCard.jsx";

/** Local "HH:MM" of an instant, as the digits typed into Finish At (e.g. "2145"). */
function digitsAt(ms, tz) {
  const p = zonedParts(ms, tz);
  return `${String(p.hour).padStart(2, "0")}${String(p.minute).padStart(2, "0")}`;
}

function TrainForm({ onDone, preset, accountId }) {
  const { t, lang, tz, newId, dataFor, updateAccount, state } = useTimeHub();
  const sleep = state.settings.sleep;
  const now = useMinute(); // the planner works in minutes
  const [mode, setMode] = useState(preset?.ms ? "custom" : "finish"); // finish (default) | max | custom
  const [share, setShare] = useState(preset?.camp ? "each" : "same");
  const [shared, setShared] = useState(preset?.camps && preset.ms ? durFrom(preset.ms) : EMPTY_DUR);
  const [each, setEach] = useState(() => Object.fromEntries(TRAINING_CAMPS.map((c) => [c, preset?.camp === c ? durFrom(preset.ms) : EMPTY_DUR])));
  const [ticked, setTicked] = useState(() => Object.fromEntries(TRAINING_CAMPS.map((c) => [c, preset?.camps ? preset.camps.includes(c) : true])));
  const [troops, setTroops] = useState(() => Object.fromEntries(TRAINING_CAMPS.map((c) => [c, (preset?.camp === c && preset.troop === "helios") || preset?.troops?.[c] === "helios" ? "helios" : "normal"])));
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);
  const data = dataFor(accountId);
  const troopOf = (c) => (hasHelios(data, c) ? troops[c] : "normal");
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

  // --- time-left entries (secondary mode)
  const entries = share === "same"
    ? TRAINING_CAMPS.filter((c) => ticked[c]).map((camp) => ({ camp, troop: troopOf(camp), r: durParse(shared) }))
    : TRAINING_CAMPS.filter((c) => each[c].days || each[c].hhmm).map((camp) => ({ camp, troop: troopOf(camp), r: durParse(each[camp]) }));

  // --- Maximum training time (mode "max"): run each selected camp for ITS OWN configured maximum
  const maxEntries = TRAINING_CAMPS.filter((c) => ticked[c]).map((camp) => ({ camp, troop: troopOf(camp), max: campMaxFor(data, camp, troopOf(camp)) }));
  const maxKnown = maxEntries.filter((x) => x.max > 0);

  function startMax() {
    if (!maxKnown.length) return setError(t("errPickCamp"));
    setError(null);
    withConfirm(maxKnown.map(({ camp, troop, max }) => ({ camp, troop, durationMs: max, mode: "max" })));
  }

  // --- Finish At (default mode): uses the account's existing maximum training times
  const planCamps = TRAINING_CAMPS.filter((c) => ticked[c]);
  const maxes = planCamps.map((c) => ({ camp: c, max: campMaxFor(data, c, troopOf(c)) }));
  const known = maxes.filter((m) => m.max > 0);
  const limit = known.length ? known.reduce((a, b) => (b.max < a.max ? b : a)) : null; // the camp that runs out first
  const advice = limit ? finishAdvice(now, limit.max, tz, sleep) : null;
  const [raw, setRaw] = useState(() => (advice ? digitsAt(advice.finishAt, tz) : ""));
  const { booking: eduB } = useEduPlan(accountId);
  const hhmm = parseCompactTime(raw);
  const target = hhmm ? nextFinishTarget(now, hhmm, tz) : NaN;
  const plans = planCamps.map((camp) => ({ camp, troop: troopOf(camp), plan: planFinish(target, now, campMaxFor(data, camp, troopOf(camp))) }));
  const tooLong = plans.filter((x) => x.plan.ok && !x.plan.fitsMax);
  const latest = limit ? now + limit.max : null;
  const isAdvice = advice && Number.isFinite(target) && Math.abs(target - advice.finishAt) < 60000;
  const dayWord = Number.isFinite(target) ? (localDayRange(now, tz, 0).end > target ? t("today") : t("tomorrow")) : "";

  function commit(list, extraPlan) {
    const at = Date.now();
    updateAccount(accountId, (d) => ({
      ...d,
      timers: applyTraining(d.timers, list, at, newId),
      plans: extraPlan ? [...(d.plans || []).filter((x) => x.startAt > at), extraPlan] : d.plans,
    }));
    success();
    onDone();
  }

  function withConfirm(list, extraPlan) {
    const busy = busyCamps(data.timers, list.map((e) => e.camp), now);
    if (busy.length && !confirm) { setConfirm({ busy, list, extraPlan }); return; }
    commit(list, extraPlan);
  }

  function saveLeft() {
    if (!entries.length) return setError(t("errPickCamp"));
    if (entries.some((e) => e.r.error)) return setError(t("errDigitsFix"));
    setError(null);
    withConfirm(entries.map((e) => ({ camp: e.camp, troop: e.troop, durationMs: e.r.ms, mode: "custom" })));
  }

  function startPlanNow() {
    if (!plans.length) return setError(t("errPickCamp"));
    if (!hhmm) return setError(t("errFinishTime"));
    if (plans.some((x) => !x.plan.ok)) return setError(t("errPlanPast"));
    if (tooLong.length) return setError(t("errTooLong"));
    setError(null);
    withConfirm(plans.map(({ camp, troop, plan }) => ({ camp, troop, durationMs: plan.trainFor, mode: "finish" })));
  }

  function remindLater() {
    const startAt = Math.min(...tooLong.map((x) => x.plan.startAt));
    updateAccount(accountId, (d) => ({ ...d, plans: [...(d.plans || []).filter((x) => x.startAt > Date.now()), { id: newId(), camps: tooLong.map((x) => x.camp), startAt, target }] }));
    onDone();
  }

  const modeBar = (
    <>
      <Seg value={mode} onChange={setMode} label={t("trainingMode")} options={[
        { value: "finish", label: t("modeFinish") },
        { value: "max", label: t("modeMax") },
        { value: "custom", label: t("modeCustom") },
      ]} />
      <p className="th-hint th-mode-note">{t("troopGuidance")}</p>
    </>
  );

  if (mode === "max") {
    return (
      <div className="th-form">
        {modeBar}
        <p className="th-sec-sub">{t("maxModeHelp")}</p>
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
        {error && <span className="th-error" role="alert">{error}</span>}
        {confirm && <div className="th-warn" role="alert">{t("replaceCamps", { camps: confirm.busy.map((c) => t(c)).join(", ") })}</div>}
        <Btn tone="gold" block onClick={() => (confirm ? commit(confirm.list, confirm.extraPlan) : startMax())} disabled={!maxKnown.length}>
          {confirm ? t("replace") : t("startMaxTraining")}
        </Btn>
        <p className="th-note">{t("restartAllNote")}</p>
        <button type="button" className="th-link" onClick={onDone}>{t("cancel")}</button>
      </div>
    );
  }
  if (mode === "custom") {
    return (
      <div className="th-form">
        {modeBar}
        <Field label={t("camps")} as="div">
          <Seg value={share} onChange={switchShare} label={t("camps")} options={[{ value: "same", label: t("sameForAll") }, { value: "each", label: t("setEachCamp") }]} />
        </Field>
        {share === "same" && (<><DurationFields value={shared} onChange={setShared} label={t("timeLeftAll")} />{campChecks}</>)}
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
        {confirm && <div className="th-warn" role="alert">{t("replaceCamps", { camps: confirm.busy.map((c) => t(c)).join(", ") })}</div>}
        <FormActions onSave={() => (confirm ? commit(confirm.list, confirm.extraPlan) : saveLeft())} onCancel={onDone} saveLabel={confirm ? t("replace") : t("startTimers")} />
      </div>
    );
  }

  return (
    <div className="th-form th-finishform">
      {modeBar}
      {/* 2. What time will my camps finish? */}
      <label className="th-finish">
        <span className="th-finish-q">{t("finishAtQ")}</span>
        <input className="th-finish-input" inputMode="numeric" autoComplete="off" placeholder="2200" maxLength={5}
          aria-describedby="th-finish-read" value={raw} onChange={(e) => { setRaw(e.target.value.replace(/[^\d:.]/g, "")); setError(null); setConfirm(null); }} />
        <span id="th-finish-read" className="th-finish-read">
          {hhmm ? <><b><Ltr>{formatTime(target, tz, lang)}</Ltr></b> {dayWord} · <Ltr>{formatTime(target, "UTC", lang)}</Ltr> UTC</> : raw ? t("finishInvalid") : t("finishHint")}
        </span>
      </label>

      {/* 3. Suggested finish (only when it differs from what's typed) */}
      {/* Education booked: a finish time that lands after the window would miss the buff */}
      {eduB && Number.isFinite(target) && finishMissesWindow(target, eduWindow(eduB, state.settings.eduBufferMin * 60000), now) && (() => {
        const w = eduWindow(eduB, state.settings.eduBufferMin * 60000);
        const fix = insideFinishTarget(w);
        return (
          <div className="th-limit" role="alert">
            <span>{t("eduConflict", { start: formatTime(w.start, tz, lang), end: formatTime(w.end, tz, lang), finish: formatTime(target, tz, lang) })}</span>
            {fix > now && <span className="th-item-actions"><Btn small tone="gold" onClick={() => setRaw(digitsAt(fix, tz))}>{t("eduFinishInside", { time: formatTime(fix, tz, lang) })}</Btn></span>}
          </div>
        );
      })()}
      {advice && !isAdvice && (
        <button type="button" className="th-suggest-btn" onClick={() => setRaw(digitsAt(advice.finishAt, tz))}>
          {t(advice.kind === "bed" ? "suggestBed" : "suggestFull", { time: formatTime(advice.finishAt, tz, lang) })}
        </button>
      )}

      {/* 4. What will happen */}
      {hhmm && plans.length > 0 && !tooLong.length && plans.every((x) => x.plan.ok) && (
        <p className="th-outcome">
          {t("outcomeTrainFor", { dur: formatSpan(plans[0].plan.trainFor, lang), time: formatTime(target, tz, lang) })}
          {isAdvice && advice.kind === "bed" && <> {t("outcomeOvernight", { end: formatTime(advice.overnightEnd, tz, lang) })}</>}
          {!isAdvice && inSleepWindow(target, tz, sleep) && advice && <> {t("outcomeAsleep")}</>}
        </p>
      )}
      {hhmm && !tooLong.length && plans.every((x) => x.plan.ok) && plans.some((x) => campTroopsFor(data, x.camp)) && (
        <p className="th-troops-line">
          {t("troopsToTrain")}: {plans.filter((x) => campTroopsFor(data, x.camp)).map((x) => `${t(`short_${x.camp}`)} ${troopsForDuration(x.plan.trainFor, campMaxFor(data, x.camp, x.troop), campTroopsFor(data, x.camp)).toLocaleString(lang)}`).join(" · ")}
        </p>
      )}

      {/* 5. Limitation: never plan past the account's maximum */}
      {tooLong.length > 0 && latest && (
        <div className="th-limit" role="alert">
          <span>{t("limitMax", { camp: t(limit.camp), max: formatSpan(limit.max, lang), time: formatTime(target, tz, lang), latest: formatTime(latest, tz, lang) })}</span>
          <span className="th-item-actions">
            <Btn small tone="gold" onClick={() => setRaw(digitsAt(latest, tz))}>{t("useTime", { time: formatTime(latest, tz, lang) })}</Btn>
            <Btn small onClick={remindLater}>{t("remindStartAt", { time: formatTime(Math.min(...tooLong.map((x) => x.plan.startAt)), tz, lang) })}</Btn>
          </span>
        </div>
      )}
      {!known.length && <p className="th-note">{t("noMaxNote")}</p>}
      {error && <span className="th-error" role="alert">{error}</span>}
      {confirm && <div className="th-warn" role="alert">{t("replaceCamps", { camps: confirm.busy.map((c) => t(c)).join(", ") })}</div>}

      {/* primary action */}
      <Btn tone="gold" block onClick={() => (confirm ? commit(confirm.list, confirm.extraPlan) : startPlanNow())} disabled={!hhmm || !!tooLong.length}>
        {confirm ? t("replace") : hhmm ? t("startFinishing", { time: formatTime(target, tz, lang) }) : t("startNow")}
      </Btn>

      {/* 6. Secondary */}
      <details className="th-secondary">
        <summary>{t("whichCamps")}</summary>
        {campChecks}
      </details>
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
    const troop = last?.troop === "helios" ? "helios" : "normal";
    const fullMs = last?.durationMs > 0 ? last.durationMs : campMaxFor(data, camp, troop);
    return { camp, troop, fullMs: fullMs > 0 ? fullMs : null };
  }).filter(Boolean);
}

function MoonNote({ children }) {
  return <div className="th-moon"><span aria-hidden="true">🌙</span><div>{children}</div></div>;
}

function RestartAll({ acc, onDone }) {
  const { t, tz, lang, dataFor, updateAccount, newId, state } = useTimeHub();
  const sleep = state.settings.sleep;
  const now = useMinute();
  const data = dataFor(acc);
  const list = restartable(data, now);
  const label = (c) => (c.troop === "helios" ? t("heliosCamp", { camp: t(c.camp) }) : t(c.camp));
  const rows = list.map((c) => ({ ...c, batch: campTroopsFor(data, c.camp), check: c.fullMs ? timingCheck(now, c.fullMs, tz, sleep) : null }));
  const ready = rows.filter((c) => c.fullMs);
  const troopsKnown = ready.some((c) => c.batch);
  const [unit, setUnit] = useState(troopsKnown ? "troops" : "time"); // how the player enters it: time | troops
  // what the player typed per camp (defaults: the full batch)
  const [dur, setDur] = useState(() => Object.fromEntries(ready.map((c) => [c.camp, durFrom(c.fullMs)])));
  const [troops, setTroops] = useState(() => Object.fromEntries(ready.map((c) => [c.camp, c.batch ? String(c.batch) : ""])));
  const msFor = (c) => {
    if (unit === "troops" && c.batch) {
      const n = Number(String(troops[c.camp] || "").replace(/\D/g, ""));
      return n > 0 && n <= c.batch ? durationForTroops(n, c.fullMs, c.batch) : n > c.batch ? { over: true } : null;
    }
    const r = durParse(dur[c.camp] || EMPTY_DUR);
    return r.error || !r.ms ? null : r.ms > c.fullMs ? { over: true } : r.ms;
  };
  const values = ready.map((c) => ({ c, ms: msFor(c) }));
  const valid = values.filter((v) => typeof v.ms === "number" && v.ms > 0);
  const useSuggestion = (c) => {
    const ms = c.check.suggestion.durationMs;
    setDur({ ...dur, [c.camp]: durFrom(ms) });
    if (c.batch) setTroops({ ...troops, [c.camp]: String(troopsForDuration(ms, c.fullMs, c.batch)) });
  };
  function go() {
    const at = Date.now();
    const entries = valid.map(({ c, ms }) => ({ camp: c.camp, troop: c.troop, durationMs: ms, mode: ms >= c.fullMs ? "max" : "custom" }));
    updateAccount(acc, (d) => ({ ...d, timers: applyTraining(d.timers, entries, at, newId) }));
    success();
    onDone();
  }
  return (
    <div className="th-form th-restart">
      <b className="th-restart-title">{t("restartAllTitle")}</b>
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
        return (
          <div key={c.camp} className="th-restart-row">
            <div className="th-restart-head">
              <b>{label(c)}</b>
              {c.fullMs
                ? <span className={c.check.overnight ? "t-warn" : "t-ok"}>{t("fullTraining")} {formatSpan(c.fullMs, lang)}{c.batch ? ` · ${c.batch.toLocaleString(lang)}` : ""} → <Ltr>{formatTime(c.check.fullEnd, tz, lang)}</Ltr> {c.check.overnight ? "🌙" : "✓"}</span>
                : <span className="th-hint">{t("noFullBatch")}</span>}
            </div>
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
                    ? t(useTroops ? "overBatchTroops" : "overBatchTime", { max: useTroops ? c.batch.toLocaleString(lang) : formatSpan(c.fullMs, lang) })
                    : ms ? <>{useTroops ? `= ${formatSpan(ms, lang)} → ` : "→ "}<b><Ltr>{formatTime(now + ms, tz, lang)}</Ltr></b>{!useTroops && c.batch ? ` · ≈ ${troopsForDuration(ms, c.fullMs, c.batch).toLocaleString(lang)} ${t("troopsWord")}` : ""}</> : ""}
                </span>
                {sug && (
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
    notes.push(
      <MoonNote key={key}>
        {t("currentEndsAt", { camps: names, time: formatTime(x.endAt, tz, lang) })}{" "}
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
  const [details, setDetails] = useState(false);
  const lab = (x) => (x.troop === "helios" ? t("heliosCamp", { camp: t(x.category) }) : t(x.category));
  const shortLab = (x) => (x.troop === "helios" ? t("heliosCamp", { camp: t(`short_${x.category}`) }) : t(`short_${x.category}`));
  const edit = (x) => () => setOpen({ acc, kind: "finish", preset: { accountId: acc, camp: x.category, troop: x.troop, ms: x.endAt - Date.now() }, key: Date.now() });
  const kind = open?.kind;
  const hero = st.together || st.next;
  const others = st.together ? [] : st.running.slice(1);

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
          {st.together && st.together.timers.length === TRAINING_CAMPS.length && <div className="th-hero-sub">{st.together.timers.map(shortLab).join(" · ")}</div>}
          {others.length > 0 && <div className="th-hero-sub">{others.map((x) => `${shortLab(x)} ${formatTime(x.endAt, tz, lang)}`).join(" · ")}</div>}
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

      {/* per-camp details (each with its ⋯ menu) */}
      {details && (
        <div className="th-camp-details">
          {st.timers.map((x) => <TimerRow key={x.id} timer={x} accountId={acc} onEdit={edit(x)} label={x.troop === "helios" ? lab(x) : undefined} />)}
        </div>
      )}

      {/* tertiary: editing */}
      {kind === "finish" && <TrainForm key={open.key} accountId={acc} preset={open.preset} onDone={() => setOpen(null)} />}
      {kind === "restart" && <RestartAll acc={acc} onDone={() => setOpen(null)} />}
      {kind === "times" && <CampTimes accountId={acc} focusEdu={!!open.focusEdu} onClose={() => setOpen(null)} />}
      {!kind && (
        <div className="th-group-actions">
          <Btn small onClick={() => setOpen({ acc, kind: "finish", key: Date.now() })}>{t("setFinishTime")}</Btn>
          {st.idle.some((c) => c.fullMs) && <Btn small onClick={() => setOpen({ acc, kind: "restart" })}>↻ {t("restartAll", { n: st.idle.filter((c) => c.fullMs).length })}</Btn>}
          {st.timers.length > 0 && <button type="button" className="th-link" aria-expanded={details} onClick={() => setDetails(!details)}>{details ? t("hideCamps") : t("campDetails")}</button>}
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
    setOpen({ acc: trainDraft.accountId, kind: trainDraft.edu ? "edu" : "finish", preset: trainDraft, key: trainDraft.nonce });
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
