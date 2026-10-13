import { calculate, CLASSES } from './model.js';
export const TROOP_TYPES = ['infantry', 'lancer', 'marksman'];
const LEVELS = [11, 10, 9];

// Inferred mixed-tier extension: preserve the source's class-level sqrt(count)
// term, weighting that class's coefficient by its actual troop counts.
// Splitting identical troops into two buckets must never increase the score.
export function mixedModel(profile, inventory, db) {
  const base = calculate(profile, db);
  const classes = TROOP_TYPES.map((type, i) => {
    const fc = /^FC(\d+)/.exec(profile.tiers[i])?.[1];
    return LEVELS.map(level => {
      const count = inventory[`t${level}`]?.[type] ?? 0;
      if (!Number.isSafeInteger(count) || count < 0) throw new Error('Check the troop amounts in your inventory.');
      const selectedFc = inventory.fcByTier?.[`t${level}`]?.[type] ?? Number(fc);
      const tier = `FC${selectedFc} T${level}`;
      if (count && !db.troopDamageStats[tier]) throw new Error(`${CLASSES[i]}: check FC and troop tier in your inventory.`);
      const coefficient = count ? calculate({ ...profile, tiers:profile.tiers.map((t,j) => j===i ? tier : t) },db).damage[i] : 0;
      return { tier:`t${level}`, fc:Number(selectedFc), count, coefficient };
    });
  });
  // Preserve the source display normalization, including its zero-Chameleon fallback.
  const factor = (1+base.widgetL)*(1+base.widgetA)*(profile.petsActive ? 1+(Number(profile.chameleon)||10)/100 : 1)*1.3/23400;
  return { base, classes, factor };
}
export function classMix(entries, amount) {
  let left=amount, weighted=0;
  const breakdown={t11:0,t10:0,t9:0};
  for (const entry of entries) {
    const count=Math.min(left,entry.count);
    breakdown[entry.tier]=count;weighted+=entry.coefficient*count;left-=count;
  }
  const used=amount-left;
  return { ...breakdown,total:used,contribution:used>0 ? weighted/Math.sqrt(used) : 0 };
}
export function scoreRally(model, breakdown) {
  let deployed=0;
  const classes=model.classes.map((entries,i)=>{
    const counts=breakdown[TROOP_TYPES[i]] ?? {};
    let total=0, weighted=0;
    for (const e of entries) {
      const count=counts[e.tier] ?? 0;
      if (!Number.isSafeInteger(count)||count<0||count>e.count) throw new Error('The rally exceeds your available troops.');
      total+=count;weighted+=count*e.coefficient;
    }
    deployed+=total;
    return total ? weighted/Math.sqrt(total):0;
  });
  if(deployed>model.base.capacity)throw new Error('The rally exceeds deployment capacity.');
  return classes.reduce((a,b)=>a+b,0)*model.factor;
}

