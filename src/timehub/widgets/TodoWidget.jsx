/* ============================================================
   TO-DOS — Game / Personal / Work lists, and an ADHD-friendly Priority view of the SAME tasks.
   One source of truth: state.tasks (lib/storage.js → cleanTasks). Nothing here duplicates a task;
   completing, editing, or scheduling one here updates the Today timeline too, and vice versa.
   A task with no `start` is a plain to-do — it never enters the visual timeline (lib/plan.js
   only ever receives the scheduled subset) until the person explicitly adds it to the day.
   ============================================================ */
import React, { useMemo, useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useMinute } from "../hooks/useNow.jsx";
import { TASK_CATEGORIES, DEFAULT_TASK_MS, groupByPriority } from "../lib/tasks.js";
import { buildTimeline, placeTask, pruneTasks, parseTaskDuration, findGaps } from "../lib/plan.js";
import { localDayRange, formatTime, formatSpan } from "../lib/time.js";
import { Ltr, AccountTag, Btn, Seg } from "../components/ui.jsx";
import { success } from "../lib/feedback.js";

const CAT_LABEL = { game: "todoGame", personal: "todoPersonal", work: "todoWork" };
const PRIO_LABEL = { next: "prioNext", plan: "prioPlan", quick: "prioQuick", later: "prioLater" };
const PRIO_HINT = { next: "prioNextHint", plan: "prioPlanHint", quick: "prioQuickHint", later: "prioLaterHint" };

/** Every open-ended (non-timeline) task the person should still see today: unscheduled ones,
 *  plus anything scheduled today-or-earlier that's still not done (a slipped plan stays visible,
 *  it never quietly drops off just because the day moved on). Tasks scheduled for a later day
 *  don't clutter today's list — they'll appear here once that day arrives. */
function useTodayTasks() {
  const { state, tz } = useTimeHub();
  const now = useMinute();
  const todayEnd = localDayRange(now, tz, 0).end;
  return useMemo(() => (state.tasks || []).filter((t) => t.start == null || t.start < todayEnd), [state.tasks, todayEnd]);
}

function QuickAdd({ category, onDone }) {
  const { t, update, newId } = useTimeHub();
  const [title, setTitle] = useState("");
  const [durRaw, setDurRaw] = useState("");
  const ms = durRaw ? parseTaskDuration(durRaw) : null;
  const add = () => {
    if (!title.trim()) return;
    update((s) => ({ ...s, tasks: [...pruneTasks(s.tasks, Date.now()), {
      id: newId(), title: title.trim().slice(0, 120), category, durationMs: ms, start: null, end: null,
      accountId: null, important: null, done: false, createdAt: Date.now(),
    }] }));
    success();
    setTitle(""); setDurRaw("");
    onDone?.();
  };
  return (
    <form className="th-todo-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
      <input className="th-input" value={title} maxLength={120} placeholder={t("todoPlaceholder")} onChange={(e) => setTitle(e.target.value)} />
      <input className="th-input th-task-dur th-todo-dur" inputMode="numeric" value={durRaw} placeholder={t("durPlaceholder")} onChange={(e) => setDurRaw(e.target.value.replace(/[^\d:]/g, ""))} />
      <Btn small tone="gold" type="submit" disabled={!title.trim()}>{t("add")}</Btn>
    </form>
  );
}


/** Offers real, currently-open gaps on today's timeline for this task's length; picking one
 *  schedules it (same task object — nothing is duplicated into a second timeline entry). */
