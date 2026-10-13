// Independent implementation of the publicly visible WOS Nerds equations.
// These are comparison-model coefficients, not an official game simulator.
export const CLASSES = ['Infantry', 'Lancer', 'Marksman'];
export const PREFIXES = ['Inf', 'Lan', 'Mar'];
export const CATEGORIES = ['Lethality (adds)', 'Attack (adds)', 'Damage taken up', 'Defense down', 'DamageUp (adds)', 'Damage (multiplies)', 'NormalDamage (Reina S1)', 'SkillDamage (adds Reina S1; x Wu Ming S3)', 'SkillDamage (Wu Ming S3)'];
import { POSITIONS, FROSTDRAGON_TITLES } from './buffs.js';
export const MINISTERS = POSITIONS;
export const nonnegative = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
export function findName(name, table, kind = 'meta') {
  const aliases = { seoyoon: kind === 'meta' ? 'Seo-Yoon' : 'Seo-yoon', 'seo-yoon': kind === 'meta' ? 'Seo-Yoon' : 'Seo-yoon', ling: kind === 'meta' ? 'Ling' : 'Ling Xue', 'ling xue': kind === 'meta' ? 'Ling' : 'Ling Xue', 'wallis bokan': kind === 'meta' ? 'Wallis Bokan' : 'Lumak Bokan', 'lumak bokan': kind === 'meta' ? 'Wallis Bokan' : 'Lumak Bokan' };
  const key = String(name || '').trim().toLowerCase();
  return aliases[key] || Object.keys(table).find(n => n.toLowerCase() === key) || name;
}
export const metaFor = (name, db) => db.heroMetadata[findName(name, db.heroMetadata)] || {};
export const skillsFor = (name, db) => db.heroSkills[findName(name, db.heroSkills, 'skill')] || {};
export function widgetStep(level) {
  return level < 2 ? 0 : level < 4 ? .05 : level < 6 ? .075 : level < 8 ? .1 : level < 10 ? .125 : .15;
}
export function integerCounts(ratios, capacity) {
  const n = Math.floor(nonnegative(capacity));
  const sum = ratios.reduce((s, r) => s + nonnegative(r), 0);
  const real = ratios.map(r => n * (sum ? nonnegative(r) / sum : 1 / ratios.length));
  const counts = real.map(Math.floor);
  const order = real.map((v, i) => ({ i, fraction: v - counts[i] })).sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  const rest = n - counts.reduce((a, b) => a + b, 0);
  for (let i = 0; i < rest; i++) counts[order[i % order.length].i]++;
  return counts;
}
export function calculate(profile, db) {
  const selectedMinister = MINISTERS[profile.minister] || MINISTERS.None;
  const selectedTitle = FROSTDRAGON_TITLES[profile.frostdragon] || FROSTDRAGON_TITLES.None;
  const minister = profile.titlesStatsIncluded ? MINISTERS.None : selectedMinister;
  const title = profile.titlesStatsIncluded ? FROSTDRAGON_TITLES.None : selectedTitle;
  const pets = profile.petsActive;
  const capacity = profile.capacityIsEffective ? Math.round(nonnegative(profile.capacity)) : Math.round((nonnegative(profile.capacity) + (pets ? nonnegative(profile.ape) : 0) + (profile.titlesCapacityIncluded ? 0 : selectedMinister.troops + selectedTitle.troops)) * (1 + nonnegative(profile.deploy) / 100));
  const starters = profile.starters || ['', '', ''];
  const roster = profile.roster || {};
  // City gem buffs share the additive special-stat pool with rally widgets.
  let widgetL = profile.cityStatsIncluded ? 0 : nonnegative(profile.cityLethality) / 100;
  let widgetA = profile.cityStatsIncluded ? 0 : nonnegative(profile.cityAttack) / 100;
  const caller = CLASSES.map(() => CATEGORIES.map(() => 0));
  const seen = new Set();
  for (const hero of starters) {
    if (!hero) continue;
    const info = roster[hero] || {};
    const meta = metaFor(hero, db);
    const skills = skillsFor(hero, db);
    const level = Math.min(5, Math.max(1, Number(info.skill) || Math.floor(Number.parseFloat(info.stars) || 0) + 1));
    for (let c = 0; c < 3; c++) for (let s = 0; s < CATEGORIES.length; s++) caller[c][s] += Number(skills.caller?.[String(level)]?.[PREFIXES[c] + CATEGORIES[s]]) || 0;
    if (skills.stacks !== 1) seen.add(findName(hero, db.heroSkills, 'skill'));
    {
      widgetL += (meta.rally_widget_lethality || 0) * widgetStep(nonnegative(info.widget));
      widgetA += (meta.rally_widget_attack || 0) * widgetStep(nonnegative(info.widget));
    }
  }
  for (const hero of profile.joiners || []) {
    if (!hero) continue;
    const skills = skillsFor(hero, db);
    const identity = findName(hero, db.heroSkills, 'skill');
    if (skills.stacks !== 1) { if (seen.has(identity)) continue; seen.add(identity); }
    for (let c = 0; c < 3; c++) for (let s = 0; s < CATEGORIES.length; s++) caller[c][s] += Number(skills.joiner?.['S1_' + PREFIXES[c] + CATEGORIES[s]]) || 0;
  }
  const damage = CLASSES.map((name, c) => {
    const hero = starters[c], info = roster[hero] || {};
    const meta = metaFor(hero, db);
    const stars = db.starLevelStats[findName(hero, db.heroMetadata)] || {};
    const starKey = String(info.stars || '0*').replace(/\*?$/, '*');
    let l = (nonnegative(profile.allLethality) + nonnegative(profile.stats?.[c]?.lethality) + nonnegative(profile.stats?.[c]?.gearLethality)) / 100 + minister.lethality + title.lethality + nonnegative(profile.extraLethality) / 100;
    let a = (nonnegative(profile.allAttack) + nonnegative(profile.trap) + nonnegative(profile.stats?.[c]?.attack) + nonnegative(profile.stats?.[c]?.gearAttack)) / 100 + minister.attack + title.attack + nonnegative(profile.extraAttack) / 100;
    if (hero) { l += nonnegative(info.widget) * (db.widgetMultipliers[String(meta.gen || 1)] || 0); a += (stars[starKey] || 0) / 100; }
    if (pets) { l = l * (1 + nonnegative(profile.chameleon) / 100) + (profile.petStatsIncluded ? 0 : nonnegative(profile.tiger)) / 100; a = a * (1 + nonnegative(profile.chameleon) / 100) + (profile.petStatsIncluded ? 0 : nonnegative(profile.lion)) / 100; }
    const b = caller[c].map(v => 1 + v);
    // Extension: apply the city debuff in the source's Defense down pool.
    // This is a comparison-model approximation, not verified Bear mitigation.
    b[3] += nonnegative(profile.cityDefenseDown) / 100;
    const tier = db.troopDamageStats[profile.tiers?.[c]];
    if (!tier) throw new Error('Choose a valid troop tier for every class.');
    const factor = b[6] + (b[7] + (c === 2 ? tier.MarFcSkill || 0 : 0) - 1) * b[8];
    return (1 + l) * (1 + a) * b.slice(0, 6).reduce((x, y) => x * y, 1) * factor * tier[PREFIXES[c] + 'Damage'];
  });
  const sum = damage.reduce((s, d) => s + d * d, 0);
  const ratios = damage.map(d => sum > 0 ? d * d / sum : 1 / 3);
  const raw = Math.sqrt(sum * capacity) * (1 + widgetL) * (1 + widgetA);
  const cyrille = profile.cyrilleDamage == null ? 1.3 : 1 + nonnegative(profile.cyrilleDamage) / 100;
  const normalization = (pets ? 1 + nonnegative(profile.chameleon) / 100 : 1) * cyrille / 23400;
  // Retain the historical zero-Chameleon fallback only for legacy parity calls.
  const sourceNormalization = (pets ? 1 + (nonnegative(profile.chameleon) || (profile.buffModelVersion ? 0 : 10)) / 100 : 1) * cyrille / 23400;
  const sourceBoost = raw * sourceNormalization;
  return { sourceBoost, raw, boost: raw * normalization, capacity, ratios, counts: integerCounts(ratios, capacity), damage, widgetL, widgetA, normalization, sourceNormalization };

}
// Extension inferred from the source's squared-ratio optimum, not extracted game logic.
// sum(D_c sqrt(n_c)) gives exactly sqrt(sum(D_c²) N) at the optimal ratio.
export function scoreCounts(result, counts) {
  return result.damage.reduce((s, d, i) => s + d * Math.sqrt(nonnegative(counts[i])), 0) * (1 + result.widgetL) * (1 + result.widgetA) * result.normalization;
}
export function estimatedDamage(boost, baseline, attacks = 1) {
  if (!(baseline?.boost > 0 && baseline?.damage > 0)) return null;
  return baseline.damage * boost / baseline.boost * nonnegative(attacks);
}
export function statPath(profile, db, field, requiredBoost, maxIncrease = 3000) {
  const current = calculate(profile, db).boost;
  if (current >= requiredBoost) return { increase: 0, value: nonnegative(profile[field]), boost: current };
  const base = nonnegative(profile[field]);
  if (calculate({ ...profile, [field]: base + maxIncrease }, db).boost < requiredBoost) return null;
  let low = 0, high = maxIncrease;
  for (let i = 0; i < 45; i++) { const mid = (low + high) / 2; if (calculate({ ...profile, [field]: base + mid }, db).boost >= requiredBoost) high = mid; else low = mid; }
  const increase = Math.ceil(high * 10) / 10;
  return { increase, value: base + increase, boost: calculate({ ...profile, [field]: base + increase }, db).boost };
}
export function upgradeOptions(profile, db) {
  const current = calculate(profile, db).boost;
  const options = [];
  for (let c = 0; c < 3; c++) {
    const hero = profile.starters[c]; if (!hero) continue;
    const info = profile.roster[hero]; if (!info) continue;
    for (const [field, value, label] of [['widget', Math.min(10, nonnegative(info.widget) + 1), `${hero}: widget ${Math.min(10, nonnegative(info.widget) + 1)}`], ['stars', '5*', `${hero}: 5 stars`], ['skill', 5, `${hero}: expedition skills level 5`]]) {
      if (String(info[field]) === String(value)) continue;
      const next = { ...profile, roster: { ...profile.roster, [hero]: { ...info, [field]: value } } };
      const boost = calculate(next, db).boost;
      options.push({ label, boost, gain: current > 0 ? (boost / current - 1) * 100 : 0, profile: next });
    }
  }
  return options.filter(o => o.gain > 0).sort((a, b) => b.gain - a.gain);
}
export function joinerCandidates(profile, db) {
  return db.heroesList.filter(h => profile.roster?.[h]?.unlocked && Object.values(skillsFor(h, db).joiner || {}).some(v => Number(v) !== 0));
}
export function starterPools(profile, db) {
  return CLASSES.map(c => db.heroesList.filter(h => profile.roster?.[h]?.unlocked && metaFor(h, db).class === c));
}
export function* combinations(pool, slots, start = 0, combo = []) {
  if (combo.length === slots) { yield [...combo]; return; }
  for (let i = start; i < pool.length; i++) { combo.push(pool[i]); yield* combinations(pool, slots, i, combo); combo.pop(); }
}
