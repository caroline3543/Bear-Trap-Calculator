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
};if(typeof module!=='undefined')module.exports=H;
})(typeof window!=='undefined'?window:globalThis);
