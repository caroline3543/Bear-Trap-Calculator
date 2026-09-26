/* Training camps: the widget asks for each camp's full-batch time (normal and Helios),
   one form starts timers for all camps (same time or each camp), and "Finish at" says how long
   to train using the right full-batch time for the troop type. */
import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { success } from "../lib/feedback.js";
import { useMinute, useClockFor } from "../hooks/useNow.jsx";
import { TRAINING_CAMPS, applyTraining, busyCamps, planFinish, finishTogether, sortTimers, campMaxFor, hasHelios } from "../lib/timers.js";
import { timingCheck, nextCycleCheck, finishAdvice, nextFinishTarget, inSleepWindow } from "../lib/sleep.js";
import { ALL } from "../lib/accounts.js";
import { parseCompactTime, zonedParts, zonedTimeToUtc, formatTime, formatDate, formatSpan, formatCountdown, formatCountdownClock, localDayRange, hhmmToMinutes } from "../lib/time.js";
import { Section, Btn, Field, Seg, DurationFields, EMPTY_DUR, durFrom, durParse, FormActions, Icon, Ltr, Bidi, AccountSelect, AccountTag, Remaining } from "../components/ui.jsx";
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
  const [mode, setMode] = useState(preset?.ms ? "left" : "finish"); // finish (default) | left
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

  // --- Finish At (default mode): uses the account's existing maximum training times
  const planCamps = TRAINING_CAMPS.filter((c) => ticked[c]);
  const maxes = planCamps.map((c) => ({ camp: c, max: campMaxFor(data, c, troopOf(c)) }));
  const known = maxes.filter((m) => m.max > 0);
  const limit = known.length ? known.reduce((a, b) => (b.max < a.max ? b : a)) : null; // the camp that runs out first
  const advice = limit ? finishAdvice(now, limit.max, tz, sleep) : null;
  const [raw, setRaw] = useState(() => (advice ? digitsAt(advice.finishAt, tz) : ""));
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
    withConfirm(entries.map((e) => ({ camp: e.camp, troop: e.troop, durationMs: e.r.ms })));
  }

  function startPlanNow() {
    if (!plans.length) return setError(t("errPickCamp"));
    if (!hhmm) return setError(t("errFinishTime"));
    if (plans.some((x) => !x.plan.ok)) return setError(t("errPlanPast"));
    if (tooLong.length) return setError(t("errTooLong"));
    setError(null);
    withConfirm(plans.map(({ camp, troop, plan }) => ({ camp, troop, durationMs: plan.trainFor })));
  }

  function remindLater() {
    const startAt = Math.min(...tooLong.map((x) => x.plan.startAt));
    updateAccount(accountId, (d) => ({ ...d, plans: [...(d.plans || []).filter((x) => x.startAt > Date.now()), { id: newId(), camps: tooLong.map((x) => x.camp), startAt, target }] }));
    onDone();
  }

  if (mode === "left") {
    return (
      <div className="th-form">
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
        <button type="button" className="th-link" onClick={() => setMode("finish")}>{t("useFinishAtInstead")}</button>
      </div>
    );
  }

  return (
    <div className="th-form th-finishform">
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
      <div className="th-item-actions">
        <button type="button" className="th-link" onClick={() => setMode("left")}>{t("useTimeLeftInstead")}</button>
        <button type="button" className="th-link" onClick={onDone}>{t("cancel")}</button>
      </div>
    </div>
  );
}

/* Asked right in the widget (not a settings page) and always editable. Per account:
   a full-batch time for each camp, plus Helios classes with their own times. */
