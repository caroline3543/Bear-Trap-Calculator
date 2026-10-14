import { CLASSES, metaFor } from './model.js';
export const JOINERS = ['Seo-yoon', 'Reina', 'Norah', 'Jessie'];
export const normalizeName = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function resolveHero(value, names) {
  return names.find(name => normalizeName(name) === normalizeName(value)) || '';
}
export function starKey(value) {
  const n = Number(value);
  if (value === '' || !Number.isFinite(n) || n < 0 || n > 5 || Math.abs(n * 10 - Math.round(n * 10)) > 1e-6) return null;
  return `${n}*`;
}
export function migrateSetup(old = {}) {
  const stats = CLASSES.map((_, i) => {
    const s = old.stats?.[i] || {};
    return { attack: s.attack ?? 0, lethality: s.lethality ?? 0,
      attackOn: s.attackOn ?? s.gearAttack ?? 0, attackOff: s.attackOff ?? 0,
      lethalityOn: s.lethalityOn ?? s.gearLethality ?? 0, lethalityOff: s.lethalityOff ?? 0 };
  });
  return { allAttack: old.allAttack ?? 0, allLethality: old.allLethality ?? 0,
    chameleon: old.chameleon ?? 0, tiger: old.tiger ?? 0, lion: old.lion ?? 0,
    buffModelVersion: 1,
    cityAttack: old.cityAttack ?? 0, cityLethality: old.cityLethality ?? 0,
    cityDefenseDown: old.cityDefenseDown ?? 0, enemyHealthDown: old.enemyHealthDown ?? 0,
    extraAttack: old.extraAttack ?? 0, extraLethality: old.extraLethality ?? 0,
    // Existing setups historically assumed max Cyrille. Make that visible;
    // new accounts start without a talent bonus.
    cyrilleDamage: old.cyrilleDamage ?? (Object.keys(old).length ? 30 : 0),
    petStatsIncluded: false, cityStatsIncluded: false,
    titlesStatsIncluded: false,
    stats, starters: CLASSES.map((_, i) => old.starters?.[i] || ''),
    heroInfo: CLASSES.map((_, i) => {
      const h = old.heroInfo?.[i] || old.roster?.[old.starters?.[i]] || {};
      return { stars: h.stars === '' ? '' : Number.parseFloat(h.stars ?? 5), widget: h.widget ?? 0, skill: h.skill ?? 5 };
    }),
    tierInputs: CLASSES.map((_, i) => old.tierInputs?.[i] || (() => {
      const match = /FC(\d+) T(\d+)/.exec(old.tiers?.[i] || 'FC6 T10');
      return { fc: Number(match?.[1] ?? 6), level: Number(match?.[2] ?? 10) };
    })()),
    alternatives: CLASSES.map((_, i) => {
      const a = old.alternatives?.[i] || {};
      return { name: a.name ?? '', info: { stars: a.info?.stars ?? '', widget: a.info?.widget ?? '', skill: a.info?.skill ?? '' },
        gear: Object.fromEntries(['attackOn', 'attackOff', 'lethalityOn', 'lethalityOff'].map(k => [k, a.gear?.[k] ?? ''])) };
    }),
    joiners: ['Jessie', 'Jessie', 'Seo-yoon', 'Seo-yoon'],
  };
}
export function heroNamesForClass(db, i) {
  return db.heroesList.filter(h => metaFor(h, db).class === CLASSES[i]);
}
