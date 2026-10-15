// Integrated task flows against the real React app, using an isolated DOM and saved state.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { JSDOM } = require('jsdom');
(async () => {
  const repo = path.resolve(__dirname, '..');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-start-'));
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.example', pretendToBeVisual: true });
  Object.assign(global, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
    HTMLElement: dom.window.HTMLElement, FileReader: dom.window.FileReader,
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true });
  window.scrollTo = () => {}; window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  const now = Date.now();
  localStorage.setItem('timehub:v1', JSON.stringify({ version: 2,
    accounts: [{ id: 'A', name: 'Main', type: 'main', isPrimary: true, color: 1, order: 0 }],
    settings: { accountFilter: 'A', tour: 9, displayTz: 'Pacific/Auckland' }, accountData: {},
    tasks: [{ id: 'room', title: 'Clean room', category: 'personal', durationMs: 40 * 60000, minimumTitle: 'Move three plates', minimumDurationMs: 120000, essential: true, createdAt: now },
      { id: 'letter', title: 'Post letter', category: 'work', durationMs: 300000, createdAt: now },
      { id: 'unknown', title: 'Unestimated task', category: 'personal', createdAt: now }] }));
  localStorage.setItem('timehub:tab', 'todos');
  await require('esbuild').build({ entryPoints: [path.join(repo, 'src/App.jsx')], outfile: path.join(tmp, 'App.cjs'), bundle: true,
    platform: 'node', format: 'cjs', external: ['react'], loader: { '.css': 'empty', '.png': 'dataurl', '.webp': 'dataurl' }, logLevel: 'silent' });
  const React = require('react'), { act } = React;
  const root = require('react-dom/client').createRoot(document.getElementById('root'));
  const scope = () => document.querySelector('.th-panel.on');
  const btn = (text, area = scope()) => [...area.querySelectorAll('button')].find(x => x.textContent.trim() === text);
  const click = async (text, area) => { const el = btn(text, area); assert.ok(el, 'Missing button: ' + text); await act(async () => el.click()); };
  const fill = async (el, value) => act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  try {
    await act(async () => root.render(React.createElement(require(path.join(tmp, 'App.cjs')).default)));
    await click('Priority'); assert.ok(btn('＋ Add task')); assert.ok(scope().textContent.includes('Time-sensitive'));
    await click('＋ Add task');
    await fill(scope().querySelector('input[placeholder="What do you need to do?"]'), 'Title-only capture');
    await act(async () => scope().querySelector('.th-todo-add-wrap').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    assert.ok(scope().textContent.includes('Title-only capture'));
    await click('Minimum Day');
    assert.ok(scope().textContent.includes('Move three plates'));
    assert.ok(!scope().textContent.includes('Post letter'));
    await click('Choose essentials');
    const choice = [...scope().querySelectorAll('.th-essential-choices label')].find(x => x.textContent === 'Post letter');
    await act(async () => choice.querySelector('input').click());
    assert.equal(scope().querySelectorAll('.th-minday .th-todo-row').length, 2);
    await click('What should I do now?');
    assert.ok(scope().textContent.includes('How much time do you want to spend?'));
    assert.ok(scope().textContent.includes('You marked this essential.'));
    await click('Take a break');
    const row = scope().querySelector('.th-minday .th-todo-row');
    await click('Help me start', row);
    await click('Start without timer', row);
    assert.ok(scope().querySelector('.th-focus').textContent.includes('Move three plates'));
    assert.equal(scope().querySelector('.th-todo-lists'), null);
    assert.equal(scope().querySelector('.th-focus-time'), null);
    await click('✓ Finished', scope().querySelector('.th-focus'));
    assert.ok(btn('Undo', document));
    await click('Undo', document);
    assert.ok(scope().textContent.includes('Move three plates'));
    // An active calculator panel is inert and hidden from assistive technology when switched away.
    await act(async () => [...document.querySelectorAll('.th-tabbar button')].find(x => x.textContent === 'BT Calculator').click());
    await act(async () => [...document.querySelectorAll('.th-tabbar button')].find(x => x.textContent === 'To do').click());
    for (const panel of document.querySelectorAll('.th-panel[hidden]')) { assert.equal(panel.getAttribute('aria-hidden'), 'true'); assert.ok(panel.hasAttribute('inert')); }
    console.log('To-do integration passed: priority capture, title-only add, one-off essentials, small versions, suggestions, untimed focus, completion Undo, hidden-panel accessibility.');
  } finally { await act(async () => root.unmount()); dom.window.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
