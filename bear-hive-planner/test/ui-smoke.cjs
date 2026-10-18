// DOM-contract smoke check, not a substitute for browser/touch testing.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const html=fs.readFileSync('dist/index.html','utf8'),elements=new Map();
class Element{
 constructor(id){this.listeners={};this.id=id;this.value='';this.checked=false;this.disabled=false;this.open=false;this.dataset={};this.style={};this.elements=new Proxy({},{get:(o,k)=>o[k]||(o[k]={value:'',type:k==='verified'?'checkbox':'text',checked:false})});this.classList={toggle(){},add(){},remove(){},contains(){return false}};this.textContent=''}
 set innerHTML(v){this._html=v;register(v)}get innerHTML(){return this._html||''}
 setAttribute(){}getBoundingClientRect(){return{width:800,height:470,left:0,top:0}}querySelector(){return new Element('child')}querySelectorAll(){return[]}appendChild(){}setPointerCapture(){}addEventListener(t,f){this.listeners[t]=f}showModal(){this.open=true}close(){this.open=false}focus(){}select(){}click(){this.onclick?.()}closest(){return null}
}
function register(h){for(const m of h.matchAll(/\bid="([^"]+)"/g))if(!elements.has(m[1]))elements.set(m[1],new Element(m[1]));}
register(html);elements.set('mapItemActions',new Element('mapItemActions'));elements.get('memberFilter').value='all';
const storage=new Map(),body=new Element('body');
const context={console,performance,URLSearchParams,TextDecoder,TextEncoder,Uint8Array,Date,JSON,Math,Set,Map,Number,String,Array,Object,Infinity,crypto:crypto.webcrypto,location:{hash:'',origin:'https://example.test',pathname:'/'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{body,createElement:()=>new Element('created'),createElementNS:()=>new Element('svg-created'),querySelector:s=>{if(s.startsWith('#')){const e=elements.get(s.slice(1));if(!e)throw Error('Missing element: '+s);return e}return null},querySelectorAll:()=>[]},requestAnimationFrame:f=>1,setTimeout:()=>1,clearTimeout(){},navigator:{clipboard:{writeText:async()=>{}}}};context.window=context;context.addEventListener=()=>{};context.cancelAnimationFrame=()=>{};vm.createContext(context);
for(const file of ['model.js','operations-model.js','attendance-model.js','layout-model.js','reference-layout.js','world-data.js','world-map.js','officer-model.js','template-data.js','templates-model.js','direct-model.js','app.js','operations.js','map-interactions.js','map-modes.js','officer-ui.js','templates-ui.js','direct-ui.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),context,{filename:file});
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
const baselineUndo=undo.length;
vp.listeners.pointerdown(ev(1,220,220));vp.listeners.pointermove(ev(1,280,220));vp.listeners.pointerup(ev(1,280,220));
if(slotBy(state.members[0].slot).x!==13||undo.length!==baselineUndo+1)throw Error('Immediate one-finger city drag must be one undo step');
const panX=camera.x,panY=camera.y;
vp.listeners.pointerdown(ev(1,650,350));vp.listeners.pointermove(ev(1,670,370));vp.listeners.pointerup(ev(1,670,370));
if(camera.x!==panX||camera.y!==panY)throw Error('One finger on empty space must not pan');
vp.listeners.pointerdown(ev(1,600,300));vp.listeners.pointerdown(ev(2,700,300));vp.listeners.pointermove(ev(1,620,320));vp.listeners.pointermove(ev(2,720,320));vp.listeners.pointerup(ev(1,620,320));vp.listeners.pointerup(ev(2,720,320));
if(camera.x===panX&&camera.y===panY)throw Error('Two fingers must pan');
const savedCity=JSON.stringify(state);
const cityPoint=point(slotBy(state.members[0].slot).x+1,slotBy(state.members[0].slot).y+1);
vp.listeners.pointerdown(ev(1,cityPoint.x,cityPoint.y));vp.listeners.pointermove(ev(1,cityPoint.x+40,cityPoint.y));vp.listeners.pointerdown(ev(2,cityPoint.x-50,cityPoint.y));vp.listeners.pointerup(ev(1,cityPoint.x+40,cityPoint.y));vp.listeners.pointerup(ev(2,cityPoint.x-50,cityPoint.y));
if(JSON.stringify(state)!==savedCity)throw Error('Second finger must cancel object movement');
selectedMapItem={kind:'member',id:state.members[0].id};removeSelectedMapItem();
if(state.members[0].slot||!state.members[0].id)throw Error('Minus must remove city placement and keep roster');
`,context);
console.log('PASS: synthetic pointer handlers for immediate touch dragging, one undo step, empty-space one-finger restraint, two-finger panning and contextual removal. Real-browser and device behavior remain unverified for this revision.');
