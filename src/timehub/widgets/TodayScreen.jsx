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
import { bestFits } from "../lib/tasks.js";

/** Whether ANY unfinished, unscheduled to-do exists — decides whether "+ Add task" opens the
 *  suggestion sheet first or goes straight to a blank form (no point suggesting from nothing). */
function useHasUnscheduledTasks() {
  const { state } = useTimeHub();
  return (state.tasks || []).some((x) => !x.done && x.start == null);
}
import { computeReminders, needsAttention } from "../lib/reminders.js";
import { contribState, spendAttempt } from "../lib/contributions.js";
import { idleCamps, splitNow, stillRunning, weekStrip } from "../lib/today.js";
import { dropsNeedingAction, dropsBetween, staminaNow, intelNeedingAction, INTEL_MISSIONS_PER_REFRESH } from "../lib/daily.js";
import { Marker, markerFor } from "../components/Trail.jsx";
import snowEdge from "../assets/snow-edge.webp";
import pool from "../assets/hero-pool-corner.webp";
import quietScene from "../assets/scene-distant-bear.webp";
import { slotContaining } from "../lib/bookings.js";
import { eventName } from "../lib/events.js";
import { buildTimeline, parseTaskDuration, placeTask, resizeTask, pruneTasks, rowChips, gapVisualHeight, taskVisualHeight, overdueTasks, findNextGap } from "../lib/plan.js";
import { champRounds } from "../lib/championship.js";
import { ChampQuestion } from "./ChampIntel.jsx";
import { localDayRange, formatTime, formatDate, formatSpan, zonedParts, formatWeekdayShort, formatDayNumber, HOUR, MINUTE, DAY } from "../lib/time.js";
import { Ltr, Bidi, AccountTag, Btn, SleepingBear, DurationFields, durFrom, durParse, CalendarButtons, BrushUnderline, SectionIcon, Remaining } from "../components/ui.jsx";
import { itemTitle, toCalendarItem } from "../components/labels.js";
import { ReminderRow } from "./ReminderRow.jsx";
import { useWhenLocal } from "./TimerCard.jsx";
import { useClaim } from "./DailyWidgets.jsx";
import { FriendsWidget } from "./FriendsWidget.jsx";

const BUFF_NAME = { strategy: "buffStrategyName", defense: "buffDefenseName", neither: "buffNeither", unsure: "bookingUnknown" };

/* ---------- what needs doing (one card, like the calculator's steps) ---------- */
export function useNeeds() {
  const { state, accountIds, dataFor } = useTimeHub();
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
    return { drops, stamina, idle, minister, intel, round, count: drops.length + stamina.length + idle.length + minister.length + (intel ? 1 : 0) + (round ? 1 : 0) };
  }, [state, accountIds.join(), now]); // eslint-disable-line react-hooks/exhaustive-deps
}


