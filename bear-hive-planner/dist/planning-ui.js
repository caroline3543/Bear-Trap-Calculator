'use strict';
// A larger canvas is a view preference. It never changes saved coordinates.
let expandedMap=false,planningScrollY=0,planningSize=null,planningFrame=null,planningSelectionKey=null;
const planningPanel=$('#mapPlannerPanel');
function resizePlanningCanvas(preserveCenter=false){
 const b=viewport.getBoundingClientRect();if(!b.width||!b.height)return;
 if(planningSize&&preserveCenter){camera.x+=(b.width-planningSize.width)/2;camera.y+=(b.height-planningSize.height)/2}
 planningSize={width:b.width,height:b.height};renderMap();
}
function setExpandedMap(on){
 if(expandedMap===on)return;cancelMapGesture();
 if(on)planningScrollY=window.scrollY;
 expandedMap=on;document.body.classList.toggle('expanded-map',on);
 $('#expandMapBtn').setAttribute('aria-pressed',String(on));$('#expandMapBtn').setAttribute('aria-label',on?'Exit expanded map':'Expand map');$('#expandMapBtn').querySelector('span').textContent=on?'Exit':'Expand';
 $('#mapOptionsMenu').open=false;$('#itemMenu').open=false;
 for(const selector of ['header','aside','.page-heading','.right-panel','footer']){const el=document.querySelector(selector);if(el)el.inert=on}
 resizePlanningCanvas(true);
 if(!on){window.scrollTo({top:planningScrollY,behavior:'auto'});$('#expandMapBtn').focus({preventScroll:true})}
}
$('#expandMapBtn').onclick=()=>setExpandedMap(!expandedMap);
$('#placementDoneBtn').onclick=finishMapEditing;
function openAllPlanningPlayers(){
 const trap=queueTrap();openModal(`<h2>${selectedEmptyCity()?'Who goes here?':'Players to place'} · ${trap?'BT '+trap:'Other players'}</h2><label>Find a player<input id="planningPlayerSearch" type="search" placeholder="Name or player ID" autocomplete="off"></label><small id="planningPlayerGroup"></small><div id="planningPlayerChoices" class="sheet-list"></div><button id="planningManageList">Add players to a BT list</button>`);
 const show=()=>{const q=$('#planningPlayerSearch').value,group=trap?Hive.slotAttendanceGroup(state,trap,{query:q}):null,members=group?.members||state.members.filter(m=>!m.trap&&!m.slot&&(m.name+' '+m.playerId).toLocaleLowerCase().includes(q.toLocaleLowerCase()));$('#planningPlayerGroup').textContent=group?.label||'Choose a BT list before placing these players.';$('#planningPlayerChoices').innerHTML=members.map(m=>`<button data-planning-player="${esc(m.id)}"><strong>${esc(m.name)}</strong></button>`).join('')||'<p class="muted">No matches in this attendance group.</p>';$$('[data-planning-player]').forEach(b=>b.onclick=()=>{const m=state.members.find(m=>m.id===b.dataset.planningPlayer);if(!m.trap){closeModal();memberDetail(m.id);return}const before=m.slot;assignQueuedPlayer(m.id);if(state.members.find(p=>p.id===m.id)?.slot!==before)closeModal()})};$('#planningPlayerSearch').oninput=show;$('#planningManageList').onclick=openBTListEditor;show();
}
$('#planningAllPlayers').onclick=openAllPlanningPlayers;
const openManagedBTList=$('#addToBTList').onclick;$('#addToBTList').onclick=()=>{$('#queueManageMenu').open=false;openManagedBTList()};
const syncManagedBTLists=$('#syncBTLists').onclick;$('#syncBTLists').onclick=()=>{syncManagedBTLists();$('#queueManageMenu').open=false};
function renderContextualPlayers(){
 const panel=$('#memberQueueSection'),item=mapItem(selectedMapItem);
 panel.hidden=readonly||isPlacementTool(tool)||!!item&&item.ref.kind!=='slot';
 panel.classList.toggle('choosing-city',!!selectedEmptyCity());
}
function renderPlanningLoupe(){
 const el=$('#placementLoupe'),d=mapPlacement||(mapDrag?.started&&!mapDrag.locked?mapDrag:null);
 if(!d?.touch){el.hidden=true;return}
 const center=point(d.x+(d.w||d.box?.w||1)/2,d.y+(d.h||d.box?.h||1)/2),valid=mapPlacement?d.valid:canDragItem(d.ref,d.x,d.y),o=Hive.worldOrigin(state),width=104,height=126;
 const left=d.screen.x+55+width<view.w?d.screen.x+55:d.screen.x-width-55;
 el.hidden=false;el.classList.toggle('invalid',!valid);el.style.left=Math.max(4,Math.min(view.w-width-4,left))+'px';el.style.top=Math.max(4,Math.min(view.h-height-4,d.screen.y-height-30))+'px';
 el.innerHTML=`<svg viewBox="${center.x-30} ${center.y-30} 60 60" aria-hidden="true">${$('#mapSvg').innerHTML.replace(/\s(?:tabindex|role|aria-label|data-[\w-]+)="[^"]*"/g,'')}</svg><small>${valid?'✓':'×'} X:${o.x+d.x} Y:${o.y+d.y}</small>`;
}
function renderPlanningChrome(){
 const placing=isPlacementTool(tool);$('#placementToolDock').hidden=!placing||readonly;
 $('#placementToolLabel').textContent=({slot:'+ City',flag:'Banner',block:'Mountain',water:'Water',node:'Alliance node',farm:'Farm node',mine:'Iron mine',wood:'Wood node',coal:'Coal node',iron:'Iron node',hq:'Alliance HQ'})[tool]||'';
 $('#placementToolDock').classList.toggle('gesture-hidden',!!mapPointers.size);
 $('#loadLunBtn').disabled=readonly;$('#resetLayoutBtn').disabled=readonly;
 renderContextualPlayers();renderPlanningLoupe();
 const selectionKey=selectedMapItem?selectedMapItem.kind+':'+selectedMapItem.id:null;
 if(selectionKey&&selectionKey!==planningSelectionKey&&!expandedMap&&!readonly&&!mapPointers.size&&window.matchMedia?.('(max-width:720px)').matches)requestAnimationFrame(()=>{if(selectedMapItem&&selectedMapItem.kind+':'+selectedMapItem.id===selectionKey&&!expandedMap&&!mapPointers.size)$('#mapItemActions').scrollIntoView?.({block:'nearest',behavior:'auto'})});
 planningSelectionKey=selectionKey;
 // SVG buildings support the same selection and Done workflow by keyboard.
 $$('#mapSvg [data-slot]').forEach(el=>el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();const m=memberAt(el.dataset.slot);selectedMapItem={kind:m?'member':'slot',id:m?m.id:el.dataset.slot};selectedSlot=el.dataset.slot;if(!readonly){setTool('select');renderMap();renderQueue()}}});
}
const planningBaseMap=renderMap;renderMap=function(){planningBaseMap();renderPlanningChrome()};
const planningBaseQueue=renderQueue;renderQueue=function(){planningBaseQueue();renderContextualPlayers()};
const planningBaseTool=setTool;setTool=function(t){planningBaseTool(t);renderPlanningChrome()};
const planningNavigate=navigate;navigate=function(p){if(p!=='map'&&expandedMap)setExpandedMap(false);planningNavigate(p)};
$$('#trapTabs button').forEach(b=>{const prior=b.onclick;b.onclick=()=>{$('#queueSearch').value='';finishMapEditing();if(b.dataset.trap!=='all'){state.operations.rosterGroup=+b.dataset.trap;state.operations.trap=+b.dataset.trap}prior()}});
$('#mapOptionsMenu').addEventListener('click',e=>{if(e.target.closest('#loadLunBtn,#resetLayoutBtn,#viewBtn,[data-map-mode]'))$('#mapOptionsMenu').open=false});
document.addEventListener('pointerdown',e=>{if(!$('#mapOptionsMenu').contains(e.target))$('#mapOptionsMenu').open=false;if(!$('#itemMenu').contains(e.target))$('#itemMenu').open=false;if(!$('#queueManageMenu').contains(e.target))$('#queueManageMenu').open=false});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#modal').open)return;$('#mapOptionsMenu').open=false;$('#itemMenu').open=false;if(expandedMap)setExpandedMap(false)}});
planningSize={width:viewport.getBoundingClientRect().width,height:viewport.getBoundingClientRect().height};
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(planningFrame)cancelAnimationFrame(planningFrame);planningFrame=requestAnimationFrame(()=>{planningFrame=null;resizePlanningCanvas()})}).observe(viewport);
renderMap();renderQueue();
