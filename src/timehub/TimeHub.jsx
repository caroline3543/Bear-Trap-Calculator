/* ============================================================
   TIME HUB page (v2): one dashboard for every account.
     <TimeHub lang={lang} />
   Inherits the calculator's CSS variables (light/dark) from its wrapper.
   ============================================================ */
import React, { startTransition, useEffect, useState } from "react";
import "./timehub.css";
import { TimeHubProvider, useTimeHub, useTab, FreezeWhenHidden } from "./TimeHubContext.jsx";
import { useNow, useMinute, ActiveTab } from "./hooks/useNow.jsx";
import { onPress } from "./lib/feedback.js";
import { zoneCity, deviceTimeZone, formatLongDay } from "./lib/time.js";
import { splitColumns } from "./lib/layout.js";
import { TimeZonePicker, BrushUnderline, SectionIcon, TabIcon } from "./components/ui.jsx";
import { ALL, MAX_ACCOUNTS } from "./lib/accounts.js";
import { tracking } from "./lib/agenda.js";
import { StaminaWidget, TrekWidget } from "./widgets/DailyWidgets.jsx";
import { IntelWidget, ChampWeekPicker, useChamp } from "./widgets/ChampIntel.jsx";
import { TodayScreen } from "./widgets/TodayScreen.jsx";
import { BookingsWidget } from "./widgets/BookingsWidget.jsx";
import { EventsWidget } from "./widgets/EventsWidget.jsx";
import { TrainingWidget } from "./widgets/TrainingWidget.jsx";
import { ResearchWidget } from "./widgets/ResearchWidget.jsx";
import { ContributionWidget } from "./widgets/ContributionWidget.jsx";
import { HistoryWidget } from "./widgets/HistoryWidget.jsx";
import { ShareCard } from "./widgets/ShareCard.jsx";
import { AccountsPanel } from "./widgets/AccountsPanel.jsx";


/** One slim line: local (12-hour) and UTC (24-hour) at normal text size. */
/** Bear with a little clock — the calculator's mascot, on Time Hub tabs. */
function BearClock() {
  const [wiggle, setWiggle] = useState(0);
  return (
    <svg key={wiggle} className={`th-bear-clock ${wiggle ? "wiggle" : ""}`} width="62" height="50" viewBox="0 0 86 70" aria-hidden="true"
      onClick={() => setWiggle((w) => w + 1)}>
      <circle cx="18" cy="14" r="9" className="fur" /><circle cx="18" cy="14" r="4.5" className="face" opacity=".85" />
      <circle cx="56" cy="14" r="9" className="fur" /><circle cx="56" cy="14" r="4.5" className="face" opacity=".85" />
      <ellipse cx="37" cy="34" rx="25" ry="23" className="fur" />
      <path d="M16 52 Q37 64 58 52 L56 60 Q37 70 18 60z" className="scarf" />
      <ellipse cx="37" cy="41" rx="11" ry="9" className="face" />
      <g className="eyes"><circle cx="28" cy="31" r="2.6" fill="#241B10" /><circle cx="46" cy="31" r="2.6" fill="#241B10" /></g>
      <ellipse cx="37" cy="38" rx="4" ry="3" fill="#241B10" />
      <circle cx="68" cy="52" r="13" className="clock" /><path d="M68 45v8l5 3" className="hands" />
    </svg>
  );
}

/** Compact header for Time Hub tabs: bear, tab title, local date · city, settings. */
function Header({ title, headerExtra, onSettings, settingsOpen }) {
  const { tz, lang, t } = useTimeHub();
  const now = useMinute();
  const long = formatLongDay(now, tz, lang);
  return (
    <header className="th-mhdr">
      <span className="th-drift" aria-hidden="true"><i>❄</i><i>❄</i><i>✦</i></span>
      <BearClock />
      <div className="th-mhdr-main">
        <h1 className="th-mhdr-title">{title}</h1>
        <div className="th-mhdr-sub">{long} · {zoneCity(tz)}</div>
      </div>
      <div className="th-mhdr-tools">
        <button type="button" className="th-iconbtn" aria-expanded={settingsOpen} aria-label={t("settingsTitle")} title={t("settingsTitle")} onClick={onSettings}><TabIcon name="gear" size={19} /></button>
      </div>
    </header>
  );
}

