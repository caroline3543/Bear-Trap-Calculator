import { Chevron } from '../ui/components.jsx';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import db from './database.js';
import { CLASSES } from './model.js';
import { parseEntry, gearDifference } from './number-entry.js';
import { heroNamesForClass, migrateSetup, resolveHero, starKey } from './leader-setup.js';
import { assessSetup, compareHero, replaceHero } from './hero-comparison.js';
import { Button } from '../ui/components.jsx';
import './bear-lab.css';
import BonusScanner from './BonusScanner.jsx';
import { applyBonusReadings } from './bonus-scan.js';
import bonusOverviewPhoto from './assets/bonus-overview.webp';
import heroStatsPhoto from './assets/hero-stats.webp';

const fmt = n => Number(n || 0).toLocaleString('en-US');
const HERO_NAMES = CLASSES.map((_, i) => heroNamesForClass(db, i));
function loadSetup(accountId) {
  try {
    const current = localStorage.getItem(`bearLeader:v2:${accountId}`);
    const previous = localStorage.getItem(`bearLab:v1:${accountId}`);
    return migrateSetup(JSON.parse(current || previous || '{}').profile);
  } catch { return migrateSetup(); }
}
function NumberField({ label, ariaLabel, value, onChange, min = 0, max = 10000, decimal = true, fixed, validate, help }) {
  const id = useId();
  const display = v => v === '' || v == null ? '' : Number(v).toLocaleString('en-US', { minimumFractionDigits: fixed ?? 0, maximumFractionDigits: fixed ?? 4 });
  const [text, setText] = useState(() => display(value));
  const [error, setError] = useState('');
  const emitted = useRef(value);
  useEffect(() => {
    if (value !== emitted.current) { emitted.current = value; setText(display(value)); setError(''); }
  }, [value]);
  function change(raw) {
    setText(raw);
    const n = parseEntry(raw, max);
    const message = n === undefined || (n !== null && (n < min || (!decimal && !Number.isInteger(n))))
      ? `Enter ${decimal ? 'a number' : 'a whole number'} from ${min} to ${max}.`
      : n !== null && validate ? validate(n) : '';
    setError(message);
    emitted.current = message || n === null ? '' : n;
    onChange(emitted.current);
  }
  return <label className="bl-field">
    <span>{label}</span>
    <input className="calc-input" type="text" inputMode={decimal ? 'decimal' : 'numeric'}
      aria-label={ariaLabel || label} aria-invalid={Boolean(error) || undefined} aria-describedby={error || help ? id : undefined}
      value={text} onFocus={e => e.target.select()} onChange={e => change(e.target.value)}
      onBlur={() => { if (!error) setText(display(emitted.current)); }} />
    {(error || help) && <small id={id} className={error ? 'bl-error' : undefined}>{error || help}</small>}
  </label>;
}
function HeroNameField({ label, ariaLabel, value, names, onChange }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = names.filter(h => h.toLowerCase().includes(String(value).trim().toLowerCase()) || h.toLowerCase().replace(/[^a-z0-9]/g, '').includes(String(value).toLowerCase().replace(/[^a-z0-9]/g, ''))).slice(0, 8);
  const resolved = resolveHero(value, names);
  function choose(name) { onChange(name); setOpen(false); setActive(-1); }
  return <div className="bl-autocomplete">
    <label className="bl-field"><span>{label}</span>
      <input className="calc-input" type="text" role="combobox" autoComplete="off" spellCheck="false"
        aria-label={ariaLabel || label} aria-autocomplete="list" aria-expanded={open && suggestions.length > 0}
        aria-controls={`${id}-list`} aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
        aria-invalid={Boolean(value && !resolved) || undefined} aria-describedby={`${id}-help`}
        placeholder="Start typing a hero name" value={value}
        onFocus={() => { setOpen(true); setActive(-1); }}
        onChange={e => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onBlur={() => { setOpen(false); if (resolved) onChange(resolved); }}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); setActive(-1); }
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault(); setOpen(true);
            setActive(a => suggestions.length ? (e.key === 'ArrowDown' ? (a + 1) % suggestions.length : (a <= 0 ? suggestions.length - 1 : a - 1)) : -1);
          }
          if (e.key === 'Enter' && open && active >= 0 && suggestions[active]) { e.preventDefault(); choose(suggestions[active]); }
        }} />
      <small id={`${id}-help`}>{value && !resolved ? 'Choose a matching hero suggestion.' : resolved ? `✓ ${resolved}` : 'Type a name or choose a suggestion.'}</small>
    </label>
    {open && suggestions.length > 0 && <ul id={`${id}-list`} role="listbox" aria-label={`${label} suggestions`} className="bl-suggestions">
      {suggestions.map((hero, i) => <li role="option" aria-selected={active === i} id={`${id}-${i}`} key={hero}
        onMouseDown={e => e.preventDefault()} onClick={() => choose(hero)} onMouseEnter={() => setActive(i)}>{hero}</li>)}
    </ul>}
  </div>;
}

