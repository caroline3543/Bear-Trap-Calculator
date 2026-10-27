import { Chevron } from '../ui/components.jsx';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import db from './database.js';
import { POSITIONS, BUFF_SOURCES } from './buffs.js';
import { CLASSES } from './model.js';
import { parseEntry, gearDifference } from './number-entry.js';
import { heroNamesForClass, migrateSetup, resolveHero, starKey } from './leader-setup.js';
import { scoreRally } from './mixed-troops.js';
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
        onBlur={() => setOpen(false)}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); setActive(-1); }
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault(); setOpen(true);
            setActive(a => suggestions.length ? (e.key === 'ArrowDown' ? (a + 1) % suggestions.length : (a <= 0 ? suggestions.length - 1 : a - 1)) : -1);
          }
          if (e.key === 'Enter' && open && active >= 0 && suggestions[active]) { e.preventDefault(); choose(suggestions[active]); }
        }} />
      <small id={`${id}-help`} hidden={Boolean(resolved)}>{value && !resolved ? 'Choose a hero from this class.' : resolved ? '' : 'Start typing to see matching heroes.'}</small>
    </label>
    {open && suggestions.length > 0 && <ul id={`${id}-list`} role="listbox" aria-label={`${label} suggestions`} className="bl-suggestions">
      {suggestions.map((hero, i) => <li role="option" aria-selected={active === i} id={`${id}-${i}`} key={hero}
        onMouseDown={e => e.preventDefault()} onClick={() => choose(hero)} onMouseEnter={() => setActive(i)}>{hero}</li>)}
    </ul>}
  </div>;
}

function HeroFields({ hero, names, prefix, onChange, compare = false }) {
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
        {compare ? <div>
          <p className="bl-help">For an accurate comparison, enter the hero stats with gear on and off.</p>
          {['attack', 'lethality'].map(kind => <div className="bl-grid two" key={kind}>{[['On', 'Gear on'], ['Off', 'Gear off']].map(([suffix, label]) => <NumberField key={suffix} label={`${kind} ${label} (%)`} ariaLabel={`${prefix} ${kind} · ${label} (%)`} value={hero.gear[kind + suffix]} onChange={v => update('gear', { [kind + suffix]: v })} />)}</div>)}
        </div> : <div>
          <p className="bl-help">Enter the gear bonus only. If you enter the hero’s total stats with gear on, the estimate may count hero bonuses twice.</p>
          <div className="bl-grid two">{['attack', 'lethality'].map(kind => <NumberField key={kind} label={`Gear ${kind} bonus (%)`} ariaLabel={`${prefix} gear ${kind} bonus (%)`} value={gearDifference(hero.gear, kind) ?? ''} onChange={v => update('gear', { [kind + 'On']: v, [kind + 'Off']: 0 })} />)}</div>
        </div>}
  </>;
}