const NEED_ICON = {
  store: "M4 9l1.5-5h13L20 9M5 9v11h14V9M9 20v-6h6v6",
  boot: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM15 9l-2 6-4 0 2-6z",
  bolt: "M13 3L5 13.5h6L10 21l8-10.5h-6z",
  flame: "M12 3c1 3.2 4.5 4.8 4.5 9a4.5 4.5 0 0 1-9 0c0-1.8.8-3 1.8-4 .2 1.4 1 2 1.8 2C11.4 7.6 11 5.4 12 3z",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0",
  flask: "M9 3h6M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3",
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

function NeedsYou({ hiddenKeys }) {
  const { t, tz, lang, accountById, startTraining, setTab, updateAccount } = useTimeHub();
  const now = useMinute();
  const when = useWhenLocal();
  const claim = useClaim();
  const [asking, setAsking] = useState([]);
  const [leaving, setLeaving] = useState([]);
  // let the row slide away first, then update (feels like it was dealt with, not just vanished)
  const later = (key, fn) => { setLeaving((l) => [...l, key]); setTimeout(fn, 230); };
  const n0 = useNeeds();
  const minister = n0.minister.filter((r) => !hiddenKeys?.has(r.key));
  const n = { ...n0, minister, count: n0.count - (n0.minister.length - minister.length) };
  if (!n.count) {
    return (
      <section className="th-card th-caught-up" aria-label={t("allCaughtUp")}>
        <span className="th-caught-bear" aria-hidden="true">
          <svg width="46" height="38" viewBox="0 0 64 52"><circle cx="14" cy="10" r="7" className="fur" /><circle cx="50" cy="10" r="7" className="fur" /><ellipse cx="32" cy="28" rx="22" ry="20" className="fur" /><ellipse cx="32" cy="34" rx="9" ry="7" className="face" /><path d="M22 24q3-3 6 0M36 24q3-3 6 0" stroke="#241B10" strokeWidth="2.4" fill="none" strokeLinecap="round" /><path d="M28 36q4 3 8 0" stroke="#241B10" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
        </span>
        <div><b>{t("allCaughtUp")}</b><div className="th-need-sub">{t("allCaughtUpSub")}</div></div>
      </section>
    );
  }
  return (
    <section className="th-needs-sec" aria-label={t("needsYou")}>
      <div className="th-needs-head"><span className="th-eyebrow">{t("fieldNotes")}</span><h2 className="th-needs-title">{t("needsYou")}<span className="th-needs-count">{n.count}</span></h2></div>
      <div className="th-card th-needs-card">
      <div className="th-needs">
        {n.drops.map(({ drop: d, status, accounts }) => (
          <NeedRow key={d.key} tone="gold" icon={d.kind === "store" ? "store" : "boot"} leaving={leaving.includes(d.key)}
            title={`${d.kind === "store" ? t("dropStore", { n: d.amount }) : t("dropTrek", { n: d.amount })} · ${formatTime(d.at, tz, lang)}`}
            sub={<>{status === "ready" ? t("readyToClaim") : t("inTime", { time: formatSpan(d.at - now, lang) })} · {accounts.length > 1 ? t("nAccounts", { n: accounts.length }) : accountById(accounts[0])?.name}</>}>
            {status === "ready" && <Btn small onClick={() => later(d.key, () => claim(d))}>{t("claimed")}</Btn>}
          </NeedRow>
        ))}
        {n.round && (
          <NeedRow tone="gold" icon="bell" title={t("champRoundOpen", { n: n.round.round })} sub={t("champRoundUntil", { time: formatTime(n.round.end, tz, lang) })} />
        )}
        {n.intel && (
          <NeedRow key={n.intel.key} tone="gold" icon="flask" leaving={leaving.includes(n.intel.key)}
            title={t("intelSoon", { time: formatTime(n.intel.next, tz, lang) })}
            sub={<>{t("intelSoonSub", { in: formatSpan(n.intel.next - now, lang) })} · {n.intel.accounts.length > 1 ? t("nAccounts", { n: n.intel.accounts.length }) : accountById(n.intel.accounts[0])?.name}</>}>
            <Btn small onClick={() => later(n.intel.key, () => { const at = Date.now(); n.intel.accounts.forEach((a) => updateAccount(a, (d) => ({ ...d, claims: { ...d.claims, [n.intel.key]: at } }))); success(); })}>{t("cleared")}</Btn>
          </NeedRow>
        )}
        {n.stamina.map(({ a, s }) => (
          <NeedRow key={`st${a}`} tone="amber" icon="bolt"
            title={s.over || s.atCap ? t("staminaAtCapShort") : t("staminaSoon", { time: formatSpan(s.fullAt - now, lang) })}
            sub={<><AccountTag accountId={a} /> {t("regenStops")}</>}>
            <Btn small onClick={() => setTab("timers")}>{t("update")}</Btn>
          </NeedRow>
        ))}
        {n.idle.map(({ acc, idle }) => (
          <NeedRow key={`id${acc}`} tone="amber" icon="flame"
            title={t("idleFor", { time: formatSpan(now - idle.since, lang) })}
            sub={<><AccountTag accountId={acc} /> {idle.fullBatchMs ? t("fullBatchNowFinishes", { time: when(now + idle.fullBatchMs) }) : t("setFullBatchHint")}</>}>
            <Btn tone="gold" small onClick={() => startTraining({ accountId: acc, camps: idle.camps.map((c) => c.camp), troops: Object.fromEntries(idle.camps.map((c) => [c.camp, c.troop])), ms: idle.fullBatchMs })}>{t("start")}</Btn>
          </NeedRow>
        ))}
        {n.minister.length > 0 && (
          <div className="th-need gold col">
            <span className="th-action-label">{t("ministerNeeded", { n: n.minister.length })}</span>
            {n.minister.map((r) => (
              <ReminderRow key={r.key + (asking.includes(r.key) ? "f" : "s")} r={r} slim={!asking.includes(r.key)} onAsk={() => setAsking([...asking, r.key])} />
            ))}
          </div>
        )}
      </div>
      </div>
    </section>
  );
}

/* ---------- the Bear Trap hero: what's next, how long, who still needs a minister ---------- */
export function useBearHero() {
  const { state, accountIds } = useTimeHub();
  const now = useMinute();
  return useMemo(() => {
    const item = buildAgenda(state, now, now + 7 * DAY, accountIds, now).find((i) => i.kind === "event" && i.start > now && String(i.ref?.ev?.templateId || "").startsWith("bear_trap"));
    if (!item) return null;
    const rems = computeReminders(state, now, accountIds).filter((r) => r.ev.id === item.ref.ev.id && r.occ.key === item.ref.occ.key);
    return { item, rems };
  }, [state, accountIds.join(), now]); // eslint-disable-line react-hooks/exhaustive-deps
}

function BearHero({ hero }) {
  const { t, tz, lang, templates, accountById, openBooking } = useTimeHub();
  const [panel, setPanel] = useState(false);
  const [asking, setAsking] = useState([]);
  const { item, rems } = hero;
  const needs = rems.filter((r) => r.status === "open" || r.status === "unsure");
  const name = eventName(item.ref.ev, t, templates);
  const book = () => { const r = needs[0]; openBooking({ accountId: r.accountId, startAt: slotContaining(r.occ.start), position: "minister_strategy", eventKey: r.key }); };
  return (
    <>
      <section className="th-bthero" aria-label={name}>
        <img className="th-bthero-pool" src={pool} alt="" aria-hidden="true" decoding="async" />
        <div className="th-bthero-top">
          <span className="th-bthero-eyebrow">{name}</span>
          <div className="th-bthero-count">{t("heroIn")} <Remaining to={item.start} /> {t("heroInAfter")}</div>
          <div className="th-bthero-when"><Ltr>{formatTime(item.start, tz, lang)}</Ltr> · <Ltr>{formatTime(item.start, "UTC", lang)}</Ltr> UTC</div>
        </div>
        <ul className="th-bthero-accts">
          {rems.map((r) => {
            const a = accountById(r.accountId);
            const ok = r.status === "covered" || r.status === "booked";
            return (
              <li key={r.key}><i className={`th-bthero-dot c${a?.color}`} aria-hidden="true" /><span>{a?.name}</span>
                <span className={`r ${ok || r.status === "dismissed" ? "" : "warn"}`}>{ok ? t("ministerSet") : r.status === "dismissed" ? t("reminderDismissed") : t("ministerNeededShort")}</span></li>
            );
          })}
        </ul>
        {needs.length > 0 ? (
          <>
            <Btn block onClick={book}>{needs.length === 1 ? t("bookMinistersOne") : t("bookMinistersMany", { n: needs.length })}</Btn>
            <button type="button" className="th-bthero-link" aria-expanded={panel} onClick={() => setPanel(!panel)}>{t("alreadyBookedQ")}</button>
          </>
        ) : rems.length > 0 && <p className="th-bthero-ok">{t("allMinistersBooked")}</p>}
      </section>
      {panel && needs.length > 0 && (
        <section className="th-card th-bthero-panel">
          {needs.map((r) => <ReminderRow key={r.key + (asking.includes(r.key) ? "f" : "s")} r={r} slim={!asking.includes(r.key)} onAsk={() => setAsking([...asking, r.key])} />)}
        </section>
      )}
    </>
  );
}

/** The single soonest thing on the schedule, across every visible account — of ANY kind, not just
 *  Bear Trap (that's BearHero's job) and not just something that needs an action (that's NeedsYou's
 *  job). This is what actually answers "what's up next?" when it isn't the Bear Trap. */
export function useWhatsNext() {
  const { state, accountIds } = useTimeHub();
  const now = useMinute();
  return useMemo(() => {
    const items = groupTraining(buildAgenda(state, now, now + 7 * DAY, accountIds, now));
    return items.find((i) => i.status === "upcoming" || i.status === "now") || null;
  }, [state, accountIds.join(), now]); // eslint-disable-line react-hooks/exhaustive-deps
}

function WhatsNextWidget({ item }) {
  const { t, tz, lang, templates, accountById } = useTimeHub();
  const groupN = item.group ? item.group.length : 0;
  const title = groupN ? (groupN === 3 ? t("allCampsFinish") : t("nCampsFinish", { n: groupN })) : itemTitle(item, t, templates);
  const acct = item.accountId ? accountById(item.accountId) : null;
  const marker = markerFor(item);
  return (
    <a href="#th-sec-today" className="th-whatsnext" aria-label={`${t("whatsNext")}: ${title}`}>
      <span className={`th-whatsnext-ic m-${marker}`} aria-hidden="true"><Marker kind={marker} /></span>
      <span className="th-whatsnext-body">
        <span className="th-whatsnext-eyebrow">{t("whatsNext")}</span>
        <span className="th-whatsnext-title">{title}</span>
        {acct && <AccountTag accountId={acct.id} />}
      </span>
      <span className="th-whatsnext-time">
        {item.status === "now" ? t("happeningNow") : <><Remaining to={item.start} /></>}
        <small><Ltr>{formatTime(item.start, tz, lang)}</Ltr></small>
      </span>
    </a>
  );
}

/** Nothing needs doing and nothing is due for a while → the calm illustrated day. */
function useQuiet(needsCount) {
  const { state, accountIds } = useTimeHub();
  const now = useMinute();
  return useMemo(() => {
    if (needsCount) return null;
    const list = buildAgenda(state, now, now + 7 * DAY, accountIds, now).filter((i) => i.start > now && !["drop", "contrib", "intel"].includes(i.kind) && !(i.kind === "event" && i.ref?.ev?.templateId === "daily_reset"));
    const first = list[0];
    return first && first.start >= now + 3 * HOUR ? first : null;
  }, [state, accountIds.join(), now, needsCount]); // eslint-disable-line react-hooks/exhaustive-deps
}

function QuietHero({ first }) {
  const { t, tz, lang } = useTimeHub();
  const now = useMinute();
  const time = formatTime(first.start, tz, lang);
  return (
    <section className="th-quiet" aria-label={t("quietTitle")}>
      <img className="th-quiet-scene" src={quietScene} alt="" aria-hidden="true" decoding="async" />
      <h2 className="th-quiet-title">{t("quietTitle")}</h2>
      <p>{t("nothingUntil", { time, utc: formatTime(first.start, "UTC", lang), in: formatSpan(first.start - now, lang) })}</p>
    </section>
  );
}

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
    actions.push(<Btn key="spend" small tone="gold" onClick={() => { success(); updateAccount(i.accountId, (d) => ({ ...d, contrib: spendAttempt(d.contrib, Date.now(), contribState(d.contrib, Date.now()).count) || d.contrib })); }}>{t("spendAll", { n: i.ref.max })}</Btn>);
  }
  if (i.kind === "contribGroup") {
    actions.push(<Btn key="spend" small tone="gold" onClick={() => { success(); i.ref.members.forEach((m) => updateAccount(m.accountId, (d) => ({ ...d, contrib: spendAttempt(d.contrib, Date.now(), contribState(d.contrib, Date.now()).count) || d.contrib }))); }}>{t("spendAll", { n: i.ref.max })}</Btn>);
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
            {i.kind === "contrib" && <span className="th-srow-note">{i.ref.max} / {i.ref.max}</span>}
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
      update((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === task.id ? { ...resizeTask(x, len), title: title.trim() } : x)) }));
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
  const spendAll = () => {
    success();
    members.forEach((m) => updateAccount(m.accountId, (d) => ({ ...d, contrib: spendAttempt(d.contrib, Date.now(), contribState(d.contrib, Date.now()).count) || d.contrib })));
  };
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
        <Btn small tone="gold" onClick={spendAll}>{t("spendAll", { n: members[0].ref.max })}</Btn>
      </div>
    </div>
  );
}

