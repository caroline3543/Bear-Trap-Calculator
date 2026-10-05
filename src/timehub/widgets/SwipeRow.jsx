/* Swipe toward the start edge (left in LTR, right in RTL) to reveal "Dismiss" behind a row.
   Vertical scrolling keeps working (touch-action: pan-y; only a clearly sideways drag counts).
   Keyboard / screen reader: the Dismiss button is always in the DOM after the row's own controls,
   and focusing it slides the row open, so nothing here depends on being able to swipe. */
import React, { useRef, useState } from "react";
import { useTimeHub } from "../TimeHubContext.jsx";

const BTN_PX = 96;

/** actions: optional [{ label, onClick, tone }] (first = nearest the row); default one "Dismiss". */
export function SwipeRow({ onDismiss, label, children, className = "", actions }) {
  const { t, dir } = useTimeHub();
  const acts = actions || [{ label: t("dismiss"), onClick: onDismiss }];
  const OPEN_PX = BTN_PX * acts.length;
  const sign = dir === "rtl" ? 1 : -1; // direction that opens
  const [x, setX] = useState(0);
  const [open, setOpen] = useState(false);
  const start = useRef(null);
  const dragged = useRef(false);

  const down = (e) => { start.current = { x: e.clientX, y: e.clientY, base: open ? sign * OPEN_PX : 0, locked: null }; dragged.current = false; };
  const move = (e) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (s.locked == null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (s.locked !== "x") return;
    dragged.current = true;
    const v = s.base + dx;
    setX(sign < 0 ? Math.max(-OPEN_PX * 1.3, Math.min(0, v)) : Math.min(OPEN_PX * 1.3, Math.max(0, v)));
  };
  const up = () => {
    const s = start.current;
    start.current = null;
    if (!s || s.locked !== "x") return;
    const nowOpen = Math.abs(x) > OPEN_PX / 2;
    setOpen(nowOpen);
    setX(nowOpen ? sign * OPEN_PX : 0);
  };
  const shown = open && !start.current ? sign * OPEN_PX : x;
  return (
    <div className={`th-swipe ${open ? "open" : ""} ${shown !== 0 ? "moving" : ""} ${className}`} style={{ "--swx": `${shown}px` }}>
      <div className="th-swipe-body" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClickCapture={(e) => { if (dragged.current) { e.preventDefault(); e.stopPropagation(); dragged.current = false; } }}>
        {children}
      </div>
      <div className="th-swipe-actions" style={{ width: OPEN_PX }}>
        {acts.map((a, i) => (
          <button key={i} type="button" className={`th-swipe-action ${a.tone || ""}`} aria-label={label ? `${a.label}: ${label}` : a.label}
            onFocus={() => { setOpen(true); setX(sign * OPEN_PX); }} onBlur={(e) => { if (!e.currentTarget.parentNode.contains(e.relatedTarget)) { setOpen(false); setX(0); } }}
            onClick={() => { setOpen(false); setX(0); a.onClick(); }}>{a.label}</button>
        ))}
      </div>
    </div>
  );
}
