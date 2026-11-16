/* Run: node --test tests/rewards.test.cjs */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const rewardsCode = fs.readFileSync(path.join(root,'rewards.js'),'utf8');
const artCode = fs.readFileSync(path.join(root,'pass-a-art.js'),'utf8');
const juiceCode = fs.readFileSync(path.join(root,'pass-b-juice.js'),'utf8');
const difficultyCode = fs.readFileSync(path.join(root,'difficulty.js'),'utf8');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const game = html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(game,'Expected main script');

function rewards(){
  const context = {window:{}};
  vm.runInNewContext(rewardsCode,context);
  return context.window.BloopRewards;
}
function d(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
test('enemy placement always creates 3–7 reachable, spaced targets even in corners',()=>{
  const R=rewards();
  for(const ship of [
    {x:500,y:325},{x:35,y:35},{x:965,y:615},{x:35,y:325},
    {x:500,y:35},{x:965,y:35},{x:35,y:615}
  ]){
    for(const count of [3,4,5,6,7]){
      const pts=R.spawnPositions(ship,count,()=>.5);
      assert.equal(pts.length,count);
      for(let i=0;i<pts.length;i++){
        assert.ok(d(pts[i],ship)<=350,'Every enemy must begin within 7 units');
        assert.ok(d(pts[i],ship)>=180,'Enemies should not spawn touching the ship');
        assert.ok(pts[i].x>=65&&pts[i].x<=935&&pts[i].y>=65&&pts[i].y<=585);
        for(let j=0;j<i;j++)assert.ok(d(pts[i],pts[j])>=65,'Enemies must not overlap');
      }
    }
  }
});

test('nearest silly catches up only when all enemies are out of firing range',()=>{
  const R=rewards(),ship={x:500,y:325};
  const near={x:600,y:325},far={x:950,y:325};
  const all=[near,far];
  assert.equal(R.bringNearestIntoRange(ship,all),null);
  assert.equal(near.x,600);
  const e1={x:900,y:325,motion:{from:{x:870,y:325},to:{x:900,y:325}}},
    e2={x:950,y:400};
  const adjusted=R.bringNearestIntoRange(ship,[e1,e2]);
  assert.equal(adjusted,e1);
  assert.ok(d(e1,ship)<=350,'Nearest target should end within accurate shot range');
  assert.equal(e1.motion.from.x,870,'Animation should keep its original starting position');
  assert.equal(e1.motion.to.x,e1.x,'Animation end should follow new location');
  assert.equal(e2.x,950,'Other enemies keep ordinary level speed');
});

test('star buoy floats within next MOVE reach, and sailing through collects +2',()=>{
  const R=rewards(),ship={x:500,y:325},enemy={x:500,y:20};
  const pickup=R.pickupFromPop(ship,enemy,1000,0,1);
  assert.equal(pickup.from.y,20,'Reward starts at defeated enemy');
  assert.ok(d(ship,pickup)<=175,'Reward settles inside the next MOVE reach');
  const through=R.collectOnMove([pickup],ship,{x:500,y:125},1);
  assert.equal(through.collected.length,1);
  assert.equal(through.bonus,2);
  assert.equal(through.remaining.length,0);
  assert.ok(R.routeFraction(pickup,ship,{x:500,y:125})>0,
    'Collection animation remains visible until the route reaches the star');
  const away=R.collectOnMove([pickup],ship,{x:700,y:325},1);
  assert.equal(away.bonus,0);
  assert.equal(away.remaining.length,1);
  assert.equal(R.collectOnMove([pickup],ship,{x:700,y:325},4).remaining.length,1);
  assert.equal(R.collectOnMove([pickup],ship,{x:700,y:325},5).remaining.length,0);
  assert.ok(R.distanceToSegment({x:500,y:165},ship,{x:500,y:125})<R.PICKUP_RADIUS,
    'Collection near the sailing line is forgiving');
});

function harness({lastLevel=false}={}){
  const elements=new Map(),events=new Map();
  const gradient={addColorStop(){}};
  let t=20000,seed=0,paintOps=0;
  const random=Math.create?Math:null;
  const fakeMath=Object.create(Math);
  const seq=[.6,.5,0,0];
  fakeMath.random=()=>seq[seed++%seq.length];
  const canvas=new Proxy({}, {
    get(_target,p){
      if(p==='createLinearGradient'||p==='createRadialGradient')return()=>gradient;
      if(p==='globalAlpha')return 1;
      return()=>{paintOps++;};
    },set(){return true;}
  });
  function el(id){
    if(elements.has(id))return elements.get(id);
    const classes=new Set();
    const node={
      value:'',textContent:'',dataset:{},firstChild:{textContent:''},disabled:false,
      classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),
        toggle:(x,on)=>on?classes.add(x):classes.delete(x),
        contains:x=>classes.has(x)},
      getContext:()=>canvas,addEventListener:(key,fn)=>events.set(id+':'+key,fn),
      setAttribute(){},setPointerCapture(){},showModal(){},close(){},focus(){},
      getBoundingClientRect:()=>({left:0,top:0,width:1000,height:650})
    };
    elements.set(id,node);return node;
  }
  const win={matchMedia:()=>({matches:true})};
  const sandbox=vm.createContext({
    window:win,document:{getElementById:el},Math:fakeMath,
    performance:{now:()=>t},requestAnimationFrame(){}
  });
  vm.runInContext(artCode,sandbox);
  vm.runInContext(juiceCode,sandbox);
  vm.runInContext(difficultyCode,sandbox);
  vm.runInContext(rewardsCode,sandbox);
  sandbox.BloopArt=win.BloopArt;
  sandbox.BloopJuice=win.BloopJuice;
  if(lastLevel)win.BloopDifficulty={...win.BloopDifficulty,maxLevel:1};
  // Test-only world access, never bundled in the production game.
  const anchor='start();if(!reducedMotion)requestAnimationFrame(frame);})();';
  assert.ok(game[1].includes(anchor));
  const source=game[1].replace(anchor,
    "window.__world={"+
    "setEnemies(list){enemies=list.map((item,i)=>({x:item.x,y:item.y,hp:item.hp||1,maxHp:item.hp||1,type:0,bob:0,mood:'curious',bornAt:0}));},"+
    "enemies(){return enemies.map(e=>({x:e.x,y:e.y,hp:e.hp}));},"+
    "pickups(){return pickups.map(p=>({...p}));},"+
    "ship(){return {...ship};},"+
    "};"+anchor);
  vm.runInContext(source,sandbox);
  function click(id){
    const n=el(id),fn=events.get(id+':click')||n.onclick;
    assert.equal(typeof fn,'function','Missing click listener '+id);
    fn();
  }
  function order(bearing,distance){
    el('bearing').value=bearing;el('distance').value=distance;click('actionBtn');
  }
  return {win,el,order,click,paintOps:()=>paintOps};
}

