/* ============================================================
   FIRST-USE WALKTHROUGH — a short guided card, one setting at a time.
   Shows once (settings.tour = "done" | "skipped"); replay from ⚙.
   Plain outline highlight, no animation (keeps iPhone drawing cheap).
   ============================================================ */
import React, { useEffect, useLayoutEffect } from "react";
import { useTimeHub, useTab } from "../TimeHubContext.jsx";
import { Btn } from "../components/ui.jsx";

export const TOUR_STEPS = [
  { id: "intro" },
  { id: "accounts", settings: true, target: "#th-set-accounts" },
  { id: "zone", settings: true, target: "#th-set-general" },
  { id: "camps", tab: "timers", settings: false, target: "#th-sec-training .th-camptimes" },
  { id: "track", settings: true, target: "#th-set-track" },
  { id: "sleep", settings: true, target: "#th-set-sleep" },
  { id: "champ", settings: true, target: "#th-set-champ" },
  { id: "done" },
];

export function Tour({ step, setStep, setSettings }) {
  const { t, dispatch } = useTimeHub();
  const { setTab } = useTab();
  const s = TOUR_STEPS[step];

  // open the right screen for this step
  useEffect(() => {
    if (!s) return;
    if (s.tab) setTab(s.tab);
    if (s.settings !== undefined) setSettings(s.settings);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // highlight the setting (after the screen has rendered)
  useLayoutEffect(() => {
    if (!s?.target) return undefined;
    let el = null;
    const id = requestAnimationFrame(() => {
      el = document.querySelector(s.target);
      if (!el) return;
      el.classList.add("th-tour-focus");
      el.scrollIntoView({ block: "center" });
    });
    return () => { cancelAnimationFrame(id); el?.classList.remove("th-tour-focus"); };
  }, [step, s?.target]);

  if (!s) return null;
  const finish = (how) => { dispatch({ type: "settings", patch: { tour: how } }); setStep(null); setSettings(false); setTab("today"); };
  const last = step === TOUR_STEPS.length - 1;
  return (
    <div className="th-tour" role="dialog" aria-live="polite" aria-label={t("tourTitle")}>
      <div className="th-tour-top">
        <b>{t(`tour_${s.id}_title`)}</b>
        <span className="th-tour-count">{step + 1} / {TOUR_STEPS.length}</span>
      </div>
      <p>{t(`tour_${s.id}_text`)}</p>
      <div className="th-tour-actions">
        {!last && <button type="button" className="th-link" onClick={() => finish("skipped")}>{t("tourSkip")}</button>}
        <span style={{ flex: 1 }} />
        {step > 0 && <Btn small onClick={() => setStep(step - 1)}>{t("tourBack")}</Btn>}
        {last
          ? <Btn small tone="gold" onClick={() => finish("done")}>{t("tourDone")}</Btn>
          : <Btn small tone="gold" onClick={() => setStep(step + 1)}>{step === 0 ? t("tourStart") : t("tourNext")}</Btn>}
      </div>
    </div>
  );
}
