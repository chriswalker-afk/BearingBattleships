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
const rewards = fs.readFileSync(path.join(root, 'rewards.js'), 'utf8');
const squid = fs.readFileSync(path.join(root, 'squid-strike.js'), 'utf8');
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
  vm.runInContext(rewards, context, { filename: 'rewards.js' });
  vm.runInContext(squid, context, { filename: 'squid-strike.js' });
  // In the browser window IS global; this VM harness uses a separate window stub.
  sandbox.BloopArt=win.BloopArt;
  sandbox.BloopJuice=win.BloopJuice;
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
  let moveCount=0;
  function move(bearing='090',distance=1){
    assert.match(element('phaseHeading').textContent,/MOVE/,'A MOVE turn must be active');
    element('bearing').value=bearing;
    element('distance').value=distance;
    click('actionBtn');
  }
  function fire(bearing = '000', distance = 6) {
    // Old tests exercise multiple hits; fulfil the mandatory movement between them.
    if(element('phaseHeading').textContent.includes('MOVE')){
      move(moveCount++%2===0?'090':'270',1);advance();
    }
    if (bearing === '000' && Number(distance) === 6) win.__testLineup();
    element('bearing').value = bearing;
    element('distance').value = distance;
    click('actionBtn');
  }
  function advance(ms = 2500) { clock += ms; if (frame) frame(clock); }
  return { e: element, click, fire, move, advance, frameCount: () => frames,
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

test('three pops with required moves earn streak and reach level 2', () => {
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
  g.move('180', 1);
  assert.equal(g.e('turn').textContent, 3);
  assert.equal(g.frameCount(), 0);
});


test('invalid bearings show pop-in guidance without changing phase or using a turn', () => {
  const g=harness(true);
  assert.match(g.e('phaseHeading').textContent,/FIRE/);
  assert.match(g.e('phasePopTitle').textContent,/FIRE/);
  g.fire('45',4);
  assert.equal(g.e('turn').textContent,1);
  assert.equal(g.e('errorPopTitle').textContent,'⚠️ Check your bearing');
  assert.match(g.e('errorPopDetail').textContent,/045/);
  assert.ok(g.e('errorPop').classes.has('show'));
  assert.match(g.e('phaseHeading').textContent,/FIRE/);
  g.fire('360',4);
  assert.match(g.e('errorPopDetail').textContent,/000/);
  assert.equal(g.e('turn').textContent,1);
  g.fire('000',6);
  assert.match(g.e('phaseHeading').textContent,/MOVE/);
  assert.match(g.e('phasePopTitle').textContent,/MOVE/);
  g.move('000',6);
  assert.equal(g.e('turn').textContent,2);
  assert.match(g.e('errorPopTitle').textContent,/distance/);
  assert.match(g.e('phaseHeading').textContent,/MOVE/);
  g.move('180',1);
  assert.equal(g.e('turn').textContent,3);
  assert.match(g.e('phaseHeading').textContent,/FIRE/);
});

test('valid actions alternate in normal animation mode only after unlocking', () => {
  const g=harness(false);
  g.fire('180',1);
  assert.match(g.e('phaseHeading').textContent,/FIRE/,'Still FIRE while animating');
  assert.equal(g.e('actionBtn').disabled,true);
  g.advance();
  assert.match(g.e('phaseHeading').textContent,/MOVE/);
  assert.match(g.e('phasePopTitle').textContent,/MOVE/);
  g.move('090',1);
  assert.match(g.e('phaseHeading').textContent,/MOVE/,'Still MOVE while animating');
  g.advance();
  assert.match(g.e('phaseHeading').textContent,/FIRE/);
});


test('a syntactically valid but missed shot creates post-shot pop-in feedback',()=>{
  const g=harness(false);
  g.fire('180',1);
  assert.equal(g.e('turn').textContent,2,'A missed shot uses a turn');
  g.advance(750);
  assert.match(g.e('errorPopTitle').textContent,/Bubble missed/);
  assert.match(g.e('errorPopDetail').textContent,/bearing and range/);
  assert.equal(g.e('score').textContent,0);
  g.advance(2000);
  assert.match(g.e('phaseHeading').textContent,/MOVE/);
});

test('off-map move is rejected without advancing or switching phases',()=>{
  const g=harness(true);
  g.fire('180',1);
  g.move('180',5); // Ship has sailed from y=325 to y=575.
  assert.equal(g.e('turn').textContent,3);
  g.fire('180',1);
  assert.match(g.e('phaseHeading').textContent,/MOVE/);
  const before=g.e('turn').textContent;
  g.move('180',2); // Would place the ship outside the 650px sea.
  assert.equal(g.e('turn').textContent,before);
  assert.match(g.e('errorPopTitle').textContent,/Off the map/);
  assert.match(g.e('phaseHeading').textContent,/MOVE/);
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
