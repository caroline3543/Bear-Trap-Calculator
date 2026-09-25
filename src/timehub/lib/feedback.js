/* ============================================================
   FEEDBACK — haptics, tiny sounds and a snowflake burst.
   • Haptics: navigator.vibrate on Android; on iPhone (iOS 17.4+/18) the
     system "switch" tick, triggered by toggling a hidden <input switch>.
   • Sounds: synthesised with Web Audio (no files, a few ms long, quiet).
   • Everything is off under prefers-reduced-motion (burst) and can be
     turned off in ⚙ (sound / haptics).
   ============================================================ */
let prefs = { sound: true, haptics: true };
export function setFeedbackPrefs(p) { prefs = { ...prefs, ...p }; }

let audio = null;
function ctx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audio) audio = new AC();
  if (audio.state === "suspended") audio.resume().catch(() => {});
  return audio;
}

function tone(freq, start, dur, vol = 0.05, type = "sine") {
  const a = ctx();
  if (!a) return;
  const t0 = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  tap: () => tone(1320, 0, 0.035, 0.025, "triangle"),
  tab: () => { tone(880, 0, 0.05, 0.03, "sine"); tone(1320, 0.03, 0.06, 0.022, "sine"); },
  success: () => { tone(988, 0, 0.09, 0.05); tone(1319, 0.07, 0.12, 0.045); tone(1760, 0.15, 0.16, 0.035); },
  soft: () => tone(660, 0, 0.06, 0.03, "sine"),
};

export function playSound(name) {
  if (!prefs.sound) return;
  ctx(); // unlock audio inside the tap itself (browsers require a gesture)…
  setTimeout(() => { try { SOUNDS[name]?.(); } catch { /* audio blocked */ } }, 0); // …but build the sound after the screen updates
}

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
  playSound(el.closest(".th-tabbar") ? "tab" : "tap");
}
/* Note: the iPhone haptic has to run inside the tap, so it stays synchronous; it's a single cheap click. */

/** A small celebration after something useful: claim, start, save, spend. */
export function success(el = lastPressed) {
  haptic("success");
  playSound("success");
  burst(el);
  if (el?.classList) {
    el.classList.remove("th-pop");
    void el.offsetWidth;
    el.classList.add("th-pop");
  }
}
