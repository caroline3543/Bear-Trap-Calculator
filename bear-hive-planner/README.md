# Bear Hive

Browser-local Bear Trap map, roster and attendance planner for officers. Serve `dist/`.

Choose Plain map or Terrain map. Each mode saves its own layout while sharing roster and attendance. Plain starts with both bear traps and no fixed terrain. Terrain starts with fixed world features and no placed traps or editable objects. Search coordinates marks a location without placing anything; Place bear trap explicitly places BT1 or BT2 at the entered coordinates, with collision checks and Undo.

- Direct city dragging, grid snapping, collision previews, locked placements, edge panning, precise tap movement and Undo.
- Separate BT1, BT2 and Other members queues. Other members are excluded from city assignment. Suggest assignments seats the selected list around its corresponding trap using attendance.
- Reset layout affects only the active mode. Plain keeps both configured bear traps; Terrain removes all placed traps. Both remove editable objects and city spaces and unassign everyone. Roster groups and attendance remain. Reset is one undoable action.
- Remove tool deletes map placements, terrain and structures without deleting roster members or attendance.
- Independent BT1 and BT2 coordinate origins. Radial rows start at the trap; row 1 is the front row.
- Bulk format: `[ALLIANCE] Exact username, player ID, code`. Codes f, s, r, u or blank (Unknown). Alliance tags remain metadata.
- Typed attendee lookup suggests exact and similar names. Pasted names and IDs are reviewed before saving to the explicit trap/date. Fuzzy matches require confirmation.
- Percentages apply from the first completed eligible event, show the sample size, and use manual codes only when no calculated percentage exists. Partial lists confirm attendance only. Complete lists allow eligible unlisted players to count as absent. Missing dates do not count as absence.
- Separate two-day schedules and attendance history per trap. Imports never create attendance records.
- Large 4096 × 4096 PNG map exports, CSV exports, backups, recovery and dark mode.
- Templates offers LUN (58 spaces), Owl (99), Swirl (50), Banner pad (50), Twin swirl (100) and Twin banner pad (100). Preview the geometry and BT1 coordinates before replacing the active map. Roster, attendance and the other map remain saved; all cities are unassigned. Applying a template is undoable. `?layout=owl` and the other template IDs open a direct preview. Fixed-map conflicts are reported and blocked city spaces cannot be assigned. See dist/TEMPLATE-SOURCES.md for source attribution and interpretation limits.
- No screenshot OCR, compact command, whale seating or rally-method controls.

## Development

`npm run build` validates static assets. `npm test` runs model and DOM-contract suites. `npm run test:browser` requires Playwright and Chromium; set `HIVE_PLAYWRIGHT_PATH` for an external Playwright installation.

## Deployment

Vercel root: `bear-hive-planner`; framework: Other; build: `node scripts/build.mjs`; output: `dist`. No runtime secrets or remote OCR assets are needed.

Plans remain browser-local. Use backup export/import to move devices or origins. There is no game API, shared database or in-game rank verification. Game coordinates use a 2×2 city / 3×3 trap model; validate the configured origins against the game. Territory connectivity is not validated.

See VERIFICATION.md for browser coverage and limitations.

## Fixed world map

The bundled WOS Nerds community dataset contains 198,365 mapped tiles in a 1200×1200 world. In Terrain mode, fixed features are rendered separately from editable plan objects. Plain mode hides that layer and disables its terrain constraints. They cannot be moved or deleted and remain in world coordinates when trap references change. Coordinate changes reject invalid trap positions and locked-city conflicts; other conflicting cities return to the queue after review.

Blocked keys: mountain, lake, building, castle and resource-node coverage. Cities may occupy fortress/stronghold and facility areas; other structures follow the source planner’s restrictions. This is a community reference, not live state data. Completeness, state-specific differences and in-game placement are not guaranteed.

Source: https://github.com/wosnerdwarriors/wos-data/tree/main/data/worldmap

