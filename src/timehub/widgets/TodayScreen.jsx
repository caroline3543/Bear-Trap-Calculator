/* ============================================================
   TODAY — the default tab. Answers in a glance: what's next, how long,
   which account, the local time, and whether anything needs doing.
   Action cards (idle camps, minister bookings) → week strip → schedule.
   ============================================================ */
import React, { useMemo, useRef, useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { success } from "../lib/feedback.js";
import { EventForm } from "./EventsWidget.jsx";
import { useMinute, useClockFor } from "../hooks/useNow.jsx";
import { buildAgenda, groupContrib, groupTraining } from "../lib/agenda.js";
import { inSleepWindow } from "../lib/sleep.js";
import { todayView, scheduledToday, fitsIn, gapHint, setDone, notToday, placeAt, unplace, remindersDue, snoozeHour } from "../lib/todo.js";
import { researchReminder, VP_POSITION } from "../lib/research.js";

/** Whether ANY unfinished, unscheduled to-do exists — decides whether "+ Add task" opens the
 *  suggestion sheet first or goes straight to a blank form (no point suggesting from nothing). */
function useHasUnscheduledTasks() {
  return useTodayOpen().some((x) => x.start == null);
}
/** Today's open to-dos (recurring occurrences included), derived — never copied. */
function useTodayOpen() {
  const { state, tz } = useTimeHub();
  const now = useMinute();
  return useMemo(() => todayView(state.tasks, now, tz).open, [state.tasks, now, tz]);
}
import { computeReminders, needsAttention } from "../lib/reminders.js";
import { contribState, spendAttempt } from "../lib/contributions.js";
import { idleCamps, splitNow, stillRunning, weekStrip } from "../lib/today.js";
import { dropsNeedingAction, dropsBetween, staminaNow, intelNeedingAction, INTEL_MISSIONS_PER_REFRESH } from "../lib/daily.js";
import snowEdge from "../assets/snow-edge.webp";

import { buildTimeline, parseTaskDuration, placeTask, resizeTask, pruneTasks, rowChips, gapVisualHeight, taskVisualHeight, overdueTasks, findNextGap } from "../lib/plan.js";
import { champRounds } from "../lib/championship.js";
import { ChampQuestion } from "./ChampIntel.jsx";
import { localDayRange, formatTime, formatDate, formatSpan, zonedParts, formatWeekdayShort, formatDayNumber, HOUR, MINUTE, DAY } from "../lib/time.js";
import { Ltr, Bidi, AccountTag, Btn, Seg, SleepingBear, DurationFields, durFrom, durParse, CalendarButtons, BrushUnderline, SectionIcon, Remaining } from "../components/ui.jsx";
import { itemTitle, toCalendarItem } from "../components/labels.js";
import { ReminderRow } from "./ReminderRow.jsx";
import { useWhenLocal } from "./TimerCard.jsx";
import { useClaim } from "./DailyWidgets.jsx";
import { FriendsWidget, FriendTimes } from "./FriendsWidget.jsx";
import { SpendAllButton } from "./SpendAll.jsx";
import { NextUp, useNextUp, ReadyNow } from "./NextUp.jsx";
import { groupVpReminders } from "../lib/research.js";
import { eventName } from "../lib/events.js";
import { SwipeRow } from "./SwipeRow.jsx";
import { eventAccounts } from "../lib/friends.js";

const BUFF_NAME = { strategy: "buffStrategyName", defense: "buffDefenseName", neither: "buffNeither", unsure: "bookingUnknown" };

/* ---------- what needs doing (one card, like the calculator's steps) ---------- */
export function useNeeds() {
  const { state, accountIds, dataFor, tz } = useTimeHub();
  const now = useMinute(); // once a minute is plenty for "what needs doing"
  return useMemo(() => {
    const drops = dropsNeedingAction(state, accountIds, now);
    const stamina = (state.settings.track?.stamina === false ? [] : accountIds).map((a) => ({ a, s: staminaNow(dataFor(a).stamina, now) }))
      .filter(({ s }) => s && (s.over || s.atCap || (s.fullAt && s.fullAt - now <= HOUR)));
    const idle = accountIds.map((acc) => ({ acc, idle: idleCamps(dataFor(acc), now) })).filter((c) => c.idle);
    const minister = needsAttention(computeReminders(state, now, accountIds));
    const intel = intelNeedingAction(state, accountIds, now);
    const champ = state.settings.champ;
    const round = champ?.leader && champ.anchor ? champRounds(champ.anchor, now, now + 1).find((r) => r.start <= now && now < r.end) : null;
    // Vice President booking reminder for research nearing completion — only while PENDING
    // (booked ones are done; a dismissed occurrence stays dismissed until its slot changes).
    const vp = accountIds.flatMap((acc) => (dataFor(acc).timers || [])
      .filter((x) => x.kind === "research" && x.endAt > now)
      .map((x) => ({ acc, x, r: researchReminder(x, dataFor(acc).bookings, now, dataFor(acc).vpDismiss) }))
      .filter((e) => e.r && e.r.status === "pending"));
    const vpGroups = groupVpReminders(vp);
    // Alliance Contributions that are full RIGHT NOW (one grouped row, one Spend all)
    const contrib = state.settings.track?.contrib === false ? [] : accountIds.filter((a) => contribState(dataFor(a).contrib, now).full);
    // Education restart reminders the player accepted from the training planner
    const eduPlans = accountIds.flatMap((acc) => (dataFor(acc).plans || []).filter((p) => p.edu && p.startAt > now - 30 * MINUTE && p.startAt - now <= 3 * HOUR).map((p) => ({ acc, p })));
    // to-dos whose in-app reminder time has passed and that are still open today (one grouped row)
    const todoRem = remindersDue(todayView(state.tasks, now, tz), now, tz);
    const focus = state.settings.focus && state.settings.focus.endsAt > 0 && state.settings.focus.endsAt <= now ? state.settings.focus : null;
    const focusTask = focus ? (state.tasks || []).find((x) => x.id === focus.taskId) : null;
    const count = drops.length + stamina.length + idle.length + minister.length + (intel ? 1 : 0) + (round ? 1 : 0) + vpGroups.length + (contrib.length ? 1 : 0) + eduPlans.length + (todoRem.length ? 1 : 0) + (focusTask ? 1 : 0);
    return { drops, stamina, idle, minister, intel, round, vp: vpGroups, contrib, eduPlans, todoRem, focusTask, count };
  }, [state, accountIds.join(), now, tz]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** "Today" / "Tomorrow" / a date, for a moment in the player's own calendar ("" = today). */
function dayWordFor(at, now, tz, lang, t) {
  const a = zonedParts(at, tz), b = zonedParts(now, tz);
  const diff = Math.round((Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / DAY);
  // lower-case inside a sentence ("finishes tomorrow at"); a date stays as formatted
  return diff === 0 ? t("today").toLocaleLowerCase(lang) : diff === 1 ? t("tomorrow").toLocaleLowerCase(lang) : formatDate(at, tz, lang);
}

const NEED_ICON = {
  store: "M4 9l1.5-5h13L20 9M5 9v11h14V9M9 20v-6h6v6",
  boot: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM15 9l-2 6-4 0 2-6z",
  bolt: "M13 3L5 13.5h6L10 21l8-10.5h-6z",
  flame: "M12 3c1 3.2 4.5 4.8 4.5 9a4.5 4.5 0 0 1-9 0c0-1.8.8-3 1.8-4 .2 1.4 1 2 1.8 2C11.4 7.6 11 5.4 12 3z",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0",
  flask: "M9 3h6M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
};
const NeedIcon = ({ name, warm }) => (
  <span className={`th-need-ic ${warm ? "warm" : ""}`} aria-hidden="true">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={NEED_ICON[name] || NEED_ICON.bell} /></svg>
  </span>
);

function NeedRow({ tone = "warm", title, sub, children, leaving, icon = "bell" }) {
  return (
    <div className={`th-need ${tone} ${leaving ? "leaving" : ""}`}>
      <NeedIcon name={icon} warm={tone === "amber" || tone === "warm"} />
      <div className="th-need-main"><div className="th-need-title">{title}</div><div className="th-need-sub">{sub}</div></div>
      {children}
    </div>
  );
}

/** One Vice President booking (account + 30-min slot). Compact by default: who, when (local),
 *  what it covers, and Book. Tapping the card opens UTC, the covered researches, Booked, Dismiss. */
function VpCard({ g, now, leaving, onBook, onBooked, onDismiss }) {
  const { t, tz, lang, accountById } = useTimeHub();
  const [open, setOpen] = useState(false);
  const tmr = localDayRange(now, tz, 0).end <= g.slot.start;
  const when = <>{tmr ? `${t("tomorrowLower")} ` : ""}<Ltr>{formatTime(g.slot.start, tz, lang)}–{formatTime(g.slot.end, tz, lang)}</Ltr></>;
  const covers = g.items.map((i) => `${t(i.x.category)} · ${formatTime(i.r.finishAt, tz, lang)}`).join(", ");
  return (
    <div className={`th-vp-card ${open ? "open" : "compact"} ${leaving ? "leaving" : ""}`}>
      <button type="button" className="th-vp-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="th-vp-eyebrow">{t("vpShort")}</span>
        <b className="th-vp-acct">{accountById(g.acc)?.name} · {when}</b>
        {!open && <span className="th-vp-sub">{covers}</span>}
        <span className="th-vp-chev" aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <>
          <div className="th-vp-block">
            <span className="th-vp-lbl">{t("bookColon")}</span>
            <span><b>{when}</b> {t("localWord")}</span>
            <span className="th-utc"><Ltr>{formatTime(g.slot.start, "UTC", lang)}–{formatTime(g.slot.end, "UTC", lang)}</Ltr> UTC</span>
          </div>
          <div className="th-vp-block">
            <span className="th-vp-lbl">{t("coversColon")}</span>
            <ul className="th-vp-covers">{g.items.map((i) => <li key={i.x.id}>{t(i.x.category)} · <Ltr>{formatTime(i.r.finishAt, tz, lang)}</Ltr></li>)}</ul>
            {g.items.some((i) => i.r.conflict) && <span className="th-utc">{t("vpConflictShort")}</span>}
          </div>
        </>
      )}
      <div className={`th-vp-acts ${open ? "" : "one"}`}>
        <Btn small tone="gold" className="th-vp-book" aria-label={t("bookVpShort")} onClick={onBook}>{t("bookShort")}</Btn>
        {open && <Btn small onClick={onBooked}>{t("iBookedIt")}</Btn>}
        {open && <Btn small onClick={onDismiss}>{t("dismiss")}</Btn>}
      </div>
    </div>
  );
}

/** Needs You, prioritised by immediacy: NOW (act on it) above COMING UP (plan for it).
 *  One concise row per situation — several full Contributions accounts share one row. */
function NeedsYou({ hiddenKeys }) {
  const { t, tz, lang, accountById, startTraining, setTab, updateAccount, update, openBooking, notify, newId, templates } = useTimeHub();
  const now = useMinute();
  const when = useWhenLocal();
  const claim = useClaim();
  const [asking, setAsking] = useState([]);
  const [leaving, setLeaving] = useState([]);
  // let the row slide away first, then update (feels like it was dealt with, not just vanished)
  const later = (key, fn) => { setLeaving((l) => [...l, key]); setTimeout(fn, 230); };
  const n0 = useNeeds();
  const minister = n0.minister.filter((r) => !hiddenKeys?.has(r.key));
  const n = { ...n0, minister, count: n0.count - (n0.minister.length - minister.length) - n0.idle.length };
  const [all, setAll] = useState(false);
  const [moreMin, setMoreMin] = useState([]); // minister boxes expanded to every account
  if (!n.count) return null;
  // one booking action covers every research in the slot: dismiss / book them together
  const dismissVpGroup = (g) => {
    const at = Date.now();
    updateAccount(g.acc, (d) => ({ ...d, vpDismiss: { ...(d.vpDismiss || {}), ...Object.fromEntries(g.keys.map((k) => [k, at])) } }));
    notify([t("vpDismissed"), t("vpDismissedSub")]);
  };
  // "I've booked it" records the VP booking itself, so BOOKED is derived everywhere (Research card,
  // Timeline, Next Up) from the one real bookings list — never a separate flag.
  const bookedVpGroup = (g) => {
    updateAccount(g.acc, (d) => (d.bookings.some((b) => b.position === "vice_president" && b.startAt === g.slot.start) ? d
      : { ...d, bookings: [...d.bookings, { id: newId(), position: "vice_president", startAt: g.slot.start, notes: "", createdAt: Date.now() }] }));
    success();
  };
  const dismissMinister = (r) => {
    update((s) => ({ ...s, reminders: { ...s.reminders, [r.key]: { state: "dismissed", buff: null } } }));
    notify([t("reminderDismissed"), t("vpDismissedSub")]);
  };
  const SOON_MS = 2 * HOUR;
  const nowRows = [];
  const soonRows = [];

  for (const { drop: d, status, accounts } of n.drops) {
    (status === "ready" ? nowRows : soonRows).push(
      <NeedRow key={d.key} tone="gold" icon={d.kind === "store" ? "store" : "boot"} leaving={leaving.includes(d.key)}
        title={`${d.kind === "store" ? t("dropStore", { n: d.amount }) : t("dropTrek", { n: d.amount })} · ${formatTime(d.at, tz, lang)}`}
        sub={<>{status === "ready" ? t("readyToClaim") : t("inTime", { time: formatSpan(d.at - now, lang) })} · {accounts.length > 1 ? t("nAccounts", { n: accounts.length }) : accountById(accounts[0])?.name}</>}>
        {status === "ready" && <Btn small onClick={() => later(d.key, () => claim(d))}>{t("claimed")}</Btn>}
      </NeedRow>
    );
  }
  if (n.round) nowRows.push(<NeedRow key="champ" tone="gold" icon="bell" title={t("champRoundOpen", { n: n.round.round })} sub={t("champRoundUntil", { time: formatTime(n.round.end, tz, lang) })} />);
  for (const { a, s } of n.stamina) {
    (s.over || s.atCap ? nowRows : soonRows).push(
      <NeedRow key={`st${a}`} tone="amber" icon="bolt"
        title={s.over || s.atCap ? t("staminaAtCapShort") : t("staminaSoon", { time: formatSpan(s.fullAt - now, lang) })}
        sub={<><AccountTag accountId={a} /> {t("regenStops")}</>}>
        <Btn small onClick={() => setTab("timers")}>{t("update")}</Btn>
      </NeedRow>
    );
  }
  if (n.focusTask) {
    nowRows.push(
      <NeedRow key="focus" tone="gold" icon="flame" title={t("fiveMinDone")} sub={n.focusTask.title}>
        <Btn small tone="gold" onClick={() => setTab("todos")}>{t("openShort")}</Btn>
      </NeedRow>
    );
  }
  if (n.todoRem.length) {
    const names = n.todoRem.slice(0, 3).map((x) => x.title).join(", ") + (n.todoRem.length > 3 ? ` +${n.todoRem.length - 3}` : "");
    nowRows.push(
      <NeedRow key="todorem" tone="gold" icon="flag" title={t("stillAvailableToday")} sub={names}>
        <Btn small onClick={() => { const at = Date.now(); const ids = new Set(n.todoRem.map((x) => x.id)); update((s) => ({ ...s, tasks: s.tasks.map((x) => (ids.has(x.id) ? snoozeHour(x, at, tz) : x)) })); }}>{t("laterShort")}</Btn>
        <Btn small tone="gold" onClick={() => setTab("todos")}>{t("openShort")}</Btn>
      </NeedRow>
    );
  }
  if (n.contrib.length) {
    nowRows.push(
      <NeedRow key="contrib" tone="gold" icon="flag" title={t("contribFull")}
        sub={<>{n.contrib.map((a) => <AccountTag key={a} accountId={a} />)} {t("contribFullSub")}</>}>
        <SpendAllButton accountIds={n.contrib} />
      </NeedRow>
    );
  }
  if (n.intel) {
    (n.intel.next - now <= 15 * MINUTE ? nowRows : soonRows).push(
      <NeedRow key={n.intel.key} tone="gold" icon="flask" leaving={leaving.includes(n.intel.key)}
        title={t("intelSoon", { time: formatTime(n.intel.next, tz, lang) })}
        sub={<>{t("intelSoonSub", { in: formatSpan(n.intel.next - now, lang) })} · {n.intel.accounts.length > 1 ? t("nAccounts", { n: n.intel.accounts.length }) : accountById(n.intel.accounts[0])?.name}</>}>
        <Btn small onClick={() => later(n.intel.key, () => { const at = Date.now(); n.intel.accounts.forEach((a) => updateAccount(a, (d) => ({ ...d, claims: { ...d.claims, [n.intel.key]: at } }))); success(); })}>{t("cleared")}</Btn>
      </NeedRow>
    );
  }
  for (const { acc, p } of n.eduPlans) {
    (p.startAt - now <= 15 * MINUTE ? nowRows : soonRows).push(
      <NeedRow key={`edu${p.id}`} tone="gold" icon="flame"
        title={t("restartWithEduAt", { time: formatTime(p.startAt, tz, lang) })}
        sub={<><AccountTag accountId={acc} /> <Ltr>{formatTime(p.startAt, "UTC", lang)}</Ltr> UTC · {p.startAt > now ? t("inTime", { time: formatSpan(p.startAt - now, lang) }) : t("happeningNow")}</>}>
        <Btn small onClick={() => startTraining({ accountId: acc, edu: true })}>{t("trainingPlan")}</Btn>
      </NeedRow>
    );
  }
  for (const g of n.vp) {
    const id = `vp${g.acc}${g.slot.start}`;
    soonRows.push(
      <SwipeRow key={id} label={t("vpBookTitle", { utc: `${formatTime(g.slot.start, "UTC", lang)}–${formatTime(g.slot.end, "UTC", lang)}` })} onDismiss={() => dismissVpGroup(g)}>
        <VpCard g={g} now={now} leaving={leaving.includes(id)}
          onBook={() => later(id, () => openBooking({ accountId: g.acc, startAt: g.slot.start, position: "vice_president" }))}
          onBooked={() => later(id, () => bookedVpGroup(g))} onDismiss={() => dismissVpGroup(g)} />
      </SwipeRow>
    );
  }
  if (n.minister.length) {
    const urgent = n.minister.filter((r) => r.occ.start - now <= SOON_MS);
    const later2 = n.minister.filter((r) => r.occ.start - now > SOON_MS);
    const box = (list, key) => list.length > 0 && (
      <div key={key} className="th-need gold col">
        <span className="th-action-label">{t("ministerNeeded", { n: list.length })}</span>
        {(moreMin.includes(key) ? list : list.slice(0, 1)).map((r) => (
          <SwipeRow key={r.key + (asking.includes(r.key) ? "f" : "s")} label={t("ministerNeededShort")} onDismiss={() => dismissMinister(r)}>
            <ReminderRow r={r} slim={!asking.includes(r.key)} onAsk={() => setAsking([...asking, r.key])} />
          </SwipeRow>
        ))}
        {list.length > 1 && !moreMin.includes(key) && (
          <button type="button" className="th-link th-min-more" onClick={() => setMoreMin([...moreMin, key])}>
            {t("alsoNeedOne", { names: list.slice(1).map((r) => accountById(r.accountId)?.name).join(", ") })} · {t("showWord")}
          </button>
        )}
      </div>
    );
    if (urgent.length) nowRows.push(box(urgent, "min-now"));
    if (later2.length) soonRows.push(box(later2, "min-soon"));
  }

  // Importance, not insertion order: a minister needed for the next combat event comes first,
  // routine claims last. The two most important rows stay visible; the rest fold behind Review.
  const RANK = [["min-now", 0], ["min-soon", 0], ["focus", 1], ["contrib", 2], ["vp", 3], ["edu", 3], ["champ", 5], ["todorem", 6], ["st", 7]];
  const rank = (el) => { const k = String(el.key); const hit = RANK.find(([p]) => k.startsWith(p)); return hit ? hit[1] : 9; };
  nowRows.sort((a, b) => rank(a) - rank(b));
  soonRows.sort((a, b) => rank(a) - rank(b));
  // ACTION TYPES first (one line each); the detailed rows are behind Review. A single action shows
  // its full row straight away, so it can be resolved without an extra tap.
  const nm = (a) => accountById(a)?.name || "";
  const summary = [];
  if (n.minister.length) {
    const evs = [...new Set(n.minister.map((r) => eventName(r.ev, t, templates)))];
    summary.push({ k: "min", text: t("sumMinister", { what: evs.join(", "), n: new Set(n.minister.map((r) => r.accountId)).size }) });
  }
  if (n.focusTask) summary.push({ k: "focus", text: `${t("fiveMinDone")} · ${n.focusTask.title}` });
  if (n.contrib.length) summary.push({ k: "contrib", text: t("sumContrib", { n: n.contrib.length }) });
  for (const g of n.vp.slice(0, 2)) {
    const tmr = localDayRange(now, tz, 0).end <= g.slot.start;
    summary.push({ k: `vp${g.acc}${g.slot.start}`, text: `${t("vpShort")} · ${nm(g.acc)}`,
      sub: `${tmr ? `${t("tomorrow")} ` : ""}${formatTime(g.slot.start, tz, lang)}–${formatTime(g.slot.end, tz, lang)}${g.items.length > 1 ? ` · ${t("coversN", { n: g.items.length })}` : ""}` });
  }
  if (n.vp.length > 2) summary.push({ k: "vpmore", text: t("sumVpMore", { n: n.vp.length - 2 }) });
  if (n.eduPlans.length) summary.push({ k: "edu", text: t("restartWithEduAt", { time: formatTime(n.eduPlans[0].p.startAt, tz, lang) }) });
  if (n.round) summary.push({ k: "champ", text: t("champRoundOpen", { n: n.round.round }) });
  if (n.todoRem.length) summary.push({ k: "todorem", text: `${t("stillAvailableToday")} · ${n.todoRem.length}` });
  if (n.stamina.length) summary.push({ k: "st", text: t("sumStamina", { n: n.stamina.length }) });
  if (n.drops.length) summary.push({ k: "drops", text: t("sumClaims", { n: n.drops.length }) });
  if (n.intel) summary.push({ k: "intel", text: t("intelSoon", { time: formatTime(n.intel.next, tz, lang) }) });
  const actions = summary.length;
  const collapsed = actions > 1 && !all;
  if (!nowRows.length && !soonRows.length) return null;
  return (
    <section className="th-needs-sec" id="th-needs" aria-label={t("needsYou")}>
      <div className="th-home-head">
        <h2 className="th-home-label urgent">{t("needsYou")} · {actions}</h2>
        {actions > 1 && <button type="button" className="th-link" aria-expanded={all} onClick={() => setAll(!all)}>{all ? t("showLess") : t("review")}</button>}
      </div>
      {collapsed ? (
        <ul className="th-sum-list">
          {summary.slice(0, 4).map((x) => <li key={x.k}><span>{x.text}{x.sub && <small>{x.sub}</small>}</span></li>)}
          {summary.length > 4 && <li className="th-sum-more">{t("plusNMore", { n: summary.length - 4 })}</li>}
        </ul>
      ) : (
        <div className="th-needs">
          {nowRows.length > 0 && soonRows.length > 0 && <div className="th-needs-tier now" role="heading" aria-level={3}>{t("tierNow")}</div>}
          {nowRows}
          {soonRows.length > 0 && nowRows.length > 0 && <div className="th-needs-tier" role="heading" aria-level={3}>{t("tierComingUp")}</div>}
          {soonRows}
        </div>
      )}
    </section>
  );
}

/* ---------- the Bear Trap hero: what's next, how long, who still needs a minister ---------- */
/** Like the calculator's AVAILABLE / ALLOCATED strip. */
export function StatStrip() {
  const { t, tz, lang } = useTimeHub();
  const now = useMinute();
  const n = useNeeds();
  return (
    <div className="th-stats in-header th-statline" role="group" aria-label={t("atAGlance")}>
      <span><b><Ltr>{formatTime(now, tz, lang)}</Ltr></b> {t("statLocalWord")}</span>
      <span><b><Ltr>{formatTime(now, "UTC", lang)}</Ltr></b> UTC</span>
      <span className={n.count ? "todo" : "clear"}><b key={n.count} className="th-bump">{n.count || "✓"}</b> {t("statToDoWord")}</span>
    </div>
  );
}

/* ---------- week strip ---------- */
function WeekStrip({ offset, setOffset }) {
  const { t, tz, lang, state, accountIds } = useTimeHub();
  const now = useMinute();
  const days = useMemo(() => weekStrip(state, accountIds, now, tz), [state, accountIds.join(), Math.floor(now / 3600000), tz]); // eslint-disable-line react-hooks/exhaustive-deps
  const wd = { format: (ms) => formatWeekdayShort(ms, tz, lang) };
  const dn = { format: (ms) => formatDayNumber(ms, tz, lang) };
  return (
    <div className="th-week" aria-label={t("thisWeek")}>
      <div className="th-week-days" role="group" aria-label={t("chooseDay")}>
        {days.map((d) => (
          <button key={d.offset} type="button" aria-pressed={offset === d.offset} className={d.offset === 0 ? "today" : ""} onClick={() => setOffset(d.offset)}
            aria-label={`${formatDate(d.start + 1, tz, lang)}${d.dots.length ? ` · ${d.dots.map((k) => t(`dot_${k}`)).join(", ")}` : ""}`}>
            <small>{wd.format(d.start + 1)}</small>
            <b>{dn.format(d.start + 1)}</b>
            <span className="th-dots">{d.dots.map((k) => <i key={k} className={`d-${k}`} />)}</span>
          </button>
        ))}
      </div>
      <div className="th-legend">
        {["bear", "foundry", "frostfire", ...(state.settings.champ?.leader && state.settings.champ.anchor ? ["champ"] : [])].map((k) => <span key={k}><i className={`d-${k}`} />{t(`dot_${k}`)}</span>)}
      </div>
    </div>
  );
}

/* ---------- one schedule row ---------- */
function UpdateTime({ item, onDone }) {
  const { t, updateAccount } = useTimeHub();
  const now = Date.now(); // only used to prefill
  const ids = item.group ? item.group.map((g) => g.id) : [item.ref.id];
  const [v, setV] = useState(durFrom(item.start - now));
  const save = () => {
    const r = durParse(v);
    if (r.error) return;
    const at = Date.now();
    updateAccount(item.accountId, (d) => ({ ...d, timers: d.timers.map((x) => (ids.includes(x.id) ? { ...x, endAt: at + r.ms, startedAt: Math.min(x.startedAt, at) } : x)) }));
    success();
    onDone();
  };
  return (
    <div className="th-row-edit">
      <DurationFields value={v} onChange={setV} label={t("updateTimeLeft")} />
      <div className="th-item-actions">
        <Btn small tone="gold" onClick={save}>{t("save")}</Btn>
        <Btn small onClick={onDone}>{t("cancel")}</Btn>
      </div>
    </div>
  );
}

function Row({ i, day, rems, open, setOpen, isNext }) {
  const { t, tz, lang, dir, templates, updateAccount, openBooking, setTab, accountById, update, accountIds: accountIdsAll, startTraining } = useTimeHub();
  const claim = useClaim();
  const now = useClockFor([i.start - 5 * 60000, i.start]); // only for the "under 5 minutes" styling
  const [editing, setEditing] = useState(false);
  const [eventEditing, setEventEditing] = useState(false);
  const deleteEvent = () => {
    if (!window.confirm(t("confirmDeleteSchedule"))) return;
    update((s) => ({
      ...s, events: s.events.filter((e) => e.id !== i.ref.ev.id),
      reminders: Object.fromEntries(Object.entries(s.reminders).filter(([k]) => !k.startsWith(i.ref.ev.id + "|"))),
    }));
    success();
  };
  const x0 = useRef(null);
  const swiped = useRef(false);
  const crossesIn = i.start < day.start;
  const myRems = i.kind === "event" ? rems.filter((r) => r.ev.id === i.ref.ev.id && r.occ.key === i.ref.occ.key) : [];
  const timer = (i.kind === "training" || i.kind === "research") && i.status !== "done";
  const title = i.group ? (i.group.length === 3 ? t("allCampsFinish") : t("nCampsFinish", { n: i.group.length })) : itemTitle(i, t, templates);

  const onPointerDown = (e) => { x0.current = e.clientX; };
  const onPointerUp = (e) => {
    if (x0.current == null) return;
    const dx = e.clientX - x0.current;
    x0.current = null;
    const back = dir === "rtl" ? -dx : dx; // swipe toward the start edge opens
    if (back < -40) { setOpen(true); swiped.current = true; }
    else if (back > 40) { setOpen(false); swiped.current = true; }
  };

  const actions = [];
  if (i.kind === "contrib") {
    actions.push(<SpendAllButton key="spend" accountIds={[i.accountId]} />);
  }
  if (i.kind === "contribGroup") {
    actions.push(<SpendAllButton key="spend" accountIds={i.ref.members.map((m) => m.accountId)} />);
  }
  const need = myRems.find((r) => r.status === "open" || r.status === "unsure");
  if (need) actions.push(<Btn key="book" small tone="gold" onClick={() => openBooking({ accountId: need.accountId, startAt: Math.floor(need.occ.start / 1800000) * 1800000, position: "minister_strategy", eventKey: need.key })}>{t("bookShort")} · {accountById(need.accountId)?.name}</Btn>);
  if (timer) actions.push(<Btn key="upd" small onClick={() => { setEditing(true); setOpen(false); }}>{t("updateTimeLeft")}</Btn>);
  if (i.kind === "booking") actions.push(<Btn key="bk" small onClick={() => setTab("events")}>{t("secBookings")}</Btn>);
  if (i.kind === "booking" && i.ref?.position === "minister_education") actions.push(<Btn key="edu" small tone="gold" onClick={() => startTraining({ accountId: i.accountId, edu: true })}>{t("trainingPlan")}</Btn>);
  if (i.kind === "drop" && i.status !== "upcoming" && i.ref.drop.manual && i.ref.statuses.includes("ready")) actions.push(<Btn key="cl" small onClick={() => claim(i.ref.drop)}>{t("claimed")}</Btn>);
  if (i.kind === "stamina") actions.push(<Btn key="stu" small onClick={() => setTab("timers")}>{t("update")}</Btn>);
  if (i.kind === "event") {
    actions.push(<Btn key="ed" small onClick={() => { setEventEditing(true); setOpen(false); }}>{t("edit")}</Btn>);
    actions.push(<Btn key="del" small tone="danger" onClick={deleteEvent}>{t("delete")}</Btn>);
  }
  // things some players don't care about can be switched off right here
  const trackKey = i.kind === "drop" ? i.ref.drop.kind : i.kind === "stamina" ? "stamina" : i.kind === "contrib" ? "contrib" : i.kind === "intel" ? "intel" : i.kind === "event" && i.ref.ev.templateId === "daily_reset" ? "reset" : null;
  if (i.kind === "intel" && i.status === "now") actions.push(<Btn key="ic" small onClick={() => { const at = Date.now(); accountIdsAll.forEach((a) => updateAccount(a, (d) => ({ ...d, claims: { ...d.claims, [i.ref.key]: at } }))); success(); }}>{t("cleared")}</Btn>);
  if (trackKey) actions.push(<Btn key="untrack" small onClick={() => update((s) => ({ ...s, settings: { ...s.settings, track: { ...s.settings.track, [trackKey]: false } } }))}>{t("dontTrack")}</Btn>);
  if (i.kind === "plan") actions.push(<Btn key="pl" small onClick={() => updateAccount(i.accountId, (d) => ({ ...d, plans: (d.plans || []).filter((p) => p.id !== i.ref.id) }))}>{t("dismiss")}</Btn>);
  actions.push(<CalendarButtons key="cal" items={[toCalendarItem(i, t, templates, accountById(i.accountId)?.name)]} filename={i.id} />);

  return (
    <li className={`th-srow ${i.status} ${open ? "open" : ""} ${isNext ? "next" : ""} ${i.kind === "drop" && i.ref.drop.manual && i.status !== "done" ? "hl" : ""}`}>
      <div className="th-srow-main" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <button type="button" className="th-srow-hit" aria-expanded={open} aria-label={`${title} · ${t("options")}`} onClick={() => { if (swiped.current) { swiped.current = false; return; } setOpen(!open); }} />
        <span className="th-srow-time">
          <b><Ltr>{crossesIn ? "…" : formatTime(i.start, tz, lang)}</Ltr></b>
          <small><Ltr>{formatTime(i.start, "UTC", lang)}</Ltr> UTC</small>
        </span>
        <span className={`th-rail-dot ${isNext ? "now" : ""}`} aria-hidden="true" />
        <span className="th-srow-body">
          <span className="th-srow-title">{title}</span>
          <span className="th-srow-tags">
            <AccountTag accountId={i.accountId} />
            {timer && (
              <button type="button" className={`th-countbtn ${i.start - now < 5 * 60000 ? "urgent" : ""}`} onClick={() => setEditing(!editing)} aria-label={`${t("updateTimeLeft")}: ${title}`}>
                <span className="th-lc">{t("eduInWord")}</span> <Remaining to={i.start} fmt="countdown" />
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
              </button>
            )}
            {i.kind === "contrib" && <span className="th-srow-note">{t("contribPredicted", { n: i.ref.count, max: i.ref.max })}</span>}
            {i.kind === "drop" && <span className={`th-srow-note ${i.ref.drop.manual ? "warn" : ""}`}>{i.ref.drop.manual ? t("claimByHand") : t("automatic")} · {t("allAccountsShort")}</span>}
            {i.kind === "stamina" && <span className="th-srow-note">{t("regenStops")}</span>}
            {i.kind === "intel" && <span className="th-srow-note">{t("intelRowNote", { n: INTEL_MISSIONS_PER_REFRESH })}</span>}
            {i.kind === "champ" && <span className="th-srow-note warn">{t("champRowNote", { time: formatTime(i.end, tz, lang) })}</span>}
            {i.group && <span className="th-srow-note">{i.group.map((g) => (g.troop === "helios" ? t("heliosCamp", { camp: t(`short_${g.category}`) }) : t(`short_${g.category}`))).join(" · ")}</span>}
            {i.group && i.groupEnd > i.start && <span className="th-srow-note">{t("allReadyBy", { time: formatTime(i.groupEnd, tz, lang) })}</span>}
            {crossesIn && <span className="th-srow-note">{t("fromYesterday")}</span>}
            {i.end && i.end > day.end && <span className="th-srow-note">{t("continuesTomorrow")}</span>}
          </span>
          {rowChips(i.accountId, myRems).reminders.map((r) => {
            const ok = r.status === "covered" || r.status === "booked";
            const txt = r.status === "covered" ? t(r.booking.position) : r.status === "booked" || r.status === "unsure" ? t(BUFF_NAME[r.buff] || "bookingUnknown") : r.status === "dismissed" ? t("reminderDismissed") : t("ministerNeededShort");
            return <span key={r.key} className={`th-min ${ok ? "ok" : "todo"}`}>{r.chip && <><AccountTag accountId={r.accountId} /> </>}{ok ? "✓ " : ""}{txt}</span>;
          })}
          {i.kind === "event" && i.ref.ev.templateId !== "daily_reset" && i.status !== "done" && <FriendTimes at={i.start} accountIds={eventAccounts(i.ref.ev, accountIdsAll)} compact />}
        </span>
      </div>
      {open && <div className="th-srow-actions">{actions}</div>}
      {editing && <UpdateTime item={i} onDone={() => setEditing(false)} />}
      {eventEditing && <div className="th-srow-editform"><EventForm initial={i.ref.ev} occKey={i.ref.occ.key} onDone={() => setEventEditing(false)} /></div>}
    </li>
  );
}

/* ---------- personal tasks & free time ---------- */
function TaskForm({ gap, task, onDone }) {
  const { t, lang, update, newId } = useTimeHub();
  const [title, setTitle] = useState(task?.title || "");
  const [dur, setDur] = useState(task ? String(Math.round((task.end - task.start) / 60000)) : "");
  const [warn, setWarn] = useState(null);
  const ms = parseTaskDuration(dur);
  const save = (overrideMs, force) => {
    const len = overrideMs ?? ms;
    if (!title.trim() || !len) return;
    if (task) {
      update((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id !== task.id ? x : x.repeat
        ? { ...x, title: title.trim(), durationMs: len, placed: x.placed ? { ...x.placed, end: x.placed.start + len } : x.placed }
        : { ...resizeTask(x, len), title: title.trim() })) }));
      success();
      return onDone();
    }
    const p = placeTask(gap, len);
    if (!p.fits && !force) return setWarn({ len, free: gap.ms });
    update((s) => ({ ...s, tasks: [...pruneTasks(s.tasks, Date.now()), { id: newId(), title: title.trim(), category: "personal", durationMs: len, start: p.start, end: p.end, accountId: null, important: null, done: false, createdAt: Date.now() }] }));
    success();
    onDone();
  };
  return (
    <form className="th-taskform" onSubmit={(e) => { e.preventDefault(); save(); }}>
      {!task && <p className="th-task-avail">{t("availableTime", { time: formatSpan(gap.ms, lang) })}</p>}
      <label><span className="th-label">{t("taskName")}</span>
        <input className="th-input" autoFocus value={title} maxLength={120} placeholder={t("taskPlaceholder")} onChange={(e) => { setTitle(e.target.value); setWarn(null); }} />
      </label>
      <label><span className="th-label">{t("howLong")}</span>
        <input className="th-input th-task-dur" inputMode="numeric" value={dur} placeholder="30" onChange={(e) => { setDur(e.target.value.replace(/[^\d:]/g, "")); setWarn(null); }} />
        <span className="th-hint">{dur ? (ms ? `${dur} → ${formatSpan(ms, lang)}` : t("durInvalidTask")) : t("durTaskHint")}</span>
      </label>
      {warn ? (
        <div className="th-limit" role="alert">
          <span>{t("taskTooLong", { len: formatSpan(warn.len, lang), free: formatSpan(warn.free, lang) })}</span>
          <span className="th-item-actions">
            <Btn small tone="gold" onClick={() => save(Math.floor(warn.free / 60000) * 60000)}>{t("shortenToFit")}</Btn>
            <Btn small onClick={() => save(warn.len, true)}>{t("scheduleAnyway")}</Btn>
            <Btn small onClick={onDone}>{t("cancel")}</Btn>
          </span>
        </div>
      ) : (
        <div className="th-item-actions">
          <Btn small tone="gold" type="submit" disabled={!title.trim() || !ms}>{task ? t("save") : t("add")}</Btn>
          <Btn small onClick={onDone}>{t("cancel")}</Btn>
        </div>
      )}
    </form>
  );
}