/** Tapping "+ Add task" in a gap shouldn't open a blank form first — Time Hub already knows what's
 *  unfinished and how long things take, so it suggests what actually fits before asking for
 *  something new. Picking a suggestion schedules that exact task (no duplicate created). */
function GapTaskSheet({ gap, onNew, onDone }) {
  const { t, lang, state, update } = useTimeHub();
  const unscheduled = (state.tasks || []).filter((x) => !x.done && x.start == null);
  const fits = bestFits(unscheduled, gap.ms);
  const tooLong = unscheduled.filter((x) => x.durationMs && x.durationMs > gap.ms);
  const [showLong, setShowLong] = useState(false);
  const place = (task) => {
    const p = placeTask(gap, task.durationMs);
    update((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === task.id ? { ...x, start: p.start, end: p.end } : x)) }));
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
                  <span className="th-todo-main"><span className="th-todo-title">{task.title}</span><span className="th-todo-meta">{formatSpan(task.durationMs, lang)}</span></span>
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
  const { t, lang } = useTimeHub();
  const [mode, setMode] = useState(null); // null | "sheet" | "form"
  const hasUnscheduled = useHasUnscheduledTasks();
  const openTap = () => setMode(hasUnscheduled ? "sheet" : "form");
  // time blindness: the block's own height gives a visual sense of "how much time" (12–96px),
  // the text gives the exact number — neither replaces the other.
  const h = gapVisualHeight(gap.ms);
  const big = gap.ms >= 4 * HOUR;
  return (
    <li className={`th-gap ${mode ? "adding" : ""}`} style={{ "--gh": `${h}px` }}>
      <div className="th-gap-mid">
        <span className="th-gap-free">{t(big ? "openTime" : "freeTime", { time: formatSpan(gap.ms, lang) })}</span>
        {!mode && gap.ms >= 30 * MINUTE && <button type="button" className="th-gap-add" onClick={openTap}>＋ {t("addTask")}</button>}
      </div>
      {gap.notices?.map((n) => <GapNotice key={n.id} item={n} />)}
      {mode === "sheet" && <GapTaskSheet gap={gap} onNew={() => setMode("form")} onDone={() => setMode(null)} />}
      {mode === "form" && <TaskForm gap={gap} onDone={() => setMode(null)} />}
    </li>
  );
}

