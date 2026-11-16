/* Run with: node --test tests/single-screen.test.cjs */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'single-screen.css'), 'utf8');
const script = fs.readFileSync(path.join(root, 'single-screen.js'), 'utf8');

test('all gameplay controls remain in one compact bridge alongside the board', () => {
  for (const id of [
    'board', 'sea', 'turn', 'score', 'hearts', 'waveNo', 'streak',
    'bestStreak', 'log', 'fireMode', 'moveMode', 'bearing',
    'distance', 'actionBtn', 'protractorBtn', 'rulerBtn',
    'mathBtn', 'tutorialBtn', 'resetBtn'
  ]) {
    const found = [...html.matchAll(new RegExp('id="' + id + '"', 'g'))];
    assert.equal(found.length, 1, 'Expected exactly one control ID: ' + id);
  }
  assert.match(html, /<aside class="stack"/);
  assert.match(html, /class="panel missionPanel"/);
  assert.match(html, /class="panel ordersPanel"/);
  assert.match(html, /class="panel toolPanel"/);
  assert.match(html, /single-screen.css/);
  assert.match(html, /single-screen.js/);
});

test('desktop is viewport-constrained; narrow screens retain scroll fallback', () => {
  assert.match(layout, /min-width: 960px\)\s+and\s+\(min-height: 600px/);
  assert.match(layout, /height: 100dvh/);
  assert.match(layout, /overflow: hidden/);
  assert.match(layout, /max-width: 959px/);
  assert.match(layout, /grid-template-columns: 1fr/);
  assert.match(layout, /max-height: 100px/);
  assert.match(layout, /outline:/);
});

function simulate({ desktop, width, height, footerHeight = 49, gap = 6 }) {
  let targetWidth = null, removedWidth = false;
  let callback;
  let windowHandler, observer;
  const mq = { matches: desktop, addEventListener(_name, fn) { windowHandler = fn; } };
  const sea = {
    style: {
      set width(v) { targetWidth = v; },
      get width() { return targetWidth; },
      removeProperty(prop) { if (prop === 'width') removedWidth = true; }
    }
  };
  const wrap = { clientWidth: width, clientHeight: height };
  const footer = { offsetHeight: footerHeight };
  const board = { width: 1000, height: 650 };
  const els = { board, sea };
  const q = { '.seaWrap': wrap, '.seafooter': footer };
  const win = {
    matchMedia: () => mq,
    addEventListener() {},
    requestAnimationFrame: fn => { callback = fn; }
  };
  class ResizeObserverMock {
    constructor(fn) { observer = fn; }
    observe() {}
  }
  win.ResizeObserver = ResizeObserverMock;
  const sandbox = {
    document: {
      getElementById: id => els[id],
      querySelector: selector => q[selector]
    },
    window: win,
    ResizeObserver: ResizeObserverMock,
    getComputedStyle: el => ({
      borderLeftWidth: el === sea ? '5px' : '0px',
      borderRightWidth: el === sea ? '5px' : '0px',
      borderTopWidth: el === sea ? '5px' : '0px',
      borderBottomWidth: el === sea ? '5px' : '0px',
      rowGap: el === wrap ? gap + 'px' : '0px'
    })
  };
  vm.runInNewContext(script, sandbox, { filename: 'single-screen.js' });
  assert.equal(typeof callback, 'function');
  callback();
  return { targetWidth, removedWidth, hasObserver: !!observer, hasMQListener: !!windowHandler };
}

test('board scales by height without stretching its 1000x650 aspect ratio', () => {
  const fit = simulate({ desktop: true, width: 1200, height: 580 });
  const expected = Math.floor((580 - 49 - 6 - 3 - 10) * 1000 / 650 + 10);
  assert.equal(fit.targetWidth, expected + 'px');
  assert.equal(fit.hasObserver, true);
  assert.equal(fit.hasMQListener, true);
});

test('board also respects narrower widths', () => {
  const fit = simulate({ desktop: true, width: 600, height: 900 });
  assert.equal(fit.targetWidth, '598px');
});

test('small screens remove an old desktop width override', () => {
  const fit = simulate({ desktop: false, width: 390, height: 800 });
  assert.equal(fit.targetWidth, null);
  assert.equal(fit.removedWidth, true);
});
