/* Boat Studio dialog: browse, preview and save a cosmetic boat design.
 * Student data is never sent anywhere; only the design is saved locally.
 */
(function () {
  'use strict';
  const boat = window.BloopBoat;
  if (!boat || !window.BloopArt) return;
  const $ = id => document.getElementById(id);
  const dialog = $('boatStudio');
  const preview = $('boatPreview');
  if (!dialog || !preview) return;
  const previewCtx = preview.getContext('2d');
  const nameField = $('boatNameInput');
  const status = $('boatStudioStatus');
  const groups = {
    hull: $('boatHullChoices'),
    cabin: $('boatCabinChoices'),
    flag: $('boatFlagChoices'),
    face: $('boatFaceChoices'),
    accessory: $('boatAccessoryChoices')
  };
  const allButtons = [];
  let draft = boat.getCurrent();
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function optionButton(field, opt) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'studioOption';
    button.dataset.field = field;
    button.dataset.value = opt.id;
    button.setAttribute('aria-label', opt.label);
    const icon = document.createElement('span');
    icon.className = 'studioOptionIcon';
    icon.setAttribute('aria-hidden', 'true');
    if (opt.color) {
      icon.classList.add('studioOptionSwatch');
      icon.style.backgroundColor = opt.color;
    } else {
      icon.textContent = opt.icon || '★';
    }
    const label = document.createElement('span');
    label.textContent = opt.label;
    label.className = 'studioOptionLabel';
    button.appendChild(icon);
    button.appendChild(label);
    button.addEventListener('click', () => {
      draft[field] = opt.id;
      syncChoiceState();
      drawPreview();
    });
    allButtons.push(button);
    return button;
  }
  for (const [field, options] of Object.entries(boat.options)) {
    const container = groups[field];
    if (!container) continue;
    for (const opt of options) container.appendChild(optionButton(field, opt));
  }
  function syncChoiceState() {
    for (const button of allButtons) {
      const selected = draft[button.dataset.field] === button.dataset.value;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  }
  function drawPreview() {
    const c = previewCtx;
    const w = preview.width, h = preview.height;
    c.save();
    c.clearRect(0,0,w,h);
    const ocean = c.createLinearGradient(0,0,w,h);
    ocean.addColorStop(0,'#b9f2ec');
    ocean.addColorStop(1,'#68c7df');
    c.fillStyle = ocean;c.fillRect(0,0,w,h);
    c.strokeStyle = 'rgba(255,255,255,.38)';c.lineWidth=2;
    for (let y=55;y<h;y+=65) {
      c.beginPath();c.moveTo(0,y);
      c.bezierCurveTo(w*.28,y-13,w*.7,y+12,w,y-3);c.stroke();
    }
    c.translate(w/2,h/2+32);
    c.scale(2.55,2.55);
    // Constant preview pose; moving this preview does not control the game ship.
    window.BloopArt.drawBoat(c,{x:0,y:0,heading:0},reduceMotion?0:400,false,draft);
    c.restore();
    $('boatPreviewName').textContent = boat.normalize(draft).name;
  }
  function openStudio() {
    draft = boat.getCurrent();
    nameField.value = draft.name;
    status.textContent = 'All designs are free and purely cosmetic.';
    syncChoiceState();
    drawPreview();
    dialog.showModal();
    if (typeof nameField.focus === 'function') nameField.focus();
  }
  function closeStudio() { dialog.close(); }
  function saveDesign() {
    draft.name = nameField.value;
    const saved = boat.save(draft);
    $('playerBoatName').textContent = saved.design.name;
    $('boatStudioStatusLive').textContent = saved.persisted
      ? saved.design.name + ' design saved to this browser.'
      : saved.design.name + ' design applied for this visit. Browser storage is unavailable.';
    if (saved.persisted) {
      closeStudio();
    } else {
      status.textContent = 'Design applied for this visit, but browser storage is blocked.';
    }
  }
  $('boatStudioBtn').addEventListener('click',openStudio);
  $('boatStudioClose').addEventListener('click',closeStudio);
  $('boatStudioCancel').addEventListener('click',closeStudio);
  $('boatStudioSave').addEventListener('click',saveDesign);
  $('boatStudioReset').addEventListener('click',()=>{
    draft = { ...boat.defaults };
    nameField.value = draft.name;
    status.textContent = 'Default S.S. Wobble design previewed. Save to apply.';
    syncChoiceState();drawPreview();
  });
  $('boatStudioRandom').addEventListener('click',()=>{
    draft = { ...boat.randomDesign(), name: draft.name };
    status.textContent = 'Surprise design previewed. Save to apply.';
    syncChoiceState();drawPreview();
  });
  nameField.addEventListener('input',()=>{
    draft.name = nameField.value;
    $('boatPreviewName').textContent=boat.normalize(draft).name;
  });
  // Click only the dialog backdrop to close; buttons still behave normally.
  dialog.addEventListener('click',event=>{
    if(event.target===dialog)closeStudio();
  });
  $('playerBoatName').textContent=boat.getCurrent().name;
})();
