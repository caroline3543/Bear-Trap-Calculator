/* Share with alliance: the next occurrence of an event in UTC plus local times for
   your own zone and your friends' cities. Share as an image (Web Share API, falling
   back to a download) or copy plain text for alliance chat. */
import React, { useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useNow } from "../hooks/useNow.jsx";
import { eventOccurrence, eventName, isScheduled } from "../lib/events.js";
import { shareRows, shareText } from "../lib/share.js";
import { formatTime, formatDate, zoneCity } from "../lib/time.js";
import { Btn, Ltr, KindIcon, BrushUnderline, Field } from "../components/ui.jsx";
import { recurrenceText } from "./EventsWidget.jsx";

function kindOfEvent(ev) {
  const tid = ev.templateId || "";
  if (tid.startsWith("bear_trap")) return "bear";
  if (tid === "foundry" || tid === "canyon_clash") return "foundry";
  if (tid === "frostfire_mine") return "frostfire";
  return "event";
}

function drawImage({ title, sub, utc, rows }) {
  const w = 720, h = 200 + rows.length * 46;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = "#F7F3E8"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#BFD8D2"; g.lineWidth = 4; g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = "#315B55"; g.font = "600 40px Fredoka, 'Nunito Sans', sans-serif"; g.fillText(title, 40, 70);
  g.fillStyle = "#5F7A83"; g.font = "700 22px 'Nunito Sans', sans-serif"; g.fillText(sub, 40, 104);
  g.fillStyle = "#214641"; g.font = "600 44px Fredoka, 'Nunito Sans', sans-serif"; g.fillText(utc, 40, 160);
  rows.forEach((r, i) => {
    const y = 210 + i * 46;
    g.fillStyle = "#5F7A83"; g.font = "700 24px 'Nunito Sans', sans-serif"; g.fillText(r.label, 40, y);
    g.fillStyle = "#214641"; g.font = "800 24px 'Nunito Sans', sans-serif";
    const txt = (r.time + (r.day ? `  ${r.day}` : "")).replace(/\u00A0/g, " ");
    g.fillText(txt, w - 40 - g.measureText(txt).width, y);
  });
  return new Promise((res) => c.toBlob(res, "image/png"));
}

export function ShareCard() {
  const { t, lang, tz, state, templates, accounts, filter } = useTimeHub();
  const now = useNow();
  const evs = state.events.filter((e) => !e.archived && isScheduled(e) && e.templateId !== "daily_reset" && (!e.accountId || filter === "all" || e.accountId === filter));
  const [id, setId] = useState(null);
  const [msg, setMsg] = useState("");
  const ev = evs.find((e) => e.id === id) || evs[0];
  if (!ev) return null;
  const occ = eventOccurrence(ev, now);
  if (occ.start == null || occ.status === "completed") return null;
  const zones = [{ label: zoneCity(tz), tz }, ...state.friends.map((f) => ({ label: f.name, tz: f.tz }))]
    .filter((z, i, a) => a.findIndex((y) => y.tz === z.tz) === i).slice(0, 6);
  const rows = shareRows(occ.start, zones, lang);
  const title = eventName(ev, t, templates) + (ev.legion ? ` · ${t("legionN", { n: ev.legion })}` : "");
  const repeat = ev.recurrence?.type !== "once" ? recurrenceText(ev.recurrence, t) : "";
  const text = shareText({ title, start: occ.start, repeat, zones, lang });

  async function shareImage() {
    const blob = await drawImage({ title, sub: formatDate(occ.start, "UTC", lang) + (repeat ? ` · ${repeat}` : ""), utc: `${formatTime(occ.start, "UTC", lang)} UTC`, rows });
    const file = new File([blob], "time-hub-share.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    } catch { /* cancelled */ }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "time-hub-share.png"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(text); setMsg(t("copied")); } catch { setMsg(t("copyFailed")); }
    setTimeout(() => setMsg(""), 2500);
  }

  return (
    <section className="th-card th-share" aria-label={t("shareAlliance")}>
      <div className="th-sec-title-plain">{t("shareAlliance")}</div>
      <BrushUnderline />
      {evs.length > 1 && (
        <Field label={t("eventType")}>
          <select className="th-input" value={ev.id} onChange={(e) => setId(e.target.value)}>
            {evs.map((e) => <option key={e.id} value={e.id}>{eventName(e, t, templates)}</option>)}
          </select>
        </Field>
      )}
      <div className="th-share-card">
        <KindIcon kind={kindOfEvent(ev)} size={40} />
        <div className="th-share-title">{title}</div>
        <div className="th-share-sub">{formatDate(occ.start, "UTC", lang)}{repeat ? ` · ${repeat}` : ""}</div>
        <div className="th-share-utc"><Ltr>{formatTime(occ.start, "UTC", lang)}</Ltr> <small>UTC</small></div>
        <div className="th-share-rows">
          {rows.map((r) => (
            <div key={r.label}><span>{r.label}</span><b><Ltr>{r.time}</Ltr>{r.day ? <small> {r.day}</small> : null}</b></div>
          ))}
        </div>
      </div>
      <p className="th-note">{t("shareCitiesNote")}</p>
      <div className="th-share-btns">
        <Btn tone="gold" onClick={shareImage}>{t("shareImage")}</Btn>
        <Btn onClick={copy}>{t("copyText")}</Btn>
      </div>
      {msg && <span className="th-hint" role="status">{msg}</span>}
    </section>
  );
}
