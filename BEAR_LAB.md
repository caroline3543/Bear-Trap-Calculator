# Rally leader recommendation helper

## Refined implementation brief

Embed a compact, optional recommendation form inside the existing Rally leader squad card (step 2), immediately above its percentage/amount controls. Match the app’s journal palette, Fredoka headings, Nunito Sans inputs and existing capacity controls. The launcher says “Calculate recommended rally leader squad” and expands a saved setup form.

Use class-specific hero-name autocomplete with keyboard navigation, one-decimal stars capped at 5, whole widget levels 0–10 and skill levels 1–5. Show FC beside a numeric entry and a separate typed troop level for every troop class. Validate supported source-data star steps and troop tiers; never silently calculate an unknown hero or coefficient.

Keep the main form focused on the three leaders. Put gear-on/off comparisons, four contributing joiner names, active pet percentages and extra class bonuses in optional disclosures. Gear bonus is equipped minus unequipped; incomplete or reversed readings block calculation. Restrict the four contributing joiners to Seo-yoon, Reina, Norah and Jessie, with level-5 skills. Assume pets active and trap attack bonus fixed at 25%.

Calculate only on explicit submission. Apply recommended percentages rounded to two decimals (conserving 100%) and whole troop amounts to the existing composition controls, collapse the form, return focus to its launcher and show confirmation. Preserve capacity/buffs and inventory allocation. If capacity changes after application, show a recalculate hint instead of silently overwriting manual edits.

Remove the standalone planner shell, tabs, joining planner, damage-target scenarios, reports/calibration, available roster and hero-combination search interface. Remove the unused optimizer worker. Existing joiner squad allocation elsewhere in the original calculator remains intact.

## Data and calculation

The public WOS Nerds coefficient tables are a snapshot from 11 October 2026, covering the imported hero and troop-tier data. The recommendation uses the independently implemented class-damage coefficients D and proportions D² / sum(D²). Whole counts use largest fractional remainders to conserve the existing effective capacity exactly. The UI retains a compact source attribution; it does not expose damage predictions or comparison-score panels.

Supported star substeps in the source tables are .0 through .5 for stars 0–4, then 5.0. The form accepts one decimal place and rejects missing coefficients. FC values are 0–10, with 0 meaning no Fire Crystal; troop levels are 1–11. All field bounds reflect the imported tables.

Effective capacity and minister bonuses come from existing Rally leader controls; Snow ape and other capacity bonuses are not reapplied. Base attack/lethality must exclude the selected heroes, gear and pet bonuses to avoid double counting. Gear comparisons assume everything except gear stays constant. Active pet bonuses remain user-entered percentages; activation alone does not establish their values.

## Saved setups

The focused form saves per-account setup only under `bearLeader:v2:<account>`. Prior `bearLab:v1:<account>` setup migrates heroes, star/widget/skill levels, tiers, stats, gear differences and pet values. Old gear differences become on=old difference/off=0. After successful migration, the old report/target storage entry is removed. Calibration, target, outgoing assignments and unlocked-roster state are no longer part of the new saved schema.

## Verification

- 222 model, entry, migration and existing TimeHub tests pass.
- DOM simulation verifies the single embedded step-2 placement, expand/collapse, keyboard hero suggestions, decimal percentages, numeric bounds, FC/troop level, gear pairs, explicit application of percentages/counts, focus, capacity changes, storage migration and account isolation.
- Vite production build passes with temporary Linux dependencies; no package dependencies changed. The unused optimizer worker no longer appears in the build.
- Visual browser QA was unavailable. The existing large-main-chunk warning remains.

## Changed-files package

The zip contains only files changed in this update, using repository-relative paths. Excludes node_modules and dist. Delete `src/bear/optimizer.worker.js` if installing the zip manually; GitHub publication records that deletion directly.
