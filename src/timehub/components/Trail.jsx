/* The schedule's trail: a softly wandering line with small custom markers (no emoji).
   paw = Bear Trap · flame = training running · spark = minister boost · circle = everything else ·
   dashed = personal task. Pure inline SVG, no filters, no animation. */
import React from "react";

const WAVES = ["M10 0C12 22 8 44 10 66S11.5 90 10 100", "M10 0C8 24 12.4 46 10 68S8.6 92 10 100", "M10 0C11.4 26 8.4 50 10 72S9 94 10 100"];
export const hashV = (id) => { let h = 0; const s = String(id); for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) | 0; return Math.abs(h) % 3; };

export function Marker({ kind = "circle" }) {
  let g;
  if (kind === "paw") g = (<><circle cx="10" cy="10" r="10" className="th-mk-paw" /><g className="th-mk-glyph"><ellipse cx="10" cy="12.6" rx="3.4" ry="2.9" /><ellipse cx="5.9" cy="9.2" rx="1.5" ry="1.9" /><ellipse cx="8.6" cy="6.4" rx="1.5" ry="1.9" /><ellipse cx="11.4" cy="6.4" rx="1.5" ry="1.9" /><ellipse cx="14.1" cy="9.2" rx="1.5" ry="1.9" /></g></>);
  else if (kind === "flame") g = (<><circle cx="10" cy="10" r="10" className="th-mk-warm" /><path className="th-mk-dark" d="M10 3.8c.7 2.3 3.2 3.4 3.2 6.4a3.2 3.2 0 0 1-6.4 0c0-1.3.6-2.2 1.3-2.9.1 1 .7 1.4 1.3 1.4C9.3 7.5 9.2 5.5 10 3.8z" /></>);
  else if (kind === "star") g = (<><circle cx="10" cy="10" r="10" className="th-mk-warm" /><path className="th-mk-dark" d="M10 4.2l1.5 3.7 3.9.3-3 2.5 1 3.9L10 12.4l-3.4 2.2 1-3.9-3-2.5 3.9-.3z" /></>);
  else if (kind === "dashed") g = <circle cx="10" cy="10" r="5.2" className="th-mk-ring" strokeWidth="2" strokeDasharray="2.4 2.4" />;
  else g = <circle cx="10" cy="10" r="5.2" className="th-mk-ring" strokeWidth="2" />;
  return <svg className="mk" viewBox="0 0 20 20" aria-hidden="true">{g}</svg>;
}

export function Rail({ kind = "circle", v = 0 }) {
  return (
    <span className="th-rail" aria-hidden="true">
      <svg className="line" viewBox="0 0 20 100" preserveAspectRatio="none"><path d={WAVES[v % 3]} fill="none" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" /></svg>
      <Marker kind={kind} />
    </span>
  );
}

/** Which marker a schedule item gets. */
export function markerFor(i) {
  if (i.kind === "event" && String(i.ref?.ev?.templateId || "").startsWith("bear_trap")) return "paw";
  if (i.kind === "booking" && i.ref?.position === "minister_education") return "star";
  if (i.kind === "training" || i.group) return "flame";
  return "circle";
}
