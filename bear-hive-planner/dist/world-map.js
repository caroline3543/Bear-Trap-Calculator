(function(root){
'use strict';const H=typeof module!=='undefined'?require('./reference-layout.js'):root.Hive,data=typeof module!=='undefined'?require('./world-data.js'):root.HiveWorldData;
const rows=new Map();for(const [y,x,n,k]of data){if(!rows.has(y))rows.set(y,[]);rows.get(y).push({x,n,k})}
const types={1:'Mountain',2:'Lake',3:'Building',4:'Castle',5:'Fortress / stronghold area',6:'Facility area',7:'Alliance resource node'};
const colors={1:'#89928b',2:'#8badc4',3:'#bb9a62',4:'#ac8cad',5:'#d9b9ac',6:'#b7d6ca',7:'#d4c68b'};
function origin(s){if(!s.mapOrigin){const t=s.traps.find(t=>t.id===1)||{x:0,y:0};s.mapOrigin={x:s.settings.anchorX-t.x,y:s.settings.anchorY-t.y}}return s.mapOrigin}
function at(x,y){return rows.get(y)?.find(r=>x>=r.x&&x<r.x+r.n)?.k||0}
function worldBlocked(s,b,kind='city'){const o=origin(s);for(let x=Math.floor(b.x);x<Math.ceil(b.x+b.w);x++)for(let y=Math.floor(b.y);y<Math.ceil(b.y+b.h);y++){const wx=o.x+x,wy=o.y+y;if(wx<0||wy<0||wx>=1200||wy>=1200)return true;const k=s.mapMode==='plain'?0:at(wx,wy);if(k&&k!==6&&(k!==5||kind!=='city'))return true}return false}
function features(s,bounds){if(s.mapMode==='plain')return[];const o=origin(s),out=[];for(let y=Math.max(0,Math.floor(bounds.y+o.y));y<Math.min(1200,Math.ceil(bounds.y+bounds.h+o.y));y++)for(const r of rows.get(y)||[]){const start=Math.max(r.x,Math.floor(bounds.x+o.x)),end=Math.min(r.x+r.n,Math.ceil(bounds.x+bounds.w+o.x));if(end>start)out.push({id:`world-${y}-${r.x}`,x:start-o.x,y:y-o.y,w:end-start,h:1,worldX:start,worldY:y,key:r.k,fixed:true,name:types[r.k],color:colors[r.k]})}return out}
function sync(s){const o=origin(s);for(const t of s.traps){const x=(t.id===1?s.settings.anchorX:s.settings.anchor2X)-o.x,y=(t.id===1?s.settings.anchorY:s.settings.anchor2Y)-o.y,dx=x-t.x,dy=y-t.y;if(dx||dy){for(const p of s.slots.filter(p=>p.trap===t.id)){p.x+=dx;p.y+=dy}t.x=x;t.y=y}}return s}
function reference(s,settings){const n=JSON.parse(JSON.stringify(s));origin(n);Object.assign(n.settings,settings);sync(n);if(n.traps.some(t=>worldBlocked(n,t,'trap'))||n.traps.some((a,i)=>n.traps.some((b,j)=>i<j&&H.overlap(a,b))))throw Error('A Bear Trap overlaps fixed map terrain, a building or the other trap. Choose different coordinates.');const displaced=[];for(const m of n.members.filter(m=>m.slot)){const p=n.slots.find(p=>p.id===m.slot);if(!p||!H.validCityPosition(n,p,m.id)){if(m.locked)throw Error('The new coordinates conflict with locked city '+m.name+'. Unlock or move it first.');m.slot=null;m.confirmed=false;m.verified=false;displaced.push(m.name)}}return{state:n,displaced}}
const reset=H.factoryResetMap;H.factoryResetMap=s=>{const n=reset(s),o=origin(n);n.traps=n.mapMode==='terrain'?[]:[{id:1,x:n.settings.anchorX-o.x,y:n.settings.anchorY-o.y,w:3,h:3},{id:2,x:n.settings.anchor2X-o.x,y:n.settings.anchor2Y-o.y,w:3,h:3}];return n};
const load=H.loadLunLayout;H.loadLunLayout=s=>{const n=load(s);n.settings.anchorX=s.settings.anchorX;n.settings.anchorY=s.settings.anchorY;n.settings.anchor2X=s.settings.anchorX-9;n.settings.anchor2Y=s.settings.anchorY;n.mapOrigin={x:s.settings.anchorX-4,y:s.settings.anchorY+4};return n};

const copy=x=>JSON.parse(JSON.stringify(x));
function capture(s){return{traps:copy(s.traps),slots:copy(s.slots),blocks:copy(s.blocks),structures:copy(s.structures),mapOrigin:copy(origin(s)),anchors:[s.settings.anchorX,s.settings.anchorY,s.settings.anchor2X,s.settings.anchor2Y],placements:s.members.map(m=>({id:m.id,slot:m.slot,locked:m.locked,confirmed:m.confirmed,verified:m.verified}))}}
function switchMode(s,mode){if(!['plain','terrain'].includes(mode))throw Error('Choose Plain or Terrain.');const n=copy(s);if(n.mapMode===mode)return n;const previous=n.mapMode||'plain';n.mapDrafts=n.mapDrafts||{};n.mapDrafts[previous]=capture(n);const d=n.mapDrafts[mode];n.mapMode=mode;if(d){for(const k of ['traps','slots','blocks','structures','mapOrigin'])n[k]=copy(d[k]);// Keep current Plan Settings as the source of truth across map-mode changes.
sync(n);for(const m of n.members){const p=d.placements.find(p=>p.id===m.id);Object.assign(m,{slot:null,locked:false,confirmed:false,verified:false});if(p&&n.slots.some(b=>b.id===p.slot&&b.trap===m.trap))Object.assign(m,p)}}else{n.traps=[];n.slots=[];n.blocks=[];n.structures=[];n.members.forEach(m=>Object.assign(m,{slot:null,locked:false,confirmed:false,verified:false}));if(mode==='plain'){const resetPlan=H.factoryResetMap(n);n.traps=resetPlan.traps}}return n}
function placeTrap(s,id,x,y){if(![1,2].includes(+id)||![x,y].every(v=>Number.isInteger(v)&&v>=0&&v<=1197))throw Error('Enter whole coordinates from 0 to 1197 for a 3×3 trap.');const n=copy(s),o=origin(n),box={id:+id,x:x-o.x,y:y-o.y,w:3,h:3};if(worldBlocked(n,box,'trap')||[...n.traps.filter(t=>t.id!==+id),...n.structures,...n.blocks,...n.slots].some(b=>H.overlap(box,b)))throw Error('That trap footprint overlaps fixed terrain or a planned object.');if(n.traps.some(t=>t.id===+id)){const settings=+id===1?{anchorX:x,anchorY:y}:{anchor2X:x,anchor2Y:y};return reference(n,settings)}n.traps.push(box);if(+id===1){n.settings.anchorX=x;n.settings.anchorY=y}else{n.settings.anchor2X=x;n.settings.anchor2Y=y}return{state:n,displaced:[]}}
const empty=H.emptyPlan;H.emptyPlan=()=>{const n=empty();n.mapMode='plain';n.mapDrafts={};origin(n);return n};
function placeObject(s,kind,x,y,{memberId,trapId=1}={}){const size={city:2,slot:2,flag:1,hq:3,terrain:1,water:1,node:1,farm:1,mine:1,wood:1,coal:1,iron:1}[kind];if(!size||![x,y].every(v=>Number.isInteger(v)&&v>=0&&v<=1200-size))throw Error('Enter valid whole coordinates for this footprint.');const n=copy(s),o=origin(n),box={x:x-o.x,y:y-o.y,w:size,h:size};if(kind==='city'){const m=n.members.find(m=>m.id===memberId);if(!m||![1,2].includes(m.trap))throw Error('Choose a BT1 or BT2 player.');if(!n.traps.some(t=>t.id===m.trap))throw Error('Place this player’s bear trap first.');return H.moveCity(n,m.id,box.x,box.y)}if(kind==='slot'&&!n.traps.some(t=>t.id===+trapId))throw Error('Place the selected bear trap first.');if(worldBlocked(n,box,kind==='slot'?'city':kind)||[...n.traps,...n.structures,...n.blocks,...n.slots].some(b=>H.overlap(box,b)))throw Error('That footprint overlaps fixed terrain or a planned object.');const id='placed-'+(n.nextObjectId=(n.nextObjectId||0)+1);if(kind==='slot')n.slots.push({...box,id,trap:+trapId,row:H.cityRow(box,n.traps.find(t=>t.id===+trapId))});else if(kind==='terrain'||kind==='water')n.blocks.push({...box,id,kind});else n.structures.push({...box,id,kind});return n}
H.placeMapObject=placeObject;
H.switchMapMode=switchMode;H.placeBearTrap=placeTrap;


// Coordinates for optional alliance structures are stored in world space.
// Marker footprints are provisional and are not used to claim buildability.
function allianceMarkers(s){const o=origin(s),out=[];for(const [name,kx,ky,w,h] of [['HQ','hqX','hqY',3,3],['Node','nodeX','nodeY',1,1]]){const x=s.settings[kx],y=s.settings[ky];if(Number.isInteger(x)&&Number.isInteger(y))out.push({name,worldX:x,worldY:y,x:x-o.x,y:y-o.y,w,h,footprintVerified:false})}return out}
H.allianceMarkers=allianceMarkers;
// Read-only terrain-aware BT candidate search. This never changes the plan.
// A candidate is a map-model suggestion, not an in-game construction guarantee.
function suggestTrapPositions(s,id,{radius=8,limit=3}={}){
 if(![1,2].includes(Number(id)))throw Error('Choose BT1 or BT2.');
 if(!Number.isInteger(radius)||radius<0||radius>40||!Number.isInteger(limit)||limit<1||limit>20)throw Error('Invalid search radius or candidate limit.');
 const trap=s.traps.find(t=>t.id===Number(id)),o=origin(s);
 const x0=Number(id)===1?s.settings.anchorX:s.settings.anchor2X;
 const y0=Number(id)===1?s.settings.anchorY:s.settings.anchor2Y;
 if(!Number.isInteger(x0)||!Number.isInteger(y0))return [];
 const candidates=[];
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
  const x=x0+dx,y=y0+dy;if(x<0||y<0||x>1197||y>1197)continue;
  const box={x:x-o.x,y:y-o.y,w:3,h:3};
  if(worldBlocked(s,box,'trap'))continue;
  const conflicts=[...s.traps.filter(t=>t.id!==Number(id)),...s.structures,...s.blocks,...s.slots.filter(p=>!trap||p.trap!==Number(id))];
  if(conflicts.some(item=>H.overlap(box,item)))continue;
  // Existing cities belonging to this trap may need reflow; count them, do not mutate.
  const affected=s.slots.filter(p=>p.trap===Number(id)&&H.overlap(box,p));
  const locked=affected.some(p=>s.members.some(m=>m.slot===p.id&&m.locked));
  if(locked)continue;
  candidates.push({x,y,offsetX:dx,offsetY:dy,distance:Math.abs(dx)+Math.abs(dy),affectedSlots:affected.length,requiresReflow:!!(dx||dy),terrainVerified:false});
 }
 return candidates.sort((a,b)=>a.distance-b.distance||a.affectedSlots-b.affectedSlots||Math.abs(a.offsetY)-Math.abs(b.offsetY)||a.y-b.y||a.x-b.x).slice(0,limit);
}
H.suggestTrapPositions=suggestTrapPositions;
// Preview a whole-hive shift around a candidate BT coordinate. No state changes.
// This conservative first strategy preserves every city-to-trap offset and locked placement.
function previewTrapShift(s,id,x,y){
 const trap=s.traps.find(t=>t.id===Number(id));
 if(!trap)return {valid:false,reason:'Place the selected Bear Trap first.',moved:[],blocked:[]};
 if(![x,y].every(Number.isInteger))return {valid:false,reason:'Use whole-number coordinates.',moved:[],blocked:[]};
 const o=origin(s),dx=x-o.x-trap.x,dy=y-o.y-trap.y;
 const moved=s.slots.filter(p=>p.trap===Number(id)).map(p=>({id:p.id,x:p.x+dx,y:p.y+dy,w:p.w,h:p.h,trap:p.trap}));
 const nextTrap={...trap,x:trap.x+dx,y:trap.y+dy};
 const others=[...s.traps.filter(t=>t.id!==Number(id)),...s.structures,...s.blocks,...s.slots.filter(p=>p.trap!==Number(id))];
 const blocked=[];
 if(worldBlocked(s,nextTrap,'trap')||others.some(b=>H.overlap(nextTrap,b)))blocked.push('Bear Trap footprint');
 for(const p of moved)if(worldBlocked(s,p,'city')||others.some(b=>H.overlap(p,b))||H.overlap(p,nextTrap))blocked.push(p.id);
 const locked=s.members.filter(m=>m.locked&&m.slot&&moved.some(p=>p.id===m.slot));
 if((dx||dy)&&locked.length)blocked.push(...locked.map(m=>m.name));
 return {valid:blocked.length===0,reason:blocked.length?'The shifted formation conflicts with terrain, other objects or locked cities.':'Whole formation can shift without model-detected collisions.',moved,blocked,trap:{x,y},offsetX:dx,offsetY:dy,terrainVerified:false};
}
H.previewTrapShift=previewTrapShift;
// Adapt individual city slots around obstacles while preserving their identities.
// Locked occupied slots cannot move. This is a read-only proposed layout.
function previewAdaptiveReflow(s,id,x,y,{radius=8}={}){
 if(!Number.isInteger(radius)||radius<0||radius>20)throw Error('Choose a reflow radius from 0 to 20.');
 const initial=previewTrapShift(s,id,x,y);
 if(!initial.trap)return {...initial,adapted:true,unplaced:[]};
 const trap=s.traps.find(t=>t.id===Number(id)),o=origin(s);
 const box={...trap,x:x-o.x,y:y-o.y};
 const fixed=[...s.traps.filter(t=>t.id!==Number(id)),...s.blocks,...s.structures,...s.slots.filter(p=>p.trap!==Number(id)),box];
 const slots=s.slots.filter(p=>p.trap===Number(id));
 const membersBySlot=new Map(s.members.filter(m=>m.slot).map(m=>[m.slot,m]));
 const placed=[],unplaced=[],used=[];
 const search=[];
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)search.push({dx,dy,d:Math.abs(dx)+Math.abs(dy)});
 search.sort((a,b)=>a.d-b.d||Math.abs(a.dy)-Math.abs(b.dy)||a.dy-b.dy||a.dx-b.dx);
 // Place locked occupied slots first at their original positions.
 const ordered=[...slots].sort((a,b)=>Number(!!membersBySlot.get(b.id)?.locked)-Number(!!membersBySlot.get(a.id)?.locked));
 for(const slot of ordered){
  const locked=!!membersBySlot.get(slot.id)?.locked;
  const preferred={...slot,x:slot.x+initial.offsetX,y:slot.y+initial.offsetY};
  const choices=locked?[{dx:-initial.offsetX,dy:-initial.offsetY}]:search;
  let found=null;
  for(const offset of choices){
   const candidate={...preferred,x:preferred.x+offset.dx,y:preferred.y+offset.dy};
   if(worldBlocked(s,candidate,'city')||fixed.some(b=>H.overlap(candidate,b))||used.some(b=>H.overlap(candidate,b)))continue;
   found=candidate;break;
  }
  if(found){used.push(found);placed.push({...found,shifted:found.x!==slot.x||found.y!==slot.y,locked})}
  else unplaced.push({id:slot.id,locked,member:membersBySlot.get(slot.id)?.name||null});
 }
 const trapBlocked=worldBlocked(s,box,'trap')||fixed.slice(0,-1).some(b=>H.overlap(box,b));
 return {valid:!trapBlocked&&!unplaced.length,adapted:true,trap:{x,y},moved:placed,unplaced,blocked:[...(trapBlocked?['Bear Trap footprint']:[]),...unplaced.map(p=>p.id)],reason:trapBlocked?'Bear Trap position conflicts with a fixed object.':unplaced.length?'Some city slots cannot be placed without collisions.':'Proposed reflow avoids model-detected collisions.',terrainVerified:false};
}
H.previewAdaptiveReflow=previewAdaptiveReflow;
// Rank verified-by-model proposals with distinct, transparent priorities.
// Scores are comparative only; no claim of optimality or in-game verification.
function compareTrapScenarios(s,id,{radius=8,reflowRadius=8}={}){
 const candidates=suggestTrapPositions(s,id,{radius,limit:20});
 const source=s.traps.find(t=>t.id===Number(id));
 if(!source)return [];
 const scored=candidates.map(p=>{
  const preview=previewAdaptiveReflow(s,id,p.x,p.y,{radius:reflowRadius});
  const originals=new Map(s.slots.filter(q=>q.trap===Number(id)).map(q=>[q.id,q]));
  let moves=0,totalMovement=0,compactness=0;
  for(const q of preview.moved){
   const old=originals.get(q.id);
   if(old){const d=Math.abs(q.x-old.x)+Math.abs(q.y-old.y);if(d)moves++;totalMovement+=d}
   compactness+=Math.abs(q.x+q.w/2-(p.x-origin(s).x+1.5))+Math.abs(q.y+q.h/2-(p.y-origin(s).y+1.5));
  }
  return {...p,valid:preview.valid,moves,totalMovement,compactness,unplaced:preview.unplaced.length,conflicts:preview.blocked.length};
 });
 const valid=scored.filter(p=>p.valid);
 if(!valid.length)return [];
 const rank=(label,fn)=>({label,...[...valid].sort((a,b)=>fn(a)-fn(b)||a.distance-b.distance||a.y-b.y||a.x-b.x)[0]});
 return [
  rank('Most compact',p=>p.compactness),
  rank('Least disruption',p=>p.moves*10000+p.totalMovement*10+p.distance),
  rank('Terrain adapted',p=>p.compactness+p.totalMovement*2+p.distance*5)
 ];
}
H.compareTrapScenarios=compareTrapScenarios;

