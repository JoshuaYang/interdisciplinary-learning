/* Data and geometry layer: deliberately independent from the renderer. */
(function (root) {
  'use strict';
  const clamp = (n, a=0, b=1) => Math.min(b, Math.max(a, n));
  const mix = (a,b,t) => a+(b-a)*t;
  const lerp = (a,b,t) => a.map((n,i)=>mix(n,b[i],t));
  const sub = (a,b) => a.map((n,i)=>n-b[i]);
  const add = (a,b) => a.map((n,i)=>n+b[i]);
  const length = a => Math.hypot(...a);
  const key = pair => [...pair].sort().join('|');
  const smooth = t => (t=clamp(t),t*t*(3-2*t));
  const isObj = x => x && typeof x==='object' && !Array.isArray(x);
  const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
  const vec = a => Array.isArray(a) && a.length===3 && a.every(n=>Number.isFinite(n)&&Math.abs(n)<=100);
  function interpolateDirection(a,b,t) {
    const dot=clamp(a.reduce((s,n,i)=>s+n*b[i],0),-1,1);
    if(dot>.9999) {const v=lerp(a,b,t);return v.map(n=>n/length(v));}
    if(dot<-.9999) {
      const axis=Math.abs(a[0])<.8?[1,0,0]:[0,1,0];
      const cross=[a[1]*axis[2]-a[2]*axis[1],a[2]*axis[0]-a[0]*axis[2],a[0]*axis[1]-a[1]*axis[0]];
      const norm=length(cross);
      return a.map((n,i)=>n*Math.cos(Math.PI*t)+cross[i]/norm*Math.sin(Math.PI*t));
    }
    const angle=Math.acos(dot),sin=Math.sin(angle);
    return a.map((n,i)=>(n*Math.sin((1-t)*angle)+b[i]*Math.sin(t*angle))/sin);
  }
  function rotate(p, degrees=[0,0,0]) {
    let [x,y,z]=p;
    const [a,b,c]=degrees.map(n=>n*Math.PI/180);
    [y,z]=[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];
    [x,z]=[x*Math.cos(b)+z*Math.sin(b),-x*Math.sin(b)+z*Math.cos(b)];
    return [x*Math.cos(c)-y*Math.sin(c),x*Math.sin(c)+y*Math.cos(c),z];
  }
  function measure(molecule, ids) {
    const p=ids.map(id=>molecule.atoms.find(a=>a.id===id).position);
    if (ids.length===2) return length(sub(p[0],p[1]));
    const a=sub(p[0],p[1]), b=sub(p[2],p[1]);
    return Math.acos(clamp(a.reduce((s,n,i)=>s+n*b[i],0)/(length(a)*length(b)),-1,1))*180/Math.PI;
  }
  function compile(config) {
    return config.steps.map(step=>{
      const atoms=Object.create(null), bonds=Object.create(null);
      step.instances.forEach((inst,index)=>{
        const mol=config.molecules[inst.molecule];
        mol.atoms.forEach(a=>{
          const id=inst.atomMap[a.id];
          atoms[id]={id,element:a.element,position:add(rotate(a.position,inst.rotation),inst.position),radical:a.radical,
            opacity:inst.role==='context'?.28:1,molecule:inst.molecule,localId:a.id,instance:index};
        });
        mol.bonds.forEach(b=>{
          const ids=b.atoms.map(id=>inst.atomMap[id]);
          bonds[key(ids)]={atoms:ids,order:b.order,weight:1,opacity:inst.role==='context'?.28:1};
        });
      });
      return {atoms,bonds,step};
    });
  }
  function validate(config) {
    const errors=[], warnings=[];
    const err=m=>errors.push(m);
    if (!isObj(config)) return {errors:['配置最外层必须是一个 JSON 对象。'],warnings};
    if(config.version!==1) err('version 必须为 1。');
    if(config.units!=='angstrom') err('units 必须为 "angstrom"（Å）。');
    if(typeof config.title!=='string'||!config.title.trim()) err('请填写 title。');
    if(config.sources!==undefined&&(!Array.isArray(config.sources)||config.sources.some(s=>!isObj(s)||typeof s.title!=='string'||typeof s.url!=='string'))) err('sources 应是包含 title 和 url 的对象数组。');
    if(!isObj(config.molecules)) return {errors:[...errors,'缺少 molecules 分子结构对象。'],warnings};
    if(!Array.isArray(config.steps)||config.steps.length!==7) err('本项目需要恰好 7 个 steps。');
    const counts={CH4:{C:1,H:4},CH3:{C:1,H:3},CH3Br:{C:1,H:3,Br:1},Br2:{Br:2},Br:{Br:1},HBr:{H:1,Br:1}};
    for(const id of Object.keys(counts)) if(!own(config.molecules,id)) err(`缺少分子 ${id}。`);
    for(const [id,m] of Object.entries(config.molecules)) {
      const prefix=`molecules.${id}`;
      if(!isObj(m)||!Array.isArray(m.atoms)||m.atoms.length<1||m.atoms.length>20||!Array.isArray(m.bonds)) {err(`${prefix} 必须包含 atoms 和 bonds 数组。`);continue;}
      for(const field of ['name','formula','geometry']) if(typeof m[field]!=='string') err(`${prefix}.${field} 必须为文字。`);
      if(m.reference!==undefined&&(!isObj(m.reference)||['status','source','url'].some(f=>m.reference[f]!==undefined&&typeof m.reference[f]!=='string'))) err(`${prefix}.reference 应包含文字形式的 status、source、url。`);
      const ids=new Set(), total={}, degree=Object.create(null);
      let valid=true;
      for(const a of m.atoms) {
        if(!isObj(a)||typeof a.id!=='string'||!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(a.id)) {err(`${prefix} 中原子 id 应为字母开头的英文编号。`);valid=false;continue;}
        if(ids.has(a.id)) {err(`${prefix} 的原子编号 ${a.id} 重复。`);valid=false;}
        ids.add(a.id);degree[a.id]=0;
        if(!['C','H','Br'].includes(a.element)) {err(`${prefix}.${a.id} 的元素只能是 C、H 或 Br。`);valid=false;}
        total[a.element]=(total[a.element]||0)+1;
        if(!vec(a.position)) {err(`${prefix}.${a.id}.position 必须是三个有限数字（绝对值不超过 100）。`);valid=false;}
        if(a.radical!==0&&a.radical!==1) {err(`${prefix}.${a.id}.radical 必须是 0 或 1。`);valid=false;}
      }
      if(counts[id]&&JSON.stringify(Object.entries(total).sort())!==JSON.stringify(Object.entries(counts[id]).sort())) err(`${prefix} 原子组成不符：应为 ${Object.entries(counts[id]).map(([e,n])=>e+'×'+n).join('、')}。`);
      const seen=new Set();
      for(const b of m.bonds) {
        if(!isObj(b)||!Array.isArray(b.atoms)||b.atoms.length!==2||b.atoms.some(a=>!ids.has(a))||b.atoms[0]===b.atoms[1]) {err(`${prefix} 存在无效键引用，请检查两个原子编号。`);valid=false;continue;}
        if(b.order!==1) err(`${prefix} 本反应只使用单键，order 应为 1。`);
        if(seen.has(key(b.atoms))) err(`${prefix} 中 ${b.atoms.join('—')} 重复成键。`);
        seen.add(key(b.atoms));b.atoms.forEach(a=>degree[a]++);
        if(valid&&measure(m,b.atoms)<.1) err(`${prefix} 中 ${b.atoms.join('—')} 键长过小，请检查坐标。`);
      }
      if(valid) {
        for(const a of m.atoms) {
          const expected=(a.element==='C'?4:1)-a.radical;
          if(degree[a.id]!==expected) err(`${prefix}.${a.id} 的键数为 ${degree[a.id]}；按本反应的中性粒子与自由基标记，应为 ${expected}。`);
        }
        for(let i=0;i<m.atoms.length;i++) for(let j=i+1;j<m.atoms.length;j++) if(length(sub(m.atoms[i].position,m.atoms[j].position))<.1) err(`${prefix} 中 ${m.atoms[i].id} 与 ${m.atoms[j].id} 的坐标重叠。`);
      }
      if(!Array.isArray(m.measurements)) {err(`${prefix}.measurements 应为数组（可为空）。`);continue;}
      for(const q of m.measurements) {
        if(!isObj(q)||typeof q.label!=='string'||!Array.isArray(q.atoms)||![2,3].includes(q.atoms.length)||new Set(q.atoms).size!==q.atoms.length||q.atoms.some(a=>!ids.has(a))||!Number.isFinite(q.value)||q.value<=0||!Number.isFinite(q.tolerance)||q.tolerance<0) {err(`${prefix} 的 measurements 测量定义无效。`);continue;}
        if(valid) {
          const n=measure(m,q.atoms);
          if(!Number.isFinite(n)) err(`${prefix} 的 ${q.label} 无法计算，请检查重叠坐标。`);
          else if(Math.abs(n-q.value)>q.tolerance) warnings.push(`${m.formula} ${q.label}：坐标计算为 ${n.toFixed(q.atoms.length===2?3:2)}${q.atoms.length===2?' Å':'°'}，参考值为 ${q.value}，请检查。`);
        }
      }
    }
    if(errors.length) return {errors,warnings};
    config.steps.forEach((s,i)=>{
      const prefix=`第 ${i+1} 步`;
      if(!isObj(s)) {err(`${prefix} 必须为对象。`);return;}
      for(const f of ['title','shortTitle','phase','formula','description','note']) if(typeof s[f]!=='string') err(`${prefix} 缺少文字字段 ${f}。`);
      if(!Array.isArray(s.instances)||s.instances.length<1||s.instances.length>12) {err(`${prefix} 的 instances 应包含 1—12 个分子实例。`);return;}
      const global=new Set();
      for(const inst of s.instances) {
        if(!isObj(inst)||!own(config.molecules,inst.molecule)) {err(`${prefix} 引用了不存在的分子。`);continue;}
        if(!vec(inst.position)) err(`${prefix} 的 position 必须为三个数字（绝对值不超过 100）。`);
        if(!Array.isArray(inst.rotation)||inst.rotation.length!==3||inst.rotation.some(n=>!Number.isFinite(n)||Math.abs(n)>360)) err(`${prefix} 的 rotation 必须为三个角度（绝对值不超过 360）。`);
        if(!['focus','context'].includes(inst.role)) err(`${prefix} 的 role 必须是 focus 或 context。`);
        if(inst.caption!==undefined&&typeof inst.caption!=='string') err(`${prefix} 的 caption 必须为文字。`);
        if(!isObj(inst.atomMap)) {err(`${prefix} 缺少 atomMap。`);continue;}
        const local=config.molecules[inst.molecule].atoms.map(a=>a.id);
        if(Object.keys(inst.atomMap).length!==local.length||local.some(id=>!own(inst.atomMap,id))) err(`${prefix} 的 ${inst.molecule} atomMap 必须恰好映射每个原子。`);
        for(const id of Object.values(inst.atomMap)) {
          if(typeof id!=='string'||!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(id)) err(`${prefix} 的全局原子编号无效。`);
          if(global.has(id)) err(`${prefix} 的全局原子 ${id} 被重复使用。`);
          global.add(id);
        }
      }
      const t=s.transition;
      if(!isObj(t)||!['initial','initiation','reaction','reframe','summary'].includes(t.kind)||!Number.isFinite(t.duration)||(i>0?(t.duration<.2||t.duration>30):t.duration!==0)) {err(`${prefix} 的 transition 类型或 duration 无效。`);return;}
      if((i===0)!==(t.kind==='initial')) err('只有第 1 步可以使用 initial 过渡。');
      for(const field of ['breakBonds','formBonds']) if(!Array.isArray(t[field])||t[field].some(p=>!Array.isArray(p)||p.length!==2||p[0]===p[1]||p.some(a=>!global.has(a)))) err(`${prefix} 的 ${field} 包含无效全局原子编号。`);
    });
    if(errors.length) return {errors,warnings};
    const states=compile(config), all=states[0].atoms;
    states.forEach((s,i)=>{
      if(Object.keys(s.atoms).length!==Object.keys(all).length||Object.keys(all).some(id=>!s.atoms[id]||s.atoms[id].element!==all[id].element)) err(`第 ${i+1} 步的原子编号或元素与初始状态不一致，原子不能丢失或变成其他元素。`);
      if(!i)return;
      const prev=states[i-1], t=s.step.transition;
      for(const inst of prev.step.instances) {
        const same=s.step.instances.find(x=>x.molecule===inst.molecule&&JSON.stringify(Object.values(x.atomMap).sort())===JSON.stringify(Object.values(inst.atomMap).sort()));
        if(same&&JSON.stringify(Object.entries(same.atomMap).sort())!==JSON.stringify(Object.entries(inst.atomMap).sort())) err(`第 ${i+1} 步的 ${inst.molecule} 交换了未反应原子的映射；请保留 atomMap，用 rotation 改变分子朝向。`);
      }
      const removed=Object.keys(prev.bonds).filter(k=>!s.bonds[k]).sort();
      const added=Object.keys(s.bonds).filter(k=>!prev.bonds[k]).sort();
      if(JSON.stringify(removed)!==JSON.stringify(t.breakBonds.map(key).sort())) err(`第 ${i+1} 步 breakBonds 与前后结构实际断开的键不一致。`);
      if(JSON.stringify(added)!==JSON.stringify(t.formBonds.map(key).sort())) err(`第 ${i+1} 步 formBonds 与前后结构实际形成的键不一致。`);
      if(['reframe','summary'].includes(t.kind)&&(removed.length||added.length)) err(`第 ${i+1} 步是视图切换或总结，不能改变化学键。`);
    });
    return {errors,warnings,states};
  }
  function sample(config,states,index,progress) {
    if(index===0||progress>=1) return states[index];
    if(progress<=0) return states[index-1];
    const from=states[index-1],to=states[index], t=smooth(progress);
    const atoms=Object.create(null),bonds=Object.create(null),handled=new Set();
    for(const [id,a] of Object.entries(from.atoms)) {
      const b=to.atoms[id];
      const rt=smooth((progress-.28)/.42);
      atoms[id]={...b,position:lerp(a.position,b.position,t),opacity:mix(a.opacity,b.opacity,t),radical:mix(a.radical,b.radical,rt)};
    }
    // Rigid translations/rotations preserve a molecule's internal geometry.
    for(const inst of from.step.instances) {
      const signature=JSON.stringify(Object.entries(inst.atomMap).sort());
      const target=to.step.instances.find(x=>x.molecule===inst.molecule&&JSON.stringify(Object.entries(x.atomMap).sort())===signature);
      if(!target)continue;
      const position=lerp(inst.position,target.position,t);
      const angles=inst.rotation.map((a,i)=>a+(((target.rotation[i]-a+540)%360)-180)*t);
      for(const local of config.molecules[inst.molecule].atoms) {
        const id=inst.atomMap[local.id];
        atoms[id].position=add(rotate(local.position,angles),position);handled.add(id);
      }
    }
    // Retained C—H bonds keep their length during tetrahedral/planar relaxation.
    for(const [k,bond] of Object.entries(from.bonds)) {
      if(!to.bonds[k])continue;
      const c=bond.atoms.find(id=>from.atoms[id].element==='C');
      const h=bond.atoms.find(id=>from.atoms[id].element==='H');
      if(!c||!h||handled.has(h))continue;
      const a=sub(from.atoms[h].position,from.atoms[c].position), b=sub(to.atoms[h].position,to.atoms[c].position);
      const v=interpolateDirection(a.map(n=>n/length(a)),b.map(n=>n/length(b)),t);
      atoms[h].position=add(atoms[c].position,v.map(n=>n*mix(length(a),length(b),t)));
    }
    const rt=smooth((progress-.2)/.5);
    for(const k of new Set([...Object.keys(from.bonds),...Object.keys(to.bonds)])) {
      const a=from.bonds[k],b=to.bonds[k];
      bonds[k]={...(b||a),weight:a&&b?1:a?1-rt:rt,opacity:mix(a?.opacity??b.opacity,b?.opacity??a.opacity,t)};
    }
    return {atoms,bonds,step:to.step};
  }
  const api={validate,compile,sample,measure,rotate,key,smooth,lerp,length,sub};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ChemCore=api;
})(typeof window!=='undefined'?window:globalThis);
