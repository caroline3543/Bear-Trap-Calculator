/* NEXT UP — the home tab's one focal object. Answers in ~2 seconds:
     What is happening next?  What happens after that?  (Is there anything to do? → Needs You below)
   One dominant item with a live countdown, then 1–3 quiet lines (THEN / LATER). Not a schedule —
   the full Timeline is further down.

   Performance: the list is derived once a minute (useMinute + useMemo); only the tiny <Clock>
   leaf ticks every second, so nothing else on the screen re-renders per second. */
import React, { useMemo, useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useMinute, useNow } from "../hooks/useNow.jsx";
import { buildAgenda, groupTraining } from "../lib/agenda.js";
import { computeReminders, needsAttention } from "../lib/reminders.js";
import { idleCamps } from "../lib/today.js";
import { formatTime, formatSpan, formatCountdownClock, DAY } from "../lib/time.js";
import { itemTitle } from "../components/labels.js";
import { Ltr, Bidi, AccountTag } from "../components/ui.jsx";
import pool from "../assets/hero-pool-corner.webp";

/** Routine or passive things never take the spotlight (they still appear on the Timeline). */
const QUIET_KINDS = new Set(["contrib", "intel", "drop"]);
/** Timers finish rather than start. */
const FINISHES = new Set(["training", "research", "timer", "stamina"]);
// daily reset is allowed in the hero again (it's a real "what's next"); passive timers are not
const isRoutine = (i) => QUIET_KINDS.has(i.kind);
/** What deserves the hero: things that happen AT a time (events, minister bookings, planned
 *  restarts, scheduled to-dos). A timer finishing first doesn't hijack it — it becomes a small line. */
const MAJOR = new Set(["event", "booking", "plan", "task"]);
const HERO_WINDOW = 24 * 3600000;

/** Finished and waiting to be restarted: idle training camps and finished research (no newer
 *  research running in the same building), grouped by kind. */
function readyNow(accountIds, dataFor, now) {
  const camps = [], research = [];
  for (const a of accountIds) {
    const d = dataFor(a);
    const idle = idleCamps(d, now);
    if (idle) idle.camps.forEach((c) => camps.push({ a, name: c.camp }));
    const timers = (d.timers || []).filter((x) => x.kind === "research");
    const running = new Set(timers.filter((x) => x.endAt > now).map((x) => x.category));
    const done = new Set(timers.filter((x) => x.endAt <= now && !running.has(x.category)).map((x) => x.category));
    done.forEach((cat) => research.push({ a, name: cat }));
  }
  return { camps, research };
}

