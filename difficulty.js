/* One-change-per-level curriculum for Bloop! Bearing Battles.
   Each level is a full set of creatures; no mid-level speed escalation.
   Values are in canvas pixels per committed turn, not real time. */
(function () {
  'use strict';
  const levels = [
    { count: 3, speed: 17, armoured: 0, kind: 'start',   name: 'Calm waters',       description: 'Three ordinary sea sillies. Learn your bearings.' },
    { count: 4, speed: 17, armoured: 0, kind: 'count',   name: 'Extra passenger',   description: 'One extra sea silly joins the wave.' },
    { count: 4, speed: 21, armoured: 0, kind: 'speed',   name: 'Faster fins',       description: 'Same enemies, but they swim a little faster.' },
    { count: 4, speed: 21, armoured: 1, kind: 'armour',  name: 'Bubble helmet',     description: 'One sea silly wears a two-hit bubble helmet.' },
    { count: 5, speed: 21, armoured: 1, kind: 'count',   name: 'Crowded waters',    description: 'One extra sea silly joins the wave.' },
    { count: 5, speed: 25, armoured: 1, kind: 'speed',   name: 'Quick currents',    description: 'The sea sillies swim a little faster.' },
    { count: 5, speed: 25, armoured: 2, kind: 'armour',  name: 'Double trouble',    description: 'One more sea silly now has a two-hit helmet.' },
    { count: 6, speed: 25, armoured: 2, kind: 'count',   name: 'Silly swarm',       description: 'One extra sea silly joins the wave.' },
    { count: 6, speed: 29, armoured: 2, kind: 'speed',   name: 'Speedy swimmers',   description: 'The sea sillies swim a little faster.' },
    { count: 6, speed: 29, armoured: 2, hazard: true, kind: 'hazard', name: 'Squid warning', description: 'New danger: a red strike zone can appear on MOVE turns. Sail outside it to dodge a giant squid!' },
    { count: 7, speed: 29, armoured: 2, hazard: true, kind: 'count',  name: 'Busy bay',       description: 'One extra sea silly joins the wave.' },
    { count: 7, speed: 33, armoured: 2, hazard: true, kind: 'speed',  name: 'Final splash',   description: 'The sea sillies swim a little faster. Last level!' }
  ].map((item, index) => Object.freeze({ hazard: false, ...item, level: index + 1 }));
  Object.freeze(levels);

  function get(level) {
    if (!Number.isInteger(level) || level < 1 || level > levels.length)
      throw new RangeError('Unknown Bloop level: ' + level);
    return levels[level - 1];
  }
  function change(prev, next) {
    const keys = ['count', 'speed', 'armoured', 'hazard'];
    return keys.filter(key => prev[key] !== next[key]);
  }
  function validate() {
    if (!levels.length) throw new Error('Levels cannot be empty');
    const first = levels[0];
    if (first.kind !== 'start' || first.armoured !== 0 || first.hazard || first.count < 1 || first.speed < 1)
      throw new Error('Invalid introductory level');
    for (let i = 1; i < levels.length; i++) {
      const before = levels[i - 1], after = levels[i];
      const changed = change(before, after);
      if (changed.length !== 1) throw new Error('Exactly one difficulty dimension must change at level ' + (i + 1));
      const dimension = changed[0];
      if (after[dimension] <= before[dimension] ||
          (after.kind === 'count' && dimension !== 'count') ||
          (after.kind === 'speed' && dimension !== 'speed') ||
          (after.kind === 'armour' && dimension !== 'armoured') ||
          (after.kind === 'hazard' && dimension !== 'hazard'))
        throw new Error('Invalid difficulty step at level ' + (i + 1));
      if (after.armoured >= after.count) throw new Error('Retain some regular enemies at level ' + (i + 1));
      if (after.kind === 'hazard' && (before.hazard || after.level < 10))
        throw new Error('Squid hazard must be introduced once in the late levels');
      if (before.hazard && !after.hazard)
        throw new Error('Squid hazard must remain enabled in later levels');
    }
    return true;
  }
  validate();

  window.BloopDifficulty = Object.freeze({
    levels, get, validate, maxLevel: levels.length,
    summary(level) {
      const spec = get(level);
      return level === 1 ? 'Gentle start · 3 ordinary sillies' :
        (spec.kind === 'count' ? '+1 sea silly' :
        spec.kind === 'speed' ? 'Faster sea sillies' :
        spec.kind === 'hazard' ? '🦑 Red squid-strike zones!' : '+1 bubble-helmet silly');
    }
  });
})();
