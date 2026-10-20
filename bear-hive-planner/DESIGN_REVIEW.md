# Bear Hive design review

Date: 19 October 2026 (Pacific/Auckland).

## Brief and preserved behaviour

Apply the selected reference approach to the existing planner. Keep the native font, green identity, public deployment and game-model state. Consolidate player placement, improve map-name readability and use shared components on Players and Attendance. Do not change attendance calculations, event eligibility, roster IDs, locks, geometry or backup formats.

The reference workflow is adapted from TasteCode's brief/build/preview/review/repair process. TasteCode's desktop application is not installed or embedded in this project. The design guide is original Bear Hive documentation informed by the linked community Apple/Linear analyses.

## Findings and repairs

| Finding | Repair | Evidence |
|---|---|---|
| The same candidates appeared in a sidebar, an inline list and a map strip | One persistent player panel, retained in expanded view and retitled for a selected empty city | Browser DOM identity, direct assignment and group progression checks |
| Repeated map selectors made styling compete across revisions | Moved map/player/attendance components and theme tokens to design-system.css; removed 349 overlapping component rules | Component selectors no longer appear in legacy style.css |
| Short single-line city labels lost too much of a name | Measured two-line labels, full selected name, Unicode grapheme-aware wrapping and bounded caching | Actual SVG text lengths in both projections at three zoom levels; source roster unchanged |
| Small text on filled cities needed stronger contrast | Darkened city ink and secondary interface text | Actual rendered city foreground/background contrast is at least 4.5:1 in the tested fixture |
| The player panel crowded a short landscape canvas | Compact landscape arrangement and no irrelevant auto-place action when nobody remains | Small-phone, landscape and rotation browser checks |
| A BT-list popup could cover the resulting review actions | Close the disclosure after list updates | Roster routing and review-click browser flow |
| Long trap/time options were clipped on narrow screens | Short BT1/BT2 choices, with the complete date and time in the event heading | Phone attendance capture and event switching |
| Attendance save labels lacked their event destination | Include trap and date in the save action; make Partial/Complete a shared status component | Actual attendee save, receipt, checkbox state and destination-label checks |

## Verification

Passed:
- npm test: all model and DOM-contract suites.
- npm run build: every referenced static asset resolves.
- planning-browser.cjs: actual touch/mouse select, drag, cancel, collision rejection, Done, pan, pinch, locks, unlock, Undo/Redo, repeated placement, preview/magnifier, removal, expanded view/exit and persistence.
- planning-layout-browser.cjs: 320×740, 390×844, 428×926, 844×390 and 768×1024 layouts, rotation, long names, coordinate disclosure and dark mode.
- toolbar-browser.cjs: compact controls and item selection at phone, tablet, landscape and desktop sizes.
- roster-browser.cjs: roster autocomplete, manual frequency, explicit BT grouping, attendance autocomplete/save/reload, event isolation, corrections, deduplication and manual/locked routing.
- inline-suggestions-browser.cjs: the canonical picker, group progression, allocated-player exclusion, assignment, Undo/Redo and reload.
- design-review-browser.cjs: one picker node across normal/expanded views, measured labels, unchanged stored names, contrast, Players statuses and saved attendance.

The browser tests use Chromium with intercepted local static assets. Touch tests dispatch browser touch input. They do not prove physical iPhone Safari, software-keyboard behaviour or every device's Unicode font coverage. Map geometry and state tests remain separate from visual review.

## Visual captures

The design test produces phone and desktop captures for the map, Players and Attendance, plus dark-mode Attendance. Captures are reproducible test outputs rather than shipped application assets. Review covered hierarchy, long names, touch controls, panel duplication, overflow, contrast, event destination and popup obstruction.

## Approved preview changes · 19 October 2026

Scope: apply Caroline's selected changes, retaining the existing navigation, canvas height, native font, map model, data and public URL.

- Header now reads Bear Hive without the descriptor.
- Primary toolbar: + City, + Item, + Template, icon Undo and icon Redo. Templates reuse the existing preview/apply workflow.
- City surfaces have rounded projected corners, clearer theme-aware names and stronger selection outlines. Exact rectangular model hit bounds and collision geometry are unchanged.
- Single-trap default zoom now favours readable cities. Fit remains explicit.
- Player search is always visible within the one contextual picker, directly below the selection dock. Assignment clears the search so the next tier does not appear empty because of a stale query.
- Attendance search shows matching roster suggestions without simultaneously repeating the whole checklist. Selecting a suggestion restores the checklist; saves still identify the event and use stable player IDs.
- Preserved existing tap/select, selected-item drag, Done, pan/pinch, persistent placement, valid/invalid footprint preview, attendance-tier progression, atomic auto-placement and Undo behaviour.

Current revision verification: npm test and npm run build passed. Browser regression scripts were updated for the rounded visual shape, five-button toolbar, template entry and visible player search. Their execution is pending because the local Chromium download returned invalid archives. Any earlier browser results above describe the previous revision, not this release. Staged cloud-browser verification is recorded below when complete. Physical iPhone Safari remains unverified.

### Release reconciliation · 20 October 2026

The first staged build (08a44b8) reached READY, but cloud-browser tab creation repeatedly failed or timed out before a page could be inspected. No real-browser workflow pass is claimed for this revision.

The final source was reconciled with main at 67c5ae5, preserving subsequent isometric sprites, game-style labels, top-down text-only rendering, water/resource placement and frame-coalesced panning. The remaining approved design changes were merged into that source. The full npm test suite and static build were rerun on the combined result. Browser regression scripts remain available for a functioning Chromium environment; physical iPhone Safari, keyboard behaviour, touch gesture regression and visual captures remain unverified.
