import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseScanText, troopCards, resolveCardLabel, confirmAmountReadings, mergeBadgeReadings } from './troop-scan.js';
import { confirmFcReadings, selectScannedTiers, mergeScannedTiers } from './troop-tiers.js';
const samples = JSON.parse(fs.readFileSync(new URL('./__fixtures__/troop-screenshots.json',import.meta.url),'utf8'));
const expected = {
  '8677': {values:{t10Infantry:440794,t10Lancer:379573,t10Marksman:773100,t9Infantry:736,t9Lancer:736,t9Marksman:736},fc:{infantry:{fc:5,level:10},lancer:{fc:5,level:10},marksman:{fc:6,level:10}}},
  '8674': {values:{t11Marksman:102402,t10Infantry:857110,t10Lancer:614195,t10Marksman:673902},fc:{infantry:{fc:5,level:10},lancer:{fc:5,level:10},marksman:{fc:5,level:11}}},
  '8676': {values:{t10Infantry:335905,t10Lancer:282551,t10Marksman:456095},fc:{infantry:{fc:5,level:10},lancer:{fc:4,level:10},marksman:{fc:4,level:10}}},
};
for (const sample of samples) test(`real screenshot ${sample.name}: exact counts, mixed FC and Helios classification`,()=>{
  const parsed = parseScanText(sample.data);
  const cards = parsed.cards;
  const values={},badges=[];
  for(const original of cards) {
    const crop=sample.crops.find(c=>c.type===original.type && c.labelBox.x0===original.label.bbox.x0 && c.labelBox.y0===original.label.bbox.y0);
    const card=original.level ? original : resolveCardLabel(original,crop.labelRead);
    assert.ok(card.level,'Tier must be recognized, not guessed');
    const key='t'+card.level+card.type[0].toUpperCase()+card.type.slice(1);
    const count=confirmAmountReadings(crop.amountReads,{value:parsed.values[key],confidence:parsed.confidence[key]});assert.ok(count);
    values['t'+card.level+card.type[0].toUpperCase()+card.type.slice(1)]=count.value;
    const fc=confirmFcReadings(crop.fcReads);assert.ok(fc);
    badges.push({...card,...fc});
  }
  assert.deepEqual(values,expected[sample.name].values);
  assert.deepEqual(selectScannedTiers(badges),expected[sample.name].fc);
});
test('unknown tiers stay missing and a lower card cannot donate its number',()=>{
  const words=[{text:'Infantry',confidence:95,bbox:{x0:100,x1:240,y0:100,y1:130}}, {text:'Supreme',confidence:95,bbox:{x0:40,x1:140,y0:300,y1:330}}, {text:'Infantry',confidence:95,bbox:{x0:160,x1:300,y0:300,y1:330}}, {text:'736',confidence:95,bbox:{x0:40,x1:110,y0:345,y1:370}}];
  const parsed=parseScanText({words});assert.equal(parsed.values.t10Infantry,undefined);assert.equal(parsed.values.t9Infantry,736);
});
test('close-up amounts support zero and small counts, reject disagreement and low confidence',()=>{
  for(const value of [0,12,736,335905]) assert.equal(confirmAmountReadings([{text:String(value),confidence:95},{text:String(value),confidence:90}]).value,value);
  assert.equal(confirmAmountReadings([{text:'335905',confidence:95},{text:'7991909',confidence:96}]),null);
  assert.equal(confirmAmountReadings([{text:'123',confidence:60},{text:'123',confidence:60}]),null);
});
test('card reconstruction scales with the image and never crosses a neighboring column',()=>{
  const words=samples[0].data.words;
  const cards=troopCards(words),scaled=troopCards(words.map(w=>({...w,bbox:Object.fromEntries(Object.entries(w.bbox).map(([k,v])=>[k,v*2]))})));
  assert.equal(cards.length,scaled.length);
  for(let i=0;i<cards.length;i++)for(const key of ['sx','sy','sw','sh'])assert.ok(Math.abs(scaled[i].amountRegion[key]-cards[i].amountRegion[key]*2)<.001);
  assert.ok(cards[0].amountRegion.sx+cards[0].amountRegion.sw<=cards[0].xMax);
});
test('a later Apex screenshot cannot replace a detected Helios FC; unresolved conflicts preserve saved FC',()=>{
  const helios={marksman:{fc:5,level:11,confidence:95}};
  assert.deepEqual(mergeBadgeReadings(helios,{marksman:{fc:6,level:10,confidence:95}}),helios);
  const conflict=mergeBadgeReadings(helios,{marksman:{fc:6,level:11,confidence:95}});
  assert.equal(conflict.marksman.uncertain,true);
  const saved=[{fc:5,level:10},{fc:4,level:10},{fc:5,level:11}];
  assert.deepEqual(mergeScannedTiers(saved,conflict),saved);
});
