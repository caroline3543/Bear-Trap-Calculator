const TYPES = ['infantry', 'lancer', 'marksman'];
export function loadTroopTiers(accountId, saved, storage = globalThis.localStorage) {
  let legacy = {};
  try { legacy = JSON.parse(storage?.getItem(`bearLeader:v2:${accountId}`) || storage?.getItem(`bearLab:v1:${accountId}`) || '{}').profile || {}; } catch {}
  return TYPES.map((_, i) => {
    const previous = saved?.troopTiers?.[i] || legacy.tierInputs?.[i];
    const match = /FC(\d+) T(\d+)/.exec(legacy.tiers?.[i] || '');
    return { fc: previous?.fc ?? Number(match?.[1] ?? 6), level: previous?.level ?? Number(match?.[2] ?? 10) };
  });
}
// Keep per-class FC/tier readings together; a missing badge must not change saved data.
export function mergeScannedTiers(previous, readings = {}) {
  return TYPES.map((type, i) => {
    const value = readings[type];
    if (!value || !Number.isInteger(value.fc) || value.fc < 0 || value.fc > 10 || ![9, 10, 11].includes(value.level)) return previous[i];
    return { fc: value.fc, level: value.level };
  });
}
export function selectScannedTiers(badges) {
  const result = {};
  for (const badge of badges) {
    if (!TYPES.includes(badge.type) || !Number.isInteger(badge.fc) || badge.fc < 1 || badge.fc > 10 || badge.confidence < 65) continue;
    if (!result[badge.type] || badge.level > result[badge.type].level) result[badge.type] = { fc: badge.fc, level: badge.level };
  }
  return result;
}
// Require agreement between close-up crops, not a single guessed digit.
export function confirmFcReadings(readings) {
  const groups = new Map();
  for (const reading of readings) {
    const text = String(reading.text).trim();
    if (!/^(?:[1-9]|10)$/.test(text)) continue;
    const group = groups.get(text) || { count: 0, confidence: 0 };
    group.count++; group.confidence = Math.max(group.confidence, Number(reading.confidence) || 0);
    groups.set(text, group);
  }
  const candidates = [...groups].filter(([,g]) => g.count >= 2 && g.confidence >= 65);
  if (candidates.length !== 1) return null;
  return { fc: Number(candidates[0][0]), confidence: candidates[0][1].confidence };
}
// Badge is just left of the troop name, above the icon. Use each name's own
// geometry, not a fixed screenshot position or the account's furnace level.
export function locateFcBadges(words, values = {}) {
  const tiers = { helios: 11, apex: 10, avex: 10, supreme: 9 };
  const labels = words.filter(w => TYPES.some(t => w.text.toLowerCase().includes(t)));
  const heights = labels.map(w => w.bbox.y1 - w.bbox.y0).sort((a, b) => a - b);
  const h = heights[Math.floor(heights.length / 2)] || 0;
  if (!h) return [];
  const results = [];
  for (const label of labels) {
    const type = TYPES.find(t => label.text.toLowerCase().includes(t));
    const nearby = words.filter(w => Math.abs((w.bbox.y0 + w.bbox.y1 - label.bbox.y0 - label.bbox.y1) / 2) < h * 1.2 && w.bbox.x0 <= label.bbox.x1 && w.bbox.x0 >= label.bbox.x0 - h * 7);
    const tierWord = nearby.find(w => Object.keys(tiers).some(t => w.text.toLowerCase().includes(t)));
    const cap = type[0].toUpperCase() + type.slice(1);
    const level = tierWord ? tiers[Object.keys(tiers).find(t => tierWord.text.toLowerCase().includes(t))]
      : [11, 10, 9].find(n => values[`t${n}${cap}`] > 0);
    if (!level) continue;
    // Median text height avoids noisy boxes that also include an icon.
    const prefixWidths = { 9: 6.1, 10: 4.35, 11: 4.6 };
    const x = level === 9 && tierWord ? tierWord.bbox.x0 - h * 1.05 : label.bbox.x0 - h * prefixWidths[level];
    const y = label.bbox.y0 - h * .2;
    results.push({ type, level, sx: x - h * .4, sy: y - h * .55, sw: h * .8, sh: h * 1.1 });
  }
  return results;
}
