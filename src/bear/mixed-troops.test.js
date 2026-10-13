import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculate } from './model.js';
import { mixedModel, optimizeMixed, classMix, scoreRally } from './mixed-troops.js';
const read=n=>JSON.parse(readFileSync(new URL(`./data/${n}.json`,import.meta.url)));
const db={heroesList:read('heroes_list'),heroMetadata:read('hero_metadata'),heroSkills:read('hero_skills'),starLevelStats:read('star_level_stats'),troopDamageStats:read('troop_damage_stats'),widgetMultipliers:read('widget_multipliers')};
const types=['infantry','lancer','marksman'];
const pool=(a,b,c)=>({infantry:a,lancer:b,marksman:c});
const profile={capacity:200000,capacityIsEffective:true,allAttack:800,allLethality:700,stats:[{},{},{}],starters:['Hector','Mia','Gwen'],roster:Object.fromEntries(['Hector','Mia','Gwen'].map(h=>[h,{stars:'5*',widget:10,skill:5}])),tiers:['FC6 T11','FC6 T11','FC6 T11'],petsActive:true,chameleon:10,tiger:0,lion:0,trap:25,joiners:['Jessie','Jessie','Seo-yoon','Seo-yoon']};
test('100k Helios + 100k T10 scores their actual weighted mix, not 200k Helios',()=>{
 const inventory={t11:pool(0,0,100000),t10:pool(0,0,100000),t9:pool(0,0,0)};
 const result=optimizeMixed(profile,inventory,db);
 const high=calculate(profile,db), low=calculate({...profile,tiers:['FC6 T10','FC6 T10','FC6 T10']},db);
 const expected=(high.damage[2]+low.damage[2])/2*Math.sqrt(200000)*result.model.factor;
 assert.ok(Math.abs(result.sourceBoost-expected)<1e-9);assert.deepEqual(result.counts,[0,0,200000]);
 assert.equal(result.breakdown.marksman.t11,100000);assert.equal(result.breakdown.marksman.t10,100000);
 assert.ok(result.sourceBoost<high.damage[2]*Math.sqrt(200000)*result.model.factor);
});
test('homogeneous inventory reproduces the source formula at fractional counts and integer score',()=>{
 const inventory={t11:pool(500000,500000,500000)};
 const model=mixedModel(profile,inventory,db), original=calculate(profile,db);
 const fractional=original.ratios.map(n=>n*profile.capacity);
 assert.ok(Math.abs(fractional.reduce((s,n,i)=>s+classMix(model.classes[i],n).contribution,0)*model.factor-original.sourceBoost)<1e-9);
 const result=optimizeMixed(profile,inventory,db);
 assert.equal(result.counts.reduce((a,b)=>a+b),profile.capacity);
 assert.ok(Math.abs(result.sourceBoost-original.sourceBoost)<.00001);
});
test('limited inventory produces a partial rally and never invents troops',()=>{
 const inventory={t11:pool(0,0,100),t10:pool(20,30,40),t9:pool(1,2,3)};
 const result=optimizeMixed(profile,inventory,db);
 assert.equal(result.capacity,196);assert.equal(result.shortfall,199804);
 assert.deepEqual(result.counts,[21,32,143]);
 assert.ok(Math.abs(scoreRally(result.model,result.breakdown)-result.sourceBoost)<1e-9);
});
test('integer optimizer matches exhaustive search for mixed-tier small rallies',()=>{
 for(let seed=1;seed<=20;seed++){
  const inventory={t11:pool(seed%5,(seed*3)%7,(seed*2)%9),t10:pool(9,11,13),t9:pool(5,8,10)};
  const p={...profile,capacity:10+seed};const r=optimizeMixed(p,inventory,db);let best=0;
  const stock=r.model.classes.map(e=>e.reduce((s,v)=>s+v.count,0));
  for(let a=0;a<=Math.min(stock[0],p.capacity);a++)for(let b=0;b<=Math.min(stock[1],p.capacity-a);b++){
   const c=p.capacity-a-b;if(c>stock[2])continue;
   best=Math.max(best,[a,b,c].reduce((s,n,i)=>s+classMix(r.model.classes[i],n).contribution,0)*r.model.factor);
  }
  assert.ok(Math.abs(best-r.sourceBoost)<1e-9,`seed ${seed}`);
 }
});
test('manual tier substitutions change the score even at the same class totals',()=>{
 const inventory={t11:pool(100000,100000,100000),t10:pool(100000,100000,100000)};
 const model=mixedModel(profile,inventory,db);
 const high={marksman:{t11:100000}},low={marksman:{t10:100000}};
 assert.ok(scoreRally(model,high)>scoreRally(model,low));
 assert.throws(()=>scoreRally(model,{marksman:{t11:100001}}));
});
test('empty or invalid inventory cannot create phantom full-capacity scores',()=>{
 assert.equal(optimizeMixed(profile,{},db).sourceBoost,0);
 assert.throws(()=>optimizeMixed(profile,{t10:pool(-1,0,0)},db));
});
test('optimizer matches exhaustive search across tier gaps and different FC overrides',()=>{
 for(let seed=1;seed<=70;seed++){
  const inventory={t11:pool(seed%9,(seed*3)%11,(seed*2)%13),t10:pool(seed%3,(seed+1)%3,(seed+2)%3),t9:pool(50,50,50),
   fcByTier:{t11:pool(6,6,6),t10:pool(seed%6,5,6),t9:pool(seed%5,3,4)}};
  const p={...profile,capacity:12+seed%37};const r=optimizeMixed(p,inventory,db);let best=0;
  const stock=r.model.classes.map(e=>e.reduce((s,v)=>s+v.count,0));
  for(let a=0;a<=Math.min(stock[0],p.capacity);a++)for(let b=0;b<=Math.min(stock[1],p.capacity-a);b++){
   const c=p.capacity-a-b;if(c>stock[2])continue;
   best=Math.max(best,[a,b,c].reduce((s,n,i)=>s+classMix(r.model.classes[i],n).contribution,0)*r.model.factor);
  }
  assert.ok(Math.abs(best-r.sourceBoost)<1e-8,`seed ${seed}: ${best} / ${r.sourceBoost}`);
  assert.ok(r.scoreUpperBound+1e-8>=best);
 }
});
test('current-rally scoring rejects a formation larger than deployment capacity',()=>{
 const inventory={t10:pool(100000,100000,100000)};
 const model=mixedModel({...profile,capacity:100000},inventory,db);
 assert.throws(()=>scoreRally(model,{infantry:{t10:60000},marksman:{t10:60000}}),/capacity/);
});