/** A quiet annotation inside a free-time block for a passive status update (Alliance
 *  Contributions reaching full) — never its own timeline row, never implies the block is busy.
 *  A lone account shows compactly; several within the grouping window collapse to one card with
 *  progressive disclosure ("+N more") and a single bulk "Spend all". */
function GapNotice({ item }) {
  const { t, tz, lang, updateAccount } = useTimeHub();
  const [expanded, setExpanded] = useState(false);
  const members = item.kind === "contribGroup" ? item.ref.members : [item];
  const shown = expanded ? members : members.slice(0, 3);
  const restN = members.length - shown.length;
  return (
    <div className="th-gap-notice">
      <div className="th-gap-notice-head">
        <span className="th-gap-notice-title">{t("contribFull")}</span>
        {members.length > 1 && <span className="th-gap-notice-when"><Ltr>{formatTime(members[0].start, tz, lang)}</Ltr>–<Ltr>{formatTime(members[members.length - 1].start, tz, lang)}</Ltr></span>}
      </div>
      <ul className="th-gap-notice-list">
        {shown.map((m) => (
          <li key={m.accountId}><AccountTag accountId={m.accountId} /><Ltr>{formatTime(m.start, tz, lang)}</Ltr></li>
        ))}
      </ul>
      <div className="th-gap-notice-foot">
        {restN > 0 && <button type="button" className="th-link" onClick={() => setExpanded(true)}>{t("moreN", { n: restN })}</button>}
        <SpendAllButton accountIds={members.map((m) => m.accountId)} />
      </div>
    </div>
  );
}

