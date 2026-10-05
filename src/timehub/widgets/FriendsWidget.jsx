import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useMinute } from "../hooks/useNow.jsx";
import { classifyAt, DEFAULT_HOURS, validateHours } from "../lib/dayNight.js";
import { formatTime, formatDate, offsetMinutes, formatHoursMinutes, isValidTimeZone, zoneCity } from "../lib/time.js";
import { Section, Btn, Field, TimeZonePicker, FormActions, Icon, Ltr, AccountTag } from "../components/ui.jsx";
import { friendsForAccounts, friendDayOffset } from "../lib/friends.js";

const PHASE_ICON = { day: Icon.sun, evening: Icon.dusk, sleep: Icon.moon };
const PHASE_KEY = { day: "day", evening: "evening", sleep: "sleep" };

function FriendForm({ initial, onDone }) {
  const { t, state, dispatch, newId, accounts } = useTimeHub();
  // Which accounts you play with this person on (any number). Brand-new friend with one account:
  // that account is the obvious answer, so it starts ticked.
  const [plays, setPlays] = useState(() => initial?.accounts?.length ? initial.accounts : accounts.length === 1 ? [accounts[0].id] : []);
  const [name, setName] = useState(initial?.name || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [tz, setTz] = useState(initial?.tz || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [custom, setCustom] = useState(!!initial?.hours);
  const [hours, setHours] = useState(initial?.hours || DEFAULT_HOURS);
  const [errors, setErrors] = useState({});

  function save() {
    const errs = {};
    if (!name.trim()) errs.name = "errName";
    if (!isValidTimeZone(tz)) errs.tz = "errTz";
    if (custom && !validateHours(hours)) errs.hours = "errHours";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    dispatch({
      type: "upsert", collection: "friends",
      item: {
        id: initial?.id || newId(), name: name.trim(), location: location.trim() || zoneCity(tz), tz, notes: notes.trim(),
        hours: custom ? hours : null, order: initial?.order ?? state.friends.length,
        accounts: accounts.map((a) => a.id).filter((id) => plays.includes(id)),
      },
    });
    onDone();
  }

  return (
    <div className="th-form">
      <div className="th-row stack-sm">
        <Field label={t("fName")} error={errors.name && t(errors.name)}>
          <input className={`th-input ${errors.name ? "invalid" : ""}`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label={t("location")} optional>
          <input className="th-input" value={location} maxLength={80} onChange={(e) => setLocation(e.target.value)} />
        </Field>
      </div>
      <TimeZonePicker value={tz} onChange={setTz} error={errors.tz && t(errors.tz)} />
      <fieldset className="th-plays">
        <legend className="th-label">{t("playsWithQ")}</legend>
        <div className="th-checks">
          {accounts.map((a) => (
            <label key={a.id} className="th-check">
              <input type="checkbox" checked={plays.includes(a.id)} onChange={(e) => setPlays(e.target.checked ? [...plays, a.id] : plays.filter((x) => x !== a.id))} />
              {a.name}
            </label>
          ))}
        </div>
        <span className="th-hint">{t("playsWithHint")}</span>
      </fieldset>
      <label className="th-check">
        <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} />
        {t("customHours")}
      </label>
      {custom && (
        <>
          <div className="th-row" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {[["day", "dayStarts"], ["evening", "eveningStarts"], ["sleep", "sleepStarts"]].map(([k, label]) => (
              <Field key={k} label={t(label)}>
                <input className="th-input" type="time" value={hours[k]} onChange={(e) => setHours({ ...hours, [k]: e.target.value })} />
              </Field>
            ))}
          </div>
          {errors.hours && <span className="th-error">{t(errors.hours)}</span>}
        </>
      )}
      <Field label={t("fNotes")} optional>
        <textarea className="th-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <FormActions onSave={save} onCancel={onDone} />
    </div>
  );
}

export function FriendsWidget({ move: sectionMove }) {
  const { t, tz, lang, state, dispatch } = useTimeHub();
  const now = useMinute();
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");
  const friends = state.friends;
  const needle = q.trim().toLowerCase();
  const shown = needle ? friends.filter((f) => `${f.name} ${f.location} ${f.tz}`.toLowerCase().includes(needle)) : friends;
  const myOffset = offsetMinutes(tz, now);

  const move = (i, d) => {
    const next = [...friends];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    dispatch({ type: "setFriends", friends: next });
  };

  return (
    <Section
      id="friends" icon="people" move={sectionMove} title={t("secFriends")} count={friends.length}
      action={editing !== "new" && <Btn tone="gold" small icon={<Icon.plus />} onClick={() => setEditing("new")}>{t("add")}</Btn>}
    >
      {editing === "new" && <FriendForm onDone={() => setEditing(null)} />}
      {friends.length > 3 && (
        <input className="th-input" type="search" placeholder={t("searchFriends")} aria-label={t("searchFriends")} value={q} onChange={(e) => setQ(e.target.value)} />
      )}
      {friends.length === 0 && editing !== "new" && <div className="th-empty">{t("emptyFriends")}</div>}
      {friends.length > 0 && shown.length === 0 && <div className="th-empty">{t("noMatches")}</div>}
      {shown.map((f) => {
        if (editing === f.id) return <FriendForm key={f.id} initial={f} onDone={() => setEditing(null)} />;
        const phase = classifyAt(now, f.tz, f.hours || DEFAULT_HOURS);
        const PhaseIcon = PHASE_ICON[phase];
        const diff = offsetMinutes(f.tz, now) - myOffset;
        const rel = diff === 0 ? t("sameTime") : t(diff > 0 ? "aheadBy" : "behindBy", { h: formatHoursMinutes(diff, lang) });
        const idx = friends.indexOf(f);
        const isOpen = open === f.id;
        return (
          <article key={f.id} className="th-item">
            <div
              className="th-friend" role="button" tabIndex={0} aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : f.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(isOpen ? null : f.id))}
              style={{ cursor: "pointer" }}
            >
              <div className={`th-phase ${phase}`} title={t(PHASE_KEY[phase])}><PhaseIcon /><span className="th-sr">{t(PHASE_KEY[phase])}</span></div>
              <div style={{ minWidth: 0 }}>
                <div className="th-item-name">{f.name}</div>
                <div className="th-item-sub">{f.location || zoneCity(f.tz)} · {t(PHASE_KEY[phase])}</div>
                <div className="th-item-sub">{rel}</div>
                <div className="th-item-sub th-plays-line">{(f.accounts || []).length
                  ? (f.accounts || []).map((a) => <AccountTag key={a} accountId={a} />)
                  : <span className="th-plays-none">{t("playsWithNone")}</span>}</div>
              </div>
              <div>
                <div className="th-friend-time"><Ltr>{formatTime(now, f.tz, lang)}</Ltr></div>
                <div className="th-friend-date">{formatDate(now, f.tz, lang)}</div>
              </div>
            </div>
            {isOpen && (
              <>
                {f.notes && <div className="th-item-notes">{f.notes}</div>}
                <div className="th-item-sub" style={{ marginTop: 6 }}><Ltr>{f.tz}</Ltr></div>
                <div className="th-item-actions">
                  <Btn small onClick={() => setEditing(f.id)}>{t("edit")}</Btn>
                  <Btn small className="icon" disabled={!!needle || idx === 0} onClick={() => move(idx, -1)} aria-label={t("moveUp")} title={t("moveUp")}><Icon.up /></Btn>
                  <Btn small className="icon" disabled={!!needle || idx === friends.length - 1} onClick={() => move(idx, 1)} aria-label={t("moveDown")} title={t("moveDown")}><Icon.down /></Btn>
                  <Btn small tone="danger" onClick={() => window.confirm(t("confirmDelete")) && dispatch({ type: "remove", collection: "friends", id: f.id })}>{t("delete")}</Btn>
                </div>
              </>
            )}
          </article>
        );
      })}
      {friends.length > 0 && <p className="th-note">{t("estimateNote")}</p>}
    </Section>
  );
}

