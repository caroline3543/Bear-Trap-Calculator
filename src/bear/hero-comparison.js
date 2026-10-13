import { CLASSES, calculate } from './model.js';
import { gearDifference, withGearDifferences } from './number-entry.js';
import { heroNamesForClass, resolveHero, starKey } from './leader-setup.js';

export function assessSetup(draft, tiers, leaderCapacity, leaderMinister, db) {
    const errors = [];
    const starters = draft.starters.map((h, i) => resolveHero(h, heroNamesForClass(db, i)));
    const joiners = ['Jessie', 'Jessie', 'Seo-yoon', 'Seo-yoon'];
    const roster = {};
    CLASSES.forEach((c, i) => {
      if (!starters[i]) errors.push(`${c}: choose a matching leader hero.`);
      const info = draft.heroInfo[i];
      const key = starKey(info.stars);
      const starTable = db.starLevelStats[Object.keys(db.starLevelStats).find(h => h.toLowerCase().replace(/[^a-z0-9]/g, '') === starters[i].toLowerCase().replace(/[^a-z0-9]/g, ''))];
      if (!key || (starTable && !(key in starTable))) errors.push(`${c}: enter a supported star step (e.g. 4.3 or 5.0).`);
      if (info.widget === '' || !Number.isInteger(Number(info.widget)) || info.widget < 0 || info.widget > 10) errors.push(`${c}: widget must be a whole number from 0 to 10.`);
      if (info.skill === '' || !Number.isInteger(Number(info.skill)) || info.skill < 1 || info.skill > 5) errors.push(`${c}: skill must be a whole number from 1 to 5.`);
      roster[starters[i]] = { stars: key, widget: info.widget, skill: info.skill };
      const tier = tiers[i];
      if (tier.fc === '' || tier.level === '' || !db.troopDamageStats[`FC${tier.fc} T${tier.level}`]) errors.push(`${c}: check FC (0–10) and troop tier (1–11) in the troop inventory above.`);
      if (!['attack', 'lethality'].every(k => gearDifference(draft.stats[i], k) !== null && gearDifference(draft.stats[i], k) >= 0)) errors.push(`${c}: complete both gear readings; gear on must be at least gear off.`);
      if (draft.stats[i].attack === '' || draft.stats[i].lethality === '') errors.push(`${c}: enter both troop-type bonuses, or use 0 if there is no bonus.`);
    });
    if (['allAttack', 'allLethality', 'chameleon', 'tiger', 'lion'].some(k => draft[k] === '')) errors.push('Complete the attack, lethality and pet bonuses, or enter 0.');
    if (!(leaderCapacity > 0)) errors.push('Enter a positive rally capacity above.');
    const profile = withGearDifferences({ ...draft, capacity: leaderCapacity, capacityIsEffective: true,
      starters, joiners, roster, tiers: tiers.map(t => `FC${t.fc} T${t.level}`),
      minister: leaderMinister, petsActive: true, trap: 25 });
    return { errors, profile, result: errors.length ? null : calculate(profile, db) };
}

export function replaceHero(draft, index, candidate) {
  return { ...draft,
    starters: draft.starters.map((v, i) => i === index ? candidate.name : v),
    heroInfo: draft.heroInfo.map((v, i) => i === index ? { ...candidate.info } : v),
    stats: draft.stats.map((v, i) => i === index ? { ...v, ...candidate.gear } : v),
  };
}
export function compareHero(draft, index, candidate, tiers, capacity, minister, db) {
  const current = assessSetup(draft, tiers, capacity, minister, db);
  const alternative = assessSetup(replaceHero(draft, index, candidate), tiers, capacity, minister, db);
  const errors = [...new Set([...current.errors, ...alternative.errors])];
  if (current.profile.starters[index] && current.profile.starters[index] === alternative.profile.starters[index]) errors.unshift('Choose a different hero of this class.');
  if (errors.length) return { errors, current, alternative };
  const a = current.result.sourceBoost, b = alternative.result.sourceBoost;
  // Treat scores equal at the displayed precision as a tie, not a hidden winner.
  const winner = a.toFixed(4) === b.toFixed(4) ? 'tie' : b > a ? 'alternative' : 'current';
  const improvement = Math.min(a, b) > 0 ? (Math.max(a, b) / Math.min(a, b) - 1) * 100 : null;
  return { errors, current, alternative, winner, improvement };
}
