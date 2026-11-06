import { integerCounts } from './model.js';
const TYPES = ['infantry', 'lancer', 'marksman'];

export function joinerCapacities(cap, count, enabled, heroCount, noHeroCapacity) {
  const safe = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
  return Array.from({ length: safe(count) }, (_, index) =>
    enabled && index >= safe(heroCount) ? Math.min(safe(cap), safe(noHeroCapacity)) : safe(cap));
}

// Scale the whole composition together, including stock-limited partial targets.
export function scaleJoinerTarget(target, baseCapacity, capacity) {
  if (!target.valid || baseCapacity <= 0 || capacity <= 0) return { ...target, valid: false };
  if (capacity === baseCapacity) return target;
  const values = TYPES.map(type => target[type]);
  const total = values.reduce((sum, value) => sum + value, 0);
  const scaledTotal = Math.min(capacity, Math.round(total * capacity / baseCapacity));
  const counts = total > 0 ? integerCounts(values, scaledTotal) : [0, 0, 0];
  return { ...target, total: scaledTotal, shortfall: capacity - scaledTotal,
    ...Object.fromEntries(TYPES.map((type, index) => [type, counts[index]])) };
}
