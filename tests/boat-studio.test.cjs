/* Run from the repo root: node --test tests/boat-studio.test.cjs */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const styleCode = fs.readFileSync(path.join(root,'boat-style.js'),'utf8');
const studioCode = fs.readFileSync(path.join(root,'boat-studio.js'),'utf8');
const artCode = fs.readFileSync(path.join(root,'pass-a-art.js'),'utf8');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');

function harness({blockedStorage=false,initialDesign=null}={}) {
  const saved = new Map(), nodes = new Map();
  let paints = 0;
  const storage = {
    getItem(key) { if(blockedStorage) throw new Error('Storage blocked');return saved.get(key)||null; },
    setItem(key,value) { if(blockedStorage) throw new Error('Storage blocked');saved.set(key,value); }
  };
  const grad = { addColorStop() {} };
  const canvas = new Proxy({}, {
    get(_target,field) {
      if(field==='createLinearGradient'||field==='createRadialGradient')return()=>grad;
      if(field==='globalAlpha')return 1;
      return()=>{paints++;};
    },set(){return true;}
  });
  function node(tag='div') {
    const classes = new Set(), handlers = new Map();
    return {
      tagName:tag, textContent:'', value:'', type:'', className:'',
      dataset:{}, style:{}, attributes:{}, children:[], opened:false,
      width:tag==='canvas'?480:undefined, height:tag==='canvas'?280:undefined,
      handlers, classes,
      classList:{
        add(v){classes.add(v);},remove(v){classes.delete(v);},
        contains(v){return classes.has(v);},
        toggle(v,on){if(on)classes.add(v);else classes.delete(v);}
      },
      appendChild(child){this.children.push(child);},
      addEventListener(type,cb){handlers.set(type,cb);},
      setAttribute(k,v){this.attributes[k]=v;},
      getContext(){return canvas;},
      showModal(){this.opened=true;},
      close(){this.opened=false;},
      focus(){this.focused=true;}
    };
  }
  function get(id) {
    if(!nodes.has(id))nodes.set(id,node(id==='boatPreview'?'canvas':'div'));
    return nodes.get(id);
  }
  function click(element) {
    const n=typeof element==='string'?get(element):element;
    const fn=n.handlers.get('click');
    assert.equal(typeof fn,'function','Missing click handler');
    fn({target:n});
  }
  function type(value) {
    get('boatNameInput').value=value;
    get('boatNameInput').handlers.get('input')();
  }
  const window={
    localStorage:storage,
    matchMedia:()=>({matches:true})
  };
  const sandbox=vm.createContext({window,document:{
    getElementById:get,createElement:node
  }});
  if(initialDesign)saved.set('bloop-boat-design-v1',JSON.stringify(initialDesign));
  vm.runInContext(styleCode,sandbox,{filename:'boat-style.js'});
  vm.runInContext(artCode,sandbox,{filename:'pass-a-art.js'});
  vm.runInContext(studioCode,sandbox,{filename:'boat-studio.js'});
  const option=(field,value)=>{
    const n=get('boat'+field[0].toUpperCase()+field.slice(1)+'Choices')
      .children.find(b=>b.dataset.value===value);
    assert.ok(n,'Missing option '+field+'/'+value);
    return n;
  };
  return {get,click,type,option,window,saved,canvas,paints:()=>paints};
}

test('all five cosmetic categories are present and cannot change maths controls',()=>{
  const g=harness(),config=g.window.BloopBoat;
  assert.equal(config.options.hull.length,6);
  assert.equal(config.options.cabin.length,3);
  assert.equal(config.options.flag.length,5);
  assert.equal(config.options.face.length,4);
  assert.equal(config.options.accessory.length,5);
  for(const id of [
    'boatStudioBtn','boatStudio','boatPreview','boatNameInput',
    'boatStudioSave','boatStudioCancel','boatStudioReset','boatStudioRandom'
  ])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/boat-style\.js/);
  assert.match(html,/boat-studio\.js/);
  assert.match(html,/boat-studio\.css/);
  assert.match(html,/BloopBoat\?\.getCurrent\?\.\(\)/);
  assert.match(html,/RULER_LENGTH=8\*U/);
  assert.match(html,/id="protractorBtn"/);
});

