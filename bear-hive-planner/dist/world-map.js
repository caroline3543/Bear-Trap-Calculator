(function(root){
'use strict';const H=typeof module!=='undefined'?require('./reference-layout.js'):root.Hive,data=typeof module!=='undefined'?require('./world-data.js'):root.HiveWorldData;
const rows=new Map();for(const [y,x,n,k]of data){if(!rows.has(y))rows.set(y,[]);rows.get(y).push({x,n,k})}
const types={1:'Mountain',2:'Lake',3:'Building',4:'Castle',5:'Fortress / stronghold area',6:'Facility area',7:'Alliance resource node'};
const colors={1:'#89928b',2:'#8badc4',3:'#bb9a62',4:'#ac8cad',5:'#d9b9ac',6:'#b7d6ca',7:'#d4c68b'};
function origin(s){if(!s.mapOrigin){const t=s.traps.find(t=>t.id===1);s.mapOrigin={x:s.settings.anchorX-t.x,y:s.settings.anchorY-t.y}}return s.mapOrigin}
function at(x,y){return rows.get(y)?.find(r=>x>=r.x&&x<r.x+r.n)?.k||0}
function worldBlocked(s,b,kind='city'){const o=origin(s);for(let x=Math.floor(b.x);x<Math.ceil(b.x+b.w);x++)for(let y=Math.floor(b.y);y<Math.ceil(b.y+b.h);y++){const wx=o.x+x,wy=o.y+y;if(wx<0||wy<0||wx>=1200||wy>=1200)return true;const k=at(wx,wy);if(k&&k!==6&&(k!==5||kind!=='city'))return true}return false}
function features(s,bounds){const o=origin(s),out=[];for(let y=Math.max(0,Math.floor(bounds.y+o.y));y<Math.min(1200,Math.ceil(bounds.y+bounds.h+o.y));y++)for(const r of rows.get(y)||[]){const start=Math.max(r.x,Math.floor(bounds.x+o.x)),end=Math.min(r.x+r.n,Math.ceil(bounds.x+bounds.w+o.x));if(end>start)out.push({id:`world-${y}-${r.x}`,x:start-o.x,y:y-o.y,w:end-start,h:1,worldX:start,worldY:y,key:r.k,fixed:true,name:types[r.k],color:colors[r.k]})}return out}
function sync(s){const o=origin(s);for(const t of s.traps){const x=(t.id===1?s.settings.anchorX:s.settings.anchor2X)-o.x,y=(t.id===1?s.settings.anchorY:s.settings.anchor2Y)-o.y,dx=x-t.x,dy=y-t.y;if(dx||dy){for(const p of s.slots.filter(p=>p.trap===t.id)){p.x+=dx;p.y+=dy}t.x=x;t.y=y}}return s}
function reference(s,settings){const n=JSON.parse(JSON.stringify(s));origin(n);Object.assign(n.settings,settings);sync(n);if(n.traps.some(t=>worldBlocked(n,t,'trap'))||H.overlap(n.traps[0],n.traps[1]))throw Error('A Bear Trap overlaps fixed map terrain, a building or the other trap. Choose different coordinates.');const displaced=[];for(const m of n.members.filter(m=>m.slot)){const p=n.slots.find(p=>p.id===m.slot);if(!p||!H.validCityPosition(n,p,m.id)){if(m.locked)throw Error('The new coordinates conflict with locked city '+m.name+'. Unlock or move it first.');m.slot=null;m.confirmed=false;m.verified=false;displaced.push(m.name)}}return{state:n,displaced}}
const reset=H.factoryResetMap;H.factoryResetMap=s=>{const n=reset(s);origin(n);return n};
const load=H.loadLunLayout;H.loadLunLayout=s=>{const n=load(s);n.settings.anchorX=s.settings.anchorX;n.settings.anchorY=s.settings.anchorY;n.settings.anchor2X=s.settings.anchorX-9;n.settings.anchor2Y=s.settings.anchorY;n.mapOrigin={x:s.settings.anchorX-4,y:s.settings.anchorY+4};return n};
H.worldAt=at;H.worldOrigin=origin;H.worldBlocked=worldBlocked;H.worldFeatures=features;H.syncMapCoordinates=sync;H.changeMapReference=reference;
H.worldSource={name:'WOS Nerds community world map',url:'https://github.com/wosnerdwarriors/wos-data/tree/main/data/worldmap',revision:'802a263238893581b1ae7fc38914fa660f37b42f',tiles:198365,coverage:'1200 × 1200; state-specific differences and missing nodes are not verified'};
if(typeof module!=='undefined')module.exports=H;
})(typeof window!=='undefined'?window:globalThis);
