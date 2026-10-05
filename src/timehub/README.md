# Time Hub — add-in for Caroline's Bear Trap Squad Calculator

One dashboard for all your accounts: events (with Bear Trap / Foundry / Canyon templates),
minister bookings, training and research timers, alliance contributions, a Today schedule,
calendar export and friends' clocks. Everything is stored in
this browser only (localStorage key `timehub:v1`) and never touches the calculator's
own saved data.

## Add it to the calculator (GitHub web editor)

1. Upload this whole `timehub` folder into the repo as `src/timehub/`
   (on GitHub: **Add file → Upload files**, drag the folder in, commit to `main`).
2. In `src/App.jsx`, add the import at the top:

   ```jsx
   import TimeHub from "./timehub/TimeHub.jsx";
   ```

3. Add a page switch next to the other `useState` lines in `App()`:

   ```jsx
   const [view, setView] = useState(saved?.view ?? "calculator");
   ```

   and add `view` to the object saved in the existing `localStorage.setItem(...)`
   effect (and its dependency list) so the last page is remembered.

4. Just under the header card, add the two buttons (they reuse the calculator's `Btn`):

   ```jsx
   <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
     <Btn tone={view === "calculator" ? "primary" : "ghost"} onClick={() => setView("calculator")}>Squad Calculator</Btn>
     <Btn tone={view === "timehub" ? "primary" : "ghost"} onClick={() => setView("timehub")}>Time Hub</Btn>
   </div>
   ```

5. Wrap the existing calculator content in `{view === "calculator" && ( ... )}` and add:

   ```jsx
   {view === "timehub" && (
     <TimeHub
       lang={lang}
       accountId={ACTIVE_ACCOUNT_ID}      /* the id your account switcher uses, e.g. "A" / "B" */
       accountName={ACTIVE_ACCOUNT_NAME}  /* e.g. "Main Account" (the renamed label) */
       showHeader={true}
     />
   )}
   ```

   Render it **inside** the calculator's root `<div className={darkMode ? "dark" : ""}>`
   so it picks up the same light/dark colours. Replace `ACTIVE_ACCOUNT_ID` /
   `ACTIVE_ACCOUNT_NAME` with the variable names your account switcher uses in App.jsx.

Nothing else in the calculator changes. No new npm packages are needed.

### Per-account vs shared

- **Per account (Main / Farm):** minister bookings, training, research, contribution attempts.
- **Shared:** events and friends' clocks (they are the same people and the same game schedule).

## Put one widget somewhere else

```jsx
import { TimeHubWidgetFrame, BookingsWidget } from "./timehub/index.js";

<TimeHubWidgetFrame lang={lang} accountId={ACTIVE_ACCOUNT_ID}>
  <BookingsWidget />
</TimeHubWidgetFrame>
```

Available: `NextUpWidget`, `BookingsWidget`, `EventsWidget`, `TimerWidget` (with
`TIMER_CONFIGS.training` or `TIMER_CONFIGS.research`), `ContributionWidget`,
`FriendsWidget`, `HistoryWidget`.

## Tests

```
node --test src/timehub/__tests__/*.test.js
```

(Or add `"test:timehub": "node --test src/timehub/__tests__/*.test.js"` to package.json.)
Uses Node's built-in test runner, so there's nothing to install.

## Folder map

```
timehub/
  TimeHub.jsx            page + TimeHubWidgetFrame
  TimeHubContext.jsx     store (reducer) + provider, saves to localStorage
  timehub.css            styles, built only from the calculator's CSS variables
  index.js               public exports
  lib/                   pure logic (no React): time, events, bookings, timers,
                         contributions, dayNight, cities, storage
  hooks/useNow.jsx       one shared clock (useNow / useMinute / useClockFor)
  components/ui.jsx      Section, buttons, pills, UTC/local pair, pickers, inputs
  widgets/               one file per widget
  i18n/                  en + it, es, ko, de (set1) + ru, pl, tr, ar (set2)
  __tests__/             node:test suites
```

## Things to check in-game

- **Contribution refresh rule.** Defaults: 20 max, 1 attempt per 10 minutes, and the
  refresh clock *pauses* at 20 (spending restarts a full 10 minutes). If the game
  keeps ticking while full, change **Rules → When full → Refresh clock keeps running**.
- **Minister names** in each language — the in-game wording may differ from the
  translations here (especially ko, ru, pl, tr, ar).


## v2 (September 2026)

**Use:** `<TimeHub lang={lang} />`. Accounts now live *inside* the Time Hub (chips at the top,
⚙︎ Accounts to add/rename/colour/delete), so the host app no longer passes `accountId`.

**Storage:** same key `timehub:v1`, `version: 2`. Older data is migrated on first load
(A → "Main Account", B → "Farm Account", `repeat` → `recurrence`, nothing deleted). Shape is
documented at the top of `lib/storage.js`.

**Timer input:** two fields — Days, and Hours:minutes in 24-hour form (00:00–23:59). The game's
`2d 09:28:09` is entered as `2` and `09:28` (typing `0928` fills in the colon). No seconds.

**Times:** local times are shown 12-hour (e.g. 9:09 PM); UTC — the game's clock — stays 24-hour.

**Layout:** a slim header (title, language/dark slot via `headerExtra`, one-line clocks) and one
sideways-scrolling toolbar. The Schedule comes first: minister bookings still needed today, then the
timeline with completed items folded away. There is no separate Next up widget.

**Camp times:** the Training widget asks for each camp's full-batch time (Days + Hours:minutes) per
account, plus "I have Helios troops" and which classes, each with its own time. Starting a timer or
"Finish at" offers Normal / Helios for those camps and uses the matching time.

**Events:** Add → one form whose first field is an Event dropdown (custom or a built-in template).
Nothing is added without a time; old unset placeholders are removed on load.

**Minister bookings:** the same screen for every position, like the game — position ◀ ▶, today or
tomorrow in UTC, fixed 30-minute UTC slots. Past slots are hidden; a slot you already booked for that
position is blocked; another position at the same time warns but can be saved.

**Events:** alliance-chosen times start empty ("Set your time"). Foundry and Canyon use a dropdown
of the registration battle times (editable from the form). Defaults: Foundry and Canyon 02:00, 12:00,
14:00, 19:00, 21:00 UTC; Frostfire Mine (every 2 weeks, 30 min) 02:00, 05:00, 11:00, 14:00, 16:00,
18:00, 21:00 UTC. Repeats are exact UTC (every N days, weekdays, every N weeks). Repeating events can be
changed for one occurrence, this-and-future, or the whole schedule.

**Change a default in one place:**
- booking window → `BOOKABLE_DAYS` in `lib/bookings.js`
- reminder lead time → `REMINDER_LEAD_MS` in `lib/eventTemplates.js`
- templates and time options → `TEMPLATES`, `DEFAULT_TIME_OPTIONS` in `lib/eventTemplates.js`
- research buildings → `RESEARCH_LOCATIONS` in `lib/timers.js`
- section order → `SECTION_IDS` in `lib/layout.js`

**Tests:** `node --test src/timehub/__tests__/*.test.js`


## Redesign (tabs + Today)

- **Tabs:** Today · Timers · Events · More (bottom bar; the selected tab is saved in `settings.tab`).
  Today = idle-camp and minister cards, the week strip (tap a day to switch the schedule) and the schedule.
  Timers = training, research, contributions. Events = events, minister bookings, Share with alliance.
  More = accounts (up to 4, `MAX_ACCOUNTS`), time zone, compact view, friends, history.
- **Look:** the Bear Trap Calculator's CSS variables and fonts; cute touches are the snowflakes by the
  clock, the round kind icons (`KindIcon`), the sleeping bear (`SleepingBear`) and tinted time-of-day bands.
  Motion (tab fade, card rise, theme cross-fade) switches off under `prefers-reduced-motion`.
- **Schedule rows:** tap or swipe toward the start edge for quick actions; tap a countdown to update the time left.
- **Idle camps** (`lib/today.js → idleCamps`): a camp with no running timer, idle since its last timer
  ended (a finished timer still listed, or `lastEnded` saved when one is dismissed); shown after 15 minutes.

### Adding a new event type
1. Add a template to `TEMPLATES` in `lib/eventTemplates.js` (name key, duration, recurrence, `combat`,
   `timeOptions`/`legion` if registration uses fixed times) and its name in every language file.
2. Pick its icon in `kindOf()` / `KIND_PATHS` (`components/ui.jsx`) and its week-strip colour in
   `dotKind()` (`lib/today.js`) plus a `.d-<kind>` rule in `timehub.css`.

### Live updates
`useNow()` ticks every second; every screen derives its data from state + now on each tick
(`buildAgenda`, `computeReminders`, `idleCamps`, `weekStrip`), so nothing needs refreshing by hand.
Saves go to localStorage on every change.


## Tabs with the calculator, stamina and Tundra Trek (Sep 2026)
- `<TimeHub lang calculator={<YourCalculator/>} headerExtra={…} />` — the calculator becomes the
  4th tab (**Today · Timers · Events · BT Calculator**). Without `calculator` the tab is hidden.
- Time Hub tabs share one compact header (bear + clock, tab name, local date · city, ⚙ settings)
  and the calculator-style account buttons (up to 4, plus All). Language/theme controls passed in
  `headerExtra` appear under ⚙.
- **Today:** at-a-glance strip (local time, UTC, next, to do), **Needs you** (hand-claim drops,
  stamina near 200, idle camps, minister bookings), the schedule (no icons; week strip inside;
  "After midnight" list) and **Friends' clocks** at the bottom.
- **Timers:** Chief stamina (per account; +1 / 5 min, regen stops at 200), Storehouse
  (+120 at 00:00 and 12:00 UTC), Tundra Trek (+20 at 00:00 UTC automatic, +10 at 08:00 and 16:00
  UTC by hand), then training, research and contributions. Numbers live in `lib/daily.js`.
- **Events:** events, minister bookings, share with alliance, history.


## Feel: speed, haptics, sound, animation
- Tabs switch on touch-down (not finger-lift) in one frame. Hidden tabs keep their layout cached
  (`content-visibility: hidden`) so showing them again is cheap; background preparation runs in a transition. Each tab's content is memoised; the calculator stays mounted once visited;
  each tab keeps its scroll position. The open tab is stored under `timehub:tab`, outside app state.
- Heavy screens use `useMinute()` (once a minute) and `useMemo`; only countdowns tick every second,
  and tabs you're not looking at stop ticking (`<ActiveTab>`). Saves are batched (400 ms) and
  flushed when the app is hidden or closed.
- `lib/feedback.js` (no sounds): light haptic on every press (Android vibration; iPhone system tick via
  a hidden `<input switch>`), a chime + snowflake burst on useful actions (claim, spend all, start
  training, save booking/event/research, answer a minister reminder, update stamina or time left).
  Haptics can be turned off under ⚙; animations respect reduced-motion.
- Little animations: sliding amber tab pill with an icon hop, button press, pop on success,
  counters that bump, a bear that wiggles when tapped, and an "All caught up" bear when nothing
  needs you.
- More motion (never delays content): drifting snow and a blinking bear in the header, a ticking
  clock hand, hopping account dot, TO DO nudge, Needs-you rows slide away when done, breathing Now
  dot, glowing next item, pulsing countdowns under 5 min, sheen on running progress bars, popping
  week day and drop tiles.


## Performance model (Sep 2026 profiling)
- **One clock.** `hooks/useNow.jsx` runs a single timeout per second for the whole app.
  - `<Remaining to={ts}>` / `<Countdown to={ts}>` are the only things that re-render every second.
  - Widgets use `useClockFor([timestamps])` (re-render when a timer finishes, an event starts, a
    booking ends, the next contribution arrives…) or `useMinute()` for lists and "in 3h 42m" text.
  - Progress bars are one long CSS animation each (`<ProgressFill>`), not re-renders.
- **Hidden tabs** are frozen (`FreezeWhenHidden`): account switches and edits don't re-render them;
  their clocks pause (`<ActiveTab>`), their layout is cached (`content-visibility: hidden`) and their
  animation loops pause.
- **Time maths**: formatters are cached with cheap keys; `zonedParts`, `formatTime`, `formatDate`
  results are memoised (pure functions of instant + zone + language, so they never go stale).
- **Storage**: one debounced write after changes (flushed on hide/close); nothing is written by the clock.
- No network or database calls in the Time Hub.

## What to track · Restart All Camps
- ⚙ → **What to track**: daily reset, Storehouse stamina, Tundra Trek, Chief stamina, contributions.
  Turning one off removes it from Today, Timers, Needs you and calendar exports
  (`settings.track`, read via `tracking()` in `lib/agenda.js`). Schedule rows also offer "Don't track this".
- **Restart all camps** (Training): restarts every idle/finished camp with its last length (or its
  full-batch time); camps already training are never touched. If a finish would land in the sleep
  window (default 22:00–07:00, ⚙ → Sleep hours) it suggests a shorter run ending around 21:45
  (`lib/sleep.js`). Only times are calculated — never troop numbers. Running camps that end
  overnight get a gentle note about the next cycle.

## Alliance Championship (leaders) · Lighthouse intel
- **Championship prep** (`lib/championship.js`): asked once on Today — "Are you a leader in charge of
  the Alliance Championship?" — then which Thursday the next one starts (the app doesn't guess the
  fortnight). Every 14 days, prep rounds in UTC: R1 Thu 00:00–11:00, R2 Thu 12:00–Fri 00:00,
  R3 Fri 01:00–12:00, R4 Fri 13:00–Sat 00:00, R5 Sat 01:00–12:00. Shown on the schedule and week
  strip (purple dot), and in Needs you while a round is open. Change under ⚙ → Alliance Championship
  (`settings.champ = { leader, anchor }`).
