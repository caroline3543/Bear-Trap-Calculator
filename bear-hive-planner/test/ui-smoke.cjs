// DOM-contract smoke check, not a substitute for browser/touch testing.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const html=fs.readFileSync('dist/index.html','utf8'),elements=new Map();
class Element{
 constructor(id){this.listeners={};this.children=[];this.queries=new Map();this.id=id;this.value='';this.checked=false;this.disabled=false;this.open=false;this.dataset={};this.style={};this.elements=new Proxy({},{get:(o,k)=>o[k]||(o[k]={value:'',type:k==='verified'?'checkbox':'text',checked:false})});this.classList={toggle(){},add(){},remove(){},contains(){return false}};this.textContent=''}
 set innerHTML(v){this._html=v;this.children=[];this.queries.clear();register(v)}get innerHTML(){return this._html||''}
 setAttribute(){}getBoundingClientRect(){return{width:800,height:470,left:0,top:0}}querySelector(s){if(!this.queries.has(s))this.queries.set(s,new Element('child'));return this.queries.get(s)}querySelectorAll(s){if(!['[data-queue-player]','[data-slot-candidate]','[data-simple-attendee]'].includes(s))return[];if(!this.queries.has(s)){const attr=s.slice(1,-1),key=attr.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),out=[];for(const tag of this.innerHTML.matchAll(/<(?:button|input)[^>]*>/g)){const m=tag[0].match(new RegExp(attr+'="([^"\\s]+)"'));if(m){const el=new Element('candidate');el.dataset[key]=m[1];el.checked=/\schecked(?:\s|>)/.test(tag[0]);el.disabled=/\sdisabled(?:\s|>)/.test(tag[0]);out.push(el)}}this.queries.set(s,out)}return this.queries.get(s).concat(this.children.flatMap(c=>c.querySelectorAll(s)))}appendChild(c){this.children.push(c)}contains(){return false}setPointerCapture(){}addEventListener(t,f){this.listeners[t]=f}showModal(){this.open=true}close(){this.open=false}focus(){}select(){}click(){this.onclick?.()}closest(){return null}
}
function register(h){for(const m of h.matchAll(/\bid="([^"]+)"/g))if(!elements.has(m[1]))elements.set(m[1],new Element(m[1]));}
register(html);elements.set('mapItemActions',new Element('mapItemActions'));elements.get('memberFilter').value='all';
const storage=new Map(),body=new Element('body'),windowListeners={};
const context={console,performance,URLSearchParams,TextDecoder,TextEncoder,Uint8Array,Date,JSON,Math,Set,Map,Number,String,Array,Object,Infinity,crypto:crypto.webcrypto,location:{hash:'',origin:'https://example.test',pathname:'/'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{body,addEventListener(){},createElement:()=>new Element('created'),createElementNS:()=>new Element('svg-created'),querySelector:s=>{if(s.startsWith('#')){const e=elements.get(s.slice(1));if(!e)throw Error('Missing element: '+s);return e}return null},querySelectorAll:s=>{const id={'[data-slot-candidate]':'slotSuggestions','[data-queue-player]':'queue','[data-simple-attendee]':'attendanceNames'}[s];return id?(elements.get(id)?.querySelectorAll(s)||[]):[]}},requestAnimationFrame:f=>1,setTimeout:()=>1,clearTimeout(){},navigator:{clipboard:{writeText:async()=>{}}}};context.window=context;context._windowListeners=windowListeners;context.addEventListener=(t,f)=>(windowListeners[t]||=[]).push(f);context.cancelAnimationFrame=()=>{};vm.createContext(context);
for(const file of ['model.js','operations-model.js','attendance-model.js','layout-model.js','reference-layout.js','world-data.js','world-map.js','officer-model.js','template-data.js','templates-model.js','direct-model.js','ui-components.js','app.js','operations.js','map-interactions.js','map-modes.js','officer-ui.js','templates-ui.js','direct-ui.js','simple-ui.js','planning-ui.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),context,{filename:file});
vm.runInContext("state=Hive.migrate(Hive.demo());render();navigate('attendance');navigate('members');navigate('moves');navigate('settings');navigate('map');openBulk();memberDetail(state.members[0].id);officerInstructions(state.members[0]);commit(()=>{});",context);
assert(elements.get('attendanceSummary').innerHTML.includes('Every 2 days'));assert(!html.includes('data-page="schedule"'));
assert(elements.get('eventBar').innerHTML.includes('BT date (UTC)'));
assert(storage.has('bear-hive-v1'));
console.log('PASS: script startup, five page renders, bulk dialog, officer record/instructions, attendance tab, queue controls, autosave and element contracts. This is a DOM-contract check; interactive coverage is in browser-flows.cjs.');

// Synthetic pointer-handler checks. These do not represent a browser or physical touch test.
vm.runInContext(`
state=Hive.migrate(Hive.demo());state.mapMode='plain';activeTrap='all';state.blocks=[];state.structures=[];state.slots=[];
const testPlayer=state.members[0];testPlayer.locked=false;testPlayer.trap=1;state.members.forEach(m=>m.slot=null);
state.slots=[{id:'test-city',x:10,y:10,w:2,h:2,trap:1,row:1}];testPlayer.slot='test-city';
camera={x:0,y:0,k:20};tool='select';
const target={closest:()=>null},vp=document.querySelector('#mapViewport');
const ev=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,pointerType:'touch',target,button:0});
const baselineUndo=undo.length,panBefore={...camera};
vp.listeners.pointerdown(ev(1,220,220));vp.listeners.pointermove(ev(1,240,240));vp.listeners.pointerup(ev(1,240,240));
if(slotBy(state.members[0].slot).x!==10||undo.length!==baselineUndo||camera.x===panBefore.x)throw Error('One finger over an unselected item must pan without moving it');
camera={x:0,y:0,k:20};const selectScale=camera.k;
vp.listeners.pointerdown(ev(1,220,220));vp.listeners.pointerup(ev(1,220,220));
if(selectedMapItem?.id!==state.members[0].id)throw Error('A single tap must select an item');
vp.listeners.pointerdown(ev(1,220,220));vp.listeners.pointerup(ev(1,220,220));
if(selectedMapItem?.id!==state.members[0].id||camera.k!==selectScale)throw Error('Double tap must select without zooming');
vp.listeners.pointerdown(ev(1,220,220));if(!document.querySelector('#mapItemActions').hidden)throw Error('City controls must hide immediately on finger down');vp.listeners.pointermove(ev(1,280,220));vp.listeners.pointerup(ev(1,280,220));
if(slotBy(state.members[0].slot).x!==13||undo.length!==baselineUndo+1)throw Error('Selected city drag must be one undo step');
const panX=camera.x,panY=camera.y;
vp.listeners.pointerdown(ev(1,650,350));vp.listeners.pointermove(ev(1,670,370));vp.listeners.pointerup(ev(1,670,370));
if(camera.x===panX&&camera.y===panY)throw Error('One finger on empty space must pan');
vp.listeners.pointerdown(ev(1,600,300));vp.listeners.pointerdown(ev(2,700,300));vp.listeners.pointermove(ev(1,620,320));vp.listeners.pointermove(ev(2,720,320));vp.listeners.pointerup(ev(1,620,320));vp.listeners.pointerup(ev(2,720,320));
if(camera.x===panX&&camera.y===panY)throw Error('Two fingers must pan');
const savedCity=JSON.stringify(state);
const cityPoint=point(slotBy(state.members[0].slot).x+1,slotBy(state.members[0].slot).y+1);
vp.listeners.pointerdown(ev(1,cityPoint.x,cityPoint.y));vp.listeners.pointermove(ev(1,cityPoint.x+40,cityPoint.y));vp.listeners.pointerdown(ev(2,cityPoint.x-50,cityPoint.y));vp.listeners.pointerup(ev(1,cityPoint.x+40,cityPoint.y));vp.listeners.pointerup(ev(2,cityPoint.x-50,cityPoint.y));
if(JSON.stringify(state)!==savedCity)throw Error('Second finger must cancel object movement');
selectedMapItem={kind:'member',id:state.members[0].id};removeSelectedMapItem();
if(state.members[0].slot||!state.members[0].id)throw Error('Minus must remove city placement and keep roster');
`,context);
console.log('PASS: synthetic pointer handlers for single-tap selection, one-finger panning, selected-item dragging, one undo step, two-finger panning and contextual removal. Real-browser and device behavior remain unverified for this revision.');

vm.runInContext(`
camera={x:0,y:0,k:20};activeTrap='1';togglePlacementTool('flag');
const beforePlacement=JSON.stringify(state),placementUndo=undo.length;
vp.listeners.pointerdown(ev(1,400,300));
if(!mapPlacement?.valid||JSON.stringify(state)!==beforePlacement)throw Error('Pointer down must show a preview without saving');
if(!document.querySelector('#mapItemActions').hidden)throw Error('Selection dock must hide while holding');
vp.listeners.pointermove(ev(1,440,300));
if(mapPlacement.x!==22||mapPlacement.y!==15)throw Error('Preview must snap exactly beneath the touch point');
vp.listeners.pointerup(ev(1,440,300));
if(state.structures.length!==1||state.structures[0].x!==22||state.structures[0].y!==15||tool!=='flag'||undo.length!==placementUndo+1)throw Error('Release must save once and retain tool');
vp.listeners.pointerdown(ev(1,480,300));vp.listeners.pointerup(ev(1,480,300));
if(state.structures.length!==2||tool!=='flag')throw Error('The same tool must place multiple items');
const validPlan=JSON.stringify(state),validUndo=undo.length;
vp.listeners.pointerdown(ev(1,480,300));if(mapPlacement.valid)throw Error('Occupied placement must show invalid');vp.listeners.pointerup(ev(1,480,300));
if(JSON.stringify(state)!==validPlan||undo.length!==validUndo||tool!=='flag')throw Error('Invalid placement must not save or deselect tool');
vp.listeners.pointerdown(ev(1,550,300));vp.listeners.pointerdown(ev(2,620,300));vp.listeners.pointerup(ev(1,550,300));vp.listeners.pointerup(ev(2,620,300));
if(JSON.stringify(state)!==validPlan||mapPlacement)throw Error('Second finger must cancel placement');
vp.listeners.pointerdown(ev(1,550,300));vp.listeners.pointercancel(ev(1,550,300));
if(JSON.stringify(state)!==validPlan||mapPlacement)throw Error('Cancelled pointer must not place anything');
togglePlacementTool('flag');if(tool!=='select')throw Error('Tapping an active tool must deselect it');
`,context);
assert(html.includes('id="mapItemActions"'));
assert(html.indexOf('id="mapItemActions"')>html.indexOf('id="mapHint"'));
console.log('PASS: hold/move/release placement preview, exact touch target, repeat placement, persistent tool, invalid-drop rejection, one undo per item, multi-touch cancellation and tool-toggle deselection. Selection controls are outside the canvas.');

vm.runInContext(`
state=Hive.migrate(Hive.demo());state.mapMode='plain';activeTrap='1';setTool('select');state.members=state.members.slice(0,3);state.members.forEach((m,i)=>{m.slot=null;m.locked=false;m.trap=1;m.attendance[1]={kind:i<2?'regular':'sometimes'}});state.attendanceLog.sessions={};state.slots=state.slots.filter(s=>s.trap===1);state.blocks=[];state.structures=[];
const firstSpace=state.slots[0],secondSpace=state.slots[1];selectedMapItem={kind:'slot',id:firstSpace.id};renderMap();renderQueue();
const dock=document.querySelector('#queue'),choices=dock.querySelectorAll('[data-queue-player]');
if(choices.length!==2)throw Error('Dock must show only frequent attendees');
const untouchedDock=dock.innerHTML;camera.x+=10;renderMap();if(dock.querySelectorAll('[data-queue-player]')[0]!==choices[0])throw Error('Camera rendering must preserve assignment button identity');
for(const f of _windowListeners.pointerdown||[])f({target:choices[0]});
if(dock.innerHTML!==untouchedDock||dock.querySelectorAll('[data-queue-player]')[0]!==choices[0])throw Error('Outside pointerdown must not replace assignment buttons');
const assignBefore=JSON.stringify(state);choices[0].click();
if(state.members[0].slot!==firstSpace.id)throw Error('Tapping a player name must assign them');
document.querySelector('#undoBtn').click();if(JSON.stringify(state)!==assignBefore)throw Error('Assignment Undo must restore state');document.querySelector('#redoBtn').click();if(state.members[0].slot!==firstSpace.id)throw Error('Assignment Redo must restore assignment');
openAttendanceSlot(secondSpace.id);const modalChoices=document.querySelector('#slotSuggestions').querySelectorAll('[data-slot-candidate]');
if(modalChoices.length!==1||modalChoices[0].dataset.slotCandidate!==state.members[1].id)throw Error('Searchable list must exclude allocated frequent player and lower groups');
for(const f of _windowListeners.pointerdown||[])f({target:modalChoices[0]});modalChoices[0].click();
if(state.members[1].slot!==secondSpace.id||Hive.slotAttendanceGroup(state,1).kind!=='sometimes')throw Error('Modal player tap must assign and progress attendance group');
if(JSON.parse(localStorage.getItem('bear-hive-v1')).members[1].slot!==secondSpace.id)throw Error('Assignment must persist');
`,context);
console.log('PASS: real assignment event handlers in synthetic DOM, idle outside-pointer stability, modal/dock player taps, attendance-group advancement, persistence and assignment Undo/Redo. Not a real-browser test.');

vm.runInContext(`
for(const projection of [false,true]){iso=projection;for(const scale of [5,17,44]){camera={x:47,y:-63,k:scale};mapPlacement={tool:'block',screen:point(20.25,15.25),touch:true};updatePlacement();if(mapPlacement.x!==20||mapPlacement.y!==15)throw Error('Preview must stay under pointer across zoom/pan/projection')}}
mapPlacement=null;iso=false;renderMap();
`,context);
console.log('PASS: pointer alignment across zoom levels, translated cameras and both map projections.');

vm.runInContext(`
state.operations.date='2026-01-01';state.operations.trap=1;render();
const attendanceFirst=document.querySelector('#attendanceNames').querySelectorAll('[data-simple-attendee]')[0];
attendanceFirst.checked=true;attendanceFirst.onchange();
if(Hive.attendanceSession(state))throw Error('Ticking must not save until Save attendees');
document.querySelector('#saveSimpleAttendance').click();
if(!Hive.attendanceSession(state).attended.includes(attendanceFirst.dataset.simpleAttendee)||Hive.attendanceSession(state).complete)throw Error('Default attendance must save a partial list');
document.querySelector('#simpleComplete').checked=true;document.querySelector('#simpleComplete').onchange({target:{checked:true}});document.querySelector('#saveSimpleAttendance').click();
if(!Hive.attendanceSession(state).complete)throw Error('Full-list checkbox must mark the record complete');
state.operations.trap=2;render();if(Hive.attendanceSession(state))throw Error('Trap attendance must stay isolated');
state.operations.trap=1;state.operations.date='2026-01-03';render();if(Hive.attendanceSession(state))throw Error('Unrecorded dates must remain unrecorded');
state.operations.date='2026-01-01';render();
if(!document.querySelector('#attendanceNames').querySelectorAll('[data-simple-attendee]').some(x=>x.checked))throw Error('Saved checkboxes must reload from the event');
`,context);
assert(!html.includes('id="bulkQueue"'));
assert(html.includes('Place players for me'));
assert(html.includes('id="itemMenu"'));
console.log('PASS: simplified attendance tick/save/full-list flow, no autosave, event isolation, and reloaded checkboxes; roster import is absent from the map.');

vm.runInContext(`
state=Hive.migrate(Hive.demo());state.mapMode='plain';state.operations.rosterGroup=1;state.members=state.members.filter(m=>m.trap===1).slice(0,4);const preserveCity=state.members[0].slot;state.members.forEach((m,i)=>{m.locked=i===0;if(i)m.slot=null});selectedMapItem=null;selectedSlot=null;render();const beforeAuto=JSON.stringify(state),autoUndo=undo.length;
document.querySelector('#suggestBtn').click();
if(undo.length!==autoUndo+1||state.members.some(m=>!m.slot)||state.members[0].slot!==preserveCity)throw Error('Place players button must fill only empty cities in one undo action');
document.querySelector('#undoBtn').click();if(JSON.stringify(state)!==beforeAuto)throw Error('Undo must restore the complete pre-placement state');
`,context);
console.log('PASS: Place players for me button, existing locked-city preservation and atomic Undo.');
