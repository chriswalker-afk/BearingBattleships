/* Run: node --test tests/scene-zoom.test.cjs */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const gameplay=html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(gameplay,'Expected inline gameplay');
const files={
  zoom:fs.readFileSync(path.join(root,'scene-zoom.js'),'utf8'),
  art:fs.readFileSync(path.join(root,'pass-a-art.js'),'utf8'),
  juice:fs.readFileSync(path.join(root,'pass-b-juice.js'),'utf8'),
  difficulty:fs.readFileSync(path.join(root,'difficulty.js'),'utf8'),
  rewards:fs.readFileSync(path.join(root,'rewards.js'),'utf8'),
  squid:fs.readFileSync(path.join(root,'squid-strike.js'),'utf8')
};
const close=(a,b,description)=>assert.ok(Math.abs(a-b)<.03,description+': '+a+' vs '+b);

function moduleOnly(){
  const box={window:{}};
  vm.runInNewContext(files.zoom,box);
  return box.window.BloopZoom;
}

test('zoom settings are clamped to five stable levels',()=>{
  const camera=moduleOnly();
  assert.deepEqual(Array.from(camera.levels),[1,1.25,1.5,1.75,2]);
  assert.equal(camera.normalise(100),2);
  assert.equal(camera.normalise(-10),1);
  assert.equal(camera.normalise(1.36),1.25);
  assert.equal(camera.normalise(NaN),1);
});
test('camera follows ship but never shows the void beyond map boundaries',()=>{
  const Z=moduleOnly(),w=1000,h=650;
  for(const zoom of Z.levels){
    for(const boat of [
      {x:500,y:325},{x:35,y:35},{x:965,y:615},
      {x:35,y:615},{x:965,y:35},{x:750,y:487.5}
    ]){
      const c=Z.cameraFor(boat,zoom,w,h);
      const halfW=w/(2*zoom),halfH=h/(2*zoom);
      assert.ok(c.x>=halfW-1e-6&&c.x<=w-halfW+1e-6);
      assert.ok(c.y>=halfH-1e-6&&c.y<=h-halfH+1e-6);
      if(zoom===1){close(c.x,500,'Full view centre x');close(c.y,325,'Full view centre y');}
    }
  }
});
test('canvas-to-world inverse is exact at every zoom and camera position',()=>{
  const Z=moduleOnly(),pts=[
    {x:0,y:0},{x:500,y:325},{x:1000,y:650},
    {x:333.5,y:477.3},{x:750,y:155}
  ];
  for(const zoom of Z.levels){
    for(const ship of [{x:500,y:325},{x:35,y:35},{x:965,y:615}]){
      const camera=Z.cameraFor(ship,zoom,1000,650);
      for(const p of pts){
        const screen=Z.worldToCanvas(p,camera,zoom,1000,650);
        const back=Z.canvasToWorld(screen,camera,zoom,1000,650);
        close(back.x,p.x,'Inverse x at '+zoom);
        close(back.y,p.y,'Inverse y at '+zoom);
      }
    }
  }
});
test('zoom is exposed as accessible + and − controls beside the sea',()=>{
  for(const id of ['zoomInBtn','zoomOutBtn','zoomResetBtn','zoomAnnouncement']){
    assert.equal(html.split('id="'+id+'"').length-1,1,'Exactly one '+id);
  }
  assert.match(html,/scene-zoom\.css/);
  assert.match(html,/scene-zoom\.js/);
  assert.match(html,/aria-label="Sea scene zoom"/);
  assert.match(html,/1 square = 1 unit/);
});

