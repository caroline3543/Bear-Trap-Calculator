// Run with React, esbuild and jsdom available; BT_TEST_DEPS can select a clean dependency directory.
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const deps = process.env.BT_TEST_DEPS ? require('node:module').createRequire(path.join(process.env.BT_TEST_DEPS, 'package.json')) : require;
const { JSDOM } = deps('jsdom');
const esbuild = deps('esbuild');

(async () => {
  const output = mkdtempSync(path.join(tmpdir(), 'bt-accounts-'));
  const repo = path.resolve(__dirname, '..');
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.example' });
  Object.assign(global, { window: dom.window, document: dom.window.document,
    localStorage: dom.window.localStorage,
    HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
  // Exercise the real provider while replacing only the dashboard presentation.
  await esbuild.build({ entryPoints: [path.join(repo, 'src/App.jsx')],
    outfile: path.join(output, 'App.cjs'), bundle: true, platform: 'node', format: 'cjs',
    external: ['react'], loader: { '.css': 'empty', '.png': 'dataurl', '.webp': 'dataurl' },
    plugins: [{ name: 'dashboard-test-driver', setup(build) {
      build.onLoad({ filter: /[/\\]timehub[/\\]TimeHub\.jsx$/ }, () => ({
        resolveDir: path.join(repo, 'src/timehub'), loader: 'jsx', contents: `
          import React from 'react';
          import { TimeHubProvider, useTimeHub } from './TimeHubContext.jsx';
          function Driver({ calculator }) {
            window.accountDriver = useTimeHub();
            return calculator;
          }
          export default function Hub({ lang, onAccountsChange, calculator }) {
            return <TimeHubProvider lang={lang} onAccountsChange={onAccountsChange}>
              <Driver calculator={calculator} />
            </TimeHubProvider>;
          }` }));
    } }], logLevel: 'silent' });
  const React = deps('react');
  const { act } = React;
  const { createRoot } = deps('react-dom/client');
  const App = require(path.join(output, 'App.cjs')).default;
  const root = createRoot(document.getElementById('root'));
  const buttons = () => [...document.querySelectorAll('[aria-label="BT calculator accounts"] button')];
  const selected = () => buttons().find(b => b.getAttribute('aria-pressed') === 'true')?.textContent;
  const accounts = (n) => Array.from({ length: n }, (_, i) => ({ id: i ? `farm-${i}` : 'A',
    name: i ? `Farm ${i}` : 'Main Account', type: i ? 'farm' : 'main', isPrimary: i === 0,
    color: i + 1, order: i, notes: '', icon: 'snow' }));
  const update = async (list) => act(async () => {
    window.accountDriver.update(s => ({ ...s, accounts: list }));
  });
  try {
    // A fresh user must have one account, with no artificial Farm Account.
    await act(async () => root.render(React.createElement(App)));
    assert.equal(buttons().length, 1);
    assert.equal(selected(), 'Main Account');
    assert.equal(document.querySelectorAll('[aria-label$=" FC"]').length, 3);
    const fc = document.querySelector('input[aria-label="infantry FC"]');
    await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(fc, '4'); fc.dispatchEvent(new window.Event('input', {bubbles:true})); });
    assert.equal(JSON.parse(localStorage.getItem('bearTrapCalculator:v1:A')).troopTiers[0].fc, 4);
    await update(accounts(3));
    assert.equal(buttons().length, 3);
    localStorage.setItem('bearTrapCalculator:v1:farm-1', JSON.stringify({ capacity: 123456, rallyExact: { infantry: 1, lancer: 2, marksman: 3 } }));
    await act(async () => buttons()[1].click());
    assert.equal(selected(), 'Farm 1');
    assert.equal(document.querySelector('input[aria-label="infantry FC"]').value, '6');
    assert.equal(JSON.parse(localStorage.getItem('bearTrapCalculator:v1:farm-1')).capacity, 123456);
    assert.deepEqual(JSON.parse(localStorage.getItem('bearTrapCalculator:v1:farm-1')).rallyExact, { infantry: 1, lancer: 2, marksman: 3 });
    await act(async () => buttons()[0].click());
    assert.equal(document.querySelector('input[aria-label="infantry FC"]').value, '4');
    assert.equal(JSON.parse(localStorage.getItem('bearTrapCalculator:v1:A')).capacity, 110000);
    await act(async () => buttons()[1].click());
    // A rename/reorder preserves identity and the selected setup.
    const renamed = accounts(3); renamed[1].name = 'My renamed farm';
    await update([renamed[2], renamed[1], renamed[0]]);
    assert.equal(selected(), 'My renamed farm');
    assert.equal(JSON.parse(localStorage.getItem('bearTrapCalculator:v1:farm-1')).capacity, 123456);
    await update(accounts(6));
    assert.equal(buttons().length, 6);
    // Deleting the selection falls back to the primary without copying its pool.
    await update(accounts(6).filter(a => a.id !== 'farm-1'));
    assert.equal(buttons().length, 5);
    assert.equal(selected(), 'Main Account');
    assert.equal(JSON.parse(localStorage.getItem('bearTrapCalculator:v1:A')).capacity, 110000);
    await update(accounts(1));
    assert.equal(buttons().length, 1);
    await act(async () => root.unmount());
    // A removed/stale stored ID must be rejected on a fresh mount too.
    localStorage.setItem('bearTrapCalculator:activeAccount', 'B');
    const root2 = createRoot(document.getElementById('root'));
    await act(async () => root2.render(React.createElement(App)));
    assert.equal(buttons().length, 1);
    assert.equal(selected(), 'Main Account');
    await act(async () => root2.unmount());
    console.log('BT account integration passed: 1/3/6 accounts, rename, reorder, deletion, stale selection, isolated saved setups.');
  } finally { dom.window.close(); rmSync(output, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
