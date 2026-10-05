/* ============================================================
   TO-DOS — Game / Personal / Work lists, and an ADHD-friendly Priority view of the SAME tasks.
   One source of truth: state.tasks (lib/storage.js → cleanTasks). Recurring tasks are ONE
   definition each; today's occurrence is derived (lib/todo.js → todayView), so completing,
   "Not today", and the day boundary never copy or delete the routine itself.

   Design rule for everything here: reduce the number of decisions needed to begin something.
   Capturing a task is title + duration; everything else is optional and folded away.
   No shame language: nothing "failed" or "missed" — "Still available today", "Not today".
   ============================================================ */
import React, { useMemo, useRef, useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";
import { useMinute, useNow } from "../hooks/useNow.jsx";
import { TASK_CATEGORIES, DEFAULT_TASK_MS, groupByPriority } from "../lib/tasks.js";
import { buildTimeline, placeTask, pruneTasks, parseTaskDuration } from "../lib/plan.js";
import { buildAgenda, groupContrib, groupTraining } from "../lib/agenda.js";
import { splitNow } from "../lib/today.js";
import { localDayRange, formatTime, formatSpan, formatDate, dayKey, MINUTE } from "../lib/time.js";
import {
  todayView, scheduledToday, setDone, notToday, removeToday, endSeries, placeAt, toggleSubtask, subDone,
  splitEssentials, todaySummary, history, minimumDayOn, energyToday, bestOpening, whatNow, routineTasks,
  ROUTINE_PRESETS, moveTask, weekdayOf, addDays,
} from "../lib/todo.js";
import { itemTitle } from "../components/labels.js";
import { Ltr, AccountTag, Btn, Seg, AccountSelect } from "../components/ui.jsx";
import { SwipeRow } from "./SwipeRow.jsx";
import { success } from "../lib/feedback.js";

const CAT_LABEL = { game: "todoGame", personal: "todoPersonal", work: "todoWork" };
const PRIO_LABEL = { next: "prioNext", plan: "prioPlan", quick: "prioQuick", later: "prioLater" };
const PRIO_HINT = { next: "prioNextHint", plan: "prioPlanHint", quick: "prioQuickHint", later: "prioLaterHint" };
const REPEAT_LABEL = { never: "repeatNever", daily: "repeatDaily", weekdays: "repeatWeekdays", weekly: "repeatWeekly", custom: "repeatCustom" };
const WHEN_LABEL = { anytime: "whenAnytime", morning: "whenMorning", afternoon: "whenAfternoon", evening: "whenEvening", time: "whenTime" };
const REMIND_LABEL = { none: "remindNone", time: "remindTime", morning: "whenMorning", afternoon: "whenAfternoon", evening: "whenEvening", later: "remindLater" };
const EFFORT_LABEL = { tiny: "effortTiny", low: "effortLow", medium: "effortMedium", high: "effortHigh" };
const FOCUS_MS = 5 * MINUTE;

const mapTask = (s, id, fn) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? fn(x) : x)) });

/** Today's derived view (open / done / skipped), shared by every part of this tab. */
function useView() {
  const { state, tz } = useTimeHub();
  const now = useMinute();
  return useMemo(() => todayView(state.tasks, now, tz), [state.tasks, now, tz]);
}

/** Today's free windows from now on, each labelled with what comes next ("before Bear Trap"),
 *  built from the same agenda + scheduled tasks as the Timeline. */