/** Tapping "+ Add task" in a gap shouldn't open a blank form first — Time Hub already knows what's
 *  unfinished and how long things take, so it suggests what actually fits before asking for
 *  something new. Picking a suggestion schedules that exact task (no duplicate created). */
function GapTaskSheet({ gap, onNew, onDone }) {
  const { t, lang, tz, update } = useTimeHub();
  const unscheduled = useTodayOpen().filter((x) => x.start == null);
  const fits = fitsIn(unscheduled, gap.ms);
  const tooLong = unscheduled.filter((x) => x.durationMs && x.durationMs > gap.ms);
  const [showLong, setShowLong] = useState(false);
  const place = (task) => {
    const p = placeTask(gap, task.durationMs);
    const at = Date.now();
    update((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === task.id ? placeAt(x, p.start, p.end, at, tz) : x)) }));
    success();
    onDone();
  };
  return (
    <div className="th-gap-sheet">
      <p className="th-task-avail">{t("availableTime", { time: formatSpan(gap.ms, lang) })}</p>
      {fits.length > 0 && (
        <>
          <span className="th-label">{t("thingsThatFit")}</span>
          <ul className="th-slist">
            {fits.map((task) => (
              <li key={task.id} className="th-todo-row">
                <button type="button" className="th-gap-fit" onClick={() => place(task)}>
                  <span className="th-todo-check-dot" aria-hidden="true" />
                  <span className="th-todo-main"><span className="th-todo-title">{task.title}</span><span className="th-todo-meta">{formatSpan(task.durationMs, lang)}{task.essential ? ` · ${t("essentialShort")}` : ""}{task.recurring ? " · ↻" : ""}</span></span>
                  <span className="th-gap-addhere">{t("addHere")}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {tooLong.length > 0 && (
        <div className="th-gap-toolong">
          <button type="button" className="th-link" onClick={() => setShowLong(!showLong)}>{t("needsMoreTime", { n: tooLong.length })}</button>
          {showLong && <ul className="th-slist">{tooLong.map((task) => <li key={task.id} className="th-todo-meta">{task.title} · {formatSpan(task.durationMs, lang)}</li>)}</ul>}
        </div>
      )}
      <div className="th-item-actions">
        <Btn small tone="gold" onClick={onNew}>{t("newTask")}</Btn>
        <Btn small onClick={onDone}>{t("cancel")}</Btn>
      </div>
    </div>
  );
}

function GapRow({ gap }) {
  const { t, lang, state, tz } = useTimeHub();
  const [mode, setMode] = useState(null); // null | "sheet" | "form"
  const open = useTodayOpen();
  // free time that is mostly sleep isn't task time: say so, and don't offer tasks there
  const asleep = gap.ms >= HOUR && inSleepWindow(gap.start + gap.ms / 2, tz, state.settings.sleep) && inSleepWindow(gap.start + Math.min(30 * MINUTE, gap.ms), tz, state.settings.sleep);
  const hasUnscheduled = open.some((x) => x.start == null);
  // "3 of your To-dos fit here" — only where the free-time preference allows (breathing room)
  const hint = !asleep && gap.end > Date.now() ? gapHint(open, Math.min(gap.ms, gap.end - Date.now()), state.settings.taskSuggest) : null;
  const openTap = () => setMode(hasUnscheduled ? "sheet" : "form");
  // time blindness: the block's own height gives a visual sense of "how much time" (12–96px),
  // the text gives the exact number — neither replaces the other.
  const h = gapVisualHeight(gap.ms);
  const big = gap.ms >= 4 * HOUR;
  return (
    <li className={`th-gap ${mode ? "adding" : ""}`} style={{ "--gh": `${h}px` }}>
      <div className="th-gap-mid">
        <span className="th-gap-free">{asleep ? t("asleepGap", { time: formatSpan(gap.ms, lang) }) : big ? t("nothingNeedsYouFor", { time: formatSpan(gap.ms, lang) }) : t("freeTime", { time: formatSpan(gap.ms, lang) })}</span>
        {!mode && !asleep && (gap.ms >= 30 * MINUTE || hint) && <button type="button" className="th-gap-add" onClick={openTap}>＋ {t("addTask")}</button>}
      </div>
      {!mode && hint && <button type="button" className="th-gap-hint" onClick={() => setMode("sheet")}>{t("nTodosFitHere", { n: hint.count })}</button>}
      {gap.notices?.map((n) => <GapNotice key={n.id} item={n} />)}
      {mode === "sheet" && <GapTaskSheet gap={gap} onNew={() => setMode("form")} onDone={() => setMode(null)} />}
      {mode === "form" && <TaskForm gap={gap} onDone={() => setMode(null)} />}
    </li>
  );
}

function TaskRow({ task, overdue, moveTarget }) {
  const { t, tz, lang, update } = useTimeHub();
  const [editing, setEditing] = useState(false);
  // recurring: today's occurrence only — the routine itself is never touched from here
  const toggle = () => { const at = Date.now(); update((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === task.id ? setDone(x, !task.done, at, tz) : x)) })); if (!task.done) success(); };
  const remove = () => { const at = Date.now(); update((s) => ({ ...s, tasks: task.recurring
    ? s.tasks.map((x) => (x.id !== task.id ? x : x.placed ? unplace(x) : notToday(x, at, tz)))
    : s.tasks.filter((x) => x.id !== task.id) })); };
  const move = () => {
    if (!moveTarget) return;
    const len = task.end - task.start;
    const at = Date.now();
    update((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === task.id ? placeAt(x, moveTarget.start, moveTarget.start + len, at, tz) : x)) }));
    success();
  };
  const h = Math.max(48, taskVisualHeight(task.end - task.start));
  return (
    <li className={`th-task ${task.done ? "done" : ""} ${overdue ? "overdue" : ""}`} style={{ "--th": `${h}px` }}>
      <div className="th-task-line">
        <button type="button" className="th-task-check" aria-pressed={task.done} aria-label={task.done ? t("markNotDone") : t("markDone")} onClick={toggle}>✓</button>
        <button type="button" className="th-task-main" aria-expanded={editing} onClick={() => setEditing(!editing)}>
          <span className="th-task-title">{task.title}</span>
          {overdue ? (
            <span className="th-task-when"><span className="th-task-still">{t("stillToDo")}</span> · {t("plannedAt", { time: formatTime(task.start, tz, lang) })}</span>
          ) : (
            <span className="th-task-when"><Ltr>{formatTime(task.start, tz, lang)}–{formatTime(task.end, tz, lang)}</Ltr> · {formatSpan(task.end - task.start, lang)}{task.done ? ` · ${t("completedWord")}` : ""}</span>
          )}
        </button>
      </div>
      {overdue && moveTarget && !editing && (
        <button type="button" className="th-task-move" onClick={move}>
          {t("moveToGap", { time: formatTime(moveTarget.start, tz, lang) })}
        </button>
      )}
      {editing && (
        <div className="th-task-edit">
          <TaskForm task={task} onDone={() => setEditing(false)} />
          <Btn small tone="danger" onClick={remove}>{t("delete")}</Btn>
        </div>
      )}
    </li>
  );
}

