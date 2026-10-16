const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const deps=require('node:module').createRequire(path.join(process.env.BT_TEST_DEPS,'package.json'));
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ui-system-'));
 const dom=new (deps('jsdom').JSDOM)('<div id="root"></div>',{url:'https://test.example',pretendToBeVisual:true});
 Object.assign(global,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,HTMLElement:dom.window.HTMLElement,FileReader:dom.window.FileReader,requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window),cancelAnimationFrame:dom.window.cancelAnimationFrame.bind(dom.window),IS_REACT_ACT_ENVIRONMENT:true});
 window.scrollTo=()=>{};window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 localStorage.setItem('timehub:v1',JSON.stringify({version:2,accounts:[{id:'A',name:'Main',type:'main',isPrimary:true,color:1,order:0},{id:'farm',name:'Farm',type:'farm',color:2,order:1}],settings:{accountFilter:'A',tour:9},accountData:{}}));
 localStorage.setItem('timehub:tab','today');
 localStorage.setItem('bearTrapCalculator:v1:farm',JSON.stringify({capacity:123456,t10:{infantry:100,lancer:200,marksman:300},t9:{infantry:1,lancer:2,marksman:3},troopTiers:[{fc:5,level:10},{fc:5,level:10},{fc:6,level:10}]}));
 const repo=path.resolve(__dirname,'..');
 await deps('esbuild').build({entryPoints:[path.join(repo,'src/App.jsx')],outfile:path.join(tmp,'App.cjs'),bundle:true,platform:'node',format:'cjs',external:['react'],loader:{'.css':'empty','.png':'dataurl','.webp':'dataurl'},logLevel:'silent'});
 const React=deps('react'),{act}=React;const root=deps('react-dom/client').createRoot(document.getElementById('root'));const App=require(path.join(tmp,'App.cjs')).default;
 const title=()=>document.querySelector('.ui-page-header h1')?.textContent;
 const choose=async name=>act(async()=>{const details=document.querySelector('.ui-account-selector');details.open=true;[...details.querySelectorAll('.ui-account-menu > button')].find(b=>b.querySelector('span')?.textContent===name).click();});
 const tab=async index=>act(async()=>document.querySelectorAll('.th-tabbar button')[index].click());
 try{
  await act(async()=>root.render(React.createElement(App)));
  assert.equal(document.querySelectorAll('.ui-page-header').length,1);
  assert.equal(document.querySelectorAll('.ui-account-selector').length,1);
  assert.equal(document.querySelector('.journal-skip').getAttribute('href'),'#journal-content');
  const brief=[...document.querySelectorAll('.journal-brief-actions button')];
  assert.equal(brief.length,2);
  await act(async()=>brief[0].click());assert.equal(document.querySelector('.th-tabbar [aria-current=page] span').textContent,'To do');
  await tab(0);await act(async()=>document.querySelectorAll('.journal-brief-actions button')[1].click());
  assert.equal(document.querySelector('.th-tabbar [aria-current=page] span').textContent,'Timers');
  for(const link of document.querySelectorAll('.journal-section-links a')){await act(async()=>link.click());const target=document.querySelector(link.getAttribute('href'));assert.ok(target,'Section link has a target');assert.equal(target.querySelector('[aria-expanded]').getAttribute('aria-expanded'),'true');}
  await tab(0);
  await choose('Farm');
  assert.equal(localStorage.getItem('bearTrapCalculator:activeAccount'),'farm');
  assert.equal(document.querySelector('.ui-account-selector summary span').textContent,'Farm');
  const titles=[];
  for(let i=0;i<5;i++){await tab(i);titles.push(title());assert.equal(document.querySelectorAll('.ui-page-header').length,1);assert.equal(document.querySelectorAll('.ui-account-selector').length,1);assert.equal(document.querySelector('.ui-account-selector summary span').textContent,'Farm');}
  assert.equal(new Set(titles).size,5);
  for(const link of document.querySelectorAll('.journal-calc-nav a')) assert.ok(document.querySelector(link.getAttribute('href')),'Calculator step has a target');
  const toggle=document.querySelector('.ui-section-toggle');const before=toggle.getAttribute('aria-expanded');
  await act(async()=>toggle.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));assert.notEqual(toggle.getAttribute('aria-expanded'),before);
  await act(async()=>toggle.dispatchEvent(new window.KeyboardEvent('keydown',{key:' ',bubbles:true})));assert.equal(toggle.getAttribute('aria-expanded'),before);
  assert.ok(document.body.textContent.includes('Infantry FC5 · Lancer FC5 · Marksman FC6'));
  assert.equal(JSON.parse(localStorage.getItem('bearTrapCalculator:v1:farm')).capacity,123456);
  assert.ok(![...document.querySelectorAll('.ui-account-menu button')].some(b=>b.textContent.includes('All accounts')),'Calculator must target one account');
  await choose('Main');await tab(0);assert.equal(document.querySelector('.ui-account-selector summary span').textContent,'Main');
  await choose('All accounts');await tab(4);assert.equal(document.querySelector('.ui-account-selector summary span').textContent,'Main');await tab(0);assert.equal(document.querySelector('.ui-account-selector summary span').textContent,'All accounts');
  const details=document.querySelector('.ui-account-selector');details.open=true;details.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(details.open,false);
  await act(async()=>document.querySelector('.ui-header-actions button').click());assert.ok(document.querySelector('.ui-button'));assert.ok(document.querySelector('.ui-input'));
  assert.equal(title(),'Settings');assert.equal(document.querySelector('#journal-content').tabIndex,-1);
  for(const link of document.querySelectorAll('.journal-section-links a')) assert.ok(document.querySelector(link.getAttribute('href')),'Settings link has a target');
  await tab(0);assert.equal(title(),titles[0]);assert.equal(document.querySelector('.th-settings'),null,'Nav closes settings even on the current tab');
  await act(async()=>root.unmount());console.log('Shared UI check passed: all five headers, one account selector, tracker → calculator → tracker selection, isolated saved stats, aggregate views, Escape and shared form controls.');
 }finally{dom.window.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
