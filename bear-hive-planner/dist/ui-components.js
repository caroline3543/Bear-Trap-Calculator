'use strict';
// Shared display helpers never change stored roster names or coordinates.
const cityLabelCache=new Map();let cityLabelCanvas=null,cityLabelContext=null;
function nameGraphemes(text){return typeof Intl!=='undefined'&&Intl.Segmenter?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(String(text))].map(p=>p.segment):Array.from(String(text))}
function cityNameLines(name,width,fontSize){
 width=Math.max(12,Math.round(width));const key=JSON.stringify([name,width,fontSize]);if(cityLabelCache.has(key))return cityLabelCache.get(key);
 if(!cityLabelCanvas){cityLabelCanvas=document.createElement('canvas');cityLabelContext=cityLabelCanvas.getContext?.('2d')||null}
 if(cityLabelContext)cityLabelContext.font=`600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
 const measure=text=>cityLabelContext?cityLabelContext.measureText(text).width:nameGraphemes(text).reduce((n,c)=>n+fontSize*(/[^\u0000-\u024f]/.test(c)?.95:.59),0);
 let remaining=nameGraphemes(name),lines=[];
 for(let line=0;line<2&&remaining.length;line++){
  const all=remaining.join('');if(measure(all)<=width){lines.push(all);break}
  if(line===1){let fit='';for(const c of remaining){if(measure(fit+c+'…')>width)break;fit+=c}lines.push(fit.trimEnd()+'…');break}
  if(measure(remaining[0])>width){lines.push('…');break}
  let count=0;while(count<remaining.length&&measure(remaining.slice(0,count+1).join(''))<=width)count++;
  count=Math.max(1,count);let boundary=-1;for(let i=0;i<count;i++)if(/\s/.test(remaining[i]))boundary=i;
  if(boundary>=count/2)count=boundary;
  lines.push(remaining.slice(0,count).join('').trimEnd());remaining=remaining.slice(count);while(remaining.length&&/\s/.test(remaining[0]))remaining.shift();
 }
 if(cityLabelCache.size>1500)cityLabelCache.clear();cityLabelCache.set(key,lines);return lines;
}

function roundedFootprint(o,radius=Math.min(8,camera.k*.2)){
 const corners=[[o.x,o.y],[o.x+o.w,o.y],[o.x+o.w,o.y+o.h],[o.x,o.y+o.h]].map(([x,y])=>point(x,y));
 const cornersWithTangents=corners.map((p,i)=>{const prev=corners[(i+3)%4],next=corners[(i+1)%4],a=Math.hypot(prev.x-p.x,prev.y-p.y),b=Math.hypot(next.x-p.x,next.y-p.y),r=Math.min(radius,a/4,b/4);return{p,entry:{x:p.x+(prev.x-p.x)*r/a,y:p.y+(prev.y-p.y)*r/a},exit:{x:p.x+(next.x-p.x)*r/b,y:p.y+(next.y-p.y)*r/b}}});
 return cornersWithTangents.map(({p,entry,exit},i)=>`${i?'L':'M'}${entry.x},${entry.y} Q${p.x},${p.y} ${exit.x},${exit.y}`).join(' ')+' Z';
}
