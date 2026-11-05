import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateJoe, calculateJoe, cleanJoe } from './logic.js';
import { emptyState, loadState, saveState } from '../timehub/lib/storage.js';
const setup={infantry:'400000',lancer:'350000',capacity:'120000',marches:6,item:10,pet:'15000',minister:2500};
test('no invented troops: blank input is incomplete, zero is valid',()=>{
 assert.equal(calculateJoe({}),null);
 assert.equal(calculateJoe({...setup,infantry:'',lancer:'0'}),null);
 const r=calculateJoe({...setup,infantry:'0',lancer:'0'});assert.equal(r.best.sent,0);assert.equal(r.best.actions,0);
});
test('infantry has priority, both types are balanced across marches',()=>{
 const r=allocateJoe(400000,350000,[120000,120000,120000,120000,120000,120000]);
 assert.equal(r.leftInf,0);assert.equal(r.leftLan,30000);assert.equal(r.sent,720000);
 assert.ok(r.rows.every(x=>x.infantry>=66666&&x.infantry<=66667));
});
test('recommend minimal activations, preferring pet over consumable when both work',()=>{
 const r=calculateJoe(setup);assert.equal(r.best.pet,15000);assert.equal(r.best.percent,0);assert.equal(r.best.minister,0);assert.equal(r.best.left,0);
});
test('only 10% available: never recommend 20%; minister can close exact gap',()=>{
 const r=calculateJoe({...setup,pet:'',infantry:'410000',lancer:'390000'});
 assert.equal(r.best.percent,10);assert.equal(r.best.minister,2500);assert.equal(r.best.left,0);
 assert.ok(r.scenarios.every(s=>s.percent<=10));
});
test('recipient limits prevent buff spending that cannot improve evacuation',()=>{
 const r=calculateJoe({...setup,spaces:Array(6).fill('100000')});assert.equal(r.best.left,150000);assert.equal(r.best.actions,0);
});
test('displayed capacities never double count active buffs',()=>{
 const r=calculateJoe({...setup,measured:true});assert.equal(r.scenarios.length,1);assert.equal(r.best.space,720000);
});
test('different hero capacities, zero recipient space and one march are respected',()=>{
 const r=calculateJoe({...setup,marches:3,different:true,capacities:['100000','120000','80000'],spaces:['','0','50000']});
 assert.deepEqual(r.baseline.rows.map(x=>x.capacity),[100000,0,50000]);assert.equal(r.baseline.leftInf,250000);
 assert.equal(calculateJoe({...setup,marches:1}).baseline.space,120000);
});
test('allocation invariants across inventories, capacities and empty marches',()=>{
 for(let seed=0;seed<200;seed++){
  const i=seed*6711,l=seed*9179,caps=Array.from({length:seed%6+1},(_,j)=>(seed*13201+j*6787)%180000);
  const r=allocateJoe(i,l,caps);
  assert.equal(r.rows.reduce((n,x)=>n+x.infantry,0)+r.leftInf,i);
  assert.equal(r.rows.reduce((n,x)=>n+x.lancer,0)+r.leftLan,l);
  assert.ok(r.rows.every(x=>Number.isInteger(x.infantry)&&Number.isInteger(x.lancer)&&x.total<=x.capacity&&x.infantry>=0&&x.lancer>=0));
  assert.equal(r.sent,Math.min(i+l,caps.reduce((a,b)=>a+b,0)));
 }
});
test('saved Joe settings survive normalization and stay separate from other account data',()=>{
 const state=emptyState();state.accountData.A.crazyJoe=setup;
 const storage={value:null,setItem(k,v){this.value=v;},getItem(){return this.value;}};
 saveState(state,storage);const restored=loadState(storage);assert.deepEqual(restored.accountData.A.crazyJoe,cleanJoe(setup));
 assert.equal(restored.accountData.A.timers.length,0);
});

import { resolveJoeTroops } from './logic.js';
test('linked troops sum T9, T10 and Helios from the selected account',()=>{
 const form=cleanJoe({infantry:'999',lancer:'888'});
 const live={accountId:'A',t9:{infantry:100,lancer:200},t10:{infantry:300,lancer:400},t11:{infantry:50,lancer:60}};
 assert.equal(resolveJoeTroops(form,live,'A').infantry,'450');assert.equal(resolveJoeTroops(form,live,'A').lancer,'660');
 const scanned={...live,t10:{infantry:900,lancer:0}};
 assert.equal(resolveJoeTroops(form,scanned,'A').infantry,'1050');assert.equal(resolveJoeTroops(form,scanned,'A').lancer,'260');
 assert.equal(form.infantry,'999');
});
test('account transitions and demo data do not leak other or invented troop counts',()=>{
 const form=cleanJoe({infantry:'999',lancer:'888'});
 assert.equal(resolveJoeTroops(form,{accountId:'B',t10:{infantry:123}},'A').infantry,'');
 assert.equal(resolveJoeTroops(form,{accountId:'A',demo:true,t10:{infantry:123}},'A').infantry,'');
 assert.equal(resolveJoeTroops(form,null,'A').lancer,'');
});
test('manual override is independent and its link preference survives storage',()=>{
 const form=cleanJoe({linked:false,infantry:'123',lancer:'456'});
 assert.equal(resolveJoeTroops(form,{accountId:'A',t10:{infantry:999}},'A'),form);
 assert.equal(cleanJoe(form).linked,false);assert.equal(cleanJoe().linked,true);
});

import { resolveJoeCapacity } from './logic.js';
test('Joe uses the matching Bear Trap base and Snow Ape, replacing old separate settings',()=>{
 const saved=cleanJoe({...setup,capacity:'999',pet:'123',measured:true,different:true});
 const live={accountId:'A',rallyCapacity:175610,snowApeBoost:15000};
 const shared=resolveJoeCapacity(saved,live,'A');
 assert.equal(shared.capacity,'175610');assert.equal(shared.pet,'15000');
 assert.equal(shared.measured,false);assert.equal(shared.different,false);
 const result=calculateJoe(shared);
 assert.equal(result.baseline.marchCaps[0],175610);
 assert.equal(result.scenarios.find(s=>s.pet===15000&&s.percent===10&&s.minister===0).marchCaps[0],209671);
 assert.equal(resolveJoeCapacity(saved,{...live,rallyCapacity:180000,snowApeBoost:0},'A').pet,'0');
 assert.equal(saved.capacity,'999');
});
test('shared capacity never leaks between accounts or falls back to stale Joe settings',()=>{
 const saved=cleanJoe(setup), live={accountId:'B',rallyCapacity:200000,snowApeBoost:15000};
 assert.equal(resolveJoeCapacity(saved,live,'A').capacity,'');
 assert.equal(calculateJoe(resolveJoeCapacity(saved,live,'A')),null);
 assert.equal(resolveJoeCapacity(saved,null,'A').pet,'');
 assert.equal(resolveJoeCapacity(saved,{accountId:'A',rallyCapacity:'',snowApeBoost:0},'A').capacity,'');
});
test('manual capacity override and its preference persist independently of the shared values',()=>{
 const manual=cleanJoe({...setup,capacityLinked:false,different:true,measured:true});
 assert.equal(resolveJoeCapacity(manual,{accountId:'A',rallyCapacity:200000,snowApeBoost:15000},'A'),manual);
 assert.equal(cleanJoe(manual).capacityLinked,false);assert.equal(cleanJoe().capacityLinked,true);
});