function HeroFields({ hero, names, prefix, onChange }) {
  function update(field, values) { onChange({ ...hero, [field]: { ...hero[field], ...values } }); }
  return <>
        <HeroNameField label="Hero name" ariaLabel={`${prefix} hero`} value={hero.name} names={names} onChange={v => onChange({ ...hero, name: v })} />
        <div className="bl-grid three">
          <NumberField label="Stars" ariaLabel={`${prefix} stars`} value={hero.info.stars} max={5} fixed={1}
            validate={n => starKey(n) && (n === 5 || Math.round(n * 10) % 10 <= 5) ? '' : 'Use one decimal: .0–.5 steps, or 5.0.'}
            onChange={v => update('info', { stars: v })} help="e.g. 4.3 · max 5.0" />
          <NumberField label="Widget" ariaLabel={`${prefix} widget`} value={hero.info.widget} max={10} decimal={false} onChange={v => update('info', { widget: v })} help="0–10" />
          <NumberField label="Skills" ariaLabel={`${prefix} skill level`} value={hero.info.skill} min={1} max={5} decimal={false} onChange={v => update('info', { skill: v })} help="1–5" />
        </div>
        <details className="bl-details"><summary>Gear on / off <span>{['attack', 'lethality'].map(k => gearDifference(hero.gear, k)).every(n => n !== null && n >= 0) ? `+${fmt(gearDifference(hero.gear, 'attack'))} attack · +${fmt(gearDifference(hero.gear, 'lethality'))} lethality` : 'Complete both readings'}</span></summary>
          <p className="bl-help">Read these percentages on this hero’s Stats screen. Change only their gear between readings.</p>
          {['attack', 'lethality'].map(kind => <div key={kind}>
            <h4 className="bl-stat-title">{kind}</h4>
            <div className="bl-grid two">{[['On', 'Gear on'], ['Off', 'Gear off']].map(([suffix, label]) => <NumberField key={suffix}
              label={`${label} (%)`} ariaLabel={`${prefix} ${kind} · ${label} (%)`} value={hero.gear[kind + suffix]}
              onChange={v => update('gear', { [kind + suffix]: v })} />)}</div>
            <p className={gearDifference(hero.gear, kind) < 0 ? 'bl-error' : 'bl-difference'}>{gearDifference(hero.gear, kind) === null ? 'Enter both readings.' : gearDifference(hero.gear, kind) < 0 ? 'Gear on must be at least gear off.' : `+${fmt(gearDifference(hero.gear, kind))} ${kind} percentage points`}</p>
          </div>)}
        </details>
  </>;
}

