/* ============================================================
   TODAY — the default tab. Answers in a glance: what's next, how long,
   which account, the local time, and whether anything needs doing.
   Action cards (idle camps, minister bookings) → week strip → schedule.
   ============================================================ */
import React, { useMemo, useRef, useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { success } from "../lib/feedback.js";
import { useMinute, useClockFor } from "../hooks/useNow.jsx";
import { buildAgenda } from "../lib/agenda.js";
import { computeReminders, needsAttention } from "../lib/reminders.js";
import { contribState, spendAttempt } from "../lib/contributions.js";
import { idleCamps, splitNow, stillRunning, weekStrip } from "../lib/today.js";
import { dropsNeedingAction, dropsBetween, staminaNow, intelNeedingAction, INTEL_MISSIONS_PER_REFRESH } from "../lib/daily.js";
import { champRounds } from "../lib/championship.js";
import { ChampQuestion } from "./ChampIntel.jsx";
import { localDayRange, formatTime, formatDate, formatSpan, zonedParts, formatWeekdayShort, formatDayNumber, HOUR, MINUTE } from "../lib/time.js";
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

function NeedRow({ tone = "warm", title, sub, children, leaving }) {
  return (
    <div className={`th-need ${tone} ${leaving ? "leaving" : ""}`}>
      <div className="th-need-main"><div className="th-need-title">{title}</div><div className="th-need-sub">{sub}</div></div>
      {children}
    </div>
  );
}

function NeedsYou() {
  const { t, tz, lang, accountById, startTraining, setTab, updateAccount } = useTimeHub();
  const now = useMinute();
  const when = useWhenLocal();
  const claim = useClaim();
  const [asking, setAsking] = useState([]);
  const [leaving, setLeaving] = useState([]);
  // let the row slide away first, then update (feels like it was dealt with, not just vanished)
  const later = (key, fn) => { setLeaving((l) => [...l, key]); setTimeout(fn, 230); };
  const n = useNeeds();
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
    <section className="th-card" aria-label={t("needsYou")}>
      <div className="th-sec-head"><SectionIcon name="bell" /><span className="th-sec-title">{t("needsYou")}</span></div>
      <BrushUnderline />
      <p className="th-sec-sub">{t("needsYouSub")}</p>
      <div className="th-needs">
        {n.drops.map(({ drop: d, status, accounts }) => (
          <NeedRow key={d.key} tone="gold" leaving={leaving.includes(d.key)}
            title={`${d.kind === "store" ? t("dropStore", { n: d.amount }) : t("dropTrek", { n: d.amount })} · ${formatTime(d.at, tz, lang)}`}
            sub={<>{status === "ready" ? t("readyToClaim") : t("inTime", { time: formatSpan(d.at - now, lang) })} · {accounts.length > 1 ? t("nAccounts", { n: accounts.length }) : accountById(accounts[0])?.name}</>}>
            {status === "ready" && <Btn small onClick={() => later(d.key, () => claim(d))}>{t("claimed")}</Btn>}
          </NeedRow>
        ))}
        {n.round && (
          <NeedRow tone="gold" title={t("champRoundOpen", { n: n.round.round })} sub={t("champRoundUntil", { time: formatTime(n.round.end, tz, lang) })} />
        )}
        {n.intel && (
          <NeedRow key={n.intel.key} tone="gold" leaving={leaving.includes(n.intel.key)}
            title={t("intelSoon", { time: formatTime(n.intel.next, tz, lang) })}
            sub={<>{t("intelSoonSub", { in: formatSpan(n.intel.next - now, lang) })} · {n.intel.accounts.length > 1 ? t("nAccounts", { n: n.intel.accounts.length }) : accountById(n.intel.accounts[0])?.name}</>}>
            <Btn small onClick={() => later(n.intel.key, () => { const at = Date.now(); n.intel.accounts.forEach((a) => updateAccount(a, (d) => ({ ...d, claims: { ...d.claims, [n.intel.key]: at } }))); success(); })}>{t("cleared")}</Btn>
          </NeedRow>
        )}
        {n.stamina.map(({ a, s }) => (
          <NeedRow key={`st${a}`} tone="amber"
            title={s.over || s.atCap ? t("staminaAtCapShort") : t("staminaSoon", { time: formatSpan(s.fullAt - now, lang) })}
            sub={<><AccountTag accountId={a} /> {t("regenStops")}</>}>
            <Btn small onClick={() => setTab("timers")}>{t("update")}</Btn>
          </NeedRow>
        ))}
        {n.idle.map(({ acc, idle }) => (
          <NeedRow key={`id${acc}`} tone="amber"
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
    </section>
  );
}

/** Like the calculator's AVAILABLE / ALLOCATED strip. */
export function StatStrip() {
  const { t, tz, lang, state, accountIds } = useTimeHub();
  const now = useMinute();
  const next = useMemo(() => buildAgenda(state, now, now + 7 * 24 * HOUR, accountIds, now).find((i) => i.start > now && i.kind !== "contrib"),
    [state, accountIds.join(), now]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = useNeeds();
  return (
    <div className="th-stats" role="group" aria-label={t("atAGlance")}>
      <div><span>{t("localTime")}</span><b><Ltr>{formatTime(now, tz, lang)}</Ltr></b></div>
      <div className="muted"><span>UTC</span><b><Ltr>{formatTime(now, "UTC", lang)}</Ltr></b></div>
      <div><span>{t("nextLabel")}</span><b>{next ? <Bidi>{formatSpan(next.start - now, lang)}</Bidi> : "—"}</b></div>
      <div className={n.count ? "todo" : "clear"}><span>{t("toDo")}</span><b key={n.count} className="th-bump">{n.count || "✓"}</b></div>
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
  const { t, tz, lang, dir, templates, updateAccount, openBooking, setTab, accountById, update, accountIds: accountIdsAll } = useTimeHub();
  const claim = useClaim();
  const now = useClockFor([i.start - 5 * 60000, i.start]); // only for the "under 5 minutes" styling
  const [editing, setEditing] = useState(false);
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
  const need = myRems.find((r) => r.status === "open" || r.status === "unsure");
  if (need) actions.push(<Btn key="book" small tone="gold" onClick={() => openBooking({ accountId: need.accountId, startAt: Math.floor(need.occ.start / 1800000) * 1800000, position: "minister_strategy", eventKey: need.key })}>{t("bookShort")} · {accountById(need.accountId)?.name}</Btn>);
  if (timer) actions.push(<Btn key="upd" small onClick={() => { setEditing(true); setOpen(false); }}>{t("updateTimeLeft")}</Btn>);
  if (i.kind === "booking") actions.push(<Btn key="bk" small onClick={() => setTab("events")}>{t("secBookings")}</Btn>);
  if (i.kind === "drop" && i.status !== "upcoming" && i.ref.drop.manual && i.ref.statuses.includes("ready")) actions.push(<Btn key="cl" small onClick={() => claim(i.ref.drop)}>{t("claimed")}</Btn>);
  if (i.kind === "stamina") actions.push(<Btn key="stu" small onClick={() => setTab("timers")}>{t("update")}</Btn>);
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
        <span className="th-srow-body">
          <span className="th-srow-title">{title}</span>
          <span className="th-srow-tags">
            {timer && (
              <button type="button" className={`th-countbtn ${i.start - now < 5 * 60000 ? "urgent" : ""}`} onClick={() => setEditing(!editing)} aria-label={`${t("updateTimeLeft")}: ${title}`}>
                <Remaining to={i.start} fmt="clock" />
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
              </button>
            )}
            <AccountTag accountId={i.accountId} />
            {i.kind === "contrib" && <span className="th-srow-note">{i.ref.max} / {i.ref.max}</span>}
            {i.kind === "drop" && <span className={`th-srow-note ${i.ref.drop.manual ? "warn" : ""}`}>{i.ref.drop.manual ? t("claimByHand") : t("automatic")} · {t("allAccountsShort")}</span>}
            {i.kind === "stamina" && <span className="th-srow-note">{t("regenStops")}</span>}
            {i.kind === "intel" && <span className="th-srow-note">{t("intelRowNote", { n: INTEL_MISSIONS_PER_REFRESH })}</span>}
            {i.kind === "champ" && <span className="th-srow-note warn">{t("champRowNote", { time: formatTime(i.end, tz, lang) })}</span>}
            {i.group && <span className="th-srow-note">{i.group.map((g) => (g.troop === "helios" ? t("heliosCamp", { camp: t(`short_${g.category}`) }) : t(`short_${g.category}`))).join(" · ")}</span>}
            {crossesIn && <span className="th-srow-note">{t("fromYesterday")}</span>}
            {i.end && i.end > day.end && <span className="th-srow-note">{t("continuesTomorrow")}</span>}
          </span>
          {myRems.map((r) => {
            const ok = r.status === "covered" || r.status === "booked";
            const txt = r.status === "covered" ? t(r.booking.position) : r.status === "booked" || r.status === "unsure" ? t(BUFF_NAME[r.buff] || "bookingUnknown") : r.status === "dismissed" ? t("reminderDismissed") : t("ministerNeededShort");
            return <span key={r.key} className={`th-min ${ok ? "ok" : "todo"}`}><AccountTag accountId={r.accountId} /> {ok ? "✓ " : ""}{txt}</span>;
          })}
        </span>
      </div>
      {open && <div className="th-srow-actions">{actions}</div>}
      {editing && <UpdateTime item={i} onDone={() => setEditing(false)} />}
    </li>
  );
}

/** Camps of one account finishing in the same minute become one row. */
function groupTraining(items) {
  const out = [];
  for (const i of items) {
    const prev = out[out.length - 1];
    if (i.kind === "training" && prev?.kind === "training" && prev.accountId === i.accountId && Math.floor(prev.start / 60000) === Math.floor(i.start / 60000)) {
      prev.group = [...(prev.group || [prev.ref]), i.ref];
    } else out.push({ ...i });
  }
  return out;
}

/* ---------- schedule ---------- */
function Schedule({ offset, setOffset }) {
  const { t, tz, lang, state, accountIds, templates, accountById } = useTimeHub();
  const now = useMinute(); // rows keep their own 1-second countdowns
  const when = useWhenLocal();
  const [showPast, setShowPast] = useState(false);
  const [openId, setOpenId] = useState(null);
  const day = localDayRange(now, tz, offset);
  const items = useMemo(() => groupTraining(buildAgenda(state, day.start, day.end, accountIds, now)), [state, accountIds.join(), day.start, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const { past, rest } = splitNow(items);
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
  const isToday = offset === 0;
  const heading = offset === 0 ? t("todaysSchedule") : offset === 1 ? t("tomorrowsSchedule") : formatDate(day.start + 1, tz, lang);
  const nextId = rest.find((x) => x.status === "upcoming")?.id;
  const rowProps = (i) => ({ i, day, rems, open: openId === i.id, setOpen: (v) => setOpenId(v ? i.id : null), isNext: i.id === nextId });

  return (
    <section className="th-card th-sched" aria-label={heading} id="th-sec-today">
      <div className="th-sched-head">
        <SectionIcon name="calendar" />
        <div className="th-sec-title">{heading}</div>
        {past.length > 0 && (
          <button type="button" className="th-past-toggle" aria-expanded={showPast} onClick={() => setShowPast(!showPast)}>
            {t("pastN", { n: past.length })} · {showPast ? t("hideCompleted") : t("showCompleted")}
          </button>
        )}
      </div>
      <BrushUnderline />
      <p className="th-sec-sub">{t("scheduleSub")}</p>
      <WeekStrip offset={offset} setOffset={setOffset} />
      {showPast && <ol className="th-slist muted">{past.map((i) => <Row key={i.id} {...rowProps(i)} />)}</ol>}
      {isToday && items.length + after.length > 0 && (
        <div className="th-now-mark" aria-label={`${t("now")} ${formatTime(now, tz, lang)}`}>
          <span className="line" />
          <span className="label"><span className="th-now-dot" aria-hidden="true" /><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 2v20M4 7l16 10M20 7L4 17" /></svg>{t("now")} <Ltr>{formatTime(now, tz, lang)}</Ltr></span>
          <span className="line short" />
        </div>
      )}
      {rest.length > 0 && (
        <ol className="th-slist">
          {rest.map((i) => <Row key={i.id} {...rowProps(i)} />)}
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
      {isToday && rest.length === 0 && <SleepingBear text={t("everythingTonight")} />}
      {!isToday && items.length === 0 && <SleepingBear text={t("nothingToday")} />}
      {items.length > 0 && (
        <div className="th-item-actions th-sched-foot">
          <CalendarButtons items={items.map((i) => toCalendarItem(i, t, templates, accountById(i.accountId)?.name))} filename={`time-hub-${formatDate(day.start + 1, "UTC", "en").replace(/\W+/g, "-")}`} label={t("addDayToCalendar")} />
        </div>
      )}
    </section>
  );
}

export function TodayScreen() {
  const [offset, setOffset] = useState(0);
  return (
    <div className="th-screen">
      <StatStrip />
      <ChampQuestion />
      <NeedsYou />
      <Schedule offset={offset} setOffset={setOffset} />
      <FriendsWidget />
    </div>
  );
}
