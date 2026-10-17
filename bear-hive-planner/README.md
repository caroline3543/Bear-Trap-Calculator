# Bear Hive

Browser-local Bear Trap map, roster and attendance planner for officers. Serve `dist/`.

- Direct city dragging, grid snapping, collision previews, locked placements, edge panning, precise tap movement and Undo.
- Separate BT1, BT2 and Other members queues. Other members are excluded from city assignment. Suggest assignments seats the selected list around its corresponding trap using attendance.
- Reset layout retains the configured BT coordinates and fixed world layer, removes all editable objects and city spaces, and unassigns everyone. Roster groups and attendance remain. Reset is one undoable action.
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

The bundled WOS Nerds community dataset contains 198,365 mapped tiles in a 1200×1200 world. Fixed features are rendered separately from editable plan objects. They cannot be moved or deleted and remain in world coordinates when trap references change. Coordinate changes reject invalid trap positions and locked-city conflicts; other conflicting cities return to the queue after review.

Blocked keys: mountain, lake, building, castle and resource-node coverage. Cities may occupy fortress/stronghold and facility areas; other structures follow the source planner’s restrictions. This is a community reference, not live state data. Completeness, state-specific differences and in-game placement are not guaranteed.

Source: https://github.com/wosnerdwarriors/wos-data/tree/main/data/worldmap

Data revision: 802a263238893581b1ae7fc38914fa660f37b42f. `world-data.js` stores row runs instead of repeated per-tile JSON. `world-map.js` provides coordinates, collision checks and visible-region rendering. No remote service is needed at runtime.
