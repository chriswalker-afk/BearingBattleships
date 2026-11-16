/* Pass B: brief comic reactions and reward stars. Decorative only: no mathematical hints. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const quips = Object.freeze([
    ['Bloop bloop!', 'You missed my hat!', 'Jelly good!', 'Wiggle wiggle!'],
    ['Puff power!', 'I am round!', 'Bubble trouble!', 'Boop!'],
    ['Clack clack!', 'Sideways is a vibe!', 'Crabsolutely!', 'Snip snap!']
  ]);
  function quip(type, turn) {
    const lines = quips[(type + 3) % quips.length];
    return lines[(turn + type * 2) % lines.length];
  }
  function star(c, x, y, outer, inner, rotation) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rotation + (i * Math.PI / 5) - Math.PI / 2;
      const r = i % 2 ? inner : outer;
      if (i === 0) c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath();
  }
  function speech(c, item, now, width = 1000, height = 650) {
    if (!item || now < item.start) return;
    const elapsed = now - item.start, duration = item.duration || 1150;
    if (elapsed >= duration) return;
    const fraction = clamp(elapsed / duration, 0, 1);
    const alpha = Math.min(1, fraction * 9, (1 - fraction) * 6);
    if (alpha <= 0) return;
    const w = clamp(item.text.length * 9.5 + 38, 111, 220);
    const h = 41;
    const x = clamp(item.x - w / 2, 12, width - w - 12);
    const above = item.y > 115;
    const y = above ? clamp(item.y - 91, 12, height - 52) : clamp(item.y + 35, 12, height - 52);
    const bubbleX = clamp(item.x, x + 17, x + w - 17);
    c.save(); c.globalAlpha *= alpha;
    c.shadowColor = 'rgba(17,78,117,.2)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
    c.beginPath(); c.roundRect(x, y, w, h, 17);
    c.fillStyle = '#fffdfa'; c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.lineWidth = 3; c.strokeStyle = '#216385'; c.stroke();
    c.beginPath();
    if (above) {
      c.moveTo(bubbleX - 9, y + h - 1); c.lineTo(item.x, Math.min(item.y - 27, y + h + 16));
      c.lineTo(bubbleX + 9, y + h - 1);
    } else {
      c.moveTo(bubbleX - 9, y + 1); c.lineTo(item.x, Math.max(item.y + 25, y - 17));
      c.lineTo(bubbleX + 9, y + 1);
    }
    c.closePath(); c.fillStyle = '#fffdfa'; c.fill();
    c.font = '850 15px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#1a5b7b'; c.fillText(item.text, x + w / 2, y + h / 2 + 1);
    c.restore();
  }
  function celebration(c, item, now) {
    if (!item || now < item.start) return;
    const elapsed = now - item.start, duration = item.duration || 900;
    if (elapsed >= duration) return;
    const t = clamp(elapsed / duration, 0, 1), opacity = Math.min(1, t * 8, (1 - t) * 3);
    if (opacity <= 0) return;
    c.save();
    c.globalAlpha *= opacity;
    c.translate(item.x, item.y);
    for (let i = 0; i < (item.pinpoint ? 12 : 8); i++) {
      const a = i * TAU / (item.pinpoint ? 12 : 8) + i * .22;
      const radius = 16 + easeOut(t) * (35 + (i % 4) * 9);
      const x = Math.cos(a) * radius, y = Math.sin(a) * radius - 15 * t;
      c.save(); c.translate(x, y); c.rotate(t * 3 + i * .4);
      star(c, 0, 0, 5 + i % 3, 2.6, 0);
      c.fillStyle = ['#fff5a0', '#ffa3a7', '#ffffff', '#a6e9ed'][i % 4]; c.fill();
      c.restore();
    }
    // Reward wording is strictly post-shot, never an angle preview.
    if (item.pinpoint || item.streak >= 2) {
      const label = item.pinpoint ? 'PINPOINT POP!' : 'POP STREAK!';
      c.font = '900 18px system-ui'; c.textAlign = 'center';
      c.lineWidth = 4.5; c.strokeStyle = '#16567a'; c.fillStyle = '#fff9cd';
      c.strokeText(label, 0, -61 - 15 * t); c.fillText(label, 0, -61 - 15 * t);
    }
    c.restore();
  }
  window.BloopJuice = Object.freeze({quip, speech, celebration});
})();
