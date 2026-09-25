/* Past events (hide keeps them, delete is explicit) + expired bookings, for the filtered accounts. */
import React from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useNow } from "../hooks/useNow.jsx";
import { partitionEvents, relevantTime, eventName } from "../lib/events.js";
import { partitionBookings } from "../lib/bookings.js";
import { matchesFilter } from "../lib/accounts.js";
import { formatTime, formatDate } from "../lib/time.js";
import { Section, Btn, Ltr, AccountTag } from "../components/ui.jsx";

export function HistoryWidget({ move }) {
  const { t, tz, lang, state, dispatch, accounts, filter, accountIds, dataFor, updateAccount, templates } = useTimeHub();
  const now = useNow();
  const showArchived = state.settings.showArchived;
  const { past } = partitionEvents(state.events.filter((e) => matchesFilter(e.accountId, accounts, filter)), now);
  const visiblePast = past.filter((r) => showArchived || !r.ev.archived);
  const hiddenCount = past.filter((r) => r.ev.archived).length;
  const expired = accountIds.flatMap((acc) => partitionBookings(dataFor(acc).bookings, now).expired.map((b) => ({ ...b, accountId: acc })));
  expired.sort((a, b) => b.startAt - a.startAt);
  const when = (ms) => <><Ltr>{formatTime(ms, tz, lang)}</Ltr> · {formatDate(ms, tz, lang)}</>;
  const setArchived = (ev, archived) => dispatch({ type: "upsert", collection: "events", item: { ...ev, archived } });

  return (
    <Section id="history" icon="plan" title={t("secHistory")} count={visiblePast.length + expired.length} move={move}>
      <h3 className="th-subhead">{t("pastEvents")}</h3>
      {visiblePast.length === 0 && <p className="th-note">—</p>}
      <div>
        {visiblePast.map(({ ev, occ }) => (
          <div key={ev.id} className="th-hist-row" style={ev.archived ? { opacity: 0.6 } : undefined}>
            <div style={{ minWidth: 0 }}>
              <div className="name">{eventName(ev, t, templates)} <AccountTag accountId={ev.accountId} /></div>
              <div className="when">{t("stCompleted")} {when(relevantTime(occ))}</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <Btn small onClick={() => setArchived(ev, !ev.archived)}>{ev.archived ? t("unhide") : t("hide")}</Btn>
              <Btn small tone="danger" onClick={() => window.confirm(t("confirmDelete")) && dispatch({ type: "remove", collection: "events", id: ev.id })}>{t("delete")}</Btn>
            </div>
          </div>
        ))}
      </div>
      {hiddenCount > 0 && (
        <button type="button" className="th-link" onClick={() => dispatch({ type: "settings", patch: { showArchived: !showArchived } })}>
          {showArchived ? t("hideHidden") : t("showHidden", { n: hiddenCount })}
        </button>
      )}
      <h3 className="th-subhead">{t("expiredBookings")}</h3>
      {expired.length === 0 && <p className="th-note">—</p>}
      <div>
        {expired.map((b) => (
          <div key={b.id} className="th-hist-row">
            <div className="name">{t(b.position)} <AccountTag accountId={b.accountId} /></div>
            <div className="when">{when(b.startAt)}</div>
          </div>
        ))}
      </div>
      {expired.length > 0 && (
        <Btn small tone="danger" onClick={() => window.confirm(t("confirmClear")) &&
          accountIds.forEach((acc) => updateAccount(acc, (d) => ({ ...d, bookings: d.bookings.filter((b) => !expired.some((x) => x.id === b.id)) })))}>
          {t("clearHistory")}
        </Btn>
      )}
    </Section>
  );
}
