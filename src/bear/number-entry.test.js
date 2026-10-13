import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEntry, gearDifference, withGearDifferences } from './number-entry.js';
test('phone entry accepts pasted grouped stats and leaves blank or invalid entry distinct', () => {
  assert.equal(parseEntry('1,234.5 %'), 1234.5);
  assert.equal(parseEntry(' .5 '), .5);
  assert.equal(parseEntry(''), null);
  for (const text of ['-2', '1.2.3', '1e4', 'abc']) assert.equal(parseEntry(text), undefined);
  assert.equal(parseEntry('101', 100), undefined);
});
test('gear comparison adds only on-minus-off and detects incomplete or reversed stats', () => {
  const stats = { attackOn: 1234.6, attackOff: 1000.1, lethalityOn: 850, lethalityOff: 750 };
  assert.equal(gearDifference(stats, 'attack'), 234.5);
  assert.equal(gearDifference({ ...stats, attackOn: '' }, 'attack'), null);
  assert.equal(gearDifference({ ...stats, attackOn: 900 }, 'attack'), -100.1);
  assert.deepEqual(withGearDifferences({ stats: [stats] }).stats[0], { ...stats, gearAttack: 234.5, gearLethality: 100 });
});
test('non-finite, negative or out-of-range saved gear readings cannot produce a score', () => {
 for (const value of [NaN, Infinity, 'abc', -1, 10001, null]) {
  assert.equal(gearDifference({attackOn:value,attackOff:0},'attack'),null);
  assert.equal(gearDifference({attackOn:100,attackOff:value},'attack'),null);
 }
});