function ScheduleTask({ task, onDone }) {
  const { t, tz, lang, state, update } = useTimeHub();
  const now = useMinute();
  const day = localDayRange(now, tz, 0);
  const ms = task.durationMs || DEFAULT_TASK_MS;
  const timeline = useMemo(() => {
    const dayTasks = (state.tasks || []).filter((x) => x.start != null && x.start >= day.start && x.start < day.end && !x.done && x.id !== task.id);
    const agenda = []; // ScheduleTask only needs free gaps, not the full agenda item list
    return buildTimeline(agenda, dayTasks, day.start, day.end, now);
  }, [state.tasks, day.start, day.end, now, task.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const gaps = findGaps(timeline, ms, 3);
  const choose = (gap) => {
    const p = placeTask(gap, ms);
    update((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === task.id ? { ...x, start: p.start, end: p.end, durationMs: ms } : x)) }));
    success();
    onDone();
  };
  return (
    <div className="th-todo-schedule">
      <span className="th-label">{t("chooseATime", { dur: formatSpan(ms, lang) })}</span>
      {gaps.length === 0 && <p className="th-note">{t("noGapToday")}</p>}
      {gaps.map((g) => (
        <button key={g.start} type="button" className="th-todo-gap-opt" onClick={() => choose(g)}>
          <b><Ltr>{formatTime(g.start, tz, lang)}</Ltr>–<Ltr>{formatTime(g.start + ms, tz, lang)}</Ltr></b>
          <span>{t("freeTime", { time: formatSpan(g.ms, lang) })}</span>
        </button>
      ))}
      <button type="button" className="th-link" onClick={onDone}>{t("cancel")}</button>
    </div>
  );
}

function TodoRow({ task, showAccount, onImportant }) {
  const { t, tz, lang, update } = useTimeHub();
  const [scheduling, setScheduling] = useState(false);
  const toggle = () => { update((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)) })); success(); };
  const acct = showAccount && task.accountId;
  return (
    <li className={`th-todo-row ${task.done ? "done" : ""}`}>
      <div className="th-todo-line">
        <button type="button" className="th-task-check" aria-pressed={task.done} aria-label={task.title} onClick={toggle}>{task.done ? "✓" : ""}</button>
        <div className="th-todo-main">
          <span className="th-todo-title">{task.title}</span>
          <span className="th-todo-meta">
            {task.durationMs && formatSpan(task.durationMs, lang)}
            {task.start != null && <>{task.durationMs ? " · " : ""}{t("scheduledAt", { time: formatTime(task.start, tz, lang) })}</>}
            {task.start == null && !task.done && task.durationMs && (
              <> · <button type="button" className="th-link" onClick={() => setScheduling(!scheduling)}>{t("addToTimeline")}</button></>
            )}
          </span>
          {acct && <AccountTag accountId={acct} />}
        </div>
        {!task.done && onImportant && (
          <button type="button" className={`th-todo-star ${task.important ? "on" : ""}`} aria-pressed={!!task.important}
            aria-label={t("markImportant")} onClick={() => onImportant(task, !task.important)}>★</button>
        )}
      </div>
      {scheduling && <ScheduleTask task={task} onDone={() => setScheduling(false)} />}
    </li>
  );
}

