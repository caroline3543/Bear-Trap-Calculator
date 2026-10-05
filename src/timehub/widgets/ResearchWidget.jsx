/* Research: one widget, one compact row per building (War Academy, Research Center, Experts,
   Dawn Academy), grouped by account. Time left only — research length is fixed by the game. */
import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { success } from "../lib/feedback.js";
import { useClockFor } from "../hooks/useNow.jsx";
import { RESEARCH_LOCATIONS, sortResearch } from "../lib/timers.js";
import { researchReminder, VP_POSITION } from "../lib/research.js";
import { Section, Btn, Field, Seg, DurationFields, EMPTY_DUR, durFrom, durParse, FormActions, Icon, AccountSelect, GroupName, Remaining, Ltr } from "../components/ui.jsx";
import { formatTime } from "../lib/time.js";
import { TimerRow } from "./TimerCard.jsx";

/** A quiet line under a research timer once it's worth planning a minister appointment around —
 *  never a position guessed for the player, just the 30-minute slot the timer already lines up
 *  with, and whether anything is already booked there. */
function MinisterNote({ timer, accountId }) {
  const { t, tz, lang, dataFor, openBooking, updateAccount, newId } = useTimeHub();
  const now = useClockFor([timer.endAt]);
  const r = researchReminder(timer, dataFor(accountId).bookings, now, dataFor(accountId).vpDismiss);
  if (!r) return null;
  const undo = () => updateAccount(accountId, (d) => { const { [r.key]: _x, ...rest } = d.vpDismiss || {}; return { ...d, vpDismiss: rest }; });
  const markBooked = () => {
    updateAccount(accountId, (d) => ({ ...d, bookings: [...d.bookings, { id: newId(), position: VP_POSITION, startAt: r.slot.start, notes: "", createdAt: Date.now() }] }));
    success();
  };
  if (r.booked) return <div className="th-srow-note ok">✓ {t("vpBookedAt", { time: formatTime(r.slot.start, "UTC", lang) })}</div>;
  if (r.status === "dismissed") return <div className="th-srow-note">{t("vpDismissedHere", { time: `${formatTime(r.slot.start, "UTC", lang)}–${formatTime(r.slot.end, "UTC", lang)}` })} · <button type="button" className="th-link" onClick={undo}>{t("undo")}</button></div>;
  return (
    <div className={`th-research-note ${r.tier === "soon" ? "soon" : ""}`}>
      <span>{t("bookVpFor")} <Ltr>{formatTime(r.slot.start, tz, lang)}–{formatTime(r.slot.end, tz, lang)}</Ltr> (<Ltr>{formatTime(r.slot.start, "UTC", lang)}–{formatTime(r.slot.end, "UTC", lang)}</Ltr> UTC)</span>
      {r.slot.tight && <span className="warn">{t("slotTight")}</span>}
      {r.conflict && <span className="warn">{t("vpConflict", { time: formatTime(r.conflict.startAt, "UTC", lang) })}</span>}
      <span className="th-item-actions">
        <button type="button" className="th-link" onClick={() => openBooking({ accountId, startAt: r.slot.start, position: VP_POSITION })}>{t("bookThisSlot")}</button>
        <button type="button" className="th-link" onClick={markBooked}>{t("markBooked")}</button>
      </span>
    </div>
  );
}

