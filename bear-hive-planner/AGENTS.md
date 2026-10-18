# Bear Hive planner

Read DESIGN.md before changing this app's interface. DESIGN_REVIEW.md records the last review scope and verification limits.

- Keep the native system font, green identity and approved map gestures.
- Shared map, player and attendance components belong in dist/design-system.css. The legacy style.css owns the remaining shell and specialist forms. Do not append competing map styles there.
- Keep one contextual player picker inside the map panel. Do not add sidebar, strip or inline copies.
- Preserve exact roster names/IDs. Wrapping and truncation are display-only operations.
- Respect model footprints, locks, immutable terrain, separate map drafts and Undo boundaries.
- Keep roster management separate from event attendance. Partial attendance never implies absence.
- Run npm test and npm run build for app changes. For interface changes, use the relevant real-browser flows in test/ and inspect phone and desktop captures. HIVE_PLAYWRIGHT_PATH can point to an existing Playwright installation.
- Distinguish browser emulation from physical iPhone Safari verification. Report unverified workflows honestly.
