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
- Load LUN layout previews the saved WOS Nerds reference: 58 empty city spaces, two traps, HQ, 16 banners and 32 terrain tiles. It preserves roster/history and is undoable. The direct link `?layout=lun` opens the preview. Reference numbering groups each space with the nearest trap (32 BT1, 26 BT2). The template uses the current BT1 coordinates and places BT2 nine tiles west. Fixed-map conflicts are blocked for assignment.
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

One finger pans the map. Hold a city for 320 ms, then drag to move it; moving before the hold completes pans instead. Two fingers pan and pinch around their moving midpoint. Double-tap zooms in, two-finger tap zooms out, and double-tap followed by a vertical drag zooms with one hand. A second finger cancels an active city drag. Cancellation, app blur and Escape do not save a move. Pan momentum honours reduced-motion preferences. Browser/page gestures remain available outside the map. Map orientation stays fixed to preserve coordinate directions.

Coordinates are below the map on phones and available in both modes. Search does not place anything. The placement selector supports BT1, BT2, a roster player’s city, empty city space, banner, HQ and editable blocked terrain. Non-trap objects use a review step, proper footprints, collisions, locked-city checks and one-step Undo.

## Officer workflows

Empty city spaces open a searchable sheet ranked Frequently, Sometimes, Rarely and Unknown for that trap. Attendance percentage orders players inside each category; manual codes are the fallback. Already placed players are hidden initially; including them shows a move confirmation. Locked players cannot be moved.

Members and the map queue offer Select members. Select all shown includes the entire filtered result, not just the viewport; selected members remain selected when filters change. Bulk moves to BT1, BT2 or Other members and deletion use a count preview and one Undo operation. Locked cities require an explicit skip or unlock choice. Attendance history remains. Group changes clear active and saved-mode placement associations; deletion also clears placed city footprints in saved drafts.

Tapping a bear opens Change trap number. With two traps, this swaps their labels and city-space associations on the active map. Physical positions, roster groups, event schedules and attendance histories remain unchanged. Conflicting roster/placement associations are highlighted for officer review; copied move instructions flag the conflict until resolved.

On phones, the map is prioritised; tools and queue open in dismissible panels. Coordinates remain below the map. Bulk actions sit above navigation; dialogs size to the visual viewport. Physical iPhone keyboard/Safari behaviour still needs device verification.
