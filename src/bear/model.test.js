import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculate, integerCounts, estimatedDamage, scoreCounts, statPath, combinations } from './model.js';
const read = name => JSON.parse(readFileSync(new URL(`./data/${name}.json`, import.meta.url)));
const db = { heroesList: read('heroes_list'), heroMetadata: read('hero_metadata'), heroSkills: read('hero_skills'), starLevelStats: read('star_level_stats'), troopDamageStats: read('troop_damage_stats'), widgetMultipliers: read('widget_multipliers') };
const roster = Object.fromEntries(['Hector', 'Mia', 'Gwen'].map(h => [h, { stars: '5*', widget: 10, skill: 5, unlocked: true }]));
const profile = { capacity: 160010, allAttack: 800, allLethality: 700, trap: 25, stats: [{}, {}, {}], roster, starters: ['Hector', 'Mia', 'Gwen'], joiners: ['Jessie', 'Jessie', 'Reina', 'Mia'], tiers: ['FC6 T10', 'FC6 T10', 'FC6 T10'], minister: 'None', deploy: 0, petsActive: false, rosarion: false };
test('whole troop counts always conserve capacity', () => {
  for (const n of [0, 1, 2, 7, 110000, 160010]) for (const r of [[.01, .17, .82], [1/3, 1/3, 1/3], [0, 0, 1], [0, 0, 0]]) {
    const c = integerCounts(r, n); assert.equal(c.reduce((a, b) => a + b), n); assert.ok(c.every(Number.isInteger));
  }
});
test('calibrated estimate returns the actual report at its baseline', () => {
  const result = calculate(profile, db); const base = { boost: result.boost, damage: 10000000 };
  assert.equal(estimatedDamage(result.boost, base), 10000000);
  assert.equal(estimatedDamage(result.boost * 2, base, 3), 60000000);
  assert.equal(estimatedDamage(result.boost, null), null);
});
test('zero Chameleon is respected in display normalization', () => {
  const r = calculate({ ...profile, petsActive: true, chameleon: 0, tiger: 0, lion: 0, ape: 0 }, db);
  assert.equal(r.boost, calculate(profile, db).boost);
});
test('inverse stat paths reach a higher target and zero-capacity stays zero', () => {
  const boost = calculate(profile, db).boost;
  const path = statPath(profile, db, 'allAttack', boost * 1.2);
  assert.ok(path.increase > 0); assert.ok(path.boost >= boost * 1.2);
  assert.equal(calculate({ ...profile, capacity: 0 }, db).capacity, 0);
});
test('nonstacking duplicate joiner does not contribute twice', () => {
  const a = calculate({ ...profile, joiners: ['Mia'] }, db);
  const b = calculate({ ...profile, joiners: ['Mia', 'Mia'] }, db);
  assert.equal(a.boost, b.boost);
});
test('stackable duplicate joiners change the score', () => {
  assert.ok(calculate({ ...profile, joiners: ['Jessie', 'Jessie'] }, db).boost > calculate({ ...profile, joiners: ['Jessie'] }, db).boost);
});
test('actual caller skill level changes the score independently of stars', () => {
  const lower = { ...profile, roster: { ...roster, Hector: { ...roster.Hector, skill: 1 } } };
  assert.ok(calculate(lower, db).boost < calculate(profile, db).boost);
});
test('joiner combinations enumerate repeats without permutations', () => {
  assert.deepEqual([...combinations(['A', 'B'], 2)], [['A', 'A'], ['A', 'B'], ['B', 'B']]);
});
test('derived fixed-count equation equals source optimum at fractional ideal counts', () => {
  const r = calculate(profile, db); assert.ok(Math.abs(scoreCounts(r, r.ratios.map(v => v * r.capacity)) - r.boost) < 1e-10);
});
test('linked effective capacity never reapplies Snow ape, minister or deployment capacity', () => {
  const linked = calculate({ ...profile, capacityIsEffective: true, petsActive: true, ape: 10000, deploy: 20, minister: 'Strategy (supreme)' }, db);
  assert.equal(linked.capacity, profile.capacity);
  assert.equal(linked.counts.reduce((a, b) => a + b), profile.capacity);
  assert.ok(linked.boost > calculate(profile, db).boost); // Minister's attack bonus still applies.
});