Data revision: 802a263238893581b1ae7fc38914fa660f37b42f. `world-data.js` stores row runs instead of repeated per-tile JSON. `world-map.js` provides coordinates, collision checks and visible-region rendering. No remote service is needed at runtime.

## Phone map controls

Tap an item to select it, drag the selected footprint to move it, then tap ✓ Done to deselect. One finger pans from empty space or an unselected item. Pinch and two-finger panning remain available. A second finger cancels a drag. Invalid drops, pointer cancellation and app blur preserve the original position. Each valid drop saves immediately as one Undo action; Done does not save another change. Momentum honours reduced-motion preferences.

The phone canvas uses 72% of viewport height. Expand fills the available screen and hides page navigation; Exit restores the page and scroll position. Expansion preserves the world centre and scale. Selection, assignment and Done preserve the camera. Resizing does not automatically Fit. Fit remains a separate explicit action.

A selected-item dock sits outside the canvas and contains Done, Details, Coordinates and Remove as appropriate. Locked cities show a padlock and Unlock; unlocking is undoable. Dragging hides the dock without changing canvas size. The exact footprint stays snapped under the pointer, while a touch magnifier beside the finger shows its position and validity. Banner, HQ, terrain and city placement tools remain active for repeated placement until Done, the active tool or Escape is pressed.

Map options (⋯) contains Plain/Terrain modes, Templates, Reset, projection and Find & place by coordinates. Fixed world terrain remains immutable. Search does not place an item. Coordinate moves validate footprints, collisions, terrain, bounds and locks, and are undoable.

## Officer workflows

Select an empty city to see players from the highest remaining attendance group for that trap: Frequently, Sometimes, Rarely, then Unknown. Allocated players are excluded. Tap a suggested name to place them there. All players opens the full searchable list for that group. The same player panel stays below the map when nothing is selected and places names into the next available city. There are no duplicated sidebar, strip or selected-city lists.

The player panel includes Full list for searching and a secondary BT lists disclosure for list editing and attendance-based routing. The Players tab retains roster imports and bulk selection, group moves and deletion. Bulk operations preview counts and handle locks explicitly. Roster imports never create attendance records. Removing a city preserves the player and attendance history.

Selecting a bear trap shows its details and Done. Change trap number swaps labels and city-space associations on the active map without changing physical positions, roster groups, schedules or attendance. Bear trap movement remains a coordinate operation. Fixed world-map features retain their read-only details.

## Browser verification

`npm test` covers models and DOM contracts. `npm run test:planning` runs actual Chromium workflows using intercepted local static assets, with no preview server. Set `HIVE_PLAYWRIGHT_PATH` to an installed Playwright package when it is outside this project.

Real-browser checks cover touch selection/drag/Done, one-finger panning, pinch, collision/cancellation handling, locks and unlock Undo, inline/full-list assignments, repeated placement, touch preview and magnifier, removal and Undo/Redo, expanded view/exit, camera stability, saved-state reload, small phones, landscape, rotation, coordinate disclosure and dark mode. Existing roster and attendance browser flows also pass. Physical iPhone Safari, browser chrome and the software keyboard remain unverified.

## Selected simplified interface

Map statistics are hidden. + Item contains Banner, HQ and Terrain. Players to place shows the current attendance group and assigns directly to the selected empty city or next valid space. Place players for me fills empty cities without rearranging allocated players and supports one-step Undo. Import rosters on Players. Attendance uses an event tick-list with explicit partial/full saving; advanced matching, eligibility and history remain available. The five tabs, trap/map options and native font remain.

## Design system and visual review

`DESIGN.md` records the original Bear Hive system informed by the selected VoltAgent Apple/Linear references and TasteCode review workflow. `dist/design-system.css` owns map, player and attendance components; `style.css` retains the page shell and specialist forms. `dist/ui-components.js` measures Unicode city names into at most two lines without modifying roster data.

Run `npm run test:design` for real-browser checks of the single picker, Unicode label bounds in both projections, text contrast, unchanged model state, Players statuses and attendance saves. The test captures light/dark map, Players and Attendance views. `DESIGN_REVIEW.md` records the review scope and verification limits.
