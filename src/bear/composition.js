import { integerCounts } from './model.js';
const TYPES = ['infantry', 'lancer', 'marksman'];
export function computeTarget(capacity, mode, ratio, exact) {
  const validCapacity = Number.isSafeInteger(capacity) && capacity > 0;
  if (mode === 'ratio') {
    const values = TYPES.map(t => ratio[t]);
    const sum = values.reduce((a, b) => a + b, 0);
    const valid = validCapacity && values.every(n => Number.isFinite(n) && n >= 0 && n <= 100) && Math.abs(sum - 100) < .001;
    if (!valid) return { valid:false, sum, mode:'ratio', infantry:0, lancer:0, marksman:0 };
    const counts = integerCounts(values, capacity);
    return { valid:true, sum, mode:'ratio', ...Object.fromEntries(TYPES.map((t,i) => [t,counts[i]])) };
  }
  const total = TYPES.reduce((s,t) => s + exact[t], 0);
  const valid = validCapacity && TYPES.every(t => Number.isSafeInteger(exact[t]) && exact[t] >= 0) && total === capacity;
  return { valid, total, mode:'exact', ...Object.fromEntries(TYPES.map(t => [t,exact[t]])) };
}
