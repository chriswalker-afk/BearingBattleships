/* Run: node --test tests/maze-voyage.test.cjs */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const main=html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(main,'Expected gameplay script');
const files={
  maze:fs.readFileSync(path.join(root,'maze-voyage.js'),'utf8'),
  art:fs.readFileSync(path.join(root,'pass-a-art.js'),'utf8'),
  juice:fs.readFileSync(path.join(root,'pass-b-juice.js'),'utf8'),
  difficulty:fs.readFileSync(path.join(root,'difficulty.js'),'utf8'),
  rewards:fs.readFileSync(path.join(root,'rewards.js'),'utf8'),
  squid:fs.readFileSync(path.join(root,'squid-strike.js'),'utf8'),
  zoom:fs.readFileSync(path.join(root,'scene-zoom.js'),'utf8')
};
function pure(){
  const c={window:{}};vm.runInNewContext(files.maze,c);
  return c.window.BloopMaze;
}
const approx=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<.05,label+': '+actual+' ≠ '+expected);
test('eight unique environments run from water to lagoon to an actual space finale',()=>{
  const M=pure();
  assert.equal(M.maxLevel,8);
  assert.equal(M.levels[0].theme,'water');
  assert.equal(M.levels[1].theme,'lagoon');
  assert.equal(M.levels.at(-1).theme,'space');
  assert.equal(new Set(M.levels.map(l=>l.theme)).size,8);
  assert.equal(M.validate(),true);
  assert.ok(M.get(8).count>M.get(1).count);
  assert.ok(M.get(8).route.length>M.get(1).route.length);
  assert.ok(M.get(8).width<M.get(1).width);
  assert.throws(()=>M.get(9),/Unknown maze level/);
});
test('each maze has a complete route composed of legal whole-unit moves',()=>{
  const M=pure();
  for(const map of M.levels){
    assert.ok(M.inChannel(map,map.start));
    assert.ok(M.inChannel(map,map.exit));
    let p=map.start;
    for(const b of map.route.slice(1)){
      const dx=b.x-p.x,dy=b.y-p.y;
      const leg=Math.abs(dx||dy),unit=(dx?Math.sign(dx):Math.sign(dy));
      assert.equal(leg%50,0);
      const pieces=leg/50;
      for(let j=0;j<pieces;j+=5){
        const step=Math.min(5,pieces-j)*50;
        const next={x:p.x+(dx?unit*step:0),y:p.y+(dy?unit*step:0)};
        assert.equal(M.moveClear(map,p,next),true,
          map.name+' blocked an intended path '+JSON.stringify(p)+' → '+JSON.stringify(next));
        p=next;
      }
    }
    assert.equal(M.isExit(map,p),true);
  }
});
test('crossing solid banks, reefs and asteroids is blocked, including shots',()=>{
  const M=pure(),map=M.get(1),a=map.start;
  assert.equal(M.moveClear(map,a,{x:150,y:500}),false);
  assert.equal(M.moveClear(map,a,{x:300,y:350}),true);
  assert.equal(M.visibleRay(map,a,{x:150,y:150}).blocked,true);
  assert.ok(M.visibleRay(map,a,{x:150,y:150}).length<200);
  assert.equal(M.visibleRay(map,a,{x:300,y:350}).blocked,false);
  const space=M.get(8);
  assert.equal(M.moveClear(space,space.start,{x:150,y:250}),false);
});
test('guard spawns stay on the route and patrols do not cross solid scenery',()=>{
  const M=pure();
  for(const map of M.levels){
    const guards=M.enemySpawns(map);
    assert.equal(guards.length,map.count);
    assert.ok(guards[0].progress<=150,'First guard appears within firing reach');
    for(const p of guards){
      assert.ok(M.inChannel(map,p,28),map.name+' guard outside channel');
      const enemy={...p,pathProgress:p.progress};
      const old={x:enemy.x,y:enemy.y};
      M.advanceEnemy(map,enemy,map.start);
      assert.ok(M.inChannel(map,enemy,28),'Guardian swam through a bank');
      assert.ok(Math.hypot(enemy.x-old.x,enemy.y-old.y)<=map.speed+.001);
    }
  }
});
test('portal exists but requires reaching it AND defeating every guard',()=>{
  const M=pure(),m=M.get(1);
  assert.equal(M.isExit(m,m.start),false);
  assert.equal(M.isExit(m,m.exit),true);
  assert.equal(M.isExit(m,{x:m.exit.x-200,y:m.exit.y}),false);
  for(const map of M.levels){
    const ops=[];
    const ctx=new Proxy({},{
      get(_t,k){
        if(k==='createLinearGradient'||k==='createRadialGradient')return()=>({addColorStop(){}});
        if(k==='globalAlpha')return 1;
        return (...args)=>{ops.push([k,...args]);};
      },set(){return true;}
    });
    M.draw(ctx,map,0);
    M.drawPortal(ctx,map,false,0);
    M.drawPortal(ctx,map,true,1000);
    if(map.theme==='space')M.drawSpaceAura(ctx,map.start,1000);
    assert.ok(ops.some(op=>op[0]==='stroke'));
    assert.ok(ops.some(op=>op[0]==='fillText'));
  }
});
function harness({reduced=true}={}){
  const listeners=new Map(),nodes=new Map(),gradient={addColorStop(){}};
  let now=20000,raf=null,paints=0,seed=0;
  const fakeMath=Object.create(Math),rng=[.6,.5,0,0];
  fakeMath.random=()=>rng[seed++%rng.length];
  const ctx=new Proxy({},{
    get(_t,k){
      if(k==='createLinearGradient'||k==='createRadialGradient')return()=>gradient;
      if(k==='globalAlpha')return 1;
      return()=>{paints++;};
    },set(){return true;}
  });
  function node(id){
    if(nodes.has(id))return nodes.get(id);
    const classes=new Set();
    const item={
      textContent:'',value:'',firstChild:{textContent:''},dataset:{},
      hidden:false,disabled:false,attributes:{},
      classList:{
        add:x=>classes.add(x),remove:x=>classes.delete(x),
        toggle:(x,b)=>b?classes.add(x):classes.delete(x),
        contains:x=>classes.has(x)
      },
      addEventListener:(kind,handler)=>listeners.set(id+':'+kind,handler),
      setAttribute(k,v){this.attributes[k]=v;},
      getContext:()=>ctx,showModal(){},close(){},focus(){},
      getBoundingClientRect:()=>({left:0,top:0,width:1000,height:650}),
      setPointerCapture(){}
    };
    nodes.set(id,item);return item;
  }
  const win={matchMedia:()=>({matches:reduced})};
  const box=vm.createContext({
    window:win,document:{getElementById:node},Math:fakeMath,
    performance:{now:()=>now},requestAnimationFrame:fn=>{raf=fn;}
  });
  for(const kind of ['zoom','maze','art','juice','difficulty','rewards','squid'])
    vm.runInContext(files[kind],box);
  box.BloopArt=win.BloopArt;box.BloopJuice=win.BloopJuice;
  const anchor='start();if(!reducedMotion)requestAnimationFrame(frame);})();';
  assert.ok(main[1].includes(anchor));
  const hook="window.__mazeTest={"+
    "mode(){return gameMode;},"+
    "map(){return mazeMap;},"+
    "level(){return waveNo;},"+
    "ship(){return {...ship};},"+
    "guards(){return enemies.map(e=>({...e}));},"+
    "setGuards(list){enemies=list.map((e,i)=>({x:e.x,y:e.y,"+
      "pathProgress:e.progress,hp:e.hp||1,maxHp:e.hp||1,"+
      "type:0,bob:0,mood:'curious',bornAt:0}));refresh();},"+
    "clearGuards(){enemies=[];refresh();},"+
    "setShip(x,y){ship={...ship,x,y};draw();},"+
    "forceMove(){updateMode('move');announcePhase();},"+
    "startLevel(n){enterMazeLevel(n);updateMode('fire');announcePhase();}"+
    "};";
  vm.runInContext(main[1].replace(anchor,hook+anchor),box);
  function click(id){
    const n=node(id);const listener=listeners.get(id+':click')||n.onclick;
    assert.equal(typeof listener,'function','Missing click handler: '+id);
    listener();
  }
  function order(bearing,distance){
    node('bearing').value=bearing;node('distance').value=String(distance);click('actionBtn');
  }
  function tick(ms){now+=ms;if(raf)raf(now);}
  return {win,node,click,order,tick,paints:()=>paints,probe:win.__mazeTest};
}
test('Maze Voyage is selectable; switching returns to independent fresh Open Sea game',()=>{
  const g=harness();
  assert.equal(g.probe.mode(),'sea');
  assert.equal(g.node('levelMax').textContent,12);
  assert.equal(g.node('mazeObjective').hidden,true);
  g.click('mazeModeBtn');
  assert.equal(g.probe.mode(),'maze');
  assert.equal(g.node('levelMax').textContent,8);
  assert.equal(g.node('waveNo').textContent,'1');
  assert.equal(g.node('mazeObjective').hidden,false);
  assert.match(g.node('mazeObjective').textContent,/guardians? left/);
  assert.equal(g.node('mazeModeBtn').attributes['aria-pressed'],'true');
  g.click('openSeaModeBtn');
  assert.equal(g.probe.mode(),'sea');
  assert.equal(g.node('levelMax').textContent,12);
  assert.equal(g.node('mazeObjective').hidden,true);
  assert.equal(g.node('turn').textContent,1);
});
test('colliding with a maze wall shows a warning and does not use the MOVE turn',()=>{
  const g=harness();g.click('mazeModeBtn');
  g.order('180',1); // Miss into broad water; next turn MOVE.
  assert.match(g.node('phaseHeading').textContent,/MOVE/);
  const before=g.node('turn').textContent;
  g.order('180',3); // Directly across natural bank to the south.
  assert.equal(g.node('turn').textContent,before);
  assert.match(g.node('errorPopTitle').textContent,/Channel blocked/);
  assert.match(g.node('log').textContent,/No turn used/);
  assert.match(g.node('phaseHeading').textContent,/MOVE/);
  g.order('090',2);
  assert.equal(g.node('turn').textContent,3);
  const ship=g.probe.ship();
  approx(ship.x,250,'Ship sailed inside corridor x');
  approx(ship.y,350,'Ship sailed inside corridor y');
});
test('bubbles hit a guardian in clear water but cannot pass through solid terrain',()=>{
  const g=harness();g.click('mazeModeBtn');
  g.probe.setGuards([{x:150,y:150,progress:600}]);
  g.order('000',5);
  assert.equal(g.node('score').textContent,0);
  assert.equal(g.probe.guards().length,1);
  assert.match(g.node('log').textContent,/solid bank/);
  const h=harness();h.click('mazeModeBtn');
  h.probe.setGuards([{x:300,y:350,progress:150}]);
  h.order('090',3);
  assert.equal(h.node('score').textContent,1);
  assert.equal(h.probe.guards().length,0);
  assert.match(h.node('mazeObjective').textContent,/EXIT UNLOCKED/);
  assert.match(h.node('phaseHeading').textContent,/MOVE/);
});
test('reaching a portal without defeating guards leaves the maze level locked',()=>{
  const g=harness();g.click('mazeModeBtn');
  const exit=g.probe.map().exit;
  g.probe.setShip(exit.x-50,exit.y);
  g.probe.forceMove();
  g.order('090',1);
  assert.equal(g.probe.level(),1);
  assert.match(g.node('log').textContent,/Portal locked/);
  assert.ok(g.probe.guards().length>0);
});
test('all eight mazes can be traversed in whole-unit MOVE turns; final portal wins in space',()=>{
  const g=harness();g.click('mazeModeBtn');
  const M=g.win.BloopMaze;
  let moves=0;
  for(let stage=1;stage<=8;stage++){
    assert.equal(g.probe.level(),stage,'Arrived at expected maze level');
    const map=g.probe.map();
    g.probe.clearGuards();
    g.probe.forceMove(); // Test-only: simulates that combat was completed.
    let current=map.start;
    for(const b of map.route.slice(1)){
      const dx=b.x-current.x,dy=b.y-current.y;
      const direction=dx>0?'090':dx<0?'270':dy>0?'180':'000';
      const remaining=Math.abs(dx||dy)/50;
      for(let steps=0;steps<remaining;steps+=5){
        const length=Math.min(5,remaining-steps);
        g.order(direction,length);
        moves++;
      }
      current=b;
    }
    if(stage<8){
      assert.equal(g.probe.level(),stage+1,'Whirlpool must load the next maze');
      assert.equal(String(g.node('waveNo').textContent),String(stage+1));
      assert.match(g.node('phaseHeading').textContent,/FIRE/);
      assert.equal(g.node('hearts').textContent,'♥♥♥');
    }else{
      assert.equal(g.node('end').dataset.outcome,'victory');
      assert.match(g.node('endText').textContent,/8 maze portals reached/);
      assert.match(g.node('endTitle').textContent,/Astral maze escape/);
    }
  }
  assert.ok(moves>=40,'Maze journey involves many bearing-and-distance decisions');
});
test('maze guardians stay alive after bumping the ship: only popping unlocks the exit',()=>{
  const g=harness();g.click('mazeModeBtn');
  g.probe.setGuards([{x:185,y:350,progress:35}]);
  g.order('180',1);
  assert.equal(g.node('hearts').textContent,'♥♥♡');
  assert.equal(g.probe.guards().length,1,'The bumped guard retreats rather than unlocking the exit');
  assert.match(g.node('mazeObjective').textContent,/guardian left/);
});
test('the astral finale has space artwork and zoom still changes only the view',()=>{
  const g=harness();g.click('mazeModeBtn');
  g.probe.startLevel(8);
  assert.equal(g.probe.map().theme,'space');
  assert.match(g.node('levelRule').textContent,/Astral/);
  const before=g.probe.ship();
  const turns=g.node('turn').textContent;
  g.click('zoomInBtn');g.click('zoomInBtn');
  assert.equal(g.node('zoomResetBtn').textContent,'150%');
  assert.deepEqual(g.probe.ship(),before);
  assert.equal(g.node('turn').textContent,turns);
  assert.ok(g.paints()>150,'Space terrain, warp portal and ship halo drawn');
});