/** Camps of one account finishing in the same minute become one row. */
/* ---------- schedule ---------- */
function Schedule({ offset, setOffset }) {
  const { t, tz, lang, state, dispatch, accountIds, templates, accountById } = useTimeHub();
  const now = useMinute(); // rows keep their own 1-second countdowns
  const when = useWhenLocal();
  const [showPast, setShowPast] = useState(false);
  const [openId, setOpenId] = useState(null);
  const day = localDayRange(now, tz, offset);
  const filter = state.settings.timelineFilter;
  const rawItems = useMemo(() => groupContrib(groupTraining(buildAgenda(state, day.start, day.end, accountIds, now))), [state, accountIds.join(), day.start, now]); // eslint-disable-line react-hooks/exhaustive-deps
  // A simple filter across BOTH dimensions on the timeline: real game items (events, timers,
  // bookings, contributions…) versus the To-do categories. "Game" keeps game items AND game
  // to-dos together, since both are "the game side of the day"; Personal/Work show just that
  // category of to-do and quiet the game noise entirely.
  const items = filter === "personal" || filter === "work" ? [] : rawItems;
  const { past, rest } = splitNow(items);
  const isToday = offset === 0;
  // today: derived occurrences (recurring tasks with a time or placed today, plus one-offs);
  // other days: one-off tasks scheduled there
  const dayTasksAll = useMemo(() => (offset === 0
    ? scheduledToday(todayView(state.tasks, now, tz), day.start, day.end)
    : (state.tasks || []).filter((x) => !x.repeat && x.start >= day.start && x.start < day.end)), [state.tasks, day.start, offset === 0 ? now : 0]); // eslint-disable-line react-hooks/exhaustive-deps
  const dayTasks = filter === "all" ? dayTasksAll : dayTasksAll.filter((x) => x.category === filter);
  // A task's planned time passing is not completion: only tasks the person actually ticked off
  // fold away into "completed". Everything else stays visible until they say otherwise.
  const pastTasks = dayTasks.filter((x) => x.done);
  const overdue = isToday ? overdueTasks(dayTasks, now) : [];
  const timeline = useMemo(() => buildTimeline(rest, dayTasks.filter((x) => !x.done && x.end > now), day.start, day.end, now), [rest, dayTasks, day.start, day.end, now]);
  const rems = useMemo(() => computeReminders(state, now, accountIds), [state, accountIds.join(), now]); // eslint-disable-line react-hooks/exhaustive-deps
  const after = offset === 0 ? [
    ...stillRunning(state, accountIds, day.end).filter((r) => r.endAt < day.end + 12 * HOUR).map((r) => ({
      id: r.id, at: r.endAt, acc: r.acc,
      name: r.kind === "training" ? (r.camps.length === 3 ? t("allCamps") : r.camps.map((c) => t(`short_${c}`)).join(", ")) : t(r.camps[0]),
    })),
    ...dropsBetween(day.end, day.end + 8 * HOUR).filter((d) => d.manual || d.kind === "store").map((d) => ({
      id: d.key, at: d.at, acc: null, name: d.kind === "store" ? t("dropStore", { n: d.amount }) : t("dropTrek", { n: d.amount }),
    })),
  ].sort((a, b) => a.at - b.at) : [];
  const heading = offset === 0 ? t("todaysSchedule") : offset === 1 ? t("tomorrowsSchedule") : formatDate(day.start + 1, tz, lang);
  const nextId = rest.find((x) => x.status === "upcoming")?.id;
  const rowProps = (i) => ({ i, day, rems, open: openId === i.id, setOpen: (v) => setOpenId(v ? i.id : null), isNext: i.id === nextId });

  return (
    <section className="th-sband" aria-label={heading} id="th-sec-today">
      <img className="th-snowedge" src={snowEdge} alt="" aria-hidden="true" decoding="async" />
      <div className="th-sband-body">
      <div className="th-sband-head"><span className="th-eyebrow">{t("comingUp")}</span><h2 className="th-sband-title">{isToday ? t("scheduleTitle") : heading}</h2><p className="th-sec-sub">{t("scheduleSub")}</p></div>
      <Seg value={filter} onChange={(v) => dispatch({ type: "settings", patch: { timelineFilter: v } })} label={t("timelineFilter")} options={[
        { value: "all", label: t("all") }, { value: "game", label: t("todoGame") }, { value: "personal", label: t("todoPersonal") }, { value: "work", label: t("todoWork") },
      ]} />
      <WeekStrip offset={offset} setOffset={setOffset} />
      <div className="th-card th-sched">
      {past.length + pastTasks.length > 0 && (
        <div className="th-sched-head">
          <button type="button" className="th-past-toggle" aria-expanded={showPast} onClick={() => setShowPast(!showPast)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" style={{ opacity: .5, marginInlineEnd: 8 }}><path d="M12 2v20M4 7l16 10M20 7L4 17" /></svg>
            {t("pastN", { n: past.length + pastTasks.length })} · {showPast ? t("hideCompleted") : t("showCompleted")}
          </button>
        </div>
      )}
      {showPast && (
        <ol className="th-slist muted">
          {[...past.map((i) => ({ at: i.start, el: <Row key={i.id} {...rowProps(i)} /> })), ...pastTasks.map((x) => ({ at: x.start, el: <TaskRow key={x.id} task={x} /> }))]
            .sort((a, b) => a.at - b.at).map((x) => x.el)}
        </ol>
      )}
      {isToday && overdue.length > 0 && (
        <div className="th-overdue">
          <div className="th-overdue-title">{t("stillToDo")} · {overdue.length}</div>
          <ol className="th-slist">
            {overdue.map((x) => <TaskRow key={x.id} task={x} overdue moveTarget={findNextGap(timeline, x.end - x.start)} />)}
          </ol>
        </div>
      )}
      {isToday && items.length + after.length > 0 && (
        <div className="th-now-mark" aria-label={`${t("now")} ${formatTime(now, tz, lang)}`}>
          <span className="label">{t("now")} · <Ltr>{formatTime(now, tz, lang)}</Ltr></span>
          <span className="line" />
        </div>
      )}
      {timeline.length > 0 && (
        <ol className="th-slist">
          {timeline.map((e) => (e.type === "item" ? <Row key={e.item.id} {...rowProps(e.item)} />
            : e.type === "task" ? <TaskRow key={e.task.id} task={e.task} />
            : <GapRow key={`gap-${e.start}`} gap={e} />))}
        </ol>
      )}
      {after.length > 0 && (
        <div className="th-running">
          <div className="th-running-title">{t("afterMidnight")}</div>
          {after.map((r) => (
            <div key={r.id} className="th-running-row">
              <span className="th-running-name">{r.name}{r.acc && <AccountTag accountId={r.acc} />}</span>
              <b><Ltr>{formatTime(r.at, tz, lang)}</Ltr></b>
            </div>
          ))}
        </div>
      )}
      {isToday && rest.length === 0 && overdue.length === 0 && !timeline.some((e) => e.type === "task") && <SleepingBear text={t("everythingTonight")} />}
      {!isToday && items.length === 0 && <SleepingBear text={t("nothingToday")} />}
      {items.length > 0 && (
        <div className="th-item-actions th-sched-foot">
          <CalendarButtons items={items.map((i) => toCalendarItem(i, t, templates, accountById(i.accountId)?.name))} filename={`time-hub-${formatDate(day.start + 1, "UTC", "en").replace(/\W+/g, "-")}`} label={t("addDayToCalendar")} />
        </div>
      )}
      </div>
      </div>
    </section>
  );
}

/** TODAY — a short preview (next few things, plain time order, no day-part headings). The full
 *  proportional Timeline is one tap away, in the same place. */
function TodayPreview({ full, setFull }) {
  const { t, tz, lang, state, accountIds, templates } = useTimeHub();
  const now = useMinute();
  const items = useMemo(() => {
    const day = localDayRange(now, tz, 0);
    return groupTraining(buildAgenda(state, now, day.end, accountIds, now))
      .filter((i) => (i.status === "upcoming" || i.status === "now") && !["contrib", "intel"].includes(i.kind));
  }, [state, accountIds.join(), now, tz]); // eslint-disable-line react-hooks/exhaustive-deps
  const title = (i) => (i.group ? (i.group.length === 3 ? t("allCampsFinish") : t("nCampsFinish", { n: i.group.length })) : itemTitle(i, t, templates));
  return (
    <section className="th-preview" aria-label={t("todayWord")} id="th-sec-today-preview">
      <div className="th-home-head">
        <h2 className="th-home-label">{t("todayWord")}</h2>
        <button type="button" className="th-link" aria-expanded={full} onClick={() => setFull(!full)}>{full ? t("hideFullSchedule") : t("viewFullSchedule")}</button>
      </div>
      {!full && (items.length ? (
        <ol className="th-preview-list">
          {items.slice(0, 3).map((i) => (
            <li key={i.id}>
              <span className="th-preview-time"><b><Ltr>{formatTime(i.start, tz, lang)}</Ltr></b><small><Ltr>{formatTime(i.start, "UTC", lang)}</Ltr> UTC</small></span>
              <span className="th-preview-name">{title(i)}{i.accountId && <AccountTag accountId={i.accountId} />}</span>
            </li>
          ))}
          {items.length > 3 && <li className="th-preview-more"><button type="button" className="th-link" onClick={() => setFull(true)}>{t("nLaterToday", { n: items.length - 3 })}</button></li>}
        </ol>
      ) : <p className="th-note">{t("nothingLeftToday")}</p>)}
    </section>
  );
}

export function TodayScreen() {
  const [offset, setOffset] = useState(0);
  const [full, setFull] = useState(false);
  const next = useNextUp();
  const { t } = useTimeHub();
  // Calm first screen: NEXT UP (+ two small lines) → NEEDS YOU (only if actionable) → READY NOW
  // (compact count) → TODAY (short preview). The full Timeline and friends' clocks are one tap away.
  return (
    <div className="th-screen th-home">
      <NextUp data={next} />
      <NeedsYou />
      <ReadyNow />
      <TodayPreview full={full} setFull={setFull} />
      {full && <Schedule offset={offset} setOffset={setOffset} />}
      {/* one-time setup question: still asked, but it never pushes Next Up / Needs You off screen */}
      <ChampQuestion />
      <FriendsWidget />
    </div>
  );
}