/**
 * "For your friends" — what an event's time is for the friends who play on a participating
 * account. Two names show; the rest fold behind "+N more". Adds "Tomorrow"/"Yesterday" only when
 * the friend's date differs from yours. Renders nothing when no linked friend is involved.
 */
export function FriendTimes({ at, accountIds, compact = false }) {
  const { t, tz, lang, state } = useTimeHub();
  const [all, setAll] = useState(false);
  const list = friendsForAccounts(state.friends, accountIds);
  if (!list.length) return null;
  const shown = all ? list : list.slice(0, 2);
  const rest = list.length - shown.length;
  const day = (f) => {
    const d = friendDayOffset(at, f.tz, tz);
    return d === 1 ? t("tomorrow") : d === -1 ? t("yesterday") : d ? formatDate(at, f.tz, lang) : null;
  };
  return (
    <div className={`th-ftimes ${compact ? "compact" : ""}`}>
      <span className="th-ftimes-label">{t("forYourFriends")}</span>
      <span className="th-ftimes-list">
        {shown.map((f) => (
          <span key={f.id} className="th-ftime"><b>{f.name}</b> <Ltr>{formatTime(at, f.tz, lang)}</Ltr>{day(f) && <span className="th-ftime-day"> · {day(f)}</span>}</span>
        ))}
        {rest > 0 && <button type="button" className="th-link th-ftimes-more" onClick={(e) => { e.stopPropagation(); setAll(true); }}>{t("moreN", { n: rest })}</button>}
      </span>
    </div>
  );
}
