import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useNow } from "../hooks/useNow.js";
import { contribState, spendAttempt, setAttempts, adjustAttempts, reconfigure } from "../lib/contributions.js";
import { formatCountdown, formatCountdownClock, formatTime, formatDate, MINUTE } from "../lib/time.js";
import { Section, Btn, Field, Seg, FormActions, Ltr, Bidi, AccountTag } from "../components/ui.jsx";

function parseMmSs(s) {
  const m = /^\s*(\d{1,3}):(\d{2})\s*$/.exec(s || "");
  if (!m || Number(m[2]) > 59) return null;
  return (Number(m[1]) * 60 + Number(m[2])) * 1000;
}

function MatchForm({ contrib, accountId, onDone }) {
  const { t, updateAccount: upd } = useTimeHub();
  const updateAccount = (fn) => upd(accountId, fn);
  const now = useNow();
  const live = contribState(contrib, now);
  const [count, setCount] = useState(String(live.count));
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState({});

  function save() {
    const errs = {};
    const n = Number(count);
    if (count === "" || !Number.isInteger(n) || n < 0 || n > live.max) errs.count = t("errCount", { max: live.max });
    let nextMs;
    if (next.trim()) {
      nextMs = parseMmSs(next);
      if (nextMs == null || nextMs <= 0 || nextMs > contrib.intervalMs) errs.next = t("errNext");
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    updateAccount((acc) => ({ ...acc, contrib: setAttempts(acc.contrib, Date.now(), n, nextMs) }));
    onDone();
  }

  return (
    <div className="th-form">
      <div className="th-row">
        <Field label={t("countLabel")} error={errors.count}>
          <input className={`th-input ${errors.count ? "invalid" : ""}`} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/[^\d]/g, ""))} />
        </Field>
        <Field label={t("nextRefreshIn")} optional error={errors.next}>
          <input className={`th-input ${errors.next ? "invalid" : ""}`} inputMode="numeric" placeholder="07:30" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
      </div>
      <FormActions onSave={save} onCancel={onDone} />
    </div>
  );
}

function RulesForm({ contrib, accountId, onDone }) {
  const { t, updateAccount: upd } = useTimeHub();
  const updateAccount = (fn) => upd(accountId, fn);
  const [max, setMax] = useState(String(contrib.max));
  const [interval, setInterval_] = useState(String(Math.round((contrib.intervalMs / MINUTE) * 100) / 100));
  const [whenFull, setWhenFull] = useState(contrib.whenFull);
  const [errors, setErrors] = useState({});

  function save() {
    const errs = {};
    const m = Number(max);
    const iv = Number(interval);
    if (!Number.isInteger(m) || m < 1 || m > 999) errs.max = t("errMax");
    if (!(iv > 0)) errs.interval = t("errInterval");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    updateAccount((acc) => ({ ...acc, contrib: reconfigure(acc.contrib, Date.now(), { max: m, intervalMs: Math.round(iv * MINUTE), whenFull }) }));
    onDone();
  }

  return (
    <div className="th-form">
      <div className="th-row">
        <Field label={t("maxAttempts")} error={errors.max}>
          <input className="th-input" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d]/g, ""))} />
        </Field>
        <Field label={t("intervalMin")} error={errors.interval}>
          <input className="th-input" inputMode="decimal" value={interval} onChange={(e) => setInterval_(e.target.value)} />
        </Field>
      </div>
      <Field label={t("whenFull")} as="div">
        <Seg value={whenFull} onChange={setWhenFull} label={t("whenFull")} options={[
          { value: "pause", label: t("whenFullPause") }, { value: "continue", label: t("whenFullContinue") },
        ]} />
      </Field>
      <FormActions onSave={save} onCancel={onDone} />
    </div>
  );
}

function ContribBlock({ accountId, several }) {
  const { t, tz, lang, dataFor, updateAccount: upd } = useTimeHub();
  const updateAccount = (fn) => upd(accountId, fn);
  const now = useNow();
  const [panel, setPanel] = useState(null); // null | "match" | "rules"
  const contrib = dataFor(accountId).contrib;
  const live = contribState(contrib, now);

  const spendAll = () => updateAccount((acc) => {
    const n = contribState(acc.contrib, Date.now()).count;
    return n > 0 ? { ...acc, contrib: spendAttempt(acc.contrib, Date.now(), n) || acc.contrib } : acc;
  });
  const nudge = (d) => updateAccount((acc) => ({ ...acc, contrib: adjustAttempts(acc.contrib, Date.now(), d) }));

  return (
    <div className={several ? "th-item" : ""}>
      {several && <div style={{ marginBottom: 8 }}><AccountTag accountId={accountId} /></div>}
      <div className="th-contrib">
        <div>
          <div className="th-contrib-count" aria-live="polite"><Ltr>{live.count} / {live.max}</Ltr></div>
          <div className={`th-contrib-state ${live.full ? "full" : ""}`}>{live.full ? t("fullStatus") : t("attempts")}</div>
        </div>
        <div className="th-contrib-stats">
          {live.full ? (
            <div><span>{t("contribFullHint")}</span></div>
          ) : (
            <>
              <div><span>{t("nextPlusOne")}</span><b><Bidi>{formatCountdownClock(live.nextAt - now, lang)}</Bidi></b></div>
              <div><span>{t("fullIn")}</span><b><Bidi>{formatCountdown(live.fullAt - now, lang)}</Bidi></b></div>
              <div><span>{t("fullAt")}</span><b><Ltr>{formatTime(live.fullAt, tz, lang)}</Ltr> <span style={{ fontWeight: 600, color: "var(--sub)" }}>{formatDate(live.fullAt, tz, lang)}</span></b></div>
            </>
          )}
        </div>
        {live.max <= 40 && !several && (
          <div className="th-pips" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${live.max}, minmax(0, 1fr))` }}>
            {Array.from({ length: live.max }, (_, i) => <i key={i} className={i < live.count ? "on" : ""} />)}
          </div>
        )}
      </div>
      {!live.full && (
        <div className="th-progress" role="progressbar" aria-label={t("nextAttempt")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(live.progress * 100)}>
          <span style={{ width: `${live.progress * 100}%` }} />
        </div>
      )}
      <div className="th-big-actions" style={{ marginTop: 10 }}>
        <Btn tone="gold" onClick={spendAll} disabled={live.count < 1}>{live.count < 1 ? t("noAttempts") : t("spendAll", { n: live.count })}</Btn>
        <Btn className="icon" onClick={() => nudge(-1)} disabled={live.count < 1} aria-label={t("removeOne")} title={t("removeOne")}>−</Btn>
        <Btn className="icon" onClick={() => nudge(+1)} disabled={live.full} aria-label={t("addOne")} title={t("addOne")}>+</Btn>
      </div>
      {panel === "match" && <MatchForm contrib={contrib} accountId={accountId} onDone={() => setPanel(null)} />}
      {panel === "rules" && <RulesForm contrib={contrib} accountId={accountId} onDone={() => setPanel(null)} />}
      {!panel && (
        <div className="th-item-actions">
          <Btn small onClick={() => setPanel("match")}>{t("matchGame")}</Btn>
          <Btn small onClick={() => setPanel("rules")}>{t("contribSettings")}</Btn>
        </div>
      )}
    </div>
  );
}

export function ContributionWidget({ move }) {
  const { t, accountIds } = useTimeHub();
  return (
    <Section id="contrib" icon="contrib" title={t("secContrib")} move={move}>
      {accountIds.map((id) => <ContribBlock key={id} accountId={id} several={accountIds.length > 1} />)}
      <p className="th-note">{t("contribNote")}</p>
    </Section>
  );
}
