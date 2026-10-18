(function(root){
'use strict';const H=typeof module!=='undefined'?require('./officer-model.js'):root.Hive;
H.moveMapItem=function(s,ref,x,y){
 if(ref.kind==='member'){const o=H.worldOrigin(s);if(![x,y].every(Number.isInteger)||x+o.x<0||y+o.y<0||x+o.x+2>1200||y+o.y+2>1200)throw Error('That position is outside the map.');return H.moveCity(s,ref.id,x,y)}
 const n=JSON.parse(JSON.stringify(s)),list=ref.kind==='slot'?n.slots:ref.kind==='terrain'?n.blocks:ref.kind==='object'?n.structures:null;
 const o=list?.find(o=>o.id===ref.id);if(!o)throw Error('This item is no longer on the map.');
 if(ref.kind==='slot'&&n.members.some(m=>m.slot===o.id))throw Error('Select the player city to move it.');
 const box={...o,x,y},origin=H.worldOrigin(n);
 if(![x,y].every(Number.isInteger)||x+origin.x<0||y+origin.y<0||x+origin.x+o.w>1200||y+origin.y+o.h>1200)throw Error('That position is outside the map.');
 if(H.worldBlocked(n,box,ref.kind==='slot'?'city':o.kind||'terrain')||[...n.traps,...n.slots,...n.blocks,...n.structures].some(b=>b!==o&&H.overlap(b,box)))throw Error('That position overlaps terrain or another item.');
 Object.assign(o,{x,y});if(ref.kind==='slot'){const t=n.traps.find(t=>t.id===o.trap);if(t)o.row=H.cityRow(o,t)}return n;
};
H.mapPlacementPreview=function(s,tool,x,y,trap=1){const kind={slot:'slot',block:'terrain',flag:'flag',hq:'hq'}[tool],size=kind==='slot'?2:kind==='hq'?3:1;trap=[1,2].includes(+trap)?+trap:1;const result={tool,kind,x,y,w:size,h:size,trap,valid:false,error:''};try{if(!kind)throw Error('Choose a placement tool.');const origin=H.worldOrigin(s);H.placeMapObject(s,kind,origin.x+x,origin.y+y,{trapId:trap});result.valid=true}catch(e){result.error=e.message}return result;
};
H.slotAttendanceGroup=function(s,trap,{query=''}={}){const eligible=H.rankedSlotMembers(s,trap).filter(m=>!m.slot&&!m.locked),kind=eligible.length?H.attendanceStats(s,eligible[0],trap).kind:null,label={regular:'Frequently',sometimes:'Sometimes',rarely:'Rarely',unknown:'Unknown'}[kind]||'',q=query.trim().toLocaleLowerCase(),members=eligible.filter(m=>H.attendanceStats(s,m,trap).kind===kind);return{kind,label,remaining:eligible.length,groupCount:members.length,members:members.filter(m=>!q||(m.name+' '+m.playerId).toLocaleLowerCase().includes(q))}};
H.assignAvailableSlotMember=function(s,slotId,memberId){const slot=s.slots.find(p=>p.id===slotId),m=s.members.find(m=>m.id===memberId);if(!m)throw Error('This player is no longer in the roster.');if(m.slot)throw Error('This player already has an allocation.');if(!slot||!H.slotAttendanceGroup(s,slot.trap).members.some(m=>m.id===memberId))throw Error('Choose a player from the current attendance group.');return H.assignSlotMember(s,slotId,memberId)};
if(typeof module!=='undefined')module.exports=H;
})(typeof window!=='undefined'?window:globalThis);
