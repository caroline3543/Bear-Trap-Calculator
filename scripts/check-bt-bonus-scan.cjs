const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const deps = require('node:module').createRequire(path.join(process.env.BT_TEST_DEPS, 'package.json'));
function data(lines) {
  return { text: 'Bonus Overview\n' + lines.join('\n'), words: lines.flatMap((line, i) => line.split(' ').map((text, j) => ({text, confidence:97, bbox:{x0:j*120,x1:j*120+100,y0:i*60,y1:i*60+20}}))) };
}
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'bt-bonus-scan-'));
  const repo = path.resolve(__dirname,'..');
  const dom = new (deps('jsdom').JSDOM)('<div id="root"></div>',{url:'https://test.example'});
  Object.assign(global,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,HTMLElement:dom.window.HTMLElement,FileReader:dom.window.FileReader,IS_REACT_ACT_ENVIRONMENT:true});
  const calls=[];
  window.Tesseract = { recognize: async file => {
    calls.push(file.name);
    const result = data(file.name==='first.png' ? ["Troops’ Attack 216.77%", 'Infantry Attack 167.18%', 'Marksman Attack 300.25%'] : ['Infantry Attack 168.18%']);
    if (file.name==='first.png') result.words.find(w=>w.text==='167.18%').confidence=60;
    return {data:result};
  }};
  await deps('esbuild').build({entryPoints:[path.join(repo,'src/bear/BearLab.jsx')],outfile:path.join(tmp,'form.cjs'),bundle:true,platform:'node',format:'cjs',external:['react'],loader:{'.css':'empty','.webp':'dataurl'},logLevel:'silent'});
  const React=deps('react');const {act}=React;
  const root=deps('react-dom/client').createRoot(document.getElementById('root'));
  const Form=require(path.join(tmp,'form.cjs')).default;
  const select=async names=>act(async()=>{
    const el=document.querySelector('[aria-label="Choose account bonus screenshot"]');
    Object.defineProperty(el,'files',{configurable:true,value:names.map(name=>new window.File(['image'],name,{type:'image/png'}))});
    el.dispatchEvent(new window.Event('change',{bubbles:true}));
    await new Promise(resolve=>setTimeout(resolve,30));
  });
  const clickText=async text=>act(async()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===text);assert.ok(button,text);button.click();});
  try {
    await act(async()=>root.render(React.createElement(Form,{accountId:'bonus-test',accountName:'Main',leaderCapacity:160010,troopTiers:[{fc:5,level:10},{fc:5,level:10},{fc:6,level:10}],onApplyLeader:()=>{}})));
    await act(async()=>document.querySelector('button.bl-launch').click());
    assert.ok(document.querySelector('img[alt^="Bonus Overview"]'));
    const chooser=document.querySelector('[aria-label="Choose account bonus screenshot"]');
    assert.equal(chooser.multiple,false);
    await select(['first.png']);
    assert.deepEqual(calls,['first.png']);
    assert.ok(document.querySelector('[aria-label="Bonus screenshot preview"] img'));
    assert.equal(document.querySelectorAll('.bl-scan-uncertain').length,1);
    const apply=[...document.querySelectorAll('button')].find(b=>b.textContent==='Use these bonuses');assert.equal(apply.disabled,true);
    await clickText('Correct');assert.equal(apply.disabled,false);
    await clickText('Use these bonuses');
    let saved=JSON.parse(localStorage.getItem('bearLeader:v2:bonus-test')).profile;
    assert.equal(saved.allAttack,216.77);assert.equal(saved.allLethality,0);
    assert.equal(saved.stats[0].attack,167.18);assert.equal(saved.stats[2].attack,300.25);
    assert.equal(saved.stats[2].attackOn,0);
    await select(['second.png']);
    assert.equal(document.querySelectorAll('[aria-label^="Scanned "]').length,1,'A new screenshot starts a fresh review');
    await clickText('Use these bonuses');
    saved=JSON.parse(localStorage.getItem('bearLeader:v2:bonus-test')).profile;
    assert.equal(saved.stats[0].attack,168.18);assert.equal(saved.allAttack,216.77);assert.equal(saved.stats[2].attack,300.25);
    await act(async()=>root.unmount());
    console.log('Bonus scanner integration passed: one screenshot, automatic full-image scan, preview, uncertain reading confirmation, replacement and partial saved-data merge.');
  } finally {dom.window.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