// Branch-and-bound over whole troop counts and tier-transition segments.
// Concave pieces are solved exactly; convex chords bound the remaining pieces.
function push(heap,node){heap.push(node);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].upper>=node.upper)break;heap[i]=heap[p];i=p;}heap[i]=node;}
function pop(heap){const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].upper>heap[child].upper)child++;if(heap[child].upper<=last.upper)break;heap[i]=heap[child];i=child;}heap[i]=last;}return top;}
export function optimizeMixed(profile, inventory, db) {
  const model=mixedModel(profile,inventory,db);
  const stock=model.classes.map(entries=>entries.reduce((s,e)=>s+e.count,0));
  const total=Math.min(model.base.capacity,stock.reduce((a,b)=>a+b,0));
  const contribution=(i,n)=>classMix(model.classes[i],n).contribution;
  let best=-1, counts=[0,0,0];
  const heap=[];
  function visit(minCounts,maxCounts){
    const lo=[...minCounts],hi=[...maxCounts];
    for(let pass=0;pass<3;pass++)for(let i=0;i<3;i++){
      lo[i]=Math.max(lo[i],total-hi[(i+1)%3]-hi[(i+2)%3]);
      hi[i]=Math.min(hi[i],total-lo[(i+1)%3]-lo[(i+2)%3]);
    }
    if(lo.some((n,i)=>n>hi[i]))return;
    const concave=model.classes.map((entries,i)=>{
      if(hi[i]===lo[i])return true;
      let start=0,weighted=0;
      for(const e of entries){
        const end=start+e.count;
        if(e.count && lo[i]>=start && hi[i]<=end){
          const b=weighted-e.coefficient*start;
          return 3*b<=e.coefficient*lo[i]+1e-8;
        }
        weighted+=e.coefficient*e.count;start=end;
      }
      return false;
    });
    // On convex segments the endpoint chord is a tight upper bound. Actual
    // contributions on the remaining segments are concave. Their integer
    // resource allocation is solved by a shared marginal-gain threshold.
    const slopes=lo.map((v,i)=>hi[i]===v ? 0 : (contribution(i,hi[i])-contribution(i,v))/(hi[i]-v));
    const upperValue=(i,n)=>concave[i] ? contribution(i,n) : contribution(i,lo[i])+slopes[i]*(n-lo[i]);
    const gain=(i,n)=>concave[i] ? contribution(i,n+1)-contribution(i,n) : slopes[i];
    const active=[0,1,2].filter(i=>hi[i]>lo[i]);
    let low=active.length ? Math.min(...active.map(i=>gain(i,hi[i]-1)))-1 : 0;
    let high=active.length ? Math.max(...active.map(i=>gain(i,lo[i])))+1 : 1;
    const demand=lambda=>lo.map((v,i)=>{
      let a=v,b=hi[i];
      while(a<b){const mid=Math.ceil((a+b)/2);if(gain(i,mid-1)>=lambda)a=mid;else b=mid-1;}
      return a;
    });
    for(let k=0;k<65;k++){const mid=(low+high)/2;if(demand(mid).reduce((a,b)=>a+b,0)>total)low=mid;else high=mid;}
    const n=demand(high);let remaining=total-n.reduce((a,b)=>a+b,0);
    while(remaining>0){
      let winner=-1,bestGain=-Infinity;
      for(let i=0;i<3;i++)if(n[i]<hi[i]){const value=gain(i,n[i]);if(value>bestGain){bestGain=value;winner=i;}}
      if(winner<0)break;
      const add=concave[winner] ? 1 : Math.min(remaining,hi[winner]-n[winner]);n[winner]+=add;remaining-=add;
    }
    const value=n.reduce((sum,v,i)=>sum+contribution(i,v),0);
    if(value>best){best=value;counts=n;}
    const upper=n.reduce((sum,v,i)=>sum+upperValue(i,v),0)+1e-9;
    if(upper>best+1e-8 && concave.some((v,i)=>!v&&hi[i]>lo[i]))push(heap,{lo,hi,upper,concave});
  }

  const regions=model.classes.map(entries=>{
    const parts=[];let start=0,weighted=0;
    for(const e of entries){
      const end=Math.min(total,start+e.count);
      if(e.count && start<=total){
        const critical=e.coefficient ? Math.ceil(3*(weighted-e.coefficient*start)/e.coefficient):start;
        if(critical>start && critical<end){parts.push([start,critical],[critical,end]);}
        else parts.push([start,end]);
      }
      weighted+=e.coefficient*e.count;start+=e.count;
    }
    return parts.length ? parts : [[0,0]];
  });
  for(const a of regions[0])for(const b of regions[1])for(const c of regions[2])visit([a[0],b[0],c[0]],[a[1],b[1],c[1]]);
  let visited=0;
  const tolerance=.000001/Math.max(model.factor,1e-30);
  while(heap.length && heap[0].upper>best+tolerance && visited<12000){
    const box=pop(heap);visited++;
    let axis=box.concave.findIndex((v,i)=>!v&&box.hi[i]>box.lo[i]);
    for(let i=0;i<3;i++)if(!box.concave[i]&&box.hi[i]-box.lo[i]>box.hi[axis]-box.lo[axis])axis=i;
    const mid=Math.floor((box.lo[axis]+box.hi[axis])/2);
    const left=[...box.hi],right=[...box.lo];left[axis]=mid;right[axis]=mid+1;
    visit(box.lo,left);visit(right,box.hi);
  }
  const breakdown=Object.fromEntries(TROOP_TYPES.map((type,i)=>[type,classMix(model.classes[i],counts[i])]));
  const sourceBoost=Math.max(0,best)*model.factor;
  const scoreUpperBound=Math.max(Math.max(0,best),heap[0]?.upper??0)*model.factor;
  const raw=Math.max(0,best)*(1+model.base.widgetL)*(1+model.base.widgetA);
  return { ...model.base,raw,boost:raw*model.base.normalization,damage:counts.map((n,i)=>n ? contribution(i,n)/Math.sqrt(n):0),sourceBoost,counts,ratios:counts.map(n=>total ? n/total:0),capacity:total,
    requestedCapacity:model.base.capacity,shortfall:model.base.capacity-total,breakdown,model,
    scoreUpperBound,optimalAtDisplayPrecision:sourceBoost.toFixed(4)===scoreUpperBound.toFixed(4),visited,
    mixedTiers:true };
}
