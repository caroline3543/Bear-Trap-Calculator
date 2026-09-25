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

const en = { ...en1, ...en2, ...s5.en, ...s6.en, ...s7.en, ...s8.en, ...s9.en, ...s10.en };
export const TIMEHUB_STRINGS = {
  en,
  it: { ...s1.it, ...s3.it, ...s5.it, ...s6.it, ...s7.it, ...s8.it, ...s9.it, ...s10.it }, es: { ...s1.es, ...s3.es, ...s5.es, ...s6.es, ...s7.es, ...s8.es, ...s9.es, ...s10.es }, ko: { ...s1.ko, ...s3.ko, ...s5.ko, ...s6.ko, ...s7.ko, ...s8.ko, ...s9.ko, ...s10.ko }, de: { ...s1.de, ...s3.de, ...s5.de, ...s6.de, ...s7.de, ...s8.de, ...s9.de, ...s10.de },
  ru: { ...s2.ru, ...s4.ru, ...s5.ru, ...s6.ru, ...s7.ru, ...s8.ru, ...s9.ru, ...s10.ru }, pl: { ...s2.pl, ...s4.pl, ...s5.pl, ...s6.pl, ...s7.pl, ...s8.pl, ...s9.pl, ...s10.pl }, tr: { ...s2.tr, ...s4.tr, ...s5.tr, ...s6.tr, ...s7.tr, ...s8.tr, ...s9.tr, ...s10.tr }, ar: { ...s2.ar, ...s4.ar, ...s5.ar, ...s6.ar, ...s7.ar, ...s8.ar, ...s9.ar, ...s10.ar },
};
export const RTL_LANGS = new Set(["ar"]);

export function makeT(lang) {
  const table = TIMEHUB_STRINGS[lang] || en;
  return (key, vars) => {
    let s = table[key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  };
}
