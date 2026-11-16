/* Regression: node --test tests/ruler-pivot.test.cjs */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const art = fs.readFileSync(path.join(root, 'pass-a-art.js'), 'utf8');
const juice = fs.readFileSync(path.join(root, 'pass-b-juice.js'), 'utf8');
const inline = html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(inline, 'Gameplay script should exist');
const close = (a, b, why) => assert.ok(Math.abs(a - b) < 0.01, why + ': ' + a + ' vs ' + b);

function harness(rect = { left: 0, top: 0, width: 1000, height: 650 }) {
  const events = new Map(), elements = new Map(), rulerFrames = [];
  let lastTranslate = null, lastAngle = 0, now = 10000;
  let captures = 0;
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => gradient;
      }
      if (prop === 'translate') {
        return (x, y) => { lastTranslate = { x, y }; };
      }
      if (prop === 'rotate') {
        return angle => { lastAngle = angle; };
      }
      if (prop === 'fillRect') {
        return (x, y, width, height) => {
          // This uniquely identifies the 0..8-unit ruler body.
          if (x === 0 && y === -20 && width === 400 && height === 40) {
            rulerFrames.push({ x: lastTranslate.x, y: lastTranslate.y,
              angle: lastAngle, rect: [x, y, width, height] });
          }
        };
      }
      if (prop === 'globalAlpha') return 1;
      return () => {};
    },
    set() { return true; }
  });
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const classes = new Set();
    const e = {
      value: '', textContent: '', firstChild: { textContent: '' },
      dataset: {}, classList: {
        add(v) { classes.add(v); }, remove(v) { classes.delete(v); },
        toggle(v, on) { if (on) classes.add(v); else classes.delete(v); }
      },
      getContext() { return ctx; },
      getBoundingClientRect() { return rect; },
      setPointerCapture() { captures++; },
      addEventListener(event, fn) { events.set(id + ':' + event, fn); },
      setAttribute() {}, showModal() {}, close() {}
    };
    elements.set(id, e);
    return e;
  }
  const win = { matchMedia: () => ({ matches: true }) };
  const sandbox = {
    window: win, document: { getElementById: element },
    requestAnimationFrame() {}, performance: { now: () => now }
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(art, context, { filename: 'pass-a-art.js' });
  vm.runInContext(juice, context, { filename: 'pass-b-juice.js' });
  vm.runInContext(inline[1], context, { filename: 'index.html' });

  function pointer(type, wx, wy) {
    const event = events.get('board:' + type);
    assert.equal(typeof event, 'function', type + ' listener');
    let prevented = false;
    event({
      clientX: rect.left + wx * rect.width / 1000,
      clientY: rect.top + wy * rect.height / 650,
      pointerId: 5,
      preventDefault() { prevented = true; }
    });
    return prevented;
  }
  function frame() {
    return rulerFrames.at(-1);
  }
  function click(id) {
    const e = element(id), handler = events.get(id + ':click') || e.onclick;
    assert.equal(typeof handler, 'function', 'Expected click handler for ' + id);
    handler();
  }
  return { pointer, frame, frames: rulerFrames, click, e: element,
    captures: () => captures };
}

test('ruler starts at the 0 end, extending 8 units to the right', () => {
  const g = harness();
  const f = g.frame();
  close(f.x, 320, 'start pivot x');
  close(f.y, 560, 'start pivot y');
  close(f.angle, 0, 'start angle');
  assert.deepEqual(f.rect, [0, -20, 400, 40]);
});

test('drag blue 0 to the ship, then rotate by far orange handle without shifting 0', () => {
  const g = harness();
  assert.equal(g.pointer('pointerdown', 320, 560), true);
  g.pointer('pointermove', 500, 325);
  g.pointer('pointerup', 500, 325);
  close(g.frame().x, 500, 'zero x at ship');
  close(g.frame().y, 325, 'zero y at ship');
  close(g.frame().angle, 0, 'no unintended rotation when moving ruler');

  assert.equal(g.pointer('pointerdown', 918, 325), true); // 400 + 18
  const rayX = 500 + 418 / Math.sqrt(2);
  const rayY = 325 + 418 / Math.sqrt(2);
  g.pointer('pointermove', rayX, rayY);
  g.pointer('pointerup', rayX, rayY);
  close(g.frame().x, 500, 'zero x stays pinned');
  close(g.frame().y, 325, 'zero y stays pinned');
  close(g.frame().angle, Math.PI / 4, '45-degree rotation');

  // Unit positions are at 50px intervals measured from the 0 pivot.
  const f = g.frame();
  const x8 = f.x + Math.cos(f.angle) * 400;
  const y8 = f.y + Math.sin(f.angle) * 400;
  close(Math.hypot(x8 - f.x, y8 - f.y), 400, '8 unit ruler length');
  assert.ok(g.captures() >= 2, 'Both grips captured the pointer');
});

test('dragging ruler body translates both ends without changing orientation', () => {
  const g = harness();
  g.pointer('pointerdown', 738, 560);
  g.pointer('pointermove', 320 + 418 / Math.sqrt(2), 560 - 418 / Math.sqrt(2));
  g.pointer('pointerup', 0, 0);
  const original = g.frame();
  const bx = original.x + 150 * Math.cos(original.angle);
  const by = original.y + 150 * Math.sin(original.angle);
  g.pointer('pointerdown', bx, by);
  g.pointer('pointermove', bx + 50, by - 40);
  g.pointer('pointerup', bx + 50, by - 40);
  close(g.frame().x, original.x + 50, 'ruler translated x');
  close(g.frame().y, original.y - 40, 'ruler translated y');
  close(g.frame().angle, original.angle, 'ruler did not rotate');
});

test('touch-size hit testing and coordinates work with a scaled canvas', () => {
  const g = harness({ left: 10, top: 20, width: 500, height: 325 });
  assert.equal(g.pointer('pointerdown', 738, 560), true);
  // 180-degree handle rotation would leave the 0 point exactly where it was.
  g.pointer('pointermove', 320, 560 - 418);
  g.pointer('pointerup', 320, 560 - 418);
  close(g.frame().x, 320, 'scaled pivot x');
  close(g.frame().y, 560, 'scaled pivot y');
  close(g.frame().angle, -Math.PI / 2, 'scaled rotation');
});

test('firing and protractor/ruler toggles retain previous gameplay', () => {
  const g = harness();
  g.e('bearing').value = '45';
  g.e('distance').value = 5;
  g.click('actionBtn');
  assert.equal(g.e('turn').textContent, 1);
  g.e('bearing').value = '045';
  g.click('actionBtn');
  assert.equal(g.e('turn').textContent, 2);
  g.click('rulerBtn');
  const before = g.frames.length;
  g.click('protractorBtn');
  assert.equal(g.frames.length, before, 'Hidden ruler does not draw');
  g.click('resetBtn');
  close(g.frame().x, 320, 'reset restores ruler 0 x');
  close(g.frame().y, 560, 'reset restores ruler 0 y');
});
