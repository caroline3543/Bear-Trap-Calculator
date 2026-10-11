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
  Object.assign(global,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
  const calls=[];
  window.Tesseract = { recognize: async file => {
    calls.push(file.name);
    return {data:data(file.name==='first.png' ? ["Troops’ Attack 216.77%", 'Infantry Attack 167.18%'] : file.name==='second.png' ? ['Marksman Attack 300.25%'] : ['Infantry Attack 168.18%'])};
  }};
  await deps('esbuild').build({entryPoints:[path.join(repo,'src/bear/BearLab.jsx')],outfile:path.join(tmp,'form.cjs'),bundle:true,platform:'node',format:'cjs',external:['react'],loader:{'.css':'empty','.webp':'dataurl'},logLevel:'silent'});
  const React=deps('react');const {act}=React;
  const root=deps('react-dom/client').createRoot(document.getElementById('root'));
  const Form=require(path.join(tmp,'form.cjs')).default;
  const select=async names=>act(async()=>{
    const el=document.querySelector('[aria-label="Choose account bonus screenshots"]');
    Object.defineProperty(el,'files',{configurable:true,value:names.map(name=>new window.File(['image'],name,{type:'image/png'}))});
    el.dispatchEvent(new window.Event('change',{bubbles:true}));
  });
  const clickText=async text=>act(async()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===text);assert.ok(button,text);button.click();});
  try {
    await act(async()=>root.render(React.createElement(Form,{accountId:'bonus-test',accountName:'Main',leaderCapacity:160010,troopTiers:[{fc:5,level:10},{fc:5,level:10},{fc:6,level:10}],onApplyLeader:()=>{}})));
    await act(async()=>document.querySelector('button.bl-launch').click());
    assert.ok(document.querySelector('img[alt^="Bonus Overview"]'));
    await select(['first.png','second.png']);await clickText('Read 2 screenshots');
    assert.deepEqual(calls,['first.png','second.png']);
    assert.equal(document.querySelectorAll('.bl-scan-uncertain').length,0);
    await select(['conflicting.png']);await clickText('Read 3 screenshots');
    assert.equal(document.querySelectorAll('.bl-scan-uncertain').length,1);
    const apply=[...document.querySelectorAll('button')].find(b=>b.textContent==='Use reviewed bonuses');assert.equal(apply.disabled,true);
    await clickText('Confirm reading');assert.equal(apply.disabled,false);
    await clickText('Use reviewed bonuses');
    const saved=JSON.parse(localStorage.getItem('bearLeader:v2:bonus-test')).profile;
    assert.equal(saved.allAttack,216.77);assert.equal(saved.allLethality,0);
    assert.equal(saved.stats[0].attack,167.18);assert.equal(saved.stats[2].attack,300.25);
    assert.equal(saved.stats[2].attackOn,0);
    assert.equal(document.querySelectorAll('.bl-scan-uncertain').length,0);
    await act(async()=>root.unmount());
    console.log('Bonus scanner integration passed: multiple files, conflicts, confirmation, partial merge, persisted account bonuses and example image.');
  } finally {dom.window.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
