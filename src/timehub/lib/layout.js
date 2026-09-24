/* Dashboard section order — one global layout shared by every account. */
export const SECTION_IDS = ["today", "bookings", "events", "training", "research", "contrib", "friends", "history"];
/** Sections that span both columns on wide screens. */
export const FULL_WIDTH = new Set(["today"]);
export const DEFAULT_LAYOUT = [...SECTION_IDS];

export function sanitizeLayout(layout) {
  const seen = new Set();
  const out = [];
  for (const id of Array.isArray(layout) ? layout : []) {
    if (SECTION_IDS.includes(id) && !seen.has(id)) { seen.add(id); out.push(id); }
  }
  // sections added in a later version go in at their default position
  // (right after the section that precedes them by default, or first)
  DEFAULT_LAYOUT.forEach((id, i) => {
    if (seen.has(id)) return;
    const prev = i > 0 ? out.indexOf(DEFAULT_LAYOUT[i - 1]) : -1;
    out.splice(prev + 1, 0, id);
    seen.add(id);
  });
  return out;
}

export function moveSection(layout, id, delta) {
  const list = sanitizeLayout(layout);
  const i = list.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return list;
  [list[i], list[j]] = [list[j], list[i]];
  return list;
}

/** Move `id` so it sits at index `to` (for drag and drop). */
export function placeSection(layout, id, to) {
  const list = sanitizeLayout(layout).filter((x) => x !== id);
  list.splice(Math.max(0, Math.min(list.length, to)), 0, id);
  return list;
}

/** Split an ordered list into two columns, alternating, so reading order stays left→right, top→bottom. */
export function splitColumns(layout) {
  const left = [];
  const right = [];
  layout.forEach((id, i) => (i % 2 === 0 ? left : right).push(id));
  return [left, right];
}

/** Break the order into rows: full-width sections alone, the rest paired into two columns. */
export function layoutRuns(layout) {
  const runs = [];
  let block = [];
  for (const id of layout) {
    if (FULL_WIDTH.has(id)) {
      if (block.length) runs.push({ type: "cols", ids: block });
      block = [];
      runs.push({ type: "full", id });
    } else block.push(id);
  }
  if (block.length) runs.push({ type: "cols", ids: block });
  return runs;
}
