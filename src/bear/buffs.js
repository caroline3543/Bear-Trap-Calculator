// Values from Century Games' official wiki. These describe bonuses, not a
// verified Bear Hunt combat simulator. Keep source-model assumptions separate.
export const POSITIONS = {
  None: { attack: 0, lethality: 0, troops: 0 },
  'Defense (normal)': { attack: 0, lethality: .10, troops: 0 },
  'Defense (supreme)': { attack: 0, lethality: .15, troops: 0 },
  'Strategy (normal)': { attack: .05, lethality: 0, troops: 2500 },
  'Strategy (supreme)': { attack: .08, lethality: 0, troops: 3750 },
  'President (normal)': { attack: .05, lethality: .05, troops: 0 },
  'President (supreme)': { attack: .075, lethality: .075, troops: 0 },
};
export const FROSTDRAGON_TITLES = {
  None: { attack: 0, lethality: 0, troops: 0 },
  'Frostdragon Tyrant': { attack: .10, lethality: .10, troops: 5000 },
  'Firebreather Vanguard': { attack: 0, lethality: .20, troops: 2000 },
  'Dragontooth Governor': { attack: .20, lethality: 0, troops: 2000 },
  'Bloodwyrm Emissary': { attack: 0, lethality: 0, troops: 2000 },
  'Scaled Guardian': { attack: 0, lethality: 0, troops: 2000 },
};
export function migrateCapacityBuffs(saved = {}) {
  saved = saved || {};
  return { position: saved.capacityBuffs?.position ?? (saved.ministerBoost === 3750 ? 'Strategy (supreme)' : saved.ministerBoost ? 'Strategy (normal)' : 'None'),
    frostdragon: saved.capacityBuffs?.frostdragon ?? 'None', deploy: saved.capacityBuffs?.deploy ?? 0,
    titlesCapacityIncluded: false };
}
export function effectiveCapacity(base, cyrille, ape, buffs) {
  const flat = buffs.titlesCapacityIncluded ? 0 : (POSITIONS[buffs.position]?.troops ?? 0) + (FROSTDRAGON_TITLES[buffs.frostdragon]?.troops ?? 0);
  if ([base, cyrille, ape, buffs.deploy].some(v => v === '' || v == null || !Number.isFinite(Number(v)) || Number(v) < 0)) return NaN;
  if (![base, cyrille, ape].every(v => Number.isSafeInteger(Number(v))) || Number(cyrille) > 30000 || Number(ape) > 15000 || Number(buffs.deploy) > 20 || !POSITIONS[buffs.position] || !FROSTDRAGON_TITLES[buffs.frostdragon]) return NaN;
  return Math.round((Number(base) + Number(cyrille) + Number(ape) + flat) * (1 + Number(buffs.deploy) / 100));
}
export const BUFF_LIMITS = { chameleon: 10, tiger: 10, lion: 10, cityAttack: 20, cityLethality: 20, cityDefenseDown: 20, enemyHealthDown: 5, cyrilleDamage: 30, extraAttack: 10000, extraLethality: 10000 };
export const BUFF_SOURCES = [
  ['City items', 'https://www.whiteoutsurvival.wiki/items/'],
  ['Combat bonuses & stacking', 'https://www.whiteoutsurvival.wiki/combat-stats-special-bonuses/'],
  ['Pets', 'https://www.whiteoutsurvival.wiki/pets/'],
  ['Minister positions', 'https://www.whiteoutsurvival.wiki/events/sunfire-castle/'],
  ['Frostdragon titles', 'https://www.whiteoutsurvival.wiki/events/frostdragon-tyrant/'],
  ['Cyrille', 'https://www.whiteoutsurvival.wiki/experts/cyrille/'],
];
