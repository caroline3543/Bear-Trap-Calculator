import db from './database.js';
import { calculate, starterPools, combinations } from './model.js';
self.onmessage = ({ data: { profile, pool, slots } }) => {
  try {
    const lists = starterPools(profile, db).map(a => a.length ? a : ['']);
    let best = null, evaluated = 0;
    for (const inf of lists[0]) for (const lan of lists[1]) for (const mar of lists[2]) {
      for (const joiners of combinations(pool, slots)) {
        const next = { ...profile, starters: [inf, lan, mar], joiners };
        const result = calculate(next, db);
        if (!best || result.boost > best.result.boost) best = { profile: next, result };
        if (++evaluated % 1000 === 0) self.postMessage({ type: 'progress', evaluated });
      }
    }
    self.postMessage({ type: 'result', best, evaluated });
  } catch (e) { self.postMessage({ type: 'error', message: e.message }); }
};
