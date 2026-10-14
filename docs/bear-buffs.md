# Bear Trap buffs

Researched against the Century Games official wiki, 13 October 2026.

## Inputs and confirmed descriptions

- Cave Lion: attack up to 10%; Saber-tooth Tiger: lethality up to 10%.
- Frostscale Chameleon: enemy defence down up to 10%; Titan Roc: enemy health down up to 5%.
- City Attack Up and Damage Up: 10% or 20%; Damage Up means **lethality**, not a separate damage multiplier. Same-type city items do not stack.
- City Enemy Defence Down: 10% or 20%.
- City deployment boost: 10% or 20%; Snow Ape adds up to 15,000 troops.
- Defense ministry: lethality 10% / supreme 15%.
- Strategy ministry: attack 5% and 2,500 troops / supreme 8% and 3,750 troops. Migrates the old UI's incorrect 2,000 setting.
- President: attack/lethality 5% / supreme 7.5%. One Sunfire position/effect at a time, including presidents who switch to a minister effect.
- Frostdragon titles can stack with Sunfire titles: Tyrant attack/lethality 10% and 5,000 troops; Vanguard lethality 20% and 2,000 troops; Governor attack 20% and 2,000 troops; Emissary/Guardian add 2,000 troops but their health/defence does not have a damage coefficient here.
- Cyrille Ursa's Bane adds up to 30,000 personal deployment; Entrapment increases the whole alliance rally capacity and must not be used as personal capacity.
- Cyrille Earthbreaker gives 0–30% personal Bear damage bonus. New setups start at zero. Existing setups explicitly retain the previously implicit 30% assumption.

## Model boundaries

These descriptions do not verify an exact Bear combat simulator. The score remains a comparison index, not predicted damage points.

- City attack/lethality are added to the existing widget special-stat pool, following the official combat-stats example.
- Position and missing base-stat attack/lethality add percentage points.
- Pet attack/lethality and Chameleon retain WOS Nerds' equations. Chameleon's source approximation changes attack/lethality coefficients and normalization; it is not an official enemy-defence equation.
- The new city defence-down extension adds to the source's `Defense down` skill pool. This is explicitly a model approximation; no claim of verified real Bear mitigation or exact source parity with added city effects.
- Titan Roc health down is recorded but has **no numerical score term** because its Bear effect could not be established from primary descriptions.
- New UI profiles remove the phantom 10% Chameleon fallback, and use the entered Cyrille value. Legacy profiles without `buffModelVersion` preserve source parity.
- Mixed-tier optimizer and manual rally scoring use the exact same returned normalization.
- Permanent research, gear, charms, VIP, skins, island, facilities and pet stats belong in account readings. The UI assumes all readings are before temporary buffs. Legacy included-stat switches are cleared on migration; all selected buffs are added.
- Deployment is `round((reading + missing Cyrille + missing Ape + missing title capacity) * (1 + missing city deployment % / 100))`. The entered deployment reading must be before the selected temporary buffs.
- Defence/health, defensive debuffs, healing/gathering and march speed are not single-rally damage terms. Speed may affect how many rallies fit in the event; this calculator does not simulate the event schedule.

## Sources

- https://www.whiteoutsurvival.wiki/items/
- https://www.whiteoutsurvival.wiki/combat-stats-special-bonuses/
- https://www.whiteoutsurvival.wiki/pets/cave-lion/
- https://www.whiteoutsurvival.wiki/pets/saber-tooth-tiger/
- https://www.whiteoutsurvival.wiki/pets/frostscale-chameleon/
- https://www.whiteoutsurvival.wiki/pets/titan-roc/
- https://www.whiteoutsurvival.wiki/pets/snow-ape/
- https://www.whiteoutsurvival.wiki/events/sunfire-castle/
- https://www.whiteoutsurvival.wiki/events/frostdragon-tyrant/
- https://www.whiteoutsurvival.wiki/experts/cyrille/
- https://wosnerds.com/bear-calc/ (original comparison model)
