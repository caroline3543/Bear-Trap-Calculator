/* ============================================================
   TIME HUB page (v2): one dashboard for every account.
     <TimeHub lang={lang} />
   Inherits the calculator's CSS variables (light/dark) from its wrapper.
   ============================================================ */
import React, { useEffect, useState } from "react";
import "./timehub.css";
import { TimeHubProvider, useTimeHub } from "./TimeHubContext.jsx";
import { useNow } from "./hooks/useNow.js";
import { zoneCity, deviceTimeZone, intlLocale } from "./lib/time.js";
import { splitColumns } from "./lib/layout.js";
import { TimeZonePicker, BrushUnderline, SectionIcon, TabIcon } from "./components/ui.jsx";
import { ALL, MAX_ACCOUNTS } from "./lib/accounts.js";
import { StaminaWidget, TrekWidget } from "./widgets/DailyWidgets.jsx";
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
  return (
    <svg className="th-bear-clock" width="62" height="50" viewBox="0 0 86 70" aria-hidden="true">
      <circle cx="18" cy="14" r="9" className="fur" /><circle cx="18" cy="14" r="4.5" className="face" opacity=".85" />
      <circle cx="56" cy="14" r="9" className="fur" /><circle cx="56" cy="14" r="4.5" className="face" opacity=".85" />
      <ellipse cx="37" cy="34" rx="25" ry="23" className="fur" />
      <path d="M16 52 Q37 64 58 52 L56 60 Q37 70 18 60z" className="scarf" />
      <ellipse cx="37" cy="41" rx="11" ry="9" className="face" />
      <circle cx="28" cy="31" r="2.6" fill="#241B10" /><circle cx="46" cy="31" r="2.6" fill="#241B10" />
      <ellipse cx="37" cy="38" rx="4" ry="3" fill="#241B10" />
      <circle cx="68" cy="52" r="13" className="clock" /><path d="M68 45v8l5 3" className="hands" />
    </svg>
  );
}

/** Compact header for Time Hub tabs: bear, tab title, local date · city, settings. */
function Header({ title, headerExtra, onSettings, settingsOpen }) {
  const { tz, lang, t } = useTimeHub();
  const now = useNow();
  const long = new Intl.DateTimeFormat(intlLocale(lang), { timeZone: tz, weekday: "long", day: "numeric", month: "short" }).format(now);
  return (
    <header className="th-mhdr">
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

function TabBar({ hasCalc }) {
  const { t, tab, setTab } = useTimeHub();
  return (
    <nav className="th-tabbar" aria-label={t("mainNav")}>
      {TABS.filter((x) => x.id !== "calc" || hasCalc).map((x) => (
        <button key={x.id} type="button" aria-current={tab === x.id ? "page" : undefined} className={tab === x.id ? "on" : ""} onClick={() => setTab(x.id)}>
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
        </div>
      </section>
    </div>
  );
}

function TimeHubBody({ showHeader, headerExtra, calculator }) {
  const { t, dir, compact, tab } = useTimeHub();
  const [settings, setSettings] = useState(false);
  const active = tab === "calc" && !calculator ? "today" : tab;
  if (active === "calc") {
    return (
      <div className={`th-root th-app is-calc ${compact ? "th-compact" : ""}`} dir={dir}>
        <div className="th-calc-slot">{calculator}</div>
        <TabBar hasCalc />
      </div>
    );
  }
  return (
    <div className={`th-root th-app ${compact ? "th-compact" : ""}`} dir={dir}>
      {showHeader && <Header title={t(`tab_${active}`)} headerExtra={headerExtra} settingsOpen={settings} onSettings={() => setSettings(!settings)} />}
      {settings ? <SettingsPanel headerExtra={headerExtra} /> : <AccountGrid onAdd={() => setSettings(true)} />}
      {!settings && (
        <main className="th-tabpanel" key={active}>
          {active === "today" && <TodayScreen />}
          {active === "timers" && <Stack><StaminaWidget /><TrekWidget /><TrainingWidget /><ResearchWidget /><ContributionWidget /></Stack>}
          {active === "events" && <Stack><EventsWidget /><BookingsWidget /><ShareCard /><HistoryWidget /></Stack>}
        </main>
      )}
      <TabBar hasCalc={!!calculator} />
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
