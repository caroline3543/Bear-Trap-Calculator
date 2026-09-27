import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { success } from "../lib/feedback.js";
import { useClockFor } from "../hooks/useNow.jsx";
import { contribState, spendAttempt, setAttempts, adjustAttempts, reconfigure } from "../lib/contributions.js";
import { formatCountdown, formatCountdownClock, formatTime, formatDate, MINUTE } from "../lib/time.js";
import { Section, Btn, Field, Seg, FormActions, Ltr, Bidi, Remaining, GroupName } from "../components/ui.jsx";

function parseMmSs(s) {
  const m = /^\s*(\d{1,3}):(\d{2})\s*$/.exec(s || "");
  if (!m || Number(m[2]) > 59) return null;
  return (Number(m[1]) * 60 + Number(m[2])) * 1000;
}

function MatchForm({ contrib, accountId, onDone }) {
  const { t, updateAccount: upd } = useTimeHub();
  const updateAccount = (fn) => upd(accountId, fn);
  const now = Date.now(); // form prefill only
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

/** One compact row per account: count, FULL or the next +1, and −/+. Tap for the rest. */
function ContribRow({ accountId, showName, open, onToggle }) {
  const { t, tz, lang, dataFor, updateAccount: upd } = useTimeHub();
  const updateAccount = (fn) => upd(accountId, fn);
  const [panel, setPanel] = useState(null); // null | "match" | "rules"
  const contrib = dataFor(accountId).contrib;
  const peek = contribState(contrib, Date.now());
  const now = useClockFor([peek.nextAt]); // re-render when the next attempt arrives
  const live = contribState(contrib, now);
  const spendAll = () => { success(); updateAccount((acc) => {
    const n = contribState(acc.contrib, Date.now()).count;
    return n > 0 ? { ...acc, contrib: spendAttempt(acc.contrib, Date.now(), n) || acc.contrib } : acc;
  }); };
  const nudge = (d) => updateAccount((acc) => ({ ...acc, contrib: adjustAttempts(acc.contrib, Date.now(), d) }));
  return (
    <div className={`th-contrib-row ${live.full ? "full" : ""} ${open ? "open" : ""}`}>
      <div className="th-contrib-line">
        <button type="button" className="th-contrib-tap" aria-expanded={open} onClick={onToggle}>
          {showName ? <GroupName accountId={accountId} /> : <span className="th-grp-name">{t("attempts")}</span>}
          <span className="th-contrib-num"><Ltr>{live.count} / {live.max}</Ltr></span>
          <span className={`th-contrib-st ${live.full ? "full" : ""}`}>{live.full ? t("fullStatus") : <>+1 · <Remaining to={live.nextAt} fmt="clock" /></>}</span>
        </button>
        <Btn className="icon" onClick={() => nudge(-1)} disabled={live.count < 1} aria-label={t("removeOne")} title={t("removeOne")}>−</Btn>
        <Btn className="icon" onClick={() => nudge(+1)} disabled={live.full} aria-label={t("addOne")} title={t("addOne")}>+</Btn>
      </div>
      {open && (
        <div className="th-contrib-more">
          {!live.full && (
            <div className="th-contrib-stats">
              <div><span>{t("fullIn")}</span><b><Remaining to={live.fullAt} /></b></div>
              <div><span>{t("fullAt")}</span><b><Ltr>{formatTime(live.fullAt, tz, lang)}</Ltr> <span style={{ fontWeight: 600, color: "var(--sub)" }}>{formatDate(live.fullAt, tz, lang)}</span></b></div>
            </div>
          )}
          {live.full && <p className="th-note">{t("contribFullHint")}</p>}
          {panel === "match" && <MatchForm contrib={contrib} accountId={accountId} onDone={() => setPanel(null)} />}
          {panel === "rules" && <RulesForm contrib={contrib} accountId={accountId} onDone={() => setPanel(null)} />}
          {!panel && (
            <div className="th-item-actions">
              <Btn small tone="gold" onClick={spendAll} disabled={live.count < 1}>{live.count < 1 ? t("noAttempts") : t("spendAll", { n: live.count })}</Btn>
              <Btn small onClick={() => setPanel("match")}>{t("matchGame")}</Btn>
              <Btn small onClick={() => setPanel("rules")}>{t("contribSettings")}</Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Folded view: are any trackers full (attempts being wasted)? When is the next +1? */
function ContribSummary() {
  const { t, lang, accountIds, dataFor } = useTimeHub();
  const peeks = accountIds.map((a) => contribState(dataFor(a).contrib, Date.now()));
  const now = useClockFor(peeks.map((p) => p.nextAt));
  const lives = accountIds.map((a) => contribState(dataFor(a).contrib, now));
  const full = lives.filter((l) => l.full).length;
  const notFull = lives.filter((l) => !l.full).sort((a, b) => a.nextAt - b.nextAt);
  if (lives.length === 1) {
    const l = lives[0];
    return l.full ? <span className="attn">{l.count} / {l.max} · {t("fullStatus")}</span> : <span>{l.count} / {l.max} · +1 <b><Remaining to={l.nextAt} fmt="clock" /></b></span>;
  }
  if (full === lives.length) return <span className="attn">{t("allNFull", { n: full })}</span>;
  return (
    <span>
      {full > 0 && <span className="attn">{t("nFull", { n: full })} · </span>}
      {t("nextPlusOneShort")} <b><Remaining to={notFull[0].nextAt} fmt="clock" /></b>
    </span>
  );
}

export function ContributionWidget({ move }) {
  const { t, accountIds, multi } = useTimeHub();
  const [openId, setOpenId] = useState(null);
  return (
    <Section id="contrib" icon="contrib" title={t("secContrib")} count={multi ? accountIds.length : 0} move={move} defaultClosed summary={<ContribSummary />}>
      <div className="th-contrib-list">
        {accountIds.map((id) => <ContribRow key={id} accountId={id} showName={multi} open={openId === id} onToggle={() => setOpenId(openId === id ? null : id)} />)}
      </div>
      <p className="th-note">{t("contribNote")}</p>
    </Section>
  );
}
