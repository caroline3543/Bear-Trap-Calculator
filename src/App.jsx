import React, { useState, useMemo, useEffect } from "react";

/* ============================================================
   THEME / TOKENS
   ============================================================ */
const C = {
  bgPage: "#1D1C1A",
  surface: "#252320",
  headerDark: "#2E4A47",
  headerDark2: "#3D5F5B",
  cardBorder: "#3A362F",
  inputBg: "#201F1D",
  inputBorder: "#45403A",
  gold: "#5FADA6",
  goldStrong: "#357872",
  goldBg: "#1F2E2C",
  goldBorder: "#3C5652",
  green: "#82B98D",
  greenBg: "#212A1F",
  amber: "#D3A268",
  amberBg: "#2E2620",
  red: "#D08880",
  redBg: "#2E2220",
  ink: "#EAE6DD",
  sub: "#9C958A",
  white: "#FFFFFF",
};

// Muted per-troop-type accent colors (used for dots/chips across the app).
const TYPE_COLOR = { infantry: "#8FAE87", lancer: "#8C9FCB", marksman: "#5FADA6" };

const TYPES = ["infantry", "lancer", "marksman"];
// Damage priority (Bear Trap meta): Marksman > Lancer > Infantry.
const FILL_ORDER = ["lancer", "infantry", "marksman"];
const PRIORITY_ORDER = ["marksman", "lancer", "infantry"];
const TYPE_LABEL = { infantry: "Infantry", lancer: "Lancer", marksman: "Marksman" };

/* ============================================================
   HELPERS
   ============================================================ */
function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return "0";
  return Math.round(n).toLocaleString("en-US");
}
function toNonNegInt(v) {
  const n = parseInt(String(v).replace(/[^0-9-]/g, ""), 10);
  if (isNaN(n) || n < 0) return 0;
  return n;
}

/* Manual ratio/exact target (unchanged core logic). */
function computeTarget(capacity, mode, ratio, exact) {
  if (mode === "ratio") {
    const sum = ratio.infantry + ratio.lancer + ratio.marksman;
    const valid = Math.abs(sum - 100) < 0.001 && capacity > 0;
    if (!valid) return { valid: false, sum, mode: "ratio", infantry: 0, lancer: 0, marksman: 0 };
    const infantry = Math.round((capacity * ratio.infantry) / 100);
    const lancer = Math.round((capacity * ratio.lancer) / 100);
    const marksman = capacity - infantry - lancer; // remainder absorbs rounding
    return { valid: true, sum, mode: "ratio", infantry, lancer, marksman: Math.max(0, marksman) };
  } else {
    const total = exact.infantry + exact.lancer + exact.marksman;
    const valid = total === capacity && capacity > 0;
    return { valid, total, mode: "exact", infantry: exact.infantry, lancer: exact.lancer, marksman: exact.marksman };
  }
}

const DIVERSITY_FLOOR = 1; // every squad always carries at least this much of each troop type

/* Builds a per-squad target that (1) guarantees each type's floor first —
   capped by what `divisor` squads can actually draw from the pool — then
   (2) spends whatever capacity is left in Marksman > Lancer > Infantry
   priority order. Used for both the Stronger and Weaker tiers so floors are
   real, guaranteed allocations rather than a post-hoc warning. */
function priorityTargetWithFloors(capacity, available, divisor, floors) {
  if (!capacity || capacity <= 0 || !divisor || divisor <= 0) {
    return { infantry: 0, lancer: 0, marksman: 0, valid: false, shortfall: 0, floorsMet: { infantry: true, lancer: true, marksman: true } };
  }
  const maxByStock = {};
  TYPES.forEach((t) => (maxByStock[t] = Math.floor((available[t] || 0) / divisor)));

  const result = {};
  let remaining = capacity;
  const floorsMet = {};
  TYPES.forEach((t) => {
    const want = Math.max(0, floors[t] || 0);
    const give = Math.min(want, maxByStock[t], remaining);
    result[t] = give;
    remaining -= give;
    floorsMet[t] = give >= want;
  });

  PRIORITY_ORDER.forEach((t) => {
    if (remaining <= 0) return;
    const extra = Math.max(0, maxByStock[t] - result[t]);
    const use = Math.min(extra, remaining);
    result[t] += use;
    remaining -= use;
  });

  return { infantry: result.infantry, lancer: result.lancer, marksman: result.marksman, valid: true, shortfall: Math.max(0, remaining), floorsMet };
}

/* Allocate ONE squad's target against shared pools, then apply accepted
   manual fills, then compute fresh fill suggestions for any leftover space. */
