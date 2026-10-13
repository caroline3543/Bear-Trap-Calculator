import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => JSON.parse(readFileSync(new URL(`./data/${name}.json`, import.meta.url)));
const db = { heroesList:read('heroes_list'), heroMetadata:read('hero_metadata'), heroSkills:read('hero_skills'), starLevelStats:read('star_level_stats'), troopDamageStats:read('troop_damage_stats'), widgetMultipliers:read('widget_multipliers') };
import { calculate } from './model.js';
import { migrateSetup } from './leader-setup.js';
import { assessSetup, replaceHero, compareHero } from './hero-comparison.js';
const setup = () => migrateSetup({ starters: ['Hector', 'Mia', 'Gwen'], allAttack: 216.77, allLethality: 62.33,
  stats: [{attack:167.18,lethality:206.24,attackOn:464.35,attackOff:350,lethalityOn:95.52,lethalityOff:50}], chameleon: 10 });
const candidate = () => ({ name: 'Jeronimo', info: { stars:5,widget:10,skill:5 }, gear:{attackOn:464.35,attackOff:350,lethalityOn:95.52,lethalityOff:50} });
test('compares complete rally outcomes with only one hero build changed', () => {
  const draft=setup(), before=structuredClone(draft), other=candidate();
  const result=compareHero(draft,0,other,draft.tierInputs,160010,'None',db);
  assert.deepEqual(result.errors,[]);
  assert.deepEqual(draft,before,'Comparison does not alter the saved active build');
  assert.deepEqual(result.alternative.result,calculate(result.alternative.profile,db));
  assert.deepEqual(result.current.result,assessSetup(draft,draft.tierInputs,160010,'None',db).result);
  assert.equal(result.winner,result.alternative.result.sourceBoost > result.current.result.sourceBoost ? 'alternative':'current');
  assert.deepEqual(result.alternative.profile.starters,['Jeronimo','Mia','Gwen']);
  assert.equal(result.alternative.result.counts.reduce((a,b)=>a+b),160010);
  for (const field of ['allAttack','allLethality','chameleon','tiers','joiners']) assert.deepEqual(result.current.profile[field],result.alternative.profile[field]);
  assert.deepEqual(result.current.profile.stats.slice(1),result.alternative.profile.stats.slice(1));
  assert.equal(result.alternative.profile.stats[0].attack,167.18,'Account class bonus stays independent of hero gear');
});
test('rejects wrong class, duplicate heroes, incomplete or negative gear and unsupported star steps', () => {
 const draft=setup();
 for (const other of [ {...candidate(),name:'Gwen'}, {...candidate(),name:'Hector'}, {...candidate(),gear:{...candidate().gear,attackOff:''}}, {...candidate(),gear:{...candidate().gear,attackOff:999}}, {...candidate(),info:{...candidate().info,stars:4.9}} ]) {
  const result=compareHero(draft,0,other,draft.tierInputs,160010,'None',db);assert.ok(result.errors.length);assert.equal(result.winner,undefined);
 }
});
test('candidate build, gear, capacity and shared setup changes recompute scores', () => {
 const draft=setup(), other=candidate();
 const score=(d,o,n=160010)=>compareHero(d,0,o,d.tierInputs,n,'None',db).alternative.result.sourceBoost;
 assert.notEqual(score(draft,other),score(draft,{...other,info:{...other.info,widget:0,skill:1}}));
 assert.notEqual(score(draft,other),score(draft,{...other,gear:{...other.gear,attackOn:700}}));
 assert.notEqual(score(draft,other),score({...draft,allAttack:800},other));
 assert.notEqual(score(draft,other),score(draft,other,120000));
});
test('migration saves independent alternatives and leaves old profiles empty for honest entry', () => {
 const draft=setup();assert.equal(draft.alternatives[0].info.stars,'');assert.equal(draft.alternatives[0].gear.attackOn,'');
 draft.alternatives[0]=candidate();const saved=migrateSetup(JSON.parse(JSON.stringify(draft)));assert.deepEqual(saved.alternatives[0],candidate());
 const swapped=replaceHero(saved,0,saved.alternatives[0]);assert.equal(swapped.heroInfo[0].widget,10);assert.equal(saved.starters[0],'Hector');
});
