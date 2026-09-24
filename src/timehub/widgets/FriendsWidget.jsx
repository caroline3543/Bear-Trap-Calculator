import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useNow } from "../hooks/useNow.js";
import { classifyAt, DEFAULT_HOURS, validateHours } from "../lib/dayNight.js";
import { formatTime, formatDate, offsetMinutes, formatHoursMinutes, isValidTimeZone, zoneCity } from "../lib/time.js";
import { Section, Btn, Field, TimeZonePicker, FormActions, Icon, Ltr } from "../components/ui.jsx";

const PHASE_ICON = { day: Icon.sun, evening: Icon.dusk, sleep: Icon.moon };
const PHASE_KEY = { day: "day", evening: "evening", sleep: "sleep" };

function FriendForm({ initial, onDone }) {
  const { t, state, dispatch, newId } = useTimeHub();
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
  const now = useNow();
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