export function useDayGaps() {
  const { state, tz, accountIds, t, templates } = useTimeHub();
  const now = useMinute();
  return useMemo(() => {
    const day = localDayRange(now, tz, 0);
    const items = groupContrib(groupTraining(buildAgenda(state, day.start, day.end, accountIds, now)));
    const { rest } = splitNow(items);
    const tasks = scheduledToday(todayView(state.tasks, now, tz), day.start, day.end).filter((x) => !x.done && x.end > now);
    const tl = buildTimeline(rest, tasks, day.start, day.end, now);
    const gaps = [];
    tl.forEach((e, i) => {
      if (e.type !== "gap" || e.end <= now) return;
      const next = tl.slice(i + 1).find((x) => x.type !== "gap");
      const before = next ? (next.type === "task" ? next.task.title : itemTitle(next.item, t, templates)) : null;
      const start = Math.max(e.start, now);
      gaps.push({ start, end: e.end, ms: e.end - start, before });
    });
    return gaps;
  }, [state, accountIds.join(), now, tz]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ---------- small option pickers (shared by quick add "More options" and the edit form) ---------- */
function Chips({ value, options, onChange, label }) {
  return (
    <div className="th-todos-filter" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={`th-chip-btn small ${value === o.value ? "on" : ""}`} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

const WEEKDAY_KEYS = ["daySun", "dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat"];

function TaskOptions({ v, set, category }) {
  const { t, tz } = useTimeHub();
  const now = useMinute();
  const today = weekdayOf(dayKey(now, tz));
  const rtype = v.repeat?.type || "never";
  const setRepeat = (type) => set({
    ...v,
    repeat: type === "never" ? null : type === "weekly" ? { type, days: [today] } : type === "custom" ? { type, days: v.repeat?.days?.length ? v.repeat.days : [today] } : { type },
    // a repeating personal task defaults to "Anytime today" — never an arbitrary clock time
    when: type !== "never" && !v.repeat && category === "personal" && v.when === "time" ? "anytime" : v.when,
  });
  const toggleDay = (d) => {
    const days = v.repeat.days.includes(d) ? v.repeat.days.filter((x) => x !== d) : [...v.repeat.days, d].sort();
    if (days.length) set({ ...v, repeat: { ...v.repeat, days } });
  };
  return (
    <div className="th-task-opts">
      <span className="th-label">{t("repeatQ")}</span>
      <Chips value={rtype} onChange={setRepeat} label={t("repeatQ")} options={["never", "daily", "weekdays", "weekly", "custom"].map((x) => ({ value: x, label: t(REPEAT_LABEL[x]) }))} />
      {(rtype === "weekly" || rtype === "custom") && (
        <div className="th-todos-filter" role="group" aria-label={t("repeatDays")}>
          {WEEKDAY_KEYS.map((k, d) => (
            <button key={d} type="button" className={`th-chip-btn small ${v.repeat.days.includes(d) ? "on" : ""}`} aria-pressed={v.repeat.days.includes(d)}
              onClick={() => (rtype === "weekly" ? set({ ...v, repeat: { ...v.repeat, days: [d] } }) : toggleDay(d))}>{t(k)}</button>
          ))}
        </div>
      )}
      <span className="th-label">{t("whenQ")}</span>
      <Chips value={v.when} onChange={(w) => set({ ...v, when: w })} label={t("whenQ")} options={["anytime", "morning", "afternoon", "evening", "time"].map((x) => ({ value: x, label: t(WHEN_LABEL[x]) }))} />
      {v.when === "time" && <input className="th-input th-task-dur" type="time" aria-label={t("whenTime")} value={v.at || ""} onChange={(e) => set({ ...v, at: e.target.value })} />}
      <span className="th-label">{t("reminderQ")}</span>
      <Chips value={v.reminder} onChange={(r) => set({ ...v, reminder: r })} label={t("reminderQ")} options={["none", "morning", "afternoon", "evening", "time", "later"].map((x) => ({ value: x, label: t(REMIND_LABEL[x]) }))} />
      {v.reminder === "time" && <input className="th-input th-task-dur" type="time" aria-label={t("remindTime")} value={v.remindAt || ""} onChange={(e) => set({ ...v, remindAt: e.target.value })} />}
      <span className="th-hint">{t("reminderHint")}</span>
      <label className="th-check"><input type="checkbox" checked={!!v.essential} onChange={(e) => set({ ...v, essential: e.target.checked })} />{t("essentialLabel")}</label>
      <span className="th-label">{t("effortQ")} <span className="th-hint">{t("optional")}</span></span>
      <Chips value={v.effort || ""} onChange={(x) => set({ ...v, effort: v.effort === x ? null : x })} label={t("effortQ")} options={["tiny", "low", "medium", "high"].map((x) => ({ value: x, label: t(EFFORT_LABEL[x]) }))} />
    </div>
  );
}
const optsFrom = (task) => ({ repeat: task?.repeat || null, when: task?.when || "anytime", at: task?.at || "", reminder: task?.reminder || "none", remindAt: task?.remindAt || "", essential: !!task?.essential, effort: task?.effort || null });
const optsToTask = (o) => ({
  repeat: o.repeat, when: o.when === "time" && !o.at ? "anytime" : o.when, at: o.when === "time" ? o.at || null : null,
  reminder: o.reminder === "time" && !o.remindAt ? "none" : o.reminder, remindAt: o.reminder === "time" ? o.remindAt || null : null,
  essential: o.essential, effort: o.effort,
});

/* ---------- capture: title + duration, everything else folded away ---------- */
function QuickAdd({ category, group = null, onDone }) {
  const { t, update, newId, tz } = useTimeHub();
  const [title, setTitle] = useState("");
  const [durRaw, setDurRaw] = useState("");
  const [more, setMore] = useState(false);
  const [opts, setOpts] = useState(optsFrom(null));
  const ms = durRaw ? parseTaskDuration(durRaw) : null;
  const add = () => {
    if (!title.trim()) return;
    const now = Date.now();
    update((s) => ({ ...s, tasks: [...pruneTasks(s.tasks, now), {
      id: newId(), title: title.trim().slice(0, 120), category, durationMs: ms, start: null, end: null,
      accountId: null, important: null, done: false, createdAt: now, notes: "",
      ...optsToTask(opts), group, order: null, subtasks: [], occ: {}, createdDay: dayKey(now, tz),
    }] }));
    success();
    setTitle(""); setDurRaw(""); setOpts(optsFrom(null)); setMore(false);
    onDone?.();
  };
  return (
    <form className="th-todo-add-wrap" onSubmit={(e) => { e.preventDefault(); add(); }}>
      <div className="th-todo-add">
        <input className="th-input" value={title} maxLength={120} placeholder={t("whatToDoQ")} aria-label={t("whatToDoQ")} onChange={(e) => setTitle(e.target.value)} />
        <input className="th-input th-task-dur th-todo-dur" inputMode="numeric" value={durRaw} placeholder={t("durPlaceholder")} aria-label={t("durPlaceholder")} onChange={(e) => setDurRaw(e.target.value.replace(/[^\d:]/g, ""))} />
        <Btn small tone="gold" type="submit" disabled={!title.trim()}>{t("add")}</Btn>
      </div>
      <button type="button" className="th-link" aria-expanded={more} onClick={() => setMore(!more)}>{more ? t("fewerOptions") : t("moreOptions")}</button>
      {more && <TaskOptions v={opts} set={setOpts} category={category} />}
    </form>
  );
}

/* ---------- Add to Timeline: suggest the best opening, other times one tap away ---------- */
function ScheduleTask({ task, onDone }) {
  const { t, tz, lang, update } = useTimeHub();
  const gaps = useDayGaps();
  const [others, setOthers] = useState(false);
  const ms = task.durationMs || DEFAULT_TASK_MS;
  const fit = gaps.filter((g) => g.ms >= ms);
  const choose = (gap) => {
    const p = placeTask(gap, ms);
    const now = Date.now();
    update((s) => mapTask(s, task.id, (x) => ({ ...placeAt(x, p.start, p.end, now, tz), durationMs: ms })));
    success();
    onDone();
  };
  const opt = (g, best) => (
    <button key={g.start} type="button" className={`th-todo-gap-opt ${best ? "best" : ""}`} onClick={() => choose(g)}>
      <b><Ltr>{formatTime(g.start, tz, lang)}–{formatTime(g.start + ms, tz, lang)}</Ltr></b>
      <span>{g.before ? t("freeBefore", { time: formatSpan(g.ms, lang), what: g.before }) : t("freeTime", { time: formatSpan(g.ms, lang) })}</span>
      <span className="th-gap-addhere">{t("addHere")}</span>
    </button>
  );
  return (
    <div className="th-todo-schedule">
      {fit.length === 0 && <p className="th-note">{t("noGapToday")}</p>}
      {fit.length > 0 && <><span className="th-label">{t("suggested")}</span>{opt(fit[0], true)}</>}
      {fit.length > 1 && <button type="button" className="th-link" aria-expanded={others} onClick={() => setOthers(!others)}>{t("otherTimes")} ›</button>}
      {others && fit.slice(1, 5).map((g) => opt(g, false))}
      <button type="button" className="th-link" onClick={onDone}>{t("cancel")}</button>
    </div>
  );
}

/* ---------- Delete: a recurring task asks which one, like Reminders ---------- */
function DeleteChoice({ task, onDone }) {
  const { t, update, tz } = useTimeHub();
  const run = (fn) => { update(fn); onDone(); };
  if (!task.repeat) {
    return (
      <div className="th-del-choice" role="alertdialog" aria-label={t("deleteTaskQ")}>
        <span>{t("deleteTaskQ")}</span>
        <span className="th-item-actions">
          <Btn small tone="danger" onClick={() => run((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== task.id) }))}>{t("delete")}</Btn>
          <Btn small onClick={onDone}>{t("cancel")}</Btn>
        </span>
      </div>
    );
  }
  return (
    <div className="th-del-choice" role="alertdialog" aria-label={t("deleteRepeatingQ")}>
      <span>{t("deleteRepeatingQ")}</span>
      <span className="th-item-actions">
        <Btn small onClick={() => run((s) => mapTask(s, task.id, (x) => removeToday(x, Date.now(), tz)))}>{t("deleteTodayOnly")}</Btn>
        <Btn small tone="danger" onClick={() => run((s) => mapTask(s, task.id, (x) => endSeries(x, Date.now(), tz)))}>{t("deleteThisAndFuture")}</Btn>
        <Btn small onClick={onDone}>{t("cancel")}</Btn>
      </span>
    </div>
  );
}

/* ---------- "Make this easier": lightweight steps under the task ---------- */
function Steps({ task, editable }) {
  const { t, update, newId, tz } = useTimeHub();
  const now = useMinute();
  const k = dayKey(now, tz);
  const [title, setTitle] = useState("");
  const subs = task.subtasks || [];
  const add = () => {
    if (!title.trim()) return;
    update((s) => mapTask(s, task.id, (x) => ({ ...x, subtasks: [...(x.subtasks || []), { id: newId(), title: title.trim().slice(0, 80), doneOn: null }] })));
    setTitle("");
  };
  return (
    <div className="th-steps">
      <ul className="th-steps-list">
        {subs.map((st) => (
          <li key={st.id} className={subDone(task, st, k) ? "done" : ""}>
            <button type="button" className="th-step-check" aria-pressed={subDone(task, st, k)} aria-label={st.title}
              onClick={() => update((s) => mapTask(s, task.id, (x) => toggleSubtask(x, st.id, Date.now(), tz)))}>{subDone(task, st, k) ? "✓" : ""}</button>
            <span>{st.title}</span>
            {editable && <button type="button" className="th-link th-step-del" aria-label={`${t("delete")}: ${st.title}`}
              onClick={() => update((s) => mapTask(s, task.id, (x) => ({ ...x, subtasks: x.subtasks.filter((y) => y.id !== st.id) })))}>×</button>}
          </li>
        ))}
      </ul>
      {editable && (
        <form className="th-todo-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <input className="th-input" value={title} maxLength={80} placeholder={t("firstSmallStep")} aria-label={t("addStep")} onChange={(e) => setTitle(e.target.value)} />
          <Btn small type="submit" disabled={!title.trim()}>{t("addStep")}</Btn>
        </form>
      )}
    </div>
  );
}

/* ---------- edit ---------- */
function TaskEditForm({ task, onDone, onSchedule }) {
  const { t, lang, update, state, setFocus } = useTimeHub();
  const [title, setTitle] = useState(task.title);
  const [durRaw, setDurRaw] = useState(task.durationMs ? String(Math.round(task.durationMs / 60000)) : "");
  const [category, setCategory] = useState(task.category);
  const [accountId, setAccountId] = useState(task.accountId);
  const [notes, setNotes] = useState(task.notes || "");
  const [group, setGroup] = useState(task.group || "");
  const [opts, setOpts] = useState(optsFrom(task));
  const [easier, setEasier] = useState((task.subtasks || []).length > 0);
  const [deleting, setDeleting] = useState(false);
  const ms = durRaw ? parseTaskDuration(durRaw) : null;
  const groups = [...new Set((state.tasks || []).filter((x) => x.category === category && x.group).map((x) => x.group))];
  const save = () => {
    if (!title.trim()) return;
    update((s) => mapTask(s, task.id, (x) => ({
      ...x, title: title.trim().slice(0, 120), durationMs: ms, category,
      accountId: category === "game" ? accountId : null, notes: notes.trim().slice(0, 500), group: group.trim().slice(0, 40) || null,
      ...optsToTask(opts), occ: opts.repeat ? x.occ || {} : {}, createdDay: x.createdDay || null,
    })));
    success();
    onDone();
  };
  return (
    <div className="th-task-edit">
      <label className="th-field"><span className="th-label">{t("whatToDoQ")}</span><input className="th-input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></label>
      <div className="th-task-edit-row">
        <label className="th-field"><span className="th-label">{t("durPlaceholder")}</span><input className="th-input th-task-dur" inputMode="numeric" value={durRaw} placeholder="15" onChange={(e) => setDurRaw(e.target.value.replace(/[^\d:]/g, ""))} /></label>
        <Seg value={category} onChange={setCategory} label={t("category")} options={TASK_CATEGORIES.map((c) => ({ value: c, label: t(CAT_LABEL[c]) }))} />
      </div>
      {category === "game" && <AccountSelect value={accountId} onChange={setAccountId} allowShared />}
      <div className="th-item-actions">
        <Btn small tone="gold" onClick={() => { setFocus(task.id); onDone(); }}>▶ {t("startFiveMin")}</Btn>
        <Btn small aria-expanded={easier} onClick={() => setEasier(!easier)}>{t("makeEasier")}</Btn>
        {task.start == null && task.state === "pending" && <Btn small onClick={() => { onDone(); onSchedule?.(); }}>{t("addToTimeline")}</Btn>}
      </div>
      {easier && <><p className="th-hint">{t("makeEasierHint")}</p><Steps task={task} editable /></>}
      <TaskOptions v={opts} set={setOpts} category={category} />
      <label className="th-field"><span className="th-label">{t("groupLabel")} <span className="th-hint">{t("optional")}</span></span>
        <input className="th-input" list={`th-groups-${task.id}`} value={group} maxLength={40} placeholder={t("groupPlaceholder")} onChange={(e) => setGroup(e.target.value)} />
        <datalist id={`th-groups-${task.id}`}>{groups.map((g) => <option key={g} value={g} />)}</datalist>
      </label>
      <label className="th-field"><span className="th-label">{t("notes")}</span><textarea className="th-input th-textarea" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      {deleting ? <DeleteChoice task={task} onDone={() => { setDeleting(false); onDone(); }} /> : (
        <div className="th-item-actions">
          <Btn small tone="gold" onClick={save} disabled={!title.trim()}>{t("save")}</Btn>
          <Btn small onClick={onDone}>{t("cancel")}</Btn>
          <Btn small tone="danger" onClick={() => setDeleting(true)}>{t("delete")}</Btn>
        </div>
      )}
    </div>
  );
}

/* ---------- one row ---------- */
function metaLine(task, t, lang, tz, opening) {
  const bits = [];
  if (task.durationMs) bits.push(formatSpan(task.durationMs, lang));
  if (task.repeat) bits.push(task.repeat.type === "weekly" || task.repeat.type === "custom" ? task.repeat.days.map((d) => t(WEEKDAY_KEYS[d])).join(" ") : t(REPEAT_LABEL[task.repeat.type]));
  if (task.when && task.when !== "anytime") bits.push(task.when === "time" && task.at ? task.at : t(WHEN_LABEL[task.when]));
  if (task.start != null) bits.push(t("scheduledAt", { time: formatTime(task.start, tz, lang) }));
  // "fits now" is said ONCE at the top of the tab; a row only mentions a time when it doesn't fit now
  else if (opening && task.state === "pending" && !opening.now) bits.push(t("bestOpening", { time: formatTime(opening.start, tz, lang) }));
  return bits.join(" · ");
}

function TodoRow({ task, showAccount, onImportant, gaps, drag }) {
  const { t, tz, lang, update, state } = useTimeHub();
  const [scheduling, setScheduling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const now = useMinute();
  const k = dayKey(now, tz);
  const done = task.state === "done";
  const toggle = (e) => { e.stopPropagation(); const at = Date.now(); update((s) => mapTask(s, task.id, (x) => setDone(x, !done, at, tz))); if (!done) success(); };
  const acct = showAccount && task.accountId;
  const opening = state.settings.taskSuggest !== "minimal" && gaps && task.start == null ? bestOpening(task, gaps, now) : null;
  const subs = task.subtasks || [];
  const subsDone = subs.filter((s) => subDone(task, s, k)).length;
  const body = (
    <div className="th-todo-line">
      {drag && !done && (
        <button type="button" className="th-drag" aria-label={t("dragToMove", { title: task.title })}
          onPointerDown={(e) => drag.start(e, task)} onKeyDown={(e) => drag.key(e, task)}>⋮⋮</button>
      )}
      <button type="button" className="th-task-check" aria-pressed={done} aria-label={task.title} onClick={toggle}>{done ? "✓" : ""}</button>
      <button type="button" className="th-todo-main th-ev-hit" aria-expanded={editing} onClick={() => setEditing(!editing)}>
        <span className="th-todo-title">{task.title}{task.essential && <span className="th-ess" title={t("essentialLabel")}> · {t("essentialShort")}</span>}</span>
        <span className="th-todo-meta">{metaLine(task, t, lang, tz, opening)}</span>
        {acct && <AccountTag accountId={acct} />}
      </button>
      {!done && onImportant && (
        <button type="button" className={`th-todo-star ${task.important ? "on" : ""}`} aria-pressed={!!task.important}
          aria-label={t("markImportant")} onClick={() => onImportant(task, !task.important)}>★</button>
      )}
    </div>
  );
  return (
    <li className={`th-todo-row ${done ? "done" : ""} ${drag?.draggingId === task.id ? "dragging" : ""}`} data-drop="row" data-id={task.id} data-cat={task.category} data-group={task.group || ""}
      style={drag?.draggingId === task.id ? { transform: `translateY(${drag.dy}px)` } : undefined}>
      {done ? body : (
        <SwipeRow label={task.title} actions={[
          ...(task.start == null ? [{ label: t("timelineShort"), tone: "teal", onClick: () => setScheduling(true) }] : []),
          { label: t("notToday"), tone: "quiet", onClick: () => { const at = Date.now(); update((s) => mapTask(s, task.id, (x) => notToday(x, at, tz))); } },
          { label: t("delete"), onClick: () => setDeleting(true) },
        ]}>{body}</SwipeRow>
      )}
      {!done && subs.length > 0 && (
        <div className="th-todo-sub">
          <button type="button" className="th-link" aria-expanded={showSteps} onClick={() => setShowSteps(!showSteps)}>{t("stepsProgress", { n: subsDone, total: subs.length })}</button>
        </div>
      )}
      {showSteps && !editing && <Steps task={task} />}
      {deleting && <DeleteChoice task={task} onDone={() => setDeleting(false)} />}
      {editing && <TaskEditForm task={task} onDone={() => setEditing(false)} onSchedule={() => setScheduling(true)} />}
      {scheduling && <ScheduleTask task={task} onDone={() => setScheduling(false)} />}
    </li>
  );
}

/* ---------- drag and drop (handle) + keyboard moves ---------- */
function useDrag() {
  const { update } = useTimeHub();
  const [st, setSt] = useState(null); // { id, y0, dy, target }
  const ref = useRef(null);
  const targetAt = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest("[data-drop]");
    if (!el) return null;
    return { kind: el.dataset.drop, id: el.dataset.id || null, cat: el.dataset.cat, group: el.dataset.group || null };
  };
  const start = (e, task) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const s = { id: task.id, y0: e.clientY, dy: 0, target: null };
    ref.current = s; setSt(s);
    const move = (ev) => {
      const tg = targetAt(ev.clientX, ev.clientY);
      const n = { ...ref.current, dy: ev.clientY - ref.current.y0, target: tg && tg.id !== task.id ? tg : ref.current.target };
      ref.current = n; setSt(n);
    };
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      const s2 = ref.current; ref.current = null; setSt(null);
      if (!s2?.target || Math.abs(s2.dy) < 6) return;
      const tg = s2.target;
      update((s) => ({ ...s, tasks: moveTask(s.tasks, task.id, { category: tg.cat, group: tg.group, beforeId: tg.kind === "row" ? tg.id : null }) }));
      success();
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  };
  /** Keyboard: ↑/↓ moves one place within its section. */
  const key = (e, task) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const rows = [...document.querySelectorAll(`[data-drop="row"][data-cat="${task.category}"][data-group="${task.group || ""}"]`)].map((r) => r.dataset.id);
    const i = rows.indexOf(task.id);
    const beforeId = e.key === "ArrowUp" ? rows[i - 1] : rows[i + 2] ?? null;
    if (e.key === "ArrowUp" && i <= 0) return;
    if (e.key === "ArrowDown" && i >= rows.length - 1) return;
    update((s) => ({ ...s, tasks: moveTask(s.tasks, task.id, { category: task.category, group: task.group || null, beforeId }) }));
    setTimeout(() => document.querySelector(`[data-id="${task.id}"] .th-drag`)?.focus(), 50);
  };
  return { start, key, draggingId: st?.id, dy: st?.dy || 0, target: st?.target };
}

