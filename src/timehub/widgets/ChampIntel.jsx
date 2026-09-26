/* Alliance Championship (leader in charge) + Lighthouse intel missions. */
import React from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useMinute } from "../hooks/useNow.jsx";
import { upcomingThursdays, champRounds, PREP_ROUNDS } from "../lib/championship.js";
import { formatTime, formatDate, HOUR } from "../lib/time.js";
import { Btn, SectionIcon, BrushUnderline } from "../components/ui.jsx";
import { success } from "../lib/feedback.js";

/** Setting champ = { leader, anchor } in one place. */
export function useChamp() {
  const { state, dispatch } = useTimeHub();
  const champ = state.settings.champ || { leader: null, anchor: null };
  const set = (patch) => dispatch({ type: "settings", patch: { champ: { ...champ, ...patch } } });
  return [champ, set];
}

/** "Thu 1 Oct" style choices for the Thursday a championship week starts (shown in local time). */
export function ChampWeekPicker() {
  const { t, tz, lang } = useTimeHub();
  const [champ, set] = useChamp();
  const now = useMinute();
  const options = upcomingThursdays(now, 2);
  const current = champ.anchor ? champRounds(champ.anchor, now - 3 * 24 * HOUR, now + 15 * 24 * HOUR)[0] : null;
  return (
    <div className="th-champ-pick">
      <span className="th-label">{t("champWhichWeek")}</span>
      <div className="th-item-actions">
        {options.map((thu) => {
          const on = champ.anchor && (thu - champ.anchor) % (14 * 24 * HOUR) === 0;
          return (
            <button key={thu} type="button" className={`th-daychip ${on ? "on" : ""}`} aria-pressed={!!on} onClick={() => { set({ leader: true, anchor: thu }); success(); }}>
              {formatDate(thu, "UTC", lang)}
            </button>
          );
        })}
      </div>
      {current && (
        <p className="th-note">{t("champNextRound1", { local: `${formatDate(current.start, tz, lang)} ${formatTime(current.start, tz, lang)}` })}</p>
      )}
    </div>
  );
}

/** Asked once on Today. */
export function ChampQuestion() {
  const { t } = useTimeHub();
  const [champ, set] = useChamp();
  if (champ.leader === false || (champ.leader && champ.anchor)) return null;
  return (
    <section className="th-card th-champ-q" aria-label={t("champQuestion")}>
      <div className="th-sec-head"><SectionIcon name="foundry" /><span className="th-sec-title">{t("champTitle")}</span></div>
      <BrushUnderline />
      {champ.leader == null ? (
        <>
          <p className="th-sec-sub">{t("champQuestion")}</p>
          <div className="th-item-actions">
            <Btn tone="gold" onClick={() => set({ leader: true })}>{t("yesLeader")}</Btn>
            <Btn onClick={() => set({ leader: false })}>{t("noLeader")}</Btn>
          </div>
        </>
      ) : (
        <>
          <p className="th-sec-sub">{t("champAskWeek")}</p>
          <ChampWeekPicker />
          <button type="button" className="th-link" onClick={() => set({ leader: false })}>{t("notLeaderAfterAll")}</button>
        </>
      )}
      <p className="th-note">{t("champChangeLater")}</p>
    </section>
  );
}

export { PREP_ROUNDS };
