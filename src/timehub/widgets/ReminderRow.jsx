/* Minister reminder attached to a combat event occurrence, per account.
   States: NEEDS ACTION → BOOKING RECORDED (which minister) / NOT SURE / DISMISSED (undoable).
   "Don't remind me" is the only thing that turns reminders off for the event. */
import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { success } from "../lib/feedback.js";
import { BUFF_CHOICES, suggestedBuff } from "../lib/reminders.js";
import { slotContaining } from "../lib/bookings.js";
import { eventName } from "../lib/events.js";
import { formatTime } from "../lib/time.js";
import { Btn, AccountTag, Ltr, Icon } from "../components/ui.jsx";

const BUFF = {
  strategy: ["buffStrategyName", "buffStrategySub"],
  defense: ["buffDefenseName", "buffDefenseSub"],
  neither: ["buffNeither", null],
  unsure: ["buffUnsure", null],
};

export function ReminderRow({ r, showName = true, slim = false, onAsk }) {
  const { t, lang, tz, templates, update, openBooking } = useTimeHub();
  const [asking, setAsking] = useState(!!onAsk && !slim);
  const [buff, setBuff] = useState(r.buff || suggestedBuff(r.booking) || "unsure");
  const setSaved = (v) => update((s) => ({ ...s, reminders: { ...s.reminders, [r.key]: v } }));
  const clear = () => update((s) => { const { [r.key]: _x, ...rest } = s.reminders; return { ...s, reminders: rest }; });
  const dontRemind = () => update((s) => ({ ...s, events: s.events.map((e) => (e.id === r.ev.id ? { ...e, reminderHidden: true } : e)) }));
  const ask = () => { setBuff(r.buff || suggestedBuff(r.booking) || "unsure"); setAsking(true); };
  const name = eventName(r.ev, t, templates);
  const where = (
    <span className="th-rem-sub">
      {showName && <>{name} · <Ltr>{formatTime(r.occ.start, tz, lang)}</Ltr> · </>}<Ltr>{formatTime(r.occ.start, "UTC", lang)}</Ltr> UTC <AccountTag accountId={r.accountId} />
    </span>
  );

  if (r.status === "dismissed") {
    return (
      <div className="th-rem quiet">
        <span>{t("reminderDismissed")}</span>{where}
        <button type="button" className="th-link" onClick={clear}>{t("undo")}</button>
      </div>
    );
  }

  if (asking) {
    return (
      <div className="th-rem">
        <div className="th-rem-title">{t("whichMinister")}</div>
        {where}
        <div className="th-buffs" role="radiogroup" aria-label={t("whichMinister")}>
          {BUFF_CHOICES.map((b) => (
            <button key={b} type="button" role="radio" aria-checked={buff === b} className="th-buff" onClick={() => setBuff(b)}>
              <b>{t(BUFF[b][0])}</b>{BUFF[b][1] && <small>{t(BUFF[b][1])}</small>}
            </button>
          ))}
        </div>
        <p className="th-note">{t("buffNote")}</p>
        <div className="th-item-actions">
          <Btn small tone="gold" onClick={() => { setSaved({ state: "booked", buff }); setAsking(false); success(); }}>{t("save")}</Btn>
          <Btn small onClick={() => setAsking(false)}>{t("cancel")}</Btn>
        </div>
      </div>
    );
  }

  const done = r.status === "booked" || r.status === "covered";
  if (slim) {
    return (
      <div className="th-rem slim">
        <span className="th-rem-icon"><Icon.warn /></span>
        <span className="th-rem-line"><b>{name}</b> <Ltr>{formatTime(r.occ.start, tz, lang)}</Ltr> <AccountTag accountId={r.accountId} /></span>
        <Btn small tone="gold" onClick={() => openBooking({ accountId: r.accountId, startAt: slotContaining(r.occ.start), position: "minister_strategy", eventKey: r.key })}>{t("bookShort")}</Btn>
        <Btn small onClick={() => (onAsk ? onAsk() : ask())}>{t("bookedShort")}</Btn>
      </div>
    );
  }
  return (
    <div className={`th-rem ${done ? "ok" : ""}`}>
      <div className="th-rem-head">
        <span className="th-rem-icon">{done ? <Icon.check /> : <Icon.warn />}</span>
        <div style={{ minWidth: 0 }}>
          <div className="th-rem-title">
            {r.status === "open" && t("remAskShort")}
            {r.status === "covered" && t("remCovered", { position: t(r.booking.position) })}
            {r.status === "booked" && t(BUFF[r.buff][0])}
            {r.status === "unsure" && t("bookingUnknown")}
          </div>
          {where}
        </div>
      </div>
      <div className="th-item-actions">
        {(r.status === "open" || r.status === "unsure") && (
          <Btn small tone="gold" onClick={() => openBooking({ accountId: r.accountId, startAt: slotContaining(r.occ.start), position: "minister_strategy", eventKey: r.key })}>
            {t("bookMinister")}
          </Btn>
        )}
        {r.status === "open" || r.status === "covered" ? <Btn small onClick={ask}>{t("iBookedIt")}</Btn> : <Btn small onClick={ask}>{t("changeAnswer")}</Btn>}
        {(r.status === "booked" || r.status === "unsure") && <Btn small onClick={clear}>{t("clearAnswer")}</Btn>}
        {r.status === "open" && <Btn small onClick={() => setSaved({ state: "dismissed", buff: null })}>{t("dismiss")}</Btn>}
        {r.status === "open" && <button type="button" className="th-link" onClick={dontRemind}>{t("dontRemind")}</button>}
      </div>
    </div>
  );
}
