const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const core=require('../core.js');
const {config,bundle}=require('./fixtures.cjs');
const copy=()=>structuredClone(config);

test('all seven stages validate with no geometry warnings',()=>{
  const result=core.validate(config);
  assert.deepEqual(result.errors,[]);assert.deepEqual(result.warnings,[]);assert.equal(result.states.length,7);
});
test('atom identities, finite positions and retained bond lengths survive every transition',()=>{
  const states=core.compile(config), ids=Object.keys(states[0].atoms).sort();
  for(let index=1;index<7;index++)for(let p=0;p<=100;p++) {
    const sample=core.sample(config,states,index,p/100);
    assert.deepEqual(Object.keys(sample.atoms).sort(),ids);
    for(const a of Object.values(sample.atoms))assert(a.position.every(Number.isFinite));
    for(const k of Object.keys(states[index-1].bonds).filter(k=>states[index].bonds[k])) {
      const [a,b]=states[index].bonds[k].atoms;
      const dist=s=>core.length(core.sub(s.atoms[a].position,s.atoms[b].position));
      const min=Math.min(dist(states[index-1]),dist(states[index]))-.00001;
      const max=Math.max(dist(states[index-1]),dist(states[index]))+.00001;
      assert(dist(sample)>=min&&dist(sample)<=max,`${index} ${p}% ${k}`);
    }
  }
});
test('H4 is transferred to HBr; BrC attaches to carbon; radicals remain in the summary',()=>{
  const s=core.compile(config);
  assert(s[0].bonds[core.key(['C','H4'])]);assert(!s[3].bonds[core.key(['C','H4'])]);assert(s[3].bonds[core.key(['BrB','H4'])]);
  assert(s[5].bonds[core.key(['C','BrC'])]);assert(!s[5].bonds[core.key(['BrC','BrD'])]);
  assert.deepEqual(Object.values(s[6].atoms).filter(a=>a.radical).map(a=>a.id).sort(),['BrA','BrD']);
  assert.equal(s[6].atoms.C.radical,0);assert(s[6].bonds[core.key(['H4','BrB'])]);
});
test('CH3 is planar, CH4 tetrahedral, and CH3Br uses its own reference angles',()=>{
  assert(Math.abs(core.measure(config.molecules.CH3,['h1','c','h2'])-120)<.001);
  assert(Math.abs(core.measure(config.molecules.CH4,['h1','c','h2'])-109.471)<.001);
  assert(Math.abs(core.measure(config.molecules.CH3Br,['h1','c','br'])-107.5)<.001);
  assert(Math.abs(core.measure(config.molecules.CH3Br,['h1','c','h2'])-111.37)<.01);
});
test('opposite student coordinate directions do not collapse a retained bond through the carbon',()=>{
  const c=copy(), original=c.molecules.CH4.atoms.find(a=>a.id==='h1').position;
  c.molecules.CH3.atoms.find(a=>a.id==='h1').position=original.map(n=>-n/core.length(original)*1.079);
  const s=core.compile(c),mid=core.sample(c,s,3,.5);
  const distance=core.length(core.sub(mid.atoms.H1.position,mid.atoms.C.position));
  assert(Math.abs(distance-(core.length(original)+1.079)/2)<.00001);
});
test('invalid JSON shapes, atom references, disappearing atoms and wrong reaction edits are rejected',()=>{
  assert(core.validate(null).errors.length);
  for(const mutate of [
    c=>c.molecules.CH4.atoms[0].position=[1,2],
    c=>c.molecules.CH4.atoms[1].id='c',
    c=>c.molecules.CH4.bonds[0].atoms=['c','missing'],
    c=>c.molecules.CH3.atoms[0].radical=0,
    c=>c.steps[3].instances[0].atomMap.c='otherC',
    c=>c.steps[3].transition.breakBonds=[],
    c=>c.steps[6].instances.pop(),
    c=>c.steps[2].transition.duration=0,
    c=>c.steps[0].instances[0].atomMap.br1='BrB',
    c=>c.steps[4].instances[0].molecule='nonexistent',
    c=>c.sources='not an array',
    c=>c.molecules.CH4.reference={url:42},
  ]) {const c=copy();mutate(c);assert(core.validate(c).errors.length);}
});
test('geometry changes are measured from student coordinates and generate warnings',()=>{
  const c=copy();c.molecules.Br2.atoms[0].position[0]=-1.2;
  const result=core.validate(c);assert.equal(result.errors.length,0);assert(result.warnings.some(w=>w.includes('Br—Br')));
  const old=core.compile(config), updated=core.compile(c);
  assert.notDeepEqual(updated[0].atoms.BrA.position,old[0].atoms.BrA.position);
});
test('offline snapshot matches all split source files exactly',()=>{
  const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../离线配置.js'),'utf8'),context);
  assert.equal(JSON.stringify(context.window.CHEM_DEFAULT_FILES),JSON.stringify(bundle));
});
