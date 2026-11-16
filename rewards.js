/* Reward buoys and fair enemy placement for Bloop Bearing Battles.
 * Pure geometry and cosmetic drawing. No aiming solutions are displayed.
 * All measurements continue to use 50 canvas pixels per nautical unit.
 */
(function(){
  'use strict';
  const SCALE=50, MAX_SHOT=8*SCALE, MAX_MOVE=5*SCALE;
  const PICKUP_BONUS=2, PICKUP_RADIUS=40, PICKUP_LIFETIME_MOVES=4;
  const SPAWN_MIN=180, SPAWN_MAX=350, SPAWN_SPACING=70;
  const RUSH_THRESHOLD=380, RUSH_DESTINATION=350;
  const TAU=Math.PI*2;
  const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

  // Each creature starts in the current ship's firing radius, not at a distant
  // board edge. Works at all valid ship coordinates, including corners.
  function spawnPositions(ship,count,random=Math.random){
    const placed=[];
    const within=p=>p.x>=65&&p.x<=935&&p.y>=65&&p.y<=585&&
      distance(p,ship)>=SPAWN_MIN&&distance(p,ship)<=SPAWN_MAX;
    const spaced=(p,gap)=>placed.every(prev=>distance(p,prev)>=gap);
    for(let i=0;i<count;i++){
      let chosen=null;
      for(let attempt=0;attempt<320;attempt++){
        const a=random()*TAU;
        const r=SPAWN_MIN+(SPAWN_MAX-SPAWN_MIN)*random();
        const p={x:ship.x+Math.cos(a)*r,y:ship.y+Math.sin(a)*r};
        if(within(p)&&spaced(p,SPAWN_SPACING)){chosen=p;break;}
      }
      if(!chosen){
        // Deterministic fallback for crowded areas / low-entropy random inputs.
        // Pick the available ring point with maximum room from other sillies.
        let best=null,bestGap=-1;
        for(const radius of [325,290,255,220,185]){
          for(let n=0;n<96;n++){
            const a=(n+.5)*TAU/96;
            const p={x:ship.x+Math.cos(a)*radius,y:ship.y+Math.sin(a)*radius};
            if(!within(p))continue;
            const gap=placed.length?Math.min(...placed.map(x=>distance(x,p))):999;
            if(gap>bestGap){best=p;bestGap=gap;}
          }
        }
        if(!best||bestGap<45)throw new Error('Could not place a fair sea silly');
        chosen=best;
      }
      placed.push(chosen);
    }
    return placed;
  }

  // If a ship sails far away, a single nearest silly rides a visible "catch-up
  // current" into range before the next FIRE phase. Does not change level speed
  // for any other enemies, and never alters the shot range or gives an aim line.
  function bringNearestIntoRange(ship,enemies,oldPositions){
    if(!enemies.length)return null;
    let nearest=null,dd=Infinity;
    for(const e of enemies){
      const d=distance(ship,e);
      if(d<dd){dd=d;nearest=e;}
    }
    if(dd<=RUSH_THRESHOLD)return null;
    const t=RUSH_DESTINATION/dd;
    nearest.x=ship.x+(nearest.x-ship.x)*t;
    nearest.y=ship.y+(nearest.y-ship.y)*t;
    if(nearest.motion){
      nearest.motion.to={x:nearest.x,y:nearest.y};
    }else{
      nearest.motion={from:oldPositions?.get(nearest)||{x:nearest.x,y:nearest.y},
        to:{x:nearest.x,y:nearest.y},start:0,duration:0};
    }
    nearest.mood='surprised';
    return nearest;
  }

  function pickupFromPop(ship,enemy,now,currentMoveCount,serial){
    const dd=distance(ship,enemy);
    const toDistance=clamp(dd,65,175);
    const dx=enemy.x-ship.x,dy=enemy.y-ship.y;
    const unit=dd>0?1/dd:0;
    const to=dd>0?
      {x:clamp(ship.x+dx*unit*Math.min(dd,toDistance),35,965),
       y:clamp(ship.y+dy*unit*Math.min(dd,toDistance),35,615)}:
      {x:clamp(ship.x+80,35,965),y:ship.y};
    // Starts visually where it was earned; floats closer during the shot.
    return {
      id:serial, x:to.x,y:to.y,from:{x:enemy.x,y:enemy.y},
      appearsAt:now, settlesAt:now+520,
      expiresAfterMove:currentMoveCount+PICKUP_LIFETIME_MOVES
    };
  }

  function distanceToSegment(p,a,b){
    const dx=b.x-a.x,dy=b.y-a.y;
    const len=dx*dx+dy*dy;
    const t=len?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/len,0,1):0;
    return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
  }
  // Pickup checks apply on MOVE only. Sailing through counts, not just parking
  // exactly on top of a star. Keep uncollected stars for four MOVE chances.
  function collectOnMove(pickups,from,to,moveNumber){
    const collected=[],remaining=[];
    for(const p of pickups){
      if(distanceToSegment(p,from,to)<=PICKUP_RADIUS)collected.push(p);
      else if(moveNumber<=p.expiresAfterMove)remaining.push(p);
    }
    return {collected,remaining,bonus:collected.length*PICKUP_BONUS};
  }

  function drawPickup(c,p,now,quiet=false){
    if(!quiet&&now<p.appearsAt)return;
    const travel=quiet?1:clamp((now-p.appearsAt)/Math.max(1,p.settlesAt-p.appearsAt),0,1);
    const eased=1-Math.pow(1-travel,3);
    const x=p.from.x+(p.x-p.from.x)*eased;
    const y=p.from.y+(p.y-p.from.y)*eased+
      (quiet?0:Math.sin(now*.004+p.id)*3);
    const scale=quiet?1:.9+.10*Math.sin(now*.007+p.id);
    c.save();c.translate(x,y);c.scale(scale,scale);
    c.shadowColor='#8a5b24';c.shadowBlur=12;c.shadowOffsetY=3;
    c.fillStyle='rgba(255,251,213,.9)';
    c.strokeStyle='#b47a44';c.lineWidth=2.7;
    c.beginPath();c.arc(0,0,22,0,TAU);c.fill();c.stroke();
    c.shadowBlur=0;c.shadowOffsetY=0;
    c.fillStyle='#efb64c';c.strokeStyle='#fffbe7';c.lineWidth=2;
    c.beginPath();
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+i*Math.PI/5,r=i%2?7:15;
      const tx=Math.cos(a)*r,ty=Math.sin(a)*r;
      if(i===0)c.moveTo(tx,ty);else c.lineTo(tx,ty);
    }c.closePath();c.fill();c.stroke();
    c.font='900 10px system-ui';c.fillStyle='#855321';c.textAlign='center';
    c.textBaseline='middle';c.fillText('+2',0,33);
    c.restore();
  }
  window.BloopRewards=Object.freeze({
    SCALE,MAX_SHOT,MAX_MOVE,PICKUP_BONUS,PICKUP_RADIUS,PICKUP_LIFETIME_MOVES,
    spawnPositions,bringNearestIntoRange,pickupFromPop,collectOnMove,
    distanceToSegment,drawPickup
  });
})();