function TaskRow({ task, overdue, moveTarget }) {
  const { t, tz, lang, update } = useTimeHub();
  const [editing, setEditing] = useState(false);
  const toggle = () => { update((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)) })); if (!task.done) success(); };
  const remove = () => update((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== task.id) }));
  const move = () => {
    if (!moveTarget) return;
    const len = task.end - task.start;
    update((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === task.id ? { ...x, start: moveTarget.start, end: moveTarget.start + len } : x)) }));
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
  const { t, tz, lang, state, accountIds, templates, accountById } = useTimeHub();
  const now = useMinute(); // rows keep their own 1-second countdowns
  const when = useWhenLocal();
  const [showPast, setShowPast] = useState(false);
  const [openId, setOpenId] = useState(null);
  const day = localDayRange(now, tz, offset);
  const items = useMemo(() => groupContrib(groupTraining(buildAgenda(state, day.start, day.end, accountIds, now))), [state, accountIds.join(), day.start, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const { past, rest } = splitNow(items);
  const isToday = offset === 0;
  const dayTasks = useMemo(() => (state.tasks || []).filter((x) => x.start >= day.start && x.start < day.end), [state.tasks, day.start]); // eslint-disable-line react-hooks/exhaustive-deps
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

export function TodayScreen() {
  const [offset, setOffset] = useState(0);
  const needs = useNeeds();
  const hero = useBearHero();
  const heroKeys = useMemo(() => new Set((hero?.rems || []).map((r) => r.key)), [hero]);
  const remaining = needs.count - needs.minister.filter((r) => heroKeys.has(r.key)).length;
  const quiet = useQuiet(remaining);
  const next = useWhatsNext();
  // The Bear Trap hero already answers "what's up next" when that IS the next thing; the quiet
  // illustrated day already leads with it too. Only show this separate strip when the true next
  // item is something else the player could otherwise miss (a sooner booking, a camp, a task…).
  const showNext = next && !quiet && !(hero && next.id === hero.item.id);
  return (
    <div className="th-screen">
      {showNext && <WhatsNextWidget item={next} />}
      <ChampQuestion />
      {quiet ? <QuietHero first={quiet} /> : (
        <>
          {hero && <BearHero hero={hero} />}
          <NeedsYou hiddenKeys={heroKeys} />
        </>
      )}
      <Schedule offset={offset} setOffset={setOffset} />
      <FriendsWidget />
    </div>
  );
}
