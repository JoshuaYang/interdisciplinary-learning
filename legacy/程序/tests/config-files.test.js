const test=require('node:test'),assert=require('node:assert/strict');
const files=require('../config-files.js'),core=require('../core.js');
const {config,bundle}=require('./fixtures.cjs');
const doc=id=>structuredClone(bundle.students.find(d=>d.formula.replace(/[·.]$/,'')===id));
const entry=(data,name='group.json')=>({data,name});
const point=(m,id)=>m.atoms.find(a=>a.id===id).position;
const distance=(m,a,b)=>Math.hypot(...point(m,a).map((v,i)=>v-point(m,b)[i]));
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('student descriptions are short; generated geometry preserves animation orientation',()=>{
 for(const d of bundle.students){assert(!('positions' in d));assert(!('bonds' in d));assert(files.stringify(d).trim().split('\n').length<=12);}
 for(const a of config.molecules.CH3.atoms)assert.equal(a.position[2],0);
 near(distance(config.molecules.CH4,'c','h4'),1.087);
 assert(Math.abs(core.compile(config)[0].atoms.H4.position[0]-1.2804)<.000002);
});
test('bond lengths drive all matching bonds while preserving teacher data and other groups',()=>{
 const d=doc('CH3Br');d['bondLengths']['C-H']=1.1;d['bondLengths']['C-Br']=1.94;
 const r=files.apply(config,[entry(d)]);assert.deepEqual(r.errors,[]);
 for(const h of ['h1','h2','h3'])near(distance(r.config.molecules.CH3Br,'c',h),1.1);
 near(distance(r.config.molecules.CH3Br,'c','br'),1.94);
 assert.deepEqual(r.config.steps,config.steps);assert.deepEqual(r.config.molecules.CH4,config.molecules.CH4);
 assert.deepEqual(r.config.molecules.CH3Br.measurements,config.molecules.CH3Br.measurements);
 assert.deepEqual(files.exportMolecule(r.config,'CH3Br'),d);
});
test('batch imports are atomic and duplicate submissions rejected',()=>{
 const good=doc('Br2');good['bondLengths']['Br-Br']=2.28;
 const bad=doc('CH4');delete bad['bondLengths'];
 const r=files.apply(config,[entry(good),entry(bad,'missing.json')]);assert(r.errors.some(e=>e.includes('missing.json')&&e.includes('bondLengths')));assert(!r.config);
 assert(files.apply(config,[entry(good),entry(good)]).errors.some(e=>e.includes('重复')));
});
test('successive imports merge and exports remain authored descriptions',()=>{
 const a=doc('Br2');a['bondLengths']['Br-Br']=2.28;
 const b=doc('CH3');b['bondLengths']['C-H']=1.08;
 const r=files.apply(config,[entry(a),entry(b)]);assert.deepEqual(r.errors,[]);assert.deepEqual(r.changed,['Br2','CH3']);
 const c=doc('HBr');c['bondLengths']['H-Br']=1.41;
 const next=files.apply(r.config,[entry(c)]);assert.deepEqual(files.exportMolecule(next.config,'Br2'),a);assert.deepEqual(files.exportMolecule(next.config,'CH3'),b);
 near(distance(next.config.molecules.Br2,'br1','br2'),2.28);
});
test('invalid chemistry, field names and numeric lengths have actionable errors',()=>{
 for(const mutate of [d=>delete d['center'],d=>d['neighbors']=['H'],d=>d['geometry']='linear',d=>delete d['unpairedElectrons'],d=>d.extra='typo',d=>d.formula='unknown',... [0,-1,11,'1 Å',NaN].map(v=>d=>d['bondLengths']['C-H']=v)]){
  const d=doc('CH3');mutate(d);assert(files.apply(config,[entry(d)]).errors.length);
 }
 assert(files.apply(config,[entry(null)]).errors.length);assert(files.apply(config,[]).errors.length);
});
test('shape choice and teacher angle control CH3Br geometry; atom list order is irrelevant',()=>{
 const d=doc('CH3Br');d['neighbors'].reverse();
 let r=files.apply(config,[entry(d)]);assert.deepEqual(r.errors,[]);assert.deepEqual(r.config.molecules.CH3Br.atoms,config.molecules.CH3Br.atoms);
 d['geometry']='regularTetrahedral';d.bondAngles={'H-C-H':109.47,'H-C-Br':109.47};r=files.apply(config,[entry(d)]);assert.deepEqual(r.errors,[]);assert(r.warnings.length);
 near(point(r.config.molecules.CH3Br,'h1')[2]/1.09,-1/3);
 const changed=structuredClone(bundle);changed.catalog.CH3Br.measurements.find(m=>m.atoms.length===3&&m.atoms.includes('br')).value=107;
 const c=files.assemble(changed);near(point(c.molecules.CH3Br,'h1')[2]/1.09,Math.cos(107.5*Math.PI/180));
});
test('all exports round-trip as independent English-key files',()=>{
 const exported=Object.keys(config.molecules).map(id=>entry(JSON.parse(files.stringify(files.exportMolecule(config,id)))));
 const result=files.apply(config,exported);assert.deepEqual(result.errors,[]);assert.deepEqual(result.config,config);
});
test('manifest paths cannot escape folders',()=>{
 files.checkManifest(bundle.project);
 for(const value of ['../CH4.json','http://example.test/a.json','.hidden.json']){const p=structuredClone(bundle.project);p.moleculeFiles[0]=value;assert.throws(()=>files.checkManifest(p));}
});

test('student angles drive coordinates and incompatible pairs reject atomically',()=>{
 const d=doc('CH3Br');d.bondAngles={'H-C-Br':107,'H-C-H':Math.acos(1.5*Math.cos(107*Math.PI/180)**2-.5)*180/Math.PI};
 const r=files.apply(config,[entry(d)]);assert.deepEqual(r.errors,[]);near(point(r.config.molecules.CH3Br,'h1')[2]/1.09,Math.cos(107*Math.PI/180));
 d.bondAngles['H-C-H']=120;assert(files.apply(config,[entry(d)]).errors.some(e=>e.includes('不相容')));
});
test('student metadata is retained and formula, angles and hybridization validated',()=>{
 const d=doc('CH4');d.name='小组甲烷';d.description='我们的结构说明';d.formula='CH₄';
 const r=files.apply(config,[entry(d)]);assert.deepEqual(r.errors,[]);assert.equal(r.config.molecules.CH4.name,d.name);assert.equal(r.config.molecules.CH4.description,d.description);
 for(const mutate of [x=>x.formula='CH3',x=>x.formula='CH4·',x=>x.hybridization='sp2',x=>delete x.bondAngles,x=>x.bondAngles['H-C-H']=100,x=>x.name='',x=>x.description=3]){const bad=structuredClone(d);mutate(bad);assert(files.apply(config,[entry(bad)]).errors.length);}
});
