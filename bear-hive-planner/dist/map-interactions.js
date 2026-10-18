'use strict';
let mapPlacement=null,mapDrag=null,mapGesture=null,edgeFrame=null,holdTimer=null,tapTimer=null,lastTouchTap=null,momentumFrame=null;const mapPointers=new Map(),viewport=$('#mapViewport');
const gestureHint='Drag to pan · Tap an item to select · Pinch to zoom';
function mapXY(e){const b=viewport.getBoundingClientRect();return{x:e.clientX-b.left,y:e.clientY-b.top}}
function hitCity(p){return state.members.filter(m=>m.slot).map(m=>({m,s:slotBy(m.slot)})).find(({s})=>s&&visible(s)&&p.x>=s.x&&p.x<s.x+2&&p.y>=s.y&&p.y<s.y+2)}
function applyCityMove(id,x,y){try{const m=state.members.find(m=>m.id===id),old=slotBy(m?.slot);if(old?.x===x&&old?.y===y){setTool('select');return}const next=Hive.moveCity(state,id,x,y);commit(()=>state=next);setTool('select');selectedMember=id;renderMap();toast('City moved. Undo is available.')}catch(e){toast(e.message)}}
const plainRenderMap=renderMap;renderMap=function(){plainRenderMap();const draft=mapPlacement||(mapDrag&&!mapDrag.locked?{...mapDrag.box,x:mapDrag.x,y:mapDrag.y,valid:canDragItem(mapDrag.ref,mapDrag.x,mapDrag.y)}:null);if(!draft)return;const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');poly.setAttribute('points',polygon(draft));poly.setAttribute('fill',draft.valid?'#7cac78':'#d08a7a');poly.setAttribute('fill-opacity','.28');poly.setAttribute('stroke',draft.valid?'#244f31':'#9b3027');poly.setAttribute('stroke-width','3');poly.setAttribute('stroke-dasharray','6 3');poly.setAttribute('pointer-events','none');poly.setAttribute(mapPlacement?'data-placement-preview':'data-drag-preview',draft.valid?'valid':'invalid');$('#mapSvg').appendChild(poly);const origin=Hive.worldOrigin(state);$('#mapHint').textContent=(draft.valid?'✓ Release to place':'× Blocked · release to cancel')+' · X:'+(origin.x+draft.x)+' Y:'+(origin.y+draft.y)};
function updateDrag(){if(!mapDrag)return;const p=screenWorld(mapDrag.screen.x,mapDrag.screen.y);mapDrag.x=Math.round(p.x-mapDrag.offset.x);mapDrag.y=Math.round(p.y-mapDrag.offset.y);renderMap()}
function edgePan(){const d=mapPlacement||mapDrag;if(!d||(!mapPlacement&&!mapDrag?.started)){edgeFrame=null;return}const b=viewport.getBoundingClientRect(),p=d.screen,pad=32,speed=7,dx=p.x<pad?speed:p.x>b.width-pad?-speed:0,dy=p.y<pad?speed:p.y>b.height-pad?-speed:0;if(dx||dy){camera.x+=dx;camera.y+=dy;mapPlacement?updatePlacement():updateDrag()}edgeFrame=requestAnimationFrame(edgePan)}
function clearDrag(){clearTimeout(holdTimer);holdTimer=null;if(edgeFrame)cancelAnimationFrame(edgeFrame);edgeFrame=null;mapPlacement=null;mapDrag=null;renderMap();$('#mapHint').textContent=placementHint()}
function stopMomentum(){if(momentumFrame)cancelAnimationFrame(momentumFrame);momentumFrame=null}
function startMomentum(vx,vy){if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;let frames=0;const step=()=>{vx*=.9;vy*=.9;if(++frames>35||Math.hypot(vx,vy)<.4){momentumFrame=null;return}camera.x+=vx;camera.y+=vy;renderMap();momentumFrame=requestAnimationFrame(step)};momentumFrame=requestAnimationFrame(step)}
function pair(){const a=[...mapPointers.values()];return{distance:Math.max(1,Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)),x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2}}
function cancelMapGesture(){clearTimeout(tapTimer);lastTouchTap=null;mapPointers.clear();mapGesture=null;clearDrag();stopMomentum()}
function selectableHit(p){const hit=hitDraggable(p);if(hit)return hit;const t=state.traps.find(t=>visible({...t,trap:t.id})&&p.x>=t.x&&p.x<t.x+t.w&&p.y>=t.y&&p.y<t.y+t.h);if(t)return{ref:{kind:'trap',id:t.id}};const origin=Hive.worldOrigin(state);if(state.mapMode==='terrain'&&Hive.worldAt(origin.x+Math.floor(p.x),origin.y+Math.floor(p.y)))return{ref:{kind:'fixed',id:Math.floor(p.x)+':'+Math.floor(p.y)}};return null}
function sameMapRef(a,b){return !!a&&!!b&&a.kind===b.kind&&a.id===b.id}
function deselectMapItem(){selectedMapItem=null;selectedSlot=null;selectedMember=null;renderMap();renderQueue()}
viewport.addEventListener('pointerdown',e=>{
 stopMomentum();if(e.target.closest('.map-controls,[data-map-action]')||e.button>0)return;
 viewport.setPointerCapture(e.pointerId);const screen=mapXY(e),world=screenWorld(screen.x,screen.y),touch=e.pointerType==='touch';mapPointers.set(e.pointerId,screen);
 if(mapPointers.size>1){lastTouchTap=null;clearDrag();const p=pair();mapGesture={multi:true,moved:false,begin:performance.now(),pair:p,initial:p};return}
 const hit=selectableHit(world),key=hit?hit.ref.kind+':'+hit.ref.id:'empty',quick=tool==='select'&&lastTouchTap&&lastTouchTap.key===key&&performance.now()-lastTouchTap.time<320&&Math.hypot(screen.x-lastTouchTap.x,screen.y-lastTouchTap.y)<28;
 lastTouchTap=null;mapGesture={quick:!!quick,hit,key,start:screen,last:screen,moved:false,target:e.target,touch,time:performance.now(),vx:0,vy:0};
 if(!readonly&&isPlacementTool(tool)){mapPlacement={tool,screen,touch};updatePlacement();edgeFrame=requestAnimationFrame(edgePan);return}
 if(!readonly&&tool==='select'&&hit?.box&&sameMapRef(hit.ref,selectedMapItem)){mapDrag={id:hit.ref.id,ref:hit.ref,box:hit.box,locked:hit.locked,x:hit.box.x,y:hit.box.y,screen,offset:{x:world.x-hit.box.x,y:world.y-hit.box.y},started:false,armed:true};renderMap()}
});
viewport.addEventListener('pointermove',e=>{
 if(!mapPointers.has(e.pointerId)||!mapGesture)return;const p=mapXY(e),old=mapPointers.get(e.pointerId);mapPointers.set(e.pointerId,p);
 if(mapPointers.size>1){const next=pair(),prev=mapGesture.pair;if(prev){camera.x+=next.x-prev.x;camera.y+=next.y-prev.y;zoom(next.distance/prev.distance,next.x,next.y);const first=mapGesture.initial;if(Math.abs(next.distance-first.distance)>6||Math.hypot(next.x-first.x,next.y-first.y)>6)mapGesture.moved=true}mapGesture.pair=next;return}
 if(mapGesture.multi)return;if(mapPlacement){mapPlacement.screen=p;mapGesture.moved=true;updatePlacement();return}
 const distance=Math.hypot(p.x-mapGesture.start.x,p.y-mapGesture.start.y);if(distance>6)mapGesture.moved=true;if(!mapGesture.moved)return;
 if(mapGesture.quick&&!mapGesture.hit){zoom(Math.exp(-(p.y-mapGesture.last.y)*.012),mapGesture.start.x,mapGesture.start.y);mapGesture.last=p;return}
 if(mapDrag){if(mapDrag.locked){$('#mapHint').textContent='City locked. Unlock it before moving.';return}mapDrag.started=true;mapDrag.screen=p;updateDrag();if(!edgeFrame)edgeFrame=requestAnimationFrame(edgePan)}
 else{const dt=Math.max(8,performance.now()-mapGesture.time);mapGesture.vx=Math.max(-25,Math.min(25,(p.x-old.x)*16/dt));mapGesture.vy=Math.max(-25,Math.min(25,(p.y-old.y)*16/dt));mapGesture.time=performance.now();camera.x+=p.x-old.x;camera.y+=p.y-old.y;renderMap()}
});
viewport.addEventListener('pointerup',e=>{
 if(!mapPointers.has(e.pointerId))return;const g=mapGesture,d=mapDrag,placement=mapPlacement;mapPointers.delete(e.pointerId);
 if(mapPointers.size){if(g?.multi){g.hadMovement=g.moved;g.pair=null;g.moved=true}return}
 mapGesture=null;clearDrag();if(!g)return;
 if(g.multi){if(!(g.hadMovement??g.moved)&&performance.now()-g.begin<300)zoom(1/1.8,g.initial.x,g.initial.y);return}
 if(placement){applyPlacement(placement);return}if(d?.started){applyDragItem(d.ref,d.x,d.y);return}
 if(g.moved){if(g.touch&&!d&&!g.quick&&performance.now()-g.time<80)startMomentum(g.vx,g.vy);return}
 if(tool==='select'){if(g.quick){if(g.hit)mapTap(e,g.target);else zoom(1.8,g.start.x,g.start.y)}else{if(g.hit)mapTap(e,g.target);else deselectMapItem();lastTouchTap={...mapXY(e),key:g.key,time:performance.now()}}return}
 mapTap(e,g.target);
});
viewport.addEventListener('pointercancel',cancelMapGesture);viewport.addEventListener('lostpointercapture',e=>{if(mapPointers.has(e.pointerId))cancelMapGesture()});
viewport.addEventListener('wheel',e=>{e.preventDefault();stopMomentum();const p=mapXY(e);zoom(Math.exp(-e.deltaY*.002),p.x,p.y)},{passive:false});
viewport.addEventListener('contextmenu',e=>e.preventDefault());viewport.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});viewport.addEventListener('gesturechange',e=>e.preventDefault(),{passive:false});
window.addEventListener('pointerdown',e=>{if(!viewport.contains(e.target)){stopMomentum();if(mapPointers.size||mapGesture||mapDrag||mapPlacement)cancelMapGesture()}},true);window.addEventListener('blur',cancelMapGesture);window.addEventListener('keydown',e=>{if(e.key==='Escape')cancelMapGesture()});
