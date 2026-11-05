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
      <section className="cj-card"><h2>1. Troops available in your city</h2>
        <label className="cj-check"><input type="checkbox" checked={form.linked} onChange={e=>patch({linked:e.target.checked})}/>Link to this account’s Bear Trap troops</label>
        {form.linked ? <>
          <p>Uses the same T9, T10 and T11 troop pool as Bear Trap for <strong>{accountById(accountId)?.name}</strong>. Changes in either scanner update both calculators.</p>
          {troops.infantry === '' ? <p className="cj-callout">{inventory?.demo ? 'Bear Trap is showing demo troops. Scan your troops or edit the Bear Trap troop pool to use your own numbers.' : 'Waiting for this account’s Bear Trap troop pool.'}</p>
            : <div className="cj-stats"><div><strong>{fmt(Number(troops.infantry))}</strong><span>Linked infantry</span></div><div><strong>{fmt(Number(troops.lancer))}</strong><span>Linked lancers</span></div></div>}
          <p className="cj-help">Lower tiers are not in the Bear Trap pool. If you have extra tiers, or some of these troops are marching or injured, turn the link off and enter the available totals below.</p>
        </> : <><p>Enter available troops across all tiers. Exclude troops already marching or in the infirmary. Manual totals affect Crazy Joe only.</p>
          <div className="cj-grid"><NumberInput label="Infantry" value={form.infantry} onChange={v=>patch({infantry:v})}/><NumberInput label="Lancers" value={form.lancer} onChange={v=>patch({lancer:v})}/></div></>}
        <div className="cj-scanner"><h3>Scan troop screenshots</h3><p>Choose screenshots, review the OCR readings, then select “Use these troops”. Confirmed readings update the selected account’s Bear Trap pool too; missing readings keep their existing values.</p>{scanner || <p>Open this calculator within the Bear Trap app to scan.</p>}
        {!form.linked && <p className="cj-help">Turn the link on to calculate with scanned troops. Your manual Crazy Joe totals are kept separately.</p>}</div>
        <p className="cj-help">This plan sends infantry first, then lancers. Marksmen do not use up the space needed for those troops.</p>
      </section>
      <section className="cj-card"><h2>2. Marches you can send</h2><label className="cj-field"><span>Available marches</span><select className="th-input" value={form.marches} onChange={e=>patch({marches:Number(e.target.value)})}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n} marches</option>)}</select></label>
        <p className="cj-help">Use only marches free for reinforcements. Include the heroes you will actually send; marches without heroes can hold fewer troops.</p>
        <label className="cj-check"><input type="checkbox" checked={form.measured} onChange={e=>patch({measured:e.target.checked})}/>My capacity already includes active temporary buffs</label>
        <p className="cj-help">{form.measured?'Uses the displayed capacity exactly. Extra buffs are not added or recommended.':'Enter the deployment limit before temporary pet, minister and city capacity buffs. Permanent research and hero capacity stay included.'}</p>
        {!form.different&&<NumberInput label={form.measured?'Displayed capacity per march':'Unboosted capacity per march'} value={form.capacity} onChange={v=>patch({capacity:v})}/>}
        <label className="cj-check"><input type="checkbox" checked={form.different} onChange={e=>patch({different:e.target.checked,capacities:form.capacities.map(v=>v||form.capacity)})}/>My marches have different capacities</label>
        <details><summary>March capacities and recipient space</summary><p className="cj-help">Optional recipient space is the room your ally can accept for your march. Leave blank if unrestricted. One row represents one reinforcement destination.</p>
          {Array.from({length:form.marches},(_,i)=><div className="cj-march-input" key={i}><b>March {i+1}</b>{form.different&&<NumberInput label={`March ${i+1} capacity`} value={form.capacities[i]} onChange={v=>patch({capacities:form.capacities.map((x,j)=>j===i?v:x)})}/>}<NumberInput label={`March ${i+1} recipient space (optional)`} value={form.spaces[i]} onChange={v=>patch({spaces:form.spaces.map((x,j)=>j===i?v:x)})}/></div>)}
        </details>
      </section>
      {!form.measured&&<section className="cj-card"><h2>3. Boosts available to you</h2><p>Select only buffs you can use before sending. The calculator compares combinations; selecting one does not make it mandatory.</p>
        <NumberInput label="Snow Ape skill: extra deployment capacity" hint="Enter the bonus shown on your pet skill. Leave blank if unavailable or on cooldown." value={form.pet} onChange={v=>patch({pet:v})}/>
        <label className="cj-field"><span>Largest deployment capacity item available</span><select className="th-input" value={form.item} onChange={e=>patch({item:Number(e.target.value)})}><option value={0}>None</option><option value={10}>10% only</option><option value={20}>10% and 20%</option></select></label>
        <label className="cj-field"><span>Minister of Strategy available to book</span><select className="th-input" value={form.minister} onChange={e=>patch({minister:Number(e.target.value)})}><option value={0}>Unavailable</option><option value={2500}>Normal: +2,500 per march</option><option value={3750}>Supreme: +3,750 per march</option></select></label>
        <p className="cj-help">Capacity items replace each other; 10% and 20% are never added together. Education boosts training capacity, which does not increase a reinforcement march. Iron Rhino increases rally capacity.</p>
      </section>}
    </div>
    <div className="cj-results">
      <section className="cj-card cj-answer" aria-live="polite"><span className="cj-kicker">YOUR CITY EMPTYING PLAN</span>
        {!result?<><h2>Add your troops and march capacity</h2><p>Enter 0 for a troop type you do not have. Your plan updates automatically and is saved separately for each account on this device.</p></>:<>
          <h2>{!selected.left?'All infantry and lancers fit':`${fmt(selected.left)} troops remain at home`}</h2>
          <p><strong>{label(selected)}</strong>{picked&&picked!==result.best.key?' · Your comparison':' · Recommended'}</p>
          <div className="cj-stats"><div><strong>{fmt(selected.sent)}</strong><span>Sent out</span></div><div><strong>{fmt(selected.leftInf)}</strong><span>Infantry at home</span></div><div><strong>{fmt(selected.leftLan)}</strong><span>Lancers at home</span></div></div>
          <p>{!result.best.left?(result.baseline.left?`The recommended combination frees ${fmt(result.baseline.left)} more troops than no extra buffs.`:'You do not need extra deployment buffs to empty these troop types.'):`Even the best available combination leaves ${fmt(result.best.left)} troops. Free another march, check hero deployment limits, or find allies with more reinforcement space.`}</p>
          <p className="cj-help">Target average: {fmt(result.required)} space per march before recipient limits. Recommendations use the fewest activations, then prefer no capacity item and no minister booking. They do not predict your score.</p>
          {selected.minister>0&&<p className="cj-callout">Book Minister of Strategy before sending. Have the position and other selected buffs active for recalls and redeployments too.</p>}
          <div className="cj-table-wrap"><table><caption>Enter these troop counts in game</caption><thead><tr><th>March</th><th>Infantry</th><th>Lancers</th><th>Total / limit</th></tr></thead><tbody>{selected.rows.map((r,i)=><tr key={i}><th>{i+1}</th><td>{fmt(r.infantry)}</td><td>{fmt(r.lancer)}</td><td>{fmt(r.total)} / {fmt(r.capacity)}</td></tr>)}</tbody></table></div>
          <button type="button" className="cj-button" onClick={copy}>{copied?'Copied':'Copy march plan'}</button>
          {!form.measured&&<p className="cj-help">Estimated capacity = (unboosted march + Snow Ape + Strategy) × city capacity item. Rounded down. Check each limit in game before sending; if it differs, switch to “capacity already includes active temporary buffs” and enter the displayed limits.</p>}
        </>}
      </section>
      {result&&result.scenarios.length>1&&<section className="cj-card"><h2>Compare available buff combinations</h2><p>Tap a combination to preview its marches. No buff is activated in game.</p><div className="cj-options">{[...result.scenarios].sort((a,b)=>a.actions-b.actions||a.percent-b.percent||a.minister-b.minister).map(s=><button key={s.key} type="button" aria-pressed={selected.key===s.key} onClick={()=>{setPicked(s.key);setCopied(false);}}><span><b>{label(s)}</b>{s.key===result.best.key&&<small>Recommended</small>}</span><span>{fmt(s.left)} at home</span></button>)}</div></section>}
      <section className="cj-card"><h2>Before Crazy Joe starts</h2><ul><li>Arrange incoming reinforcements before emptying your city. Two failed defenses stop further attacks.</li><li>Reinforce online allies who have sent their own infantry and lancers out. Avoid competing for kills in crowded cities.</li><li>Activate selected capacity buffs before you deploy. Keep them available for later redeployments.</li><li>HQ waves are 10 and 20. Follow your leader’s HQ troop mix, cap and recall instructions after waves 9 and 19.</li><li>Stay online for the online-only waves: 7, 14 and 17. Do not teleport during the event.</li><li>Healing brings your own troops home. If you heal, redeploy them so they do not compete with reinforcers.</li></ul>
        <details><summary>Mechanics, assumptions and sources</summary><p>This optimizes infantry and lancer evacuation, not kill score. Troops are spread across your usable marches in proportion to space, with infantry sent first. It does not enforce 90/10 or infer a universal HQ ratio. Confirm defense strength and reinforcement slots with your alliance.</p><p>Snow Ape is the capacity pet; use your actual skill value. Attack pets may help combat but cannot empty more troops. Porting is not a capacity buff.</p><ul><li><a href="https://centurygames.helpshift.com/hc/en/64-whiteout-survival/section/1453-crazy-joe/" target="_blank" rel="noreferrer">Century Games: Crazy Joe rules</a></li><li><a href="https://www.whiteoutsurvival.wiki/events/crazy-joe/" target="_blank" rel="noreferrer">Crazy Joe community guide</a></li><li><a href="https://whiteoutdata.com/pets/snow-ape/" target="_blank" rel="noreferrer">Snow Ape skill values</a></li><li><a href="https://wosguru.com/crazy-joe" target="_blank" rel="noreferrer">Capacity boosts and minister positions</a></li></ul><p>Sources checked 5 November 2026. Buff forecasts use the app’s flat-then-percent capacity model; displayed in-game limits take priority.</p></details>
      </section>
    </div>
  </div>;
}
