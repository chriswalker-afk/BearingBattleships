/* Run from repo root: node --test tests/difficulty.test.cjs */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root=path.resolve(__dirname,'..');
const difficulty=fs.readFileSync(path.join(root,'difficulty.js'),'utf8');
const art=fs.readFileSync(path.join(root,'pass-a-art.js'),'utf8');
const juice=fs.readFileSync(path.join(root,'pass-b-juice.js'),'utf8');
const rewards=fs.readFileSync(path.join(root,'rewards.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const game=html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(game,'Inline gameplay script must exist');

function curriculum(){
  const sandbox={window:{}};
  vm.runInNewContext(difficulty,sandbox);
  return sandbox.window.BloopDifficulty;
}
test('the 12-level schedule changes exactly one difficulty dimension each time',()=>{
  const plan=curriculum();
  assert.equal(plan.maxLevel,12);
  assert.equal(plan.validate(),true);
  assert.deepEqual([plan.get(1).count,plan.get(1).speed,plan.get(1).armoured],[3,17,0]);
  assert.equal(plan.get(4).armoured,1,'First two-hit enemies appear at Level 4');
  for(let level=2;level<=plan.maxLevel;level++){
    const a=plan.get(level-1),b=plan.get(level);
    const keys=['count','speed','armoured'];
    const changed=keys.filter(key=>a[key]!==b[key]);
    assert.equal(changed.length,1,'Exactly one change at level '+level);
    assert.ok(b[changed[0]]>a[changed[0]],'Difficulty increases at level '+level);
    assert.ok(b.armoured<b.count,'Each level still has ordinary creatures');
  }
  assert.throws(()=>plan.get(13),/Unknown Bloop level/);
});
test('levels are visible but manual mathematical tools are unchanged',()=>{
  assert.match(html, /difficulty\.js/);
  assert.match(html, /difficulty\.css/);
  assert.match(html, /id="levelMax"/);
  assert.match(html, /id="levelRule"/);
  assert.match(html, /id="protractorBtn"/);
  assert.match(html, /id="rulerBtn"/);
  assert.match(html, /speed=window\.BloopDifficulty\.get\(waveNo\)\.speed/);
  assert.doesNotMatch(html, /Math\.floor\(turn\/5\)/,'Speed must not climb mid-level');
});

function harness({shortVoyage=false}={}){
  const events=new Map(), elements=new Map(),gradient={addColorStop(){}};
  let time=20000,randomIndex=0,raf=null;
  // Chosen only for deterministic tests; the game randomises naturally in production.
  const rng=[.6,.5,0,0];
  const fakeMath=Object.create(Math);fakeMath.random=()=>rng[randomIndex++ % rng.length];
  const canvas=new Proxy({},{
    get(_target,prop){
      if(prop==='createLinearGradient'||prop==='createRadialGradient')return ()=>gradient;
      if(prop==='globalAlpha')return 1;
      return ()=>{};
    },set(){return true}
  });
  function element(id){
    if(elements.has(id))return elements.get(id);
    const classes=new Set();
    const node={value:'',textContent:'',firstChild:{textContent:''},dataset:{},disabled:false,
      classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v),
        toggle:(v,on)=>on?classes.add(v):classes.delete(v)},
      getContext:()=>canvas,addEventListener:(type,fn)=>events.set(id+':'+type,fn),
      setAttribute(){},setPointerCapture(){},showModal(){},close(){},
      getBoundingClientRect:()=>({left:0,top:0,width:1000,height:650})};
    elements.set(id,node);return node;
  }
  const win={matchMedia:()=>({matches:true})};
  const sandbox={document:{getElementById:element},window:win,Math:fakeMath,
    performance:{now:()=>time},requestAnimationFrame(cb){raf=cb}};
  const ctx=vm.createContext(sandbox);
  vm.runInContext(art,ctx);
  vm.runInContext(juice,ctx);
  vm.runInContext(difficulty,ctx);
  vm.runInContext(rewards,ctx);
  // In the browser window IS global; this VM harness uses a separate window stub.
  sandbox.BloopArt=win.BloopArt;
  sandbox.BloopJuice=win.BloopJuice;
  if(shortVoyage){
    const plan=win.BloopDifficulty;
    win.BloopDifficulty={...plan,maxLevel:1};
  }
  // Test-only source injection: no debugging API is added to the deployed game.
  const anchor='start();if(!reducedMotion)requestAnimationFrame(frame);})();';
  assert.ok(game[1].includes(anchor),'Known entrypoint not found');
  const gameSource=game[1].replace(anchor,
    "window.__testing={"+
    "lineup(){for(const e of enemies){e.x=ship.x;e.y=ship.y-220;e.motion=null;}},"+
    "enemies(){return enemies.map(e=>({x:e.x,y:e.y,hp:e.hp,maxHp:e.maxHp}));}"+
    "};"+anchor);
  vm.runInContext(gameSource,ctx,{filename:'index.html'});
  function click(id){
    const node=element(id),fn=events.get(id+':click')||node.onclick;
    assert.equal(typeof fn,'function','Missing click '+id);
    fn();
  }
  let moveNumber=0;
  function move(bearing='090',distance=1){
    assert.match(element('phaseHeading').textContent,/MOVE/,'Only MOVE orders may sail');
    element('bearing').value=bearing;
    element('distance').value=distance;
    click('actionBtn');
  }
  function fire(bearing='000',range=6,align=true){
    // Complete each mandatory movement turn before the next test shot.
    if(element('phaseHeading').textContent.includes('MOVE')){
      move(moveNumber++%2===0?'090':'270',1);
    }
    if(align)win.__testing.lineup();
    element('bearing').value=bearing;
    element('distance').value=range;
    click('actionBtn');
  }
  return {fire,move,click,e:element,win,step(ms=2500){time+=ms;if(raf)raf(time)}};
}

