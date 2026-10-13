import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => JSON.parse(readFileSync(new URL(`./data/${name}.json`, import.meta.url)));
const db = { heroesList: read('heroes_list'), heroMetadata: read('hero_metadata'), heroSkills: read('hero_skills'), starLevelStats: read('star_level_stats'), troopDamageStats: read('troop_damage_stats'), widgetMultipliers: read('widget_multipliers') };
import { calculate } from './model.js';
import { mixedModel, optimizeMixed, scoreRally } from './mixed-troops.js';
import { migrateSetup } from './leader-setup.js';
import { assessSetup } from './hero-comparison.js';
import { effectiveCapacity, migrateCapacityBuffs } from './buffs.js';
const p = { ...migrateSetup(), capacity: 100000, capacityIsEffective: true, allAttack: 400, allLethality: 300,
  starters: ['Hector','Mia','Gwen'], roster: Object.fromEntries(['Hector','Mia','Gwen'].map(h=>[h,{stars:'5*',widget:10,skill:5}])),
  tiers: ['FC6 T10','FC6 T10','FC6 T10'], petsActive: true, minister: 'None', trap: 25 };
const close = (a,b) => assert.ok(Math.abs(a-b) < 1e-8, `${a} != ${b}`);
test('new setup has no phantom Chameleon or Cyrille bonus; legacy source calls keep parity',()=>{
  const r=calculate(p,db);close(r.sourceBoost,r.boost);close(r.normalization,1/23400);
  close(calculate({...p,cyrilleDamage:30},db).sourceBoost,r.sourceBoost*1.3);
  assert.equal(migrateSetup({allAttack:400}).cyrilleDamage,30);
  assert.equal(migrateSetup().cyrilleDamage,0);
  const legacy={...p};delete legacy.buffModelVersion;delete legacy.cyrilleDamage;
  close(calculate(legacy,db).sourceBoost,r.sourceBoost*1.3*1.1);
});
test('city items add to the special-stat pool, not the base-stat percentage',()=>{
  const base=calculate(p,db), r=calculate({...p,cityAttack:20,cityLethality:10},db);
  assert.deepEqual(r.damage,base.damage);
  close(r.widgetA,base.widgetA+.2);close(r.widgetL,base.widgetL+.1);
  close(r.sourceBoost/base.sourceBoost,(1+base.widgetA+.2)/(1+base.widgetA)*(1+base.widgetL+.1)/(1+base.widgetL));
});
test('already-included attack/lethality controls suppress exactly their own additions',()=>{
  const base=calculate(p,db);
  close(calculate({...p,cityAttack:20,cityLethality:20,cityStatsIncluded:true},db).sourceBoost,base.sourceBoost);
  close(calculate({...p,lion:10,tiger:10,petStatsIncluded:true},db).sourceBoost,base.sourceBoost);
  close(calculate({...p,minister:'Defense (supreme)',frostdragon:'Frostdragon Tyrant',titlesStatsIncluded:true},db).sourceBoost,base.sourceBoost);
  assert.ok(calculate({...p,cityDefenseDown:20,cityStatsIncluded:true},db).sourceBoost>base.sourceBoost);
  assert.ok(calculate({...p,chameleon:10,petStatsIncluded:true},db).sourceBoost>base.sourceBoost);
});
test('defence down modifies the source skill pool; unverified health down never invents damage',()=>{
  const base=calculate(p,db); const r=calculate({...p,cityDefenseDown:20},db);
  close(r.sourceBoost,base.sourceBoost*1.2);
  close(calculate({...p,enemyHealthDown:5},db).sourceBoost,base.sourceBoost);
});
test('minister, president and stackable Frostdragon titles apply attack/lethality',()=>{
  for(const minister of ['Defense (normal)','Defense (supreme)','Strategy (normal)','Strategy (supreme)','President (normal)','President (supreme)']) assert.ok(calculate({...p,minister},db).sourceBoost>calculate(p,db).sourceBoost);
  const both=calculate({...p,minister:'Strategy (normal)',frostdragon:'Firebreather Vanguard'},db);
  assert.ok(both.sourceBoost>calculate({...p,minister:'Strategy (normal)'},db).sourceBoost);
  close(calculate({...p,frostdragon:'Bloodwyrm Emissary'},db).sourceBoost,calculate(p,db).sourceBoost);
});
test('normal Strategy migration corrects 2000 to 2500 and capacity adds each bonus once',()=>{
  assert.equal(migrateCapacityBuffs(null).position,'None');
  const b=migrateCapacityBuffs({ministerBoost:2000});assert.equal(b.position,'Strategy (normal)');
  assert.equal(effectiveCapacity(100000,30000,15000,{...b,deploy:20}),177000);
  assert.equal(effectiveCapacity(100000,0,0,{...b,frostdragon:'Firebreather Vanguard'}),104500);
  assert.equal(effectiveCapacity(104500,0,0,{...b,frostdragon:'Firebreather Vanguard',titlesCapacityIncluded:true}),104500);
  assert.ok(Number.isNaN(effectiveCapacity(100000,0,0,{...b,deploy:''})));
  for(const [c,a,d] of [[30001,0,0],[0,15001,0],[0,0,21],[.5,0,0]]) assert.ok(Number.isNaN(effectiveCapacity(100000,c,a,{...b,deploy:d})));
  assert.equal(calculate({...p,capacityIsEffective:false,minister:'Strategy (normal)',titlesStatsIncluded:true},db).capacity,102500);
  assert.deepEqual(migrateCapacityBuffs({capacityBuffs:{position:'Defense (supreme)',deploy:10}}),{position:'Defense (supreme)',frostdragon:'None',deploy:10,titlesCapacityIncluded:false});
});
test('buffed mixed-tier recommended and actual rally scores use the same normalization',()=>{
  const inventory={t11:{infantry:0,lancer:0,marksman:40000},t10:{infantry:50000,lancer:50000,marksman:80000}};
  const buffed={...p,chameleon:10,cyrilleDamage:12,cityAttack:20,cityDefenseDown:10,minister:'Strategy (normal)'};
  const r=optimizeMixed(buffed,inventory,db);
  close(scoreRally(r.model,r.breakdown),r.sourceBoost);
  close(mixedModel(buffed,inventory,db).factor,(1+r.widgetL)*(1+r.widgetA)*r.sourceNormalization);
  assert.ok(r.sourceBoost>optimizeMixed(p,inventory,db).sourceBoost);
});
test('invalid or blank buff inputs block recommendation, including unused health-down fields',()=>{
  const draft={...migrateSetup(),starters:p.starters};
  for(const [field,value] of [['cityAttack',30],['enemyHealthDown',6],['cyrilleDamage',''],['chameleon',11]]){
    const a=assessSetup({...draft,[field]:value},draft.tierInputs,100000,'None',db);
    assert.ok(a.errors.some(e=>e.startsWith(field.replace(/([A-Z])/g,' $1'))));assert.equal(a.result,null);
  }
});
