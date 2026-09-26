/* ============================================================
   SPEED TEST (⚙ → Run speed test). Runs on the real phone.
   Switches tabs by itself and times each switch in three stages:
     JS      — React updating the page (tap → change applied)
     Layout  — the browser working out styles and positions
     Draw    — painting/compositing until the next frame is on screen
   Then repeats with one suspect switched off at a time, so the
   difference shows what costs the time on this device.
   ============================================================ */
import React, { useState } from "react";
import { flushSync } from "react-dom";
import { useTimeHub, useTab } from "../TimeHubContext.jsx";
import { haptic, setFeedbackPrefs } from "../lib/feedback.js";
import { Btn } from "../components/ui.jsx";

/** Set by TimeHubBody: whether hidden tabs stay in memory (normal) or are rebuilt each time. */
export const diag = { keepTabs: true, onCommit: null };

const CONFIGS = [
  { id: "normal", label: "Normal" },
  { id: "noanim", label: "No animations", cls: "th-diag-noanim" },
  { id: "noshadow", label: "No shadows", cls: "th-diag-noshadow" },
  { id: "nolayers", label: "No GPU layers", cls: "th-diag-nolayers" },
  { id: "nocontain", label: "No layout isolation", cls: "th-diag-nocontain" },
  { id: "rebuild", label: "Rebuild tabs (not kept)", keep: false },
  { id: "nohaptic", label: "No haptics", haptics: false },
];

const frame = () => new Promise((r) => requestAnimationFrame(() => r(performance.now())));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

let lastResults = null;

export function SpeedTest({ closeSettings, reopenSettings, hasCalc }) {
  const { t, state } = useTimeHub();
  const { setTab } = useTab();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(lastResults);
  const [copied, setCopied] = useState(false);
  const tabs = ["today", "timers", "events", ...(hasCalc ? ["calc"] : [])];

  async function switchTo(id, withHaptic) {
    const btn = document.querySelector(`.th-tabbar button:nth-child(${tabs.indexOf(id) + 2})`);
    const t0 = performance.now();
    if (withHaptic) haptic("light");
    let committed = 0;
    diag.onCommit = () => { committed = performance.now(); };
    flushSync(() => setTab(id));
    const t1 = committed || performance.now();
    document.body.getBoundingClientRect(); // forces style + layout now, so we can time it
    const t2 = performance.now();
    await frame();
    const t3 = await frame();
    btn?.blur?.();
    return { js: t1 - t0, layout: t2 - t1, draw: t3 - t2, total: t3 - t0 };
  }

  async function run() {
    setRunning(true);
    closeSettings();
    await new Promise((r) => setTimeout(r, 600));
    const html = document.documentElement;
    const out = [];
    for (const c of CONFIGS) {
      if (c.cls) html.classList.add(c.cls);
      diag.keepTabs = c.keep !== false;
      setFeedbackPrefs({ haptics: c.haptics !== false && state.settings.haptics !== false });
      const per = {};
      // warm up once, then three measured rounds
      for (let round = 0; round < 4; round++) {
        for (const id of tabs) {
          const m = await switchTo(id, c.haptics !== false);
          if (round > 0) (per[id] ||= []).push(m);
          await new Promise((r) => setTimeout(r, 120));
        }
      }
      const row = { label: c.label };
      for (const id of tabs) {
        const ms = per[id];
        row[id] = { total: median(ms.map((m) => m.total)), js: median(ms.map((m) => m.js)), layout: median(ms.map((m) => m.layout)), draw: median(ms.map((m) => m.draw)) };
      }
      out.push(row);
      if (c.cls) html.classList.remove(c.cls);
    }
    diag.keepTabs = true;
    setFeedbackPrefs({ haptics: state.settings.haptics !== false });
    const nodes = {};
    document.querySelectorAll(".th-panel").forEach((p, i) => { nodes[i] = p.getElementsByTagName("*").length; });
    lastResults = { rows: out, tabs, ua: navigator.userAgent, nodes, when: new Date().toISOString() };
    flushSync(() => setTab("today"));
    reopenSettings();
    setRunning(false);
  }

  const text = results && [
    `Time Hub speed test · ${results.when}`,
    results.ua,
    `elements per tab: ${Object.values(results.nodes).join(" / ")}`,
    "",
    `${"".padEnd(24)}${results.tabs.map((x) => x.padStart(9)).join("")}`,
    ...results.rows.map((r) => `${r.label.padEnd(24)}${results.tabs.map((x) => `${Math.round(r[x].total)}`.padStart(9)).join("")}`),
    "",
    "Normal, split (JS / layout / draw):",
    ...results.tabs.map((x) => { const m = results.rows[0][x]; return `  ${x}: ${Math.round(m.js)} / ${Math.round(m.layout)} / ${Math.round(m.draw)} ms`; }),
  ].join("\n");

  return (
    <div className="th-speedtest">
      <p className="th-sec-sub">{t("speedTestHelp")}</p>
      <Btn tone="gold" onClick={run} disabled={running}>{running ? t("speedTestRunning") : t("speedTestRun")}</Btn>
      {results && (
        <>
          <div className="th-speed-table" role="table" aria-label={t("speedTestResults")}>
            <div role="row" className="head"><span role="columnheader" />{results.tabs.map((x) => <span role="columnheader" key={x}>{t(`tab_${x}`)}</span>)}</div>
            {results.rows.map((r) => (
              <div role="row" key={r.label}><span role="rowheader">{r.label}</span>{results.tabs.map((x) => <span role="cell" key={x}>{Math.round(r[x].total)}</span>)}</div>
            ))}
          </div>
          <div className="th-speed-split">
            {results.tabs.map((x) => { const m = results.rows[0][x]; return <div key={x}><b>{t(`tab_${x}`)}</b> JS {Math.round(m.js)} · layout {Math.round(m.layout)} · draw {Math.round(m.draw)} ms</div>; })}
          </div>
          <Btn small onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ } }}>{copied ? t("copied") : t("copyResults")}</Btn>
        </>
      )}
    </div>
  );
}
