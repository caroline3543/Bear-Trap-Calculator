'use strict';
const assert=require('node:assert/strict');
const H=require('../dist/model.js');
const s=H.demo();
for(const m of s.members){m.slot=null;m.participation='none';m.locked=false;}
const [always,often,rarely,excluded,unknown]=s.members;
always.participation='regular';often.participation='sometimes';rarely.participation='rarely';excluded.participation='none';unknown.participation='unknown';
const result=H.suggest(s,1);
for(const m of [always,often,rarely])assert.ok(result.members.find(x=>x.id===m.id).slot,'participant should be placed: '+m.name);
for(const m of [excluded,unknown])assert.equal(result.members.find(x=>x.id===m.id).slot,null,'nonparticipant must not be placed');
assert.deepEqual(result.changes.slice(0,3).map(x=>x.id),[always,often,rarely].map(x=>x.id));
assert.equal(H.attendance(always,1),1);
assert.equal(H.attendance(excluded,1),0);
console.log('Manual participation placement tests passed');
