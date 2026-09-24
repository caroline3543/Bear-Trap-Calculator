/* Minister bookings — same screen for every position, like the game:
   position ◀ ▶, UTC date (today / tomorrow), fixed 30-minute UTC slots. */
import React, { useEffect, useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useNow } from "../hooks/useNow.js";
import {
  MINISTER_POSITIONS, POSITION_EFFECT, bookingWindow, daySlots, bookingStatus, bookingEnd, findConflicts,
  partitionBookings, validateBooking, isCustomTime,
} from "../lib/bookings.js";
import { formatTime, formatDate, formatCountdown, DAY, MINUTE } from "../lib/time.js";
import { Section, Btn, Pill, Countdown, Field, Seg, FormActions, Icon, Ltr, Bidi, AccountTag, AccountSelect, CalendarButtons, acctClass } from "../components/ui.jsx";

function slotLabel(start, lang) {
  return `${formatTime(start, "UTC", lang)}–${formatTime(start + 30 * MINUTE, "UTC", lang)}`;
}

function BookingForm({ initial, prefill, onDone }) {
  const { t, lang, tz, newId, dataFor, defaultAccountId, updateAccount } = useTimeHub();
  const now = useNow();
  const { from } = bookingWindow(now);
  const start0 = initial?.startAt ?? prefill?.startAt ?? null;
  const [accountId, setAccountId] = useState(initial?.accountId || prefill?.accountId || defaultAccountId);
  const [position, setPosition] = useState(initial?.position || prefill?.position || MINISTER_POSITIONS[0]);
  const [day, setDay] = useState(start0 != null && start0 >= from + DAY ? 1 : 0);
  const [startAt, setStartAt] = useState(start0);
  const [notes, setNotes] = useState(initial?.notes || "");
  const [errors, setErrors] = useState({});
  const [confirmOther, setConfirmOther] = useState(false);
  const bookings = dataFor(accountId).bookings;
  const dayStart = from + day * DAY;
  const slots = daySlots(dayStart, now);
  const conflicts = startAt != null ? findConflicts({ id: initial?.id, position, startAt }, bookings) : { duplicates: [], otherPositions: [] };
  const posIdx = MINISTER_POSITIONS.indexOf(position);
  const cyclePos = (d) => { setPosition(MINISTER_POSITIONS[(posIdx + d + MINISTER_POSITIONS.length) % MINISTER_POSITIONS.length]); setConfirmOther(false); };

  function save() {
    const errs = validateBooking({ position, startAt }, now);
    if (!errs.startAt && conflicts.duplicates.length) errs.startAt = "errDuplicate";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (conflicts.otherPositions.length && !confirmOther) { setConfirmOther(true); return; }
    const item = { id: initial?.id || newId(), position, startAt, notes: notes.trim(), createdAt: initial?.createdAt || Date.now() };
    if (initial && initial.accountId !== accountId) {
      updateAccount(initial.accountId, (d) => ({ ...d, bookings: d.bookings.filter((b) => b.id !== initial.id) }));
    }
    updateAccount(accountId, (d) => {
      const exists = d.bookings.some((b) => b.id === item.id);
      return { ...d, bookings: exists ? d.bookings.map((b) => (b.id === item.id ? item : b)) : [...d.bookings, item] };
    });
    onDone();
  }

  return (
    <div className="th-form">
      <AccountSelect value={accountId} onChange={(v) => { setAccountId(v); setConfirmOther(false); }} />
      <div className="th-pos-picker" role="group" aria-label={t("position")}>
        <Btn className="icon" onClick={() => cyclePos(-1)} aria-label={t("prevPosition")}><span className="th-flip">◀</span></Btn>
        <div className="th-pos-name">
          <b>{t(position)}</b>
          {POSITION_EFFECT[position] && <small>{t(POSITION_EFFECT[position])}</small>}
        </div>
        <Btn className="icon" onClick={() => cyclePos(1)} aria-label={t("nextPosition")}><span className="th-flip">▶</span></Btn>
      </div>
      <Seg value={day} onChange={(d) => { setDay(d); setStartAt(null); }} label={t("bookingDay")} options={[0, 1].map((d) => ({
        value: d, label: `${d ? t("tomorrow") : t("today")} · UTC ${formatDate(from + d * DAY, "UTC", lang)}`,
      }))} />
      <div className="th-slots" role="listbox" aria-label={t("chooseSlot")}>
        {slots.map((s) => {
          const mine = bookings.find((b) => b.startAt === s.start && b.position === position && b.id !== initial?.id);
          const selected = startAt === s.start;
          if (!s.open && !mine && !selected) return null; // like the game: past slots aren't listed
          return (
            <button
              key={s.start} type="button" role="option" aria-selected={selected} disabled={!s.open || !!mine}
              className={`th-slot ${selected ? "on" : ""} ${mine ? "mine" : ""}`}
              onClick={() => { setStartAt(s.start); setConfirmOther(false); setErrors({}); }}
            >
              <b><Ltr>{slotLabel(s.start, lang)}</Ltr></b>
              <small>{mine ? t("booked") : <><Ltr>{formatTime(s.start, tz, lang)}</Ltr> {t("local")}</>}</small>
            </button>
          );
        })}
        {!slots.some((s) => s.open) && <p className="th-note">{t("noSlotsLeft")}</p>}
      </div>
      {errors.startAt && <span className="th-error" role="alert">{t(errors.startAt)}</span>}
      {startAt != null && (
        <div className="th-review">
          <div><span>{t("utc")}</span><b><Ltr>{slotLabel(startAt, lang)}</Ltr> · {formatDate(startAt, "UTC", lang)}</b></div>
          <div><span>{t("local")}</span><b><Ltr>{formatTime(startAt, tz, lang)}–{formatTime(startAt + 30 * MINUTE, tz, lang)}</Ltr> · {formatDate(startAt, tz, lang)}</b></div>
        </div>
      )}
      {confirmOther && (
        <div className="th-warn" role="alert">
          {conflicts.otherPositions.map((b) => <div key={b.id}>{t("otherPositionWarn", { position: t(b.position), time: slotLabel(b.startAt, lang) })}</div>)}
        </div>
      )}
      <Field label={t("fNotes")} optional>
        <textarea className="th-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <FormActions onSave={save} onCancel={onDone} saveLabel={confirmOther ? t("saveAnyway") : t("saveBooking")} />
      <p className="th-note">{t("bookingNote")}</p>
    </div>
  );
}

