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
- Coordinate panel follows the map in DOM order. Both desktop and phone interface tests placed a player city, empty city space, banner, HQ and editable terrain through the review sheet.
- Phone touch tests verified pinch scale changes, two-finger pan without scale changes, two-finger tap zoom-out, double-tap zoom-in, double-tap-drag zoom and cancellation of a held city drag when a second finger touches the map. Gestures did not mutate the plan.
- City dragging on phones uses a hold before movement; mouse dragging remains immediate.
- No uncaught browser errors in the final run.

Model checks additionally cover exact reference geometry, fixed-feature world-coordinate invariance, terrain collision rejection, no-op removal of fixed IDs, locked-city movement constraints, partial/complete eligibility, missing dates and roster imports without attendance creation.

## Officer workflow release

Real Chromium at desktop and 390×844 phone sizes verified: ranked slot suggestions; trap filtering; name search; hidden/already-placed players; locked candidates; confirmed relocation and Undo; filtered select-all; selection retained through search; deselection and re-selection; locked skip/unlock bulk moves; deletion with history retained; bulk Undo; map trap details, number-swap preview, review flags, geometry/history preservation, swap Undo and reload persistence; queue-to-selection entry. A 390×480 resized viewport checked sheet bounds as a keyboard-space simulation, not a physical keyboard test. No uncaught errors in the completed officer workflow runs. The existing browser suite also passed on both sizes, including phone multi-touch gestures, direct city movement, fixed terrain, coordinate placement, attendance, reset/template Undo and PNG export.

## Template and copy release

Six built-in templates passed internal footprint-overlap and map-edge checks: LUN, Owl, Swirl, Banner pad, Twin swirl and Twin banner pad. Owl geometry was traced from the supplied image; player names and decorative territory shading were omitted. See dist/TEMPLATE-SOURCES.md for attribution and interpretation details.

Real desktop and 390×844 Chromium interface tests verified all six template previews, application, Undo, coordinate changes, roster/attendance/other-map preservation and Owl persistence after reload. The same tests verified a collapsed-by-default coordinate disclosure and Suggest assignments inside Member queue. The existing phone gesture/placement/attendance suite and officer bulk/swap suite also passed, with no uncaught browser errors.

Copy was revised across map, roster, attendance, sharing, settings and action sheets. Sharing is labelled Share plan; partial-list and snapshot limits remain explicit. Physical iPhone Safari remains unverified.

## Data provenance

Bundled community world-map data: WOS Nerds / wosnerdwarriors/wos-data, revision 802a263238893581b1ae7fc38914fa660f37b42f.
Original JSON SHA256: 6f64e2f498b8d4af40b9b1b2bd3771c3d1d9638a62d3cd24c73970d4b6243c21. Pinned-revision download matched the source used for the bundled row runs.

This is not live state data. Completeness, resource-node coverage, state-specific differences and in-game coordinate accuracy were not independently verified.

## Unverified

Physical iPhone Safari, VoiceOver, real-device performance and real pinch gestures. Post-deploy testing is a public HTTP check plus Vercel deployment metadata; the complete browser suite was run against the local production files.

## Direct map interaction release

Current changes: map tools and Member queue are inline on phones; Select, Assign and Remove tool buttons are replaced by direct item selection, contextual minus and ranked player shortcuts. City, empty-space, editable terrain and structure dragging use one finger immediately. Two fingers pan/zoom; a second finger cancels an in-progress object drag. Editable terrain shows a mountain marker. Fixed world features remain immutable.

Validation for this revision: model checks, script startup/DOM contracts and synthetic pointer-handler checks. These are not browser tests. They cover collision/lock/bounds rejection, row recalculation, immediate city movement as one undo step, one-finger empty-space restraint, two-finger panning and contextual city removal with roster retention. Real-browser and physical iPhone verification of the revised controls remain unverified because the supported browser capability was unavailable in this session. Earlier browser results above describe earlier releases.

## Persistent placement and selection dock revision

Selection actions now sit below the canvas rather than covering a city. They hide whenever fingers or a mouse pointer are held on the canvas. Phone tools use two bounded grid rows. Terrain, Banner and + City tools stay active until tapped again; Banner selects directly. Holding in placement mode shows a snapped footprint before any state is saved. Touch previews are lifted 48 screen pixels above the finger and show valid/blocked feedback plus world coordinates. Release adds one item; collisions, pointer cancellation and a second finger cancel the candidate. Each placed item has its own Undo step. Two-finger camera gestures retain the active placement tool.

