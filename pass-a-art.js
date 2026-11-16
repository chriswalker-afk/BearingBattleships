/* Pass A vector-art renderer. All decoration is screen-space only; game coordinates remain unchanged. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  function oval(c, x, y, rx, ry, fill, stroke = null, width = 1) {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.lineWidth = width; c.strokeStyle = stroke; c.stroke(); }
  }
  function rounded(c, x, y, w, h, r, fill, stroke = null, width = 1) {
    c.beginPath(); c.roundRect(x, y, w, h, r);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  }
  function star(c, x, y, r, alpha = 1) {
    c.save(); c.globalAlpha *= alpha; c.strokeStyle = '#fffcef'; c.lineCap = 'round';
    c.lineWidth = 2; c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y);
    c.moveTo(x, y - r); c.lineTo(x, y + r); c.stroke(); c.restore();
  }

  function drawSea(c, now, width, height, unit) {
    c.save();
    const bg = c.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#aaeef0'); bg.addColorStop(.53, '#7ddbe7'); bg.addColorStop(1, '#58c1d7');
    c.fillStyle = bg; c.fillRect(0, 0, width, height);

    // Broad soft tide bands are ambient; they never indicate a bearing.
    for (let band = 0; band < 9; band++) {
      const y = band * 91 - 29, offset = Math.sin(now * .00033 + band) * 17;
      c.beginPath(); c.moveTo(-40, y + offset);
      for (let x = -40; x < width + 70; x += 12) {
        const yy = y + offset + Math.sin(x * .012 + now * .0007 + band * .9) * 11;
        c.lineTo(x, yy);
      }
      c.strokeStyle = band % 2 ? 'rgba(255,255,255,.13)' : 'rgba(16,123,156,.085)';
      c.lineWidth = band % 2 ? 27 : 33;
      c.stroke();
    }

    // Subtle manual distance grid; never draw targeting lines or direction aids.
    c.lineWidth = 1;
    c.strokeStyle = 'rgba(11,75,108,.19)';
    for (let x = 0; x <= width; x += unit) {
      c.beginPath(); c.moveTo(x + .5, 0); c.lineTo(x + .5, height); c.stroke();
    }
    for (let y = 0; y <= height; y += unit) {
      c.beginPath(); c.moveTo(0, y + .5); c.lineTo(width, y + .5); c.stroke();
    }
    for (let x = 0; x <= width; x += unit * 5) {
      c.strokeStyle = 'rgba(11,75,108,.23)';
      c.beginPath(); c.moveTo(x + .5, 0); c.lineTo(x + .5, height); c.stroke();
    }
    c.strokeStyle = 'rgba(11,75,108,.19)';

    // A few slow-rising transparent bubbles, deterministically positioned.
    for (let i = 0; i < 23; i++) {
      const bx = (i * 163 + 67) % width;
      const by = ((i * 117 + height * 4) - (now * (.008 + (i % 4) * .003))) % (height + 90);
      const y = (by + height + 90) % (height + 90) - 30;
      const rad = 2.7 + (i % 4) * 2.2;
      c.globalAlpha = .17 + .08 * Math.sin(now * .001 + i);
      oval(c, bx, y, rad, rad, null, '#ffffff', 1.7);
      c.beginPath(); c.arc(bx - rad * .25, y - rad * .3, rad * .3, 3.8, 5.3);
      c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke();
    }
    c.globalAlpha = 1;

    // Decorative bits remain near the extreme corners, away from the play area.
    c.save(); c.translate(977, 629); c.rotate(-.3);
    oval(c, 0, 2, 28, 11, 'rgba(21,111,140,.14)');
    c.strokeStyle = '#3d9b91'; c.lineWidth = 5; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      c.beginPath(); c.moveTo(i * 8 - 12, 4);
      c.quadraticCurveTo(i * 11 - 19, -13, i * 10 - 10, -24 - i * 7); c.stroke();
    }
    c.restore();
    c.save(); c.translate(20, 630); c.rotate(.3);
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5; c.strokeStyle = '#f3ae73'; c.lineWidth = 8;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); c.stroke();
    }
    oval(c, 0, 0, 5, 5, '#fff3ad');
    c.restore();

    // Small north indicator is intentionally fixed, not placed on a target.
    rounded(c, 12, 11, 58, 33, 12, 'rgba(255,255,255,.7)');
    c.fillStyle = '#155579'; c.font = '900 17px system-ui'; c.textBaseline = 'middle';
    c.fillText('N ↑', 21, 27);
    c.restore();
  }

  function drawBoat(c, ship, now, underway = false, custom = null) {
    // Boat Studio changes only the painting. Position, heading, scale and
    // measurement geometry are still controlled exclusively by the game.
    const design = custom && typeof custom === 'object' ? custom : {};
    const colors = window.BloopBoat && window.BloopBoat.paint
      ? window.BloopBoat.paint(design)
      : { hullLight:'#ffb58c', hullMid:'#ec7776', hullShade:'#b75176',
          deck:'#fff2d5', flag:'#fada70', line:'#174e71' };
    const bob = Math.sin(now * .0027) * 2;
    const roll = Math.sin(now * .0019 + .7) * .025;
    c.save(); c.translate(ship.x, ship.y);

    oval(c, 0, 27, 38, 13, 'rgba(13,95,136,.18)');
    for (const side of [-1,1]) {
      c.beginPath();c.arc(side*26,20,15,.1,Math.PI-.1);
      c.strokeStyle='rgba(255,255,255,.50)';
      c.lineWidth=underway?4:2.5;c.stroke();
    }
    c.translate(0,bob);c.rotate((ship.heading||0)+roll);
    c.shadowColor='rgba(12,62,95,.22)';c.shadowBlur=13;c.shadowOffsetY=5;

    // The hull is the SAME physical shape regardless of colour or accessories.
    const hull = c.createLinearGradient(-30,-22,30,30);
    hull.addColorStop(0,colors.hullLight);
    hull.addColorStop(.58,colors.hullMid);
    hull.addColorStop(1,colors.hullShade);
    c.beginPath();c.moveTo(0,-35);
    c.bezierCurveTo(18,-28,31,-2,28,13);
    c.quadraticCurveTo(24,31,0,32);
    c.quadraticCurveTo(-24,31,-28,13);
    c.bezierCurveTo(-31,-3,-18,-29,0,-35);
    c.closePath();c.fillStyle=hull;c.fill();c.strokeStyle=colors.line;c.lineWidth=3.6;c.stroke();
    c.shadowBlur=0;c.shadowOffsetY=0;

    // Original bright deck stays readable with all hull palettes.
    c.fillStyle=colors.deck;c.beginPath();
    c.moveTo(0,-25);c.quadraticCurveTo(18,-18,19,-3);
    c.lineTo(17,17);c.quadraticCurveTo(0,24,-17,17);
    c.lineTo(-19,-3);c.quadraticCurveTo(-18,-18,0,-25);c.fill();

    // Three different cabin styles; none changes the measurement position.
    if (design.cabin === 'portholes') {
      rounded(c,-14,-2,28,16,5,'#fff9e9','#1e5677',2);
      for (const x of [-7,7]) {
        oval(c,x,5,4.5,4.6,'#6fc7d9','#1c6587',1.7);
        oval(c,x-1,4,1.2,1.5,'#f2ffff');
      }
    } else if (design.cabin === 'lookout') {
      rounded(c,-12,-11,24,25,5,'#fffaf1','#1e5677',2.5);
      rounded(c,-9,-7,18,10,4,'#82dcec','#1e5677',1.5);
      rounded(c,-7,7,14,5,2,'#ffd68d','#a37d5e',1);
      c.strokeStyle='#155878';c.lineWidth=2;
      c.beginPath();c.moveTo(-13,-12);c.lineTo(13,-12);c.stroke();
    } else {
      rounded(c,-13,-1,26,15,6,'#fffdf4','#1e5677',2);
      rounded(c,-9,2,18,9,3,'#83d8e4','#21688e',1.7);
    }

    // The tiny north-facing mast and flag; flags may have different patterns.
    c.strokeStyle='#174967';c.lineWidth=3;c.beginPath();
    c.moveTo(0,-25);c.lineTo(0,-52);c.stroke();
    const flagWave=Math.sin(now*.006)*3;
    c.beginPath();c.moveTo(2,-51);c.lineTo(23+flagWave,-46);
    c.lineTo(2,-38);c.closePath();
    c.fillStyle=colors.flag;c.fill();c.strokeStyle='#9d7265';c.lineWidth=1.4;c.stroke();
    if (design.flag === 'checker') {
      c.save();c.clip();
      c.fillStyle='#fff8db';c.fillRect(4,-51,7,7);c.fillRect(12,-44,8,8);
      c.fillStyle='#7f65ad';c.fillRect(12,-51,8,7);c.restore();
    } else if (design.flag === 'starry') {
      c.fillStyle='#fff3a9';c.beginPath();
      for(let i=0;i<10;i++){
        const a=-Math.PI/2+i*Math.PI/5,r=i%2?2.3:4.4;
        const x=13+Math.cos(a)*r,y=-45+Math.sin(a)*r;
        if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
      }
      c.closePath();c.fill();
    } else if (design.flag === 'rainbow') {
      c.save();c.clip();
      for(const [i,col] of ['#ffce72','#9be3c2','#8ccfea','#bb9fe9'].entries()){
        c.fillStyle=col;c.fillRect(5+i*5,-52,5,17);
      }
      c.restore();
    } else if(design.flag === 'ocean') {
      c.strokeStyle='#fff9db';c.lineWidth=2;
      c.beginPath();c.arc(12,-46,3.1,Math.PI*.1,Math.PI*.9);c.stroke();
    }

    // Four different facial expressions on the stern. Cosmetic only.
    const face=design.face||'happy';
    for(const x of [-9,9]){
      if(face==='wink'&&x===-9) {
        c.strokeStyle='#1b4d68';c.lineWidth=2.4;
        c.beginPath();c.moveTo(x-4,23);c.quadraticCurveTo(x,20,x+4,23);c.stroke();
      }else if(face==='brave') {
        rounded(c,x-5,21,10,5,2,'#213f59','#203e54',1);
        c.strokeStyle='#243f55';c.lineWidth=1.6;c.beginPath();
        c.moveTo(x-5,18);c.lineTo(x+4,19.5);c.stroke();
      }else{
        oval(c,x,23,face==='surprised'?5:4.7,face==='surprised'?7:5.6,
          '#ffffff','#1b4d68',1);
        oval(c,x+1,23.4,2.3,face==='surprised'?3.5:3.2,'#1d415b');
      }
    }
    c.strokeStyle='#553657';c.lineWidth=1.8;
    if(face==='surprised'){
      oval(c,0,27,3.3,4.1,'#70445a','#553657',1.5);
    }else if(face==='brave'){
      c.beginPath();c.moveTo(-4,29);c.lineTo(4,29);c.stroke();
    }else{
      c.beginPath();c.arc(0,23,face==='wink'?4.7:3.2,0,Math.PI);c.stroke();
    }

    // Decorations stay inside the same hull footprint and cannot change hitboxes.
    if(design.accessory==='lifebuoy'){
      oval(c,-20,7,7.2,7.2,'#fff8f0','#ea6867',3.4);
      oval(c,-20,7,3.2,3.2,'#82d4e3','#ffffff',1);
    }else if(design.accessory==='star'){
      c.fillStyle='#f8cd58';c.strokeStyle='#ae7948';c.lineWidth=1.5;
      c.beginPath();
      for(let i=0;i<10;i++){
        const a=i*Math.PI/5-Math.PI/2,r=i%2?3.1:6.5;
        const x=19+Math.cos(a)*r,y=9+Math.sin(a)*r;
        if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
      }c.closePath();c.fill();c.stroke();
    }else if(design.accessory==='heart'){
      c.save();c.translate(19,8);c.scale(.55,.55);
      c.beginPath();c.moveTo(0,10);
      c.bezierCurveTo(-18,0,-12,-12,0,-5);
      c.bezierCurveTo(12,-12,18,0,0,10);
      c.fillStyle='#f16f97';c.strokeStyle='#a84b72';c.lineWidth=2;c.fill();c.stroke();c.restore();
    }else if(design.accessory==='stripes'){
      c.strokeStyle='#fff5d7';c.lineWidth=3.4;c.lineCap='round';
      for(const x of [-10,0,10]){
        c.beginPath();c.moveTo(x,-29);c.lineTo(x,-19);c.stroke();
      }
    }
    oval(c,20,-3,3.4,3.4,'#ffd65c');
    oval(c,-20,-3,3.4,3.4,'#ffd65c');
    c.restore();
  }

    // Pass B: extra expressions, kept within each creature's original hitbox.
  function eyes(c, left, right, y, blink, mood = 'curious') {
    for (const x of [left, right]) {
      if (blink || (mood === 'cheeky' && x === left)) {
        c.strokeStyle = '#1d4969'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(x - 5, y); c.quadraticCurveTo(x, y + 3, x + 5, y); c.stroke();
      } else {
        const wide = mood === 'surprised';
        oval(c, x, y, wide ? 8 : 7, wide ? 10 : 8, '#fffdf5', '#20536d', 1.6);
        const glance = mood === 'curious' ? 2.5 : 1.3;
        oval(c, x + glance, y + 1, wide ? 2.3 : 3, wide ? 3 : 4, '#1b4966');
        oval(c, x + .5, y - 1, 1.3, 1.6, '#fff');
      }
      if (mood === 'grumpy') {
        c.strokeStyle = '#594663'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(x - 6, y - 13 + (x === left ? -2 : 2));
        c.lineTo(x + 6, y - 12 + (x === left ? 2 : -2)); c.stroke();
      }
    }
  }
  function mouth(c, mood, y, colour) {
    c.strokeStyle = colour; c.lineWidth = 2.3;
    if (mood === 'surprised') {
      oval(c, 0, y + 1, 4, 5.5, '#6f486a', colour, 1.4);
    } else if (mood === 'grumpy') {
      c.beginPath(); c.moveTo(-5, y + 2); c.quadraticCurveTo(0, y - 2, 5, y + 2); c.stroke();
    } else {
      c.beginPath(); c.arc(0, y, mood === 'cheeky' ? 6 : 4.5, 0, Math.PI); c.stroke();
      if (mood === 'cheeky') oval(c, 1, y + 3, 2.3, 1.7, '#ed829b');
    }
  }

  function drawCreature(c, e, now, scale = 1, opacity = 1) {
    if (scale <= 0 || opacity <= 0) return;
    const id = e.type || 0;
    const phase = e.bob || 0;
    const sway = Math.sin(now * .004 + phase);
    const blink = Math.sin(now * .0011 + phase * 3) > .995;
    const mood = e.mood || 'curious';
    c.save(); c.globalAlpha *= opacity; c.translate(e.x, e.y);
    // Anchor and shadow stay stationary for precise angle/distance measurement.
    oval(c, 0, 22, 24, 8, 'rgba(17,100,125,.15)');
    c.translate(0, sway * 1.9); c.rotate(sway * .036); c.scale(scale, scale);
    c.lineCap = 'round'; c.lineJoin = 'round';

    if (id === 0) {
      // Taffy the jelly: loose translucent bell and dancing tentacles.
      for (let i = -2; i <= 2; i++) {
        const x = i * 8; c.beginPath(); c.moveTo(x, 8);
        c.bezierCurveTo(x - 5 + sway * 3, 21, x + 9 - sway * 5, 27, x + sway * 5, 34);
        c.strokeStyle = i % 2 ? '#ba65ac' : '#eea4dc'; c.lineWidth = 5; c.stroke();
      }
      const fill = c.createLinearGradient(-24, -25, 20, 19);
      fill.addColorStop(0, '#ffd4f1'); fill.addColorStop(.7, '#d88acc'); fill.addColorStop(1, '#ac70be');
      c.beginPath(); c.moveTo(-27, 9); c.bezierCurveTo(-31, -22, -17, -30, 0, -30);
      c.bezierCurveTo(23, -31, 32, -11, 27, 11);
      c.quadraticCurveTo(15, 16, 4, 10); c.quadraticCurveTo(-12, 17, -27, 9);
      c.closePath(); c.fillStyle = fill; c.fill(); c.strokeStyle = '#6c548f'; c.lineWidth = 3.5; c.stroke();
      oval(c, -12, -17, 8, 4, 'rgba(255,255,255,.39)');
      eyes(c, -10, 10, -2, blink, mood);
      mouth(c, mood, 8, '#6c3f72');
      oval(c, -17, 8, 4, 2.7, 'rgba(255,118,171,.4)');
      oval(c, 17, 8, 4, 2.7, 'rgba(255,118,171,.4)');
    } else if (id === 1) {
      // Pippin the puffer: wavy spikes and wobbling fins.
      for (let i = 0; i < 10; i++) {
        const a = i * TAU / 10;
        const r = 21 + Math.sin(now * .006 + i) * 1.8;
        c.beginPath(); c.moveTo(Math.cos(a - .13) * r, Math.sin(a - .13) * r);
        c.lineTo(Math.cos(a) * 34, Math.sin(a) * 34);
        c.lineTo(Math.cos(a + .13) * r, Math.sin(a + .13) * r);
        c.fillStyle = '#f9b861'; c.fill(); c.strokeStyle = '#ab6f53'; c.lineWidth = 2; c.stroke();
      }
      const fill = c.createRadialGradient(-8, -12, 2, 1, 4, 32);
      fill.addColorStop(0, '#fff9b4'); fill.addColorStop(.68, '#ffda79'); fill.addColorStop(1, '#f1a75c');
      oval(c, 0, 0, 26, 24, fill, '#a9674d', 3.5);
      oval(c, 0, 11, 16, 8, '#ffe8a5');
      eyes(c, -10, 10, -5, blink, mood);
      mouth(c, mood, 7, '#bc6b55');
      c.fillStyle = '#e48d66'; oval(c, -19, 4, 4, 3, '#f4ac75');
    } else {
      // Clancy the crab: twitching raised claws and long cartoon eye stalks.
      for (const side of [-1, 1]) {
        c.strokeStyle = '#a85d69'; c.lineWidth = 5;
        for (let i = 0; i < 3; i++) {
          c.beginPath(); c.moveTo(side * 15, i * 7 - 2);
          c.lineTo(side * (29 + i * 2), i * 7 - 7 + sway * 2); c.stroke();
        }
        c.beginPath(); c.moveTo(side * 18, -10);
        c.quadraticCurveTo(side * 33, -22, side * 35, -29 + sway * 4); c.stroke();
        oval(c, side * 36, -30 + sway * 4, 10, 10, '#fa897c', '#99506a', 3);
        c.strokeStyle = '#99506a'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(side * 34, -35); c.lineTo(side * 31, -43);
        c.moveTo(side * 40, -34); c.lineTo(side * 45, -40); c.stroke();
      }
      const fill = c.createLinearGradient(-24, -15, 18, 23);
      fill.addColorStop(0, '#ffb5a1'); fill.addColorStop(1, '#e57281');
      oval(c, 0, 3, 26, 19, fill, '#99506a', 3.7);
      c.strokeStyle = '#99506a'; c.lineWidth = 3;
      for (const x of [-11, 11]) { c.beginPath(); c.moveTo(x, -7); c.lineTo(x, -20); c.stroke(); }
      eyes(c, -11, 11, -20, blink, mood);
      mouth(c, mood, 8, '#99506a');
      oval(c, -16, 10, 3, 2.5, '#ee607e'); oval(c, 16, 10, 3, 2.5, '#ee607e');
    }
    // Helmet overlay: visible hit count, anchored on the creature's true centre.
    // Does not alter target coordinates or the game's hit tolerance.
    if (e.maxHp > 1) {
      const cracked = e.hp < e.maxHp;
      c.save();
      c.lineWidth = 5;
      c.strokeStyle = cracked ? '#f4c56d' : '#6ad2eb';
      c.beginPath(); c.arc(0, 0, 34, -.7, Math.PI * 1.72); c.stroke();
      c.lineWidth = 2; c.strokeStyle = '#ffffff';
      c.beginPath(); c.arc(0, 0, 39, -1.1, .45); c.stroke();
      if (cracked) {
        c.strokeStyle = '#865880'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(-12, -31); c.lineTo(-6, -37);
        c.lineTo(-4, -29); c.lineTo(2, -35); c.stroke();
      }
      oval(c, 28, -29, 13, 13, cracked ? '#ffdb86' : '#e6fbff', '#215b7f', 2.8);
      c.font = '900 15px system-ui'; c.fillStyle = '#1b5876';
      c.textAlign='center';c.textBaseline='middle';
      c.fillText(String(e.hp),28,-28);
      c.restore();
    }
    c.restore();
  }

  function drawWake(c, from, to, t, kind = 'ship') {
    if (!from || !to || t <= 0 || t >= 1) return;
    const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t;
    const dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy) || 1;
    const sx = dx / len, sy = dy / len;
    c.save(); c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = kind === 'ship' ? 4 : 2;
    for (let i = 0; i < 3; i++) {
      const px = x - sx * (20 + i * 18), py = y - sy * (20 + i * 18);
      const r = (kind === 'ship' ? 12 : 7) + i * 3;
      c.globalAlpha = (1 - i / 3) * .65;
      c.beginPath(); c.arc(px, py, r, 0, TAU); c.stroke();
    }
    c.restore();
  }

  // Bubble only appears AFTER the player commits to a shot; never before aiming.
  function drawProjectile(c, shot, now) {
    if (!shot) return;
    const t = shot.duration ? clamp((now - shot.start) / shot.duration, 0, 1) : 1;
    if (t >= 1) return;
    const x = shot.from.x + (shot.to.x - shot.from.x) * t;
    const y = shot.from.y + (shot.to.y - shot.from.y) * t;
    c.save();
    for (let i = 4; i >= 1; i--) {
      const p = Math.max(0, t - i * .027);
      const tx = shot.from.x + (shot.to.x - shot.from.x) * p;
      const ty = shot.from.y + (shot.to.y - shot.from.y) * p;
      oval(c, tx, ty, 8 - i * 1.2, 8 - i * 1.2, 'rgba(255,255,255,' + (.07 + (4 - i) * .055) + ')');
    }
    c.shadowColor = '#fff'; c.shadowBlur = 12;
    const grad = c.createRadialGradient(x - 4, y - 5, 2, x, y, 15);
    grad.addColorStop(0, 'rgba(255,255,255,.96)');
    grad.addColorStop(.55, 'rgba(224,250,255,.6)');
    grad.addColorStop(1, 'rgba(90,193,230,.32)');
    oval(c, x, y, 14, 14, grad, '#fff', 2.3);
    c.shadowBlur = 0;
    star(c, x - 4.5, y - 6, 3, .9);
    c.restore();
  }

  function drawImpact(c, impact, now) {
    if (!impact || now < impact.start) return;
    const t = (now - impact.start) / (impact.duration || 1);
    if (t > 1) return;
    c.save(); c.translate(impact.x, impact.y);
    c.globalAlpha = 1 - ease(t);
    if (impact.armour) {
      // A helmet hit cracks rather than popping the sea silly.
      oval(c, 0, 0, 15 + t * 22, 15 + t * 22, null, '#e9fcff', 4 - 2 * t);
      for(let i=0;i<6;i++){
        const a = i * TAU / 6;
        const inner = 6 + 9 * t, outer = 20 + 18 * t;
        c.lineWidth=3; c.strokeStyle=i%2?'#f7cf7b':'#72d4ec';
        c.beginPath();c.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);
        c.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);c.stroke();
      }
    } else if (impact.hit) {
      oval(c, 0, 0, 10 + t * 34, 10 + t * 34, null, '#fff8c9', 5 - 3 * t);
      oval(c, 0, 0, 6 + t * 18, 6 + t * 18, null, '#fb91d8', 4 - 2 * t);
      for (let i = 0; i < 9; i++) {
        const a = i * TAU / 9 + .2;
        const radius = 10 + t * (33 + i % 3 * 7);
        star(c, Math.cos(a) * radius, Math.sin(a) * radius, 3.5, 1 - t * .3);
      }
    } else {
      oval(c, 0, 0, 7 + t * 29, (7 + t * 29) * .7, null, '#fff', 3 - 2 * t);
      for (let i = 0; i < 5; i++) {
        const a = (i * .24 + .2) * Math.PI;
        oval(c, Math.cos(a) * (10 + t * 26), -Math.sin(a) * (10 + t * 22), 3, 5, '#ffffff');
      }
    }
    c.restore();
  }

  function drawDamage(c, hit, now) {
    if (!hit || now < hit.start) return;
    const t = (now - hit.start) / (hit.duration || 1);
    if (t >= 1) return;
    c.save(); c.translate(hit.x, hit.y); c.globalAlpha = (1 - t) * .65;
    oval(c, 0, 0, 17 + t * 45, 17 + t * 45, null, '#ff877c', 6 * (1 - t) + .5);
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5;
      star(c, Math.cos(a) * (13 + 26 * t), Math.sin(a) * (13 + 26 * t), 4, 1 - t);
    }
    c.restore();
  }

  function drawWaveTag(c, wave, now, width) {
    if (!wave || now < wave.start || now > wave.start + 1300) return;
    const time = (now - wave.start) / 1300;
    const opacity = Math.min(1, time * 7, (1 - time) * 7);
    c.save(); c.globalAlpha = Math.max(0, opacity);
    rounded(c, width / 2 - 155, 40, 310, 51, 25, '#fff6d2', '#1d6389', 3);
    c.fillStyle = '#175777'; c.font = '900 22px system-ui'; c.textAlign = 'center';
    c.textBaseline = 'middle'; c.fillText('🌊 More sillies incoming!', width / 2, 66);
    c.restore();
  }

  window.BloopArt = Object.freeze({
    drawSea, drawBoat, drawCreature, drawWake, drawProjectile,
    drawImpact, drawDamage, drawWaveTag, ease, clamp
  });
})();
