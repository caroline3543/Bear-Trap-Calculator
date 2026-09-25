/* Research: one widget, one compact row per building (War Academy, Research Center, Experts,
   Dawn Academy), grouped by account. Time left only — research length is fixed by the game. */
import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { success } from "../lib/feedback.js";
import { useClockFor } from "../hooks/useNow.jsx";
import { RESEARCH_LOCATIONS, sortTimers } from "../lib/timers.js";
import { Section, Btn, Field, Seg, DurationFields, EMPTY_DUR, durFrom, durParse, FormActions, Icon, AccountSelect, AccountTag } from "../components/ui.jsx";
import { TimerRow } from "./TimerCard.jsx";

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

export function ResearchWidget({ move }) {
  const { t, accountIds, dataFor, multi } = useTimeHub();
  const now = useClockFor(accountIds.flatMap((a) => dataFor(a).timers.filter((x) => x.kind === "research").map((x) => x.endAt)));
  const [editing, setEditing] = useState(null);
  const groups = accountIds
    .map((acc) => ({ acc, timers: sortTimers(dataFor(acc).timers.filter((x) => x.kind === "research"), now) }))
    .filter((g) => g.timers.length);
  const count = groups.reduce((n, g) => n + g.timers.length, 0);
  return (
    <Section id="research" icon="research" title={t("secResearch")} count={count} move={move}
      action={editing !== "new" && <Btn tone="gold" small icon={<Icon.plus />} onClick={() => setEditing("new")}>{t("add")}</Btn>}>
      {editing === "new" && <ResearchForm onDone={() => setEditing(null)} />}
      {count === 0 && editing !== "new" && <div className="th-empty">{t("emptyResearch")}</div>}
      {groups.map(({ acc, timers }) => (
        <div key={acc} className="th-group">
          {multi && <div className="th-group-head"><AccountTag accountId={acc} /></div>}
          {timers.map((x) =>
            editing === x.id ? <ResearchForm key={x.id} initial={{ ...x, accountId: acc }} onDone={() => setEditing(null)} />
              : <TimerRow key={x.id} timer={x} accountId={acc} onEdit={() => setEditing(x.id)} />
          )}
        </div>
      ))}
    </Section>
  );
}
