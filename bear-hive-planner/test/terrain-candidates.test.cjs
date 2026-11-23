'use strict';
const assert=require('node:assert/strict');
const H=require('../dist/world-map.js');
const s=H.migrate(H.emptyPlan());
s.mapMode='plain';
const before=JSON.stringify(s);
const results=H.suggestTrapPositions(s,1,{radius:4,limit:8});
assert(results.length>0);
assert(results.every(p=>p.x>=0&&p.x<=1197&&p.y>=0&&p.y<=1197));
assert(results.every(p=>p.terrainVerified===false));
assert.deepEqual(results.map(p=>p.distance),results.map(p=>p.distance).sort((a,b)=>a-b));
assert.equal(JSON.stringify(s),before,'suggestions must not mutate the plan');
assert.throws(()=>H.suggestTrapPositions(s,3),/BT1 or BT2/);
assert.throws(()=>H.suggestTrapPositions(s,1,{radius:100}),/Invalid/);

const shift=H.previewTrapShift(s,1,s.settings.anchorX,s.settings.anchorY);
assert.equal(shift.valid,true);
assert.equal(shift.terrainVerified,false);
assert.equal(JSON.stringify(s),before,'shift preview must not mutate plan');
const bad=H.previewTrapShift(s,1,-1,-1);
assert.equal(bad.valid,false);
const adaptive=H.previewAdaptiveReflow(s,1,s.settings.anchorX,s.settings.anchorY);
assert.equal(adaptive.adapted,true);
assert.equal(adaptive.terrainVerified,false);
assert.equal(JSON.stringify(s),before,'adaptive preview must not mutate plan');
assert.throws(()=>H.previewAdaptiveReflow(s,1,500,500,{radius:30}),/reflow radius/);
const applied=H.applyAdaptiveReflow(s,1,s.settings.anchorX,s.settings.anchorY);
assert.notEqual(applied.state,s);
assert.equal(applied.state.settings.anchorX,s.settings.anchorX);
assert.equal(JSON.stringify(s),before,'applying must not mutate the original plan');
assert.throws(()=>H.applyAdaptiveReflow(s,1,-1,-1),/conflict|valid|position|footprint/i);
const scenarios=H.compareTrapScenarios(s,1,{radius:2,reflowRadius:2});
assert(Array.isArray(scenarios));
assert(scenarios.length===0||scenarios.length===3);
if(scenarios.length){
 assert.deepEqual(scenarios.map(p=>p.label),['Most compact','Least disruption','Terrain adapted']);
 assert(scenarios.every(p=>p.distance>0),'a relocation must actually move the trap');
 assert(scenarios.every(p=>p.valid),'all proposed scenarios must pass collision checks');
}
assert.equal(JSON.stringify(s),before,'scenario comparison must not mutate plan');

// Safety regression: locked players remain in their original city footprints.
const lockedPlan=H.migrate(H.emptyPlan());
lockedPlan.mapMode='plain';
const occupied={id:'locked-slot-test',trap:1,x:lockedPlan.traps[0].x+5,y:lockedPlan.traps[0].y+5,w:2,h:2};
lockedPlan.slots.push(occupied);
lockedPlan.members.push({id:'locked-test',name:'Locked player',trap:1,slot:occupied.id,locked:true,confirmed:true,verified:true});
const lockedBefore=JSON.stringify(lockedPlan);
const lockedProposal=H.previewAdaptiveReflow(lockedPlan,1,lockedPlan.settings.anchorX+1,lockedPlan.settings.anchorY,{radius:8});
if(lockedProposal.valid){
 const lockedAfter=H.applyAdaptiveReflow(lockedPlan,1,lockedPlan.settings.anchorX+1,lockedPlan.settings.anchorY).state;
 const original=lockedPlan.slots.find(p=>p.id===occupied.id),after=lockedAfter.slots.find(p=>p.id===occupied.id);
 assert.equal(after.x,original.x);
 assert.equal(after.y,original.y);
 assert.equal(lockedAfter.members.find(m=>m.id==='locked-test').slot,occupied.id);
 assert.equal(lockedAfter.members.find(m=>m.id==='locked-test').confirmed,true);
}
assert.equal(JSON.stringify(lockedPlan),lockedBefore,'locked relocation preview must not mutate the source');

// Safety regression: known fixed structures must never be displaced by a candidate.
const obstructed=H.migrate(H.emptyPlan());
obstructed.mapMode='plain';
const obstacle={id:'test-obstacle',x:obstructed.traps[0].x+3,y:obstructed.traps[0].y,w:3,h:3};
obstructed.structures.push(obstacle);
const obstacleX=obstructed.settings.anchorX+3,obstacleY=obstructed.settings.anchorY;
assert.equal(H.previewAdaptiveReflow(obstructed,1,obstacleX,obstacleY).valid,false);
assert.throws(()=>H.applyAdaptiveReflow(obstructed,1,obstacleX,obstacleY),/conflict|valid|position|footprint/i);

// No-op candidates should not be presented as relocation scenarios.
const ranked=H.compareTrapScenarios(s,1,{radius:4,reflowRadius:4});
assert(ranked.every(p=>p.distance>0));
console.log('Terrain candidate search tests passed');
