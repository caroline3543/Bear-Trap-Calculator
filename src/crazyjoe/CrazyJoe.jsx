import React, { useState, useEffect } from 'react';
import { useTimeHub } from '../timehub/TimeHubContext.jsx';
import { cleanJoe, calculateJoe, resolveJoeTroops } from './logic.js';
import './crazyjoe.css';

function NumberInput({label,value,onChange,hint}) {
  return <label className="cj-field"><span>{label}</span><input inputMode="numeric" className="th-input" value={value} placeholder="0" onChange={e=>onChange(e.target.value.replace(/[^\d]/g,'').slice(0,9))}/>{hint&&<small>{hint}</small>}</label>;
}
export default function CrazyJoe({ inventory, scanner }) {
  const { activeAccountId, defaultAccountId, dataFor, updateAccount, lang, accountById }=useTimeHub();
  const accountId=activeAccountId || defaultAccountId;
  const form=cleanJoe(dataFor(accountId).crazyJoe);
  const [picked,setPicked]=useState(null);
  const [copied,setCopied]=useState(false);
  useEffect(()=>{setPicked(null);setCopied(false);},[accountId]);
  const fmt=n=>n.toLocaleString(lang);
  const patch=p=>{setPicked(null);setCopied(false);updateAccount(accountId,d=>({...d,crazyJoe:{...form,...p}}));};
  const troops=resolveJoeTroops(form,inventory,accountId);
  const result=calculateJoe(troops);
  const selected=result?.scenarios.find(s=>s.key===picked)||result?.best;
  const label=s=>[s.pet?`Snow Ape +${fmt(s.pet)}`:null,s.minister?`Strategy +${fmt(s.minister)}`:null,s.percent?`${s.percent}% capacity item`:null].filter(Boolean).join(' + ')||'No extra buffs';
  const copy=async()=>{const text=[`CRAZY JOE · ${accountById(accountId)?.name||'Account'}`,label(selected),...selected.rows.map((r,i)=>`March ${i+1}: ${fmt(r.infantry)} infantry / ${fmt(r.lancer)} lancers`),`At home: ${fmt(selected.leftInf)} infantry / ${fmt(selected.leftLan)} lancers`].join('\n');try{await navigator.clipboard.writeText(text);setCopied(true);}catch{setCopied(false);}};
  return <div className="cj-layout">
    <div className="cj-inputs">
      <section className="cj-card"><h2>1. Your troops</h2>
        <label className="cj-check"><input type="checkbox" checked={form.linked} onChange={e=>patch({linked:e.target.checked})}/>Use Bear Trap troops</label>
        {form.linked ? <>
          <p>Linked to <strong>{accountById(accountId)?.name}</strong>. Scanning updates both calculators.</p>
          {troops.infantry === '' ? <p className="cj-callout">{inventory?.demo ? 'These are example troops. Scan a screenshot or add your troops in Bear Trap.' : 'No linked troops yet. Add troops in Bear Trap or enter them manually.'}</p>
            : <div className="cj-stats"><div><strong>{fmt(Number(troops.infantry))}</strong><span>Infantry</span></div><div><strong>{fmt(Number(troops.lancer))}</strong><span>Lancers</span></div></div>}
          <p className="cj-help">Includes T9–T11. Turn off “Use Bear Trap troops” to adjust for lower tiers, injured troops or troops already marching.</p>
        </> : <><p>Enter troops ready to send. Leave out injured troops and troops already marching. Saved for Crazy Joe only.</p>
          <div className="cj-grid"><NumberInput label="Infantry" value={form.infantry} onChange={v=>patch({infantry:v})}/><NumberInput label="Lancers" value={form.lancer} onChange={v=>patch({lancer:v})}/></div></>}
        <div className="cj-scanner"><p className="cj-help">Scan from Profile → Troops, then check the numbers before saving.</p>{scanner || <p>Screenshot scanning is available in the Bear Trap app.</p>}
        {!form.linked && <p className="cj-help">Turn on “Use Bear Trap troops” to use your scan here.</p>}</div>
        <p className="cj-help">Infantry first, then lancers. Leave marksmen at home.</p>
      </section>
      <section className="cj-card"><h2>2. Your marches</h2><label className="cj-field"><span>Available marches</span><select className="th-input" value={form.marches} onChange={e=>patch({marches:Number(e.target.value)})}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n} {n===1?'march':'marches'}</option>)}</select></label>
        <p className="cj-help">Count only marches free to reinforce allies. Check capacity with the heroes you plan to send.</p>
        <label className="cj-check"><input type="checkbox" checked={form.measured} onChange={e=>patch({measured:e.target.checked})}/>Buffs already included</label>
        <p className="cj-help">{form.measured?'Enter the limit shown in game. No extra buffs will be added.':'Enter capacity before temporary pet, minister and city buffs. Include heroes and permanent bonuses.'}</p>
        {!form.different&&<NumberInput label="Capacity per march" value={form.capacity} onChange={v=>patch({capacity:v})}/>}
        <label className="cj-check"><input type="checkbox" checked={form.different} onChange={e=>patch({different:e.target.checked,capacities:form.capacities.map(v=>v||form.capacity)})}/>Set capacity for each march</label>
        <details><summary>March details</summary><p className="cj-help">Sending to an ally with limited space? Enter how many troops they can accept. Leave blank to use your full march capacity.</p>
          {Array.from({length:form.marches},(_,i)=><div className="cj-march-input" key={i}><b>March {i+1}</b>{form.different&&<NumberInput label={`March ${i+1} capacity`} value={form.capacities[i]} onChange={v=>patch({capacities:form.capacities.map((x,j)=>j===i?v:x)})}/>}<NumberInput label={`March ${i+1} ally’s free space (optional)`} value={form.spaces[i]} onChange={v=>patch({spaces:form.spaces.map((x,j)=>j===i?v:x)})}/></div>)}
        </details>
      </section>
      {!form.measured&&<section className="cj-card"><h2>3. Available buffs</h2><p>Choose the buffs you can use. We’ll recommend only what you need.</p>
        <NumberInput label="Snow Ape capacity bonus" hint="Enter the extra troops shown on the skill. Leave blank if you can’t use it." value={form.pet} onChange={v=>patch({pet:v})}/>
        <label className="cj-field"><span>Capacity items you have</span><select className="th-input" value={form.item} onChange={e=>patch({item:Number(e.target.value)})}><option value={0}>None</option><option value={10}>10% only</option><option value={20}>10% and 20%</option></select></label>
        <label className="cj-field"><span>Minister of Strategy</span><select className="th-input" value={form.minister} onChange={e=>patch({minister:Number(e.target.value)})}><option value={0}>Not available</option><option value={2500}>Normal: +2,500 per march</option><option value={3750}>Supreme: +3,750 per march</option></select></label>
        <p className="cj-help">10% and 20% items don’t stack.</p>
      </section>}
    </div>
    <div className="cj-results">
      <section className="cj-card cj-answer" aria-live="polite"><span className="cj-kicker">YOUR PLAN</span>
        {!result?<><h2>Complete your setup</h2><p>Add troops and march capacity to see your plan. Enter 0 if you have no troops of a type.</p></>:<>
          <h2>{!selected.left?'All infantry and lancers fit':`${fmt(selected.left)} troops stay home`}</h2>
          <p><strong>{label(selected)}</strong>{picked&&picked!==result.best.key?' · Preview':' · Recommended'}</p>
          <div className="cj-stats"><div><strong>{fmt(selected.sent)}</strong><span>To send</span></div><div><strong>{fmt(selected.leftInf)}</strong><span>Infantry at home</span></div><div><strong>{fmt(selected.leftLan)}</strong><span>Lancers at home</span></div></div>
          <p>{!selected.left
            ? selected.actions ? `These buffs let you send ${fmt(result.baseline.left-selected.left)} more troops.` : 'No extra buffs needed.'
            : selected.key===result.best.key
              ? 'Free a march or increase march or ally capacity to send more troops.'
              : 'Try the recommended option to send more troops.'}</p>
          <p className="cj-help">Space needed: {fmt(result.required)} per march on average.</p>
          {selected.minister>0&&<p className="cj-callout">Hold Minister of Strategy when you send. Keep all selected buffs active for redeployments.</p>}
          <div className="cj-table-wrap"><table><caption>Send these troops</caption><thead><tr><th>March</th><th>Infantry</th><th>Lancers</th><th>Total / limit</th></tr></thead><tbody>{selected.rows.map((r,i)=><tr key={i}><th>{i+1}</th><td>{fmt(r.infantry)}</td><td>{fmt(r.lancer)}</td><td>{fmt(r.total)} / {fmt(r.capacity)}</td></tr>)}</tbody></table></div>
          <button type="button" className="cj-button" onClick={copy}>{copied?'Copied':'Copy march plan'}</button>
          {!form.measured&&<><p className="cj-help">Check the suggested limits in game before sending.</p><details><summary>About capacity estimates</summary><p>We add Snow Ape and Strategy bonuses to your base capacity, then apply the capacity item and round down. If the game shows a different limit, turn on “Buffs already included” and enter that limit.</p></details></>}
        </>}
      </section>
      {result&&result.scenarios.length>1&&<section className="cj-card"><details><summary>Compare buffs</summary><p>Choose an option to preview its troop split.</p><div className="cj-options">{[...result.scenarios].sort((a,b)=>a.actions-b.actions||a.percent-b.percent||a.minister-b.minister).map(s=><button key={s.key} type="button" aria-pressed={selected.key===s.key} onClick={()=>{setPicked(s.key);setCopied(false);}}><span><b>{label(s)}</b>{s.key===result.best.key&&<small>Recommended</small>}</span><span>{fmt(s.left)} at home</span></button>)}</div></details></section>}
      <section className="cj-card"><h2>Before you start</h2><ul><li>Arrange incoming reinforcements before sending your troops out. Two failed defenses stop further attacks.</li><li>Reinforce online allies who have sent their infantry and lancers out. Avoid crowded cities.</li><li>Activate your selected buffs before sending.</li><li>After waves 9 and 19, follow your leader’s plan for HQ waves 10 and 20.</li><li>Stay online for waves 7, 14 and 17. Don’t teleport during the event.</li><li>If you heal troops, send them back out so allies can keep earning kills in your city.</li></ul>
        <details><summary>How this works</summary><p>We recommend the fewest buff activations. For a tie, we prefer no capacity item, then the smaller item, then no minister booking. Nothing is activated in game.</p><p>The plan sends as many infantry and lancers as your marches can carry. Infantry take priority. It spreads troops by march size and does not predict points or choose your HQ formation.</p><p>Snow Ape and Minister of Strategy add march capacity. Minister of Education affects training; Iron Rhino affects rallies.</p><ul><li><a href="https://centurygames.helpshift.com/hc/en/64-whiteout-survival/section/1453-crazy-joe/" target="_blank" rel="noreferrer">Century Games: Crazy Joe rules</a></li><li><a href="https://www.whiteoutsurvival.wiki/events/crazy-joe/" target="_blank" rel="noreferrer">Crazy Joe community guide</a></li><li><a href="https://whiteoutdata.com/pets/snow-ape/" target="_blank" rel="noreferrer">Snow Ape skill values</a></li><li><a href="https://wosguru.com/crazy-joe" target="_blank" rel="noreferrer">Capacity boosts and minister positions</a></li></ul><p>Sources checked 5 November 2026. Always confirm your march limits in game.</p></details>
      </section>
    </div>
  </div>;
}
