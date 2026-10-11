# Bear Lab integration

Bear Lab is integrated inside the existing BT Calculator tab, above the troop allocator. It loads lazily on first opening that tab, and uses the existing theme. The new panel currently uses English; the existing translated allocator remains available below it.

## Modes

- **Lead a rally:** set base stats, class and gear differences, actual common expedition skill level, heroes, widgets, tiers, pets and buffs. Choose four contributing joiner skills. Get whole troop counts and apply them to the existing leader allocator. Search unlocked hero combinations in a cancelable worker.
- **Join rallies:** use the receiving leader's setup for recommended ratios, apply the split to all outgoing marches, and choose unique first-slot heroes from the account's unlocked level-5 roster. Existing inventory allocation uses strongest troops first and shows shortages. The suggestion ranks individual first-slot skill contributions; it does not optimize the entire alliance or guarantee which skills enter a particular rally.
- **Reach my target:** calibrate with one comparable, single-march battle report. Save an immutable setup snapshot and actual damage. Explore stat and capacity sliders, individual hero upgrades, and alternative attack/lethality paths. Whole-event estimates multiply a comparable march estimate by the entered number of successful attacks.

Both existing calculator accounts have separate saved Bear Lab profiles, assignments and calibration snapshots under `bearLab:v1:<account>`.

## Mathematics and limits

The coefficient tables are a snapshot of the public WOS Nerds Bear Calculator at https://wosnerds.com/bear-calc/ on 11 October 2026. They cover 62 hero-list entries and 121 troop tiers. Attribution remains in the UI. Original table redistribution licensing was not established.

The independently implemented source model calculates theoretical class damage D, assigns ratios D² / sum(D²), and gives a normalized comparison boost. It does not output actual game points. Zero Chameleon is respected, rather than the source display's fallback to 10%. Counts use largest fractional remainders to conserve capacity exactly. Explicit common expedition skill levels override star-inferred levels.

Estimated damage = saved report damage × scenario boost / saved report boost. This is an approximate proportional calibration, not a validated official game formula. Calibration is best with the recommended troop split and a consistent single tier per class. Different rally conditions, mixed tiers, different contributing skills, attack cadence and attendance can invalidate it. One report cannot establish uncertainty or forecast accuracy.

Inverse paths use bounded binary search for an additional 0–3000 percentage points of all-troops attack or lethality. They show independent alternatives, not resource-cost advice. Hero upgrade comparisons simulate widgets, 5-star bonuses and common expedition skill levels. No resource-cost database is assumed. Capacity sliders are scenarios and do not validate a player's actual unlock limits.

The source hero-combination search is unconstrained by inventory. Applying its result updates the existing allocator, which limits actual counts to the troop pool. The search is limited to 250,000 combinations and can be narrowed through the unlocked roster and joiner pool.

## Validation

- `node --test src/bear/model.test.js src/timehub/__tests__/*.test.js`: 216 tests pass, including nine new model tests.
- 20 configurations compared with extracted source equations: largest absolute raw-score discrepancy 4.66e-10 (floating point).
- DOM simulation: leader apply, joiner apply, unique hero suggestions, report calibration, target inverse route, report setup restoration, account isolation and optimizer worker passed.
- Vite production build passes. The checkout contains committed platform-specific node_modules; a clean temporary install was used to avoid altering those files. No package dependencies were added.
- Visual browser QA was unavailable. Existing main chunk-size warning remains; the new Bear Lab and its data are in a separate lazy chunk. No live GitHub or Vercel publication was performed.

## Install changed files

Copy the zip's files into the existing repository, keeping paths exactly as shown. It contains src/App.jsx, src/bear/ (component, styles, model, worker and tables), and this document. It does not contain node_modules or dist. Commit the changes; the project's existing GitHub-to-Vercel deployment should rebuild them.

The parent integration resets accepted manual fills when applying a leader split, and resets joiner fills when applying a joiner split. Applying the leader uses the calculated effective capacity as the allocator's capacity and clears its separate capacity buffs to avoid double counting.
