import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculate } from './model.js';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const db = { heroesList: read('./data/heroes_list.json'), heroMetadata: read('./data/hero_metadata.json'), heroSkills: read('./data/hero_skills.json'), starLevelStats: read('./data/star_level_stats.json'), troopDamageStats: read('./data/troop_damage_stats.json'), widgetMultipliers: read('./data/widget_multipliers.json') };
for (const [i, { profile, expected }] of read('./source-parity-fixtures.json').fixtures.entries()) {
  test(`WOS Nerds current-source parity ${i + 1}: ${profile.starters.join('/')}`, () => {
    const actual = calculate(profile, db);
    assert.equal(actual.capacity, expected.capacity);
    assert.ok(Math.abs(actual.raw - expected.raw) / Math.max(1, expected.raw) < 1e-12);
    assert.equal(actual.sourceBoost.toFixed(4), expected.sourceBoost.toFixed(4));
    actual.ratios.forEach((r, c) => {
      assert.ok(Math.abs(r - expected.ratios[c]) < 1e-12);
      assert.equal((r * 100).toFixed(2), (expected.ratios[c] * 100).toFixed(2));
      assert.equal((r * actual.capacity).toFixed(1), expected.idealCounts[c].toFixed(1));
    });
    assert.equal(actual.counts.reduce((a, b) => a + b), expected.capacity);
  });
}