function HeroComparison({ index, draft, tiers, capacity, minister, inventory, onEdit, onUse }) {
  const [open, setOpen] = useState(false);
  const candidate = draft.alternatives[index];
  const c = CLASSES[index];
  const comparison = useMemo(() => open ? compareHero(draft, index, candidate, tiers, capacity, minister, db, inventory) : null,
    [open, draft, index, candidate, tiers, capacity, minister, inventory]);
  const best = comparison?.winner === 'alternative' ? comparison.alternative : comparison?.current;
  return <details className="bl-details bl-compare" open={open} onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>Compare another {c} hero</summary>
    {open && <>
      <p className="bl-help">Same troop inventory, capacity, bonuses and other heroes. Each hero gets its best available split.</p>
      <HeroFields hero={candidate} names={HERO_NAMES[index]} prefix={`Alternative ${c}`} onChange={onEdit} compare />
      <Button type="button" onClick={() => onEdit({ ...candidate, gear: Object.fromEntries(['attackOn', 'attackOff', 'lethalityOn', 'lethalityOff'].map(k => [k, draft.stats[index][k]])) })}>Use current hero’s gear readings</Button>
      <p className="bl-help">Use this shortcut only if you will transfer the same gear and its bonus is unchanged.</p>
      {comparison.errors.length ? <p className="bl-help" role="status">{comparison.errors[0]}</p> : <div className="bl-comparison-result" aria-live="polite">
        <div className="bl-grid two">{[['current', comparison.current], ['alternative', comparison.alternative]].map(([key, item]) => <div key={key} className={`bl-score-card ${comparison.winner === key ? 'bl-score-best' : ''}`}>
          <span>{item.profile.starters[index]}</span><strong>{item.result.sourceBoost.toFixed(4)}</strong>
          <span>{comparison.winner === key ? 'Recommended' : comparison.winner === 'tie' ? comparison.uncertain ? 'Too close to call' : 'Equal score' : 'Optimal boost'}</span>
        </div>)}</div>
        <p className="bl-help">{comparison.winner === 'tie' ? comparison.uncertain ? 'Scores are too close to recommend a winner. Keep your current hero.' : 'Same score at this precision. Keep your current hero.' : `${best.profile.starters[index]} scores higher${comparison.improvement === null ? '' : ` by ${comparison.improvement.toFixed(2)}%`}.`}</p>
        <p className="bl-help">Optimal boost compares setups, not damage points.</p>
        {comparison.winner !== 'tie' && <Button type="button" tone="primary" onClick={() => onUse(comparison)}>Use {best.profile.starters[index]} & squad</Button>}
      </div>}
    </>}
  </details>;
}
function BuffFields({ draft, edit, capacityBuffs, onCapacityBuffsChange, cyrilleCapacity, onCyrilleCapacityChange, apeCapacity, onApeCapacityChange }) {
  const amount = (field, label, max) => <NumberField key={field} label={label} value={draft[field]} max={max} onChange={v => edit({ [field]: v })} />;
  const city = (field, label) => <div className="bl-buff-choice"><span>{label}</span><div role="group" aria-label={label}>{[0, 10, 20].map(n => <Button key={n} small aria-pressed={Number(draft[field]) === n} tone={Number(draft[field]) === n ? 'primary' : 'secondary'} onClick={() => edit({ [field]: n })}>{n ? `${n}%` : 'None'}</Button>)}</div></div>;
  const titleLabel = (name, v) => `${name} · ${[v.attack && `ATK +${v.attack * 100}%`, v.lethality && `LETH +${v.lethality * 100}%`, v.troops && `capacity +${fmt(v.troops)}`].filter(Boolean).join(' · ')}`;
  return <div className="bl-buffs">
    <p className="bl-help">Enter stats and capacity before these buffs. Leave inactive buffs at 0 or None.</p>
    {capacityBuffs && onCapacityBuffsChange && <>
      <h3>Capacity buffs</h3>

      <div className="bl-grid two">
        {onApeCapacityChange && <NumberField label="Snow Ape extra troops" value={apeCapacity} max={15000} decimal={false} onChange={onApeCapacityChange} />}
        {onCyrilleCapacityChange && <NumberField label="Cyrille extra troops" value={cyrilleCapacity} max={30000} decimal={false} onChange={onCyrilleCapacityChange} />}
        <NumberField label="City deployment increase (%)" value={capacityBuffs.deploy} max={20} onChange={v => onCapacityBuffsChange({ ...capacityBuffs, deploy: v })} />
      </div>
      <details className="bl-details" open><summary>Minister positions</summary>
      <div className="bl-position-buttons" role="group" aria-label="Minister or president">{Object.entries(POSITIONS).map(([name,v]) => <Button key={name} small aria-pressed={capacityBuffs.position === name} tone={capacityBuffs.position === name ? 'primary' : 'secondary'} onClick={() => onCapacityBuffsChange({ ...capacityBuffs, position: name })}>{name === 'None' ? 'None' : titleLabel(name,v)}</Button>)}</div>
      </details>
    </>}
    <details className="bl-details" open><summary>Pet and city buffs</summary>
    <h3>Pet skills</h3>
    <div className="bl-grid two">{amount('lion', 'Cave Lion attack (%)', 10)}{amount('tiger', 'Saber-tooth Tiger lethality (%)', 10)}</div>
    <div className="bl-grid two">{amount('chameleon', 'Chameleon enemy defence down (%)', 10)}{amount('enemyHealthDown', 'Titan Roc enemy health down (%)', 5)}</div>
    <p className="bl-help">Health down is saved but excluded from the score: its Bear effect is unverified.</p>
    <h3>City items</h3>
    {city('cityAttack', 'Attack increase')}{city('cityLethality', 'Lethality increase')}
    {city('cityDefenseDown', 'Enemy defence down')}
    <p className="bl-help">Choose one item per type. Defence down uses a model approximation.</p>
    </details>
  </div>;
}
export default function BearLab({ accountId, accountName, leaderCapacity, leaderMinister = 'None', troopTiers, inventory, actualRally, onApplyLeader, capacityBuffs, onCapacityBuffsChange, cyrilleCapacity, onCyrilleCapacityChange, apeCapacity, onApeCapacityChange }) {
  const [draft, setDraft] = useState(() => loadSetup(accountId));
  const tiers = troopTiers || draft.tierInputs;
  const calculationDraft = useMemo(() => ({ ...draft, petStatsIncluded: false, cityStatsIncluded: false, titlesStatsIncluded: false, frostdragon: 'None', cyrilleDamage: 0, extraAttack: 0, extraLethality: 0 }), [draft, capacityBuffs]);
  const open = true;
  const [notice, setNotice] = useState('');
  const [applied, setApplied] = useState(null);
  const [dirty, setDirty] = useState(false);
  const panelId = useId();
  const resultRef = useRef(null);
  const helperRef = useRef(null);
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
  }, [leaderCapacity, leaderMinister, troopTiers, inventory, capacityBuffs]);
  function edit(fields) { setDraft(p => ({ ...p, ...fields })); setDirty(true); setNotice(''); }
  function editAt(field, i, fields) {
    setDraft(p => ({ ...p, [field]: p[field].map((v, j) => i === j ? { ...v, ...fields } : v) }));
    setDirty(true); setNotice('');
  }
  const assessment = useMemo(() => {
    return assessSetup(calculationDraft, tiers, leaderCapacity, leaderMinister, db, inventory);
  }, [draft, leaderCapacity, leaderMinister, troopTiers, inventory, capacityBuffs]);
  function fieldsFor(error) {
    const root = helperRef.current;
    if (!root) return [];
    const controls = [...root.querySelectorAll('input[aria-label], select')];
    const name = el => el.getAttribute('aria-label') || el.closest('label')?.querySelector('span')?.textContent || '';
    const c = CLASSES.find(v => error.startsWith(v + ':'));
    if (c) {
      if (error.includes('hero')) return controls.filter(el => name(el) === `${c} hero`);
      if (error.includes('star')) return controls.filter(el => name(el) === `${c} stars`);
      if (error.includes('widget')) return controls.filter(el => name(el) === `${c} widget`);
      if (error.includes('skill')) return controls.filter(el => name(el) === `${c} skill level`);
      if (error.includes('gear')) return controls.filter(el => name(el).startsWith(c + ' ') && name(el).includes('Gear'));
      if (error.includes('troop-type')) return controls.filter(el => name(el).startsWith(c + ' base'));
      if (error.includes('FC')) return [...document.querySelectorAll('input')].filter(el => (el.getAttribute('aria-label') || '').toLowerCase().includes(c.toLowerCase()) && /FC|tier/i.test(el.getAttribute('aria-label')));
    }
    if (error.includes('account bonuses')) return controls.filter(el => name(el).startsWith('All troops'));
    if (error.includes('capacity')) return [...document.querySelectorAll('#rally-leader-fields input')].slice(0,1).concat(controls.filter(el => /extra troops|deployment increase/.test(name(el))));
    const labels = { chameleon:'Chameleon', tiger:'Saber-tooth', lion:'Cave Lion', 'city attack':'Attack increase', 'city lethality':'Lethality increase', 'city defense down':'Enemy defence down', 'enemy health down':'Titan Roc', 'cyrille damage':'Earthbreaker', 'extra attack':'Other attack', 'extra lethality':'Other lethality' };
    const key = Object.keys(labels).find(k => error.startsWith(k + ':'));
    if (error.includes('minister')) return [...root.querySelectorAll('.bl-position-buttons button')];
    if (key?.startsWith('city ')) {
      const group = [...root.querySelectorAll('.bl-buff-choice')].find(el => el.textContent.startsWith(labels[key]));
      return group ? [...group.querySelectorAll('button')] : [];
    }
    return key ? controls.filter(el => name(el).startsWith(labels[key])) : [];
  }
  function goToIssue(error) {
    const fields = fieldsFor(error);
    const target = fields.find(el => el.value === '' || el.getAttribute('aria-invalid') === 'true') || fields[0];
    const fallback = error.includes('inventory') || error.includes('troops') ? document.querySelector('#troop-pool-fields') || document.querySelector('input[aria-label="infantry FC"]') : helperRef.current;
    const node = target || fallback;
    for (let p = node?.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;
    node?.scrollIntoView?.({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'center' });
    if (target) target.focus({ preventScroll:true });
  }
  useEffect(() => {
    if (!open) return;
    helperRef.current.querySelectorAll('details').forEach(el => {
      if (el.querySelector('input, select, .bl-position-buttons') && !el.closest('.bl-compare')) el.open = true;
    });
  }, [open]);
  useEffect(() => {
    document.querySelectorAll('[data-needs-attention]').forEach(el => el.removeAttribute('data-needs-attention'));
    if (open) assessment.errors.forEach(error => fieldsFor(error).forEach(el => el.closest('label, .bl-buff-choice, .bl-position-buttons')?.setAttribute('data-needs-attention','true')));
  }, [open, assessment]);
  const checkpoints = ['Capacity', 'Buffs', 'Account stats', ...CLASSES, 'Troops'];
  const issueGroup = error => CLASSES.find(c => error.startsWith(c + ':')) || (error.includes('capacity') ? 'Capacity' : error.includes('account bonuses') ? 'Account stats' : /inventory|troops|tier/i.test(error) ? 'Troops' : 'Buffs');
  const ready = checkpoints.length - new Set(assessment.errors.map(issueGroup)).size;
  const actualScore = useMemo(() => {
    if (!assessment.result?.model || !actualRally) return null;
    try { return scoreRally(assessment.result.model,actualRally); } catch { return null; }
  }, [assessment,actualRally]);
  function apply() {
    if (!assessment.result) { goToIssue(assessment.errors[0]); return; }
    onApplyLeader(assessment.result.counts, assessment.result.ratios.map(n => n * 100));
    setApplied({ ...assessment.result, heroes: assessment.profile.starters, revision: (applied?.revision || 0) + 1 });
    setDirty(false); setNotice('Recommended squad updated.');
  }
  useEffect(() => { if (applied && !dirty) resultRef.current?.focus({ preventScroll: true }); }, [applied]);
  return <div className="bear-leader-helper" ref={helperRef}>
      {(Number(draft.cyrilleDamage) > 0 || Number(draft.extraAttack) > 0 || Number(draft.extraLethality) > 0) && <p className="bl-help" role="status">Previously saved extra damage and other bonuses are no longer included in this calculation.</p>}
    <BuffFields draft={draft} edit={edit} capacityBuffs={capacityBuffs} onCapacityBuffsChange={onCapacityBuffsChange}
        cyrilleCapacity={cyrilleCapacity} onCyrilleCapacityChange={onCyrilleCapacityChange} apeCapacity={apeCapacity} onApeCapacityChange={onApeCapacityChange} />
    <p className="bl-help">Your march size with these bonuses: <strong>{fmt(leaderCapacity)}</strong></p>
    <form id={panelId} className="bl-panel" onSubmit={e => { e.preventDefault(); apply(); }}>
      <div className="bl-progress" role="region" aria-label="Setup progress">
        <p role="status"><strong>{ready} of {checkpoints.length} sections ready</strong>{assessment.errors.length === 0 ? ' · Ready to calculate' : ` · ${assessment.errors.length} ${assessment.errors.length === 1 ? 'item' : 'items'} to check`}</p>
        <progress max={checkpoints.length} value={ready} aria-label="Completed setup sections" />
        {assessment.errors.length > 0 && <ul className="bl-issue-links">{assessment.errors.map(error => <li key={error}><button type="button" onClick={() => goToIssue(error)}>{error}</button></li>)}</ul>}
      </div>
      <p className="bl-help">Uses {accountName}’s available troops, highest tiers first.</p>
      <details className="bl-details"><summary>Calculation assumptions</summary><p className="bl-help">Two Jessie and two Seo-yoon joiners, level-5 skills. Active pet and city buffs use the values below. Trap attack +25%.</p></details>
      <BonusScanner onApply={readings => { setDraft(p => applyBonusReadings(p, readings)); setDirty(true); setNotice('Account bonuses updated.'); }} />
      <div className="bl-grid two">
        <NumberField label="All troops attack (%)" value={draft.allAttack} onChange={v => edit({ allAttack: v })} />
        <NumberField label="All troops lethality (%)" value={draft.allLethality} onChange={v => edit({ allLethality: v })} />
      </div>
      <fieldset className="bl-class-bonuses"><legend>Troop-type bonuses</legend>
        <p className="bl-help">Copy the listed values for each troop type.</p>
        {CLASSES.map((c, i) => <div className="bl-grid two" key={c}>{['attack', 'lethality'].map(kind => <NumberField key={kind}
          label={`${c} base ${kind} (%)`} value={draft.stats[i][kind]} onChange={v => editAt('stats', i, { [kind]: v })} />)}</div>)}
      </fieldset>
      <details className="bl-details bl-guide"><summary>Where to find bonuses</summary>
        <ol><li>Open <strong>Power → Bonus Overview</strong>.</li><li>Copy <strong>Attack</strong> and <strong>Lethality</strong> for all troops and each troop type.</li><li>Use readings before temporary buffs.</li></ol>
        <p className="bl-help">Use Bonus Overview; rally stats include your heroes.</p>
        <figure><a href={bonusOverviewPhoto} target="_blank" rel="noreferrer"><img src={bonusOverviewPhoto} loading="lazy" alt="Bonus Overview example highlighting Troops’ Attack 216.77%, Troops’ Lethality 62.33%, and Infantry and Lancer bonuses" /></a><figcaption>Enter the highlighted fields. Tap to enlarge.</figcaption></figure>
      </details>

      <details className="bl-details bl-guide"><summary>Where to find gear stats</summary>
        <ol><li>Open <strong>Hero → Stats → lower-right menu → Expedition</strong>.</li><li>Read <strong>Attack</strong> and <strong>Lethality</strong> with gear on, then off.</li><li>Keep stars, widget and skills unchanged. Restore your gear afterward.</li></ol>
        <p className="bl-help">Only gear on − gear off is added. Hero bonuses are calculated separately.</p>
        <figure><a href={heroStatsPhoto} target="_blank" rel="noreferrer"><img src={heroStatsPhoto} loading="lazy" alt="Hector’s lower-right menu and highlighted Expedition Infantry Attack and Lethality" /></a><figcaption>Use the Expedition percentages. Tap to enlarge.</figcaption></figure>
      </details>
      {CLASSES.map((c, i) => <fieldset className="bl-class" key={c}><legend>{c}</legend>
        <p className="bl-help">Uses FC {tiers[i].fc === '' ? '—' : tiers[i].fc} · T{tiers[i].level === '' ? '—' : tiers[i].level} from your inventory. Any FC-by-tier overrides are included.</p>
        <HeroFields hero={{ name: draft.starters[i], info: draft.heroInfo[i], gear: draft.stats[i] }} names={HERO_NAMES[i]} prefix={c}
          onChange={hero => edit({ starters: draft.starters.map((v, j) => i === j ? hero.name : v), heroInfo: draft.heroInfo.map((v, j) => i === j ? hero.info : v), stats: draft.stats.map((v, j) => i === j ? hero.gear : v) })} />
        <HeroComparison index={i} draft={calculationDraft} tiers={tiers} capacity={leaderCapacity} minister={leaderMinister} inventory={inventory} onEdit={candidate => { setDraft(p => ({ ...p, alternatives: p.alternatives.map((v, j) => i === j ? candidate : v) })); setNotice(''); }}
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
      <div className="bl-apply-area">
        {applied && !dirty && <div key={applied.revision} ref={resultRef} tabIndex={-1} className="bl-ideal-result rally-result-update" aria-label="Ideal rally leader squad" role="region"><h3>Ideal rally leader squad</h3><div className="bl-grid three">{CLASSES.map((c, i) => <div key={c}><small>{c} · {(applied.ratios[i] * 100).toFixed(2)}%</small><strong>{fmt(applied.counts[i])}</strong></div>)}</div><p className="bl-help">Total: {fmt(applied.capacity)} troops{applied.shortfall > 0 ? ` · ${fmt(applied.shortfall)} spaces unfilled` : ''}.</p>
          {applied.breakdown && <div className="bl-tier-mix">{CLASSES.map((c,i) => <p key={c}><strong>{c}</strong> {['t11','t10','t9'].filter(t => applied.breakdown[['infantry','lancer','marksman'][i]][t]>0).map(t => `${t.toUpperCase()} FC${applied.model.classes[i].find(e=>e.tier===t).fc} ${fmt(applied.breakdown[['infantry','lancer','marksman'][i]][t])}`).join(' · ') || '0 troops'}</p>)}</div>}
          <p className="bl-model-score">{applied.mixedTiers ? applied.optimalAtDisplayPrecision ? 'Inventory-adjusted optimal boost' : 'Best inventory-adjusted boost' : 'WOS Nerds optimal boost'}: <strong>{applied.sourceBoost.toFixed(4)}</strong></p><p className="bl-help">A comparison score, not a prediction of Bear Trap damage points.</p></div>}

        <button type="submit" className="bl-apply">{applied && !dirty ? 'Calculate again' : 'Calculate & apply squad'}</button>
        <p className="bl-help">Applies a split that fits your troop inventory.</p>

      </div>
      <details className="bl-details"><summary>Formula reference</summary><p className="bl-help">The score compares setups; it is not expected damage points. Single-tier proportions use WOS Nerds’ D² ÷ sum(D²). Mixed tiers weight each class by the T11/T10/T9 troops actually deployed. Higher tiers fill first; inventory and FC overrides are included.</p><p className="bl-help">City attack/lethality share the special-stat pool with widgets. Positions and other base bonuses add percentage points. Chameleon follows the source approximation; city defence down adds to its Defence down skill pool. Enemy health down is excluded. Normalization uses your entered Chameleon and Cyrille values; 0 means no bonus. Mixed tiers and city debuff weighting are model extensions, not verified game damage formulas. Explicit skill levels are used instead of inferring them from stars. <a href="https://wosnerds.com/bear-calc/" target="_blank" rel="noreferrer">WOS Nerds reference</a></p></details>
    </form>
        {actualScore !== null && <p className="bl-model-score" role="status">Current rally boost: <strong>{actualScore.toFixed(4)}</strong><span className="bl-help"> · based on the exact T11/T10/T9 amounts below</span></p>}
    {notice && <p className="bl-status" role="status">{notice}</p>}
  </div>;
}