test('the default hull and name survive invalid or oversized user styles',()=>{
  const g=harness(),b=g.window.BloopBoat;
  const result=b.normalize({
    name:'   Name with more than eighteen letters    ',
    hull:'fake',cabin:'lookout',flag:'not_a_flag',face:'wink',accessory:'invisible'
  });
  assert.equal(result.name.length,18);
  assert.equal(result.hull,'coral');
  assert.equal(result.cabin,'lookout');
  assert.equal(result.flag,'sunshine');
  assert.equal(result.face,'wink');
  assert.equal(result.accessory,'none');
});

test('Boat Studio previews changes, saves them, and restores them on reopening',()=>{
  const g=harness(),B=g.window.BloopBoat;
  g.click('boatStudioBtn');
  assert.equal(g.get('boatStudio').opened,true);
  assert.equal(g.get('boatNameInput').value,'S.S. Wobble');
  assert.equal(g.get('boatHullChoices').children.length,6);
  g.click(g.option('hull','lagoon'));
  g.click(g.option('cabin','lookout'));
  g.click(g.option('flag','rainbow'));
  g.click(g.option('face','wink'));
  g.click(g.option('accessory','lifebuoy'));
  g.type('S.S. Seastar');
  assert.equal(g.get('boatPreviewName').textContent,'S.S. Seastar');
  // Previewing never changes the player's saved boat.
  assert.equal(B.getCurrent().hull,'coral');
  g.click('boatStudioSave');
  assert.equal(g.get('boatStudio').opened,false);
  assert.equal(g.get('playerBoatName').textContent,'S.S. Seastar');
  assert.equal(B.getCurrent().hull,'lagoon');
  assert.equal(B.getCurrent().accessory,'lifebuoy');
  assert.equal(JSON.parse(g.saved.get(B.storageKey)).flag,'rainbow');
  g.click('boatStudioBtn');
  assert.equal(g.get('boatNameInput').value,'S.S. Seastar');
  assert.equal(g.option('hull','lagoon').attributes['aria-pressed'],'true');
  assert.ok(g.paints()>0,'Preview uses the real boat artwork');
});

test('cancel discards preview changes; reset and randomise require Save',()=>{
  const g=harness();
  g.click('boatStudioBtn');
  g.click(g.option('hull','navy'));
  g.click('boatStudioCancel');
  assert.equal(g.window.BloopBoat.getCurrent().hull,'coral');
  g.click('boatStudioBtn');
  g.click('boatStudioRandom');
  assert.equal(g.window.BloopBoat.getCurrent().hull,'coral');
  g.click('boatStudioReset');
  assert.equal(g.option('hull','coral').attributes['aria-pressed'],'true');
  g.click(g.option('accessory','heart'));
  g.click('boatStudioSave');
  assert.equal(g.window.BloopBoat.getCurrent().accessory,'heart');
});

test('blocked browser storage still applies the design for this visit',()=>{
  const g=harness({blockedStorage:true});
  g.click('boatStudioBtn');
  g.click(g.option('face','surprised'));
  g.click('boatStudioSave');
  assert.equal(g.window.BloopBoat.getCurrent().face,'surprised');
  assert.equal(g.get('boatStudio').opened,true);
  assert.match(g.get('boatStudioStatus').textContent,/storage is blocked/);
  assert.match(g.get('boatStudioStatusLive').textContent,/this visit/);
});

test('saved design loads on a fresh page and renders with all option values',()=>{
  const g=harness({initialDesign:{name:'Bloop Star',hull:'violet',
    cabin:'portholes',flag:'starry',face:'brave',accessory:'star'}});
  const b=g.window.BloopBoat;
  assert.equal(b.getCurrent().name,'Bloop Star');
  assert.equal(g.get('playerBoatName').textContent,'Bloop Star');
  const before=g.paints();
  for(const [field,all] of Object.entries(b.options)){
    for(const candidate of all){
      const design={...b.getCurrent(),[field]:candidate.id};
      g.window.BloopArt.drawBoat(g.canvas,{x:0,y:0,heading:0},100,false,design);
    }
  }
  assert.ok(g.paints()-before>500,'All looks were drawn without errors');
});
