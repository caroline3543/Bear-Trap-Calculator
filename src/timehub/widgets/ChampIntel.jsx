/* Alliance Championship (leader in charge) + Lighthouse intel missions. */
import React from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useMinute, useClockFor } from "../hooks/useNow.jsx";
import { upcomingThursdays, champRounds, PREP_ROUNDS } from "../lib/championship.js";
import { intelPeriod, pruneClaims, INTEL_MISSIONS_PER_REFRESH } from "../lib/daily.js";
import { formatTime, formatDate, HOUR } from "../lib/time.js";
import { Section, Btn, Ltr, AccountTag, SectionIcon, BrushUnderline, Remaining } from "../components/ui.jsx";
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

/** Timers tab: the current batch of intel missions, per account. */
export function IntelWidget() {
  const { t, tz, lang, accountIds, updateAccount, dataFor } = useTimeHub();
  const peek = intelPeriod(Date.now());
  const now = useClockFor([peek.next]);
  const p = intelPeriod(now);
  const clear = (acc) => { const at = Date.now(); updateAccount(acc, (d) => ({ ...d, claims: { ...pruneClaims(d.claims, at), [p.key]: at } })); success(); };
  return (
    <Section id="intel" icon="event" title={t("secIntel")} sub={t("intelSub", { n: INTEL_MISSIONS_PER_REFRESH })}>
      <div className="th-intel-now">
        <div><span>{t("intelArrived")}</span><b><Ltr>{formatTime(p.start, tz, lang)}</Ltr></b><small><Ltr>{formatTime(p.start, "UTC", lang)}</Ltr> UTC</small></div>
        <div><span>{t("intelNext")}</span><b><Ltr>{formatTime(p.next, tz, lang)}</Ltr></b><small><Remaining to={p.next} /></small></div>
      </div>
      {accountIds.map((a) => {
        const done = !!dataFor(a).claims?.[p.key];
        return (
          <div key={a} className={`th-intel-acc ${done ? "done" : ""}`}>
            <AccountTag accountId={a} />
            <span className="th-tone">{done ? t("intelClearedTick") : t("intelNotYet")}</span>
            {!done && <Btn small onClick={() => clear(a)}>{t("cleared")}</Btn>}
          </div>
        );
      })}
      <p className="th-note">💡 {t("intelTip")}</p>
    </Section>
  );
}

export { PREP_ROUNDS };