function ResearchForm({ initial, onDone }) {
  const { t, newId, defaultAccountId, updateAccount } = useTimeHub();
  const now = Date.now(); // only used to prefill the form
  const [accountId, setAccountId] = useState(initial?.accountId || defaultAccountId);
  const [category, setCategory] = useState(initial?.category || RESEARCH_LOCATIONS[0]);
  const [dur, setDur] = useState(initial ? durFrom(initial.endAt - now) : EMPTY_DUR);
  const [error, setError] = useState(null);
  function save() {
    const r = durParse(dur);
    if (r.error) return setError(t("errDigitsFix"));
    const at = Date.now();
    const item = { id: initial?.id || newId(), kind: "research", category, label: initial?.label || "", notes: "", startedAt: at, endAt: at + r.ms, durationMs: r.ms, createdAt: initial?.createdAt || at };
    if (initial && initial.accountId !== accountId) updateAccount(initial.accountId, (d) => ({ ...d, timers: d.timers.filter((x) => x.id !== initial.id) }));
    updateAccount(accountId, (d) => {
      const exists = d.timers.some((x) => x.id === item.id);
      return { ...d, timers: exists ? d.timers.map((x) => (x.id === item.id ? item : x)) : [...d.timers, item] };
    });
    success();
    onDone();
  }
  return (
    <div className="th-form">
      <AccountSelect value={accountId} onChange={setAccountId} />
      <Field label={t("building")} as="div">
        <Seg value={category} onChange={setCategory} label={t("building")} options={RESEARCH_LOCATIONS.map((c) => ({ value: c, label: t(c) }))} />
      </Field>
      <DurationFields value={dur} onChange={setDur} />
      {error && <span className="th-error" role="alert">{error}</span>}
      <FormActions onSave={save} onCancel={onDone} />
    </div>
  );
}

function ResearchSummary() {
  const { t, accountIds, dataFor, accountById, multi } = useTimeHub();
  const now = useClockFor(accountIds.flatMap((a) => dataFor(a).timers.filter((x) => x.kind === "research").map((x) => x.endAt)));
  let next = null; // soonest to finish, shown as "Next" — the list itself stays in the fixed order
  let ready = 0;
  for (const acc of accountIds) {
    for (const x of dataFor(acc).timers) {
      if (x.kind !== "research") continue;
      if (x.endAt <= now) ready++;
      else if (!next || x.endAt < next.x.endAt) next = { acc, x };
    }
  }
  if (!next && !ready) return <span>{t("noResearch")}</span>;
  return (
    <span>
      {next && <>{t("nextWord")}: {t(next.x.category)}{multi ? ` · ${accountById(next.acc)?.name}` : ""} · <b><Remaining to={next.x.endAt} fmt="clock" /></b></>}
      {ready > 0 && <span className="attn">{next ? " · " : ""}{t("nReadyResearch", { n: ready })}</span>}
    </span>
  );
}

export function ResearchWidget({ move }) {
  const { t, accountIds, dataFor, multi } = useTimeHub();
  const now = useClockFor(accountIds.flatMap((a) => dataFor(a).timers.filter((x) => x.kind === "research").map((x) => x.endAt)));
  const [editing, setEditing] = useState(null);
  const groups = accountIds
    .map((acc) => ({ acc, timers: sortResearch(dataFor(acc).timers.filter((x) => x.kind === "research")) }))
    .filter((g) => g.timers.length);
  const count = groups.reduce((n, g) => n + g.timers.length, 0);
  return (
    <Section id="research" icon="research" title={t("secResearch")} count={count} move={move} defaultClosed summary={<ResearchSummary />}
      action={editing !== "new" && <Btn tone="gold" small icon={<Icon.plus />} onClick={() => setEditing("new")}>{t("add")}</Btn>}>
      {editing === "new" && <ResearchForm onDone={() => setEditing(null)} />}
      {count === 0 && editing !== "new" && <div className="th-empty">{t("emptyResearch")}</div>}
      {groups.map(({ acc, timers }) => (
        <div key={acc} className="th-group">
          {multi && <GroupName accountId={acc} />}
          {timers.map((x) =>
            editing === x.id ? <ResearchForm key={x.id} initial={{ ...x, accountId: acc }} onDone={() => setEditing(null)} />
              : <React.Fragment key={x.id}><TimerRow timer={x} accountId={acc} onEdit={() => setEditing(x.id)} compact /><MinisterNote timer={x} accountId={acc} /></React.Fragment>
          )}
        </div>
      ))}
    </Section>
  );
}
