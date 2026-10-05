/* Guards against raw keys ("thenWord", "readyNowTitle"…) ever reaching the screen:
   every string file must be registered in i18n/index.js, and every t("key") the code uses must
   have text in English AND every other language. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TIMEHUB_STRINGS } from "../i18n/index.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["en", "it", "es", "ko", "de", "ru", "pl", "tr", "ar"];

test("every i18n string file is imported by i18n/index.js", () => {
  const index = fs.readFileSync(path.join(root, "i18n/index.js"), "utf8");
  const files = fs.readdirSync(path.join(root, "i18n")).filter((f) => f !== "index.js" && f.endsWith(".js"));
  const missing = files.filter((f) => !index.includes(`"./${f}"`));
  assert.deepEqual(missing, [], `not registered in i18n/index.js: ${missing.join(", ")}`);
});

test("every t(key) used in the code has text in every language", () => {
  const keys = new Set();
  const walk = (d) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) { if (!["i18n", "__tests__", "assets"].includes(f)) walk(p); }
      else if (/\.(jsx?|mjs)$/.test(f)) for (const m of fs.readFileSync(p, "utf8").matchAll(/\bt\(\s*"([A-Za-z0-9_]+)"/g)) keys.add(m[1]);
    }
  };
  walk(root);
  assert.ok(keys.size > 300, "found the t() calls");
  for (const l of LANGS) {
    const missing = [...keys].filter((k) => !(k in TIMEHUB_STRINGS[l]));
    assert.deepEqual(missing, [], `${l} is missing: ${missing.slice(0, 20).join(", ")}`);
  }
});

import { makeT } from "../i18n/index.js";
test("singular/plural: key_one is used for a count of 1, in English and where a language has it", () => {
  const en = makeT("en");
  assert.equal(en("coversN", { n: 1 }), "Covers 1 research");
  assert.equal(en("coversN", { n: 2 }), "Covers 2 researches");
  assert.equal(en("nAccounts", { n: 1 }), "1 account");
  assert.equal(en("nCampsReady", { n: 1 }), "1 camp ready");
  assert.equal(makeT("de")("coversN", { n: 1 }), "Deckt 1 Forschung ab");
  // a language without a separate singular keeps its own wording (never falls back to English)
  assert.equal(makeT("ru")("coversN", { n: 1 }), "Покрывает исследований: 1");
});
test("the strings from your screenshots now resolve to real text", () => {
  const en = makeT("en");
  for (const k of ["thenWord", "vpShort", "coversN", "bookColon", "readyNowTitle", "readyCamps", "readyResearch", "nReady", "allCampsReady", "researchReadyOne", "researchReadyN", "startShort", "viewFullSchedule", "review", "showFriendClocks"]) {
    assert.notEqual(en(k, { n: 2 }), k, k);
  }
});
