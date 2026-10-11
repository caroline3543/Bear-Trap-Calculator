# Rally leader recommendation helper

## Refined implementation brief

Embed a compact, optional recommendation form inside the existing Rally leader squad card (step 2), immediately above its percentage/amount controls. Match the app’s journal palette, Fredoka headings, Nunito Sans inputs and existing capacity controls. The launcher says “Calculate recommended rally leader squad” and expands a saved setup form.

Use class-specific hero-name autocomplete with keyboard navigation, one-decimal stars capped at 5, whole widget levels 0–10 and skill levels 1–5. Show FC beside a numeric entry and a separate typed troop level for every troop class. Validate supported source-data star steps and troop tiers; never silently calculate an unknown hero or coefficient.

Keep the main form focused on the three leaders. Place class bonuses directly under the all-troops fields. Put gear-on/off comparisons, active pet percentages and extra class bonuses in optional disclosures. Gear bonus is equipped minus unequipped; incomplete or reversed readings block calculation. Hide joiner entry and always use two Jessie and two Seo-yoon with level-5 skills. Assume pets active and trap attack bonus fixed at 25%.

Calculate only on explicit submission. Apply full-precision recommended percentages and whole troop amounts to the existing composition controls. Format percentages to two decimals without discarding internal precision. Keep the form open; show the ideal squad in the calculation area and focus it with preventScroll so the page does not jump. Briefly highlight updated ideal and lower squad numbers, respecting reduced-motion preferences. Preserve capacity/buffs and inventory allocation. If capacity changes after application, show a recalculate hint instead of silently overwriting manual edits.

Remove the standalone planner shell, tabs, joining planner, damage-target scenarios, reports/calibration, available roster and hero-combination search interface. Remove the unused optimizer worker. Existing joiner squad allocation elsewhere in the original calculator remains intact.

## Data and calculation

The public WOS Nerds coefficient tables are a snapshot from 11 October 2026, covering the imported hero and troop-tier data. The recommendation uses the independently implemented class-damage coefficients D and proportions D² / sum(D²). Whole counts use largest fractional remainders to conserve the existing effective capacity exactly. The result shows WOS Nerds normalized optimal boost (matching its zero-Chameleon display fallback), source fractional ideal counts and sendable whole counts. No undocumented conversion to game damage is introduced.

Supported star substeps in the source tables are .0 through .5 for stars 0–4, then 5.0. The form accepts one decimal place and rejects missing coefficients. FC values are 0–10, with 0 meaning no Fire Crystal; troop levels are 1–11. All field bounds reflect the imported tables.

Effective capacity and minister bonuses come from existing Rally leader controls; Snow ape and other capacity bonuses are not reapplied. Base attack/lethality must exclude the selected heroes, gear and pet bonuses to avoid double counting. Gear comparisons assume everything except gear stays constant. Active pet bonuses remain user-entered percentages; activation alone does not establish their values.

## Saved setups

The focused form saves per-account setup only under `bearLeader:v2:<account>`. Prior `bearLab:v1:<account>` setup migrates heroes, star/widget/skill levels, tiers, stats, gear differences and pet values. Old gear differences become on=old difference/off=0. After successful migration, the old report/target storage entry is removed. Calibration, target, outgoing assignments and unlocked-roster state are no longer part of the new saved schema.

## Verification

- 294 model, entry, migration, source-parity and existing TimeHub tests pass.
- Current live source equations independently executed for 72 configurations: ratios match at two decimals, fractional ideal counts at one decimal, normalized boost at four decimals. Maximum raw-score floating-point difference 9.313225746154785e-10; ratio difference 3.33e-16. All six downloaded live tables match repository tables. Fixtures are retained for regression checks. Explicit caller skill levels match source results when set to the source’s star-inferred level; this app intentionally supports other actual skill levels. Whole counts conserve capacity and may differ by one troop from source independent rounding.
- DOM simulation verifies the single embedded step-2 placement, expand, no-collapse result placement, four screenshot references, fixed joiners, update animation, keyboard hero suggestions, decimal percentages, numeric bounds, FC/troop level, gear pairs, explicit application of percentages/counts, focus, capacity changes, storage migration and account isolation.
- Vite production build passes with temporary Linux dependencies; no package dependencies changed. The screenshots are lazy-loaded WebP assets. The unused optimizer worker no longer appears in the build.
- Visual browser QA was unavailable. The existing large-main-chunk warning remains.

## Changed-files package

The zip contains only files changed in this update, using repository-relative paths. Excludes node_modules and dist. Keep repository-relative paths when installing.

## Screenshot-guided stat entry

The retained hero screenshot shows the lower-right Stats menu and highlighted Expedition attack/lethality. Read equipped and unequipped stats on the same selected hero and apply only their difference. The reference is a navigation example, not prefilled player data. Rally screenshots were removed: base bonuses now come from Power → Bonus Overview. See the corrected stat-source guidance below.

## Shared tracked accounts

The BT account switcher and screenshot scan destinations use the Time Hub tracked account list (one to six accounts), including names and order. Adding, renaming, or deleting an account updates the calculator immediately. If its selected account is removed, the calculator switches to the primary account and loads that account’s own setup. Troop pools, leader squads, and recommendation inputs remain scoped by stable account ID. The previous fixed Farm button and separate calculator rename prompt have been removed; account management stays in Settings. Existing calculator data remains stored under its original ID.

Account integration check: `BT_TEST_DEPS=/path/to/test-deps NODE_PATH=/path/to/test-deps/node_modules node scripts/check-bt-accounts.cjs` (requires React, esbuild, jsdom). Covers 1/3/6 accounts, immediate rename/reorder/delete updates, stale saved selections, and isolated capacity/rally snapshots.

## Corrected stat sources and readability

Use Power → Bonus Overview for the separate account-wide and class-specific base bonuses. Do not paste hero-inclusive rally preview values into base fields: heroes, widgets and gear are added by the model. Read base values before activating temporary pet skills, which are entered separately. Keep deployment preview guidance in its own section for capacity only, with a warning about buffs already included and the distinction from total rally capacity. Removed the three rally preview screenshots to avoid implying their troop-stat readings are valid base inputs; retained the correctly labelled hero gear reference. Simplified input instructions and results copy; the formula reference explains rounding rather than cluttering the recommendation card.