- **Lighthouse intel** (`lib/daily.js`): refreshes 00:00, 08:00, 16:00 UTC (~8 missions; they last
  roughly 12–16 h; the Lighthouse holds two refreshes). Timers tab card with "Cleared" per account;
  Needs you nudges in the hour before the next refresh until the batch is cleared; schedule rows for
  each refresh. Can be switched off under ⚙ → What to track.

## Training Camps: Finish At first (Sep 2026)
- One account per Training Camps page (pills at the top; follows the global account filter). Camp
  times, the form, running camps, Restart All and notes all use that account.
- The form opens on **Finish At**: type 2200 / 0130 / 928 (`parseCompactTime`). It's prefilled with
  a suggestion from `finishAdvice` (lib/sleep.js): finish at the "before bed" time if a batch can
  reach it within the account's maximum (`campMaxFor`, the camp that runs out first), so a full
  batch can run overnight; otherwise a full batch. `planFinish` checks every camp — a time beyond the
  maximum shows the latest possible finish with "Use …" and "Remind me to start at …".
  "Enter time left instead" keeps the old mode.
- Full-batch times: "Same for all camps" or "Different per camp" (`accountData.campSame`).
- Lighthouse intel is no longer on Timers (still in Today's Needs you + schedule).
- Today's schedule has no time-of-day bands.
- First-use walkthrough (`widgets/Tour.jsx`): 8 short steps, highlights one setting at a time,
  skippable, stored in `settings.tour`; replay from ⚙.

## Language detection · troops ⇄ time · Today header
- `lib/language.js → detectLanguage()`: first visit only — phone language list first, then the
  country implied by the time zone, else English. A saved choice always wins. Used by App.jsx/main.jsx.
- Camp times take an optional **full batch size (troops)** (`accountData.campTroops`, follows the
  same/different choice). Restart All then lets the player type **troops** (or time) per camp and
  shows the resulting time and finish; suggestions appear as troop counts. Finish At lists the troops
  to train per camp. Conversion is proportional (`troopsForDuration`, `durationForTroops`), capped
  at a full batch.
- Today: the Local time / UTC / Next / To do strip sits inside the "Today" header card.

## Timers: summaries first · Today: free time & personal tasks
- `Section` takes `summary` (shown when folded) and `defaultClosed`; open/closed is remembered per
  section (`settings.collapsed`, true/false). Timers sections start folded to their summaries:
  Stamina, Trek, Training ("Next: All camps · Farm 2 · 02:08:59 · 3 idle"), Research, Contributions
  ("3 full · Next +1 in 00:09:59"). Summaries tick via `<Remaining>` only.
- One account label per group (`GroupName`). Training: one group per shown account with the
  countdown first (ALL CAMPS when they finish together, otherwise NEXT + the rest in one line), idle
  camps, overnight notes, then secondary actions (Set finish time, Restart all camps, Camp details,
  Training times) that open in place. Research rows are one line (`TimerRow compact`). Contributions
  are one row per account (count, FULL or next +1, −/+); tap for Spend all, Match the game, Rules.
  The account filter is a single row on Timers.
- Today (`lib/plan.js`): `buildTimeline` merges agenda items and personal tasks, merges overlapping
  busy periods, treats finishes/claims as moments, claims no free time after events of unknown
  length, and only shows gaps ≥ 10 min from now. "＋ Add task" places the task at the gap's start
  (`placeTask`); too long → shorten / schedule anyway / cancel. Durations: 30 → 30m, 90 → 1h 30m,
  130 → 1h 30m (`parseTaskDuration`). Tasks: `state.tasks` ({ id, title, start, end, done }), kept 7 days,
  no account chip. Account chips per row come from `rowChips` so one account can't appear twice.

## Training modes · fixed research order · Today copy (Sep 2026)
- **Training Camps now has three explicit modes**, chosen with a segmented control at the top of
  the editor (`TrainForm` in `widgets/TrainingWidget.jsx`):
  - **Finish at a time** (default) — unchanged Finish-At flow (compact digits, e.g. `2145`;
    `lib/sleep.js → finishAdvice/nextFinishTarget`; respects each camp's configured maximum;
    handles crossing midnight).
  - **Maximum time** — runs each selected camp for its own configured maximum
    (`campMaxFor`), simply and without troop-quantity claims. Explains that "Restart all camps"
    does the same for idle camps.
  - **Custom duration** — the old "time left" entry (same-for-all or per-camp; the existing
    compact days+HH:MM duration input, 24h+ supported).
  - The app never claims to set troop counts in-game; a one-line note says fewer troops finish
    sooner, more troops take longer, and the player still sets the amount in Whiteout Survival.
  - Every started timer is tagged with which mode created it (`timer.mode: "finish" | "max" |
    "custom"`, added in `applyTraining`/`cleanTimer`, saved and restored). The Timers hero shows a
    small pill (FINISH AT / MAXIMUM / CUSTOM) next to the countdown when every timer in the group
    shares one mode, so the configuration is visible without opening the editor. Restart All tags
    its entries "max" only when the full batch time was actually used, "custom" otherwise.
- **Research always lists Research Center → Dawn Academy → War Academy**, never reordered by which
  finishes first (`RESEARCH_LOCATIONS` order in `lib/timers.js`; `sortResearch()` — a stable sort by
  that fixed order, used by `ResearchWidget`). A building with no timer is simply omitted; the
  remaining buildings keep their relative order. The "Next" line in the folded summary can still
  name whichever building finishes soonest — only the expanded list order is fixed.
- **Today page description** ("Your day at a glance: upcoming events, free time, and personal
  tasks.") replaces the old generic copy, in all 9 languages.

## Executive function / time-blindness pass (Sep 2026)
- **Alliance Contributions**: the closed row now has one primary action, "Spend all" (instant —
  the reducer updates in-memory state synchronously, so the UI changes immediately; the debounced
  save follows). Manual −/+ correction, "Match the game", and "Rules" moved behind the row's expand.
- **Stamina**: tapping the value itself opens an empty, auto-focused numeric input in place
  (`StaminaRow` in `widgets/DailyWidgets.jsx`) — no backspacing the old number. Saves on Enter or
  on blur; Escape cancels. The old "Update" text link still works as an alternate way in.
- **Personal tasks never disappear when their time passes.** `Schedule` in `widgets/TodayScreen.jsx`
  now only folds a task into the "completed" toggle once the person marks it **done** — never just
  because `now` has passed its end. Unfinished-and-overdue tasks (`lib/plan.js → overdueTasks`)
  render in an always-visible **"Still to do"** block directly above the Now marker, with gentle
  wording ("Still to do · Planned 6:00 PM", never "overdue"/"missed"), a one-tap complete circle,
  and an optional **"Move to next free time"** button (`findNextGap`) that finds the next gap that
  fits and moves the task there — only on explicit tap, never automatically.
- **Proportional free-time gaps**: `gapVisualHeight()`/`taskVisualHeight()` in `lib/plan.js` use a
  clamped square-root scale so a 4-hour gap is visibly taller than a 20-minute one, capped (~220px
  for gaps, ~96px for tasks) so long stretches never blow out the page. Applied as one inline
  `min-height` style per render (`--gh`/`--th` custom properties) — pure CSS layout, no animation,
  no per-second recalculation. The exact duration is always still shown as text alongside the
  visual size (never visual-only).
- Adding a task now opens with an "{time} available" headline before the name/duration fields.

## Ministry of Education × training planner (Sep 2026)
- `lib/education.js` (pure, tested): reads the SAME booking record as the Bookings tab
  (`minister_education`, 30-min UTC slot). Each camp is classified against the window
  (`before` → bridge/wait, `inside`, `now`, `tight`, `after`, `over`), with a safety buffer
  (⚙ → Ministry of Education, default 5 min, 0–15). Bridge cycles chain full batches, never past
  the window; "fewest check-ins" waits out gaps < 45 min, "most training" bridges from 15 min,
  "finish at a time" shortens the buffed restart to end at the player's chosen time.
- **No invented numbers:** the app has no speed/capacity formula, so "+50% / +200" is shown as the
  effect text only. The optional per-camp **Full batch with Education** (`accountData.campMaxEdu`,
  Training times) is what the plan uses; without it the plan still says WHEN to restart.
- Never suggests cancelling a running order. A running camp that finishes after the window is told
  Education won't help that cycle, and "Find a time" offers real bookable slots
  (`findEducationSlots`: only open slots in today+tomorrow UTC, not already an Education booking).
- UI (`widgets/EducationPlan.jsx`): a strip inside each Training group (booking + "View
  recommended plan", or a dismissible "Find a time" hint), the plan panel (what to do → per-camp
  lines → timeline → priority), Finish-At warns if the typed time would miss the window with a
  one-tap fix, and "Training plan" links from the booking row and Today's schedule row.
  Recomputed on the minute clock and input changes only.

## Education card, action first (Sep 2026)
- The Education card in each Training group is now compact: appointment (local time first, UTC and
  countdown quieter) → "✓ You're set for now" or **DO NOW** → **Next action** (day + local time, what to
  do, how long to train) → "Then …" → check-in count → one **View full plan / Hide full plan** control.
  The timeline, normal-vs-Education comparison and the priority setting live behind that one toggle.
- `lib/education.js` separates **actions** (the player opens the game: restart camps) from
  **milestones** (camps finish, Education starts/ends, final finish). Only actions count as check-ins.
- The short training now ends a few minutes **before** the window opens (`prepMs`, half the safety
  buffer, min 1 min) so there is time to open the game, collect, take the minister position and restart.
- **Sleep-aware:** a check-in that would land inside the sleep window (⚙ → Sleep hours) moves to the
  wake time; if the whole slot is asleep the card says so.
- **No invented finish times:** without the player's own "Full batch with Education" figure there is no
  final finish shown — just "Finish time: not calculated yet" and a one-tap **Add training time**
  that opens Training times with that field focused.
- **Done / recovery:** the player can tap **Done** on the current action (stored per booking in
  `accountData.eduDone`, keyed by booking id + start time so a moved booking starts fresh); the plan
  then advances. If camps have been ready for a while the plan recalculates with a calm "Plan updated"
  note. When Education is active the card simplifies to DO NOW.
- Waits in the full plan are drawn in proportion, capped (`eduGapHeight`, 24–96px).

## Arctic expedition journal skin (Sep 2026)
The approved journal mockup is the app's look. It is a skin: no logic, data or navigation changed.
- **Tokens:** one block at the end of `timehub.css` re-maps the variables every widget already uses
  (`--gold` → deep arctic, `--goldStrong` → furnace amber, `--inputBg` → ice, …) under
  `.th-root:not(.is-calc)` (light) and `.dark .th-root:not(.is-calc)` (dark). The Calculator tab keeps
  its own theme. Amber is only for training/boosts; selected states are deep arctic.
- **Type:** Inter (interface), Nunito (display: titles, times, section headings), Kalam (handwritten
  notes, 1–3 per screen, never on times/buttons/warnings). Fonts load from Google Fonts in
  `timehub.css`; self-host them for store builds.
- **Painted layer = pre-rendered WebP** in `assets/` (header landscape, distant-bear empty state,
  peeking bear for the walkthrough, sleeping bear for long gaps, snow edge). Never live SVG filters:
  they made the old paper-grain overlay take ~1 s to redraw on iPhone.
- **Header:** painted horizon fades into the page; eyebrow ("Today's log · date · city"), Nunito title.
- **Schedule:** a softly wandering trail with small custom markers (`components/Trail.jsx`): paw = Bear
  Trap, flame = training, spark = Education, circle = the rest, dashed = personal task. Free time is
  drawn 12–96px (`gapVisualHeight`: 30m 16, 1h 24, 2h 40, 4h 64, 6h+ 96); gaps of 2h+ get a faint
  sleeping bear and the first one a handwritten note.
- **Tab bar:** the sliding indicator is an irregular ice floe (CSS background, no filter).
- **Page background:** while a Time Hub tab is showing, `<html>` gets `th-skin`; CSS then paints the
  host root flat (light `#F4F8F8`, dark `#0F1B20`) and hides the host's grain/corner art. This relies on
  the host root being `#root > div`; on the Calculator tab the class is removed.
- **Buttons/targets:** ≥44px, primary block 52px; secondary text is `#5B7075` (not `#71868B`) for contrast.

## Today, from the approved prototype (Sep 2026)
- **Header:** painted horizon behind "Today's log · date · city" and the title; the four-cell stat strip is now one quiet line ("5:30 PM local · 05:30 UTC · 8 to do").
- **Bear Trap hero** (`BearHero`, `useBearHero` in `widgets/TodayScreen.jsx`): the next Bear Trap event with a live countdown, every account's minister status, and one **Book ministers** button (opens the existing booking form pre-filled). "Already booked in the game?" opens the existing minister-reminder rows. Those reminders no longer repeat in Needs you.
- **Field notes → Needs you:** one white card with hairline rows and small custom icons instead of coloured boxes.
- **Coming up → Schedule:** a tinted band under the painted snow edge; the week strip and one timeline card with a NOW pill. "Add task" only appears on gaps of 45 minutes or more.
- **Quiet day** (`QuietHero`): when nothing needs doing and nothing is due for 3 hours, the illustrated "Quiet out here." state replaces the hero and Needs you.
- Timers, Events and the Calculator tab keep their existing layouts; they only wear the skin (tokens, fonts, header, tab bar).
- New painted asset: `assets/hero-pool-corner.webp` (pre-rendered; no live SVG filters).

## 6 accounts + "What's up next" (Sep 2026)
- `lib/accounts.js → MAX_ACCOUNTS` raised from 4 to 6. The 6 account colours
  (`--acct-1`…`--acct-6`) were already fully themed in `timehub.css`, and the account grid
  (2-column in settings, horizontal-scroll pills on Today/Timers) needed no layout change —
  both already handle any count. `storage.js` still caps saved accounts at `MAX_ACCOUNTS`.
- **"What's up next"** (`widgets/TodayScreen.jsx → useWhatsNext/WhatsNextWidget`): a compact strip
  at the top of Today showing the single soonest item across every visible account and any kind
  (event, booking, training/research finish, personal task, stamina, contribution, drop, intel) —
  not just Bear Trap (that stays the hero's job) and not just something needing action (that's
  Needs You). It reuses `buildAgenda`/`groupTraining`/`itemTitle`/`markerFor` so it always matches
  what the schedule itself would show first. Suppressed when the day is quiet (the illustrated
  empty-day card already leads with the next item) or when the next item is the same one already
  shown in the Bear Trap hero, so it never duplicates. Tapping it jumps to the schedule.

## Visual rollback: restored the warm design (Sep 2026)
A later round had reskinned the Time Hub tabs with a cold "Arctic" palette (icy blues, a
persistent wavy timeline rail with marker glyphs, forced Inter/Nunito typography) that turned out
to feel clinical and dense. This round reverts the **visual** layer only — all underlying logic
(Education planner, 6 accounts, What's up next, task persistence, etc.) is unchanged.
- `timehub.css → .th-root:not(.is-calc)`: the colour-variable overrides were removed so Time Hub
  inherits the host calculator's original warm cream/gold/amber/teal palette and its own account
  colours (pine/cocoa/slate/rose/olive/purple) instead of redefining them. Only Time-Hub-specific
  tokens remain, recoloured warm (`--th-page`, `--th-band`, `--th-hero-bg`, `--th-warm*` — the
  last now aliased to the host's `--goldStrong`/`--amber` so every action surface — Book
  ministers, Restart/Done, the ACTION 1/2 pills, the selected tab — reads as the same one orange).
  Forced Inter/Nunito typography was dropped; Fredoka/Nunito Sans (the host's own fonts) apply
  again.
- **Today's schedule** (`widgets/TodayScreen.jsx`): removed the persistent wavy rail and marker
  glyphs from `Row` (was `<Rail kind={markerFor(i)} .../>` between the time and the body) — rows
  are plain, divided by a hairline, as they were before. Removed the handwritten-note feature
  (`th-hand`, `handEdu`/`handGap`/`handQuietUntil`/`handNight`) entirely — it also fixes a real
  bug where a missing translation for `journalToday` was rendering literally as "JOURNALTODAY" in
  the header (`TimeHub.jsx → Header`); the header eyebrow is just the date and city again.
- **Free time** (`lib/plan.js → gapVisualHeight`): the perceptual scale was widened from a cramped
  12–96px back to a generous 16–260px, so a multi-hour gap visibly reads as a substantial block of
  the day again — this is the main "does the space communicate time" fix. The Add Task button
  threshold moved from 45 to 30 minutes.
- The tab bar's selected "ice floe" shape is kept (subtle, harmless) but its fill recoloured from
  icy blue to warm amber-gold, matching the rest of the action colour.
- The animated bear-clock header mascot, previously hidden by the reskin (`.th-bear-clock,
  .th-drift { display: none }`), is visible again.
- Nothing here touches calculations, the Education planner's logic, account behaviour, or data —
  only how it's presented. 114 tests pass unchanged (two updated to the new gap-height numbers).

## Contributions grouping + free-time preservation (Sep 2026)
- **`lib/agenda.js → groupContrib`**: repeated Alliance Contributions-full moments within a
  rolling 60-minute window (`CONTRIB_GROUP_WINDOW_MS`) of the first one merge into one
  `contribGroup` item, positioned at the first account's time. A lone account stays a normal
  single `contrib` item. Bear Trap, Foundry, and every other event are untouched — only repeats
  of this one passive status get merged. `nextUp()` excludes `contribGroup` the same way it
  already excluded `contrib`.
- **`lib/plan.js`**: a new `"passive"` occupancy (contrib/contribGroup) never fragments a
  free-time block into pieces around it. `buildTimeline` pulls passive items out before computing
  gaps, then attaches each one as a `.notices` entry on whichever gap it falls inside — so a
  multi-hour free stretch stays one visual block with a small note inside it, rather than several
  small blocks around repeated status updates. If a passive item lands nowhere (no gap contains
  it), it still shows, as its own row — nothing is silently dropped.
- **`widgets/TodayScreen.jsx`**: `GapNotice` renders the note inside `GapRow` — a quiet card with
  up to 3 accounts and their times, "+N more" progressive disclosure, and one "Spend all" button
  that spends for every member at once. `Row` keeps a fallback action for the rare case a group
  ends up as its own row.
- Fixed a real bug found along the way: a previous CSS edit believed to remove the old
  rail/marker/absolute-gap-positioning styles had silently failed (a crashed script never wrote
  the file), so ~35 lines of dead rules survived and were only "working" by accident through
  undefined-CSS-variable fallback. Properly removed now, along with fixing several heading
  font-size rules that were quietly invalid for the same reason (`var(--th-display)` was gone but
  still referenced).
- Checked the fixed bottom-tab-bar overlap: the existing `.th-app` bottom padding
  (`calc(92px + env(safe-area-inset-bottom))`) already keeps the last schedule row and the
  "add day to calendar" button clear of the tab bar; no change needed there.

## quietTitle fix + Game/Personal/Work to-dos + ADHD Priority view (Sep 2026)
- Fixed a real bug: `t("quietTitle")` had no translation, so the empty-day card's heading
  literally rendered the word "quietTitle". Added the real string in all 9 languages, then swept
  every `t("...")` call in the codebase against the merged string set — nothing else was exposed.
- **One shared task model, extended, not replaced** (`lib/storage.js → cleanTasks`,
  `lib/tasks.js` new): a task now optionally carries `category` ("game"/"personal"/"work"),
  `durationMs`, `accountId` (game only), and `important` (`true`/`false`/`null` — never inferred).
  A task with no `start` is a plain to-do; `lib/plan.js`'s timeline only ever receives the
  scheduled subset, so unscheduled to-dos never enter the visual timeline or its free-time maths.
  Completing, editing, or scheduling a task from any view is the same object everywhere.
- **`lib/tasks.js`**: `urgencyOf` (stable steps — now/soon/today/none — from a scheduled time or a
  user due time, never guessed), `priorityBucket` (the four ADHD groups), `groupByPriority`,
  `bestFits`. The important guarantee, directly tested: **importance is only ever what the person
  set** — an urgent, unrated game timer lands in "Quick", not "Do next"; a personal task marked
  important with no timer at all outranks it. Game deadlines can't systematically dominate.
- **`widgets/TodoWidget.jsx`** (new): sits on Today between Needs You and the full timeline.
  - **List view**: collapsible Game/Personal/Work sections (expand state remembered), each with a
    quick-add (title only required; duration optional, plain minutes like the existing gap
    add-task flow — not the multi-day duration picker, which would have parsed "30" as 30 days),
    one-tap complete with strikethrough + muted styling, and a small "N of M done" line.
  - **Priority view**: Do next / Plan / Quick / Later, plain-language, each with a one-line hint;
    Do next gets the strongest (warm) treatment. A category filter (All/Game/Personal/Work) works
    in this view too. A star toggles "important" on any open task.
  - **Connected to the timeline**: an unscheduled task with a duration shows "Add to timeline",
    which offers up to 3 real open gaps today to choose from (`lib/plan.js → findGaps`) — picking
    one schedules that same task object, nothing is duplicated.
- Descoped for this round (flagged, not silently dropped): the literal drag-and-drop 2×2 matrix,
  effort levels, waiting/someday statuses, a "What should I do now?" contextual suggestion, an
  auto-computed Top-3 focus list, "why this?" explainability, and auto-generating tasks from game
  events. The two-view system itself, and the importance/urgency split, are real and tested.

## Training camp grouping + research/minister reminders (Sep 2026)
- `lib/agenda.js`: `groupTraining` (moved here from the widget, now exported/tested) widened from
  "exact same minute" to a conservative rolling window (`TRAINING_GROUP_WINDOW_MS`, 5 minutes,
  anchored to the first camp in the run) — camps finishing a few minutes apart for the SAME
  account merge into one "All camps finish" / "N camps finish" entry with an "All ready by {time}"
  note when the times actually differ. Different accounts are never merged; a camp outside the
  window stays its own entry. Same-moment groups (the common case) are unchanged.
- `lib/research.js` (new): a research timer nearing completion gets a stable-tiered reminder
  ("day" from 24h out, "soon" from 3h out) recommending the 30-minute booking slot its finish
  falls in (`researchSlotFor`, reusing the app's existing slot grid), flags when the finish cuts
  it close to the slot's edge, and reports whether ANYTHING is already booked there
  (`bookingCovering`) — it deliberately never asserts *which* minister position affects research,
  since that isn't reliably known; "booked" just means something already covers that moment.
  Shown as a quiet line under each research timer in the Timers tab, with a "Book this slot" link
  that opens the booking form pre-filled with that time (position left for the player to choose).
- 8 new tests cover the exact acceptance scenarios: nearby-but-not-identical camp finishes merging
  (and a camp outside the window *not* merging), the doc's Tue-07:42-UTC research example end to
  end, and the tight-margin flag.

## Not implemented this round: Journey of Light
Parts 1–2 of this update are complete and verified above. **Part 3 (a full Journey of Light
expedition planner) was not built.** It's a substantial standalone feature — settings, per-account
state, sleep-aware check-in planning, a Pocket Watch optimiser, multi-account consolidation, a
Timers dashboard, and Today integration — and several of the numbers it depends on (event length,
gem costs per slot, exact Pocket Watch mechanics) aren't things I can verify are accurate, the same
concern that came up earlier with the Ministry of Education mechanics. Rather than build a planner
on unconfirmed numbers, I'm flagging this as outstanding. Happy to take it on next with those
specifics confirmed, or built more conservatively (letting the player enter their own known values
throughout, similar to how the Education planner asks for the player's own measured full-batch
time instead of assuming a formula).

## New "To do" tab, "Today" → "Timeline", editable/deletable events (Sep 2026)
- **New tab**: `TimeHub.jsx` gained a 5th tab, "To do" (`TABS`, a new `checklist` icon in
  `components/ui.jsx`), and the To-do widget (`widgets/TodoWidget.jsx`) moved off the Today page
  entirely into its own standalone panel (`standalone` prop drops the widget's own card border,
  since the panel already provides the page chrome). `lib/storage.js`'s tab whitelist and the
  background tab-prewarm list both include `"todos"`.
- **"Today" renamed to "Timeline"**: `tab_today` now reads "Timeline" (and its equivalents) in all
  9 languages — this one string drives both the tab-bar caption and the page's header title, so
  both changed together. The internal tab id stays `"today"` to avoid touching every reference to
  it; only the user-facing label changed. A new `tab_todos` ("To do") string was added alongside.
- **Fixed a real, previously-undiscovered crash**: adding a brand-new *custom* (non-template) event
  for the first time crashed the app (`Cannot read properties of null (reading 'occKey')`) — found
  while testing this round's changes, but present in the app before them too. Root cause:
  `EventForm`'s draft object never got an `id` for the custom-event path (`base` was `null` there,
  unlike the template path which always calls `eventFromTemplate` with a fresh id), so the newly
  saved event ended up with `id: undefined` — which then spuriously matched `editing?.id` once
  `editing` was reset to `null`, taking a code path that read `.occKey` off `null`. Fixed by giving
  a new custom event the same minimal fields (`id`, `createdAt`, `archived`, `overrides`,
  `category`) the template path already provides.
- **Events are now directly editable and deletable from the Timeline row**: `Row` (in
  `widgets/TodayScreen.jsx`) gained `Edit`/`Delete` actions for `kind === "event"` items. `Edit`
  reuses the exact same form the Events tab uses (`EventForm`, now exported from
  `EventsWidget.jsx`) inline under the row — including its plain typed date (`type="date"`) and
  time (`type="time"`) fields with a live local-time preview, no picker. `Delete` mirrors the
  Events tab's own delete (confirms, removes the event and any of its reminders).
- **Fixed a tab-bar layout bug this round's own 5th tab exposed**: `.th-tabbar`'s column count was
  hardcoded to `repeat(4, ...)`, so a 5th tab wrapped onto a second row and threw off the sliding
  selected-tab highlight (which already correctly used the `--n`/`--i` variables). Changed to
  `repeat(var(--n, 4), ...)` to match.

## Events expand on tap (Sep 2026)
- `widgets/EventsWidget.jsx → EventCard`: the whole header (name, date/time, status/account tags)
  is now a single tappable button (`.th-ev-hit`) that expands the card to its full detail panel
  (recurrence, notes, Edit/Skip/Duplicate/Disable/Restore/Delete, calendar buttons) — replacing the
  small separate "More details" text link that used to be the only way in. A chevron (▸/▾) next to
  the event name shows the current state. The countdown and the "Set time" button for an unset
  event sit outside the tappable area, unaffected. Same behaviour, keyboard-accessible
  (`aria-expanded`, a real `<button>`), in both LTR and RTL.

## To do moved to the second tab (Sep 2026)
- `TimeHub.jsx`: reordered `TABS` (and the matching panel/prewarm order) to
  Timeline · To do · Timers · Events · BT Calculator. No id, icon, or panel content changed — only
  position. Confirmed in the browser, in Arabic RTL (mirrors correctly, reading right to left as
  Timeline · To do · Timers · Events · BT Calculator), and in dark mode.
- Fixed two test-harness scripts (`perf/soak.mjs`) that picked a tab by its numeric position rather
  than name, which broke once the order changed — now targets tabs by their visible text instead,
  so a future reorder won't silently break performance testing again.

## Continuous vertical timeline + tiered countdowns + smart "Add task" (Sep 2026)
Substantial progress on the Timeline redesign brief. Scoped to what could be built and verified
solidly this round — see "Not done this round" below for what's left.

- **Continuous vertical spine**: `.th-srow`/`.th-gap` each draw one segment of a thin (1.5px)
  line at a fixed offset (solid through events, dashed through free time) via a plain CSS
  `::before` — no SVG paths, no JS measurement, no absolute-position guessing. Consecutive rows'
  segments join into what reads as one continuous line. Each event row gained a small circular
  node (`.th-rail-dot`, a real grid cell — not absolutely positioned) that sits precisely on the
  line; the very next upcoming item's dot is highlighted gold. This replaces the wavy
  multi-coloured rail from an earlier, since-reverted round with something calmer and far
  simpler, deliberately reusing the same restrained visual language as the Education plan's
  timeline, which was already validated warm and readable this session.
- **Tiered countdown precision** (`lib/time.js → formatCountdown`, doc's exact examples): 2d 4h →
  4h 53m → 37m (no seconds once minutes alone are precise enough, from 10 minutes out) → 8m 42s
  under that. This is also a real performance win, not just cosmetic: `Remaining` (`components/ui.jsx`)
  now only subscribes to a per-second tick once a countdown is actually within that 10-minute
  window (`RemainingFine`); everything further out re-renders once a minute (`RemainingCoarse`),
  which on a busy Timeline with many distant timers is the difference between each of them
  re-rendering every second versus every minute. Timers-tab hero countdowns and anything using the
  `"clock"` format (HH:MM:SS displays someone is actively watching) are untouched — always precise.
- **Large gaps say "open" instead of "free"** (`openTime` string, 4h+) so a 10-hour stretch doesn't
  read as "10h free" the way a 20-minute one does.
- **"+ Add task" now suggests before it asks** (`widgets/TodayScreen.jsx → GapTaskSheet`, reusing
  `lib/tasks.js → bestFits`): tapping it in a gap shows unfinished, unscheduled to-dos that
  actually fit the available time, each one tap away from being scheduled into that exact gap (no
  duplicate task created — the same object gets a `start`/`end`). Tasks that don't fit are named
  under a collapsed "Needs more time" rather than hidden outright. A blank "New task" form is
  still one tap away, and if there's nothing unscheduled at all, "+ Add task" skips the sheet and
  opens the form directly — no empty list shown for no reason. This is the same connective tissue
  the brief asked for between Timeline and the To-do system.

## Not done this round (from the same brief)
Flagging honestly rather than skipping quietly:
- Colour/weight hierarchy distinguishing **action-required** vs **scheduled event** vs
  **completion** vs **passive info** rows (doc section 8) — dots are currently uniform teal
  (gold only for "next"), not yet split by this taxonomy.
- **Action-oriented completions** — "↻ Start next research" under a research finish, "↻ Restart
  camps" under a training finish (doc section 9). Contributions already got this treatment
  earlier this session ("Spend all"); research/training didn't yet.
- **"Nothing needs you for 2h 14m"** phrasing inside gaps, and **sleep-aware gap messaging**
  ("while you're sleeping, no action needed") — the Education planner already has sleep-awareness
  (`lib/sleep.js`, `state.settings.sleep`) this could reuse, just not wired into the main Timeline
  yet.
- **Auto-scroll to NOW + collapse earlier items** ("✓ 8 earlier items · Show") on opening Timeline.
- A distinct **"Needs you soon"** (next ~2h) grouping separate from the existing Needs You card.

## Removed the table-grid feel from the Timeline (Sep 2026)
Refinement of last round's spine, not a rebuild — the smallest changes that fixed it:
- **Removed the full-width `border-top` on every row** (`timehub.css → .th-srow`) — this, combined
  with the vertical spine, was exactly what read as a table (horizontal rule + vertical rule =
  grid cells). Rows are now separated by whitespace and the spine alone; slightly more vertical
  padding (11px → 14px) keeps them from feeling cramped without it. The NOW marker and "after
  midnight" boundary have their own independent styling and were unaffected.
- **The inline countdown next to each event no longer shows a live HH:MM:SS clock.** It was using
  `fmt="clock"` (always-precise, seconds included) instead of the tiered `fmt="countdown"` built
  last round — swapped to the latter, so it now reads "in 2h 9m" the way the brief's examples show,
  and it also lost its bordered-pill background (now plain, muted text with a small edit pencil) so
  it no longer visually competes with the event title above it.
- **Reordered the row's tag line** so the account chip comes before the relative-time text, matching
  the requested hierarchy (event → account → relative time → supporting details → UTC, the last of
  which already lives in the smaller text under the local time on the left).
- Checked in the browser, Arabic RTL, and dark mode; 134 tests pass; your calculator rebuild shows
  no performance change.

## Vice President research reminders, a Timeline filter, and a calmer To-do list (Sep 2026)

### Part 1 — Research → Vice President booking reminder
- `lib/research.js` rewritten to be specifically about the **Vice President** position (+10%
  research speed) rather than "any minister" — confirmed as the right position this round.
  `researchReminder()` now checks bookings filtered to `vice_president` only, and adds conflict
  detection: if a VP booking exists nearby (within 6h) but no longer covers the *current*
  recommended slot — because the research timer's finish time drifted — it's surfaced as
  "booking may need updating" rather than silently ignored, moved, or re-prompted forever.
  As instructed, the +10% buff's effect on the finish time itself is **not** modelled (same
  reasoning as the Ministry of Education planner): the app has no research-speed formula to
  correct the estimate with, so the current projected finish is used as-is.
- Shown in two places, both reading the same underlying state: a quiet line under each research
  timer in the Timers tab (`Book this slot` / `Mark booked`), and — new — a proper action card in
  **Needs You** on the Timeline once the reminder enters its 24-hour or 3-hour tier. "Mark booked"
  writes a real record into the existing bookings model; nothing is duplicated or invented.
- Two real bugs found and fixed while building this: a wrong translation-key convention showed
  literal text like "short_war_academy" instead of "War Academy" (research buildings use a
  different key convention than training camps); and giving the Needs-You card two buttons broke
  its layout entirely (the title's available width was squeezed to about 9px) — resolved by
  keeping one primary action there and leaving the second ("Mark booked") where it already has
  room, in the Research tab.

### New: a Timeline filter
- `Schedule` (Today/Timeline) gained an All / Game / Personal / Work filter
  (`state.settings.timelineFilter`), right under the "Schedule" heading. "Game" keeps every real
  game item (events, timers, bookings, contributions…) plus Game-category to-dos together, since
  both are "the game side of the day"; Personal/Work show just that to-do category and quiet the
  game noise entirely. Verified in the browser and in Arabic RTL/dark mode: switching to Personal
  correctly hid all 17 game rows while keeping a scheduled personal task, and switching to Game
  correctly hid the personal task while keeping the events.

### Part 2 — To-do, a first pass toward feeling like a real task manager
Scoped deliberately — see "not done" below for the rest of this large brief.
- **Completed tasks now leave the active list.** Ticking one off moves it into a collapsed
  "Completed · N" toggle at the bottom of its category (per-category, not yet a shared
  History view) instead of sitting inline with strikethrough forever. Un-checking it in that
  list moves it straight back to active — this doubles as "Restore".
- **Quick-add now shows duration as a real, always-visible field** next to the title, instead of
  behind a "+ How long?" toggle — matches the brief's exact requested layout.

### Not done this round (flagged, not skipped quietly)
This brief's Part 2 is large. Still outstanding: tap-a-task-to-edit (title/duration/category/
account/priority/notes in one sheet), swipe gestures (delete/complete), drag-and-drop reordering,
user-created subgroups within Game/Personal/Work, a proper cross-category Completed/History view
with date-range filtering, and the task data-model additions (notes, priority as a separate field
from "important", custom sort order) that those would need. Also from an earlier round, still
outstanding: action/event/completion/passive colour hierarchy on timeline nodes, action-oriented
completions, sleep-aware gap phrasing, and auto-scroll-to-NOW with earlier items collapsed.

Checked in the browser, Arabic RTL, and dark mode; 135 tests pass (5 new this round); your
calculator rebuild shows no performance change and no leaks.

## Tap a task to edit it (Sep 2026)
- `widgets/TodoWidget.jsx → TaskEditForm`: tapping a to-do's title (not the checkbox) now opens it
  in place — title, duration, category (switching to Game reveals the account picker via the
  existing `AccountSelect`), and a new **notes** field, plus Delete (with confirmation). Saving
  updates the same task object everywhere; nothing is duplicated.
- `lib/storage.js → cleanTasks`: added `notes` (trimmed, 500-char cap) to the task schema.
  Migration-safe — a task saved before this field existed just gets `notes: ""` on next load,
  confirmed with a dedicated test.
- Verified end-to-end in the browser: opened a task, switched it to Game, assigned an account,
  added a note, saved, reopened it and confirmed the note persisted, then deleted it. 135 tests
  pass, full regression clean, calculator rebuild shows no performance change or leaks.