function allocateSquad(capacity, target, pools, acceptedFills = []) {
  const breakdown = {};
  let totalAllocated = 0;

  TYPES.forEach((t) => {
    const want = target[t] || 0;
    const t10Alloc = Math.min(want, pools.t10[t]);
    pools.t10[t] -= t10Alloc;
    const stillWant = want - t10Alloc;
    const t9Alloc = Math.min(stillWant, pools.t9[t]);
    pools.t9[t] -= t9Alloc;
    const total = t10Alloc + t9Alloc;
    breakdown[t] = { target: want, t10: t10Alloc, t9: t9Alloc, total, shortage: Math.max(0, want - total) };
    totalAllocated += total;
  });

  let capacityRemaining = Math.max(0, capacity - totalAllocated);

  const appliedFills = [];
  acceptedFills.forEach((fill) => {
    if (capacityRemaining <= 0) {
      appliedFills.push({ ...fill, applied: 0 });
      return;
    }
    const use = Math.max(0, Math.min(fill.amount, pools[fill.tier][fill.type], capacityRemaining));
    if (use > 0) {
      breakdown[fill.type][fill.tier] += use;
      breakdown[fill.type].total += use;
      pools[fill.tier][fill.type] -= use;
      totalAllocated += use;
      capacityRemaining -= use;
    }
    appliedFills.push({ ...fill, applied: use });
  });

  let status = "full";
  if (totalAllocated < capacity) status = "partial";

  const suggestions = [];
  if (capacityRemaining > 0) {
    let remaining = capacityRemaining;
    for (const tier of ["t10", "t9"]) {
      for (const t of FILL_ORDER) {
        if (remaining <= 0) break;
        const avail = pools[tier][t];
        if (avail > 0) {
          const use = Math.min(avail, remaining);
          suggestions.push({ tier, type: t, amount: use });
          remaining -= use;
        }
      }
      if (remaining <= 0) break;
    }
  }

  const t10Used = TYPES.reduce((s, t) => s + breakdown[t].t10, 0);
  const t9Used = TYPES.reduce((s, t) => s + breakdown[t].t9, 0);

  return {
    breakdown,
    totalAllocated,
    capacityRemaining,
    status,
    suggestions,
    appliedFills,
    pctOf: (n) => (totalAllocated > 0 ? (n / totalAllocated) * 100 : 0),
    t10Pct: totalAllocated > 0 ? (t10Used / totalAllocated) * 100 : 0,
    t9Pct: totalAllocated > 0 ? (t9Used / totalAllocated) * 100 : 0,
  };
}

/* ============================================================
   SMALL UI PRIMITIVES
   ============================================================ */
function SectionHeader({ title, sub, step }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {step && (
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 999,
              background: C.goldStrong,
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }}
          >
            {step}
          </span>
        )}
        <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink, letterSpacing: 0.6, textTransform: "uppercase" }}>{title}</div>
      </div>
      <div style={{ height: 2, width: 32, background: C.goldBorder, borderRadius: 999, marginTop: 9, marginLeft: step ? 34 : 0 }} />
      {sub && <div style={{ fontSize: 12.5, color: C.sub, marginTop: 8, marginLeft: step ? 34 : 0, fontWeight: 400 }}>{sub}</div>}
    </div>
  );
}
function Card({ children, style }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 24, padding: 22, boxShadow: "0 4px 18px rgba(0,0,0,0.28)", ...style }}>
      {children}
    </div>
  );
}
function NumField({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 100 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: C.sub }}>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={fmt(value)}
        onChange={(e) => onChange(toNonNegInt(e.target.value))}
        style={{ fontSize: 16, fontWeight: 600, padding: "13px 14px", borderRadius: 16, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.ink, outline: "none", width: "100%", boxSizing: "border-box" }}
      />
    </label>
  );
}

/* Typed percentage entry — independent per field, no artificial clamping
   while typing; the total-must-equal-100% check happens separately below. */
function PctField({ label, value, onChange, colorDot }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 90 }}>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: C.sub, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: colorDot, display: "inline-block" }} />
        {label}
      </span>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(toNonNegInt(e.target.value))}
          style={{ fontSize: 16, fontWeight: 600, padding: "13px 30px 13px 14px", borderRadius: 16, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.ink, outline: "none", width: "100%", boxSizing: "border-box" }}
        />
        <span style={{ position: "absolute", right: 12, top: 13, color: C.sub, fontWeight: 500, fontSize: 13 }}>%</span>
      </div>
    </label>
  );
}