/** Same big account buttons as the calculator (up to 4) plus All. */
function AccountGrid({ onAdd }) {
  const { t, accounts, filter, setFilter } = useTimeHub();
  const multi = accounts.length > 1;
  return (
    <div className="th-accgrid" role="group" aria-label={t("showAccounts")}>
      {multi && (
        <button type="button" className="th-accbtn all" aria-pressed={filter === ALL} onClick={() => setFilter(ALL)}>{t("allAccounts")}</button>
      )}
      {accounts.map((a) => (
        <button key={a.id} type="button" className={`th-accbtn c${a.color}`} aria-pressed={filter === a.id || !multi} onClick={() => setFilter(multi ? a.id : ALL)}>
          {a.icon ? <b aria-hidden="true">{a.icon}</b> : <i aria-hidden="true" />}{a.name}{a.isPrimary && multi ? " ★" : ""}
        </button>
      ))}
      {accounts.length < MAX_ACCOUNTS && <button type="button" className="th-accbtn add" onClick={onAdd}>+ {t("addAccount")}</button>}
    </div>
  );
}

const TABS = [
  { id: "today", icon: "calendar" },
  { id: "timers", icon: "plan" },
  { id: "events", icon: "foundry" },
  { id: "calc", icon: "trap" },
];

function TabBar({ hasCalc, active }) {
  const { t } = useTimeHub();
  const { setTab } = useTab();
  const tabs = TABS.filter((x) => x.id !== "calc" || hasCalc);
  const idx = Math.max(0, tabs.findIndex((x) => x.id === active));
  return (
    <nav className="th-tabbar" aria-label={t("mainNav")} style={{ "--n": tabs.length, "--i": idx }}>
      <span className="th-tabpill" aria-hidden="true" />
      {tabs.map((x) => (
        <button key={x.id} type="button" aria-current={active === x.id ? "page" : undefined} className={active === x.id ? "on" : ""}
          onPointerDown={() => { window.__thTap = performance.now(); if (active !== x.id) setTab(x.id); }} onClick={() => setTab(x.id)}>
          <TabIcon name={x.icon} />
          <span>{t(`tab_${x.id}`)}</span>
        </button>
      ))}
    </nav>
  );
}

function useWide(query = "(min-width: 900px)") {
  const get = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;
  const [wide, setWide] = useState(get);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return wide;
}

/** Two columns on wide screens, one on phones. */
function Stack({ children }) {
  const wide = useWide();
  const list = React.Children.toArray(children).filter(Boolean);
  if (!wide) return <div className="th-screen">{list}</div>;
  const [l, r] = splitColumns(list.map((_, i) => i));
  return (
    <div className="th-cols">
      <div className="th-col">{l.map((i) => list[i])}</div>
      <div className="th-col">{r.map((i) => list[i])}</div>
    </div>
  );
}

function ChampSettings() {
  const { t } = useTimeHub();
  const [champ, set] = useChamp();
  return (
    <section className="th-card" aria-label={t("champTitle")}>
      <div className="th-sec-head"><SectionIcon name="foundry" /><span className="th-sec-title">{t("champTitle")}</span></div>
      <BrushUnderline />
      <label className="th-check"><input type="checkbox" checked={!!champ.leader} onChange={(e) => set({ leader: e.target.checked })} />{t("champLeaderCheck")}</label>
      {champ.leader && <ChampWeekPicker />}
    </section>
  );
}

