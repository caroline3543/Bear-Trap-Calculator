import test from 'node:test';
import assert from 'node:assert/strict';
import { joinerCapacities, scaleJoinerTarget } from './joiner-capacity.js';
import { computeTarget } from './composition.js';
test('mixed hero capacities respect cap, zero/all hero marches and disabled legacy mode', () => {
  assert.deepEqual(joinerCapacities(110000, 6, true, 3, 80000), [110000,110000,110000,80000,80000,80000]);
  assert.deepEqual(joinerCapacities(110000, 2, true, 0, 140000), [110000,110000]);
  assert.deepEqual(joinerCapacities(110000, 2, true, 5, 80000), [110000,110000]);
  assert.deepEqual(joinerCapacities(110000, 2, false, 0, 80000), [110000,110000]);
  assert.deepEqual(joinerCapacities(110000, 0, true, 0, 80000), []);
});
test('ratio and exact inputs keep the same percentages at different capacities', () => {
  for (const mode of ['ratio', 'exact']) {
    const target = computeTarget(110000, mode, {infantry:2,lancer:15,marksman:83}, {infantry:2200,lancer:16500,marksman:91300});
    const scaled = scaleJoinerTarget(target, 110000, 80000);
    assert.deepEqual([scaled.infantry,scaled.lancer,scaled.marksman], [1600,12000,66400]);
    assert.equal(scaled.total,80000);
  }
});
test('rounding conserves total and partial targets keep their unfilled proportion', () => {
  const target = {valid:true,infantry:550,lancer:11000,marksman:58450};
  const scaled = scaleJoinerTarget(target,110000,80001);
  assert.equal(scaled.infantry+scaled.lancer+scaled.marksman,Math.round(70000*80001/110000));
  assert.equal(scaleJoinerTarget(target,110000,0).valid,false);
  assert.equal(scaleJoinerTarget({...target,valid:false},110000,80000).valid,false);
});
