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
    HTMLElement: dom.window.HTMLElement, FileReader: dom.window.FileReader, IS_REACT_ACT_ENVIRONMENT: true });
  // Exercise the real provider while replacing only the dashboard presentation.
  await esbuild.build({ entryPoints: [path.join(repo, 'src/App.jsx')],
    outfile: path.join(output, 'App.cjs'), bundle: true, platform: 'node', format: 'cjs',
    external: ['react'], loader: { '.css': 'empty', '.png': 'dataurl', '.webp': 'dataurl' },
    plugins: [{ name: 'dashboard-test-driver', setup(build) {
      build.onLoad({ filter: /[/\\]timehub[/\\]TimeHub\.jsx$/ }, () => ({
        resolveDir: path.join(repo, 'src/timehub'), loader: 'jsx', contents: `
          import React from 'react';
          import { TimeHubProvider, useTimeHub } from './TimeHubContext.jsx';
          import { AccountSelector } from '../ui/components.jsx';
          function Driver({ calculator }) {
            window.accountDriver = useTimeHub();
            const hub = window.accountDriver;
            return <><AccountSelector accounts={hub.accounts} value={hub.activeAccountId} onChange={hub.setFilter} label="BT calculator accounts" />{calculator}</>;
          }
          export default function Hub({ lang, onAccountsChange, calculator, activeAccountId, onActiveAccountChange }) {
            return <TimeHubProvider lang={lang} onAccountsChange={onAccountsChange} activeAccountId={activeAccountId} onActiveAccountChange={onActiveAccountChange}>
              <Driver calculator={calculator} />
            </TimeHubProvider>;
          }` }));
    } }], logLevel: 'silent' });
  const React = deps('react');
  const { act } = React;
  const { createRoot } = deps('react-dom/client');
  const App = require(path.join(output, 'App.cjs')).default;
  const root = createRoot(document.getElementById('root'));
  const buttons = () => [...document.querySelectorAll('.ui-account-menu > button:not(.ui-button)')];
  const selected = () => document.querySelector('.ui-account-selector summary span:first-child, .ui-account-single')?.textContent;
  const accounts = (n) => Array.from({ length: n }, (_, i) => ({ id: i ? `farm-${i}` : 'A',
    name: i ? `Farm ${i}` : 'Main Account', type: i ? 'farm' : 'main', isPrimary: i === 0,
    color: i + 1, order: i, notes: '', icon: 'snow' }));
  const update = async (list) => act(async () => {
    window.accountDriver.update(s => ({ ...s, accounts: list }));
  });
  const sample = JSON.parse(require('node:fs').readFileSync(path.join(repo,'src/bear/__fixtures__/troop-screenshots.json'),'utf8')).find(s=>s.name==='8676');
  const wholeReads=[];
  let workerNumber=0;
  window.HTMLCanvasElement.prototype.getContext = function() { return {drawImage(){},getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}}; };
  window.Tesseract = {
    recognize:async canvas=>{wholeReads.push({width:canvas.width,height:canvas.height});return {data:sample.data};},
    createWorker:async()=>{
      const kind=workerNumber++;
      const outputs=sample.crops.flatMap(c=>kind===0?c.amountReads:c.fcReads);let i=0;
      return {setParameters:async()=>{},terminate:async()=>{},recognize:async()=>({data:outputs[i++]})};
    }
  };
  try {
    await act(async()=>root.render(React.createElement(App)));
    const before=JSON.parse(localStorage.getItem('bearTrapCalculator:v1:A'));
    await act(async()=>{
      const picker=document.querySelector('[aria-label="Choose troop screenshots"]');
      Object.defineProperty(picker,'files',{configurable:true,value:[new window.File(['image'],'troops.png',{type:'image/png'})]});
      picker.dispatchEvent(new window.Event('change',{bubbles:true}));
      await new Promise(resolve=>setTimeout(resolve,30));
    });
    const image=document.querySelector('img[alt="Your troop screenshot"]');assert.ok(image);
    Object.defineProperty(image,'naturalWidth',{value:1284});Object.defineProperty(image,'naturalHeight',{value:2778});
    image.parentElement.scrollTop=1500;
    await act(async()=>{image.dispatchEvent(new window.Event('load'));await new Promise(resolve=>setTimeout(resolve,30));});
    assert.equal(wholeReads.length,2);
    assert.ok(wholeReads.every(r=>r.height===3200),'Scrolling the preview must not crop the OCR image');
    assert.equal(document.querySelectorAll('[aria-label^="Scanned "]').length,3);
    const apply=[...document.querySelectorAll('button')].find(b=>b.textContent==='Use these troops');assert.ok(apply);assert.equal(apply.disabled,false);
    await act(async()=>apply.click());
    const saved=JSON.parse(localStorage.getItem('bearTrapCalculator:v1:A'));
    assert.deepEqual(saved.t10,{infantry:335905,lancer:282551,marksman:456095});
    assert.deepEqual(saved.troopTiers.map(t=>t.fc),[5,4,4]);
    assert.deepEqual(saved.t9,before.t9,'Unseen T9 amounts must remain unchanged');
    assert.ok(document.body.textContent.includes('Infantry FC5 · Lancer FC4 · Marksman FC4'));
    await act(async()=>root.unmount());
    console.log('Troop scanner integration passed: choose → automatic full-image scan → verified counts and FC → review → saved account summary; preview scroll does not crop and unseen tiers are preserved.');
  } finally { dom.window.close(); rmSync(output,{recursive:true,force:true}); }
})().catch(error=>{console.error(error);process.exitCode=1;});