function CampTimes({ accountId }) {
  const { t, lang, dataFor, updateAccount } = useTimeHub();
  const data = dataFor(accountId);
  const anySet = TRAINING_CAMPS.some((c) => data.campMax?.[c]);
  const [open, setOpen] = useState(!anySet);
  const sameNow = (d) => d.campSame ?? (new Set(TRAINING_CAMPS.map((c) => d.campMax?.[c] || 0)).size === 1);
  const load = (d) => ({
    same: sameNow(d),
    all: durFrom(TRAINING_CAMPS.map((c) => d.campMax?.[c]).find((x) => x > 0)),
    normal: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, durFrom(d.campMax?.[c])])),
    heliosOn: (d.helios?.classes || []).length > 0,
    classes: [...(d.helios?.classes || [])],
    helios: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, durFrom(d.helios?.max?.[c])])),
  });
  const [f, setF] = useState(() => load(data));
  const [saved, setSaved] = useState(false);
  React.useEffect(() => { setF(load(dataFor(accountId))); setOpen(!TRAINING_CAMPS.some((c) => dataFor(accountId).campMax?.[c])); setSaved(false); }, [accountId]); // eslint-disable-line react-hooks/exhaustive-deps
  const bad = (v) => (v.days || v.hhmm) && durParse(v).error;
  const val = (v) => { const r = durParse(v); return r.error ? null : r.ms; };
  const invalid = (f.same ? bad(f.all) : TRAINING_CAMPS.some((c) => bad(f.normal[c]))) || TRAINING_CAMPS.some((c) => f.heliosOn && f.classes.includes(c) && bad(f.helios[c]));
  function save() {
    if (invalid) return;
    const classes = f.heliosOn ? TRAINING_CAMPS.filter((c) => f.classes.includes(c)) : [];
    updateAccount(accountId, (d) => ({
      ...d,
      campSame: f.same,
      campMax: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, f.same ? val(f.all) : val(f.normal[c])])),
      helios: { classes, max: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, classes.includes(c) ? val(f.helios[c]) : d.helios?.max?.[c] ?? null])) },
    }));
    setSaved(true);
    setOpen(false);
  }
  const span = (ms) => (ms ? formatSpan(ms, lang) : "—");
  const summary = [
    ...(sameNow(data) ? [`${t("allCamps")} ${span(data.campMax?.infantry_camp)}`] : TRAINING_CAMPS.map((c) => `${t(`short_${c}`)} ${span(data.campMax?.[c])}`)),
    ...(data.helios?.classes || []).map((c) => `${t("heliosCamp", { camp: t(`short_${c}`) })} ${span(data.helios.max?.[c])}`),
  ].join(" · ");

  if (!open) {
    return (
      <div className="th-camptimes closed">
        <div>
          <span className="th-label">{t("fullBatchTimes")}</span>
          <div className="th-camptimes-sum">{summary}</div>
        </div>
        <Btn small onClick={() => { setF(load(data)); setOpen(true); }}>{t("edit")}</Btn>
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
        {anySet && <Btn onClick={() => setOpen(false)}>{t("cancel")}</Btn>}
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
  const list = restartable(dataFor(acc), now);
  const [pick, setPick] = useState({}); // camp → "full" | "short"
  const label = (c) => (c.troop === "helios" ? t("heliosCamp", { camp: t(c.camp) }) : t(c.camp));
  const rows = list.map((c) => ({ ...c, check: c.fullMs ? timingCheck(now, c.fullMs, tz, sleep) : null }));
  const ready = rows.filter((c) => c.fullMs);
  function go() {
    const at = Date.now();
    const entries = ready.map((c) => ({ camp: c.camp, troop: c.troop, durationMs: pick[c.camp] === "short" && c.check?.suggestion ? c.check.suggestion.durationMs : c.fullMs }));
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
      {rows.map((c) => (
        <div key={c.camp} className="th-restart-row">
          <div className="th-restart-head">
            <b>{label(c)}</b>
            {c.fullMs
              ? <span className={c.check.overnight ? "t-warn" : "t-ok"}>{t("fullTraining")} {formatSpan(c.fullMs, lang)} → <Ltr>{formatTime(c.check.fullEnd, tz, lang)}</Ltr> {c.check.overnight ? "🌙" : "✓"}</span>
              : <span className="th-hint">{t("noFullBatch")}</span>}
          </div>
          {c.check?.suggestion && (
            <>
              <span className="th-suggest">{t("suggestedLine", { dur: formatSpan(c.check.suggestion.durationMs, lang), finish: formatTime(c.check.suggestion.finishAt, tz, lang) })}</span>
              <Seg value={pick[c.camp] || "full"} onChange={(v) => setPick({ ...pick, [c.camp]: v })} label={label(c)} options={[
                { value: "full", label: `${t("fullWord")} · ${formatSpan(c.fullMs, lang)}` },
                { value: "short", label: `${t("aboutWord")} ${formatSpan(c.check.suggestion.durationMs, lang)}` },
              ]} />
            </>
          )}
          {c.check?.overnight && !c.check.suggestion && <MoonNote>{t("finishesWhileAsleep", { time: formatTime(c.check.fullEnd, tz, lang) })}</MoonNote>}
        </div>
      ))}
      <p className="th-note">💡 {t("tip247")}</p>
      <div className="th-form-actions">
        <Btn tone="gold" onClick={go} disabled={!ready.length}>{t("restartNCamps", { n: ready.length })}</Btn>
        <Btn onClick={onDone}>{t("cancel")}</Btn>
      </div>
      <p className="th-note">{t("adjustInGame")}</p>
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

function AccountTimers({ acc, timers, plans, setPanel }) {
  const { t, tz, lang, updateAccount, multi, dataFor } = useTimeHub();
  const now = useClockFor([...timers.map((x) => x.endAt), ...plans.map((p) => p.startAt)]);
  const when = useWhenLocal();
  const running = timers.filter((x) => x.endAt > now);
  const groups = finishTogether(running);
  const allTogether = groups.length === 1 && groups[0].timers.length === running.length && running.length > 1 ? groups[0] : null;
  const edit = (x) => () => setPanel({ preset: { accountId: acc, camp: x.category, troop: x.troop, ms: x.endAt - Date.now() } });
  const lab = (x) => (x.troop === "helios" ? t("heliosCamp", { camp: t(x.category) }) : undefined);
  const [restarting, setRestarting] = useState(false);
  const idleCount = restartable(dataFor(acc), now).length;
  return (
    <div className="th-group">

      {idleCount > 0 && !restarting && (
        <Btn tone="gold" block onClick={() => setRestarting(true)}>↻ {t("restartAll", { n: idleCount })}</Btn>
      )}
      {restarting && <RestartAll acc={acc} onDone={() => setRestarting(false)} />}
      <NextCycleNotes acc={acc} timers={timers} />
      {plans.map((p) => (
        <div key={p.id} className="th-plan-row reminder">
          <span>{t("startTrainingAt", { camps: p.camps.map((c) => t(c)).join(", ") })} · <b><Ltr>{when(p.startAt)}</Ltr></b>
            {p.startAt > now && <> · <Remaining to={p.startAt} /></>}</span>
          <Btn small onClick={() => updateAccount(acc, (d) => ({ ...d, plans: d.plans.filter((x) => x.id !== p.id) }))}>{t("dismiss")}</Btn>
        </div>
      ))}
      {allTogether ? (
        <div className="th-together-block">
          <div className="th-trow">
            <div className="th-trow-main">
              <div className="th-trow-name">{t("allCampsTogether")}</div>
              <div className="th-trow-when"><Ltr>{when(allTogether.endAt)}</Ltr> · <Ltr>{formatTime(allTogether.endAt, "UTC", lang)}</Ltr> UTC</div>
            </div>
            <div className="th-trow-count" role="timer"><Remaining to={allTogether.endAt} fmt="clock" /></div>
          </div>
          <div className="th-together-camps">
            {allTogether.timers.map((x) => <TimerRow key={x.id} timer={x} accountId={acc} onEdit={edit(x)} label={lab(x)} slim />)}
          </div>
        </div>
      ) : (
        timers.map((x) => <TimerRow key={x.id} timer={x} accountId={acc} onEdit={edit(x)} label={lab(x)} />)
      )}
      {allTogether && timers.filter((x) => x.endAt <= now).map((x) => <TimerRow key={x.id} timer={x} accountId={acc} onEdit={edit(x)} label={lab(x)} />)}
    </div>
  );
}

export function TrainingWidget({ move }) {
  const { t, accounts, filter, dataFor, defaultAccountId, trainDraft, setTrainDraft, multi } = useTimeHub();
  // 1. Which account am I configuring? — one choice for the whole Training Camps page.
  const [acc, setAcc] = useState(defaultAccountId);
  React.useEffect(() => { if (filter !== ALL) setAcc(filter); }, [filter]);
  const account = accounts.some((a) => a.id === acc) ? acc : defaultAccountId;
  const data = dataFor(account);
  const now = useClockFor(data.timers.filter((x) => x.kind === "training").map((x) => x.endAt));
  const [panel, setPanel] = useState(null); // null | "new" | {preset}
  React.useEffect(() => {
    if (trainDraft) {
      if (trainDraft.accountId) setAcc(trainDraft.accountId);
      setPanel({ preset: trainDraft, key: trainDraft.nonce });
      setTrainDraft(null);
    }
  }, [trainDraft]); // eslint-disable-line react-hooks/exhaustive-deps
  const timers = sortTimers(data.timers.filter((x) => x.kind === "training"), now).sort((a, b) => (a.endAt > now) - (b.endAt > now) || Math.floor(a.endAt / 60000) - Math.floor(b.endAt / 60000) || TRAINING_CAMPS.indexOf(a.category) - TRAINING_CAMPS.indexOf(b.category));
  const plans = (data.plans || []).filter((p) => p.target > now);
  const campsSet = TRAINING_CAMPS.some((c) => data.campMax?.[c]);

  return (
    <Section id="training" icon="training" title={t("secTraining")} count={timers.length} move={move}>
      {multi && (
        <div className="th-train-acc" role="group" aria-label={t("trainingFor")}>
          <span className="th-label">{t("trainingFor")}</span>
          <div className="th-train-acc-row">
            {accounts.map((a) => (
              <button key={a.id} type="button" className={`th-accpill c${a.color}`} aria-pressed={a.id === account} onClick={() => { setAcc(a.id); setPanel(null); }}>
                <i aria-hidden="true" />{a.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {!campsSet && <CampTimes accountId={account} />}
      {!panel && <Btn tone="gold" block onClick={() => setPanel("new")}>{t("setFinishTime")}</Btn>}
      {panel === "new" && <TrainForm key={account} accountId={account} onDone={() => setPanel(null)} />}
      {panel?.preset && <TrainForm key={`${account}-${panel.key || "p"}`} accountId={account} preset={panel.preset} onDone={() => setPanel(null)} />}
      {timers.length === 0 && !panel && <div className="th-empty">{t("emptyTraining")}</div>}
      {(timers.length > 0 || plans.length > 0 || restartable(data, now).some((c) => c.fullMs)) && (
        <AccountTimers key={account} acc={account} timers={timers} plans={plans} setPanel={setPanel} />
      )}
      {campsSet && <CampTimes accountId={account} />}
    </Section>
  );
}
