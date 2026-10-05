/* Time Hub translations. Keys fall back to English, then to the key itself.
   To merge into the calculator's own TRANSLATIONS later, spread these per language. */
import en1 from "./en.js";
import en2 from "./en2.js";
import * as s1 from "./set1.js";
import * as s2 from "./set2.js";
import * as s3 from "./set3.js";
import * as s4 from "./set4.js";
import * as s5 from "./set5.js";
import * as s6 from "./set6.js";
import * as s7 from "./set7.js";
import * as s8 from "./set8.js";
import * as s9 from "./set9.js";
import * as s10 from "./set10.js";
import * as s11 from "./set11.js";
import * as s12 from "./set12.js";
import * as s13 from "./set13.js";
import * as s14 from "./set14.js";
import * as s15 from "./set15.js";
import * as s16 from "./set16.js";
import * as s17 from "./set17.js";
import * as s18 from "./set18.js";
import * as s19 from "./set19.js";
import * as s20 from "./set20.js";
import * as s21 from "./set21.js";
import * as s22 from "./set22.js";
import * as s23 from "./set23.js";

const en = { ...en1, ...en2, ...s5.en, ...s6.en, ...s7.en, ...s8.en, ...s9.en, ...s10.en, ...s11.en, ...s12.en, ...s13.en, ...s14.en, ...s15.en, ...s16.en, ...s17.en, ...s18.en, ...s19.en, ...s20.en, ...s21.en, ...s22.en, ...s23.en };
export const TIMEHUB_STRINGS = {
  en,
  it: { ...s1.it, ...s3.it, ...s5.it, ...s6.it, ...s7.it, ...s8.it, ...s9.it, ...s10.it, ...s11.it, ...s12.it, ...s13.it, ...s14.it, ...s15.it, ...s16.it, ...s17.it, ...s18.it, ...s19.it, ...s20.it, ...s21.it, ...s22.it, ...s23.it }, es: { ...s1.es, ...s3.es, ...s5.es, ...s6.es, ...s7.es, ...s8.es, ...s9.es, ...s10.es, ...s11.es, ...s12.es, ...s13.es, ...s14.es, ...s15.es, ...s16.es, ...s17.es, ...s18.es, ...s19.es, ...s20.es, ...s21.es, ...s22.es, ...s23.es }, ko: { ...s1.ko, ...s3.ko, ...s5.ko, ...s6.ko, ...s7.ko, ...s8.ko, ...s9.ko, ...s10.ko, ...s11.ko, ...s12.ko, ...s13.ko, ...s14.ko, ...s15.ko, ...s16.ko, ...s17.ko, ...s18.ko, ...s19.ko, ...s20.ko, ...s21.ko, ...s22.ko, ...s23.ko }, de: { ...s1.de, ...s3.de, ...s5.de, ...s6.de, ...s7.de, ...s8.de, ...s9.de, ...s10.de, ...s11.de, ...s12.de, ...s13.de, ...s14.de, ...s15.de, ...s16.de, ...s17.de, ...s18.de, ...s19.de, ...s20.de, ...s21.de, ...s22.de, ...s23.de },
  ru: { ...s2.ru, ...s4.ru, ...s5.ru, ...s6.ru, ...s7.ru, ...s8.ru, ...s9.ru, ...s10.ru, ...s11.ru, ...s12.ru, ...s13.ru, ...s14.ru, ...s15.ru, ...s16.ru, ...s17.ru, ...s18.ru, ...s19.ru, ...s20.ru, ...s21.ru, ...s22.ru, ...s23.ru }, pl: { ...s2.pl, ...s4.pl, ...s5.pl, ...s6.pl, ...s7.pl, ...s8.pl, ...s9.pl, ...s10.pl, ...s11.pl, ...s12.pl, ...s13.pl, ...s14.pl, ...s15.pl, ...s16.pl, ...s17.pl, ...s18.pl, ...s19.pl, ...s20.pl, ...s21.pl, ...s22.pl, ...s23.pl }, tr: { ...s2.tr, ...s4.tr, ...s5.tr, ...s6.tr, ...s7.tr, ...s8.tr, ...s9.tr, ...s10.tr, ...s11.tr, ...s12.tr, ...s13.tr, ...s14.tr, ...s15.tr, ...s16.tr, ...s17.tr, ...s18.tr, ...s19.tr, ...s20.tr, ...s21.tr, ...s22.tr, ...s23.tr }, ar: { ...s2.ar, ...s4.ar, ...s5.ar, ...s6.ar, ...s7.ar, ...s8.ar, ...s9.ar, ...s10.ar, ...s11.ar, ...s12.ar, ...s13.ar, ...s14.ar, ...s15.ar, ...s16.ar, ...s17.ar, ...s18.ar, ...s19.ar, ...s20.ar, ...s21.ar, ...s22.ar, ...s23.ar },
};
export const RTL_LANGS = new Set(["ar"]);

const warned = new Set();
export function makeT(lang) {
  const table = TIMEHUB_STRINGS[lang] || en;
  return (key, vars) => {
    let s = table[key] ?? en[key];
    if (s == null) {
      // Never silent: a key with no text means a string file isn't registered above (or a typo).
      // The i18n tests fail on this too; at runtime it's logged once per key.
      if (!warned.has(key)) { warned.add(key); try { console.warn(`[Time Hub] missing text for "${key}"`); } catch { /* no console */ } }
      s = key;
    }
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  };
}
