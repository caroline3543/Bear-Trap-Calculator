import test from 'node:test';
import assert from 'node:assert/strict';
import { JOINERS, migrateSetup, resolveHero, starKey } from './leader-setup.js';

test('hero entry resolves case and spacing while only accepting allowed names', () => {
  assert.equal(resolveHero(' SEO Yoon ', JOINERS), 'Seo-yoon');
  assert.equal(resolveHero('jesse', JOINERS), '');
  assert.equal(resolveHero('Hector', ['Gwen', 'Reina']), '');
});
test('star entries retain supported one-decimal source keys and reject excess precision', () => {
  assert.equal(starKey(4.3), '4.3*');
  assert.equal(starKey('5.0'), '5*');
  assert.equal(starKey(4), '4*');
  assert.equal(starKey(5.1), null);
  assert.equal(starKey(''), null);
  assert.equal(starKey(4.33), null);
});
test('migrating a saved planner preserves setup but drops reports, targets and roster controls', () => {
  const setup = migrateSetup({ allAttack: 800, starters: ['Hector', 'Mia', 'Gwen'],
    roster: { Hector: { stars: '4.3*', widget: 8, skill: 4 } },
    tiers: ['FC9 T11', 'FC6 T10', 'FC0 T9'], stats: [{ gearAttack: 120, gearLethality: 80 }],
    target: 10000000, baseline: { damage: 1000000 }, trap: 60 });
  assert.deepEqual(setup.heroInfo[0], { stars: 4.3, widget: 8, skill: 4 });
  assert.deepEqual(setup.tierInputs[0], { fc: 9, level: 11 });
  assert.equal(setup.stats[0].attackOn, 120); assert.equal(setup.stats[0].attackOff, 0);
  assert.deepEqual(setup.joiners, ['Jessie', 'Jessie', 'Seo-yoon', 'Seo-yoon']);
  for (const removed of ['baseline', 'target', 'roster', 'trap']) assert.ok(!(removed in setup));
});
