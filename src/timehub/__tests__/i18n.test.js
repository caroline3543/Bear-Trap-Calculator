import { test } from "node:test";
import assert from "node:assert/strict";
import { TIMEHUB_STRINGS, makeT } from "../i18n/index.js";

test("every language has every English key and keeps placeholders", () => {
  const en = TIMEHUB_STRINGS.en;
  for (const [lang, table] of Object.entries(TIMEHUB_STRINGS)) {
    const missing = Object.keys(en).filter((k) => !(k in table));
    const extra = Object.keys(table).filter((k) => !(k in en));
    assert.deepEqual(missing, [], `${lang} missing`);
    assert.deepEqual(extra, [], `${lang} extra`);
    for (const k of Object.keys(en)) {
      const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
      assert.equal(ph(table[k]), ph(en[k]), `${lang}.${k} placeholders`);
    }
  }
});

test("translator interpolates and falls back", () => {
  const t = makeT("de");
  assert.equal(t("ofMax", { max: 20 }), "von 20");
  assert.equal(makeT("xx")("save"), "Save");
  assert.equal(t("nope"), "nope");
});