test('popping awards one point and star; a subsequent MOVE collects +2',()=>{
  const g=harness(),s=g.win.__world;
  s.setEnemies([{x:500,y:105},{x:710,y:300},{x:780,y:450}]);
  g.order('000',5);
  assert.equal(g.el('score').textContent,1);
  assert.equal(g.el('pickupCount').textContent,1,'Star should appear after a pop');
  assert.equal(s.pickups().length,1);
  assert.equal(g.el('phaseHeading').textContent,'⛵ MOVE PHASE');
  // This invalid MOVE should not collect a reward or consume a turn.
  g.order('000',6);
  assert.equal(g.el('score').textContent,1);
  assert.equal(g.el('pickupCount').textContent,1);
  assert.equal(g.el('turn').textContent,2);
  g.order('000',3);
  assert.equal(g.el('score').textContent,3,'+1 pop plus +2 star');
  assert.equal(g.el('pickupCount').textContent,0);
  assert.match(g.el('log').textContent,/Collected 1 bonus star/);
  assert.equal(g.el('phaseHeading').textContent,'🫧 FIRE PHASE');
  g.click('resetBtn');
  assert.equal(g.el('score').textContent,0);
  assert.equal(g.el('pickupCount').textContent,0);
});

test('cracking a two-hit helmet does not drop a star or award points',()=>{
  const g=harness(),s=g.win.__world;
  s.setEnemies([{x:500,y:105,hp:2},{x:720,y:280}]);
  g.order('000',5);
  assert.equal(g.el('score').textContent,0);
  assert.equal(g.el('pickupCount').textContent,0);
  assert.equal(s.enemies()[0].hp,1);
  g.order('180',1);
  g.order('000',6);
  assert.equal(g.el('score').textContent,1);
  assert.equal(g.el('pickupCount').textContent,1);
});

test('after a long MOVE the closest enemy becomes targetable on the next FIRE',()=>{
  const g=harness(),s=g.win.__world;
  s.setEnemies([{x:500,y:75},{x:650,y:75}]);
  g.order('180',1); // Miss; enemies approach, MOVE becomes available.
  g.order('180',5); // Sail away, potentially out of range.
  assert.equal(g.el('phaseHeading').textContent,'🫧 FIRE PHASE');
  const ship=s.ship(),enemies=s.enemies();
  assert.ok(enemies.some(e=>d(e,ship)<=380),'There must always be a target in range');
  assert.match(g.el('log').textContent,/caught the current/);
  assert.equal(g.el('turn').textContent,3);
});

test('last pop gives a final MOVE chance to collect the star before victory',()=>{
  const g=harness({lastLevel:true}),s=g.win.__world;
  s.setEnemies([{x:500,y:105}]);
  g.order('000',5);
  assert.equal(g.el('score').textContent,1);
  assert.equal(g.el('pickupCount').textContent,1);
  assert.equal(g.el('end').dataset.outcome,'','Victory must not block final pickup');
  assert.match(g.el('phaseHeading').textContent,/MOVE/);
  g.order('000',3);
  assert.equal(g.el('score').textContent,3);
  assert.equal(g.el('pickupCount').textContent,0);
  assert.equal(g.el('end').dataset.outcome,'victory');
  assert.match(g.el('endText').textContent,/popped 1 sea silly and earned 3 points/);
});