function CategorySection({ category, tasks, count }) {
  const { t, state, dispatch } = useTimeHub();
  const open = state.settings.todoOpen[category] !== false;
  const setOpen = (v) => dispatch({ type: "settings", patch: { todoOpen: { ...state.settings.todoOpen, [category]: v } } });
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const openTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);
  return (
    <div className="th-todo-cat">
      <button type="button" className="th-todo-cat-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="th-todo-cat-chevron">{open ? "▾" : "▸"}</span>
        <span className="th-todo-cat-name">{t(CAT_LABEL[category])}</span>
        <span className="th-count">{count}</span>
      </button>
      {open && (
        <div className="th-todo-cat-body">
          {openTasks.length === 0 && <p className="th-note">{t("todoEmpty")}</p>}
          {openTasks.length > 0 && (
            <ul className="th-slist">
              {openTasks.map((task) => <TodoRow key={task.id} task={task} showAccount={category === "game"} />)}
            </ul>
          )}
          {adding ? <QuickAdd category={category} onDone={() => setAdding(false)} /> : (
            <button type="button" className="th-gap-add" onClick={() => setAdding(true)}>＋ {t("addCategoryTask", { cat: t(CAT_LABEL[category]) })}</button>
          )}
          {doneTasks.length > 0 && (
            <div className="th-todo-done">
              <button type="button" className="th-link" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>{t("completedN", { n: doneTasks.length })}</button>
              {showDone && <ul className="th-slist">{doneTasks.map((task) => <TodoRow key={task.id} task={task} showAccount={category === "game"} />)}</ul>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PrioritySection({ id, tasks, onImportant }) {
  const { t, state, dispatch } = useTimeHub();
  const open = state.settings.prioOpen[id] !== false;
  const setOpen = (v) => dispatch({ type: "settings", patch: { prioOpen: { ...state.settings.prioOpen, [id]: v } } });
  return (
    <div className={`th-todo-cat th-prio-${id}`}>
      <button type="button" className="th-todo-cat-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="th-todo-cat-chevron">{open ? "▾" : "▸"}</span>
        <span className="th-todo-cat-name">{t(PRIO_LABEL[id])}</span>
        <span className="th-count">{tasks.length}</span>
      </button>
      {open && (
        <div className="th-todo-cat-body">
          <p className="th-note">{t(PRIO_HINT[id])}</p>
          {tasks.length === 0 && <p className="th-note">{t("todoEmpty")}</p>}
          {tasks.length > 0 && <ul className="th-slist">{tasks.map((task) => <TodoRow key={task.id} task={task} showAccount onImportant={onImportant} />)}</ul>}
        </div>
      )}
    </div>
  );
}

export function TodoWidget({ standalone } = {}) {
  const { t, state, dispatch, tz, update } = useTimeHub();
  const now = useMinute();
  const tasks = useTodayTasks();
  const filter = state.settings.todoFilter;
  const view = state.settings.todoView;
  const setFilter = (v) => dispatch({ type: "settings", patch: { todoFilter: v } });
  const setView = (v) => dispatch({ type: "settings", patch: { todoView: v } });
  const onImportant = (task, val) => update((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === task.id ? { ...x, important: val } : x)) }));

  const byCat = Object.fromEntries(TASK_CATEGORIES.map((c) => [c, tasks.filter((x) => x.category === c)]));
  const openCount = tasks.filter((x) => !x.done).length;
  const doneCount = tasks.length - openCount;
  const dayEnd = localDayRange(now, tz, 0).end;
  const buckets = useMemo(() => groupByPriority(filter === "all" ? tasks : byCat[filter] || [], now, dayEnd), [tasks, filter, now, dayEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className={`th-todos ${standalone ? "" : "th-card"}`} aria-label={t("todosTitle")} id="th-sec-todos">
      <div className="th-todos-head">
        <h2 className="th-sband-title">{t("todosTitle")}</h2>
        {tasks.length > 0 && <span className="th-sec-sub">{t("todoProgress", { n: doneCount, total: tasks.length })}</span>}
      </div>
      <div className="th-todos-toolbar">
        <Seg value={view} onChange={setView} label={t("todoView")} options={[
          { value: "list", label: t("todoViewList") }, { value: "priority", label: t("todoViewPriority") },
        ]} />
        {view === "priority" && (
          <div className="th-todos-filter">
            {["all", ...TASK_CATEGORIES].map((c) => (
              <button key={c} type="button" className={`th-chip-btn small ${filter === c ? "on" : ""}`} aria-pressed={filter === c} onClick={() => setFilter(c)}>
                {c === "all" ? t("all") : t(CAT_LABEL[c])}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === "list" ? (
        <div className="th-todo-lists">
          {TASK_CATEGORIES.map((c) => <CategorySection key={c} category={c} tasks={byCat[c]} count={byCat[c].filter((x) => !x.done).length} />)}
        </div>
      ) : (
        <div className="th-todo-lists">
          {["next", "plan", "quick", "later"].map((id) => <PrioritySection key={id} id={id} tasks={buckets[id]} onImportant={onImportant} />)}
        </div>
      )}
    </section>
  );
}