/* Stacked bar preview of a composition — visualizes the ratio at a glance. */
function CompositionBar({ segments }) {
  const total = segments.reduce((s, x) => s + x.pct, 0);
  const gap = Math.max(0, 100 - total);
  return (
    <div style={{ display: "flex", height: 14, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.cardBorder}`, marginTop: 10 }}>
      {segments.map((s, i) => s.pct > 0 && <div key={i} style={{ width: `${Math.min(s.pct, 100)}%`, background: s.color, transition: "width 120ms ease" }} />)}
      {gap > 0 && <div style={{ width: `${gap}%`, background: "#2A2825" }} />}
    </div>
  );
}

function TroopChip({ label, value, color, strong }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: strong ? C.goldBg : "#282622",
        border: `1px solid ${strong ? C.goldBorder : C.cardBorder}`,
        borderRadius: 999,
        padding: "7px 13px",
        fontSize: 12,
        fontWeight: 600,
        color: strong ? C.gold : C.ink,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: color, display: "inline-block", flexShrink: 0 }} />
      {label}: {fmt(value)}
    </div>
  );
}

function Pill({ children, tone, icon }) {
  const map = {
    green: [C.greenBg, C.green],
    amber: [C.amberBg, C.amber],
    red: [C.redBg, C.red],
    gold: [C.goldBg, C.gold],
    neutral: ["#2A2825", C.sub],
  };
  const [bg, fg] = map[tone] || map.neutral;
  return (
    <span style={{ background: bg, color: fg, fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 999, letterSpacing: 0.2, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

function Btn({ children, onClick, tone = "primary", small }) {
  const styles = {
    primary: { background: C.headerDark, color: "#fff", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" },
    ghost: { background: C.surface, color: C.ink, border: `1px solid ${C.cardBorder}`, boxShadow: "none" },
    danger: { background: C.surface, color: C.red, border: `1px solid ${C.red}`, boxShadow: "none" },
    gold: { background: C.goldStrong, color: "#fff", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" },
  };
  return (
    <button
      onClick={onClick}
      style={{
        ...styles[tone],
        borderRadius: 14,
        padding: small ? "8px 12px" : "12px 16px",
        fontWeight: 600,
        fontSize: small ? 12.5 : 13.5,
        cursor: "pointer",
        flex: small ? "0 0 auto" : "1 1 auto",
        minHeight: small ? 34 : 44,
      }}
    >
      {children}
    </button>
  );
}

/* Small readonly composition chip row, used by Recommended / Tiered cards */
function TargetPreview({ target }) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {TYPES.map((t) => (
        <div key={t}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: C.gold, textTransform: "uppercase", letterSpacing: 0.3 }}>{TYPE_LABEL[t]}</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>{fmt(target[t])}</div>
        </div>
      ))}
    </div>
  );
}

/* Slim progress bar showing how full a squad is against its capacity. */
function ProgressBar({ pct, tone }) {
  const color = tone === "green" ? C.green : tone === "amber" ? C.amber : C.sub;
  const bg = tone === "green" ? "#2A2926" : tone === "amber" ? "#332A20" : "#2A2825";
  return (
    <div style={{ height: 7, borderRadius: 999, background: bg, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 999, transition: "width 150ms ease" }} />
    </div>
  );
}

/* ============================================================
   SQUAD CARD
   ============================================================ */
function SquadCard({ index, squadKey, result, invalid, onAcceptFill, onRemoveFill, tierLabel }) {
  if (invalid) {
    return (
      <Card style={{ borderColor: C.red, background: C.redBg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 600, color: C.headerDark }}>Squad {index}</div>
          <Pill tone="red" icon="✕">Invalid target</Pill>
        </div>
        <div style={{ fontSize: 12.5, color: C.red, marginTop: 8 }}>Fix the composition inputs before squads can be calculated.</div>
      </Card>
    );
  }

  const isFull = result.status === "full";
  const tone = isFull ? "green" : "amber";
  const borderColor = isFull ? "#2C3A2A" : "#3A2F22";
  const bg = isFull ? C.greenBg : C.amberBg;
  const tierAccent = tierLabel === "Stronger" ? C.gold : tierLabel === "Weaker" ? TYPE_COLOR.lancer : null;
  const fillPct = result.totalAllocated > 0 || result.capacityRemaining > 0 ? (result.totalAllocated / (result.totalAllocated + result.capacityRemaining)) * 100 : 0;

  return (
    <Card style={{ borderColor, borderLeft: tierAccent ? `4px solid ${tierAccent}` : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 600, color: C.ink, fontSize: 15.5 }}>
          Squad {index} {tierLabel && <span style={{ fontSize: 10.5, fontWeight: 500, color: C.sub, textTransform: "uppercase", marginLeft: 6 }}>{tierLabel}</span>}
        </div>
        <Pill tone={tone} icon={isFull ? "✓" : "⚠"}>{isFull ? "Full" : "Partial"}</Pill>
      </div>

      <ProgressBar pct={fillPct} tone={tone} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: C.ink, marginTop: 7, marginBottom: 16 }}>
        <span>{fmt(result.totalAllocated)} / {fmt(result.totalAllocated + result.capacityRemaining)}</span>
        <span style={{ color: result.capacityRemaining > 0 ? C.amber : C.green }}>
          {result.capacityRemaining > 0 ? `${fmt(result.capacityRemaining)} open` : "at capacity"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {TYPES.map((t) => {
          const b = result.breakdown[t];
          return (
            <div key={t} style={{ background: "#221F1C", border: `1px solid ${C.cardBorder}`, borderRadius: 14, padding: "11px 9px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.sub, textTransform: "uppercase" }}>{TYPE_LABEL[t]}</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: C.ink }}>{fmt(b.total)}</div>
              <div style={{ fontSize: 10.5, color: C.sub }}>T10 {fmt(b.t10)} · T9 {fmt(b.t9)}</div>
              {b.shortage > 0 && <div style={{ fontSize: 10.5, color: C.red, fontWeight: 600, marginTop: 2 }}>short {fmt(b.shortage)}</div>}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 11, color: C.sub, marginBottom: 10 }}>
        Comp: {result.pctOf(result.breakdown.infantry.total).toFixed(1)}% Inf · {result.pctOf(result.breakdown.lancer.total).toFixed(1)}% Lan ·{" "}
        {result.pctOf(result.breakdown.marksman.total).toFixed(1)}% Mark &nbsp;|&nbsp; T10 {result.t10Pct.toFixed(0)}% / T9 {result.t9Pct.toFixed(0)}%
      </div>

      {result.appliedFills && result.appliedFills.length > 0 && (
        <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {result.appliedFills.map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 12, padding: "6px 6px 6px 10px", fontSize: 11.5 }}>
              <span style={{ color: C.gold, fontWeight: 600 }}>+ {fmt(f.applied)} {f.tier.toUpperCase()} {TYPE_LABEL[f.type]} added manually</span>
              <button onClick={() => onRemoveFill(squadKey, i)} aria-label="Remove this manual fill" style={{ background: "none", border: "none", color: C.red, fontWeight: 600, cursor: "pointer", fontSize: 15, padding: "6px 8px" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {result.capacityRemaining > 0 && (
        <div style={{ background: bg, borderRadius: 14, padding: "10px 12px", fontSize: 12, color: C.ink }}>
          <div style={{ fontWeight: 600, marginBottom: 7 }}>Fill remaining {fmt(result.capacityRemaining)}:</div>
          {result.suggestions.length === 0 ? (
            <div style={{ color: C.red, fontWeight: 500 }}>No troops left in any pool to fill this space.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {result.suggestions.map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span>{fmt(s.amount)} {s.tier.toUpperCase()} {TYPE_LABEL[s.type]} available</span>
                  <Btn tone="gold" small onClick={() => onAcceptFill(squadKey, s.tier, s.type, s.amount)}>Add</Btn>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ============================================================
   MANUAL COMPOSITION INPUTS (sliders / exact, reused for rally leader)
   ============================================================ */
function CompositionInputs({ capacity, mode, setMode, ratio, setRatio, exact, setExact, target }) {
  const dots = TYPE_COLOR;
  const ratioSum = ratio.infantry + ratio.lancer + ratio.marksman;

  // Typed entry — each field is independent and only capped at 100 on its
  // own; the three summing to 100% is checked and reported separately below.
  function handleRatioChange(type, val) {
    setRatio({ ...ratio, [type]: Math.min(100, Math.max(0, val)) });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Btn tone={mode === "ratio" ? "primary" : "ghost"} onClick={() => setMode("ratio")}>Percentages</Btn>
        <Btn tone={mode === "exact" ? "primary" : "ghost"} onClick={() => setMode("exact")}>Exact amounts</Btn>
      </div>

      {mode === "ratio" ? (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TYPES.map((t) => (
              <PctField key={t} label={TYPE_LABEL[t]} value={ratio[t]} colorDot={dots[t]} onChange={(v) => handleRatioChange(t, v)} />
            ))}
          </div>
          <CompositionBar segments={TYPES.map((t) => ({ pct: ratio[t], color: dots[t] }))} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 11.5, color: C.sub, fontWeight: 500 }}>Remaining to allocate: {Math.max(0, 100 - ratioSum)}%</span>
            {!target.valid ? (
              <span style={{ fontSize: 12, color: C.red, fontWeight: 500 }}>✕ Total {ratioSum.toFixed(0)}% — must equal 100%</span>
            ) : (
              <span style={{ fontSize: 12, color: C.green, fontWeight: 500 }}>✓ Totals 100%</span>
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <NumField label="Infantry" value={exact.infantry} onChange={(v) => setExact({ ...exact, infantry: v })} />
            <NumField label="Lancer" value={exact.lancer} onChange={(v) => setExact({ ...exact, lancer: v })} />
            <NumField label="Marksman" value={exact.marksman} onChange={(v) => setExact({ ...exact, marksman: v })} />
          </div>
          {!target.valid && (
            <div style={{ marginTop: 8, fontWeight: 500, fontSize: 12.5, color: target.total < capacity ? C.amber : C.red }}>
              {target.total < capacity ? `${fmt(capacity - target.total)} spaces remaining below capacity.` : `Exceeds capacity by ${fmt(target.total - capacity)}.`}
            </div>
          )}
        </>
      )}

      {target.valid && (
        <div style={{ marginTop: 12, background: C.goldBg, border: `1.5px solid ${C.goldBorder}`, borderRadius: 14, padding: 10 }}>
          <TargetPreview target={target} />
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
const SAMPLE = {
  t10: { infantry: 197368, lancer: 168958, marksman: 306838 },
  t9: { infantry: 97133, lancer: 98576, marksman: 11916 },
};
const EMPTY = { infantry: 0, lancer: 0, marksman: 0 };

const STORAGE_KEY = "bearTrapCalculator:v1";

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // private browsing / storage disabled / corrupted data — just fall back to defaults
  }
}

export default function App() {
  // Loaded once on first render; every piece of state below falls back to
  // its normal default if nothing was saved (or saving is unavailable).
  const [saved] = useState(loadSaved);

  const [capacity, setCapacity] = useState(saved?.capacity ?? 110000);
  const [numSquads, setNumSquads] = useState(saved?.numSquads ?? 6);
  const [t10, setT10] = useState(saved?.t10 ?? SAMPLE.t10);
  const [t9, setT9] = useState(saved?.t9 ?? SAMPLE.t9);

  // Manual composition (used when strategy === 'manual')
  const [mode, setMode] = useState(saved?.mode ?? "ratio");
  const [ratio, setRatio] = useState(saved?.ratio ?? { infantry: 2, lancer: 15, marksman: 83 });
  const [exact, setExact] = useState(saved?.exact ?? { infantry: 2200, lancer: 16500, marksman: 91300 });

  // Squad strategy: manual | recommended | tiered
  const [strategy, setStrategy] = useState(saved?.strategy ?? "manual");
  const [numStronger, setNumStronger] = useState(saved?.numStronger ?? 5);
  // Infantry amount the player finds acceptable to always include per
  // Stronger squad — reserved before Marksman/Lancer fill the rest.
  const [strongInfantry, setStrongInfantry] = useState(saved?.strongInfantry ?? 0);
  // Minimum Marksman per squad the player wants the Weaker tier to hit.
  const [minWeakMarksman, setMinWeakMarksman] = useState(saved?.minWeakMarksman ?? 0);

  // Rally leader — always used. No ratio is suggested; the player sets their own.
  const [rallyCapacity, setRallyCapacity] = useState(saved?.rallyCapacity ?? 140000);
  // Flat capacity increases the player gets from specific buffs.
  const [cyrilleBoost, setCyrilleBoost] = useState(saved?.cyrilleBoost ?? 0);
  const [snowApeBoost, setSnowApeBoost] = useState(saved?.snowApeBoost ?? 0);
  const [rallyMode, setRallyMode] = useState(saved?.rallyMode ?? "exact");
  const [rallyRatio, setRallyRatio] = useState(saved?.rallyRatio ?? { infantry: 0, lancer: 0, marksman: 0 });
  const [rallyExact, setRallyExact] = useState(saved?.rallyExact ?? { infantry: 0, lancer: 0, marksman: 0 });

  const [advancedOpen, setAdvancedOpen] = useState(saved?.advancedOpen ?? true);

  const [fills, setFills] = useState(saved?.fills ?? {});
  function acceptFill(key, tier, type, amount) {
    setFills((prev) => ({ ...prev, [key]: [...(prev[key] || []), { tier, type, amount }] }));
  }
  function removeFill(key, idx) {
    setFills((prev) => {
      const arr = [...(prev[key] || [])];
      arr.splice(idx, 1);
      return { ...prev, [key]: arr };
    });
  }

  // Auto-save everything the player has entered so it survives a refresh.
  // Runs after every relevant change; silently no-ops if storage is unavailable.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          capacity, numSquads, t10, t9,
          mode, ratio, exact,
          strategy, numStronger, strongInfantry, minWeakMarksman,
          rallyCapacity, cyrilleBoost, snowApeBoost, rallyMode, rallyRatio, rallyExact,
          advancedOpen, fills,
        })
      );
    } catch {
      // storage full or disabled — nothing to do, the app still works without it
    }
  }, [
    capacity, numSquads, t10, t9,
    mode, ratio, exact,
    strategy, numStronger, strongInfantry, minWeakMarksman,
    rallyCapacity, cyrilleBoost, snowApeBoost, rallyMode, rallyRatio, rallyExact,
    advancedOpen, fills,
  ]);

  const targetManual = useMemo(() => computeTarget(capacity, mode, ratio, exact), [capacity, mode, ratio, exact]);
  const effectiveRallyCapacity = rallyCapacity + cyrilleBoost + snowApeBoost;

  const rallyTarget = useMemo(() => computeTarget(effectiveRallyCapacity, rallyMode, rallyRatio, rallyExact), [effectiveRallyCapacity, rallyMode, rallyRatio, rallyExact]);

  // Rally leader consumes from the pool first, independent of joiner strategy.
  const rallyComputation = useMemo(() => {
    const pools = { t10: { ...t10 }, t9: { ...t9 } };
    let result = null;
    if (rallyTarget.valid) result = allocateSquad(effectiveRallyCapacity, rallyTarget, pools, fills["rally"] || []);
    return { result, pools };
  }, [t10, t9, rallyTarget, effectiveRallyCapacity, fills]);

  const joinerAvailable = useMemo(() => {
    const p = rallyComputation.pools;
    const obj = {};
    TYPES.forEach((t) => (obj[t] = p.t10[t] + p.t9[t]));
    return obj;
  }, [rallyComputation]);

  const numStrongerClamped = Math.min(Math.max(1, numStronger), Math.max(1, numSquads - 1));
  const numWeaker = Math.max(0, numSquads - numStrongerClamped);

  const recommendedTarget = useMemo(
    () => priorityTargetWithFloors(capacity, joinerAvailable, numSquads, { infantry: DIVERSITY_FLOOR, lancer: DIVERSITY_FLOOR, marksman: DIVERSITY_FLOOR }),
    [capacity, joinerAvailable, numSquads]
  );

  // Every squad always carries some Infantry, Lancer and Marksman — going
  // 100% Marksman isn't actually better, since a march still needs all three
  // hero skills active. The player's inputs set the floor higher than the
  // baseline where they choose to.
  const strongFloors = useMemo(
    () => ({ infantry: Math.max(DIVERSITY_FLOOR, strongInfantry), lancer: DIVERSITY_FLOOR, marksman: DIVERSITY_FLOOR }),
    [strongInfantry]
  );
  const weakFloors = useMemo(
    () => ({ infantry: DIVERSITY_FLOOR, lancer: DIVERSITY_FLOOR, marksman: Math.max(DIVERSITY_FLOOR, minWeakMarksman) }),
    [minWeakMarksman]
  );

  // Reserve the Weaker tier's guaranteed minimums FIRST, so the Stronger
  // tier's own allocation is computed against what's left over — this is
  // what actually readjusts Stronger squads down rather than just flagging
  // a Weaker-tier shortfall after the fact.
  const availableForStrong = useMemo(() => {
    const obj = {};
    TYPES.forEach((t) => (obj[t] = Math.max(0, joinerAvailable[t] - weakFloors[t] * numWeaker)));
    return obj;
  }, [joinerAvailable, weakFloors, numWeaker]);

  const tieredStrong = useMemo(
    () => priorityTargetWithFloors(capacity, availableForStrong, numStrongerClamped, strongFloors),
    [capacity, availableForStrong, numStrongerClamped, strongFloors]
  );

  const actualAvailableForWeak = useMemo(() => {
    const obj = {};
    TYPES.forEach((t) => (obj[t] = Math.max(0, joinerAvailable[t] - tieredStrong[t] * numStrongerClamped)));
    return obj;
  }, [joinerAvailable, tieredStrong, numStrongerClamped]);

  const tieredWeak = useMemo(
    () =>
      numWeaker > 0
        ? priorityTargetWithFloors(capacity, actualAvailableForWeak, numWeaker, weakFloors)
        : { infantry: 0, lancer: 0, marksman: 0, valid: true, shortfall: 0, floorsMet: { infantry: true, lancer: true, marksman: true } },
    [capacity, actualAvailableForWeak, numWeaker, weakFloors]
  );

  const computation = useMemo(() => {
    const pools = { t10: { ...rallyComputation.pools.t10 }, t9: { ...rallyComputation.pools.t9 } };
    const squads = [];
    for (let i = 0; i < numSquads; i++) {
      let tgt;
      if (strategy === "manual") tgt = targetManual;
      else if (strategy === "recommended") tgt = recommendedTarget;
      else tgt = i < numStrongerClamped ? tieredStrong : tieredWeak;

      if (!tgt.valid) {
        squads.push(null);
        continue;
      }
      squads.push(allocateSquad(capacity, tgt, pools, fills[i + 1] || []));
    }
    return { squads, pools };
  }, [rallyComputation, numSquads, strategy, targetManual, recommendedTarget, tieredStrong, tieredWeak, numStrongerClamped, capacity, fills]);

  const totalAvailable = TYPES.reduce((s, t) => s + t10[t] + t9[t], 0);
  const rallyAllocated = rallyComputation.result ? rallyComputation.result.totalAllocated : 0;
  const totalAllocated = computation.squads.reduce((s, sq) => s + (sq ? sq.totalAllocated : 0), 0) + rallyAllocated;
  const totalRemaining = totalAvailable - totalAllocated;
  const totalCapacityRequired = capacity * numSquads + effectiveRallyCapacity;
  const fullCount = computation.squads.filter((s) => s && s.status === "full").length;
  const partialCount = computation.squads.filter((s) => s && s.status === "partial").length;
  const unfilledSpaces = Math.max(0, totalCapacityRequired - totalAllocated);
  const noTroopsEntered = totalAvailable === 0;

  function clearTroops() {
    setT10(EMPTY);
    setT9(EMPTY);
    setFills({});
  }
  function resetAll() {
    setCapacity(110000);
    setNumSquads(6);
    setT10(SAMPLE.t10);
    setT9(SAMPLE.t9);
    setMode("ratio");
    setRatio({ infantry: 2, lancer: 15, marksman: 83 });
    setExact({ infantry: 2200, lancer: 16500, marksman: 91300 });
    setStrategy("manual");
    setNumStronger(5);
    setStrongInfantry(0);
    setMinWeakMarksman(0);
    setRallyCapacity(140000);
    setCyrilleBoost(0);
    setSnowApeBoost(0);
    setRallyMode("exact");
    setRallyRatio({ infantry: 0, lancer: 0, marksman: 0 });
    setRallyExact({ infantry: 0, lancer: 0, marksman: 0 });
    setFills({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable — state is already reset regardless
    }
  }
  function applyRecommendedToManual() {
    setStrategy("manual");
    setMode("exact");
    setExact({ infantry: recommendedTarget.infantry, lancer: recommendedTarget.lancer, marksman: recommendedTarget.marksman });
  }

  const remT10 = computation.pools.t10;
  const remT9 = computation.pools.t9;

  return (
    <div style={{ background: C.bgPage, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        button:focus-visible, input:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
        button { transition: transform 80ms ease; }
        button:active { transform: scale(0.97); }
      `}</style>
      <div style={{ background: `linear-gradient(135deg, #221F1C, ${C.bgPage})`, borderBottom: `1px solid ${C.cardBorder}`, padding: "28px 20px 26px" }}>
        <div style={{ color: C.ink, fontSize: 20, fontWeight: 600, letterSpacing: 0.2, display: "flex", alignItems: "center", gap: 8 }}>
          <span aria-hidden="true">🐻</span> Bear Trap Squad Calculator
        </div>
        <div style={{ color: C.sub, fontSize: 12.5, marginTop: 4 }}>Split T10 / T9 troops across {numSquads} joiner squads · State 3543</div>
      </div>

      <div style={{ position: "sticky", top: 0, zIndex: 10, background: C.surface, borderBottom: `1px solid ${C.cardBorder}`, boxShadow: "0 2px 10px rgba(0,0,0,0.25)", padding: "12px 16px", display: "flex", gap: 0, overflowX: "auto" }}>
        <SummaryStat label="Available" value={fmt(totalAvailable)} />
        <StatDivider />
        <SummaryStat label="Allocated" value={fmt(totalAllocated)} />
        <StatDivider />
        <SummaryStat label="Remaining" value={fmt(totalRemaining)} />
        <StatDivider />
        <SummaryStat label="Full squads" value={`${fullCount}/${numSquads}`} tone="green" />
        <StatDivider />
        <SummaryStat label="Partial" value={partialCount} tone="amber" />
        <StatDivider />
        <SummaryStat label="Unfilled" value={fmt(unfilledSpaces)} tone={unfilledSpaces > 0 ? "amber" : "green"} />
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20, maxWidth: 720, margin: "0 auto" }}>
        {/* TROOP POOL — first thing the player fills out */}
        <Card>
          <SectionHeader step={1} title="Troop pool" sub="T10 is always used before T9 for the same troop type." />
          {noTroopsEntered && (
            <div style={{ background: C.amberBg, color: C.amber, borderRadius: 12, padding: "8px 10px", fontSize: 12, fontWeight: 500, marginBottom: 10 }}>
              No troops entered yet — start here.
            </div>
          )}
          <div style={{ fontSize: 11.5, fontWeight: 600, color: C.headerDark, marginTop: 4, marginBottom: 6 }}>T10</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <NumField label="Infantry" value={t10.infantry} onChange={(v) => setT10({ ...t10, infantry: v })} />
            <NumField label="Lancer" value={t10.lancer} onChange={(v) => setT10({ ...t10, lancer: v })} />
            <NumField label="Marksman" value={t10.marksman} onChange={(v) => setT10({ ...t10, marksman: v })} />
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: C.headerDark, marginBottom: 6 }}>T9</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <NumField label="Infantry" value={t9.infantry} onChange={(v) => setT9({ ...t9, infantry: v })} />
            <NumField label="Lancer" value={t9.lancer} onChange={(v) => setT9({ ...t9, lancer: v })} />
            <NumField label="Marksman" value={t9.marksman} onChange={(v) => setT9({ ...t9, marksman: v })} />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <TroopChip label="Inf" value={t10.infantry + t9.infantry} color={TYPE_COLOR.infantry} />
            <TroopChip label="Lan" value={t10.lancer + t9.lancer} color={TYPE_COLOR.lancer} />
            <TroopChip label="Mar" value={t10.marksman + t9.marksman} color={TYPE_COLOR.marksman} />
            <TroopChip label="Total pool" value={totalAvailable} color={C.headerDark} strong />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn tone="danger" onClick={clearTroops}>Clear all troops</Btn>
            <Btn tone="ghost" onClick={resetAll}>Reset</Btn>
          </div>
        </Card>

        {/* SETTINGS */}
        <Card>
          <SectionHeader step={2} title="Settings" sub="Capacity applies to every joiner squad." />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <NumField label="Squad capacity" value={capacity} onChange={setCapacity} />
            <NumField label="Number of squads" value={numSquads} onChange={(v) => setNumSquads(Math.max(1, v))} />
          </div>
        </Card>

        {/* RALLY LEADER */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setAdvancedOpen(!advancedOpen)}>
            <SectionHeader step={3} title="Rally leader squad" sub="Reserves troops first, before the joiner squads are filled. Set your own composition." />
            <span style={{ color: C.headerDark, fontWeight: 600, fontSize: 18, flexShrink: 0, paddingLeft: 10 }}>{advancedOpen ? "−" : "+"}</span>
          </div>
          {advancedOpen && (
            <div>
              <NumField label="Rally leader base capacity" value={rallyCapacity} onChange={setRallyCapacity} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <NumField label="Cyrille Capacity Boost" value={cyrilleBoost} onChange={setCyrilleBoost} />
                <NumField label="Snow Ape Boost" value={snowApeBoost} onChange={setSnowApeBoost} />
              </div>
              <div style={{ marginTop: 8, marginBottom: 10, fontSize: 12, fontWeight: 500, color: C.gold, background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 12, padding: "6px 10px" }}>
                Effective capacity: {fmt(rallyCapacity)} + {fmt(cyrilleBoost)} + {fmt(snowApeBoost)} = {fmt(effectiveRallyCapacity)}
              </div>
              <CompositionInputs capacity={effectiveRallyCapacity} mode={rallyMode} setMode={setRallyMode} ratio={rallyRatio} setRatio={setRallyRatio} exact={rallyExact} setExact={setRallyExact} target={rallyTarget} />
              {rallyComputation.result && (
                <div style={{ marginTop: 10 }}>
                  <SquadCard index="Leader" squadKey="rally" result={rallyComputation.result} invalid={false} onAcceptFill={acceptFill} onRemoveFill={removeFill} />
                </div>
              )}
            </div>
          )}
        </Card>

        {/* SQUAD STRATEGY */}
        <Card>
          <SectionHeader step={4} title="Squad strategy" sub="How the joiner composition is decided." />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <Btn tone={strategy === "manual" ? "primary" : "ghost"} onClick={() => setStrategy("manual")}>Manual</Btn>
            <Btn tone={strategy === "recommended" ? "primary" : "ghost"} onClick={() => setStrategy("recommended")}>Recommended</Btn>
            <Btn tone={strategy === "tiered" ? "primary" : "ghost"} onClick={() => setStrategy("tiered")}>Tiered</Btn>
          </div>

          {strategy === "manual" && (
            <CompositionInputs capacity={capacity} mode={mode} setMode={setMode} ratio={ratio} setRatio={setRatio} exact={exact} setExact={setExact} target={targetManual} />
          )}

          {strategy === "recommended" && (
            <div>
              <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 10 }}>
                Identical composition for all {numSquads} squads — max Marksmen your pool allows, then Lancer, then Infantry, with at least 1 of each type always guaranteed.
              </div>
              <div style={{ background: C.goldBg, border: `1.5px solid ${C.goldBorder}`, borderRadius: 14, padding: 10, marginBottom: 10 }}>
                <TargetPreview target={recommendedTarget} />
              </div>
              {recommendedTarget.shortfall > 0 && (
                <div style={{ color: C.amber, fontWeight: 500, fontSize: 12.5, marginBottom: 10 }}>
                  {fmt(recommendedTarget.shortfall)} spaces per squad can't be filled — not enough total troops.
                </div>
              )}
              <Btn tone="ghost" onClick={applyRecommendedToManual}>Use these numbers in Manual / Exact mode</Btn>
            </div>
          )}

          {strategy === "tiered" && (
            <div>
              <div style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, borderRadius: 14, padding: 10, marginBottom: 14, fontSize: 12, color: C.ink, lineHeight: 1.6 }}>
                <strong>How this works:</strong>
                <div>1. Stronger squads fill first — all identical to each other.</div>
                <div>2. Weaker squads split whatever's left — also identical to each other.</div>
                <div>3. Every squad keeps a little Infantry + Lancer, then loads up on Marksman for damage.</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: C.ink }}>Number of Stronger squads</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Btn tone="ghost" small onClick={() => setNumStronger(Math.max(1, numStronger - 1))}>−</Btn>
                  <span style={{ fontWeight: 600, fontSize: 15, minWidth: 18, textAlign: "center" }}>{numStrongerClamped}</span>
                  <Btn tone="ghost" small onClick={() => setNumStronger(Math.min(numSquads - 1, numStronger + 1))}>+</Btn>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 14 }}>
                Squads 1–{numStrongerClamped} are Stronger. Squads {numStrongerClamped + 1}–{numSquads} are Weaker.
              </div>

              <NumField label="Acceptable Infantry per Stronger squad" value={strongInfantry} onChange={setStrongInfantry} />
              <div style={{ fontSize: 11, color: C.sub, marginTop: 5, marginBottom: 14 }}>Guaranteed in every Stronger squad first.</div>

              <div style={{ fontSize: 11.5, fontWeight: 600, color: C.headerDark, marginBottom: 6 }}>Stronger squad composition</div>
              <div style={{ background: C.goldBg, border: `1.5px solid ${C.goldBorder}`, borderRadius: 14, padding: 10, marginBottom: 14 }}>
                <TargetPreview target={tieredStrong} />
                {!tieredStrong.floorsMet.infantry && (
                  <div style={{ fontSize: 11, color: C.red, fontWeight: 500, marginTop: 6 }}>
                    Only {fmt(tieredStrong.infantry)} Infantry available per squad (requested {fmt(strongInfantry)}).
                  </div>
                )}
              </div>

              <NumField label="Minimum acceptable Marksman per Weaker squad" value={minWeakMarksman} onChange={setMinWeakMarksman} />
              <div style={{ fontSize: 11, color: C.sub, marginTop: 5, marginBottom: 14 }}>Guaranteed in every Weaker squad — Stronger squads give up Marksman first if needed.</div>

              <div style={{ fontSize: 11.5, fontWeight: 600, color: C.headerDark, marginBottom: 6 }}>Weaker squad composition</div>
              <div style={{ background: C.goldBg, border: `1.5px solid ${C.goldBorder}`, borderRadius: 14, padding: 10 }}>
                <TargetPreview target={tieredWeak} />
                {!tieredWeak.floorsMet.marksman && (
                  <div style={{ fontSize: 11, color: C.red, fontWeight: 500, marginTop: 6 }}>
                    Only {fmt(tieredWeak.marksman)} Marksman available per squad — total pool is short of the {fmt(minWeakMarksman)} requested even after Stronger squads yield.
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* SQUAD RESULTS */}
        {strategy === "manual" && !targetManual.valid ? (
          <div style={{ fontSize: 12.5, color: C.amber, fontWeight: 600, textAlign: "center", padding: "14px 10px", background: C.amberBg, border: `1px solid #3A2F22`, borderRadius: 14 }}>
            ⚠ Fix the composition above to see squad results.
          </div>
        ) : (
          <div>
            <SectionHeader title={`🎯 Squad results (${numSquads})`} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {computation.squads.map((sq, i) => (
                <SquadCard
                  key={i}
                  index={i + 1}
                  squadKey={i + 1}
                  result={sq}
                  invalid={false}
                  onAcceptFill={acceptFill}
                  onRemoveFill={removeFill}
                  tierLabel={strategy === "tiered" ? (i < numStrongerClamped ? "Stronger" : "Weaker") : null}
                />
              ))}
            </div>
          </div>
        )}

        {/* REMAINING TROOPS */}
        <Card>
          <SectionHeader title="📦 Remaining troops" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: C.headerDark, marginBottom: 6 }}>T10</div>
              {TYPES.map((t) => (
                <div key={t} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: C.sub }}>{TYPE_LABEL[t]}</span>
                  <span style={{ fontWeight: 500 }}>{fmt(remT10[t])}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: C.headerDark, marginBottom: 6 }}>T9</div>
              {TYPES.map((t) => (
                <div key={t} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: C.sub }}>{TYPE_LABEL[t]}</span>
                  <span style={{ fontWeight: 500 }}>{fmt(remT9[t])}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.cardBorder}`, marginTop: 12, paddingTop: 12, fontSize: 12.5 }}>
            <Row label="Total available" value={fmt(totalAvailable)} />
            <Row label="Total allocated" value={fmt(totalAllocated)} />
            <Row label="Total remaining" value={fmt(totalRemaining)} />
            <Row label="Capacity required (all squads)" value={fmt(totalCapacityRequired)} />
            <Row label="Full squads" value={fullCount} />
            <Row label="Partial squads" value={partialCount} />
            <Row label="Unfilled squad spaces" value={fmt(unfilledSpaces)} />
          </div>
        </Card>

        <div style={{ textAlign: "center", color: C.sub, fontSize: 11, paddingBottom: 20 }}>
          Saved automatically in this browser · nothing is ever sent anywhere.
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, tone }) {
  const color = tone === "green" ? C.green : tone === "amber" ? C.amber : C.ink;
  return (
    <div style={{ minWidth: 82, flexShrink: 0, padding: "0 12px" }}>
      <div style={{ color: C.sub, fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 15.5, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}
function StatDivider() {
  return <div style={{ width: 1, background: C.cardBorder, flexShrink: 0 }} />;
}
function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
      <span style={{ color: C.sub }}>{label}</span>
      <span style={{ fontWeight: 500, color: C.ink }}>{value}</span>
    </div>
  );
}
