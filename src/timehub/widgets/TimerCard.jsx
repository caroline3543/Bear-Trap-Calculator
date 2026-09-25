/* Compact timer row (training camp or research building) with its own countdown.
   Actions tuck behind "⋯" so the widget stays short. */
import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useNow } from "../hooks/useNow.jsx";
import { timerStatus, timerProgress, restartTimer } from "../lib/timers.js";
import { rememberEnd } from "../lib/today.js";
import { formatTime, formatCountdownClock, localDayRange, intlLocale } from "../lib/time.js";
import { Btn, Ltr, Bidi, CalendarButtons } from "../components/ui.jsx";

/** "9:09 PM" today, "tomorrow 6:38 AM", or "Sat 6:38 AM". */
export function useWhenLocal() {
  const { t, tz, lang } = useTimeHub();
  const now = useNow();
  return (ms) => {
    const today = localDayRange(now, tz);
    const time = formatTime(ms, tz, lang);
    if (ms >= today.start && ms < today.end) return time;
    if (ms >= today.end && ms < localDayRange(now, tz, 1).end) return `${t("tomorrowLower")} ${time}`;
    return `${new Intl.DateTimeFormat(intlLocale(lang), { timeZone: tz, weekday: "short" }).format(ms)} ${time}`;
  };
}

export function TimerRow({ timer: x, accountId, onEdit, label, slim }) {
  const { t, lang, updateAccount, accountById } = useTimeHub();
  const now = useNow();
  const when = useWhenLocal();
  const [open, setOpen] = useState(false);
  const ready = timerStatus(x, now) === "ready";
  const acct = accountById(accountId);
  const remove = (ask) => (!ask || window.confirm(t("confirmDelete"))) && updateAccount(accountId, (d) => rememberEnd({ ...d, timers: d.timers.filter((y) => y.id !== x.id) }, x, Date.now()));
  const restart = () => updateAccount(accountId, (d) => ({ ...d, timers: d.timers.map((y) => (y.id === x.id ? restartTimer(y, Date.now()) : y)) }));
  const title = t(x.kind === "training" ? "campFinishes" : "researchFinishes", { camp: t(x.category), place: t(x.category) });
  const actions = open && (
    <div className="th-item-actions th-trow-actions">
      {onEdit && !ready && <Btn small onClick={onEdit}>{t("edit")}</Btn>}
      <Btn small onClick={restart}>{t("restart")}</Btn>
      <Btn small tone={ready ? "primary" : "danger"} onClick={() => remove(!ready)}>{ready ? t("dismiss") : t("cancel")}</Btn>
    </div>
  );
  if (slim) {
    return (
      <div className="th-trow slim">
        <div className="th-trow-main"><div className="th-trow-name">{label || t(x.category)}</div></div>
        <button type="button" className="th-more" aria-expanded={open} aria-label={`${t("options")}: ${label || t(x.category)}`} onClick={() => setOpen(!open)}>⋯</button>
        {actions}
      </div>
    );
  }
  return (
    <div className={`th-trow ${ready ? "ready" : ""}`}>
      <div className="th-trow-main">
        <div className="th-trow-name">{label || t(x.category)}</div>
        <div className="th-trow-when">
          {ready ? t(x.kind === "training" ? "stTrained" : "stDone")
            : <>{t("finishes")} <Ltr>{when(x.endAt)}</Ltr> · <Ltr>{formatTime(x.endAt, "UTC", lang)}</Ltr> UTC</>}
        </div>
      </div>
      <div className="th-trow-count" role="timer">{ready ? <span className="th-ready-dot">{t("readyNow")}</span> : <Bidi>{formatCountdownClock(x.endAt - now, lang)}</Bidi>}</div>
      <button type="button" className="th-more" aria-expanded={open} aria-label={`${t("options")}: ${label || t(x.category)}`} onClick={() => setOpen(!open)}>⋯</button>
      {!ready && <div className="th-trow-bar" aria-hidden="true"><span style={{ width: `${timerProgress(x, now) * 100}%` }} /></div>}
      {open && (
        <div className="th-item-actions th-trow-actions">
          {ready ? (
            <>
              <Btn small tone="primary" onClick={() => remove(false)}>{t("dismiss")}</Btn>
              <Btn small onClick={restart}>{t("restart")}</Btn>
            </>
          ) : (
            <>
              {onEdit && <Btn small onClick={onEdit}>{t("edit")}</Btn>}
              <Btn small onClick={restart}>{t("restart")}</Btn>
              <Btn small tone="danger" onClick={() => remove(true)}>{t("cancel")}</Btn>
              <CalendarButtons items={[{ uid: `tm:${x.id}`, start: x.endAt, title: title + (acct ? ` (${acct.name})` : "") }]} filename={`${x.category}-${x.id}`} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