// Apply only a freshly recalculated, fully valid adaptive preview.
// Callers retain the original state for undo and must explicitly confirm.
function applyAdaptiveReflow(s,id,x,y,{radius=8}={}){
 const preview=previewAdaptiveReflow(s,id,x,y,{radius});
 if(!preview.valid||preview.unplaced.length)throw Error(preview.reason||'Relocation is not valid.');
 const n=copy(s),o=origin(n),trap=n.traps.find(t=>t.id===Number(id));
 if(!trap)throw Error('The selected Bear Trap does not exist.');
 const byId=new Map(preview.moved.map(p=>[p.id,p]));
 for(const slot of n.slots.filter(p=>p.trap===Number(id))){
  const target=byId.get(slot.id);
  if(!target)throw Error('A planned city slot is missing from the relocation.');
  slot.x=target.x;slot.y=target.y;
 }
 trap.x=x-o.x;trap.y=y-o.y;
 const xKey=Number(id)===1?'anchorX':'anchor2X',yKey=Number(id)===1?'anchorY':'anchor2Y';
 n.settings[xKey]=x;n.settings[yKey]=y;
 for(const m of n.members.filter(m=>m.slot&&byId.has(m.slot))){
  const target=byId.get(m.slot),original=s.slots.find(p=>p.id===m.slot);
  if(m.locked&&(target.x!==original.x||target.y!==original.y))throw Error('Locked player cannot be relocated.');
  if(target.x!==original.x||target.y!==original.y){m.confirmed=false;m.verified=false}
 }
 // Verify the complete result, including city-to-city and trap collisions.
 for(const slot of n.slots.filter(p=>p.trap===Number(id))){
  if(worldBlocked(n,slot,'city')||n.traps.some(t=>H.overlap(t,slot))||
    [...n.blocks,...n.structures,...n.slots.filter(p=>p.id!==slot.id)].some(b=>H.overlap(b,slot)))
   throw Error('Relocation validation failed for city slot '+slot.id);
 }
 return {state:n,preview};
}
H.applyAdaptiveReflow=applyAdaptiveReflow;




H.worldAt=at;H.worldOrigin=origin;H.worldBlocked=worldBlocked;H.worldFeatures=features;H.syncMapCoordinates=sync;H.changeMapReference=reference;
H.worldSource={name:'WOS Nerds community world map',url:'https://github.com/wosnerdwarriors/wos-data/tree/main/data/worldmap',revision:'802a263238893581b1ae7fc38914fa660f37b42f',tiles:198365,coverage:'1200 × 1200; state-specific differences and missing nodes are not verified'};
if(typeof module!=='undefined')module.exports=H;
})(typeof window!=='undefined'?window:globalThis);
