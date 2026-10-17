// DOM-contract smoke check, not a substitute for browser/touch testing.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const html=fs.readFileSync('dist/index.html','utf8'),elements=new Map();
class Element{
 constructor(id){this.id=id;this.value='';this.checked=false;this.disabled=false;this.open=false;this.dataset={};this.style={};this.elements=new Proxy({},{get:(o,k)=>o[k]||(o[k]={value:'',type:k==='verified'?'checkbox':'text',checked:false})});this.classList={toggle(){},add(){},remove(){},contains(){return false}};this.textContent=''}
 set innerHTML(v){this._html=v;register(v)}get innerHTML(){return this._html||''}
 setAttribute(){}getBoundingClientRect(){return{width:800,height:470,left:0,top:0}}querySelectorAll(){return[]}addEventListener(){}showModal(){this.open=true}close(){this.open=false}focus(){}select(){}click(){this.onclick?.()}closest(){return null}
}
function register(h){for(const m of h.matchAll(/\bid="([^"]+)"/g))if(!elements.has(m[1]))elements.set(m[1],new Element(m[1]));}
register(html);elements.get('memberFilter').value='all';
const storage=new Map(),body=new Element('body');
const context={console,URLSearchParams,TextDecoder,TextEncoder,Uint8Array,Date,JSON,Math,Set,Map,Number,String,Array,Object,Infinity,crypto:crypto.webcrypto,location:{hash:'',origin:'https://example.test',pathname:'/'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{body,querySelector:s=>{if(s.startsWith('#')){const e=elements.get(s.slice(1));if(!e)throw Error('Missing element: '+s);return e}return null},querySelectorAll:()=>[]},requestAnimationFrame:f=>f(),setTimeout:()=>1,clearTimeout(){},navigator:{clipboard:{writeText:async()=>{}}}};context.window=context;context.addEventListener=()=>{};context.cancelAnimationFrame=()=>{};vm.createContext(context);
for(const file of ['model.js','operations-model.js','attendance-model.js','layout-model.js','reference-layout.js','app.js','operations.js','map-interactions.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),context,{filename:file});
vm.runInContext("state=Hive.migrate(Hive.demo());render();navigate('attendance');navigate('members');navigate('moves');navigate('settings');navigate('map');openBulk();memberDetail(state.members[0].id);officerInstructions(state.members[0]);",context);
assert(elements.get('attendanceSummary').innerHTML.includes('Every 2 days'));assert(!html.includes('data-page="schedule"'));
assert(elements.get('eventBar').innerHTML.includes('R4+ EVENT DESK'));
assert(storage.has('bear-hive-v1'));
console.log('PASS: script startup, five page renders, bulk dialog, officer record/instructions, attendance tab, queue controls, autosave and element contracts. This is a DOM-contract check; interactive coverage is in browser-flows.cjs.');