Validation: model checks and synthetic down/move/up pointer-handler checks cover non-mutating previews, touch offset, repeat placement, retained tools, toggle deselection, collision rejection without an undo entry, pointer cancellation, second-finger cancellation and one Undo entry per valid placement. Static DOM checks locate selection controls outside the canvas. Real-browser layout and physical iPhone Safari remain unverified for this revision. The screenshots supplied by the user informed these changes.

## Pan, double-tap selection and attendance-stage revision

Current interaction: one finger pans over unselected items or empty space. Double-tap/double-click selects an item; dragging that selected item moves it. A single tap on empty space deselects. Double-tapping an item does not zoom. Placement previews have no touch offset and use the same snapped coordinates as the final item. Placement tools remain active. Undo/Redo have stroked SVG icons, text labels and separate enabled/disabled styles.

Fixed the player-name tap failure: the global outside-pointer handler previously re-rendered the dock on pointerdown, replacing the tapped button before click. It now stops momentum without redrawing when no map gesture is active. Both the inline list and searchable sheet use only the highest remaining attendance group for that trap. Allocated players are excluded across the current map; search cannot reveal lower groups. Existing attendance percentage/category calculations are retained.

Passed: complete automated model suite; synthetic pointer/DOM checks for one-finger pan over unselected cities, double-tap selection without zoom, selected-city movement, multi-touch cancellation, exact placement across three zoom levels/translated cameras/both projections, repeat placement, dock and modal assignment button handlers, prevention of idle pointerdown replacement, persistence, assignment Undo/Redo, and strict Frequently → Sometimes → Rarely → Unknown progression. Browser test scripts were updated to the revised interactions and passed syntax checks, but were not run in this revision.

Unverified: real-browser interaction, phone toolbar rendering, and physical iPhone Safari. The supported browser-control capability was unavailable in this session. Earlier browser test results describe earlier releases, not this revision.

## Selected simplifications release

Implemented the selected concept changes while preserving five navigation tabs, Both traps, Plain/Terrain modes, templates, reset, coordinate tools and sharing. The large map statistics are hidden. Phone planning opens closer to a selected trap; Fit continues to show the full layout. Main tools are + City, + Item (Banner/HQ/Terrain), Undo and Redo. Single-tap selects. The dock shows the selected name, world coordinates and Remove below the canvas. Players to place becomes Who goes here? for a selected empty city. The attendance-group queue places directly into that space, or the next valid space. Place players for me fills only unallocated players into valid empty spaces, in attendance order, as one undoable action; existing allocations and locks are preserved. Roster import is on Players; cards show Placed/Not placed.

Attendance now opens with a tick-list and Save attendees. This is the full list explicitly controls completeness. Unsaved ticks do not create records. Existing eligible sets are preserved; new unrecorded lists include the trap roster. Search, paste matching, eligibility editing, history, export and frequency rules remain available. Unsaved selections are retained per event while navigating. Main saved-state confirmation hides when switching events.

Passed: full automated model suite and synthetic DOM/pointer checks for single-tap selection, placement, next-space/preferred-space assignment, strict attendance stages, one-action bulk placement with locked/existing positions preserved, Undo, tick/save/complete attendance, no attendance autosave, date/trap isolation and saved checkboxes. Script syntax and build checks passed. Browser scripts were updated for the new controls but were not executed.

Unverified for this release: real-browser rendering/interactions, physical iPhone Safari, phone default framing and dark-mode appearance. The supported browser-control capability was unavailable. Browser results from earlier releases do not validate this revision.

## Compact toolbar correction

Removed the obsolete CSS-generated “＋ Slot” suffix. Reset the + Item details wrapper's inherited global margin, padding and border, which had inflated its grid row and stretched Undo/Redo. The four primary controls now have explicit 44px row/control heights; Templates and Reset remain on their own compact secondary row. Opening the item menu does not resize the toolbar.

Real headless Chromium tests loaded the complete current production HTML, CSS and scripts from local files through isolated request interception. Passed at 320×844, 390×844, 428×926, 768×1024, 844×390 and 1440×1000: exactly one + City label; no generated Slot suffix; 44px aligned primary controls; compact toolbar bounds; no horizontal control overflow; Banner/HQ/Terrain visibility; HQ selection, menu closure and deselection; no uncaught browser errors. Light/dark phone screenshots were inspected internally. Build passed. Physical iPhone Safari remains unverified. This validates the toolbar correction, not every unrelated workflow.
