import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTroopTiers, mergeScannedTiers, selectScannedTiers, locateFcBadges, confirmFcReadings } from './troop-tiers.js';
const previous = [{fc: 6, level: 10}, {fc: 5, level: 10}, {fc: 6, level: 11}];
test('inventory tier data wins over old helper fields; legacy choices migrate by account', () => {
  const storage = { getItem: key => key.endsWith(':farm') ? JSON.stringify({profile:{tierInputs:previous}}) : null };
  assert.deepEqual(loadTroopTiers('farm', {}, storage), previous);
  assert.deepEqual(loadTroopTiers('main', {}, storage), Array.from({length:3}, () => ({fc:6,level:10})));
  const saved = [{fc:4,level:9},{fc:3,level:10},{fc:5,level:11}];
  assert.deepEqual(loadTroopTiers('farm', {troopTiers:saved}, storage), saved);
});
test('mixed FC badges remain separate and Helios is T11, not FC11', () => {
  const badges = [
    {type:'infantry',level:10,fc:5,confidence:95},
    {type:'lancer',level:10,fc:4,confidence:95},
    {type:'marksman',level:10,fc:6,confidence:95},
    {type:'marksman',level:11,fc:5,confidence:95},
    {type:'infantry',level:9,fc:6,confidence:95},
  ];
  assert.deepEqual(selectScannedTiers(badges), {infantry:{fc:5,level:10},lancer:{fc:4,level:10},marksman:{fc:5,level:11}});
});
test('unreadable, empty, low-confidence or invalid badges never overwrite saved tiers', () => {
  assert.deepEqual(mergeScannedTiers(previous, {infantry:{fc:'',level:10},lancer:{fc:11,level:10}}),previous);
  assert.deepEqual(selectScannedTiers([{type:'marksman',fc:7,level:10,confidence:64}]),{});
  assert.deepEqual(mergeScannedTiers(previous,{lancer:{fc:0,level:9}}),[previous[0],{fc:0,level:9},previous[2]]);
});
test('badge coordinates follow each troop card and scale with screenshot size', () => {
  const words = [
    {text:'Apex',bbox:{x0:274,y0:765,x1:370,y1:808}},
    {text:'Infantry',bbox:{x0:383,y0:765,x1:541,y1:798}},
    {text:'Apex',bbox:{x0:843,y0:765,x1:939,y1:808}},
    {text:'Lancer',bbox:{x0:952,y0:765,x1:1087,y1:798}},
  ];
  const regions = locateFcBadges(words);
  assert.equal(regions.length,2);
  assert.deepEqual(regions.map(r=>[r.type,r.level]),[['infantry',10],['lancer',10]]);
  assert.ok(Math.abs(regions[0].sx+regions[0].sw/2-239)<2);
  assert.ok(Math.abs(regions[1].sx+regions[1].sw/2-809)<2);
  const scaled = locateFcBadges(words.map(w=>({...w,bbox:Object.fromEntries(Object.entries(w.bbox).map(([k,v])=>[k,v*2]))})));
  for(let i=0;i<2;i++)for(const k of ['sx','sy','sw','sh'])assert.equal(scaled[i][k],regions[i][k]*2);
});

test('close-up crops must agree before accepting a badge digit', () => {
  assert.deepEqual(confirmFcReadings([{text:'4',confidence:94},{text:'4',confidence:59},{text:'4',confidence:62}]),{fc:4,confidence:94});
  assert.equal(confirmFcReadings([{text:'6',confidence:95},{text:'5',confidence:90},{text:'',confidence:0}]),null);
  assert.equal(confirmFcReadings([{text:'5',confidence:60},{text:'5',confidence:60}]),null);
  assert.equal(confirmFcReadings([{text:'11',confidence:95},{text:'11',confidence:95}]),null);
});