/* ---------- lists ---------- */
function GroupHead({ category, group, count }) {
  const { t, update } = useTimeHub();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group);
  const save = () => {
    const n = name.trim().slice(0, 40);
    if (n && n !== group) update((s) => ({ ...s, tasks: s.tasks.map((x) => (x.category === category && x.group === group ? { ...x, group: n } : x)) }));
    setEditing(false);
  };
  return (
    <div className="th-todo-group-head" data-drop="section" data-cat={category} data-group={group}>
      {editing ? (
        <form className="th-todo-add" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <input className="th-input" value={name} maxLength={40} aria-label={t("renameGroup")} autoFocus onChange={(e) => setName(e.target.value)} />
          <Btn small tone="gold" type="submit">{t("save")}</Btn>
        </form>
      ) : (
        <>
          <span className="th-todo-group-name">{group}</span><span className="th-count">{count}</span>
          <button type="button" className="th-link" onClick={() => setEditing(true)}>{t("rename")}</button>
        </>
      )}
    </div>
  );
}

function CategorySection({ category, open: openTasks, done: doneTasks, gaps, drag }) {
  const { t, state, dispatch } = useTimeHub();
  const open = state.settings.todoOpen[category] !== false;
  const setOpen = (v) => dispatch({ type: "settings", patch: { todoOpen: { ...state.settings.todoOpen, [category]: v } } });
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const groups = [...new Set(openTasks.map((x) => x.group).filter(Boolean))];
  const plain = openTasks.filter((x) => !x.group);
  const rows = (list) => list.map((task) => <TodoRow key={task.id} task={task} showAccount={category === "game"} gaps={gaps} drag={drag} />);
  const isTarget = drag.target && drag.target.cat === category;
  return (
    <div className={`th-todo-cat ${isTarget ? "drop-target" : ""}`}>
      <button type="button" className="th-todo-cat-head" aria-expanded={open} onClick={() => setOpen(!open)} data-drop="section" data-cat={category} data-group="">
        <span className="th-todo-cat-chevron">{open ? "▾" : "▸"}</span>
        <span className="th-todo-cat-name">{t(CAT_LABEL[category])}</span>
        <span className="th-count">{openTasks.length}</span>
      </button>
      {open && (
        <div className="th-todo-cat-body" data-drop="section" data-cat={category} data-group="">
          {openTasks.length === 0 && <p className="th-note">{doneTasks.length ? t("todoAllDoneToday") : t("todoEmpty")}</p>}
          {plain.length > 0 && <ul className="th-slist">{rows(plain)}</ul>}
          {groups.map((g) => (
            <div key={g} className="th-todo-group">
              <GroupHead category={category} group={g} count={openTasks.filter((x) => x.group === g).length} />
              <ul className="th-slist">{rows(openTasks.filter((x) => x.group === g))}</ul>
            </div>
          ))}
          {adding ? <QuickAdd category={category} onDone={() => setAdding(false)} /> : (
            <button type="button" className="th-gap-add" onClick={() => setAdding(true)}>＋ {t("addCategoryTask", { cat: t(CAT_LABEL[category]) })}</button>
          )}
          {doneTasks.length > 0 && (
            <div className="th-todo-done">
              <button type="button" className="th-link" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>{t("doneTodayN", { n: doneTasks.length })}</button>
              {showDone && <ul className="th-slist">{doneTasks.map((task) => <TodoRow key={task.id} task={task} showAccount={category === "game"} />)}</ul>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PrioritySection({ id, tasks, onImportant, gaps }) {
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
          {tasks.length > 0 && <ul className="th-slist">{tasks.map((task) => <TodoRow key={task.id} task={task} showAccount onImportant={onImportant} gaps={gaps} />)}</ul>}
        </div>
      )}
    </div>
  );
}

/** One line, once: how much time is free right now and how many to-dos fit it. */
function FreeNow({ view, gaps }) {
  const { t, lang, state } = useTimeHub();
  const now = useMinute();
  const g = gaps.find((x) => x.start <= now + MINUTE);
  if (!g || state.settings.taskSuggest === "minimal") return null;
  const n = view.open.filter((x) => x.start == null && x.durationMs && x.durationMs <= g.ms).length;
  return (
    <p className="th-freenow">
      <b>{t("freeNowFor", { time: formatSpan(g.end - now, lang) })}</b>{g.before ? ` · ${t("beforeWhat", { what: g.before })}` : ""}
      {n > 0 && <> · {t("nTodosFit", { n })}</>}
    </p>
  );
}

/* ---------- Just start: a 5-minute timer with no commitment to finish ---------- */
function FocusBanner({ view }) {
  const { t, lang, state, update, dispatch, tz } = useTimeHub();
  const f = state.settings.focus;
  const now = useNow();
  if (!f) return null;
  const task = [...view.open, ...view.done].find((x) => x.id === f.taskId);
  if (!task) return null;
  const setF = (focus) => dispatch({ type: "settings", patch: { focus } });
  const stop = () => setF(null);
  const finish = () => { update((s) => mapTask(s, task.id, (x) => setDone(x, true, Date.now(), tz))); success(); setF(null); };
  const openEnded = f.endsAt === 0;
  const left = f.endsAt - now;
  if (!openEnded && left <= 0) {
    return (
      <section className="th-focus done" role="status" aria-live="polite">
        <b>{t("fiveMinDone")}</b> <span>{task.title}</span>
        <div className="th-item-actions">
          <Btn small tone="gold" onClick={finish}>✓ {t("finished")}</Btn>
          <Btn small onClick={() => setF({ ...f, endsAt: Date.now() + FOCUS_MS })}>+5 {t("minShort")}</Btn>
          <Btn small onClick={() => setF({ ...f, endsAt: 0 })}>{t("keepGoing")}</Btn>
          <Btn small onClick={stop}>{t("stopForNow")}</Btn>
        </div>
        <p className="th-hint">{t("stopIsFine")}</p>
      </section>
    );
  }
  return (
    <section className="th-focus" role="timer" aria-label={task.title}>
      <span>{t("workingOn")} <b>{task.title}</b></span>
      <span className="th-focus-time"><Ltr>{openEnded ? formatSpan(Math.max(MINUTE, now - f.startedAt), lang) : `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`}</Ltr></span>
      <div className="th-item-actions">
        <Btn small tone="gold" onClick={finish}>✓ {t("finished")}</Btn>
        <Btn small onClick={stop}>{t("stopForNow")}</Btn>
      </div>
    </section>
  );
}

/* ---------- What should I do now? — three picks at most ---------- */
function WhatNow({ view, gaps, onClose }) {
  const { t, lang, tz, state, dispatch, update, setFocus } = useTimeHub();
  const now = useMinute();
  const k = dayKey(now, tz);
  const energy = energyToday(state.settings, now, tz) || "okay";
  const setEnergy = (level) => dispatch({ type: "settings", patch: { energy: { day: k, level } } });
  const current = gaps.find((g) => g.start <= now + MINUTE);
  const avail = current ? current.end - now : 0;
  const pool = minimumDayOn(state.settings, now, tz) ? view.open.filter((x) => x.essential) : view.open;
  const picks = avail > 0 ? whatNow(pool, avail, { energy, now, tz, dayEnd: localDayRange(now, tz, 0).end }) : {};
  const list = [["good", "goodFit"], ["tiny", "tinyTask"], ["stretch", "moreEnergy"]].filter(([key]) => picks[key]);
  const done = (task) => { update((s) => mapTask(s, task.id, (x) => setDone(x, true, Date.now(), tz))); success(); };
  return (
    <section className="th-whatnow" aria-label={t("whatNowQ")}>
      <div className="th-whatnow-head">
        <b>{avail > 0 ? t("youHaveTime", { time: formatSpan(avail, lang) }) : t("busyRightNow")}</b>
        <button type="button" className="th-link" onClick={onClose}>{t("close")}</button>
      </div>
      {current?.before && avail > 0 && <span className="th-hint">{t("beforeWhat", { what: current.before })}</span>}
      <span className="th-label">{t("energyQ")}</span>
      <Chips value={energy} onChange={setEnergy} label={t("energyQ")} options={["low", "okay", "good"].map((x) => ({ value: x, label: t(`energy_${x}`) }))} />
      {list.length === 0 && <p className="th-note">{avail > 0 ? t("nothingFitsNow") : t("nextFreeAt", { time: gaps[0] ? formatTime(gaps[0].start, tz, lang) : "—" })}</p>}
      {list.map(([key, label]) => (
        <div key={key} className="th-whatnow-pick">
          <span className="th-label">{t(label)}</span>
          <div className="th-whatnow-row">
            <span className="th-todo-main"><span className="th-todo-title">{picks[key].title}</span><span className="th-todo-meta">{formatSpan(picks[key].durationMs, lang)}{picks[key].essential ? ` · ${t("essentialShort")}` : ""}</span></span>
            <Btn small onClick={() => { setFocus(picks[key].id); onClose(); }}>▶ 5 {t("minShort")}</Btn>
            <Btn small tone="gold" onClick={() => done(picks[key])} aria-label={`${t("markDone")}: ${picks[key].title}`}>✓</Btn>
          </div>
        </div>
      ))}
    </section>
  );
}

/* ---------- Minimum Day ---------- */
function MinimumDay({ view, gaps, showAll, setShowAll }) {
  const { t } = useTimeHub();
  const { essentials, rest } = splitEssentials(view.open);
  const doneEss = view.done.filter((x) => x.essential).length;
  return (
    <section className="th-minday" aria-label={t("minimumDay")}>
      <b className="th-minday-title">{t("minimumDay")}</b>
      <p className="th-minday-sub">{t("keepTodaySmall")}</p>
      {essentials.length > 0 && <ul className="th-slist">{essentials.map((task) => <TodoRow key={task.id} task={task} gaps={gaps} />)}</ul>}
      <p className="th-minday-left">{essentials.length ? t("essentialsLeft", { n: essentials.length }) : doneEss ? t("essentialsAllDone") : t("noEssentialsYet")}</p>
      {rest.length > 0 && <button type="button" className="th-link" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? t("showLess") : t("showEverything", { n: rest.length })}</button>}
    </section>
  );
}

/* ---------- routines ---------- */
function RoutineForm({ onDone }) {
  const { t, tz, update, newId } = useTimeHub();
  const [name, setName] = useState("");
  const [when, setWhen] = useState("anytime");
  const [items, setItems] = useState([{ title: "", dur: "", essential: false }]);
  const preset = (key) => {
    const p = ROUTINE_PRESETS[key];
    setName(t(p.nameKey)); setWhen(p.when);
    setItems(p.items.map(([k, m]) => ({ title: t(k), dur: String(m), essential: k === "routineMeds" })));
  };
  const setItem = (i, patch) => setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const create = () => {
    if (!name.trim()) return;
    const now = Date.now();
    update((s) => ({ ...s, tasks: [...s.tasks, ...routineTasks({ name, when, items: items.map((x) => ({ title: x.title, durationMs: x.dur ? parseTaskDuration(x.dur) : null, essential: x.essential })) }, now, tz, newId)] }));
    success();
    onDone();
  };
  return (
    <section className="th-routine" aria-label={t("createRoutine")}>
      <b>{t("createRoutine")}</b>
      <p className="th-hint">{t("routineHint")}</p>
      <div className="th-item-actions">
        <Btn small onClick={() => preset("morning")}>{t("routineMorning")}</Btn>
        <Btn small onClick={() => preset("evening")}>{t("routineEvening")}</Btn>
      </div>
      <label className="th-field"><span className="th-label">{t("routineName")}</span><input className="th-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></label>
      <Chips value={when} onChange={setWhen} label={t("whenQ")} options={["anytime", "morning", "afternoon", "evening"].map((x) => ({ value: x, label: t(WHEN_LABEL[x]) }))} />
      {items.map((x, i) => (
        <div key={i} className="th-routine-item">
          <input className="th-input" value={x.title} maxLength={120} placeholder={t("whatToDoQ")} aria-label={t("whatToDoQ")} onChange={(e) => setItem(i, { title: e.target.value })} />
          <input className="th-input th-task-dur" inputMode="numeric" value={x.dur} placeholder={t("durPlaceholder")} aria-label={t("durPlaceholder")} onChange={(e) => setItem(i, { dur: e.target.value.replace(/[^\d:]/g, "") })} />
          <label className="th-check"><input type="checkbox" checked={x.essential} onChange={(e) => setItem(i, { essential: e.target.checked })} />{t("essentialShort")}</label>
        </div>
      ))}
      <button type="button" className="th-link" onClick={() => setItems([...items, { title: "", dur: "", essential: false }])}>＋ {t("addItem")}</button>
      <div className="th-item-actions">
        <Btn small tone="gold" onClick={create} disabled={!name.trim() || !items.some((x) => x.title.trim())}>{t("createRoutineBtn")}</Btn>
        <Btn small onClick={onDone}>{t("cancel")}</Btn>
      </div>
    </section>
  );
}

/* ---------- history (quiet; not on the main screen) ---------- */
function HistoryView() {
  const { t, tz, lang, state } = useTimeHub();
  const now = useMinute();
  const days = history(state.tasks, now, tz, 14);
  const label = { done: "histDone", skipped: "histNotToday", removed: "histRemoved" };
  return (
    <section className="th-history" aria-label={t("history")}>
      {days.length === 0 && <p className="th-note">{t("historyEmpty")}</p>}
      {days.map((d) => (
        <div key={d.day} className="th-history-day">
          <span className="th-label">{d.day === addDays(dayKey(now, tz), -1) ? t("yesterday") : formatDate(Date.parse(`${d.day}T12:00:00Z`), "UTC", lang)}</span>
          <ul className="th-slist">{d.items.map((x, i) => <li key={i} className={`th-history-item ${x.state}`}><span>{x.title}</span><span className="th-hint">{t(label[x.state])}</span></li>)}</ul>
        </div>
      ))}
    </section>
  );
}

export function TodoWidget({ standalone } = {}) {
  const { t, state, dispatch, tz, update } = useTimeHub();
  const now = useMinute();
  const view = useView();
  const gaps = useDayGaps();
  const drag = useDrag();
  const [panel, setPanel] = useState(null); // null | "whatnow" | "routine" | "history"
  const [showAll, setShowAll] = useState(false);
  const filter = state.settings.todoFilter;
  const viewMode = state.settings.todoView;
  const minDay = minimumDayOn(state.settings, now, tz);
  const setFilter = (v) => dispatch({ type: "settings", patch: { todoFilter: v } });
  const setView = (v) => dispatch({ type: "settings", patch: { todoView: v } });
  const toggleMinDay = () => { dispatch({ type: "settings", patch: { minDay: minDay ? null : dayKey(Date.now(), tz) } }); setShowAll(false); };
  const onImportant = (task, val) => update((s) => mapTask(s, task.id, (x) => ({ ...x, important: val })));
  const sum = todaySummary(view);
  const byCat = (c, list) => list.filter((x) => x.category === c);
  const dayEnd = localDayRange(now, tz, 0).end;
  const prioPool = filter === "all" ? view.open : byCat(filter, view.open);
  const buckets = useMemo(() => groupByPriority(prioPool, now, dayEnd), [prioPool, now, dayEnd]);
  const listOpen = minDay ? view.open.filter((x) => !x.essential) : view.open;
  const showLists = !minDay || showAll;

  return (
    <section className={`th-todos ${standalone ? "" : "th-card"} ${minDay ? "minday" : ""}`} aria-label={t("todosTitle")} id="th-sec-todos">
      <div className="th-todos-head">
        <h2 className="th-sband-title">{t("todosTitle")}</h2>
        {(sum.completed > 0 || sum.open > 0) && (
          <span className="th-sec-sub">{[t("todayWord"), sum.completed ? t("nCompleted", { n: sum.completed }) : null, sum.essentialsLeft ? t("essentialsLeft", { n: sum.essentialsLeft }) : null].filter(Boolean).join(" · ")}</span>
        )}
      </div>
      <div className="th-todos-actions">
        <Btn small tone="gold" aria-expanded={panel === "whatnow"} onClick={() => setPanel(panel === "whatnow" ? null : "whatnow")}>{t("whatNowQ")}</Btn>
        <button type="button" className={`th-chip-btn small ${minDay ? "on" : ""}`} aria-pressed={minDay} onClick={toggleMinDay}>{t("minimumDay")}</button>
      </div>
      <FreeNow view={view} gaps={gaps} />
      <FocusBanner view={view} />
      {panel === "whatnow" && <WhatNow view={view} gaps={gaps} onClose={() => setPanel(null)} />}
      {minDay && <MinimumDay view={view} gaps={gaps} showAll={showAll} setShowAll={setShowAll} />}

      {showLists && (
        <>
          <div className="th-todos-toolbar">
            <Seg value={viewMode} onChange={setView} label={t("todoView")} options={[
              { value: "list", label: t("todoViewList") }, { value: "priority", label: t("todoViewPriority") },
            ]} />
            {viewMode === "priority" && (
              <div className="th-todos-filter">
                {["all", ...TASK_CATEGORIES].map((c) => (
                  <button key={c} type="button" className={`th-chip-btn small ${filter === c ? "on" : ""}`} aria-pressed={filter === c} onClick={() => setFilter(c)}>
                    {c === "all" ? t("all") : t(CAT_LABEL[c])}
                  </button>
                ))}
              </div>
            )}
          </div>
          {viewMode === "list" ? (
            <div className={`th-todo-lists ${minDay ? "quiet" : ""}`}>
              {TASK_CATEGORIES.map((c) => <CategorySection key={c} category={c} open={byCat(c, listOpen)} done={byCat(c, view.done)} gaps={gaps} drag={drag} />)}
            </div>
          ) : (
            <div className="th-todo-lists">
              {["next", "plan", "quick", "later"].map((id) => <PrioritySection key={id} id={id} tasks={buckets[id]} onImportant={onImportant} gaps={gaps} />)}
            </div>
          )}
        </>
      )}

      <div className="th-todos-foot">
        <button type="button" className="th-link" aria-expanded={panel === "routine"} onClick={() => setPanel(panel === "routine" ? null : "routine")}>＋ {t("createRoutine")}</button>
        <button type="button" className="th-link" aria-expanded={panel === "history"} onClick={() => setPanel(panel === "history" ? null : "history")}>{t("history")}</button>
      </div>
      {panel === "routine" && <RoutineForm onDone={() => setPanel(null)} />}
      {panel === "history" && <HistoryView />}
    </section>
  );
}
