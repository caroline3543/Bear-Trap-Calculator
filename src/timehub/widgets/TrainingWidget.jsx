/* Training camps: the widget asks for each camp's full-batch time (normal and Helios),
   one form starts timers for all camps (same time or each camp), and "Finish at" says how long
   to train using the right full-batch time for the troop type. */
import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useNow } from "../hooks/useNow.js";
import { TRAINING_CAMPS, applyTraining, busyCamps, planFinish, finishTogether, sortTimers, campMaxFor, hasHelios } from "../lib/timers.js";
import { zonedParts, zonedTimeToUtc, formatTime, formatDate, formatSpan, formatCountdown, formatCountdownClock, localDayRange, hhmmToMinutes } from "../lib/time.js";
import { Section, Btn, Field, Seg, DurationFields, EMPTY_DUR, durFrom, durParse, FormActions, Icon, Ltr, Bidi, AccountSelect, AccountTag } from "../components/ui.jsx";
import { TimerRow, useWhenLocal } from "./TimerCard.jsx";

function TrainForm({ onDone, preset }) {
  const { t, lang, tz, newId, dataFor, defaultAccountId, updateAccount } = useTimeHub();
  const now = useNow();
  const [accountId, setAccountId] = useState(preset?.accountId || defaultAccountId);
  const [mode, setMode] = useState("left"); // left | finish
  const [share, setShare] = useState(preset?.camp ? "each" : "same");
  const [shared, setShared] = useState(preset?.camps && preset.ms ? durFrom(preset.ms) : EMPTY_DUR);
  const [each, setEach] = useState(() => Object.fromEntries(TRAINING_CAMPS.map((c) => [c, preset?.camp === c ? durFrom(preset.ms) : EMPTY_DUR])));
  const [ticked, setTicked] = useState(() => Object.fromEntries(TRAINING_CAMPS.map((c) => [c, preset?.camps ? preset.camps.includes(c) : true])));
  const [troops, setTroops] = useState(() => Object.fromEntries(TRAINING_CAMPS.map((c) => [c, (preset?.camp === c && preset.troop === "helios") || preset?.troops?.[c] === "helios" ? "helios" : "normal"])));
  const [targetDay, setTargetDay] = useState(0);
  const [targetTime, setTargetTime] = useState("22:00");
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

  const switchShare = (v) => {
    if (v === "each" && (shared.days || shared.hhmm)) setEach((e) => Object.fromEntries(TRAINING_CAMPS.map((c) => [c, e[c].days || e[c].hhmm ? e[c] : shared])));
    setShare(v);
  };

  // --- time-left entries
  const entries = share === "same"
    ? TRAINING_CAMPS.filter((c) => ticked[c]).map((camp) => ({ camp, troop: troopOf(camp), r: durParse(shared) }))
    : TRAINING_CAMPS.filter((c) => each[c].days || each[c].hhmm).map((camp) => ({ camp, troop: troopOf(camp), r: durParse(each[camp]) }));

  // --- finish-at planner
  const day = localDayRange(now, tz, targetDay);
  const p = zonedParts(day.start + 1, tz);
  const tMin = hhmmToMinutes(targetTime);
  const target = tMin == null ? NaN : zonedTimeToUtc(p.year, p.month, p.day, Math.floor(tMin / 60), tMin % 60, tz);
  const planCamps = TRAINING_CAMPS.filter((c) => ticked[c]);
  const plans = planCamps.map((camp) => ({ camp, troop: troopOf(camp), plan: planFinish(target, now, campMaxFor(data, camp, troopOf(camp))) }));
  const anyMissingMax = planCamps.some((c) => !campMaxFor(data, c, troopOf(c)));

  function commit(list, extraPlan) {
    const at = Date.now();
    updateAccount(accountId, (d) => ({
      ...d,
      timers: applyTraining(d.timers, list, at, newId),
      plans: extraPlan ? [...(d.plans || []).filter((x) => x.startAt > at), extraPlan] : d.plans,
    }));
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
    if (plans.some((x) => !x.plan.ok)) return setError(t("errPlanPast"));
    setError(null);
    withConfirm(plans.map(({ camp, troop, plan }) => ({ camp, troop, durationMs: plan.trainFor })));
  }

  function remindLater() {
    const late = plans.filter((x) => x.plan.ok && !x.plan.fitsMax);
    const startAt = Math.min(...late.map((x) => x.plan.startAt));
    updateAccount(accountId, (d) => ({ ...d, plans: [...(d.plans || []).filter((x) => x.startAt > Date.now()), { id: newId(), camps: late.map((x) => x.camp), startAt, target }] }));
    onDone();
  }

  return (
    <div className="th-form">
      <AccountSelect value={accountId} onChange={setAccountId} />
      <Seg value={mode} onChange={setMode} label={t("enterBy")} options={[{ value: "left", label: t("timeLeft") }, { value: "finish", label: t("finishAt") }]} />
      {mode === "left" && (
        <Field label={t("camps")} as="div">
          <Seg value={share} onChange={switchShare} label={t("camps")} options={[{ value: "same", label: t("sameForAll") }, { value: "each", label: t("setEachCamp") }]} />
        </Field>
      )}

      {mode === "left" && share === "same" && (
        <>
          <DurationFields value={shared} onChange={setShared} label={t("timeLeftAll")} />
          <div className="th-checks">
            {TRAINING_CAMPS.map((c) => (
              <div key={c} className="th-camp-pick">
                <label className="th-check"><input type="checkbox" checked={ticked[c]} onChange={(e) => setTicked({ ...ticked, [c]: e.target.checked })} />{t(c)}</label>
                {ticked[c] && troopToggle(c)}
              </div>
            ))}
          </div>
        </>
      )}
      {mode === "left" && share === "each" && (
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

      {mode === "finish" && (
        <>
          <Field label={t("finishDay")} as="div">
            <Seg value={targetDay} onChange={setTargetDay} label={t("finishDay")} options={[{ value: 0, label: t("today") }, { value: 1, label: t("tomorrow") }]} />
          </Field>
          <Field label={`${t("finishTime")} (${t("local")})`}>
            <input className="th-input" type="time" step="300" value={targetTime} onChange={(e) => setTargetTime(e.target.value)} />
          </Field>
          {Number.isFinite(target) && <span className="th-hint">= {t("utc")} <Ltr>{formatTime(target, "UTC", lang)}</Ltr> · {formatDate(target, "UTC", lang)}</span>}
          <div className="th-checks">
            {TRAINING_CAMPS.map((c) => (
              <div key={c} className="th-camp-pick">
                <label className="th-check"><input type="checkbox" checked={ticked[c]} onChange={(e) => setTicked({ ...ticked, [c]: e.target.checked })} />{t(c)}</label>
                {ticked[c] && troopToggle(c)}
              </div>
            ))}
          </div>
          <div className="th-plan">
            {plans.map(({ camp, plan }) => (
              <div key={camp} className={`th-plan-row ${plan.ok && !plan.fitsMax ? "warn" : ""}`}>
                <b>{troopOf(camp) === "helios" ? t("heliosCamp", { camp: t(camp) }) : t(camp)}</b>
                {!plan.ok ? <span className="th-error">{t(plan.error)}</span>
                  : plan.fitsMax ? <span>{t("trainFor")} <Bidi>{formatSpan(plan.trainFor, lang)}</Bidi></span>
                  : <span>{t("maxIs", { max: formatSpan(plan.trainFor, lang) })} {t("startFullBatchAt", { time: formatTime(plan.startAt, tz, lang) })}</span>}
              </div>
            ))}
          </div>
          {anyMissingMax && <p className="th-note">{t("noMaxNote")}</p>}
        </>
      )}

      {error && <span className="th-error" role="alert">{error}</span>}
      {confirm && <div className="th-warn" role="alert">{t("replaceCamps", { camps: confirm.busy.map((c) => t(c)).join(", ") })}</div>}

      {mode === "left" ? (
        <FormActions onSave={() => (confirm ? commit(confirm.list, confirm.extraPlan) : saveLeft())} onCancel={onDone} saveLabel={confirm ? t("replace") : t("startTimers")} />
      ) : (
        <div className="th-form-actions">
          <Btn tone="gold" onClick={() => (confirm ? commit(confirm.list, confirm.extraPlan) : startPlanNow())}>{confirm ? t("replace") : t("startNow")}</Btn>
          {plans.some((x) => x.plan.ok && !x.plan.fitsMax) && !confirm && <Btn onClick={remindLater}>{t("remindMeLater")}</Btn>}
          <Btn onClick={onDone}>{t("cancel")}</Btn>
        </div>
      )}
    </div>
  );
}

/* Asked right in the widget (not a settings page) and always editable. Per account:
   a full-batch time for each camp, plus Helios classes with their own times. */
function CampTimes() {
  const { t, lang, dataFor, defaultAccountId, updateAccount, multi } = useTimeHub();
  const [accountId, setAccountId] = useState(defaultAccountId);
  const data = dataFor(accountId);
  const anySet = TRAINING_CAMPS.some((c) => data.campMax?.[c]);
  const [open, setOpen] = useState(!anySet);
  const load = (d) => ({
    normal: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, durFrom(d.campMax?.[c])])),
    heliosOn: (d.helios?.classes || []).length > 0,
    classes: [...(d.helios?.classes || [])],
    helios: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, durFrom(d.helios?.max?.[c])])),
  });
  const [f, setF] = useState(() => load(data));
  const [saved, setSaved] = useState(false);
  const pick = (id) => { setAccountId(id); setF(load(dataFor(id))); setSaved(false); };
  const bad = (v) => (v.days || v.hhmm) && durParse(v).error;
  const val = (v) => { const r = durParse(v); return r.error ? null : r.ms; };
  const invalid = TRAINING_CAMPS.some((c) => bad(f.normal[c]) || (f.heliosOn && f.classes.includes(c) && bad(f.helios[c])));
  function save() {
    if (invalid) return;
    const classes = f.heliosOn ? TRAINING_CAMPS.filter((c) => f.classes.includes(c)) : [];
    updateAccount(accountId, (d) => ({
      ...d,
      campMax: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, val(f.normal[c])])),
      helios: { classes, max: Object.fromEntries(TRAINING_CAMPS.map((c) => [c, classes.includes(c) ? val(f.helios[c]) : d.helios?.max?.[c] ?? null])) },
    }));
    setSaved(true);
    setOpen(false);
  }
  const span = (ms) => (ms ? formatSpan(ms, lang) : "—");
  const summary = [
    ...TRAINING_CAMPS.map((c) => `${t(`short_${c}`)} ${span(data.campMax?.[c])}`),
    ...(data.helios?.classes || []).map((c) => `${t("heliosCamp", { camp: t(`short_${c}`) })} ${span(data.helios.max?.[c])}`),
  ].join(" · ");

  if (!open) {
    return (
      <div className="th-camptimes closed">
        <div>
          <span className="th-label">{t("fullBatchTimes")}</span>{multi && <> <AccountTag accountId={accountId} /></>}
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
      <AccountSelect value={accountId} onChange={pick} />
      {TRAINING_CAMPS.map((c) => (
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

function AccountTimers({ acc, timers, plans, setPanel }) {
  const { t, tz, lang, updateAccount, multi } = useTimeHub();
  const now = useNow();
  const when = useWhenLocal();
  const running = timers.filter((x) => x.endAt > now);
  const groups = finishTogether(running);
  const allTogether = groups.length === 1 && groups[0].timers.length === running.length && running.length > 1 ? groups[0] : null;
  const edit = (x) => () => setPanel({ preset: { accountId: acc, camp: x.category, troop: x.troop, ms: x.endAt - now } });
  const lab = (x) => (x.troop === "helios" ? t("heliosCamp", { camp: t(x.category) }) : undefined);
  return (
    <div className="th-group">
      {multi && <div className="th-group-head"><AccountTag accountId={acc} /></div>}
      {plans.map((p) => (
        <div key={p.id} className="th-plan-row reminder">
          <span>{t("startTrainingAt", { camps: p.camps.map((c) => t(c)).join(", ") })} · <b><Ltr>{when(p.startAt)}</Ltr></b>
            {p.startAt > now && <> · <Bidi>{formatCountdown(p.startAt - now, lang)}</Bidi></>}</span>
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
            <div className="th-trow-count" role="timer"><Bidi>{formatCountdownClock(allTogether.endAt - now, lang)}</Bidi></div>
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
  const { t, tz, lang, accountIds, dataFor, updateAccount, trainDraft, setTrainDraft } = useTimeHub();
  const now = useNow();
  const [panel, setPanel] = useState(null); // null | "new" | {preset}
  React.useEffect(() => { if (trainDraft) { setPanel({ preset: trainDraft, key: trainDraft.nonce }); setTrainDraft(null); } }, [trainDraft]);
  const byAccount = accountIds.map((acc) => ({ acc, timers: sortTimers(dataFor(acc).timers.filter((x) => x.kind === "training"), now).sort((a, b) => (a.endAt > now) - (b.endAt > now) || Math.floor(a.endAt / 60000) - Math.floor(b.endAt / 60000) || TRAINING_CAMPS.indexOf(a.category) - TRAINING_CAMPS.indexOf(b.category)), plans: (dataFor(acc).plans || []).filter((p) => p.target > now) }));
  const count = byAccount.reduce((n, a) => n + a.timers.length, 0);

  return (
    <Section id="training" icon="training" title={t("secTraining")} count={count} move={move}
      action={!panel && (
        <span className="th-head-actions">
          <Btn tone="gold" small icon={<Icon.plus />} onClick={() => setPanel("new")}>{t("add")}</Btn>
        </span>
      )}>
      <CampTimes />
      {panel === "new" && <TrainForm onDone={() => setPanel(null)} />}
      {panel?.preset && <TrainForm key={panel.key || "p"} preset={panel.preset} onDone={() => setPanel(null)} />}
      {count === 0 && !panel && <div className="th-empty">{t("emptyTraining")}</div>}
      {byAccount.filter((a) => a.timers.length || a.plans.length).map(({ acc, timers, plans }) => (
        <AccountTimers key={acc} acc={acc} timers={timers} plans={plans} setPanel={setPanel} />
      ))}

    </Section>
  );
}
