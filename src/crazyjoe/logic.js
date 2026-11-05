/** Crazy Joe evacuation planner. No combat-score predictions or assumed troop inventory. */
export const count = (v) => typeof v === 'string' && !/^\d+$/.test(v) ? null : Number.isSafeInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 1000000000 ? Number(v) : null;
export const DEFAULT_JOE = { infantry: '', lancer: '', marches: 6, capacity: '', different: false, capacities: Array(6).fill(''), spaces: Array(6).fill(''), pet: '', minister: 0, item: 0, measured: false };
export function cleanJoe(raw = {}) {
  const field = (v) => v !== '' && v != null && count(v) != null ? String(v) : '';
  return { infantry: field(raw.infantry), lancer: field(raw.lancer), marches: [1,2,3,4,5,6].includes(Number(raw.marches)) ? Number(raw.marches) : 6,
    capacity: field(raw.capacity), different: raw.different === true, measured: raw.measured === true,
    capacities: Array.from({length:6}, (_,i) => field(raw.capacities?.[i])), spaces: Array.from({length:6}, (_,i) => field(raw.spaces?.[i])),
    pet: field(raw.pet), minister: [2500,3750].includes(Number(raw.minister)) ? Number(raw.minister) : 0,
    item: [10,20].includes(Number(raw.item)) ? Number(raw.item) : 0 };
}
/** Largest remainders distribute whole troops evenly in proportion to usable march space. */
function spread(total, caps) {
  const sum = caps.reduce((a,b) => a+b,0);
  if (!sum || !total) return caps.map(() => 0);
  const exact = caps.map(c => total * c / sum);
  const out = exact.map(Math.floor);
  let left = total - out.reduce((a,b)=>a+b,0);
  const order = caps.map((_,i)=>i).sort((a,b) => (exact[b]-out[b])-(exact[a]-out[a]) || a-b);
  for (const i of order) { if (!left) break; if(out[i]<caps[i]) {out[i]++;left--;} }
  return out;
}
export function allocateJoe(infantry, lancer, capacities) {
  const space = capacities.reduce((a,b)=>a+b,0);
  const sendInf = Math.min(infantry,space), sendLan = Math.min(lancer,space-sendInf);
  const inf = spread(sendInf,capacities), lan = spread(sendLan,capacities.map((c,i)=>c-inf[i]));
  return { space, sent: sendInf+sendLan, leftInf: infantry-sendInf, leftLan: lancer-sendLan,
    left: infantry+lancer-sendInf-sendLan,
    rows: capacities.map((capacity,i)=>({capacity, infantry:inf[i], lancer:lan[i], total:inf[i]+lan[i]})) };
}
export function calculateJoe(input) {
  const f=cleanJoe(input), infantry=count(f.infantry), lancer=count(f.lancer);
  const bases=Array.from({length:f.marches},(_,i)=>count(f.different?f.capacities[i]:f.capacity));
  if(infantry==null || lancer==null || bases.some(c=>c==null||c<1)) return null;
  const scenarios=[];
  for(const percent of f.measured ? [0] : [0,10,20].filter(v=>v<=f.item))
    for(const pet of !f.measured && count(f.pet)>0 ? [0,count(f.pet)] : [0])
      for(const minister of !f.measured && f.minister ? [0,f.minister] : [0]) {
        // Same flat-then-percent model as the app's Bear Trap capacity calculator.
        const marchCaps=bases.map(b=>Math.floor((b+pet+minister)*(100+percent)/100));
        const caps=marchCaps.map((c,i)=>f.spaces[i]===''?c:Math.min(c,count(f.spaces[i])));
        const plan=allocateJoe(infantry,lancer,caps);
        scenarios.push({...plan, percent,pet,minister,marchCaps,actions:Number(!!percent)+Number(!!pet)+Number(!!minister),key:`${percent}-${pet}-${minister}`});
      }
  // Fewest activations first; prefer no item, then the smaller item, then avoid booking a position.
  const compare=(a,b)=>a.actions-b.actions||a.percent-b.percent||a.minister-b.minister||a.pet-b.pet;
  const clears=scenarios.filter(s=>!s.left).sort(compare);
  const best=clears[0]||[...scenarios].sort((a,b)=>a.left-b.left||compare(a,b))[0];
  return { infantry,lancer,total:infantry+lancer,bases,scenarios,best,baseline:scenarios[0],required:Math.ceil((infantry+lancer)/f.marches) };
}
