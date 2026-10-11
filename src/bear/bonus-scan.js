export const BONUS_FIELDS = [
  { key: 'allAttack', label: 'All troops attack (%)', match: /troops?\s*['’]?\s*attack/i },
  { key: 'allLethality', label: 'All troops lethality (%)', match: /troops?\s*['’]?\s*lethality/i },
  ...['Infantry', 'Lancer', 'Marksman'].flatMap((name, index) => ['attack', 'lethality'].map(kind => ({
    key: `${index}.${kind}`, label: `${name} ${kind} (%)`, index, kind,
    match: new RegExp(`${name}\\s+${kind}`, 'i'),
  }))),
];
function wordsOf(data) {
  if (data.words?.length) return data.words;
  return (data.blocks || []).flatMap(b => (b.paragraphs || []).flatMap(p => (p.lines || []).flatMap(l => l.words || [])));
}
// Match a label to the percentage on its own row. Ignore defense, health,
// healing and deployment/rally values; an unseen field stays absent, never 0.
export function parseBonusScan(data) {
  const text = data.text || '';
  if (/troops\s+bonus|hero\s+overall\s+stats|rally\s+bonus/i.test(text) && !/bonus\s+overview/i.test(text)) return {};
  const overview = /bonus\s+overview/i.test(text);
  const words = wordsOf(data).filter(w => w.bbox && String(w.text).trim());
  const rows = [];
  for (const word of [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0)) {
    const y = (word.bbox.y0 + word.bbox.y1) / 2;
    const h = word.bbox.y1 - word.bbox.y0;
    let row = rows.find(r => Math.abs(r.y - y) < Math.max(6, Math.min(r.h, h) * .55));
    if (!row) { row = { y, h, words: [] }; rows.push(row); }
    row.words.push(word);
  }
  const lines = words.length ? rows.map(r => {
    const sorted = r.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    return { text: sorted.map(w => w.text).join(' '), confidence: Math.min(...sorted.map(w => Number.isFinite(w.confidence) ? w.confidence : 0)) };
  }) : text.split('\n').map(line => ({ text: line, confidence: 50 }));
  const result = {};
  for (const line of lines) {
    const field = BONUS_FIELDS.find(f => f.match.test(line.text));
    if (!field) continue;
    const labelEnd = line.text.match(field.match).index + line.text.match(field.match)[0].length;
    const raw = line.text.slice(labelEnd).match(/([+]?\d[\d,]*[.,]\d{1,4}|[+]?\d+)\s*%/);
    if (!raw) continue;
    const number = raw[1].includes('.') ? raw[1].replace(/,/g, '') : raw[1].replace(',', '.');
    const value = Number(number);
    if (!Number.isFinite(value) || value < 0 || value > 10000) continue;
    const confidence = overview ? line.confidence : Math.min(60, line.confidence);
    const ambiguousComma = /^\+?\d{1,3},\d{3}$/.test(raw[1]);
    result[field.key] = { value, confidence, uncertain: confidence < 85 || ambiguousComma, alternatives: ambiguousComma ? [Number(raw[1].replace(',', ''))] : [] };
  }
  return result;
}
export function mergeBonusScans(previous, incoming) {
  const merged = { ...previous };
  for (const [key, reading] of Object.entries(incoming)) {
    const old = merged[key];
    if (!old) { merged[key] = reading; continue; }
    const alternatives = [...new Set([old.value, reading.value, ...(old.alternatives || []), ...(reading.alternatives || [])])];
    const best = reading.confidence > old.confidence ? reading : old;
    merged[key] = { ...best, alternatives: alternatives.filter(v => v !== best.value), uncertain: alternatives.length > 1 || best.confidence < 85 };
  }
  return merged;
}
export function applyBonusReadings(profile, readings) {
  const next = { ...profile, stats: profile.stats.map(s => ({ ...s })) };
  for (const field of BONUS_FIELDS) {
    const reading = readings[field.key];
    if (!reading || reading.uncertain || !Number.isFinite(reading.value) || reading.value < 0 || reading.value > 10000) continue;
    if (field.index === undefined) next[field.key] = reading.value;
    else next.stats[field.index][field.kind] = reading.value;
  }
  return next;
}
