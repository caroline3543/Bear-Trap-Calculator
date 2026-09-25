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
