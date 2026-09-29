/* ============================================================
   TASKS — one shared model for Game / Personal / Work to-dos, the Today timeline, and the
   Priority view. A task is never duplicated between them: scheduling, completing, or editing a
   task from any view updates the same object everywhere.

   Task shape (see lib/storage.js → cleanTasks for what's actually persisted):
     { id, title, category: "game"|"personal"|"work", durationMs|null,
       start|null, end|null,        // set together, only once placed on the timeline
       accountId|null,               // game tasks only
       important|null,               // true/false = user said so; null = not rated
       done, createdAt }

   A task with no `start` is a plain to-do: it lives in the Game/Personal/Work lists and the
   Priority view, but never in the visual timeline or its free-time accounting — see
   lib/plan.js → buildTimeline, which is only ever given the scheduled subset.
   ============================================================ */
import { MINUTE, HOUR } from "./time.js";

export const TASK_CATEGORIES = ["game", "personal", "work"];

/** Default length for a task placed on the timeline with no duration of its own. */
export const DEFAULT_TASK_MS = 30 * MINUTE;

/** How soon a task's moment is, in one of four stable steps (never recomputed every minute —
 *  only these thresholds matter, so a task doesn't visibly jump between buckets constantly).
 *  → "now" (<=15m or already due) | "soon" (<=3h) | "today" (later today) | "none" (unscheduled) */
export function urgencyOf(task, now, dayEnd) {
  const at = task.start ?? task.dueAt;
  if (at == null) return "none";
  const left = at - now;
  if (left <= 15 * MINUTE) return "now";
  if (left <= 3 * HOUR) return "soon";
  if (dayEnd == null || at < dayEnd) return "today";
  return "none";
}

/** The moment used for urgency/ordering: scheduled time first, else a user-set due time. */
export const taskMoment = (task) => task.start ?? task.dueAt ?? null;

/**
 * Which of the four ADHD-priority groups a task belongs in. Urgency comes from time the app
 * already knows (scheduled slot or a due time) — never guessed for importance. Importance is
 * only ever what the person set (`important === true`); an unrated task is never promoted into
 * "next" just because it has a timer, so game deadlines can't systematically crowd out a
 * personal task that actually matters more to the person.
 *  → "next" (urgent + important) | "plan" (important, not urgent)
 *  | "quick" (urgent, not marked important) | "later" (everything else)
 */
export function priorityBucket(task, now, dayEnd) {
  const urgent = ["now", "soon"].includes(urgencyOf(task, now, dayEnd));
  if (task.important === true) return urgent ? "next" : "plan";
  return urgent ? "quick" : "later";
}

/** Groups open (not done) tasks into the four buckets, each kept in moment order (unscheduled
 *  tasks last within their bucket). */
export function groupByPriority(tasks, now, dayEnd) {
  const buckets = { next: [], plan: [], quick: [], later: [] };
  for (const t of tasks) {
    if (t.done) continue;
    buckets[priorityBucket(t, now, dayEnd)].push(t);
  }
  const byMoment = (a, b) => (taskMoment(a) ?? Infinity) - (taskMoment(b) ?? Infinity);
  for (const k of Object.keys(buckets)) buckets[k].sort(byMoment);
  return buckets;
}

/** Open tasks (in any category) that would fit in a window of `availableMs`, only counting
 *  tasks that gave a duration — never a pressure to fill every free minute, just an answer to
 *  "which of these could I do right now". Longer-than-available tasks are left out entirely. */
export function bestFits(tasks, availableMs) {
  return tasks.filter((t) => !t.done && t.durationMs && t.durationMs <= availableMs).sort((a, b) => a.durationMs - b.durationMs);
}