function HeroComparison({ index, draft, tiers, capacity, minister, onEdit, onUse }) {
  const [open, setOpen] = useState(false);
  const candidate = draft.alternatives[index];
  const c = CLASSES[index];
  const comparison = useMemo(() => open ? compareHero(draft, index, candidate, tiers, capacity, minister, db) : null,
    [open, draft, index, candidate, tiers, capacity, minister]);
  const best = comparison?.winner === 'alternative' ? comparison.alternative : comparison?.current;
  return <details className="bl-details bl-compare" open={open} onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>Compare another {c} hero</summary>
    {open && <>
      <p className="bl-help">Only this hero changes. Your other heroes, troops, bonuses and capacity stay the same.</p>
      <HeroFields hero={candidate} names={HERO_NAMES[index]} prefix={`Alternative ${c}`} onChange={onEdit} />
      <Button type="button" onClick={() => onEdit({ ...candidate, gear: Object.fromEntries(['attackOn', 'attackOff', 'lethalityOn', 'lethalityOff'].map(k => [k, draft.stats[index][k]])) })}>Use current hero’s gear readings</Button>
      <p className="bl-help">Use this shortcut only if you will transfer the same gear and its bonus is unchanged.</p>
      {comparison.errors.length ? <p className="bl-help" role="status">{comparison.errors[0]}</p> : <div className="bl-comparison-result" aria-live="polite">
        <div className="bl-grid two">{[['current', comparison.current], ['alternative', comparison.alternative]].map(([key, item]) => <div key={key} className={`bl-score-card ${comparison.winner === key ? 'bl-score-best' : ''}`}>
          <span>{item.profile.starters[index]}</span><strong>{item.result.sourceBoost.toFixed(4)}</strong>
          <span>{comparison.winner === key ? 'Recommended' : comparison.winner === 'tie' ? 'Equal score' : 'Optimal boost'}</span>
        </div>)}</div>
        <p className="bl-help">{comparison.winner === 'tie' ? 'Same score at this precision. Keep your current hero.' : `${best.profile.starters[index]} scores higher${comparison.improvement === null ? '' : ` by ${comparison.improvement.toFixed(2)}%`}.`}</p>
        <p className="bl-help">Optimal boost compares setups; it is not expected damage. Troop amounts are limited when applied.</p>
        {comparison.winner !== 'tie' && <Button type="button" tone="primary" onClick={() => onUse(comparison)}>Use {best.profile.starters[index]} & squad</Button>}
      </div>}
    </>}
  </details>;
}
export default function BearLab({ accountId, accountName, leaderCapacity, leaderMinister = 'None', troopTiers, onApplyLeader }) {
  const [draft, setDraft] = useState(() => loadSetup(accountId));
  const tiers = troopTiers || draft.tierInputs;
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [applied, setApplied] = useState(null);
  const [dirty, setDirty] = useState(false);
  const panelId = useId();
  const resultRef = useRef(null);
  const mounted = useRef(false);
  useEffect(() => {
    try {
      localStorage.setItem(`bearLeader:v2:${accountId}`, JSON.stringify({ profile: draft }));
      localStorage.removeItem(`bearLab:v1:${accountId}`);
    } catch { setNotice('Your browser could not save this setup. You can still calculate.'); }
  }, [accountId, draft]);
  useEffect(() => {
    if (mounted.current) { setDirty(true); setNotice(''); }
    mounted.current = true;
  }, [leaderCapacity, leaderMinister, troopTiers]);
  function edit(fields) { setDraft(p => ({ ...p, ...fields })); setDirty(true); setNotice(''); }
  function editAt(field, i, fields) {
    setDraft(p => ({ ...p, [field]: p[field].map((v, j) => i === j ? { ...v, ...fields } : v) }));
    setDirty(true); setNotice('');
  }
  const assessment = useMemo(() => {
    return assessSetup(draft, tiers, leaderCapacity, leaderMinister, db);
  }, [draft, leaderCapacity, leaderMinister, troopTiers]);
  function apply() {
    if (!assessment.result) return;
    onApplyLeader(assessment.result.counts, assessment.result.ratios.map(n => n * 100));
    setApplied({ ...assessment.result, heroes: assessment.profile.starters, revision: (applied?.revision || 0) + 1 });
    setDirty(false); setNotice('Recommended squad updated.');
  }
  useEffect(() => { if (applied && !dirty) resultRef.current?.focus({ preventScroll: true }); }, [applied]);
  return <div className="bear-leader-helper">
    <button type="button" className="bl-launch bl-calculate-launch" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(v => !v)}>
      <span>Calculate rally squad</span><Chevron expanded={open} />
    </button>
    {!open && applied && <p className="bl-status">{dirty ? 'Setup changed. Open and recalculate to update your squad.' : `${applied.heroes.join(' · ')} · ${fmt(applied.capacity)} troops before inventory limits`}</p>}
    {open && <form id={panelId} className="bl-panel" onSubmit={e => { e.preventDefault(); apply(); }}>
      <p className="bl-help">Saved for {accountName}. Uses your troop levels and leader capacity.</p>
      <details className="bl-details"><summary>Calculation assumptions</summary><p className="bl-help">Two Jessie and two Seo-yoon joiners, level-5 skills. Pets active. Trap attack +25%.</p></details>
      <BonusScanner onApply={readings => { setDraft(p => applyBonusReadings(p, readings)); setDirty(true); setNotice('Account bonuses updated from reviewed screenshots.'); }} />
      <div className="bl-grid two">
        <NumberField label="All troops attack (%)" value={draft.allAttack} onChange={v => edit({ allAttack: v })} />
        <NumberField label="All troops lethality (%)" value={draft.allLethality} onChange={v => edit({ allLethality: v })} />
      </div>
      <fieldset className="bl-class-bonuses"><legend>Extra bonuses by troop type</legend>
        <p className="bl-help">Use each class’s listed bonuses. Do not add the all-troops bonus.</p>
        {CLASSES.map((c, i) => <div className="bl-grid two" key={c}>{['attack', 'lethality'].map(kind => <NumberField key={kind}
          label={`${c} base ${kind} (%)`} value={draft.stats[i][kind]} onChange={v => editAt('stats', i, { [kind]: v })} />)}</div>)}
      </fieldset>
      <details className="bl-details bl-guide"><summary>Where to find your account bonuses</summary>
        <ol><li>Open <strong>Power → Bonus Overview</strong>.</li><li>Copy <strong>Attack</strong> and <strong>Lethality</strong> for all troops and each troop type.</li><li>Use readings before pet skills. Enter pet bonuses separately below.</li></ol>
        <p className="bl-help">Use Bonus Overview; rally stats include your heroes.</p>
        <figure><a href={bonusOverviewPhoto} target="_blank" rel="noreferrer"><img src={bonusOverviewPhoto} loading="lazy" alt="Bonus Overview example highlighting Troops’ Attack 216.77%, Troops’ Lethality 62.33%, and Infantry and Lancer bonuses" /></a><figcaption>Enter the highlighted fields. Tap to enlarge.</figcaption></figure>
      </details>
      <details className="bl-details bl-guide"><summary>Where to find deployment capacity</summary>
        <ol><li>Start a Polar Terror rally with your leader heroes.</li><li>Tap <strong>!</strong> beside the troop count → <strong>Deployment Capacity</strong>.</li><li>Enter that capacity above. Add only buffs not already included.</li></ol>
        <p className="bl-help">Deployment Capacity = your march. Rally Capacity = the whole rally.</p>
      </details>
      <p className="bl-help">You can type or paste numbers with commas and % signs.</p>
      <details className="bl-details bl-guide"><summary>Where to find gear-on and gear-off stats</summary>
        <ol><li>Open <strong>Hero → Stats → lower-right menu → Expedition</strong>.</li><li>Read <strong>Attack</strong> and <strong>Lethality</strong> with gear on, then off.</li><li>Keep stars, widget and skills unchanged. Restore your gear afterward.</li></ol>
        <p className="bl-help">Only gear on − gear off is added. Hero bonuses are calculated separately.</p>
        <figure><a href={heroStatsPhoto} target="_blank" rel="noreferrer"><img src={heroStatsPhoto} loading="lazy" alt="Hector’s lower-right menu and highlighted Expedition Infantry Attack and Lethality" /></a><figcaption>Use the Expedition percentages. Tap to enlarge.</figcaption></figure>
      </details>
      {CLASSES.map((c, i) => <fieldset className="bl-class" key={c}><legend>{c}</legend>
        <p className="bl-help">Uses FC {tiers[i].fc === '' ? '—' : tiers[i].fc} · T{tiers[i].level === '' ? '—' : tiers[i].level} from your troop inventory above.</p>
        <HeroFields hero={{ name: draft.starters[i], info: draft.heroInfo[i], gear: draft.stats[i] }} names={HERO_NAMES[i]} prefix={c}
          onChange={hero => edit({ starters: draft.starters.map((v, j) => i === j ? hero.name : v), heroInfo: draft.heroInfo.map((v, j) => i === j ? hero.info : v), stats: draft.stats.map((v, j) => i === j ? hero.gear : v) })} />
        <HeroComparison index={i} draft={draft} tiers={tiers} capacity={leaderCapacity} minister={leaderMinister} onEdit={candidate => { setDraft(p => ({ ...p, alternatives: p.alternatives.map((v, j) => i === j ? candidate : v) })); setNotice(''); }}
          onUse={comparison => {
            const old = { name: draft.starters[i], info: { ...draft.heroInfo[i] }, gear: Object.fromEntries(['attackOn', 'attackOff', 'lethalityOn', 'lethalityOff'].map(k => [k, draft.stats[i][k]])) };
            const next = comparison.winner === 'alternative' ? replaceHero(draft, i, draft.alternatives[i]) : draft;
            const chosen = comparison.winner === 'alternative' ? comparison.alternative : comparison.current;
            setDraft(comparison.winner === 'alternative' ? { ...next, alternatives: draft.alternatives.map((v, j) => i === j ? old : v) } : next);
            onApplyLeader(chosen.result.counts, chosen.result.ratios.map(n => n * 100));
            setApplied({ ...chosen.result, heroes: chosen.profile.starters, revision: (applied?.revision || 0) + 1 });
            setDirty(false); setNotice(`${chosen.profile.starters[i]} and recommended squad applied.`);
          }} />
      </fieldset>)}
      <details className="bl-details"><summary>Active pet bonuses <span>Pets always active</span></summary>
        <p className="bl-help">Enter the pet skill percentages you will activate for Bear Trap. Add Snow Ape’s capacity bonus in the capacity controls above only if your capacity reading excludes it.</p>
        <div className="bl-grid two">{[['chameleon', 'Chameleon (%)'], ['tiger', 'Sabre-tooth lethality (%)'], ['lion', 'Cave lion attack (%)']].map(([field, label]) => <NumberField key={field}
          label={label} value={draft[field]} max={1000} onChange={v => edit({ [field]: v })} />)}</div>
      </details>
      <div className="bl-apply-area">
        {applied && !dirty && <div key={applied.revision} ref={resultRef} tabIndex={-1} className="bl-ideal-result rally-result-update" aria-label="Ideal rally leader squad" role="region"><h3>Ideal rally leader squad</h3><div className="bl-grid three">{CLASSES.map((c, i) => <div key={c}><small>{c} · {(applied.ratios[i] * 100).toFixed(2)}%</small><strong>{fmt(applied.counts[i])}</strong></div>)}</div><p className="bl-help">Total: {fmt(applied.capacity)} troops. Amounts are rounded to whole troops while keeping your capacity total.</p><p className="bl-model-score">WOS Nerds optimal boost: <strong>{applied.sourceBoost.toFixed(4)}</strong></p><p className="bl-help">A comparison score, not a prediction of Bear Trap damage points.</p></div>}
        {assessment.errors.length > 0 && <p className="bl-help" role="status">{assessment.errors[0]}{assessment.errors.length > 1 ? ` (${assessment.errors.length - 1} more to complete)` : ''}</p>}
        <button type="submit" className="bl-apply" disabled={!assessment.result}>{applied && !dirty ? 'Calculate again' : 'Calculate & use recommended squad'}</button>
        <p className="bl-help">Updates the squad below, limited by your available troops.</p>
      </div>
      <details className="bl-details"><summary>Formula reference</summary><p className="bl-help">Proportions use the theoretical WOS Nerds comparison model: each class’s D² ÷ sum(D²), with source ratios retained at full precision and whole troops rounded to capacity. The displayed optimal boost uses WOS Nerds’ normalization (raw boost × Chameleon × 1.3 ÷ 23,400), including its 10% display fallback when Chameleon is zero. This does not establish an in-game damage prediction. Explicit skill levels are honored here; WOS Nerds infers them from stars. <a href="https://wosnerds.com/bear-calc/" target="_blank" rel="noreferrer">WOS Nerds formula reference</a>.</p></details>
    </form>}
    {notice && <p className="bl-status" role="status">{notice}</p>}
  </div>;
}