export function BookingsWidget({ move }) {
  const { t, tz, lang, accountIds, dataFor, updateAccount, bookingDraft, setBookingDraft, accountById } = useTimeHub();
  const now = useNow();
  const [editing, setEditing] = useState(null); // null | "new" | id
  const [openId, setOpenId] = useState(null);
  useEffect(() => { if (bookingDraft) setEditing("new"); }, [bookingDraft]);
  const rows = accountIds.flatMap((acc) => partitionBookings(dataFor(acc).bookings, now).current.map((b) => ({ ...b, accountId: acc })));
  rows.sort((a, b) => a.startAt - b.startAt || String(a.id).localeCompare(String(b.id)));
  const close = () => { setEditing(null); setBookingDraft(null); };
  const cancel = (b) => window.confirm(t("confirmDelete")) && updateAccount(b.accountId, (d) => ({ ...d, bookings: d.bookings.filter((x) => x.id !== b.id) }));

  return (
    <Section id="bookings" icon="booking" title={t("secBookings")} count={rows.length} move={move}
      action={editing !== "new" && <Btn tone="gold" small icon={<Icon.plus />} onClick={() => setEditing("new")}>{t("add")}</Btn>}>
      {editing === "new" && <BookingForm key={bookingDraft?.nonce || "new"} prefill={bookingDraft} onDone={close} />}
      {rows.length === 0 && editing !== "new" && <div className="th-empty">{t("emptyBookings")}</div>}
      {rows.map((b) => {
        if (editing === b.id) return <BookingForm key={b.id} initial={b} onDone={close} />;
        const status = bookingStatus(b, now);
        const end = bookingEnd(b);
        const acct = accountById(b.accountId);
        return (
          <article key={b.id} className={`th-ev ${status === "active" ? "live" : ""} ${acctClass(acct)}`}>
            <div className="th-ev-top">
              <div className="th-ev-main">
                <div className="th-ev-name">{t(b.position)}</div>
                <div className="th-ev-when">
                  <Ltr>{formatTime(b.startAt, tz, lang)}–{formatTime(end, tz, lang)}</Ltr> {formatDate(b.startAt, tz, lang)} · <Ltr>{slotLabel(b.startAt, lang)}</Ltr> UTC
                </div>
                <div className="th-tags">
                  {status === "active" && <Pill tone="solid">{t("stActive")}</Pill>}
                  {isCustomTime(b) && <Pill tone="amber">{t("customTime")}</Pill>}
                  <AccountTag accountId={b.accountId} />
                </div>
              </div>
              {status === "active" ? <Countdown ms={end - now} label={t("endsIn")} /> : <Countdown ms={b.startAt - now} label={t("startsIn")} />}
            </div>
            <button type="button" className="th-link th-ev-more" aria-expanded={openId === b.id} onClick={() => setOpenId(openId === b.id ? null : b.id)}>{openId === b.id ? t("lessDetails") : t("moreDetails")}</button>
            {openId === b.id && (
              <div className="th-ev-details">
                {b.notes && <div className="th-item-notes">{b.notes}</div>}
                <div className="th-item-actions">
                  {status === "upcoming" && !isCustomTime(b) && <Btn small onClick={() => setEditing(b.id)}>{t("edit")}</Btn>}
                  <Btn small tone="danger" onClick={() => cancel(b)}>{t("cancel")}</Btn>
                  <CalendarButtons items={[{ uid: `bk:${b.id}`, start: b.startAt, end, title: `${t(b.position)}${acct ? ` (${acct.name})` : ""}` }]} filename={`booking-${b.id}`} />
                </div>
              </div>
            )}
          </article>
        );
      })}
    </Section>
  );
}
