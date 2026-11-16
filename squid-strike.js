/* Late-game squid strikes: clearly telegraphed MOVE-only hazards.
 * The danger is cosmetic until the end of a valid MOVE, when the ship's
 * FINAL POSITION (not the sailing path) determines whether a heart is lost.
 */
(function () {
  'use strict';
  const FIRST_LEVEL=10;
  const CHANCE=.36;
  const RADIUS=105;
  const COOLDOWN_MOVES=2;
  const STRIKE_DURATION=830;
  const TAU=Math.PI*2;
  const clamp=(value,low,high)=>Math.min(high,Math.max(low,value));
  const within=(point,zone)=>!!zone&&
    Math.hypot(point.x-zone.x,point.y-zone.y)<=zone.radius;

  function makeZone(ship,random=Math.random){
    const angle=random()*TAU;
    const offset=15+random()*35;
    return {
      x:clamp(ship.x+Math.cos(angle)*offset,55,945),
      y:clamp(ship.y+Math.sin(angle)*offset,55,595),
      radius:RADIUS
    };
  }
  // First eligible MOVE definitely introduces the mechanic at Level 10.
  // Thereafter there are always two clear MOVE turns between squid attacks,
  // and then a 36% chance per eligible MOVE (unchanged in Levels 11–12).
  function planMove({level,ship,seen=false,cooldown=0,allow=true,random=Math.random}){
    if(level<FIRST_LEVEL||!allow)
      return {zone:null,seen,cooldown};
    if(cooldown>0)
      return {zone:null,seen,cooldown:cooldown-1};
    if(!seen||random()<CHANCE)
      return {zone:makeZone(ship,random),seen:true,cooldown:COOLDOWN_MOVES};
    return {zone:null,seen,cooldown:0};
  }
  // A learner can always escape in one 1–5-unit move, even at a corner.
  function hasEscape(ship,zone){
    for(const distance of [100,150,200,250]){
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const p={x:ship.x+dx*distance,y:ship.y+dy*distance};
        if(p.x>=35&&p.x<=965&&p.y>=35&&p.y<=615&&!within(p,zone))
          return true;
      }
    }
    return false;
  }

  function drawWarning(c,zone,now=0,quiet=false){
    if(!zone)return;
    const pulse=quiet?0:Math.sin(now*.006)*.1;
    c.save();
    c.fillStyle='rgba(235,43,61,.20)';
    c.strokeStyle='#e53f53';
    c.lineWidth=quiet?4:4.5+pulse*5;
    c.beginPath();c.arc(zone.x,zone.y,zone.radius,0,TAU);c.fill();c.stroke();
    // Alternating warning stripes are clipped to the circular danger area.
    c.save();c.beginPath();c.arc(zone.x,zone.y,zone.radius,0,TAU);c.clip();
    c.strokeStyle='rgba(168,22,49,.17)';c.lineWidth=6;
    for(let x=-250;x<260;x+=27){
      c.beginPath();c.moveTo(zone.x+x,zone.y-zone.radius-80);
      c.lineTo(zone.x+x+220,zone.y+zone.radius+80);c.stroke();
    }
    c.restore();
    c.setLineDash([11,9]);c.strokeStyle='#fff3ed';c.lineWidth=3;
    c.beginPath();c.arc(zone.x,zone.y,zone.radius-8,0,TAU);c.stroke();
    c.setLineDash([]);
    const textY=clamp(zone.y-zone.radius-15,30,615);
    const textX=clamp(zone.x,104,896);
    c.fillStyle='#9b2542';c.strokeStyle='#fff7ec';c.lineWidth=6;
    c.textAlign='center';c.textBaseline='middle';c.font='900 18px system-ui';
    c.strokeText('🦑 SQUID STRIKE!',textX,textY);
    c.fillText('🦑 SQUID STRIKE!',textX,textY);
    c.restore();
  }

  function drawTentacle(c,strike,now=0,quiet=false){
    if(!strike||(!quiet&&now<strike.at))return;
    const age=quiet?STRIKE_DURATION*.35:now-strike.at;
    if(age>STRIKE_DURATION&&!quiet)return;
    const life=clamp(age/STRIKE_DURATION,0,1);
    const reveal=quiet?1:1-Math.pow(1-clamp(age/340,0,1),3);
    const opacity=quiet?1:clamp((STRIKE_DURATION-age)/220,0,1);
    if(opacity<=0)return;
    const z=strike.zone;
    const origin={x:clamp(z.x+165,20,980),y:-38};
    const end={x:origin.x+(z.x-origin.x)*reveal,
      y:origin.y+(z.y-origin.y)*reveal};
    c.save();c.globalAlpha*=opacity;
    // Curved purple arm descends from just outside the top edge and lands at
    // the centre of the marked circle. The inner stroke and round suction cups
    // make it visibly a squid tentacle, rather than a beam or targeting line.
    c.lineCap='round';c.lineJoin='round';
    const path=()=>{
      c.beginPath();c.moveTo(origin.x,origin.y);
      c.bezierCurveTo(origin.x-110,origin.y+120,
        z.x+105,end.y-100*reveal,end.x,end.y);
    };
    path();c.strokeStyle='#6a3f91';c.lineWidth=37;c.stroke();
    path();c.strokeStyle='#aa6abd';c.lineWidth=29;c.stroke();
    path();c.strokeStyle='#db9dc8';c.lineWidth=10;c.stroke();
    if(reveal>.55){
      for(let i=0;i<5;i++){
        const t=.48+i*.1,x=origin.x+(z.x-origin.x)*t;
        const y=origin.y+(z.y-origin.y)*t+25*Math.sin(t*Math.PI);
        c.fillStyle='#f8c7dd';c.strokeStyle='#864b9c';c.lineWidth=2;
        c.beginPath();c.arc(x+9,y,5.8,0,TAU);c.fill();c.stroke();
        c.fillStyle='#a65b9e';c.beginPath();c.arc(x+9,y,2.2,0,TAU);c.fill();
      }
    }
    c.fillStyle='rgba(255,233,242,.48)';
    c.beginPath();c.arc(z.x,z.y,18*reveal+8*life,0,TAU);c.fill();
    c.restore();
  }

  window.BloopSquid=Object.freeze({
    FIRST_LEVEL,CHANCE,RADIUS,COOLDOWN_MOVES,STRIKE_DURATION,
    within,makeZone,planMove,hasEscape,drawWarning,drawTentacle
  });
})();
