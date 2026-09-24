/* Chief stamina (per account) and the free daily drops: Storehouse stamina and
   Tundra Trek supplies. Numbers live in lib/daily.js. */
import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useNow } from "../hooks/useNow.js";
import { staminaNow, dropsBetween, dropStatus, pruneClaims, isCurrentDrop, STAMINA_CAP } from "../lib/daily.js";
import { formatTime, formatSpan, HOUR, MINUTE } from "../lib/time.js";
import { Section, Btn, Ltr, AccountTag } from "../components/ui.jsx";
import { useWhenLocal } from "./TimerCard.jsx";

/** Mark a drop claimed for every account currently shown. */
export function useClaim() {
  const { accountIds, updateAccount } = useTimeHub();
  return (drop) => {
    const at = Date.now();
    for (const a of accountIds) updateAccount(a, (d) => ({ ...d, claims: { ...pruneClaims(d.claims, at), [drop.key]: at } }));
  };
}

function StaminaRow({ accountId }) {
  const { t, lang, dataFor, updateAccount } = useTimeHub();
  const now = useNow();
  const when = useWhenLocal();
  const [editing, setEditing] = useState(false);
  const cur = staminaNow(dataFor(accountId).stamina, now);
  const [val, setVal] = useState(cur ? String(cur.value) : "");
  const save = () => {
    const n = Number(val);
    if (!Number.isInteger(n) || n < 0 || n > 9999) return;
    updateAccount(accountId, (d) => ({ ...d, stamina: { value: n, at: Date.now() } }));
    setEditing(false);
  };
  let line = t("staminaUnset");
  let tone = "sub";
  if (cur) {
    if (cur.over) { line = t("staminaOver"); tone = "warn"; }
    else if (cur.atCap) { line = t("staminaAtCap"); tone = "warn"; }
    else if (cur.fullAt - now <= HOUR) { line = t("staminaSoon", { time: formatSpan(cur.fullAt - now, lang) }); tone = "amber"; }
    else line = t("staminaReaches", { time: when(cur.fullAt), in: formatSpan(cur.fullAt - now, lang) });
  }
  const pct = cur ? Math.min(100, (cur.value / STAMINA_CAP) * 100) : 0;
  return (
    <div className="th-stam">
      <div className="th-stam-top">
        <AccountTag accountId={accountId} />
        <b className="th-stam-val">{cur ? cur.value : "—"} <small>/ {STAMINA_CAP}</small></b>
      </div>
      <div className="th-bar"><span className={`t-${tone}`} style={{ width: `${pct}%` }} /></div>
      <div className="th-stam-foot">
        <span className={`th-tone t-${tone}`}>{line}</span>
        <button type="button" className="th-link" onClick={() => { setVal(cur ? String(cur.value) : ""); setEditing(!editing); }}>{t("update")}</button>
      </div>
      {editing && (
        <div className="th-inline">
          <input className="th-input" inputMode="numeric" aria-label={t("staminaNowLabel")} placeholder="164" value={val} onChange={(e) => setVal(e.target.value.replace(/\D/g, ""))} />
          <Btn small tone="gold" onClick={save}>{t("save")}</Btn>
        </div>
      )}
    </div>
  );
}

function DropTile({ d, claim }) {
  const { t, tz, lang, accountIds, dataFor } = useTimeHub();
  const now = useNow();
  const statuses = accountIds.map((a) => { const x = dropStatus(d, dataFor(a).claims, now); return x === "ready" && !isCurrentDrop(d, now) ? "missed" : x; });
  const ready = statuses.includes("ready");
  const done = !ready && statuses.every((s) => s === "claimed" || s === "auto" || s === "missed");
  return (
    <div className={`th-drop ${ready ? "ready" : done ? "done" : ""}`}>
      <div className="th-drop-time"><b><Ltr>{formatTime(d.at, tz, lang)}</Ltr></b><small><Ltr>{formatTime(d.at, "UTC", lang)}</Ltr> UTC</small></div>
      <div className="th-drop-main">
        <b>+{d.amount} {d.kind === "store" ? t("staminaWord") : t("suppliesWord")}</b>
        <span className="th-tone">
          {d.manual ? t("claimByHand") : t("automatic")} ·{" "}
          {now < d.at ? t("inTime", { time: formatSpan(d.at - now, lang) }) : ready ? t("readyToClaim") : !d.manual ? t("receivedTick") : statuses.includes("missed") && !statuses.includes("claimed") ? t("missedDrop") : t("claimedTick")}
        </span>
      </div>
      {ready && <Btn small onClick={() => claim(d)}>{t("claimed")}</Btn>}
    </div>
  );
}

/** The drops of one kind around now: the latest one and the upcoming ones (≈ one day's worth). */
function dropsAround(kind, now) {
  const list = dropsBetween(now - 16 * HOUR, now + 24 * HOUR).filter((d) => d.kind === kind);
  const past = list.filter((d) => d.at <= now);
  const next = list.filter((d) => d.at > now);
  const n = kind === "trek" ? 3 : 2;
  return [...past.slice(-Math.max(1, n - next.length)), ...next].slice(0, n);
}

export function StaminaWidget() {
  const { t, accountIds } = useTimeHub();
  const now = useNow();
  const claim = useClaim();
  return (
    <Section id="stamina" icon="bolt" title={t("secStamina")} sub={t("staminaSub")}>
      {accountIds.map((a) => <StaminaRow key={a} accountId={a} />)}
      <div className="th-drops two">{dropsAround("store", now).map((d) => <DropTile key={d.key} d={d} claim={claim} />)}</div>
      <p className="th-note">{t("staminaDaily")}</p>
    </Section>
  );
}

export function TrekWidget() {
  const { t } = useTimeHub();
  const now = useNow();
  const claim = useClaim();
  return (
    <Section id="trek" icon="boot" title={t("secTrek")} sub={t("trekSub")}>
      <div className="th-drops">{dropsAround("trek", now).map((d) => <DropTile key={d.key} d={d} claim={claim} />)}</div>
      <p className="th-note">{t("trekNote")}</p>
    </Section>
  );
}

