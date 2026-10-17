# Bear Hive

Browser-local Bear Trap map, roster and attendance planner for officers. Serve `dist/`.

- Direct city dragging, grid snapping, collision previews, locked placements, edge panning, precise tap movement and Undo.
- Separate BT1 and BT2 queues. Suggest assignments seats the selected list around its corresponding trap using attendance.
- Factory Reset layout clears both maps, allocations, locks, terrain and structures. Roster, trap-list membership, attendance history and coordinate anchors remain. Reset is one undoable action.
- Remove tool deletes map placements, terrain and structures without deleting roster members or attendance.
- Independent BT1 and BT2 coordinate origins. Radial rows start at the trap; row 1 is the front row.
- Bulk format: `[ALLIANCE] Exact username, player ID, code`. Codes f, s, r, u or blank (Unknown). Alliance tags remain metadata.
- Typed attendee lookup suggests exact and similar names. Pasted names and IDs are reviewed before saving to the explicit trap/date. Fuzzy matches require confirmation.
- Partial lists confirm attendance only. Complete lists allow eligible unlisted players to count as absent. Missing dates do not count as absence.
- Separate two-day schedules and attendance history per trap. Imports never create attendance records.
- Large 4096 × 4096 PNG map exports, CSV exports, backups, recovery and dark mode.
- No screenshot OCR, compact command, whale seating or rally-method controls.

## Development

`npm run build` validates static assets. `npm test` runs model and DOM-contract suites. `npm run test:browser` requires Playwright and Chromium; set `HIVE_PLAYWRIGHT_PATH` for an external Playwright installation.

## Deployment

Vercel root: `bear-hive-planner`; framework: Other; build: `node scripts/build.mjs`; output: `dist`. No runtime secrets or remote OCR assets are needed.

Plans remain browser-local. Use backup export/import to move devices or origins. There is no game API, shared database or in-game rank verification. Game coordinates use a 2×2 city / 3×3 trap model; validate the configured origins against the game. Territory connectivity is not validated.

See VERIFICATION.md for browser coverage and limitations.
