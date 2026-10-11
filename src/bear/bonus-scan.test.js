import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBonusScan, mergeBonusScans, applyBonusReadings } from './bonus-scan.js';
function data(lines) {
  return { text: 'Bonus Overview\n' + lines.join('\n'), words: lines.flatMap((line, i) => line.split(' ').map((text, j) => ({ text, confidence: 97, bbox: { x0: j * 120, x1: j * 120 + 100, y0: i * 60, y1: i * 60 + 20 } }))) };
}
test('example Bonus Overview reads only the six visible attack/lethality fields', () => {
  const readings = parseBonusScan(data(["Troops’ Attack 216.77%", "Troops’ Defense 211.45%", "Troops’ Lethality 62.33%", 'Infantry Attack 167.18%', 'Infantry Health 196.22%', 'Infantry Lethality 206.24%', 'Lancer Attack 119.75%', 'Lancer Lethality 173.57%']));
  assert.deepEqual(Object.fromEntries(Object.entries(readings).map(([k,r]) => [k,r.value])), { allAttack: 216.77, allLethality: 62.33, '0.attack': 167.18, '0.lethality': 206.24, '1.attack': 119.75, '1.lethality': 173.57 });
  assert.equal(readings['2.attack'], undefined);
  assert.ok(Object.values(readings).every(r => !r.uncertain));
});
test('multiple screenshots merge missing fields and flag conflicting percentages', () => {
  const one = parseBonusScan(data(['Infantry Attack 167.18%']));
  const two = parseBonusScan(data(['Marksman Attack 250.24%', 'Infantry Attack 168.18%']));
  const merged = mergeBonusScans(one,two);
  assert.equal(merged['2.attack'].value,250.24);
  assert.equal(merged['0.attack'].uncertain,true);
  assert.deepEqual(merged['0.attack'].alternatives,[168.18]);
});
test('partial scans preserve all unseen saved bonuses and gear fields, including confirmed zero', () => {
  const profile = { allAttack: 12, allLethality: 34, stats: [0,1,2].map(() => ({ attack: 50, lethality: 60, attackOn: 70, attackOff: 20 })) };
  const readings = { allAttack: { value:0, uncertain:false }, '0.attack': {value:167.18,uncertain:false}, '1.attack':{value:99,uncertain:true} };
  const applied = applyBonusReadings(profile,readings);
  assert.equal(applied.allAttack,0);assert.equal(applied.allLethality,34);
  assert.equal(applied.stats[0].attack,167.18);assert.equal(applied.stats[1].attack,50);
  assert.equal(applied.stats[0].attackOn,70);assert.equal(profile.stats[0].attack,50);
});
test('rally and hero screens cannot supply base account bonuses', () => {
  assert.deepEqual(parseBonusScan({text:"Troops Bonus\nInfantry Attack 705.21%"}),{});
  assert.deepEqual(parseBonusScan({text:"Hero Overall Stats\nInfantry Attack 464.35%"}),{});
  const uncertain = parseBonusScan({text:'Infantry Attack 167.18%'});
  assert.equal(uncertain['0.attack'].uncertain,true);
});
test('decimal commas parse without shifting values and low-confidence digits need review', () => {
  const input = data(['Lancer Attack 119,75%']);input.words[2].confidence=60;
  assert.equal(parseBonusScan(input)['1.attack'].value,119.75);
  assert.equal(parseBonusScan(input)['1.attack'].uncertain,true);
});
