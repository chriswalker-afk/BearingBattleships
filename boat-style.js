/* Bloop Boat Studio: allowlisted, purely cosmetic ship styles.
 * There is no effect on hitboxes, speed, scoring, or any bearing calculations.
 * Designs are stored only in this browser (no student accounts or network).
 */
(function () {
  'use strict';
  const KEY = 'bloop-boat-design-v1';
  const defaults = Object.freeze({
    name: 'S.S. Wobble',
    hull: 'coral',
    cabin: 'classic',
    flag: 'sunshine',
    face: 'happy',
    accessory: 'none'
  });
  const options = Object.freeze({
    hull: Object.freeze([
      { id: 'coral', label: 'Coral', color: '#ee7974' },
      { id: 'lagoon', label: 'Lagoon', color: '#40add0' },
      { id: 'mint', label: 'Sea mint', color: '#5dc49d' },
      { id: 'violet', label: 'Violet', color: '#a88ada' },
      { id: 'sunshine', label: 'Sunshine', color: '#f5bd62' },
      { id: 'navy', label: 'Midnight', color: '#385c92' }
    ].map(Object.freeze)),
    cabin: Object.freeze([
      { id: 'classic', label: 'Classic', icon: '🏠' },
      { id: 'portholes', label: 'Portholes', icon: '⚓' },
      { id: 'lookout', label: 'Lookout', icon: '🔭' }
    ].map(Object.freeze)),
    flag: Object.freeze([
      { id: 'sunshine', label: 'Sunshine', color: '#ffda68' },
      { id: 'ocean', label: 'Ocean', color: '#4fc9c4' },
      { id: 'checker', label: 'Checker', color: '#ee86ba' },
      { id: 'starry', label: 'Starry', color: '#607fc3' },
      { id: 'rainbow', label: 'Rainbow', color: '#f2a0bd' }
    ].map(Object.freeze)),
    face: Object.freeze([
      { id: 'happy', label: 'Happy', icon: '😊' },
      { id: 'wink', label: 'Wink', icon: '😉' },
      { id: 'brave', label: 'Brave', icon: '😎' },
      { id: 'surprised', label: 'Surprised', icon: '😮' }
    ].map(Object.freeze)),
    accessory: Object.freeze([
      { id: 'none', label: 'None', icon: '➖' },
      { id: 'lifebuoy', label: 'Lifebuoy', icon: '🛟' },
      { id: 'star', label: 'Star badge', icon: '⭐' },
      { id: 'heart', label: 'Heart', icon: '💖' },
      { id: 'stripes', label: 'Racing stripes', icon: '🏁' }
    ].map(Object.freeze))
  });
  const hullColors = Object.freeze({
    coral: ['#ffb58c', '#ec7776', '#b75176'],
    lagoon: ['#9beafa', '#49b5d1', '#28759f'],
    mint: ['#bcf0c9', '#64c7a7', '#319683'],
    violet: ['#e0c4ff', '#aa89d5', '#765caa'],
    sunshine: ['#ffe7a3', '#f3bd6c', '#cd8654'],
    navy: ['#93b4df', '#5779b2', '#354f83']
  });
  const flagColors = Object.freeze({
    sunshine: '#fada70',
    ocean: '#55c5c9',
    checker: '#ea8abb',
    starry: '#5470b5',
    rainbow: '#f1a0c4'
  });
  const allowed = Object.fromEntries(
    Object.entries(options).map(([k, arr]) => [k, new Set(arr.map(o => o.id))])
  );

  function normalize(candidate) {
    const source = candidate && typeof candidate === 'object' ? candidate : {};
    const design = {};
    const inputName = typeof source.name === 'string' ? source.name : defaults.name;
    const cleanName = inputName.replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ').trim().slice(0, 18);
    design.name = cleanName || defaults.name;
    for (const field of Object.keys(options)) {
      design[field] = allowed[field].has(source[field]) ? source[field] : defaults[field];
    }
    return design;
  }
  function paint(candidate) {
    const design = normalize(candidate);
    const colors = hullColors[design.hull];
    return {
      hullLight: colors[0],
      hullMid: colors[1],
      hullShade: colors[2],
      deck: design.hull === 'navy' ? '#e8effe' : '#fff2d5',
      flag: flagColors[design.flag],
      line: '#174e71'
    };
  }
  function load() {
    try {
      const raw = window.localStorage && window.localStorage.getItem(KEY);
      return raw ? normalize(JSON.parse(raw)) : { ...defaults };
    } catch {
      return { ...defaults };
    }
  }
  let current = load();
  function getCurrent() { return { ...current }; }
  function save(candidate) {
    current = normalize(candidate);
    let persisted = false;
    try {
      if (window.localStorage) {
        window.localStorage.setItem(KEY, JSON.stringify(current));
        persisted = true;
      }
    } catch {
      // Private browsing or blocked storage: the design still applies this visit.
    }
    return { design: getCurrent(), persisted };
  }
  function randomDesign(random = Math.random) {
    const design = { name: current.name };
    for (const [field, values] of Object.entries(options)) {
      const sampled = Number(random());
      const n = Number.isFinite(sampled) ? Math.min(values.length - 1, Math.max(0, Math.floor(sampled * values.length))) : 0;
      design[field] = values[n].id;
    }
    return normalize(design);
  }
  window.BloopBoat = Object.freeze({
    defaults, options, normalize, paint, getCurrent, save, randomDesign, storageKey: KEY
  });
})();