test('a bubble helmet takes two accurately measured shots without awarding an early point',()=>{
  const g=harness();
  for(const level of [1,2,3]){
    const spec=g.win.BloopDifficulty.get(level);
    for(let i=0;i<spec.count;i++)g.fire();
    assert.equal(Number(g.e('waveNo').textContent),level+1);
  }
  assert.equal(g.e('score').textContent,11);
  assert.equal(g.e('levelRule').textContent,'+1 bubble-helmet silly');
  g.fire(); // cracks helmet on first hit
  assert.equal(g.e('score').textContent,11,'Cracking is not a pop/point');
  assert.equal(g.e('streak').textContent,11,'A correct helmet hit preserves the streak');
  assert.equal(g.e('waveNo').textContent,4,'A cracked creature keeps its level active');
  assert.match(g.e('log').textContent,/CLONK!/);
  assert.equal(g.e('log').dataset.feedback,'armour');
  g.fire(); // then pops helmeted creature
  assert.equal(g.e('score').textContent,12,'Second hit earns the point');
  assert.equal(g.e('streak').textContent,12);
});

test('all 12 levels are winnable with exactly the configured number of hits',()=>{
  const g=harness();
  const plan=g.win.BloopDifficulty;
  let expectedPops=0,expectedShots=0;
  for(let level=1;level<=plan.maxLevel;level++){
    const spec=plan.get(level);
    expectedPops+=spec.count;expectedShots+=spec.count+spec.armoured;
    for(let i=0;i<spec.count+spec.armoured;i++)g.fire();
    if(level<plan.maxLevel){
      assert.equal(Number(g.e('waveNo').textContent),level+1,'Advanced after level '+level);
      assert.equal(g.e('hearts').textContent,'♥♥♥');
    }
  }
  assert.equal(expectedPops,62);
  assert.equal(expectedShots,80);
  assert.equal(g.e('score').textContent,expectedPops);
  // Clearing Level 12 grants one final movement chance for a dropped star.
  assert.equal(g.e('end').dataset.outcome,'','Victory waits for final MOVE');
  assert.match(g.e('phaseHeading').textContent,/MOVE/);
  g.move('180',1);
  assert.equal(g.e('waveNo').textContent,plan.maxLevel);
  assert.equal(g.e('end').dataset.outcome,'victory');
  assert.ok(g.e('end').classList.contains('show'));
  assert.match(g.e('endTitle').textContent,/victory/i);
});

test('swim speed stays constant during a level and increases only at Level 3',()=>{
  const g=harness();
  g.win.__testing.lineup();
  const first=g.win.__testing.enemies()[0].y;
  let usedMove=0;
  for(let n=0;n<5;n++){
    if(g.e('phaseHeading').textContent.includes('FIRE')){
      g.fire('180',1,false); // Fire away from all northern targets.
    }else{
      g.move(usedMove++%2===0?'180':'000',1); // Sail directly N/S to keep northward enemies aligned.
    }
    const after=g.win.__testing.enemies()[0].y;
    assert.equal(Math.round(after-first),17*(n+1),'Level 1 speed constant on each turn');
  }
  assert.equal(Number(g.e('waveNo').textContent),1,'No silent level increase by turn count');
  const h=harness();
  for(let i=0;i<3+4;i++)h.fire();
  assert.equal(h.e('waveNo').textContent,3);
  h.win.__testing.lineup();
  const before=h.win.__testing.enemies()[0].y;
  assert.match(h.e('phaseHeading').textContent,/MOVE/,'A move follows the level-clearing shot');
  h.move('180',1);
  const after=h.win.__testing.enemies()[0].y;
  assert.equal(Math.round(after-before),21,'Level 3 has its first visible speed increase');
});

test('new creature counts and helmet quantities match the configured level',()=>{
  const g=harness();
  for(let stage=1;stage<=4;stage++){
    const spec=g.win.BloopDifficulty.get(stage);
    const enemies=g.win.__testing.enemies();
    assert.equal(enemies.length,spec.count,'Enemy count on level '+stage);
    assert.equal(enemies.filter(e=>e.maxHp===2).length,spec.armoured,
      'Two-hit enemies on level '+stage);
    if(stage<4){
      for(let n=0;n<spec.count+spec.armoured;n++)g.fire();
    }
  }
});

test('ending the final level does not incorrectly award Level 13',()=>{
  const g=harness({shortVoyage:true});
  for(let i=0;i<3;i++)g.fire();
  assert.equal(g.e('waveNo').textContent,'1');
  assert.equal(g.e('end').dataset.outcome,'','Final reward MOVE comes before victory');
  g.move('180',1);
  assert.equal(g.e('end').dataset.outcome,'victory');
  assert.match(g.e('endText').textContent,/All 1 levels completed/);
});
