/* Run: node --test tests/squid-strike.test.cjs */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const game=html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(game,'Inline script found');
const sources={
  art:fs.readFileSync(path.join(root,'pass-a-art.js'),'utf8'),
  juice:fs.readFileSync(path.join(root,'pass-b-juice.js'),'utf8'),
  rewards:fs.readFileSync(path.join(root,'rewards.js'),'utf8'),
  difficulty:fs.readFileSync(path.join(root,'difficulty.js'),'utf8'),
  squid:fs.readFileSync(path.join(root,'squid-strike.js'),'utf8')
};
function pure(){
  const box={window:{}};vm.runInNewContext(sources.squid,box);
  return box.window.BloopSquid;
}
test('Level 10 introduces only the squid hazard',()=>{
  const box={window:{}};vm.runInNewContext(sources.difficulty,box);
  const p=box.window.BloopDifficulty;
  assert.equal(p.get(9).hazard,false);
  assert.equal(p.get(10).hazard,true);
  assert.equal(p.get(10).kind,'hazard');
  assert.equal(p.get(10).armoured,2);
  assert.equal(p.get(11).kind,'count');
  assert.equal(p.get(12).kind,'speed');
  for(let l=2;l<=12;l++)
    assert.equal(['count','speed','armoured','hazard'].filter(k=>p.get(l)[k]!==p.get(l-1)[k]).length,1);
});
test('no squid at Levels 1–9 and no hazard on a final reward-only MOVE',()=>{
  const q=pure(),ship={x:500,y:325};
  for(let level=1;level<10;level++)
    assert.equal(q.planMove({level,ship,random:()=>0}).zone,null);
  assert.equal(q.planMove({level:12,ship,allow:false,random:()=>0}).zone,null);
});
test('the first warning is guaranteed; two hazard-free MOVE turns follow',()=>{
  const q=pure(),ship={x:500,y:325};
  const first=q.planMove({level:10,ship,random:()=>.5});
  assert.ok(first.zone);assert.equal(first.cooldown,2);
  const second=q.planMove({level:10,ship,seen:true,cooldown:first.cooldown,random:()=>0});
  assert.equal(second.zone,null);
  const third=q.planMove({level:11,ship,seen:true,cooldown:second.cooldown,random:()=>0});
  assert.equal(third.zone,null);
  assert.ok(q.planMove({level:12,ship,seen:true,cooldown:third.cooldown,random:()=>0}).zone);
  assert.equal(q.planMove({level:12,ship,seen:true,random:()=>.99}).zone,null);
  assert.equal(q.CHANCE,.36);
});
test('the red circle always has a legal escape, even in all corners',()=>{
  const q=pure(),points=[
    {x:500,y:325},{x:35,y:35},{x:965,y:615},{x:35,y:615},
    {x:965,y:35},{x:500,y:35},{x:35,y:325},{x:965,y:325}
  ];
  for(const ship of points)for(const roll of [0,.13,.25,.5,.75,.99]){
    const zone=q.makeZone(ship,()=>roll);
    assert.equal(q.within(ship,zone),true);
    assert.equal(q.hasEscape(ship,zone),true);
  }
});
test('squid checks the final destination and draws a curved tentacle',()=>{
  const q=pure(),zone={x:500,y:325,radius:105};
  assert.equal(q.within({x:500,y:275},zone),true);
  assert.equal(q.within({x:500,y:125},zone),false);
  const calls=[],ctx=new Proxy({},{
    get(_t,prop){if(prop==='globalAlpha')return 1;return (...a)=>calls.push([prop,...a]);},
    set(){return true;}
  });
  q.drawWarning(ctx,zone,20000,true);
  q.drawTentacle(ctx,{zone,at:20000},20000,true);
  assert.ok(calls.some(x=>x[0]==='bezierCurveTo'));
  assert.ok(calls.some(x=>x[0]==='strokeText'));
});
function harness(reduced=true){
  const handlers=new Map(),elements=new Map(),grad={addColorStop(){}};
  let now=20000,raf=null,seed=0,paints=0;
  const ctx=new Proxy({},{
    get(_t,p){
      if(p==='createLinearGradient'||p==='createRadialGradient')return()=>grad;
      if(p==='globalAlpha')return 1;
      return()=>{paints++;};
    },set(){return true}
  });
  function el(id){
    if(elements.has(id))return elements.get(id);
    const set=new Set();
    const n={value:'',textContent:'',dataset:{},firstChild:{textContent:''},
      hidden:false,disabled:false,
      classList:{add:x=>set.add(x),remove:x=>set.delete(x),
        contains:x=>set.has(x),toggle:(x,b)=>b?set.add(x):set.delete(x)},
      addEventListener:(kind,fn)=>handlers.set(id+':'+kind,fn),
      getContext:()=>ctx,setAttribute(){},setPointerCapture(){},
      showModal(){},close(){},focus(){},
      getBoundingClientRect:()=>({left:0,top:0,width:1000,height:650})};
    elements.set(id,n);return n;
  }
  const win={matchMedia:()=>({matches:reduced})};
  const rng=[.6,.5,0,0],m=Object.create(Math);
  m.random=()=>rng[seed++%rng.length];
  const box=vm.createContext({window:win,document:{getElementById:el},Math:m,
    performance:{now:()=>now},requestAnimationFrame:fn=>{raf=fn;}});
  for(const k of ['art','juice','difficulty','rewards','squid'])
    vm.runInContext(sources[k],box);
  box.BloopArt=win.BloopArt;box.BloopJuice=win.BloopJuice;
  const anchor='start();if(!reducedMotion)requestAnimationFrame(frame);})();';
  assert.ok(game[1].includes(anchor));
  const hook="window.__testSquid={"+
    "enter(level,num=2){waveNo=level;enemies=Array.from({length:num},(_,i)=>({"+
    "x:260+i*20,y:170+i*25,hp:1,maxHp:1,type:0,bob:0,mood:'curious',bornAt:0"+
    "}));squidZone=null;squidStrike=null;squidSeen=false;squidCooldown=0;updateMode('fire');refresh();},"+
    "zone(){return squidZone?{...squidZone}:null;},"+
    "strike(){return squidStrike?{...squidStrike}:null;},"+
    "ship(){return {...ship};}};";
  vm.runInContext(game[1].replace(anchor,hook+anchor),box);
  function order(bearing,distance){
    el('bearing').value=bearing;el('distance').value=String(distance);
    const fn=handlers.get('actionBtn:click');assert.equal(typeof fn,'function');fn();
  }
  function step(ms){now+=ms;if(raf)raf(now);}
  return {win,el,order,step,paints:()=>paints};
}
test('warn before MOVE and leave threat in place after invalid bearing or distance',()=>{
  const g=harness(),w=g.win.__testSquid;
  w.enter(10);g.order('180',1);
  assert.ok(w.zone());
  assert.equal(g.el('squidStatus').hidden,false);
  assert.match(g.el('phasePopTitle').textContent,/SQUID STRIKE WARNING/);
  assert.match(g.el('modeInfo').textContent,/Finish OUTSIDE/);
  g.order('45',1);
  assert.equal(g.el('turn').textContent,2);
  assert.ok(w.zone());
  g.order('000',6);
  assert.equal(g.el('turn').textContent,2);
  assert.equal(w.strike(),null);
  assert.equal(g.el('hearts').textContent,'♥♥♥');
});
test('a short MOVE ending inside the ring loses exactly one heart',()=>{
  const g=harness(),w=g.win.__testSquid;
  w.enter(10);g.order('180',1);
  assert.ok(w.zone());g.order('000',1);
  assert.equal(g.el('hearts').textContent,'♥♥♡');
  assert.equal(g.el('turn').textContent,3);
  assert.equal(w.strike().hit,true);
  assert.equal(w.zone(),null);
  assert.match(g.el('log').textContent,/SQUID STRIKE/);
  assert.match(g.el('phaseHeading').textContent,/FIRE/);
});
test('sailing out of the circle avoids damage, even when the route crosses it',()=>{
  const g=harness(),w=g.win.__testSquid;
  w.enter(10);g.order('180',1);
  assert.equal(g.win.BloopSquid.within(w.ship(),w.zone()),true);
  g.order('090',4);
  assert.equal(w.strike().hit,false);
  assert.equal(g.el('hearts').textContent,'♥♥♥');
  assert.match(g.el('log').textContent,/dodged/);
  assert.match(g.el('phaseHeading').textContent,/FIRE/);
});
test('no real hazard during early stages or the final bonus-only MOVE',()=>{
  const early=harness(),a=early.win.__testSquid;
  a.enter(9);early.order('180',1);
  assert.equal(a.zone(),null);
  const end=harness(),b=end.win.__testSquid;
  b.enter(12,0);end.order('180',1);
  assert.equal(b.zone(),null);
});
test('animated warning appears only after the FIRE action has finished',()=>{
  const g=harness(false),w=g.win.__testSquid;
  w.enter(10);g.order('180',1);
  assert.equal(w.zone(),null);
  g.step(2100);
  assert.ok(w.zone());
  assert.equal(g.el('actionBtn').disabled,false);
  const draws=g.paints();
  g.order('090',4);
  g.step(750);
  assert.ok(g.paints()>draws,'Rendering continues during squid strike');
});
