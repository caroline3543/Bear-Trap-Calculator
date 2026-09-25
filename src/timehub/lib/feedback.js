/* ============================================================
   FEEDBACK — haptics and a snowflake burst (no sounds).
   • Haptics: navigator.vibrate on Android; on iPhone (iOS 17.4+/18) the
     system "switch" tick, triggered by toggling a hidden <input switch>.
   • The burst is skipped under prefers-reduced-motion; haptics can be
     turned off in ⚙.
   ============================================================ */
let prefs = { haptics: true };
export function setFeedbackPrefs(p) { prefs = { ...prefs, ...p }; }

let iosSwitch = null;
export function haptic(kind = "light") {
  if (!prefs.haptics || typeof window === "undefined") return;
  try {
    if (navigator.vibrate) {
      navigator.vibrate(kind === "success" ? [12, 40, 18] : kind === "medium" ? 14 : 8);
      return;
    }
    // iPhone: toggling a hidden switch control gives a system haptic tick (iOS 17.4+).
    if (!iosSwitch) {
      const label = document.createElement("label");
      label.setAttribute("aria-hidden", "true");
      label.style.cssText = "position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-99px;top:0";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("switch", "");
      input.tabIndex = -1;
      label.appendChild(input);
      document.body.appendChild(label);
      iosSwitch = label;
    }
    iosSwitch.click();
    if (kind === "success") setTimeout(() => iosSwitch?.click(), 90);
  } catch { /* not supported */ }
}

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** A little burst of snowflakes from an element (e.g. the button just pressed). */
export function burst(el) {
  if (!el || reduced() || typeof document === "undefined") return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const layer = document.createElement("div");
  layer.className = "th-burst";
  layer.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 9; i++) {
    const p = document.createElement("i");
    const ang = (Math.PI * 2 * i) / 9 + Math.random() * 0.5;
    const dist = 28 + Math.random() * 26;
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.setProperty("--dx", `${Math.cos(ang) * dist}px`);
    p.style.setProperty("--dy", `${Math.sin(ang) * dist - 10}px`);
    p.style.setProperty("--rot", `${Math.round(Math.random() * 180)}deg`);
    p.textContent = i % 3 === 0 ? "✦" : "❄";
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 800);
}

let lastPressed = null;
/** Called on every press inside the app (delegated): light tick + click. */
export function onPress(target) {
  const el = target?.closest?.("button, a, [role=button], summary, select, label.th-check");
  if (!el || el.disabled) return;
  lastPressed = el;
  haptic("light");
}
/* Note: the iPhone haptic has to run inside the tap, so it stays synchronous; it's a single cheap click. */

/** A small celebration after something useful: claim, start, save, spend. */
export function success(el = lastPressed) {
  haptic("success");
  burst(el);
  if (el?.classList) {
    el.classList.remove("th-pop");
    void el.offsetWidth;
    el.classList.add("th-pop");
  }
}