function SettingsPanel({ headerExtra }) {
  const { t, tz, state, dispatch } = useTimeHub();
  return (
    <div className="th-screen th-settings">
      {headerExtra && <section className="th-card th-host-tools" aria-label={t("languageTheme")}>{headerExtra}</section>}
      <AccountsPanel onClose={null} />
      <section className="th-card" aria-label={t("settingsTitle")}>
        <div className="th-sec-head"><SectionIcon name="gear" /><span className="th-sec-title">{t("settingsTitle")}</span></div>
        <BrushUnderline />
        <div className="th-form" style={{ margin: 0 }}>
          <TimeZonePicker label={t("yourZone")} value={tz}
            onChange={(z) => dispatch({ type: "settings", patch: { displayTz: z === deviceTimeZone() ? null : z } })} />
          {state.settings.displayTz && (
            <button type="button" className="th-link" onClick={() => dispatch({ type: "settings", patch: { displayTz: null } })}>{t("useDevice")} ({deviceTimeZone()})</button>
          )}
          <label className="th-check"><input type="checkbox" checked={state.settings.compact} onChange={(e) => dispatch({ type: "settings", patch: { compact: e.target.checked } })} />{t("compact")}</label>
          <label className="th-check"><input type="checkbox" checked={state.settings.haptics !== false} onChange={(e) => dispatch({ type: "settings", patch: { haptics: e.target.checked } })} />{t("hapticsSetting")}</label>
          <label className="th-check"><input type="checkbox" checked={!!state.settings.showSpeed} onChange={(e) => dispatch({ type: "settings", patch: { showSpeed: e.target.checked } })} />{t("showSpeed")}</label>
        </div>
      </section>
      <section className="th-card" aria-label={t("whatToTrack")}>
        <div className="th-sec-head"><SectionIcon name="bell" /><span className="th-sec-title">{t("whatToTrack")}</span></div>
        <BrushUnderline />
        <p className="th-sec-sub">{t("whatToTrackSub")}</p>
        <div className="th-form" style={{ margin: 0 }}>
          {[["reset", "trackReset"], ["store", "trackStore"], ["trek", "trackTrek"], ["intel", "trackIntel"], ["stamina", "trackStamina"], ["contrib", "trackContrib"]].map(([k, key]) => (
            <label key={k} className="th-check">
              <input type="checkbox" checked={state.settings.track?.[k] !== false}
                onChange={(e) => dispatch({ type: "settings", patch: { track: { ...state.settings.track, [k]: e.target.checked } } })} />{t(key)}
            </label>
          ))}
        </div>
      </section>
      <ChampSettings />
      <section className="th-card" aria-label={t("sleepHours")}>
        <div className="th-sec-head"><SectionIcon name="plan" /><span className="th-sec-title">{t("sleepHours")}</span></div>
        <BrushUnderline />
        <p className="th-sec-sub">{t("sleepHoursSub")}</p>
        <div className="th-sleep-grid">
          {[["start", "sleepFrom"], ["end", "sleepUntil"], ["target", "finishBeforeBed"]].map(([k, key]) => (
            <label key={k}><span>{t(key)}</span>
              <input className="th-input" type="time" step="300" value={state.settings.sleep?.[k] || ""}
                onChange={(e) => e.target.value && dispatch({ type: "settings", patch: { sleep: { ...state.settings.sleep, [k]: e.target.value } } })} />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}

/* Each tab's content is memoised: switching tabs doesn't re-render the other tabs. */
const TodayPanel = React.memo(function TodayPanel() { return <TodayScreen />; });
const TimersPanel = React.memo(function TimersPanel() {
  const { state } = useTimeHub();
  const tr = tracking(state);
  return (
    <Stack>
      {(tr.stamina || tr.store) && <StaminaWidget />}
      {tr.trek && <TrekWidget />}
      {tr.intel && <IntelWidget />}
      <TrainingWidget />
      <ResearchWidget />
      {tr.contrib && <ContributionWidget />}
    </Stack>
  );
});
const EventsPanel = React.memo(function EventsPanel() {
  return <Stack><EventsWidget /><BookingsWidget /><ShareCard /><HistoryWidget /></Stack>;
});
const CalcPanel = React.memo(function CalcPanel({ calculator }) { return <div className="th-calc-slot">{calculator}</div>; });
const Panel = React.memo(function Panel({ on, children }) {
  return (
    <div className={`th-panel ${on ? "on" : ""}`} hidden={!on}>
      <FreezeWhenHidden active={on}>
        <ActiveTab active={on}>{children}</ActiveTab>
      </FreezeWhenHidden>
    </div>
  );
});

const TODAY_EL = <TodayPanel />;
const TIMERS_EL = <TimersPanel />;
const EVENTS_EL = <EventsPanel />;

function TimeHubBody({ showHeader, headerExtra, calculator }) {
  const { t, dir, compact } = useTimeHub();
  const { tab } = useTab();
  const [settings, setSettings] = useState(false);
  const pressed = tab === "calc" && !calculator ? "today" : tab;
  // One synchronous swap: the tab and its screen appear in the same frame (no in-between state).
  const active = pressed;
  // Panels stay mounted once visited (switching back is instant); hidden ones stop ticking.
  const [visited, setVisited] = useState(() => new Set([active]));
  if (!visited.has(active)) setVisited(new Set([...visited, active]));
  // After the first screen is up, quietly prepare the other tabs so their first open is instant too.
  useEffect(() => {
    const all = ["today", "timers", "events", ...(calculator ? ["calc"] : [])];
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
    // in a transition, so a tap during this background work always wins
    const id = idle(() => startTransition(() => setVisited((v) => (all.every((x) => v.has(x)) ? v : new Set([...v, ...all])))));
    return () => (window.cancelIdleCallback || clearTimeout)(id);
  }, [calculator]); // eslint-disable-line react-hooks/exhaustive-deps
  // Each tab keeps its own scroll position.
  const scrolls = React.useRef({});
  const prev = React.useRef(active);
  React.useLayoutEffect(() => {
    if (prev.current === active) return;
    scrolls.current[prev.current] = window.scrollY;
    prev.current = active;
    window.scrollTo(0, scrolls.current[active] || 0);
    setSettings(false);
  }, [active]);

  const panel = (id, content) => visited.has(id) && <Panel key={id} on={active === id}>{content}</Panel>;

  // Optional speed readout (⚙ → Show tab speed): time from your tap to the new tab being drawn.
  const { state } = useTimeHub();
  const [speed, setSpeed] = useState(null);
  React.useLayoutEffect(() => {
    if (!state.settings.showSpeed || !window.__thTap) return;
    const t0 = window.__thTap;
    window.__thTap = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => setSpeed({ tab: active, ms: Math.round(performance.now() - t0) })));
  }, [active, state.settings.showSpeed]);

  return (
    <div className={`th-root th-app ${active === "calc" ? "is-calc" : ""} ${compact ? "th-compact" : ""}`} dir={dir}
      onPointerDownCapture={(e) => onPress(e.target)}>
      {active !== "calc" && showHeader && <Header title={t(`tab_${active}`)} headerExtra={headerExtra} settingsOpen={settings} onSettings={() => setSettings(!settings)} />}
      {active !== "calc" && (settings ? <SettingsPanel headerExtra={headerExtra} /> : <AccountGrid onAdd={() => setSettings(true)} />)}
      <main className={settings && active !== "calc" ? "th-hidden" : ""}>
        {panel("today", TODAY_EL)}
        {panel("timers", TIMERS_EL)}
        {panel("events", EVENTS_EL)}
        {calculator && panel("calc", <CalcPanel calculator={calculator} />)}
      </main>
      <TabBar hasCalc={!!calculator} active={pressed} />
      {state.settings.showSpeed && speed && <div className="th-speed" role="status">{t(`tab_${speed.tab}`)} · {speed.ms} ms</div>}
    </div>
  );
}

/**
 * <TimeHub lang headerExtra calculator />
 *   calculator — your existing Bear Trap calculator element. When given, it becomes the
 *   "BT Calculator" tab and the whole app shares one bottom tab bar.
 */
export default function TimeHub({ lang = "en", showHeader = true, headerExtra = null, calculator = null }) {
  return (
    <TimeHubProvider lang={lang}>
      <TimeHubBody showHeader={showHeader} headerExtra={headerExtra} calculator={calculator} />
    </TimeHubProvider>
  );
}

/** Frame for embedding single widgets elsewhere:
 *  <TimeHubWidgetFrame lang={lang}><BookingsWidget /></TimeHubWidgetFrame> */
export function TimeHubWidgetFrame({ lang = "en", children }) {
  return (
    <TimeHubProvider lang={lang}>
      <FrameInner>{children}</FrameInner>
    </TimeHubProvider>
  );
}
function FrameInner({ children }) {
  const { dir, compact } = useTimeHub();
  return <div className={`th-root ${compact ? "th-compact" : ""}`} dir={dir}>{children}</div>;
}
