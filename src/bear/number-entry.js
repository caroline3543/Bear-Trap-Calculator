// Accept display grouping and pasted percentages without changing decimal points.
export function parseEntry(text, max = Infinity) {
  const cleaned = String(text).trim().replace(/[,\s%]/g, '');
  if (!cleaned) return null;
  if (!/^\d+(?:\.\d*)?$|^\.\d+$/.test(cleaned)) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) && value <= max ? value : undefined;
}
export function gearDifference(stats, kind) {
  const on = stats[`${kind}On`], off = stats[`${kind}Off`];
  if (on === '' || off === '' || on == null || off == null) return null;
  return Math.round((Number(on) - Number(off)) * 10000) / 10000;
}
export function withGearDifferences(profile) {
  const stats = profile.stats.map(old => {
    const s = { ...old,
      attackOn: old.attackOn ?? old.gearAttack ?? 0,
      attackOff: old.attackOff ?? 0,
      lethalityOn: old.lethalityOn ?? old.gearLethality ?? 0,
      lethalityOff: old.lethalityOff ?? 0,
    };
    return { ...s,
      gearAttack: Math.max(0, gearDifference(s, 'attack') ?? 0),
      gearLethality: Math.max(0, gearDifference(s, 'lethality') ?? 0),
    };
  });
  return { ...profile, stats };
}