function harness({rect={left:0,top:0,width:1000,height:650},reduced=true}={}){
  const elems=new Map(),listeners=new Map(),colors={addColorStop(){}};
  let clock=20000,frame=null,paints=0,seed=0;
  const rng=[.6,.5,0,0],m=Object.create(Math);
  m.random=()=>rng[seed++%rng.length];
  const c=new Proxy({}, {
    get(_t,k){
      if(k==='createLinearGradient'||k==='createRadialGradient')return()=>colors;
      if(k==='globalAlpha')return 1;
      return()=>{paints++;};
    },set(){return true;}
  });
  function el(id){
    if(elems.has(id))return elems.get(id);
    const classes=new Set();
    const node={textContent:'',value:'',disabled:false,dataset:{},
      firstChild:{textContent:''},classList:{
        add:x=>classes.add(x),remove:x=>classes.delete(x),
        contains:x=>classes.has(x),
        toggle:(x,on)=>on?classes.add(x):classes.delete(x)
      },attrs:{},
      setAttribute(k,v){this.attrs[k]=v;},
      getContext:()=>c,
      getBoundingClientRect:()=>rect,
      addEventListener:(kind,cb)=>listeners.set(id+':'+kind,cb),
      setPointerCapture(){},focus(){},showModal(){},close(){}
    };
    elems.set(id,node);return node;
  }
  const win={matchMedia:()=>({matches:reduced})};
  const box=vm.createContext({
    window:win,document:{getElementById:el},Math:m,
    performance:{now:()=>clock},requestAnimationFrame:fn=>{frame=fn;}
  });
  for(const type of ['zoom','art','juice','difficulty','rewards','squid'])
    vm.runInContext(files[type],box);
  box.BloopArt=win.BloopArt;box.BloopJuice=win.BloopJuice;
  const anchor='start();if(!reducedMotion)requestAnimationFrame(frame);})();';
  assert.ok(gameplay[1].includes(anchor));
  const hook="window.__zoomProbe={"+
    "level(){return sceneZoom;},"+
    "camera(){return {...sceneCamera};},"+
    "ship(){return {...ship};},"+
    "setShip(x,y){ship.x=x;ship.y=y;draw();},"+
    "ruler(){return {...ruler};},"+
    "pro(){return {...pro};},"+
    "setEnemies(list){enemies=list.map(e=>({x:e.x,y:e.y,hp:1,maxHp:1,type:0,bob:0,mood:'curious',bornAt:0}));draw();}"+
    "};";
  vm.runInContext(gameplay[1].replace(anchor,hook+anchor),box);
  function click(id){
    const node=el(id),handler=listeners.get(id+':click')||node.onclick;
    assert.equal(typeof handler,'function','Missing handler for '+id);
    if(node.disabled)return;
    handler();
  }
  function screen(p){
    const camera=win.__zoomProbe.camera(),zoom=win.__zoomProbe.level();
    return win.BloopZoom.worldToCanvas(p,camera,zoom,1000,650);
  }
  function pointer(name,worldPoint){
    const px=screen(worldPoint),event=listeners.get('board:'+name);
    assert.equal(typeof event,'function',name+' handler');
    let prevented=false;
    event({clientX:rect.left+px.x*rect.width/1000,
      clientY:rect.top+px.y*rect.height/650,pointerId:2,
      preventDefault(){prevented=true;}});
    return prevented;
  }
  function order(bearing,distance){
    el('bearing').value=bearing;el('distance').value=String(distance);click('actionBtn');
  }
  function tick(ms){clock+=ms;if(frame)frame(clock);}
  return {click,pointer,order,tick,e:el,win,probe:win.__zoomProbe,paints:()=>paints};
}

test('plus/minus/reset controls never consume a turn or alter the maths',()=>{
  const g=harness();
  assert.equal(g.probe.level(),1);
  assert.equal(g.e('zoomOutBtn').disabled,true);
  assert.equal(g.e('zoomResetBtn').textContent,'100%');
  const firstTurn=g.e('turn').textContent;
  for(const expectValue of [1.25,1.5,1.75,2]){
    g.click('zoomInBtn');
    close(g.probe.level(),expectValue,'Zoom step');
  }
  assert.equal(g.e('zoomInBtn').disabled,true);
  g.click('zoomInBtn');
  close(g.probe.level(),2,'Do not exceed 200%');
  assert.equal(g.e('zoomResetBtn').textContent,'200%');
  assert.match(g.e('zoomAnnouncement').textContent,/200 percent/);
  g.click('zoomOutBtn');
  close(g.probe.level(),1.75,'Zoom out step');
  g.click('zoomResetBtn');
  close(g.probe.level(),1,'Reset zoom to fit all');
  assert.equal(g.e('zoomOutBtn').disabled,true);
  assert.equal(g.e('turn').textContent,firstTurn,'Zoom is not a move turn');
  assert.equal(g.e('score').textContent,0);
  assert.equal(g.e('hearts').textContent,'♥♥♥');
});