export function useReadyNow() {
  const { accountIds, dataFor, state } = useTimeHub();
  const now = useMinute();
  return useMemo(() => readyNow(accountIds, dataFor, now), [state, accountIds.join(), now]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useNextUp() {
  const { state, accountIds, dataFor } = useTimeHub();
  const now = useMinute();
  return useMemo(() => {
    const items = groupTraining(buildAgenda(state, now, now + 2 * DAY, accountIds, now))
      .filter((i) => (i.status === "upcoming" || i.status === "now") && !isRoutine(i));
    const major = items.find((i) => MAJOR.has(i.kind) && i.start - now <= HERO_WINDOW);
    const primary = major || items[0] || null;
    if (!primary) return null;
    // minister status for a combat event: one quiet line here; the actions live in Needs You
    let ministers = null;
    if (primary && primary.kind === "event" && primary.ref?.ev?.combat) {
      const rems = computeReminders(state, now, accountIds).filter((r) => r.ev.id === primary.ref.ev.id && r.occ.key === primary.ref.occ.key);
      if (rems.length) ministers = { total: rems.length, needed: needsAttention(rems).length };
    }
    // at most two small lines, in time order: something sooner than the hero (a timer), then after
    const small = items.filter((i) => i !== primary).slice(0, 2);
    return { primary, small, ministers };
  }, [state, accountIds.join(), now]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** The only per-second piece. */
function Clock({ to }) {
  const { lang } = useTimeHub();
  const now = useNow();
  return <span className="th-nextup-clock" role="timer"><Bidi>{formatCountdownClock(Math.max(0, to - now), lang)}</Bidi></span>;
}

function titleOf(i, t, templates) {
  if (i.group) return i.group.length === 3 ? t("allCampsFinish") : t("nCampsFinish", { n: i.group.length });
  return itemTitle(i, t, templates);
}

function SmallLine({ label, i }) {
  const { t, tz, lang, templates } = useTimeHub();
  const now = useMinute();
  return (
    <li className="th-nextup-line">
      <span className="th-nextup-lbl">{label}</span>
      <span className="th-nextup-txt">
        <b>{titleOf(i, t, templates)}</b> · <Ltr>{formatTime(i.start, tz, lang)}</Ltr>
        {i.start > now && <> · {t("inTime", { time: formatSpan(i.start - now, lang) })}</>}
      </span>
    </li>
  );
}

/** READY NOW · 5 — a compact count with groups; Review opens the individual actions.
 *  Lives BELOW the hero (never inside it). ≤ 2 things: shown directly with their action. */
export function ReadyNow() {
  const { t, multi, accountById, startTraining, setTab } = useTimeHub();
  const ready = useReadyNow();
  const [open, setOpen] = useState(false);
  const total = ready.camps.length + ready.research.length;
  if (!total) return null;
  const name = (x) => `${t(x.name)}${multi ? ` · ${accountById(x.a)?.name}` : ""}`;
  const campAccts = [...new Set(ready.camps.map((x) => x.a))];
  const restart = (a) => startTraining({ accountId: a, restart: true, camps: ready.camps.filter((x) => x.a === a).map((x) => x.name) });
  const details = (
    <ul className="th-ready-list">
      {campAccts.map((a) => (
        <li key={`c${a}`}>
          <span>{ready.camps.filter((x) => x.a === a).map((x) => t(`short_${x.name}`)).join(", ")}{multi ? ` · ${accountById(a)?.name}` : ""}</span>
          <button type="button" className="th-btn small gold" onClick={() => restart(a)}>↻ {t("restartShort")}</button>
        </li>
      ))}
      {ready.research.map((x, i) => (
        <li key={`r${i}`}><span>{name(x)}</span><button type="button" className="th-btn small" onClick={() => setTab("timers")}>{t("startResearchShort")}</button></li>
      ))}
    </ul>
  );
  return (
    <section className="th-ready" aria-label={t("readyNowTitle")}>
      <div className="th-home-head">
        <span className="th-home-label">{t("readyNowTitle")} · {total}</span>
        {total > 2 && <button type="button" className="th-link" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? t("showLess") : t("review")}</button>}
      </div>
      {total > 2 && !open && (
        <p className="th-ready-sum">
          {[ready.camps.length && `${t("readyCamps")} · ${ready.camps.length}`, ready.research.length && `${t("readyResearch")} · ${ready.research.length}`].filter(Boolean).join("   ")}
        </p>
      )}
      {(total <= 2 || open) && details}
    </section>
  );
}

export function NextUp({ data }) {
  const { t, tz, lang, templates } = useTimeHub();
  if (!data) return null;
  const { primary: p, small, ministers } = data;
  const live = p.status === "now" && p.end;
  const bear = p.kind === "event" && String(p.ref?.ev?.templateId || "").startsWith("bear_trap");
  return (
    <section className={`th-nextup ${bear ? "bear" : ""}`} aria-label={t("nextUp")}>
      {bear && <img className="th-nextup-art" src={pool} alt="" aria-hidden="true" decoding="async" />}
      <span className="th-nextup-eyebrow">{live ? t("happeningNow") : t("nextUp")} · {t(`kind_${p.kind}`)}</span>
      <h2 className="th-nextup-title">{titleOf(p, t, templates)}</h2>
      <div className="th-nextup-when"><Ltr>{formatTime(p.start, tz, lang)}</Ltr> · <Ltr>{formatTime(p.start, "UTC", lang)}</Ltr> UTC {p.accountId && <AccountTag accountId={p.accountId} />}</div>
      <div className="th-nextup-count">
        <span className="th-nextup-countlbl">{live ? t("endsIn") : FINISHES.has(p.kind) ? t("finishesIn") : t("startsIn")}</span>
        <Clock to={live ? p.end : p.start} />
      </div>
      {ministers && (
        ministers.needed
          ? <a href="#th-needs" className="th-nextup-status warn">{t("ministersNeededN", { n: ministers.needed })} ↓</a>
          : <span className="th-nextup-status ok">{t("allMinistersBooked")}</span>
      )}
      {small.length > 0 && (
        <ul className="th-nextup-more">
          {small.map((i, k) => {
            const label = i.start < p.start ? t("soonerWord") : small.slice(0, k).some((x) => x.start >= p.start) ? t("later") : t("thenWord");
            return <SmallLine key={i.id} label={label} i={i} />;
          })}
        </ul>
      )}
    </section>
  );
}
