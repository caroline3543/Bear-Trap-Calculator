const TYPES = ['infantry', 'lancer', 'marksman'];
const LEVELS = { helios: 11, apex: 10, avex: 10, supreme: 9 };
const normalized = text => String(text).toLowerCase().replace(/[^a-z]/g, '');
const centerX = b => (b.x0 + b.x1) / 2;
const centerY = b => (b.y0 + b.y1) / 2;
export function flattenWords(data) {
  let source = data.words;
  if (!source?.length) source = (data.blocks || []).flatMap(b => (b.paragraphs || []).flatMap(p => (p.lines || []).flatMap(l => l.words || [])));
  if (!source.length) source = (data.lines || []).flatMap(l => l.words || []);
  return source.filter(w => w.text && w.bbox).map(w => ({ ...w, text: w.text.trim(), confidence: Math.min(w.confidence ?? 0, ...(w.symbols || []).map(s => s.confidence ?? 100)) }));
}
export function troopLevel(text) {
  const clean = normalized(text);
  const keyword = Object.keys(LEVELS).find(k => clean.includes(k));
  return keyword ? LEVELS[keyword] : null;
}
// Resolve rows and columns from labels. Neither amounts nor FC badges may
// borrow a neighbor's geometry. An unreadable tier stays unknown, never guessed.
export function troopCards(words) {
  const labels = words.flatMap(w => {
    const clean = normalized(w.text);
    const type = TYPES.find(t => clean.includes(t));
    return type ? [{ label: w, type }] : [];
  }).sort((a,b) => centerY(a.label.bbox) - centerY(b.label.bbox));
  const heights = labels.map(c => c.label.bbox.y1 - c.label.bbox.y0).sort((a,b)=>a-b);
  const h = heights[Math.floor(heights.length / 4)] || 30;
  const rows = [];
  for (const card of labels) {
    if (rows.some(r => r.some(c => c.type === card.type && Math.abs(centerY(c.label.bbox) - centerY(card.label.bbox)) < h * .5 && Math.abs(centerX(c.label.bbox) - centerX(card.label.bbox)) < h))) continue;
    let row = rows.find(r => Math.abs(centerY(r[0].label.bbox) - centerY(card.label.bbox)) < h * .7);
    if (!row) { row = []; rows.push(row); }
    row.push(card);
  }
  return rows.flatMap(row => {
    row.sort((a,b)=>centerX(a.label.bbox)-centerX(b.label.bbox));
    return row.map((card,i) => {
      const b = card.label.bbox;
      const xMin = i ? (centerX(row[i-1].label.bbox)+centerX(b))/2 : 0;
      const xMax = row[i+1] ? (centerX(row[i+1].label.bbox)+centerX(b))/2 : Infinity;
      const tierWord = words.find(w => troopLevel(w.text) && Math.abs(centerY(w.bbox)-centerY(b)) < h * .75 && w.bbox.x0 >= xMin && w.bbox.x0 <= b.x1 && w.bbox.x0 >= b.x0-h*7);
      const prefix = tierWord?.bbox.x0 ?? Math.max(xMin, b.x0 - h * 3.4);
      const level = troopLevel(card.label.text) || troopLevel(tierWord?.text);
      const rowBottom = Math.max(b.y1, tierWord?.bbox.y1 || 0);
      return { ...card, h, level, prefixKnown: Boolean(tierWord), tierConfidence: tierWord?.confidence ?? (level ? card.label.confidence : 0), xMin, xMax, prefix,
        amountRegion: { sx: prefix, sy: rowBottom + h * .08, sw: Math.min(xMax-prefix, Math.max(b.x1-prefix, h*7.5)), sh: h*1.65 },
        labelRegion: { sx: Math.max(xMin, b.x0-h*6.8), sy: b.y0-h*.3, sw: Math.min(xMax-Math.max(xMin,b.x0-h*6.8), b.x1-Math.max(xMin,b.x0-h*6.8)+h*.2), sh: b.y1-b.y0+h*.6 } };
    });
  });
}
export function confirmAmountReadings(readings, baseline) {
  const groups = new Map();
  for (const reading of readings) {
    const raw = String(reading.text).trim();
    if (!/^\d[\d, .]*$/.test(raw)) continue;
    const digits = raw.replace(/[, .]/g,'');
    if (digits.length > 9) continue;
    const value = Number(digits);
    const group = groups.get(value) || { count:0, confidence:0 };
    group.count++; group.confidence = Math.max(group.confidence, Number(reading.confidence)||0); groups.set(value,group);
  }
  const candidates = [...groups].filter(([,r])=>r.count >= 2 && r.confidence >= 65);
  if (candidates.length === 1) return { value:candidates[0][0], confidence:candidates[0][1].confidence };
  if (groups.size === 1 && baseline?.confidence >= 85) {
    const [value, group] = [...groups][0];
    if (group.count >= 3 && baseline.value === value) return { value, confidence: baseline.confidence };
  }
  return null;
}
export function parseScanText(data) {
  const words = flattenWords(data), cards = troopCards(words), values = {}, confidence = {};
  for (const card of cards) {
    if (!card.level) continue;
    const region = card.amountRegion;
    const tokens = words.filter(w => w.bbox.y0 >= region.sy-hint(card.h) && w.bbox.y1 <= region.sy+region.sh && w.bbox.x0 >= region.sx && centerX(w.bbox) < region.sx+region.sw && /^[\d,.]+$/.test(w.text));
    tokens.sort((a,b)=>a.bbox.x0-b.bbox.x0);
    // Multiple plausible lines inside a card require the targeted OCR pass.
    if (!tokens.length || tokens.some(w=>Math.abs(centerY(w.bbox)-centerY(tokens[0].bbox))>card.h*.45)) continue;
    const raw = tokens.map(w=>w.text).join('');
    if (!/^\d[\d,.]*$/.test(raw)) continue;
    const value = Number(raw.replace(/[,.]/g,''));
    if (!Number.isSafeInteger(value) || value > 999999999) continue;
    const key = 't'+card.level+card.type[0].toUpperCase()+card.type.slice(1);
    if (values[key] !== undefined) { confidence[key] = Math.min(confidence[key], 60); continue; }
    values[key] = value; confidence[key] = Math.min(card.tierConfidence, ...tokens.map(w=>w.confidence));
  }
  return { values, confidence, cards, rawText:data.text || '' };
}
function hint(h) { return h*.15; }
export function resolveCardLabel(original, data) {
  const card = { ...original, amountRegion: { ...original.amountRegion } };
  card.level = troopLevel(data.text);
  const prefixWord = flattenWords(data).find(w => troopLevel(w.text) === card.level);
  card.tierConfidence = prefixWord?.confidence ?? data.confidence;
  if (!card.level || card.tierConfidence < 65) return { ...card, level: null };
  card.prefixKnown = Boolean(prefixWord);
  card.prefix = prefixWord ? Math.max(0, card.labelRegion.sx) + prefixWord.bbox.x0 / 3 : Math.max(card.xMin, card.label.bbox.x0-card.h*(card.level === 9 ? 5.6 : 3.5));
  card.amountRegion.sx = card.prefix;
  card.amountRegion.sw = Math.min(card.xMax-card.prefix, Math.max(card.label.bbox.x1-card.prefix, card.h*7.5));
  return card;
}
export function mergeBadgeReadings(previous = {}, incoming = {}) {
  const merged = { ...previous };
  for (const [type, reading] of Object.entries(incoming)) {
    const old = merged[type];
    if (old && old.level > reading.level) continue;
    merged[type] = old && old.level === reading.level && old.fc !== reading.fc
      ? { ...(old.confidence > reading.confidence ? old : reading), uncertain: true }
      : reading;
  }
  return merged;
}
