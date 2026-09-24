/* Account chips (filter) + account manager: add, rename, colour, type, notes, primary, order, delete. */
import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { MAX_ACCOUNTS, ACCOUNT_COLORS, ACCOUNT_TYPES, ALL, makeAccount, normalizeAccounts, deleteAccount, accountUsage, emptyAccountData } from "../lib/accounts.js";
import { Btn, Field, Seg, Icon } from "../components/ui.jsx";

export function AccountChips() {
  const { t, accounts, filter, setFilter } = useTimeHub();
  return (
    <div className="th-acct-chips" role="group" aria-label={t("showAccounts")}>
      {accounts.length > 1 && (
        <button type="button" className="th-chip-btn" aria-pressed={filter === ALL} onClick={() => setFilter(ALL)}>{t("allAccounts")}</button>
      )}
      {accounts.map((a) => (
        <button key={a.id} type="button" className={`th-chip-btn c${a.color}`} aria-pressed={filter === a.id || accounts.length === 1}
          onClick={() => setFilter(accounts.length === 1 ? ALL : a.id)}>
          {a.icon ? <b aria-hidden="true">{a.icon}</b> : <i aria-hidden="true" />}{a.name}{a.isPrimary && accounts.length > 1 ? " ★" : ""}
        </button>
      ))}
    </div>
  );
}

function AccountEditor({ account, onDone }) {
  const { t, state, update, newId } = useTimeHub();
  const [name, setName] = useState(account?.name || "");
  const [type, setType] = useState(account?.type || "farm");
  const [color, setColor] = useState(account?.color || makeAccount({ id: "x" }, state.accounts).color);
  const [notes, setNotes] = useState(account?.notes || "");
  const [icon, setIcon] = useState(account?.icon || "");
  const [err, setErr] = useState(null);
  function save() {
    if (!name.trim()) return setErr(t("errName"));
    update((s) => {
      if (account) {
        return { ...s, accounts: s.accounts.map((a) => (a.id === account.id ? { ...a, name: name.trim(), type, color, notes: notes.trim(), icon: icon.trim() } : a)) };
      }
      const id = newId();
      const acc = { ...makeAccount({ id, name, type, color, notes }, s.accounts), icon: icon.trim() };
      return { ...s, accounts: normalizeAccounts([...s.accounts, acc]), accountData: { ...s.accountData, [id]: emptyAccountData() } };
    });
    onDone();
  }
  return (
    <div className="th-form">
      <Field label={t("fName")} error={err}>
        <input className="th-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label={t("accountType")} as="div">
        <Seg value={type} onChange={setType} label={t("accountType")} options={ACCOUNT_TYPES.map((x) => ({ value: x, label: t(`type_${x}`) }))} />
      </Field>
      <Field label={t("colour")} as="div">
        <div className="th-swatches" role="radiogroup" aria-label={t("colour")}>
          {ACCOUNT_COLORS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={`${t("colour")} ${c}`} className={`th-swatch c${c}`} onClick={() => setColor(c)} />
          ))}
        </div>
      </Field>
      <Field label={t("accountIcon")} optional hint={t("accountIconHint")}>
        <input className="th-input" value={icon} maxLength={4} style={{ width: 90 }} onChange={(e) => setIcon([...e.target.value].slice(0, 2).join(""))} />
      </Field>
      <Field label={t("fNotes")} optional>
        <textarea className="th-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="th-form-actions">
        <Btn tone="gold" onClick={save}>{t("save")}</Btn>
        <Btn onClick={onDone}>{t("cancel")}</Btn>
      </div>
    </div>
  );
}

export function AccountsPanel({ onClose }) {
  const { t, state, update, accounts } = useTimeHub();
  const [editing, setEditing] = useState(null);
  const move = (i, d) => update((s) => {
    const list = [...s.accounts].sort((a, b) => a.order - b.order);
    const j = i + d;
    if (j < 0 || j >= list.length) return s;
    [list[i], list[j]] = [list[j], list[i]];
    return { ...s, accounts: normalizeAccounts(list.map((a, k) => ({ ...a, order: k }))) };
  });
  const remove = (a) => {
    const u = accountUsage(state, a.id);
    if (window.confirm(t("confirmDeleteAccount", { name: a.name, bookings: u.bookings, timers: u.timers, events: u.events }))) update((s) => deleteAccount(s, a.id));
  };
  return (
    <div className="th-card" style={{ marginBottom: 16 }}>
      <div className="th-sec-head">
        <b className="th-sec-title" style={{ color: "var(--gold)", fontSize: 17, flex: 1 }}>{t("manageAccounts")}</b>
        {onClose && <Btn small onClick={onClose}>{t("done")}</Btn>}
      </div>
      <div className="th-sec-body" style={{ marginTop: 12 }}>
        {accounts.map((a, i) =>
          editing === a.id ? <AccountEditor key={a.id} account={a} onDone={() => setEditing(null)} /> : (
            <div key={a.id} className={`th-item th-acct-edge c${a.color}`}>
              <div className="th-item-top">
                <div style={{ minWidth: 0 }}>
                  <div className="th-item-name">{a.icon ? <span aria-hidden="true">{a.icon}</span> : <span className={`th-dot c${a.color}`} aria-hidden="true" />} {a.name}</div>
                  <div className="th-item-sub">{t(`type_${a.type}`)}{a.isPrimary ? ` · ★ ${t("primary")}` : ""}{a.notes ? ` · ${a.notes}` : ""}</div>
                </div>
              </div>
              <div className="th-item-actions">
                <Btn small onClick={() => setEditing(a.id)}>{t("edit")}</Btn>
                {!a.isPrimary && <Btn small onClick={() => update((s) => ({ ...s, accounts: s.accounts.map((x) => ({ ...x, isPrimary: x.id === a.id })) }))}>{t("makePrimary")}</Btn>}
                <Btn small className="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("moveUp")}><Icon.up /></Btn>
                <Btn small className="icon" disabled={i === accounts.length - 1} onClick={() => move(i, 1)} aria-label={t("moveDown")}><Icon.down /></Btn>
                {accounts.length > 1 && <Btn small tone="danger" onClick={() => remove(a)}>{t("delete")}</Btn>}
              </div>
            </div>
          )
        )}
        {editing === "new" ? <AccountEditor onDone={() => setEditing(null)} />
          : accounts.length < MAX_ACCOUNTS ? <Btn tone="gold" icon={<Icon.plus />} onClick={() => setEditing("new")}>{t("addAccount")}</Btn>
          : <p className="th-note">{t("maxAccounts", { n: MAX_ACCOUNTS })}</p>}
      </div>
    </div>
  );
}
