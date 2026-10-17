# Bear Hive verification

## Current release

Build and model/attendance/layout/revision/DOM-contract checks passed. Real headless Chromium interface checks passed at 1440×1000 and 390×844. Phone-sized dragging used simulated touch input.

Verified in both browser sizes:
- Fresh map has no roster or assigned cities.
- Bulk imports populate distinct BT queues; suggestions assign each queue around its matching trap.
- City drag changes coordinates and radial instructions; Undo restores it.
- Row 1 has no behind-player instruction or removed directional/confirmation disclaimer.
- Remove city retains the roster; terrain and HQ can also be removed.
- Independent coordinate origins save correctly.
- Typed name suggestions select an attendee; pasted duplicates deduplicate; dated partial save shows the receipt and participants immediately.
- Attendance survives reload and remains isolated between traps.
- Factory reset clears both maps, including locked allocations and terrain, preserves roster/history/anchors and undoes exactly.
- Exported PNG header and dimensions confirm a nonempty 4096×4096 image.
- Reference import preview, exact object counts, roster/history preservation, Undo, direct-link opening and persistence after reload.
- No uncaught browser errors.

Model suites additionally cover collision rejection, locks, fuzzy matching, complete-list correction, frequency recalculation, date/trap isolation, partial-list semantics and roster imports without attendance creation. Those cases were not all rerun through the browser in this release.

## Unverified

Physical iPhone Safari, real-device performance, VoiceOver and actual pinch gestures remain unverified. Public access was enabled on the previous release; this release is checked through deployment metadata and an unauthenticated HTTP request. The app remains browser-local with exportable backups.
