import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import db from './database.js';
import { CLASSES, calculate, integerCounts } from './model.js';
import { parseEntry, gearDifference, withGearDifferences } from './number-entry.js';
import { JOINERS, heroNamesForClass, migrateSetup, resolveHero, starKey } from './leader-setup.js';
import './bear-lab.css';

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
export default function BearLab({ accountId, accountName, leaderCapacity, leaderMinister = 'None', onApplyLeader }) {
  const [draft, setDraft] = useState(() => loadSetup(accountId));
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [applied, setApplied] = useState(null);
  const [dirty, setDirty] = useState(false);
  const panelId = useId();
  const launchRef = useRef(null);
  const mounted = useRef(false);
  useEffect(() => {
    try {
      localStorage.setItem(`bearLeader:v2:${accountId}`, JSON.stringify({ profile: draft }));
      localStorage.removeItem(`bearLab:v1:${accountId}`);
    } catch { setNotice('Your browser could not save this setup. You can still calculate.'); }
  }, [accountId, draft]);
  useEffect(() => {
    if (mounted.current) setDirty(true);
    mounted.current = true;
  }, [leaderCapacity, leaderMinister]);
  function edit(fields) { setDraft(p => ({ ...p, ...fields })); setDirty(true); setNotice(''); }
  function editAt(field, i, fields) {
    setDraft(p => ({ ...p, [field]: p[field].map((v, j) => i === j ? { ...v, ...fields } : v) }));
    setDirty(true); setNotice('');
  }
  const assessment = useMemo(() => {
    const errors = [];
    const starters = draft.starters.map((h, i) => resolveHero(h, HERO_NAMES[i]));
    const joiners = draft.joiners.map(h => resolveHero(h, JOINERS));
    const roster = {};
    CLASSES.forEach((c, i) => {
      if (!starters[i]) errors.push(`${c}: choose a matching leader hero.`);
      const info = draft.heroInfo[i];
      const key = starKey(info.stars);
      const starTable = db.starLevelStats[Object.keys(db.starLevelStats).find(h => h.toLowerCase().replace(/[^a-z0-9]/g, '') === starters[i].toLowerCase().replace(/[^a-z0-9]/g, ''))];
      if (!key || (starTable && !(key in starTable))) errors.push(`${c}: enter a supported star step (e.g. 4.3 or 5.0).`);
      if (info.widget === '' || !Number.isInteger(Number(info.widget)) || info.widget < 0 || info.widget > 10) errors.push(`${c}: widget must be a whole number from 0 to 10.`);
      if (info.skill === '' || !Number.isInteger(Number(info.skill)) || info.skill < 1 || info.skill > 5) errors.push(`${c}: skill must be a whole number from 1 to 5.`);
      roster[starters[i]] = { stars: key, widget: info.widget, skill: info.skill };
      const tier = draft.tierInputs[i];
      if (tier.fc === '' || tier.level === '' || !db.troopDamageStats[`FC${tier.fc} T${tier.level}`]) errors.push(`${c}: FC must be 0–10 and troop level 1–11, using whole numbers.`);
      if (!['attack', 'lethality'].every(k => gearDifference(draft.stats[i], k) !== null && gearDifference(draft.stats[i], k) >= 0)) errors.push(`${c}: complete both gear readings; gear on must be at least gear off.`);
      if (draft.stats[i].attack === '' || draft.stats[i].lethality === '') errors.push(`${c}: complete the extra base bonuses or enter 0.`);
    });
    if (joiners.some(h => !h)) errors.push('Choose four joiner heroes from Seo-yoon, Reina, Norah and Jessie.');
    if (['allAttack', 'allLethality', 'chameleon', 'tiger', 'lion'].some(k => draft[k] === '')) errors.push('Complete the attack, lethality and pet bonuses, or enter 0.');
    if (!(leaderCapacity > 0)) errors.push('Enter a positive rally capacity above.');
    const profile = withGearDifferences({ ...draft, capacity: leaderCapacity, capacityIsEffective: true,
      starters, joiners, roster, tiers: draft.tierInputs.map(t => `FC${t.fc} T${t.level}`),
      minister: leaderMinister, petsActive: true, trap: 25 });
    return { errors, profile, result: errors.length ? null : calculate(profile, db) };
  }, [draft, leaderCapacity, leaderMinister]);
  function apply() {
    if (!assessment.result) return;
    onApplyLeader(assessment.result.counts, integerCounts(assessment.result.ratios, 10000).map(n => n / 100));
    setApplied({ capacity: leaderCapacity, heroes: assessment.profile.starters });
    setDirty(false); setOpen(false); setNotice('Recommended percentages and troop amounts applied below.');
    launchRef.current?.focus();
  }
  return <div className="bear-leader-helper">
    <button type="button" ref={launchRef} className="bl-launch" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(v => !v)}>
      <span>Calculate recommended rally leader squad</span><span aria-hidden="true">{open ? '−' : '+'}</span>
    </button>
    {!open && applied && <p className="bl-status">{dirty ? 'Setup changed. Open and recalculate to update your squad.' : `${applied.heroes.join(' · ')} · ${fmt(applied.capacity)} troops before inventory limits`}</p>}
    {open && <form id={panelId} className="bl-panel" onSubmit={e => { e.preventDefault(); apply(); }}>
      <p className="bl-help">Saved for {accountName}. Uses the capacity above. Four level-5 joiners, active pets and a 25% trap attack buff are assumed.</p>
      <div className="bl-grid two">
        <NumberField label="All troops attack (%)" value={draft.allAttack} onChange={v => edit({ allAttack: v })} />
        <NumberField label="All troops lethality (%)" value={draft.allLethality} onChange={v => edit({ allLethality: v })} />
      </div>
      <p className="bl-help">Enter base bonuses before these heroes, gear and pets. Paste commas or % signs; the app handles them.</p>
      {CLASSES.map((c, i) => <fieldset className="bl-class" key={c}><legend>{c}</legend>
        <HeroNameField label="Hero name" ariaLabel={`${c} hero`} value={draft.starters[i]} names={HERO_NAMES[i]} onChange={v => edit({ starters: draft.starters.map((h, j) => i === j ? v : h) })} />
        <div className="bl-grid three">
          <NumberField label="Stars" ariaLabel={`${c} stars`} value={draft.heroInfo[i].stars} max={5} fixed={1}
            validate={n => starKey(n) && (n === 5 || Math.round(n * 10) % 10 <= 5) ? '' : 'Use one decimal: .0–.5 steps, or 5.0.'}
            onChange={v => editAt('heroInfo', i, { stars: v })} help="e.g. 4.3 · max 5.0" />
          <NumberField label="Widget" ariaLabel={`${c} widget`} value={draft.heroInfo[i].widget} max={10} decimal={false} onChange={v => editAt('heroInfo', i, { widget: v })} help="0–10" />
          <NumberField label="Skills" ariaLabel={`${c} skill level`} value={draft.heroInfo[i].skill} min={1} max={5} decimal={false} onChange={v => editAt('heroInfo', i, { skill: v })} help="1–5" />
        </div>
        <div className="bl-grid two bl-tier-row">
          <NumberField label="FC" ariaLabel={`${c} FC`} value={draft.tierInputs[i].fc} max={10} decimal={false} onChange={v => editAt('tierInputs', i, { fc: v })} help="0 for no Fire Crystal" />
          <NumberField label="Troop level" ariaLabel={`${c} troop level`} value={draft.tierInputs[i].level} min={1} max={11} decimal={false} onChange={v => editAt('tierInputs', i, { level: v })} help="1–11" />
        </div>
        <details className="bl-details"><summary>Gear on / off <span>{['attack', 'lethality'].map(k => gearDifference(draft.stats[i], k)).every(n => n !== null && n >= 0) ? `+${fmt(gearDifference(draft.stats[i], 'attack'))} attack · +${fmt(gearDifference(draft.stats[i], 'lethality'))} lethality` : 'Complete both readings'}</span></summary>
          <p className="bl-help">Keep heroes, pets and buffs the same. Only the gear difference is added.</p>
          {['attack', 'lethality'].map(kind => <div key={kind}>
            <h4 className="bl-stat-title">{kind}</h4>
            <div className="bl-grid two">{[['On', 'Gear on'], ['Off', 'Gear off']].map(([suffix, label]) => <NumberField key={suffix}
              label={`${label} (%)`} ariaLabel={`${c} ${kind} · ${label} (%)`} value={draft.stats[i][kind + suffix]}
              onChange={v => editAt('stats', i, { [kind + suffix]: v })} />)}</div>
            <p className={gearDifference(draft.stats[i], kind) < 0 ? 'bl-error' : 'bl-difference'}>{gearDifference(draft.stats[i], kind) === null ? 'Enter both readings.' : gearDifference(draft.stats[i], kind) < 0 ? 'Gear on must be at least gear off.' : `+${fmt(gearDifference(draft.stats[i], kind))} ${kind} percentage points`}</p>
          </div>)}
        </details>
      </fieldset>)}
      <details className="bl-details"><summary>Joiner heroes <span>4 players · level 5 skills</span></summary>
        <p className="bl-help">Only Seo-yoon, Reina, Norah and Jessie. Different players can use the same hero.</p>
        <div className="bl-grid two">{JOINERS.map((_, i) => <HeroNameField key={i} label={`Joiner ${i + 1}`} value={draft.joiners[i]} names={JOINERS}
          onChange={v => edit({ joiners: draft.joiners.map((h, j) => i === j ? v : h) })} />)}</div>
      </details>
      <details className="bl-details"><summary>Active pet bonuses <span>Pets always active</span></summary>
        <p className="bl-help">Enter your active percentages. Snow ape capacity is already included above.</p>
        <div className="bl-grid two">{[['chameleon', 'Chameleon (%)'], ['tiger', 'Sabre-tooth lethality (%)'], ['lion', 'Cave lion attack (%)']].map(([field, label]) => <NumberField key={field}
          label={label} value={draft[field]} max={1000} onChange={v => edit({ [field]: v })} />)}</div>
      </details>
      <details className="bl-details"><summary>Extra class bonuses <span>Optional · defaults to 0</span></summary>
        <p className="bl-help">Separate base bonuses only; gear differences are already counted.</p>
        {CLASSES.map((c, i) => <div className="bl-grid two" key={c}>{['attack', 'lethality'].map(kind => <NumberField key={kind}
          label={`${c} base ${kind} (%)`} value={draft.stats[i][kind]} onChange={v => editAt('stats', i, { [kind]: v })} />)}</div>)}
      </details>
      <div className="bl-apply-area">
        {assessment.errors.length > 0 && <p className="bl-help" role="status">{assessment.errors[0]}{assessment.errors.length > 1 ? ` (${assessment.errors.length - 1} more to complete)` : ''}</p>}
        <button type="submit" className="bl-apply" disabled={!assessment.result}>Calculate & use recommended squad</button>
        <p className="bl-help">Fills the percentages and amounts below. Your troop pool still limits what can be sent.</p>
      </div>
      <details className="bl-details"><summary>Formula reference</summary><p className="bl-help">Proportions use the theoretical WOS Nerds comparison model: each class’s D² ÷ sum(D²), rounded to whole troops. This does not predict game damage. <a href="https://wosnerds.com/bear-calc/" target="_blank" rel="noreferrer">WOS Nerds formula reference</a>.</p></details>
    </form>}
    {notice && <p className="bl-status" role="status">{notice}</p>}
  </div>;
}
