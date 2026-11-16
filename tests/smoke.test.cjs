/* Run locally with Node 20+: node --test tests/smoke.test.cjs */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const inline = html.match(/<script>\s*([\s\S]*?)<\/script>/);
const art = fs.readFileSync(path.join(root, 'pass-a-art.js'), 'utf8');
const juice = fs.readFileSync(path.join(root, 'pass-b-juice.js'), 'utf8');
const difficulty = fs.readFileSync(path.join(root, 'difficulty.js'), 'utf8');

function harness(reducedMotion = false) {
  assert.ok(inline, 'Expected inline gameplay script');
  let clock = 20000, frame = null, frames = 0, randomIndex = 0, paints = 0;
  // Deterministic spawns; shooting tests align targets through a test-only hook.
  const randomValues = [.6, .5, 0, 0];
  const fakeMath = Object.create(Math);
  fakeMath.random = () => randomValues[(randomIndex++) % randomValues.length];
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      if (prop === 'globalAlpha') return 1;
      return () => { paints++; };
    },
    set() { return true; }
  });
  const elements = new Map(), listeners = new Map(), dialogs = new Set();
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const classes = new Set();
    const item = {
      value: '', textContent: '', dataset: {}, firstChild: { textContent: '' },
      disabled: false, classes,
      classList: {
        add: x => classes.add(x),
        remove: x => classes.delete(x),
        contains: x => classes.has(x),
        toggle: (x, enabled) => enabled ? classes.add(x) : classes.delete(x)
      },
      getContext() { return ctx; },
      addEventListener(event, fn) { listeners.set(id + ':' + event, fn); },
      setAttribute() {}, setPointerCapture() {},
      showModal() { dialogs.add(id); },
      close() { dialogs.delete(id); },
      getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 650 }; }
    };
    elements.set(id, item);
    return item;
  }
  const win = { matchMedia: () => ({ matches: reducedMotion }) };
  const sandbox = {
    document: { getElementById: element },
    window: win, Math: fakeMath,
    performance: { now: () => clock },
    requestAnimationFrame(fn) { frame = fn; frames++; }
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(art, context, { filename: 'pass-a-art.js' });
  vm.runInContext(juice, context, { filename: 'pass-b-juice.js' });
  vm.runInContext(difficulty, context, { filename: 'difficulty.js' });
  // Test-only source injection: no production debug hook is shipped.
  const anchor = 'start();if(!reducedMotion)requestAnimationFrame(frame);})();';
  assert.ok(inline[1].includes(anchor), 'Expected game entrypoint');
  const source = inline[1].replace(anchor, `
    window.__testLineup = () => {
      for (const e of enemies) {
        e.x=ship.x;e.y=ship.y-220;e.motion=null;
      }
    };
    ${anchor}`);
  vm.runInContext(source, context, { filename: 'index.html' });
  function click(id) {
    const e = element(id), fn = listeners.get(id + ':click') || e.onclick;
    assert.equal(typeof fn, 'function', 'Missing click handler: ' + id);
    fn();
  }
  function fire(bearing = '000', distance = 6) {
    if (bearing === '000' && Number(distance) === 6) win.__testLineup();
    element('bearing').value = bearing;
    element('distance').value = distance;
    click('actionBtn');
  }
  function advance(ms = 2500) { clock += ms; if (frame) frame(clock); }
  return { e: element, click, fire, advance, frameCount: () => frames,
    ctx, win, paints: () => paints, dialogs, lineUp: () => win.__testLineup() };
}

test('manual bearing entry remains strictly three figures', () => {
  const g = harness();
  g.fire('45', 6);
  assert.equal(g.e('turn').textContent, 1);
  g.fire('360', 6);
  assert.equal(g.e('turn').textContent, 1);
  g.fire('000', 9);
  assert.equal(g.e('turn').textContent, 1);
  g.fire('000', 6);
  assert.equal(g.e('score').textContent, 1);
});

test('three pops earn streak, start level 2 and reset streak after a miss', () => {
  const g = harness();
  for (let i = 1; i <= 3; i++) {
    g.fire(); assert.equal(g.e('score').textContent, i);
    assert.equal(g.e('streak').textContent, i);
    assert.equal(g.e('actionBtn').disabled, true);
    g.advance();
    assert.equal(g.e('actionBtn').disabled, false);
  }
  assert.equal(g.e('waveNo').textContent, 2);
  assert.ok(g.e('waveNotice').classes.has('show'));
  g.fire('180', 1);
  assert.equal(g.e('streak').textContent, 0);
  assert.equal(g.e('bestStreak').textContent, 3);
  g.advance();
  g.click('mathBtn'); g.click('tutorialBtn');
  assert.ok(g.dialogs.has('maths') && g.dialogs.has('tutorial'));
  g.click('resetBtn');
  assert.equal(g.e('waveNo').textContent, '1');
  assert.equal(g.e('bestStreak').textContent, 0);
});

test('three simultaneous enemy bumps lose exactly three hearts', () => {
  const g = harness();
  g.lineUp(); // All three approach from the same place to exercise one-turn damage clamping.
  for (let i = 0; i < 25 && g.e('hearts').textContent.includes('♥'); i++) {
    g.fire('180', 1);
    g.advance();
  }
  assert.equal(g.e('hearts').textContent, '♡♡♡');
  assert.ok(g.e('end').classes.has('show'));
  assert.match(g.e('log').textContent, /hearts lost/);
});

test('reduced motion disables RAF and large effects without disabling play', () => {
  const g = harness(true);
  assert.equal(g.frameCount(), 0);
  g.fire();
  assert.equal(g.e('score').textContent, 1);
  assert.equal(g.e('actionBtn').disabled, false);
  assert.equal(g.e('waveNotice').classes.has('show'), false);
  g.click('moveMode');
  g.e('bearing').value = '180';
  g.e('distance').value = 1;
  g.click('actionBtn');
  assert.equal(g.e('turn').textContent, 3);
  assert.equal(g.frameCount(), 0);
});

test('new cartoon faces and comic overlays can render without exceptions', () => {
  const g = harness();
  for (let i = 0; i < 3; i++) {
    for (const mood of ['curious', 'cheeky', 'surprised', 'grumpy']) {
      g.win.BloopArt.drawCreature(g.ctx, { x: 400, y: 300, type: i, mood, bob: 1 }, 30000);
    }
  }
  g.win.BloopJuice.speech(g.ctx, {
    x: 420, y: 90, text: 'Bloop!', start: 30000, duration: 800
  }, 30300);
  g.win.BloopJuice.celebration(g.ctx, {
    x: 430, y: 300, start: 30000, duration: 900, pinpoint: true, streak: 3
  }, 30300);
  assert.ok(g.paints() > 1000);
});
