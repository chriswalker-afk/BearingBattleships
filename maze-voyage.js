/* Maze Voyage: eight hand-built, fully navigable bearing mazes.
 * Game positions, exits, enemy patrols, movement and shots all use the same
 * 1000x650 world as Open Sea (50 world px = 1 unit).
 * Maze maps and drawing never provide aim lines or bearing answers.
 */
(function () {
  'use strict';
  const W=1000,H=650,U=50,SHIP_MARGIN=28,PORTAL_RADIUS=46;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const mk=(name,theme,width,route,count,armoured,speed,description,branches=[])=>({
    name,theme,width,route:route.map(([x,y])=>({x,y})),
    branches:branches.map(part=>part.map(([x,y])=>({x,y}))),
    count,armoured,speed,description,
    start:{x:route[0][0],y:route[0][1]},
    exit:{x:route[route.length-1][0],y:route[route.length-1][1]}
  });
  const maps=[
    mk('Gentle Waterway','water',196,
      [[150,350],[450,350],[450,150],[850,150]],
      2,0,8,'Wide, gentle channels, two turns and a whirlpool exit.'),
    mk('Shimmering Lagoon','lagoon',184,
      [[150,500],[350,500],[350,300],[650,300],[650,150],[850,150]],
      2,0,9,'Sandbars and a winding turquoise lagoon.',
      [[[250,500],[250,600]]]),
    mk('Mangrove Delta','mangrove',176,
      [[150,150],[350,150],[350,500],[600,500],[600,250],[850,250]],
      3,0,10,'Navigate around mangrove roots and muddy islands.',
      [[[350,350],[150,350]]]),
    mk('Coral Labyrinth','reef',170,
      [[150,500],[300,500],[300,150],[500,150],[500,450],[750,450],[750,150],[850,150]],
      3,1,11,'Coral reefs, tighter turns and your first armoured guardian.',
      [[[300,300],[150,300]]]),
    mk('Rocky Archipelago','rocks',164,
      [[150,200],[300,200],[300,500],[500,500],[500,150],[700,150],[700,450],[850,450]],
      4,1,12,'Wind through basalt islands, hidden passages and guardians.',
      [[[300,400],[150,400]]]),
    mk('Frozen Fjords','ice',158,
      [[150,500],[350,500],[350,200],[550,200],[550,450],[750,450],[750,150],[850,150]],
      4,1,12,'Narrow icy channels between glittering glaciers.',
      [[[350,300],[150,300]]]),
    mk('Stormy Strait','storm',152,
      [[150,150],[350,150],[350,500],[550,500],[550,200],[750,200],[750,500],[850,500]],
      4,2,14,'Storm clouds and rugged reef walls: watch every turn.',
      [[[350,350],[150,350]],[[650,200],[650,100]]]),
    mk('Astral Escape','space',148,
      [[150,500],[350,500],[350,150],[550,150],[550,450],[750,450],[750,150],[850,150]],
      5,2,15,'Pilot the final starlane between asteroid fields to a warp portal!',
      [[[350,300],[150,300]],[[650,450],[650,550]]])
  ];
  const palettes={
    water:{land:'#cbd9bd',rim:'#8cafa0',water:'#6fd4dc',shine:'#c3f7ef',dark:'#1a708c',feature:'#839f77',icon:'🌿'},
    lagoon:{land:'#f0dbac',rim:'#e5b982',water:'#56d2d0',shine:'#b6fff0',dark:'#087c9b',feature:'#d59e66',icon:'🏝️'},
    mangrove:{land:'#9cb68f',rim:'#648d72',water:'#7abeb0',shine:'#c2e6d1',dark:'#376d63',feature:'#517c50',icon:'🌱'},
    reef:{land:'#e1c8b8',rim:'#be9ca7',water:'#66b8d7',shine:'#c3e9e9',dark:'#2f7eac',feature:'#e68c94',icon:'🪸'},
    rocks:{land:'#b9c2c5',rim:'#879e9b',water:'#699fb7',shine:'#bddce5',dark:'#426b85',feature:'#707e85',icon:'🪨'},
    ice:{land:'#deedf2',rim:'#b0d0db',water:'#94cbdc',shine:'#ecf9fb',dark:'#628faf',feature:'#9bc3d3',icon:'❄️'},
    storm:{land:'#4c6571',rim:'#364f5a',water:'#508fa7',shine:'#9fc8d8',dark:'#254962',feature:'#7d98a4',icon:'⛈️'},
    space:{land:'#181d39',rim:'#5a4d89',water:'#574a9a',shine:'#b0a5ff',dark:'#222353',feature:'#858ac8',icon:'🌌'}
  };
  for(const [i,m] of maps.entries()){
    const length=m.route.slice(1).reduce((total,p,j)=>total+distance(m.route[j],p),0);
    m.level=i+1;m.length=length;m.palette=palettes[m.theme];
    for(const branch of m.branches)Object.freeze(branch);
    Object.freeze(m.branches);
    Object.freeze(m.route);Object.freeze(m.start);Object.freeze(m.exit);Object.freeze(m);
  }
  Object.freeze(maps);

  function get(level){
    if(!Number.isInteger(level)||level<1||level>maps.length)
      throw new RangeError('Unknown maze level '+level);
    return maps[level-1];
  }
  function distanceToSegment(p,a,b){
    const dx=b.x-a.x,dy=b.y-a.y,mag=dx*dx+dy*dy;
    const t=mag?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/mag,0,1):0;
    return {distance:Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy),t,
      point:{x:a.x+t*dx,y:a.y+t*dy}};
  }
  function inChannel(map,p,margin=SHIP_MARGIN){
    if(p.x<35||p.x>W-35||p.y<35||p.y>H-35)return false;
    const allowed=map.width/2-margin;
    if(allowed<=0)return false;
    return [map.route,...map.branches].some(route=>route.slice(1).some((q,j)=>
      distanceToSegment(p,route[j],q).distance<=allowed+1e-6));
  }
  // A straight 1–5-unit MOVE must remain in the navigable water for its
  // ENTIRE length. Endpoints alone are insufficient at maze corners.
  function moveClear(map,a,b){
    const length=distance(a,b),n=Math.max(1,Math.ceil(length/4));
    for(let i=0;i<=n;i++){
      const t=i/n,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
      if(!inChannel(map,p,SHIP_MARGIN))return false;
    }
    return true;
  }
  // Bubbles cannot shoot straight across islands. A clear ray ends on the
  // first bank / asteroid; shots remain straight in three-figure bearings.
  function visibleRay(map,a,b){
    const length=distance(a,b),n=Math.max(1,Math.ceil(length/3));
    for(let i=1;i<=n;i++){
      const t=i/n,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
      if(!inChannel(map,p,5))return {length:Math.max(0,length*(i-1)/n),blocked:true};
    }
    return {length,blocked:false};
  }
  function pointAt(map,progress){
    let rest=clamp(progress,0,map.length);
    for(let i=1;i<map.route.length;i++){
      const a=map.route[i-1],b=map.route[i],leg=distance(a,b);
      if(rest<=leg||i===map.route.length-1){
        const t=leg?clamp(rest/leg,0,1):0;
        return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
      }
      rest-=leg;
    }
    return {...map.exit};
  }
  function progressAt(map,p){
    let closest=Infinity,progress=0,travelled=0;
    for(let i=1;i<map.route.length;i++){
      const a=map.route[i-1],b=map.route[i],leg=distance(a,b);
      const projection=distanceToSegment(p,a,b);
      if(projection.distance<closest){
        closest=projection.distance;
        progress=travelled+leg*projection.t;
      }
      travelled+=leg;
    }
    return progress;
  }
  function enemySpawns(map){
    const locations=[],first=distance(map.route[0],map.route[1]);
    for(let i=0;i<map.count;i++){
      const progress=i===0?Math.min(150,first-30):
        map.count===2?map.length*.72:
        map.length*(.32+.55*(i-1)/(map.count-2));
      locations.push({progress,...pointAt(map,progress),hp:i<map.armoured?2:1});
    }
    return locations;
  }
  function advanceEnemy(map,enemy,ship){
    const before=Number.isFinite(enemy.pathProgress)?enemy.pathProgress:progressAt(map,enemy);
    const target=progressAt(map,ship);
    const next=before+clamp(target-before,-map.speed,map.speed);
    const point=pointAt(map,next);
    enemy.x=point.x;enemy.y=point.y;enemy.pathProgress=next;
    return point;
  }
  function hasTarget(map,ship,enemies){
    // Only require a FIRE turn when a guardian is actually within the same
    // open channel and 8-unit range. Do not reveal angles or mark targets.
    return enemies.some(enemy=>
      distance(ship,enemy)<=8*U &&
      !visibleRay(map,ship,enemy).blocked);
  }
  function isExit(map,ship){
    return distance(map.exit,ship)<=PORTAL_RADIUS;
  }
  function pickup(enemy,now,moveCount,id){
    return {id,x:enemy.x,y:enemy.y,from:{x:enemy.x,y:enemy.y},
      appearsAt:now,settlesAt:now+260,expiresAfterMove:moveCount+9};
  }
  function trace(c,route){
    c.beginPath();c.moveTo(route[0].x,route[0].y);
    for(const p of route.slice(1))c.lineTo(p.x,p.y);
  }
  function traceAll(c,map,color,width){
    c.strokeStyle=color;c.lineWidth=width;
    // Side branches are painted first so they merge smoothly into the main
    // navigable channel, rather than looking like overlaps or separate tiles.
    for(const branch of map.branches){trace(c,branch);c.stroke();}
    trace(c,map.route);c.stroke();
  }
  function decor(c,map,now){
    const {land,feature}=map.palette,space=map.theme==='space';
    c.fillStyle=land;c.fillRect(0,0,W,H);
    // Decorative islets, reeds, stones, ice crystals and stars sit on SOLID
    // terrain only. Deterministic positions avoid randomising every frame.
    for(let i=0;i<(space?125:85);i++){
      const x=(i*179+37)%W,y=(i*131+67)%H;
      if(inChannel(map,{x,y},0))continue;
      const size=space?1.3+(i%5)*.7:3+(i%7)*1.2;
      c.save();c.translate(x,y);
      if(space){
        c.fillStyle=i%3?'#d4d9ff':'#9eeaff';c.globalAlpha=.35+(i%5)*.11;
        c.beginPath();c.arc(0,0,size,0,Math.PI*2);c.fill();
      }else if(map.theme==='mangrove'||map.theme==='water'){
        c.strokeStyle=feature;c.lineWidth=2;c.beginPath();
        c.moveTo(0,size);c.quadraticCurveTo(-size,-3,0,-size);
        c.moveTo(0,2);c.lineTo(size*.7,-size*.5);c.stroke();
      }else if(map.theme==='lagoon'||map.theme==='reef'){
        c.strokeStyle=feature;c.lineWidth=3;c.beginPath();
        c.arc(0,0,size,0,Math.PI*1.6);c.stroke();
        c.fillStyle='#fff8d9';c.beginPath();c.arc(size*.4,size*.1,2,0,7);c.fill();
      }else if(map.theme==='ice'){
        c.fillStyle='#f4fdff';c.strokeStyle=feature;c.lineWidth=1;
        c.beginPath();c.moveTo(0,-size);c.lineTo(size*.8,0);
        c.lineTo(0,size);c.lineTo(-size*.8,0);c.closePath();c.fill();c.stroke();
      }else{
        c.fillStyle=feature;c.beginPath();c.ellipse(0,0,size*1.2,size*.7,.3,0,7);c.fill();
      }
      c.restore();
    }
  }
  function draw(c,map,now=0){
    const colors=map.palette,space=map.theme==='space';
    c.save();
    decor(c,map,now);
    c.lineCap='round';c.lineJoin='round';
    traceAll(c,map,colors.rim,map.width+23);
    traceAll(c,map,colors.dark,map.width+7);
    const grad=c.createLinearGradient(0,0,W,H);
    grad.addColorStop(0,colors.shine);grad.addColorStop(.48,colors.water);
    grad.addColorStop(1,space?'#403977':colors.water);
    traceAll(c,map,grad,map.width);
    // Light translucent stripes and north-up grid retain the original
    // 50px-per-unit scale, without revealing routes or target bearings.
    c.save();c.strokeStyle=space?'rgba(187,189,255,.16)':'rgba(13,101,130,.13)';
    c.lineWidth=1;
    for(let x=0;x<=W;x+=U){
      c.beginPath();c.moveTo(x+.5,0);c.lineTo(x+.5,H);c.stroke();
    }
    for(let y=0;y<=H;y+=U){
      c.beginPath();c.moveTo(0,y+.5);c.lineTo(W,y+.5);c.stroke();
    }
    c.restore();
    c.fillStyle=space?'#e7dfff':'#134f70';
    c.font='900 22px system-ui';c.textAlign='left';c.textBaseline='middle';
    c.fillText(map.palette.icon+' '+map.name,22,32);
    c.font='800 13px system-ui';
    c.fillText('MAZE '+map.level+'/'+maps.length,25,56);
    c.restore();
  }
  function drawPortal(c,map,ready,now=0){
    const p=map.exit,space=map.theme==='space',angle=now*.001;
    c.save();c.translate(p.x,p.y);
    c.shadowColor=ready?(space?'#c19bff':'#72ffec'):'#687781';
    c.shadowBlur=ready?23:10;
    c.fillStyle=ready?'rgba(20,66,102,.72)':'rgba(64,84,94,.8)';
    c.beginPath();c.arc(0,0,44,0,Math.PI*2);c.fill();
    c.shadowBlur=0;
    for(let i=0;i<3;i++){
      c.beginPath();c.arc(0,0,35-i*10,angle+i*2.1,angle+i*2.1+Math.PI*1.45);
      c.strokeStyle=ready?['#e0fdff','#89deec','#f4c7ff'][i]:'#bdc8cb';
      c.lineWidth=5-i;c.stroke();
    }
    c.fillStyle=ready?'#f4fbff':'#d1d9d9';
    c.textAlign='center';c.textBaseline='middle';c.font='900 27px system-ui';
    c.fillText(ready?(space?'✦':'🌀'):'🔒',0,0);
    c.font='900 14px system-ui';
    c.strokeStyle=space?'#1b1d41':'#175d77';c.lineWidth=4;
    c.strokeText(ready?(space?'WARP EXIT':'WHIRLPOOL EXIT'):'LOCKED EXIT',0,60);
    c.fillStyle=space?'#ecebff':'#f5fcff';
    c.fillText(ready?(space?'WARP EXIT':'WHIRLPOOL EXIT'):'LOCKED EXIT',0,60);
    c.restore();
  }
  function drawSpaceAura(c,p,now=0){
    c.save();c.translate(p.x,p.y);
    c.shadowColor='#c0a8ff';c.shadowBlur=18;
    c.strokeStyle='rgba(198,225,255,.8)';c.lineWidth=2.7;
    c.beginPath();c.ellipse(0,0,47,37,0,0,Math.PI*2);c.stroke();
    c.shadowBlur=0;
    c.fillStyle='#a8f5ef';
    for(const x of [-13,13]){
      c.beginPath();c.moveTo(x-5,35);c.lineTo(x,49+5*Math.sin(now*.008));
      c.lineTo(x+5,35);c.fill();
    }
    c.restore();
  }
  // Validate hand-authored stages at load. The shared route itself is a
  // guaranteed walkable solution, and each axis-aligned leg can be completed
  // in whole-number 1–5-unit moves without crossing solid scenery.
  function validate(){
    if(maps.length!==8)throw new Error('Expected eight curated maze environments');
    for(const map of maps){
      if(map.width<142||map.width>205||map.count<2||map.count>6)
        throw new Error('Unsafe corridor or enemy count at '+map.name);
      if(!inChannel(map,map.start)||!inChannel(map,map.exit))
        throw new Error('Start and portal must lie on the path');
      for(let i=1;i<map.route.length;i++){
        const a=map.route[i-1],b=map.route[i];
        const len=distance(a,b);
        if((a.x!==b.x&&a.y!==b.y)||len%50!==0)
          throw new Error('Maze legs must be orthogonal multiples of one unit');
        let current=a,travelled=0;
        while(travelled<len){
          const step=Math.min(250,len-travelled),t=(travelled+step)/len;
          const next={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
          if(!moveClear(map,current,next))
            throw new Error('Maze route not navigable at '+map.name+' segment '+i);
          current=next;travelled+=step;
        }
      }
      for(const branch of map.branches){
        const at=branch[0];
        const joined=map.route.slice(1).some((b,i)=>
          distanceToSegment(at,map.route[i],b).distance<=.01);
        if(!joined)throw new Error('False channel is disconnected at '+map.name);
        for(let i=1;i<branch.length;i++){
          const a=branch[i-1],b=branch[i],len=distance(a,b);
          if((a.x!==b.x&&a.y!==b.y)||len%50!==0)
            throw new Error('False channel must use legal 1-unit steps at '+map.name);
          for(let n=0;n<len;n+=250){
            const end=Math.min(len,n+250);
            const p={x:a.x+(b.x-a.x)*n/len,y:a.y+(b.y-a.y)*n/len};
            const q={x:a.x+(b.x-a.x)*end/len,y:a.y+(b.y-a.y)*end/len};
            if(!moveClear(map,p,q))
              throw new Error('False channel is not navigable at '+map.name);
          }
        }
      }
      for(const e of enemySpawns(map))
        if(!inChannel(map,e,SHIP_MARGIN))
          throw new Error('Enemy spawned in land at '+map.name);
    }
    if(maps[0].theme!=='water'||maps[1].theme!=='lagoon'||maps.at(-1).theme!=='space')
      throw new Error('Maze biome progression is not water → lagoon → space');
    return true;
  }
  validate();
  window.BloopMaze=Object.freeze({
    levels:maps,maxLevel:maps.length,get,validate,inChannel,moveClear,
    visibleRay,pointAt,progressAt,enemySpawns,advanceEnemy,hasTarget,isExit,pickup,
    draw,drawPortal,drawSpaceAura,PORTAL_RADIUS
  });
})();
