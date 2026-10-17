# Bear Hive: city editor and event-attendance release

## Implemented
- Direct city drag/drop on the model grid, collision previews, locked-city protection, edge panning and Escape/pointer cancellation.
- Empty-space panning and pinch zoom; tap-based Move remains available.
- Compact layout uses shared-edge packing and scores internal holes, occupied bounds and distance. It is a heuristic, not a proven optimum.
- Reset restores valid default slots for one trap, preserves locked cities and all historical data, and reports blocked/overflow positions.
- Compact, reset and each city move are single Undo operations. Attendance-based assignment is separate from geometry changes.
- Removed whale, speed-preference and rally-method interface controls and seating logic. Legacy backup metadata is ignored.
- Primary bulk-roster action is in Member queue. One import action remains on Members; no global roster button appears on Attendance.
- Alliance tags remain import/export metadata. Main player labels use usernames; IDs disambiguate matching.
- Dedicated “Add attendees · BT1 · 1 January 2026” sheet, reviewed matches, explicit dated save, partial/complete modes and saved-count receipt.

## Automated browser verification
Real headless Chromium was used at 1440×1000 and 390×844. Phone-sized city dragging and panning used simulated touch events through Chromium’s input API; desktop used mouse input.

Verified through actual interface controls:
- Free-grid drag saves the new city position; one Undo restores the previous plan.
- Drops on the trap are rejected in the browser. Other-city and structure collision cases are covered by the model checks.
- Locked cities cannot be dragged.
- Empty ground pans; dragging near viewport edges pans while held; Escape cancels without saving.
- Terrain can be painted through the map tool.
- Tap-based Move places a city on a valid free grid position and is undoable.
- Compact and reset preview before applying, respect terrain/locks, preserve the other trap and attendance, and undo in one step.
- Player editing no longer shows rally method or march preference.
- The Attendance action opens the dedicated sheet for the selected trap/date.
- Exact names, duplicate lines and manually confirmed similar names save correctly.
- A dated receipt and participant list appear immediately; attendance persists after reload.
- Switching BT/date preserves separate records.
- The actual browser OCR worker reads a synthetic participant screenshot. Its matches merge through the reviewed save flow without double-counting existing attendees.
- Marking complete, correcting a completed list and reducing the evidence threshold recalculate frequency.
- Bulk roster imports do not change event attendance.
- No uncaught browser page errors in the completed runs.

## Model and integrity checks
Model, attendance, layout and DOM-contract suites pass. Additional checks cover moved locked cities during reset, unique slot identifiers, Unicode/ID identity, partial-list semantics, eligibility snapshots, history-backed allocation and overflow handling. OCR build assets are version-pinned and verified against SHA-256 checksums.

## Not verified
- Physical iPhone Safari, real-device performance, VoiceOver and actual pinch gestures.
- OCR accuracy on arbitrary in-game screenshots or decorative usernames.
- Authenticated production page rendering: the connected Vercel account previously denied protected page/log access. Production release status can still be confirmed through deployment metadata.

No game API or shared database was introduced. Plans remain browser-local and exportable through backups.
