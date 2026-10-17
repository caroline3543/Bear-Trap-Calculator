# Bear Hive verification

## Current release

Build, model, attendance, layout, revision, DOM-contract and world/groups and map-mode suites passed. Real Chromium checks passed at 1440×1000 and 390×844. Phone-sized dragging used simulated touch input.

Verified through real interface controls in both sizes:
- Bulk import into BT1, BT2 and Other members with explicit destination review.
- Separate queues, member-form group changes and assignment around the corresponding trap. Other members remain unassigned.
- Manual city-space creation, city dragging and Undo with fixed-map collision checks.
- Typed suggestions, reviewed partial attendance save, completing a list, correcting a completed list, immediate percentage recalculation and persistence after reload.
- Percentages start with the first completed eligible record; no minimum-record field is present. Switching traps isolates records.
- Coordinate updates reposition the trap and related city spaces in one world coordinate frame. Invalid trap positions are rejected.
- Fixed map features render and cannot be removed through the Remove tool.
- Separate saved Plain and Terrain map drafts share roster and attendance. Switching modes restores the corresponding layout.
- Terrain begins without placed traps or editable objects. Searching coordinates creates only a marker; explicit BT1/BT2 placement validates the footprint. Fixed-feature removal is rejected.
- Plain begins with both traps and no fixed terrain layer. Plain reset keeps both traps; Terrain reset removes all placed traps while retaining fixed world features. Each reset preserves the other draft, roster and history, and can be undone.
- Built-in Templates → LUN preview, current-origin placement, roster/history preservation, Undo, direct template links and reload persistence.
- Nonempty 4096×4096 PNG export.
- No uncaught browser errors in the final run.

Model checks additionally cover exact reference geometry, fixed-feature world-coordinate invariance, terrain collision rejection, no-op removal of fixed IDs, locked-city movement constraints, partial/complete eligibility, missing dates and roster imports without attendance creation.

## Data provenance

Bundled community world-map data: WOS Nerds / wosnerdwarriors/wos-data, revision 802a263238893581b1ae7fc38914fa660f37b42f.
Original JSON SHA256: 6f64e2f498b8d4af40b9b1b2bd3771c3d1d9638a62d3cd24c73970d4b6243c21. Pinned-revision download matched the source used for the bundled row runs.

This is not live state data. Completeness, resource-node coverage, state-specific differences and in-game coordinate accuracy were not independently verified.

## Unverified

Physical iPhone Safari, VoiceOver, real-device performance and real pinch gestures. Post-deploy testing is a public HTTP check plus Vercel deployment metadata; the complete browser suite was run against the local production files.
