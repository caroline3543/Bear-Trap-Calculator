# Bear Lab integration

Bear Lab is integrated inside the existing BT Calculator tab, above the troop allocator. It loads lazily on first opening that tab, and uses the existing theme. The new panel currently uses English; the existing translated allocator remains available below it.

## Modes

- **Lead a rally:** set base stats, heroes, widgets and tiers. Enter each class’s attack/lethality with gear on and off; the app adds only the difference. Pets are always active. Four level-5 contributing joiner slots offer only Seo-yoon, Reina, Norah and Jessie. Valid recommendations automatically default whole counts into the existing leader allocator. Search unlocked starters and the four supported joiner heroes in a cancelable worker.
- **Join rallies:** use the receiving leader's setup for recommended ratios, apply the split to all outgoing marches, and choose unique first-slot heroes from the account's unlocked level-5 roster. Existing inventory allocation uses strongest troops first and shows shortages. The suggestion ranks individual first-slot skill contributions; it does not optimize the entire alliance or guarantee which skills enter a particular rally.
- **Reach my target:** calibrate with one comparable, single-march battle report. Save an immutable setup snapshot and actual damage. Explore stat sliders, individual hero upgrades, and alternative attack/lethality paths. Whole-event estimates multiply a comparable march estimate by the entered number of successful attacks.

Both existing calculator accounts have separate saved Bear Lab profiles, assignments and calibration snapshots under `bearLab:v1:<account>`.

## Mathematics and limits

The coefficient tables are a snapshot of the public WOS Nerds Bear Calculator at https://wosnerds.com/bear-calc/ on 11 October 2026. They cover 62 hero-list entries and 121 troop tiers. Attribution remains in the UI. Original table redistribution licensing was not established.

The independently implemented source model calculates theoretical class damage D, assigns ratios D² / sum(D²), and gives a normalized comparison boost. It does not output actual game points. Zero Chameleon is respected, rather than the source display's fallback to 10%. Counts use largest fractional remainders to conserve capacity exactly. Explicit common expedition skill levels override star-inferred levels.

Estimated damage = saved report damage × scenario boost / saved report boost. This is an approximate proportional calibration, not a validated official game formula. Calibration is best with the recommended troop split and a consistent single tier per class. Different rally conditions, mixed tiers, different contributing skills, attack cadence and attendance can invalidate it. One report cannot establish uncertainty or forecast accuracy.

Inverse paths use bounded binary search for an additional 0–3000 percentage points of all-troops attack or lethality. They show independent alternatives, not resource-cost advice. Hero upgrade comparisons simulate widgets, 5-star bonuses and common expedition skill levels. No resource-cost database is assumed. Effective capacity and minister bonuses come from the existing allocator controls; capacity is never added twice.

The source hero-combination search is unconstrained by inventory. Applying its result updates the existing allocator, which limits actual counts to the troop pool. The search is limited to 250,000 combinations and can be narrowed through the unlocked starter roster. All searches use four contributing slots and the four supported joiner heroes.

## UX implementation brief

Match the existing journal palette, Fredoka headings and calculator inputs. Use large touch targets and decimal keypads, select text on focus, permit blank edits, accept pasted commas/percent signs, and format on blur. Show paired gear readings with a calculated percentage-point bonus, and block recommendations for incomplete or reversed pairs. Preserve old saved gear differences as on=old difference/off=0 so existing setups retain their bonuses.

The existing Rally leader squad is the single place for capacity, Cyrille/Snow ape/minister capacity buffs, troop counts, inventory and shortages. Automatically update its composition when a valid leader recommendation changes; preserve its capacity and buffs. Leave a manually edited lower composition in place until the recommendation changes. Joining and target exploration do not overwrite the leader composition until returning to Lead a rally. Unsupported saved joiner choices migrate to the four supported heroes. Remove Rosarion mode from the interface and model.

Target calibration retains immutable report snapshots. Restoring a report restores stats/heroes while keeping the existing capacity and minister controls; the UI says to match those separately.

## Validation

- 219 model/number-entry/TimeHub tests pass.
- DOM simulation covers automatic lower counts, effective-capacity changes without update loops, the fixed four joiner options, comma/decimal/% entry, clearing and reversed gear pairs, active pets and persistence.
- Vite production build passes using temporary Linux dependencies; no repository dependencies were changed.
- Visual browser QA was unavailable. The existing large-main-chunk warning remains.

## Changed-files package

The UX update zip contains only changed source files and this document, with repository-relative paths. It excludes node_modules and dist. The changes are published through the repository’s existing GitHub-to-Vercel integration.
