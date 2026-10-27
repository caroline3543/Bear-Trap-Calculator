import React from 'react';
import { useTimeHub, useTab } from '../timehub/TimeHubContext.jsx';
import { useMinute } from '../timehub/hooks/useNow.jsx';
import { todayView } from '../timehub/lib/todo.js';
import { formatTime, formatSpan, MINUTE, DAY } from '../timehub/lib/time.js';

/** A small native vector mark: no remote image or font request is needed. */
export function PolarMark() {
  return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect width="48" height="48" rx="16" fill="currentColor" />
    <path d="M12 24c-4-6 2-12 7-7a16 16 0 0 1 10 0c5-5 11 1 7 7 4 13-4 17-12 17S8 37 12 24Z" fill="#F4F1E8" />
    <circle cx="18" cy="27" r="1.5" fill="#24443C"/><circle cx="30" cy="27" r="1.5" fill="#24443C"/>
    <path d="M21 31q3-3 6 0l-3 3Z" fill="#24443C"/><path d="m36 7 1.5 3.5L41 12l-3.5 1.5L36 17l-1.5-3.5L31 12l3.5-1.5Z" fill="#DCA56A"/>
  </svg>;
}
export function JournalBrand({ mobile = false }) {
  const { t } = useTimeHub();
  const { setTab } = useTab();
  return <button type="button" className={`journal-brand ${mobile ? 'journal-brand-mobile' : ''}`} onClick={() => setTab('today')} aria-label={t('journalHome')}>
    <PolarMark /><span><b>TIME HUB</b><small>{t('tab_calc')}</small></span>
  </button>;
}
export function JournalNavFooter() {
  const { t, lang } = useTimeHub();
  const now = useMinute();
  const reset = (Math.floor(now / DAY) + 1) * DAY;
  return <div className="journal-nav-footer"><span className="journal-smallcap">{t('journalServerClock')}</span>
    <div><b>{formatTime(now, 'UTC', lang)}</b><span>UTC</span></div>
    <p>{t('journalResetIn', { time: formatSpan(Math.max(MINUTE, reset - now), lang) })}</p>
    <span className="journal-footer-note">{t('journalPace')}</span>
  </div>;
}
const NUMBER = { today: '01', todos: '02', timers: '03', events: '04', calc: '05', settings: '06' };
/** Describes each real workflow without inventing user activity or account data. */
export function JournalPageContext({ page }) {
  const { t, state, tz, accountIds } = useTimeHub();
  const now = useMinute();
  const { setTab } = useTab();
  const today = todayView(state.tasks, now, tz);
  const running = accountIds.flatMap((id) => state.accountData[id]?.timers || []).filter((timer) => timer.endAt > now).length;
  const activeFocus = state.settings.focus && state.settings.focus.pausedAt == null && today.open.some((task) => task.id === state.settings.focus.taskId);
  if (page === 'calc' || (page === 'todos' && activeFocus)) return null;
  return <section className="journal-context" aria-label={t('journalPageOverview')}>
    <div className="journal-context-copy"><span className="journal-smallcap">{NUMBER[page]} / {t(`journal_${page}_eyebrow`)}</span><p>{t(`journal_${page}_sub`)}</p></div>
    {page === 'today' && <div className="journal-brief-actions">
      <button type="button" onClick={() => setTab('todos')}><strong>{today.open.length}</strong><span>{t('journalTasksToday')}</span><span aria-hidden="true">↗</span></button>
      <button type="button" onClick={() => setTab('timers')}><strong>{running}</strong><span>{t('journalRunningTimers')}</span><span aria-hidden="true">↗</span></button>
    </div>}
    {page === 'todos' && today.done.length > 0 && <span className="journal-completed">{t('nCompleted', { n: today.done.length })}</span>}
  </section>;
}
const LINKS = {
  timers: [['training', 'secTraining'], ['research', 'secResearch'], ['contrib', 'secContrib']],
  events: [['events', 'secEvents'], ['bookings', 'secBookings']],
  settings: [['accounts', 'journalAccounts'], ['general', 'journalPreferences'], ['track', 'whatToTrack'], ['sleep', 'sleepHours']],
};
export function JournalSectionLinks({ page }) {
  const { t, state, dispatch } = useTimeHub();
  const links = (LINKS[page] || []).filter(([id]) => id !== 'contrib' || state.settings.track?.contrib !== false);
  if (!links.length) return null;
  return <nav className="journal-section-links" aria-label={t('journalJumpTo')}>
    {links.map(([id, key]) => <a key={id} href={`#${page === 'settings' ? 'th-set' : 'th-sec'}-${id}`} onClick={() => {
      if (page !== 'settings') dispatch({ type: 'setSection', id, closed: false });
    }}>{t(key)}<span aria-hidden="true">↘</span></a>)}
  </nav>;
}
