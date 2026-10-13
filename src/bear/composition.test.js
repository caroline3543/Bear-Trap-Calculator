import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTarget } from './composition.js';
const types=['infantry','lancer','marksman'];
test('percentage allocation conserves capacity at small and normal march sizes',()=>{
 for (const capacity of [1,2,3,7,110000,160010]) for (const values of [[50,50,0],[33.3,33.3,33.4],[.5,10,89.5],[0,0,100],[2,15,83]]) {
  const ratio=Object.fromEntries(types.map((t,i)=>[t,values[i]]));
  const result=computeTarget(capacity,'ratio',ratio,{});
  assert.equal(result.valid,true);assert.equal(types.reduce((s,t)=>s+result[t],0),capacity);
  assert.ok(types.every(t=>Number.isSafeInteger(result[t])&&result[t]>=0));
 }
});
test('invalid compositions cannot spend more troops or disguise negative or fractional amounts',()=>{
 const ratio={infantry:50,lancer:50,marksman:0};
 for (const r of [{...ratio,infantry:NaN},{infantry:-10,lancer:50,marksman:60},{...ratio,marksman:1}]) assert.equal(computeTarget(100,'ratio',r,{}).valid,false);
 for (const capacity of [0,-1,Infinity,1.5]) assert.equal(computeTarget(capacity,'ratio',ratio,{}).valid,false);
 for (const exact of [{infantry:-1,lancer:51,marksman:50},{infantry:.5,lancer:49.5,marksman:50},{infantry:1,lancer:2,marksman:3}]) assert.equal(computeTarget(100,'exact',{},exact).valid,false);
 assert.equal(computeTarget(100,'exact',{}, {infantry:1,lancer:19,marksman:80}).valid,true);
});
