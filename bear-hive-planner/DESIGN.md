# Bear Hive design system

## Product and design direction

Bear Hive is an officer's mobile planning tool for Whiteout Survival. The map and the next useful action get the space. Use Apple's visual restraint and Linear's consistent component rhythm as references, adapted to a working map rather than a marketing page. Keep the native system font and the established green identity.

Sources consulted:
- https://github.com/VoltAgent/awesome-design-md
- https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/apple/DESIGN.md
- https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md
- https://github.com/Leonxlnx/tastecode/blob/main/docs/DESIGN-AGENT.md

These are reference analyses and a development workflow, not official Apple interaction rules. The user's approved game screenshots and interaction decisions take precedence. TasteCode informs the brief/build/preview/review/repair process; its desktop runtime is not a dependency of this web app.

## Locked decisions

- Preserve the native system font, green identity and light/dark themes.
- Prioritise iPhone portrait, landscape, browser safe areas and clear 44px touch targets.
- Tap an editable item to select it. Drag the selected item to move it. Done deselects.
- Pan with one finger from empty space or an unselected item; pinch zooms.
- Save each completed valid move as one Undo action. Done is not another save.
- Keep controls outside the map canvas. Hide them without resizing the map during a gesture.
- Preserve the camera when assigning or finishing an edit. Fit is an explicit action.
- Keep fixed terrain immutable, locks respected and invalid/cancelled drops reversible.
- Reset, templates, roster changes and attendance are separate operations with existing scopes.
- Roster imports never create attendance. Partial lists never imply absence.

## Tokens

Authoritative component tokens live in `dist/design-system.css`. The older `style.css` owns only the remaining page shell and specialist forms. Do not append competing map component rules there.

| Role | Light | Dark |
|---|---|---|
| Canvas | `#f6f7f2` | `#18231e` |
| Surface | `#ffffff` | `#202e26` |
| Text | `#273c32` | `#edf1e9` |
| Secondary text | `#5c6d62` | `#b3c0b6` |
| Action | `#305b46` | `#91b89c` |
| Soft surface | `#eaf0e6` | `#2c3d30` |
| Destructive action | `#9b4030` | `#efb39f` |

Use a 4px spacing rhythm: 4, 8, 12, 16, 24 and 32px. Controls have a 10px radius; panels use 16px. Keep surface elevation restrained. Use a visible focus outline and normal text labels with icons. Do not communicate a state through colour alone.

Use 15px body text, 16px player names, 13px metadata and 12px compact map metadata. Inputs use at least 16px on phones. Preserve exact Unicode roster names and player IDs. Map labels may wrap to two measured lines, with ellipsis only when necessary. The selected-item dock always exposes the complete name.

## Components

### Map

Keep BT1, BT2 and Both traps together. Keep City, Item, Undo and Redo in a stable toolbar. Put secondary tools in Map options. Use a large phone canvas and an explicit Expand/Exit view. Do not introduce hero sections, promotional statistics or decorative imagery into the planner.

Show valid/invalid footprint feedback at the actual grid position. A touch magnifier may sit beside the finger, but must not offset the committed footprint. City names must fit inside their tiles in top-down and isometric views. Locked cities have a visible lock marker.

### Player panel

There is one persistent player picker, inside the map panel, in both normal and expanded views. It becomes Who goes here? for an empty city. It shows only the highest remaining attendance category for that trap: Frequently, Sometimes, Rarely, Unknown. Allocated players are excluded.

Tapping a name assigns to the selected city or the next valid empty city. Full list opens a searchable view of the same category. Keep roster-list management in the secondary BT lists disclosure. Keep roster importing on Players. Do not reintroduce separate sidebar, strip and selected-city copies of the same player list.

### Selected-item dock

Use one hierarchy: full item name and coordinates, Done, then secondary details/coordinate actions and a distinct Remove action. Locked cities offer Unlock. Bear traps expose their existing details and coordinate workflow. Removing a city keeps its player and attendance history.

### Players and Attendance

Use the same row spacing, name hierarchy, control radius and status treatment. Players clearly indicate Placed/Not placed, BT group and frequency. Attendance keeps trap/date/time, saved count and Partial/Complete status clear. Autocomplete searches the roster and commits stable IDs after choosing a match. The save action names its destination. Never treat missing events as absence.

## Review workflow

1. Write the scope and the decisions being preserved.
2. Build in this app and reuse its state/model boundaries.
3. Run meaningful model and actual browser workflows.
4. Capture realistic phone, landscape and desktop states in light/dark themes.
5. Inspect hierarchy, names, targets, clipping, duplicate controls and gesture obstruction.
6. Repair concrete findings and re-test the affected flows.
7. Release only the reviewed files; verify the public deployment matches them.

A screenshot is evidence of appearance, not proof of drag, persistence or Undo. Browser emulation is not physical iPhone Safari verification. Report these separately.