test('the ship stays visible and camera tracks/clamps near sea edges',()=>{
  const g=harness();const Z=g.win.BloopZoom;
  for(let i=0;i<4;i++)g.click('zoomInBtn');
  const target={x:935,y:585};
  g.probe.setShip(target.x,target.y);
  const camera=g.probe.camera();
  close(camera.x,750,'Camera clamped at x=750');
  close(camera.y,487.5,'Camera clamped at y=487.5');
  const screen=Z.worldToCanvas(target,camera,2,1000,650);
  assert.ok(screen.x>0&&screen.x<1000&&screen.y>0&&screen.y<650);
});

test('a physical ruler at the ship can rotate at 200% with the near-end grip',()=>{
  const g=harness({rect:{left:15,top:30,width:500,height:325}});
  const pivot={x:320,y:560},ship={x:500,y:325};
  assert.equal(g.pointer('pointerdown',pivot),true,'Ruler zero grabbed');
  g.pointer('pointermove',ship);
  g.pointer('pointerup',ship);
  close(g.probe.ruler().x,500,'Ruler zero x');
  close(g.probe.ruler().y,325,'Ruler zero y');
  for(let i=0;i<4;i++)g.click('zoomInBtn');
  const grip={x:ship.x+65,y:ship.y-38};
  const screen=g.win.BloopZoom.worldToCanvas(grip,g.probe.camera(),2,1000,650);
  assert.ok(screen.x>0&&screen.x<1000&&screen.y>0&&screen.y<650,'Near grip visible at 200%');
  assert.equal(g.pointer('pointerdown',grip),true,'Near grip hit area');
  const a=Math.PI/4;
  const rotated={
    x:ship.x+65*Math.cos(a)+38*Math.sin(a),
    y:ship.y+65*Math.sin(a)-38*Math.cos(a)
  };
  g.pointer('pointermove',rotated);g.pointer('pointerup',rotated);
  close(g.probe.ruler().a,a,'Near-grip rotation remains geometrically accurate');
  close(g.probe.ruler().x,500,'Zero remains fixed after rotation');
  close(g.probe.ruler().y,325,'Zero remains fixed after rotation');
});

test('protractor drag remains accurate at 150% and new game resets the camera',()=>{
  const g=harness();
  g.click('zoomInBtn');g.click('zoomInBtn');
  const p={x:410,y:325};
  assert.equal(g.pointer('pointerdown',p),true,'Protractor body selected');
  const next={x:445,y:350};
  g.pointer('pointermove',next);g.pointer('pointerup',next);
  close(g.probe.pro().x,535,'Protractor shifted +35 x');
  close(g.probe.pro().y,350,'Protractor shifted +25 y');
  g.click('resetBtn');
  close(g.probe.level(),1,'Restart restores 100%');
  close(g.probe.pro().x,500,'Restart centre x');
  close(g.probe.pro().y,325,'Restart centre y');
});

test('zooming does not change successful firing bearings or hitboxes',()=>{
  for(const zoomed of [false,true]){
    const g=harness();
    g.probe.setEnemies([{x:500,y:105},{x:720,y:205}]);
    if(zoomed)for(let i=0;i<4;i++)g.click('zoomInBtn');
    g.order('000',5);
    assert.equal(g.e('score').textContent,1,'North target hit with '+(zoomed?'200%':'100%'));
    assert.equal(g.e('turn').textContent,2);
  }
});

test('during sailing camera follows the animated ship instead of jumping to destination',()=>{
  const g=harness({reduced:false});
  g.click('zoomInBtn');g.click('zoomInBtn');g.click('zoomInBtn');g.click('zoomInBtn');
  g.order('180',1); // Miss: next turn is MOVE after animation.
  g.tick(2500);
  assert.match(g.e('phaseHeading').textContent,/MOVE/);
  const initial=g.probe.camera().x;
  g.order('090',3);
  close(g.probe.camera().x,initial,'Camera starts from old ship during sail');
  g.tick(375);
  const mid=g.probe.camera().x;
  assert.ok(mid>initial+15&&mid<initial+135,'Camera moves smoothly with ship');
  g.tick(450);
  close(g.probe.camera().x,initial+150,'Camera arrives at destination');
});
