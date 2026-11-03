(function () {
  'use strict';
  const $=id=>document.getElementById(id), core=window.ChemCore, files=window.ChemFiles;
  let config,states,index=0,progress=1,playing=false,continuous=false,hold=0,showMeasurements=false,showContext=false;
  let last=0,sourceName='',selection=null,toastTimer,modelReady=false,animating=false;
  let scene,renderer,camera,root,raycaster,shadowPlane;
  const meshes=new Map(),bonds=new Map(),labelNodes=[];
  const colors={C:0x3d5047,H:0xf6f7ed,Br:0x9e382b};
  const radii={C:.36,H:.245,Br:.46};
  const rotation={x:.10,y:.12}, zoom={value:1};
  let currentState,width=1,height=1,sphereGeo,cylinderGeo,shadowGeometry,shadowMaterial;
  const textures=new Map();
  const pointer=new Map();
  let gesture=null,dragDistance=0;
  let loadRevision=0;

  // 基础数据包缓存（教师配置与默认文件）
  let baseData={project:null,catalog:null,steps:null,students:null};

  // 6 种必须的分子槽位定义（仅序号、分子名与化学式，无构型提示）
  const REQUIRED_SLOTS=[
    {id:'CH4',num:'01',name:'甲烷',formula:'CH4',formulaHtml:'CH<sub>4</sub>'},
    {id:'CH3',num:'02',name:'甲基自由基',formula:'CH3·',formulaHtml:'CH<sub>3</sub>·'},
    {id:'CH3Br',num:'03',name:'一溴甲烷',formula:'CH3Br',formulaHtml:'CH<sub>3</sub>Br'},
    {id:'Br2',num:'04',name:'溴单质',formula:'Br2',formulaHtml:'Br<sub>2</sub>'},
    {id:'HBr',num:'05',name:'溴化氢',formula:'HBr',formulaHtml:'HBr'},
    {id:'Br',num:'06',name:'溴自由基',formula:'Br·',formulaHtml:'Br·'}
  ];

  // 第二步反应链路拼装可用微粒池（含链终止偶联生成的乙烷）
  const POOL_MOLECULES=[
    ...REQUIRED_SLOTS,
    {id:'CH3CH3',num:'07',name:'乙烷',formula:'CH3CH3',formulaHtml:'CH<sub>3</sub>CH<sub>3</sub>'}
  ];

  // 槽位状态映射：id -> { status: 'empty'|'valid'|'error', doc, mol, error, warnings }
  const slotState=new Map();
  REQUIRED_SLOTS.forEach(s=>slotState.set(s.id,{status:'empty',doc:null,mol:null,error:null,warnings:[]}));

  function toast(message) {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4200);
  }
  function textNode(tag,text,className) {const n=document.createElement(tag);n.textContent=text;if(className)n.className=className;return n;}
  function showDialog(id) {pause();$(id).showModal();}

  function report(result,accepted) {
    const area=$('validation-result');if(!area)return;area.replaceChildren();
    area.className=result.errors.length?'error':result.warnings.length?'warning':'';
    const message=result.errors.length?'未加载：请修正以下问题。当前仍保留上一次有效配置。':result.warnings.length?'已加载，但有结构测量值需要检查。':`配置检查通过 · ${Object.keys(states[0].atoms).length} 个原子 · 7 个画面`;
    area.append(textNode('strong',message));
    const issues=[...result.errors,...result.warnings];
    if(issues.length) {const ul=document.createElement('ul');issues.slice(0,30).forEach(x=>ul.append(textNode('li',x)));area.append(ul);if(issues.length>30)area.append(textNode('p',`另有 ${issues.length-30} 条问题，请逐项修正后重新导入。`));}
    if(accepted) $('config-source').textContent=sourceName;
  }

  function references() {
    const list=$('reference-list');if(!list)return;list.replaceChildren();
    $('reference-note').textContent=(config.dataStatus||'请核对结构数据来源')+'。键长与键角由自动生成的结构坐标计算；球体大小和反应路径仅作教学示意。';
    Object.values(config.molecules).forEach(m=>{
      if(!m.reference?.url)return;
      const row=document.createElement('div');
      const link=document.createElement('a');
      try {const u=new URL(m.reference.url);if(!['https:','http:'].includes(u.protocol))return;link.href=u.href;}catch{return;}
      link.textContent=`${m.formula} · ${m.reference.source||'结构来源'}`;link.target='_blank';link.rel='noopener noreferrer';
      row.append(link,textNode('span',`　${m.reference.status||'请核对来源'}`));list.append(row);
    });
    for(const s of config.sources||[]) {
      if(typeof s?.url!=='string'||typeof s?.title!=='string')continue;
      try {const u=new URL(s.url);if(!['https:','http:'].includes(u.protocol))continue;const a=textNode('a',s.title);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';list.append(a);}catch{}
    }
    const select=$('export-molecule'),selected=select.value;select.replaceChildren();
    for(const [id,m] of Object.entries(config.molecules)){const option=textNode('option',`${m.formula} · ${m.name}`);option.value=id;select.append(option);}
    if(Object.prototype.hasOwnProperty.call(config.molecules,selected))select.value=selected;
  }

  // 步骤反应推演状态管理
  let unlockedMaxStep = 0; // 当前已解锁的最大步骤索引 (0 表示第 1 步已解锁)
  const solvedSteps = new Set([0]); // 已正确推演通过的步骤集合 (步骤 0 初始分子默认解锁)

  function renderDeductionCard(stepIndex) {
    const card = $('deduction-card');
    if (!card || !window.ChemDeduction) return;
    card.hidden = false;
    const statusBadge = $('deduction-status');
    const body = $('deduction-body');
    const feedback = $('deduction-feedback');
    const submitBtn = $('deduction-submit-btn');

    body.replaceChildren();
    feedback.hidden = true;
    feedback.textContent = '';
    feedback.className = 'deduction-feedback';

    const stepData = ChemDeduction.STEPS_DATA[stepIndex];
    if (!stepData) return;

    if (stepIndex === 0) {
      statusBadge.textContent = '✓ 初始观察';
      statusBadge.className = 'deduction-status-badge solved';
      submitBtn.hidden = true;
      const box = document.createElement('div');
      box.className = 'deduction-summary-box';
      box.innerHTML = `<strong>初始观察：</strong>${stepData.summary}<br><span style="color:var(--muted);font-size:14px;margin-top:8px;display:inline-block;">👉 观察完毕后，请点击左侧导航栏<strong>「02 光照激发」</strong>开始本步微观反应机理推演。</span>`;
      body.append(box);
      return;
    }

    if (solvedSteps.has(stepIndex)) {
      statusBadge.textContent = '✓ 推演已通过';
      statusBadge.className = 'deduction-status-badge solved';
      submitBtn.hidden = false;
      submitBtn.textContent = '↻ 再次播放本步 3D 动画';
      submitBtn.onclick = () => go(stepIndex, true);
      const box = document.createElement('div');
      box.className = 'deduction-summary-box';
      box.innerHTML = `<strong>本步推演结论：</strong>${stepData.summary}`;
      body.append(box);
      return;
    }

    // 当前待推演步骤
    if (stepIndex <= unlockedMaxStep + 1) {
      statusBadge.textContent = '待推演';
      statusBadge.className = 'deduction-status-badge pending';
      submitBtn.hidden = false;
      submitBtn.textContent = '检验反应推演';
      submitBtn.onclick = handleDeductionSubmit;

      const fieldPhase = document.createElement('div');
      fieldPhase.className = 'deduction-field';
      fieldPhase.append(textNode('label', '1. 本步属于自由基取代的哪个阶段？', 'deduction-label'));
      const selPhase = document.createElement('select');
      selPhase.id = 'deduce-phase';
      selPhase.className = 'deduction-select';
      selPhase.append(new Option('-- 请选择阶段 --', ''));
      stepData.phaseOptions.forEach(opt => selPhase.append(new Option(opt, opt)));
      selPhase.value = stepData.phase; // 开发模式：默认预填
      fieldPhase.append(selPhase);

      const fieldEq = document.createElement('div');
      fieldEq.className = 'deduction-field';
      fieldEq.append(textNode('label', `2. ${stepData.fieldLabel || '微粒变化与反应式'}？`, 'deduction-label'));
      const selEq = document.createElement('select');
      selEq.id = 'deduce-equation';
      selEq.className = 'deduction-select';
      selEq.append(new Option('-- 请选择 --', ''));
      stepData.equationOptions.forEach(opt => selEq.append(new Option(opt, opt)));
      selEq.value = stepData.equation; // 开发模式：默认预填
      fieldEq.append(selEq);

      const fieldBreak = document.createElement('div');
      fieldBreak.className = 'deduction-field';
      fieldBreak.append(textNode('label', '3. 本步发生断裂的共价键？', 'deduction-label'));
      const selBreak = document.createElement('select');
      selBreak.id = 'deduce-break';
      selBreak.className = 'deduction-select';
      selBreak.append(new Option('-- 请选择断键 --', ''));
      stepData.breakBondOptions.forEach(opt => selBreak.append(new Option(opt, opt)));
      selBreak.value = stepData.breakBond; // 开发模式：默认预填
      fieldBreak.append(selBreak);

      const fieldForm = document.createElement('div');
      fieldForm.className = 'deduction-field';
      fieldForm.append(textNode('label', '4. 本步新生成的共价键？', 'deduction-label'));
      const selForm = document.createElement('select');
      selForm.id = 'deduce-form';
      selForm.className = 'deduction-select';
      selForm.append(new Option('-- 请选择成键 --', ''));
      stepData.formBondOptions.forEach(opt => selForm.append(new Option(opt, opt)));
      selForm.value = stepData.formBond; // 开发模式：默认预填
      fieldForm.append(selForm);

      body.append(fieldPhase, fieldEq, fieldBreak, fieldForm);
      return;
    }

    // 未解锁步骤
    statusBadge.textContent = '🔒 未解锁';
    statusBadge.className = 'deduction-status-badge locked';
    submitBtn.hidden = true;
    const box = document.createElement('div');
    box.className = 'deduction-summary-box';
    box.style.background = '#f4f6f1';
    box.style.borderLeftColor = '#a7b4a2';
    box.style.color = '#6d7b69';
    box.innerHTML = `🔒 <strong>尚未解锁：</strong>请先完成第 ${unlockedMaxStep + 2} 步的反应推演，遵循化学反应发生的时序逐步探究。`;
    body.append(box);
  }

  function handleDeductionSubmit() {
    const selPhase = $('deduce-phase');
    const selEq = $('deduce-equation');
    const selBreak = $('deduce-break');
    const selForm = $('deduce-form');
    const feedback = $('deduction-feedback');
    if (!selPhase || !selEq || !selBreak || !selForm) return;

    const phase = selPhase.value;
    const equation = selEq.value;
    const breakBond = selBreak.value;
    const formBond = selForm.value;

    if (!phase || !equation || !breakBond || !formBond) {
      feedback.className = 'deduction-feedback error';
      feedback.textContent = '请完整选择全部 4 项推演内容后再进行核验。';
      feedback.hidden = false;
      return;
    }

    const res = ChemDeduction.verify(index, { phase, equation, breakBond, formBond });
    if (!res.ok) {
      feedback.className = 'deduction-feedback error';
      feedback.textContent = res.hint;
      feedback.hidden = false;
      return;
    }

    feedback.className = 'deduction-feedback success';
    feedback.textContent = '🎉 推演正确！正在呈现三维分子动态变化…';
    feedback.hidden = false;

    solvedSteps.add(index);
    unlockedMaxStep = Math.max(unlockedMaxStep, index);

    go(index, true);

    if (solvedSteps.size === 7) {
      toast('🎉 恭喜！已完成全部 7 步反应机理推演，全流程连续播放已解锁！');
    } else {
      toast(`第 ${index + 1} 步推演通过！已解锁下一步。`);
    }

    updateControls();
    setTimeout(() => {
      renderDeductionCard(index);
    }, 1200);
  }

  function unlockAllSteps() {
    for (let i = 0; i < 7; i++) solvedSteps.add(i);
    unlockedMaxStep = 6;
    updateStep();
    updateControls();
  }

  function resetDeduction() {
    solvedSteps.clear();
    solvedSteps.add(0);
    unlockedMaxStep = 0;
    updateStep();
    updateControls();
  }

  function install(data,name) {
    let result;
    try {result=core.validate(data);}catch(e){result={errors:['配置结构无法读取，请检查字段类型。'+e.message],warnings:[]};}
    if(result.errors.length) {report(result,false);return false;}
    pause();config=data;states=result.states;sourceName=name;index=0;progress=1;selection=null;currentState=null;
    document.querySelector('.identity h1').textContent=config.title;
    document.title=config.title+' · 反应可视化';
    const nav=$('steps');nav.replaceChildren();
    config.steps.forEach((s,i)=>{
      const b=document.createElement('button');b.className='step-button';b.dataset.index=i;b.setAttribute('aria-label',`第 ${i+1} 步：${s.title}`);
      b.append(textNode('span',String(i+1).padStart(2,'0'),'step-num mono'));
      const text=textNode('span','','step-text');text.append(textNode('span',s.shortTitle,'step-name'));b.append(text);
      b.addEventListener('click',()=>go(i,false));nav.append(b);
    });
    if(!modelReady)initScene();
    buildModel();
    references();report(result,true);resetView();updateStep();renderState();
    return true;
  }

  function updateStep() {
    if(!config)return;
    const s=config.steps[index];
    const isSolved = solvedSteps.has(index);
    if($('step-count')) $('step-count').textContent=String(index+1).padStart(2,'0')+' / 07';
    if($('phase')) $('phase').textContent=s.phase;
    for(const [id,key] of [['step-title','title'],['step-description','description'],['step-note','note']]){
      const el = $(id);
      if(el) el.textContent = s[key];
    }
    if($('equation')) $('equation').textContent = s['formula'];
    if($('equation-caption')) $('equation-caption').textContent = index === 0 ? '当前粒子' : isSolved ? (index===6?'净反应':index===1?'引发反应':[3,5].includes(index)?'链增长':'当前粒子') : '本步反应';
    if($('equation-condition')) $('equation-condition').textContent = [1,6].includes(index)?'光照 hν':'';
    $('light-cue').hidden=index!==1;

    document.querySelectorAll('.step-button').forEach((b,i)=>{
      const isSolved = solvedSteps.has(i);
      const isLocked = i > unlockedMaxStep + 1;
      const isCurrentTask = i === unlockedMaxStep + 1;
      b.classList.toggle('solved', isSolved);
      b.classList.toggle('locked', isLocked);
      b.classList.toggle('current-task', isCurrentTask);
      const numSpan = b.querySelector('.step-num');
      if (numSpan) {
        if (isSolved) {
          numSpan.textContent = '✓';
        } else if (isLocked) {
          numSpan.textContent = '🔒';
        } else {
          numSpan.textContent = String(i + 1).padStart(2, '0');
        }
      }
      if(i===index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
    });

    $('viewport').setAttribute('aria-label',`第 ${index+1} 步：${s.description} 拖动旋转，滚轮缩放。`);
    updateLabels();updateControls();updateMeasurements();renderDeductionCard(index);
  }

  function updateControls() {
    if(!config)return;
    const allSolved = solvedSteps.size === 7;
    const isCurrentSolved = solvedSteps.has(index);

    $('prev').disabled=index===0;
    $('next').disabled=index>=6 || index>unlockedMaxStep;
    $('replay').disabled=!isCurrentSolved || index===0;
    $('progress').disabled=!isCurrentSolved || index===0;

    // 只要当前步骤已通过或处于全通关，主播放按钮永远可用！
    $('play').disabled = !isCurrentSolved;

    if(playing) {
      $('play-icon').textContent = 'Ⅱ';
      $('play-text').textContent = '暂停';
      $('play').title = '暂停动画 (空格)';
    } else if(progress < 1) {
      $('play-icon').textContent = '▶';
      $('play-text').textContent = '继续播放';
      $('play').title = '继续播放当前动画 (空格)';
    } else if(allSolved) {
      $('play-icon').textContent = '▶';
      $('play-text').textContent = index === 6 ? '从头播放' : '连续播放';
      $('play').title = '全流程连续播放 (空格)';
    } else {
      $('play-icon').textContent = '↻';
      $('play-text').textContent = '重播本步';
      $('play').title = '重播本步反应动画 (空格)';
    }
    $('play').setAttribute('aria-label', $('play-text').textContent);
  }

  function go(i,animate) {
    if(!config)return;
    if(i<0||i>6)return;
    if(i>unlockedMaxStep+1){
      toast(`🔒 第 ${i+1} 步尚未解锁，请先完成前序步骤推演。`);
      return;
    }
    pause();index=i;
    const isSolved=solvedSteps.has(index);
    progress=animate&&isSolved&&index>0?0:isSolved?1:0;hold=0;
    playing=animate&&isSolved&&index>0;continuous=false;selection=null;updateStep();renderState();
  }
  function pause() {playing=false;continuous=false;hold=0;updateControls();}
  function play() {
    if(!config||!modelReady)return;
    const allSolved = solvedSteps.size === 7;
    const isCurrentSolved = solvedSteps.has(index);

    if(!isCurrentSolved) {
      toast('🔒 请先完成本步反应推演并检验，即可解锁动画播放。');
      return;
    }

    if(playing) {
      pause();
      return;
    }

    // 单步推演通过后，点击主按钮即可反复重播本步！
    if(!allSolved) {
      go(index, true);
      return;
    }

    // 全通关模式下：连续播放
    continuous = true;
    playing = true;
    hold = 0;
    if(progress === 1) {
      index = index === 6 ? 1 : index + 1;
      progress = 0;
      selection = null;
      updateStep();
    }
    updateControls();
  }
  function restart() {pause();index=0;progress=1;selection=null;resetView();updateStep();renderState();}
  function resetView() {rotation.x=.10;rotation.y=.12;zoom.value=1;resize();}

  function initScene() {
    if(modelReady)return;
    if(!window.THREE)throw new Error('三维组件未加载，请保留完整的「程序」文件夹。');
    const T=window.THREE;
    renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:false});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputEncoding=T.sRGBEncoding;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    $('viewport').append(renderer.domElement);
    scene=new T.Scene();camera=new T.OrthographicCamera(-6,6,3,-3,.1,100);camera.position.set(0,-.35,20);camera.lookAt(0,-.35,0);
    root=new T.Group();scene.add(root);
    scene.add(new T.HemisphereLight(0xffffff,0x929e82,.55));
    const light=new T.DirectionalLight(0xfff9e8,1.3);light.position.set(-4,7,9);light.castShadow=true;light.shadow.mapSize.set(1024,1024);
    light.shadow.camera.left=-10;light.shadow.camera.right=10;light.shadow.camera.top=8;light.shadow.camera.bottom=-8;light.shadow.bias=-.002;scene.add(light);
    const fill=new T.DirectionalLight(0xe1efcf,.35);fill.position.set(7,-2,5);scene.add(fill);
    shadowGeometry=new T.PlaneGeometry(35,25);shadowMaterial=new T.ShadowMaterial({opacity:.065});
    shadowPlane=new T.Mesh(shadowGeometry,shadowMaterial);shadowPlane.visible=false;
    sphereGeo=new T.SphereGeometry(1,40,28);cylinderGeo=new T.CylinderGeometry(1,1,1,16);
    raycaster=new T.Raycaster();modelReady=true;
    new ResizeObserver(resize).observe($('stage'));
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();$('load-error').textContent='三维绘图连接中断，请刷新页面恢复。';$('load-error').hidden=false;});
    if(!animating){animating=true;requestAnimationFrame(frame);}
  }

  function elementTexture(element) {
    if(textures.has(element))return textures.get(element);
    const c=document.createElement('canvas');c.width=128;c.height=128;
    const ctx=c.getContext('2d');ctx.font='500 66px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=(element==='C'||element==='Br')?'#ffffff':'#344b29';ctx.fillText(element,64,66);
    const texture=new THREE.CanvasTexture(c);texture.encoding=THREE.sRGBEncoding;textures.set(element,texture);return texture;
  }
  function buildModel() {
    for(const obj of meshes.values()) {root.remove(obj.mesh,obj.label,obj.dot);obj.mesh.material.dispose();obj.label.material.dispose();obj.dot.material.dispose();}
    for(const pair of bonds.values())for(const m of pair){root.remove(m);m.material.dispose();}
    meshes.clear();bonds.clear();
    for(const [id,a] of Object.entries(states[0].atoms)) {
      const material=new THREE.MeshStandardMaterial({color:new THREE.Color(colors[a.element]).convertSRGBToLinear(),roughness:.36,metalness:0,transparent:true});
      const mesh=new THREE.Mesh(sphereGeo,material);mesh.scale.setScalar(radii[a.element]);mesh.castShadow=true;mesh.userData.id=id;
      const label=new THREE.Sprite(new THREE.SpriteMaterial({map:elementTexture(a.element),transparent:true,depthTest:true,depthWrite:false,toneMapped:false}));label.scale.setScalar(radii[a.element]*1.14);
      const dot=new THREE.Mesh(sphereGeo,new THREE.MeshBasicMaterial({color:0xaa642c,transparent:true}));dot.scale.setScalar(.075);
      root.add(mesh,label,dot);meshes.set(id,{mesh,label,dot,element:a.element});
    }
    const allBonds=new Map();states.forEach(s=>Object.entries(s.bonds).forEach(([k,b])=>allBonds.set(k,b)));
    for(const [k,b] of allBonds) {
      const pair=b.atoms.map(id=>new THREE.Mesh(cylinderGeo,new THREE.MeshStandardMaterial({color:new THREE.Color(colors[states[0].atoms[id].element]).convertSRGBToLinear(),roughness:.5,transparent:true})));
      pair.forEach(m=>{m.castShadow=true;root.add(m);});bonds.set(k,pair);
    }
    modelReady=true;
  }
  function resize() {
    if(!modelReady)return;
    const rect=$('stage').getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);
    renderer.setSize(width,height);const aspect=width/height;
    const halfHeight=Math.max(3.12,5.85/aspect)/zoom.value;
    camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();
    if(currentState)draw(currentState);
  }
  function worldToScreen(position) {
    const v=new THREE.Vector3(...position);root.localToWorld(v);v.project(camera);
    return {x:(v.x*.5+.5)*width,y:(-.5*v.y+.5)*height};
  }
  let currentLabelKey = '';
  function getStepInstances(stepIdx, prog) {
    if(!config) return [];
    // 化学反应发生步骤：index 1 (均裂), index 3 (夺氢), index 5 (成键)
    // 反应发生并完成断键成键前 (prog < 0.6)，三维模型处于反应前初始状态，标签应对应起始微粒
    if([1, 3, 5].includes(stepIdx) && prog < 0.6) {
      if(stepIdx === 1) {
        return [
          { molecule: "Br2", role: "focus", atomMap: { br1: "BrA", br2: "BrB" } },
          { molecule: "CH4", role: "context", atomMap: { c: "C", h1: "H1", h2: "H2", h3: "H3", h4: "H4" }, caption: "CH₄ · 尚未反应" },
          { molecule: "Br2", role: "context", atomMap: { br1: "BrD", br2: "BrC" }, caption: "另一分子 Br₂" }
        ];
      }
      return config.steps[stepIdx - 1].instances;
    }
    return config.steps[stepIdx].instances;
  }
  function updateLabels(force = false) {
    if(!config)return;
    const isReact = [1, 3, 5].includes(index);
    const phase = (isReact && progress < 0.6) ? 'pre' : 'post';
    const key = `${index}_${phase}`;
    if(!force && key === currentLabelKey) return;
    currentLabelKey = key;

    $('labels').replaceChildren();labelNodes.length=0;
    const instances = getStepInstances(index, progress);
    for(const inst of instances) {
      const m=config.molecules[inst.molecule];
      if(!m) continue;
      const n=document.createElement('div');n.className='molecule-label'+(inst.role==='context'?' context':'');
      n.append(textNode('strong',inst.caption||m.formula),textNode('small',m.name));$('labels').append(n);labelNodes.push({node:n,inst});
    }
  }
  function draw(state) {
    if(!modelReady)return;
    root.rotation.set(rotation.x,rotation.y,0);root.updateMatrixWorld(true);
    const inv=root.quaternion.clone().invert();
    const front=new THREE.Vector3(0,0,1).applyQuaternion(inv);
    const right=new THREE.Vector3(1,0,0).applyQuaternion(inv),up=new THREE.Vector3(0,1,0).applyQuaternion(inv);
    for(const [id,a] of Object.entries(state.atoms)) {
      const obj=meshes.get(id);if(!obj)continue;
      const isContext=a.opacity<.5;
      if(isContext&&!showContext){
        obj.mesh.visible=false;obj.label.visible=false;obj.dot.visible=false;
        continue;
      }
      obj.mesh.visible=true;obj.label.visible=true;
      const radius=radii[a.element];obj.mesh.position.fromArray(a.position);obj.mesh.material.opacity=a.opacity;
      obj.mesh.material.depthWrite=a.opacity>.7;obj.mesh.castShadow=a.opacity>.7;
      obj.mesh.material.emissive.setHex(selection===id?0x52663a:0x000000);obj.mesh.material.emissiveIntensity=.35;
      obj.label.position.copy(obj.mesh.position).addScaledVector(front,radius+.02);obj.label.material.opacity=a.opacity;
      obj.dot.position.copy(obj.mesh.position).addScaledVector(right,radius*.9).addScaledVector(up,radius*.9).addScaledVector(front,.05);
      obj.dot.material.opacity=a.radical*a.opacity;obj.dot.visible=a.radical>.01;obj.dot.material.depthWrite=a.opacity>.7;
    }
    const axis=new THREE.Vector3(0,1,0);
    for(const [k,pair] of bonds) {
      const b=state.bonds[k];
      if(!b||b.weight<.01||(b.opacity<.5&&!showContext)){pair.forEach(m=>m.visible=false);continue;}
      const a=new THREE.Vector3(...state.atoms[b.atoms[0]].position), z=new THREE.Vector3(...state.atoms[b.atoms[1]].position),direction=z.clone().sub(a),len=direction.length();
      pair.forEach((m,i)=>{
        m.visible=true;m.position.copy(a).lerp(z,i===0?.25:.75);m.quaternion.setFromUnitVectors(axis,direction.clone().normalize());m.scale.set(.065,len/2,.065);
        m.material.opacity=b.weight*b.opacity;m.material.depthWrite=m.material.opacity>.8;m.castShadow=m.material.opacity>.8;
      });
    }
    root.updateMatrixWorld(true);renderer.render(scene,camera);
    for(const {node,inst} of labelNodes) {
      if(inst.role==='context'&&!showContext){
        node.style.display='none';
        continue;
      }
      node.style.display='';
      const positions=Object.values(inst.atomMap).map(id=>worldToScreen(state.atoms[id].position));
      const x=positions.reduce((s,p)=>s+p.x,0)/positions.length;
      const bottom=Math.max(...positions.map(p=>p.y));
      const maxRadius=Math.max(...Object.values(inst.atomMap).map(id=>radii[state.atoms[id].element]));
      const offset=maxRadius*height/(camera.top-camera.bottom)+9;
      node.style.left=Math.max(72,Math.min(width-72,x))+'px';
      node.style.top=Math.min(height-35,bottom+offset)+'px';
      node.style.opacity='1';
    }
    $('light-cue').style.opacity=index===1?String(.4+.6*Math.sin(Math.PI*Math.min(progress,1))):'0';
    if(selection&&state.atoms[selection]) {
      const a=state.atoms[selection];$('atom-detail').hidden=false;
      $('atom-detail').replaceChildren(textNode('strong',`${a.element} · 原子 ${selection}`),document.createElement('br'),textNode('span',`场景坐标 (${a.position.map(n=>n.toFixed(3)).join(', ')}) Å`),document.createElement('br'),textNode('span',a.radical>.95?'含一个未成对电子':progress<1?'反应过渡中':'无自由基标记'));
    } else $('atom-detail').hidden=true;
  }
  function updateMeasurements() {
    const strip=$('measurement-strip');strip.hidden=!showMeasurements;if(!showMeasurements||!config)return;strip.replaceChildren();
    if(progress<1) {strip.append(textNode('span','反应过渡中 · 在步骤结束后查看结构的键长与键角'));return;}
    const unique=[...new Set(config.steps[index].instances.filter(x=>x.role==='focus').map(x=>x.molecule))];
    for(const id of unique) {
      const m=config.molecules[id];if(!m.measurements.length)continue;
      const group=document.createElement('span');group.append(textNode('strong',m.formula+' · '+m.geometry));
      const q=m.measurements.map(x=>{const n=core.measure(m,x.atoms);return `${x.label} ${n.toFixed(x.atoms.length===2?3:2)}${x.atoms.length===2?' Å':'°'}`;});
      group.append(document.createTextNode(q.join(' / ')));
      if(m.measurements.some(x=>Math.abs(core.measure(m,x.atoms)-x.value)>x.tolerance)) {group.className='measure-warning';group.append(document.createTextNode(' · 请核对'));}
      strip.append(group);
    }
    if(!strip.childNodes.length)strip.append(textNode('span','单原子自由基没有分子内键长或键角。'));
  }
  function renderState() {
    if(!config)return;
    updateLabels();
    currentState=core.sample(config,states,index,progress);draw(currentState);
    $('progress').value=Math.round(progress*1000);$('progress-label').textContent=Math.round(progress*100)+'%';
    $('animation-status').textContent=playing?(progress===1?'观察停留':'正在演示'):progress<1?'已暂停':index===6?'演示完成':'准备就绪';
  }
  function frame(timestamp) {
    const dt=Math.min((timestamp-last)/1000,.08);last=timestamp;
    if(playing&&config) {
      if(progress<1) {
        const duration=config.steps[index].transition.duration;
        progress=Math.min(1,progress+dt*Number($('speed').value)/duration);
        if(progress===1) {hold=0;updateMeasurements();if(!continuous){playing=false;updateControls();}}
      } else if(continuous) {
        hold+=dt;
        if(hold>=1.2) {
          if(index===6){pause();}else{index++;progress=0;hold=0;selection=null;updateStep();}
        }
      }
      renderState();
    }
    requestAnimationFrame(frame);
  }
  function pointerDown(e) {
    if(!modelReady)return;
    $('viewport').setPointerCapture(e.pointerId);pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});dragDistance=0;
    const points=[...pointer.values()];
    gesture=points.length===2?{distance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y),zoom:zoom.value}:null;
  }
  function pointerMove(e) {
    const old=pointer.get(e.pointerId);if(!old)return;
    const dx=e.clientX-old.x,dy=e.clientY-old.y;dragDistance+=Math.abs(dx)+Math.abs(dy);
    pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointer.size===2&&gesture) {
      const p=[...pointer.values()],dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
      zoom.value=Math.max(.7,Math.min(2.3,gesture.zoom*dist/Math.max(1,gesture.distance)));resize();
    } else {rotation.y+=dx*.007;rotation.x=Math.max(-1.3,Math.min(1.3,rotation.x+dy*.007));if(currentState)draw(currentState);}
  }
  function pointerUp(e) {
    if(!pointer.has(e.pointerId))return;
    const click=dragDistance<5&&pointer.size===1;pointer.delete(e.pointerId);gesture=null;
    if(click&&modelReady) {
      const rect=$('viewport').getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
      const hit=raycaster.intersectObjects([...meshes.values()].map(m=>m.mesh));selection=hit[0]?.object.userData.id||null;draw(currentState);
    }
  }

  // --- 阶段一：门禁工作台核心逻辑 ---

  // --- 单分子三维结构预览弹窗逻辑 ---
  let previewRenderer, previewScene, previewCamera, previewRoot, previewReady = false;
  let previewSphereGeo, previewCylinderGeo;
  const previewRotation = { x: 0.24, y: 0.42 }, previewZoom = { value: 1 };
  const previewMeshes = [], previewBonds = [];
  const previewPointer = new Map();
  let previewGesture = null;
  let currentPreviewSlotId = null;
  const slotFileInputs = new Map();

  function initPreviewScene() {
    if (previewReady || !window.THREE) return;
    const vp = $('mol-preview-viewport');
    if (!vp) return;
    const T = window.THREE;
    previewRenderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
    previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    previewRenderer.outputEncoding = T.sRGBEncoding;
    previewRenderer.toneMapping = T.ACESFilmicToneMapping;
    previewRenderer.toneMappingExposure = 0.95;
    vp.append(previewRenderer.domElement);

    previewScene = new T.Scene();
    previewCamera = new T.OrthographicCamera(-3, 3, 2, -2, 0.1, 100);
    previewCamera.position.set(0, 0, 20);
    previewCamera.lookAt(0, 0, 0);

    previewRoot = new T.Group();
    previewScene.add(previewRoot);
    previewScene.add(new T.HemisphereLight(0xffffff, 0x929e82, 0.6));
    const dirLight = new T.DirectionalLight(0xfff9e8, 1.25);
    dirLight.position.set(-4, 7, 9);
    previewScene.add(dirLight);
    const fillLight = new T.DirectionalLight(0xe1efcf, 0.4);
    fillLight.position.set(7, -2, 5);
    previewScene.add(fillLight);

    previewSphereGeo = new T.SphereGeometry(1, 40, 28);
    previewCylinderGeo = new T.CylinderGeometry(1, 1, 1, 16);
    previewReady = true;

    const wrap = $('mol-preview-stage-wrap');
    if (wrap) new ResizeObserver(resizePreview).observe(wrap);

    vp.addEventListener('pointerdown', e => {
      vp.setPointerCapture(e.pointerId);
      previewPointer.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...previewPointer.values()];
      previewGesture = pts.length === 2 ? {
        distance: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        zoom: previewZoom.value
      } : null;
    });
    vp.addEventListener('pointermove', e => {
      const old = previewPointer.get(e.pointerId);
      if (!old) return;
      const dx = e.clientX - old.x, dy = e.clientY - old.y;
      previewPointer.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (previewPointer.size === 2 && previewGesture) {
        const p = [...previewPointer.values()];
        const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        previewZoom.value = Math.max(0.65, Math.min(2.4, previewGesture.zoom * dist / Math.max(1, previewGesture.distance)));
        resizePreview();
      } else {
        previewRotation.y += dx * 0.008;
        previewRotation.x = Math.max(-1.4, Math.min(1.4, previewRotation.x + dy * 0.008));
        drawPreview();
      }
    });
    const endPointer = e => {
      previewPointer.delete(e.pointerId);
      previewGesture = null;
    };
    vp.addEventListener('pointerup', endPointer);
    vp.addEventListener('pointercancel', endPointer);
    vp.addEventListener('wheel', e => {
      e.preventDefault();
      previewZoom.value = Math.max(0.65, Math.min(2.4, previewZoom.value * Math.exp(-e.deltaY * 0.001)));
      resizePreview();
    }, { passive: false });

    const resetBtn = $('mol-preview-reset');
    if (resetBtn) {
      resetBtn.onclick = () => {
        previewRotation.x = 0.24;
        previewRotation.y = 0.42;
        previewZoom.value = 1;
        resizePreview();
      };
    }
    const reuploadBtn = $('mol-preview-reupload');
    if (reuploadBtn) {
      reuploadBtn.onclick = () => {
        const dlg = $('molecule-preview-dialog');
        if (dlg && dlg.open) dlg.close();
        const inp = currentPreviewSlotId && slotFileInputs.get(currentPreviewSlotId);
        if (inp) inp.click();
      };
    }
  }

  function resizePreview() {
    if (!previewReady) return;
    const wrap = $('mol-preview-stage-wrap');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    previewRenderer.setSize(w, h);
    const aspect = w / h;
    const halfH = Math.max(2.1, 3.2 / aspect) / previewZoom.value;
    previewCamera.left = -halfH * aspect;
    previewCamera.right = halfH * aspect;
    previewCamera.top = halfH;
    previewCamera.bottom = -halfH;
    previewCamera.updateProjectionMatrix();
    drawPreview();
  }

  function buildPreviewMolecule(mol) {
    if (!previewReady) initPreviewScene();
    if (!previewReady) return;
    const T = window.THREE;

    for (const item of previewMeshes) {
      previewRoot.remove(item.mesh, item.label, item.dot);
      item.mesh.material.dispose();
      item.label.material.dispose();
      item.dot.material.dispose();
    }
    for (const pair of previewBonds) {
      for (const m of pair) {
        previewRoot.remove(m);
        m.material.dispose();
      }
    }
    previewMeshes.length = 0;
    previewBonds.length = 0;

    // 计算分子几何中心并居中
    const atoms = mol.atoms || [];
    let cx = 0, cy = 0, cz = 0;
    if (atoms.length > 0) {
      for (const a of atoms) {
        cx += a.position[0];
        cy += a.position[1];
        cz += a.position[2];
      }
      cx /= atoms.length;
      cy /= atoms.length;
      cz /= atoms.length;
    }

    const posMap = new Map();
    const elemMap = new Map();
    const radicalSet = new Set(mol.radicals || []);

    for (const a of atoms) {
      const pos = [a.position[0] - cx, a.position[1] - cy, a.position[2] - cz];
      posMap.set(a.id, pos);
      elemMap.set(a.id, a.element);

      const radius = radii[a.element] || 0.35;
      const mat = new T.MeshStandardMaterial({
        color: new T.Color(colors[a.element] || 0x888888).convertSRGBToLinear(),
        roughness: 0.36,
        metalness: 0
      });
      const mesh = new T.Mesh(previewSphereGeo, mat);
      mesh.scale.setScalar(radius);
      mesh.position.fromArray(pos);

      const label = new T.Sprite(new T.SpriteMaterial({
        map: elementTexture(a.element),
        transparent: true,
        depthTest: true,
        depthWrite: false,
        toneMapped: false
      }));
      label.scale.setScalar(radius * 1.14);

      const hasRadical = radicalSet.has(a.id);
      const dot = new T.Mesh(previewSphereGeo, new T.MeshBasicMaterial({ color: 0xaa642c }));
      dot.scale.setScalar(0.08);
      dot.visible = hasRadical;

      previewRoot.add(mesh, label, dot);
      previewMeshes.push({ mesh, label, dot, pos, radius, hasRadical });
    }

    const axis = new T.Vector3(0, 1, 0);
    for (const b of (mol.bonds || [])) {
      const p1 = posMap.get(b.atoms[0]);
      const p2 = posMap.get(b.atoms[1]);
      if (!p1 || !p2) continue;
      const v1 = new T.Vector3(...p1);
      const v2 = new T.Vector3(...p2);
      const dir = v2.clone().sub(v1);
      const len = dir.length();
      const pair = b.atoms.map(id => {
        const el = elemMap.get(id);
        return new T.Mesh(previewCylinderGeo, new T.MeshStandardMaterial({
          color: new T.Color(colors[el] || 0x888888).convertSRGBToLinear(),
          roughness: 0.5
        }));
      });
      pair.forEach((m, i) => {
        m.position.copy(v1).lerp(v2, i === 0 ? 0.25 : 0.75);
        m.quaternion.setFromUnitVectors(axis, dir.clone().normalize());
        m.scale.set(0.068, len / 2, 0.068);
        previewRoot.add(m);
      });
      previewBonds.push(pair);
    }
  }

  function drawPreview() {
    if (!previewReady) return;
    const T = window.THREE;
    previewRoot.rotation.set(previewRotation.x, previewRotation.y, 0);
    previewRoot.updateMatrixWorld(true);
    const inv = previewRoot.quaternion.clone().invert();
    const front = new T.Vector3(0, 0, 1).applyQuaternion(inv);
    const right = new T.Vector3(1, 0, 0).applyQuaternion(inv);
    const up = new T.Vector3(0, 1, 0).applyQuaternion(inv);

    for (const item of previewMeshes) {
      item.label.position.copy(item.mesh.position).addScaledVector(front, item.radius + 0.02);
      if (item.hasRadical) {
        item.dot.position.copy(item.mesh.position)
          .addScaledVector(right, item.radius * 0.9)
          .addScaledVector(up, item.radius * 0.9)
          .addScaledVector(front, 0.05);
      }
    }
    previewRoot.updateMatrixWorld(true);
    previewRenderer.render(previewScene, previewCamera);
  }

  function openMoleculePreview(slotId) {
    const state = slotState.get(slotId);
    const slot = REQUIRED_SLOTS.find(s => s.id === slotId);
    if (!state || state.status !== 'valid' || !state.mol) return;

    currentPreviewSlotId = slotId;
    const dlg = $('molecule-preview-dialog');
    if (!dlg) return;

    const mol = state.mol;
    const doc = state.doc || {};
    $('mol-preview-title').textContent = `${mol.name || slot?.name} · ${mol.formula || slot?.formula}`;
    $('mol-preview-subtitle').textContent = `分子三维结构预览 · ${mol.geometry || ''}`;

    const infoEl = $('mol-preview-info');
    if (infoEl) {
      infoEl.replaceChildren();
      const metaRow = document.createElement('div');
      metaRow.className = 'mol-preview-meta-tags';
      if (mol.geometry) {
        metaRow.append(textNode('span', `空间构型：${mol.geometry}`, 'mol-preview-tag primary'));
      }
      if (doc.hybridization) {
        metaRow.append(textNode('span', `中心杂化：${doc.hybridization}`, 'mol-preview-tag'));
      }
      if (Array.isArray(mol.measurements) && mol.measurements.length > 0) {
        mol.measurements.forEach(q => {
          const val = core.measure(mol, q.atoms);
          const unit = q.atoms.length === 2 ? ' Å' : '°';
          const formatted = Number.isFinite(val) ? val.toFixed(q.atoms.length === 2 ? 3 : 2) : '';
          metaRow.append(textNode('span', `${q.label}：${formatted}${unit}`, 'mol-preview-tag'));
        });
      }
      infoEl.append(metaRow);
      if (mol.description || doc.description) {
        const desc = textNode('p', mol.description || doc.description, 'mol-preview-desc');
        infoEl.append(desc);
      }
    }

    dlg.showModal();
    previewRotation.x = 0.24;
    previewRotation.y = 0.42;
    previewZoom.value = 1;
    buildPreviewMolecule(mol);
    requestAnimationFrame(() => resizePreview());
  }

  // 渲染 6 个分子的核验卡片（已通过可点击查看 3D 结构，同时支持重新上传）
  function renderGateCards() {
    const grid=$('gate-card-grid');if(!grid)return;
    grid.replaceChildren();
    slotFileInputs.clear();
    let validCount=0;

    REQUIRED_SLOTS.forEach(slot=>{
      const state=slotState.get(slot.id);
      if(state.status==='valid')validCount++;

      const card=document.createElement('div');
      card.className=`gate-card status-${state.status}`;
      card.dataset.id=slot.id;
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');

      // 隐藏的单文件输入控件
      const singleInput=document.createElement('input');
      singleInput.type='file';singleInput.accept='.json,application/json';singleInput.hidden=true;
      singleInput.addEventListener('change',e=>{
        if(e.target.files.length)processFiles([...e.target.files],slot.id);
        e.target.value='';
      });
      slotFileInputs.set(slot.id, singleInput);

      // 若已通过校验，点击卡片打开三维结构预览；否则打开文件选择
      card.onclick=()=>{
        if(state.status==='valid') openMoleculePreview(slot.id);
        else singleInput.click();
      };
      card.onkeydown=e=>{
        if(e.key==='Enter'||e.key===' '){
          e.preventDefault();
          if(state.status==='valid') openMoleculePreview(slot.id);
          else singleInput.click();
        }
      };

      // 拖拽支持
      card.addEventListener('dragover',e=>{e.preventDefault();card.classList.add('dragover');});
      card.addEventListener('dragleave',()=>card.classList.remove('dragover'));
      card.addEventListener('drop',e=>{
        e.preventDefault();card.classList.remove('dragover');
        if(e.dataTransfer?.files?.length)processFiles([...e.dataTransfer.files],slot.id);
      });

      // 顶排：分子编号 + 右侧操作与状态徽标
      const topRow=document.createElement('div');topRow.className='gate-card-top';
      const num=textNode('span',slot.num,'gate-card-num mono');
      const topRight=document.createElement('div');topRight.className='gate-card-top-right';
      if(state.status==='valid'){
        const reuploadBtn=document.createElement('button');
        reuploadBtn.type='button';
        reuploadBtn.className='gate-reupload-btn';
        reuploadBtn.textContent='重新上传';
        reuploadBtn.title='重新选择并上传该分子的 JSON 配置文件';
        reuploadBtn.onclick=e=>{
          e.stopPropagation();
          singleInput.click();
        };
        topRight.append(reuploadBtn);
      }
      const badge=document.createElement('span');badge.className='gate-status-badge';
      badge.textContent=state.status==='valid'?'✓':state.status==='error'?'✗':'○';
      topRight.append(badge);
      topRow.append(num,topRight);

      // 核心区：大字化学式 + 中文名
      card.setAttribute('title',state.status==='valid'?'点击查看分子三维结构':'点击上传该分子配置文件');
      const center=document.createElement('div');center.className='gate-card-center';
      const formula=document.createElement('div');formula.className='gate-formula';
      formula.innerHTML=state.mol?.formula||slot.formulaHtml;
      const metaRow=document.createElement('div');metaRow.className='gate-meta-row';
      const name=textNode('span',state.mol?.name||slot.name,'gate-name');
      metaRow.append(name);
      if(state.status==='valid'&&state.mol?.geometry){
        metaRow.append(textNode('span',state.mol.geometry,'gate-geometry-pill'));
      }
      center.append(formula,metaRow);

      // 底栏：已通过显示参数与 3D 预览引导，错误显示报错，未上传显示上传引导
      const bottom=document.createElement('div');bottom.className='gate-card-bottom';
      if(state.status==='valid'){
        const bottomWrap=document.createElement('div');bottomWrap.className='gate-valid-footer';
        const tags=document.createElement('div');tags.className='gate-param-tags';
        if(state.doc.bondLengths){
          for(const [k,v] of Object.entries(state.doc.bondLengths)){
            tags.append(textNode('span',`${k} ${v} Å`,'param-tag'));
          }
        }
        if(state.doc.bondAngles){
          for(const [k,v] of Object.entries(state.doc.bondAngles)){
            tags.append(textNode('span',`${v}°`,'param-tag'));
          }
        }
        if(state.doc.hybridization){
          tags.append(textNode('span',state.doc.hybridization,'param-tag'));
        }
        const previewBtn=document.createElement('span');
        previewBtn.className='gate-preview-trigger';
        previewBtn.innerHTML='<span>查看 3D 结构</span><span aria-hidden="true">↗</span>';
        bottomWrap.append(tags,previewBtn);
        bottom.append(bottomWrap);
      }else if(state.status==='error'){
        bottom.append(textNode('span',state.error||'校验未通过','gate-error-text'));
      }else{
        const prompt=document.createElement('div');prompt.className='gate-card-prompt';
        prompt.innerHTML='<span class="prompt-plus">+</span><span>点击上传文件</span>';
        bottom.append(prompt);
      }

      card.append(topRow,center,bottom,singleInput);
      grid.append(card);
    });

    // 更新底部进度
    $('gate-progress-bar').style.width=(validCount/6*100)+'%';
    $('gate-progress-text').innerHTML=`已通过 <strong class="mono">${validCount}</strong> / 6`;
    if($('gate-badge-count')) $('gate-badge-count').textContent=`(${validCount}/6)`;

    const enterBtn=$('enter-stage-btn');
    if(validCount===6){
      enterBtn.disabled=false;
      $('enter-btn-text').textContent='下一步：组装反应链路';
    }else{
      enterBtn.disabled=true;
      $('enter-btn-text').textContent=`组装反应链路 (${validCount}/6)`;
    }
  }

  // 校验单个文件数据并更新对应槽位
  function verifySingleDoc(doc,expectedId=null){
    let id;
    try {
      id=files.identify(doc);
    }catch(e){
      if(expectedId){
        slotState.set(expectedId,{status:'error',doc:null,mol:null,error:e.message,warnings:[]});
        return {success:false,id:expectedId,error:e.message};
      }
      throw e;
    }

    // 若指定了目标卡片，强制校验文件所属分子是否匹配
    if(expectedId && id!==expectedId){
      const exp=REQUIRED_SLOTS.find(s=>s.id===expectedId);
      const act=REQUIRED_SLOTS.find(s=>s.id===id);
      const expName=exp?`${exp.name} (${exp.formula})`:expectedId;
      const actName=act?`${act.name} (${act.formula})`:id;
      const msg=`分子不匹配：当前为 ${expName}，上传的文件为 ${actName}。`;
      slotState.set(expectedId,{status:'error',doc:null,mol:null,error:msg,warnings:[]});
      return {success:false,id:expectedId,error:msg};
    }

    const targetId=expectedId||id;
    if(!slotState.has(targetId)){
      throw new Error(`不认识的分子标识 ${targetId}`);
    }

    try {
      const template=baseData.catalog[targetId];
      if(!template)throw new Error(`缺少 ${targetId} 的参考模板。`);
      const mol=files.structure(doc,template);

      // 检查测量参考偏差 warning
      const warnings=[];
      if(Array.isArray(template.measurements)){
        template.measurements.forEach(q=>{
          const n=core.measure(mol,q.atoms);
          if(Number.isFinite(n)&&Math.abs(n-q.value)>q.tolerance){
            warnings.push(`${q.label}：当前测量值为 ${n.toFixed(q.atoms.length===2?3:2)}${q.atoms.length===2?' Å':'°'}，偏离实验/理论参考范围，请核对。`);
          }
        });
      }
      slotState.set(targetId,{status:'valid',doc,mol,error:null,warnings});
      return {success:true,id:targetId,mol,warnings};
    }catch(err){
      slotState.set(targetId,{status:'error',doc:null,mol:null,error:err.message,warnings:[]});
      return {success:false,id:targetId,error:err.message};
    }
  }

  // 处理上传的文件列表
  async function processFiles(fileList,targetSlotId=null){
    if(!fileList.length)return;
    let anyPassed=0,anyFailed=0;
    for(const file of fileList){
      try {
        const text=await file.text();
        let doc;
        try {doc=JSON.parse(text);}catch(je){
          if(targetSlotId)slotState.set(targetSlotId,{status:'error',doc:null,mol:null,error:`文件格式有误：${je.message}`,warnings:[]});
          else toast(`${file.name}：文件格式有误，请检查语法。`);
          anyFailed++;
          continue;
        }
        const res=verifySingleDoc(doc,targetSlotId);
        if(res.success)anyPassed++;else anyFailed++;
      }catch(e){
        anyFailed++;
        toast(`${file.name}：${e.message}`);
      }
    }
    renderGateCards();
    if(anyPassed>0&&anyFailed===0)toast(`成功通过 ${anyPassed} 个分子核验！`);
    else if(anyPassed>0&&anyFailed>0)toast(`${anyPassed} 个通过核验，${anyFailed} 个存在错误。`);
  }

  // 载入预置示例（全部打勾）
  function loadPreset(silent=false){
    if(!baseData.students)return;
    baseData.students.forEach(doc=>{
      try {verifySingleDoc(doc);}catch{}
    });
    renderGateCards();
    if(!silent)toast('已载入全部 6 种分子的预置标准配置！');
  }

  // --- 阶段二：反应链路拼装核心逻辑 ---
  // 每个阶段为开放式微粒集合（反应前/反应后容器），不限微粒数量，由学生自主装配
  const pipelineData = {
    initiation: { reactants: ['Br2'], products: ['Br', 'Br'] },
    propagation1: { reactants: ['CH4', 'Br'], products: ['CH3', 'HBr'] },
    propagation2: { reactants: ['CH3', 'Br2'], products: ['CH3Br', 'Br'] },
    termination: {
      reactions: [
        { reactants: ['Br', 'Br'], products: ['Br2'] },
        { reactants: ['CH3', 'CH3'], products: ['CH3CH3'] },
        { reactants: ['CH3', 'Br'], products: ['CH3Br'] }
      ]
    }
  };
  let selectedPoolMol = null; // 点击选中的待放置分子
  let activePipelineTab = 0; // 当前选中的反应阶段 Tab 索引 (0: 链引发, 1: 链增长①, 2: 链增长②, 3: 链终止)
  let pipelineVerified = false; // 是否已点击过验证

  function renderPipelineScreen() {
    const pool = $('molecule-chips');
    const tabsNav = $('pipeline-tabs-nav');
    const activeStage = $('pipeline-active-stage');
    if (!pool || !tabsNav || !activeStage || !window.ChemDeduction) return;

    // 渲染微粒池（含乙烷 CH3CH3 等共 7 种微粒）
    pool.replaceChildren();
    POOL_MOLECULES.forEach(slot => {
      const chip = document.createElement('div');
      chip.className = 'mol-chip' + (selectedPoolMol === slot.id ? ' selected-for-place' : '');
      chip.draggable = true;
      chip.dataset.molId = slot.id;
      chip.innerHTML = `<span class="mol-chip-formula">${slot.formulaHtml}</span><span class="mol-chip-name">${slot.name}</span>`;

      chip.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', slot.id);
        e.dataTransfer.effectAllowed = 'copy';
      });

      chip.onclick = () => {
        if (selectedPoolMol === slot.id) {
          selectedPoolMol = null;
        } else {
          selectedPoolMol = slot.id;
          toast(`已选取 ${slot.name} (${slot.formula})，点击下方「反应前物料」或「反应后产物」区域即可放入。`);
        }
        renderPipelineScreen();
      };
      pool.append(chip);
    });

    // 渲染 Tab 导航：根据真实验证结果呈现打勾(✓)、异常(!)、未验证序号
    tabsNav.replaceChildren();
    ChemDeduction.PIPELINE_STEPS.forEach((step, idx) => {
      const tabBtn = document.createElement('button');
      tabBtn.className = 'pipeline-tab-btn';
      tabBtn.setAttribute('role', 'tab');
      tabBtn.setAttribute('aria-selected', String(idx === activePipelineTab));

      const stageObj = pipelineData[step.id] || (step.isMultiReaction ? { reactions: [] } : { reactants: [], products: [] });
      let badgeContent = String(idx + 1);

      if (pipelineVerified) {
        const check = ChemDeduction.verifyStage ? ChemDeduction.verifyStage(step.id, stageObj) : { ok: false };
        if (check.ok) {
          tabBtn.classList.add('is-valid');
          badgeContent = '✓';
        } else {
          tabBtn.classList.add('is-invalid');
          badgeContent = '!';
        }
      }

      tabBtn.innerHTML = `
        <span class="tab-badge">${badgeContent}</span>
        <span>${step.phaseName}</span>
      `;
      tabBtn.onclick = () => {
        activePipelineTab = idx;
        renderPipelineScreen();
      };
      tabsNav.append(tabBtn);
    });

    // 渲染当前处于 Active 的反应阶段
    activeStage.replaceChildren();
    const currentStep = ChemDeduction.PIPELINE_STEPS[activePipelineTab];
    if (!currentStep) return;

    const trackCard = document.createElement('div');
    trackCard.className = 'pipeline-track-card';

    const header = document.createElement('div');
    header.className = 'track-header';
    header.innerHTML = `
      <div class="track-header-left">
        <span class="track-summary">${currentStep.summary}</span>
      </div>
      <span class="track-condition-pill">反应条件：${currentStep.condition}</span>
    `;
    trackCard.append(header);

    if (currentStep.isMultiReaction) {
      // 多条并列反应（如链终止的 3 种自由基结合方式）
      if (!pipelineData[currentStep.id] || !Array.isArray(pipelineData[currentStep.id].reactions)) {
        pipelineData[currentStep.id] = {
          reactions: [
            { reactants: [], products: [] },
            { reactants: [], products: [] },
            { reactants: [], products: [] }
          ]
        };
      }
      const multiWrap = document.createElement('div');
      multiWrap.className = 'track-multi-list';

      const count = currentStep.expectedReactions ? currentStep.expectedReactions.length : 3;
      for (let rIdx = 0; rIdx < count; rIdx++) {
        const rowWrap = document.createElement('div');
        rowWrap.className = 'track-multi-row';

        const rowLabel = document.createElement('div');
        rowLabel.className = 'track-multi-row-badge';
        rowLabel.textContent = `偶联反应 ${rIdx + 1}`;

        const flow = document.createElement('div');
        flow.className = 'track-flow track-flow-compact';

        const reactantsZone = createDropZone(currentStep.id, 'reactants', `反应 ${rIdx + 1} · 反应前自由基`, rIdx);

        const arrowZone = document.createElement('div');
        arrowZone.className = 'track-arrow-zone';
        arrowZone.innerHTML = `
          <span class="track-condition-tag">偶联成键</span>
          <span class="track-arrow" aria-hidden="true">➔</span>
        `;

        const productsZone = createDropZone(currentStep.id, 'products', `反应 ${rIdx + 1} · 偶联生成物`, rIdx);

        flow.append(reactantsZone, arrowZone, productsZone);
        rowWrap.append(rowLabel, flow);
        multiWrap.append(rowWrap);
      }
      trackCard.append(multiWrap);
    } else {
      const flow = document.createElement('div');
      flow.className = 'track-flow';

      // 反应前物料容器（不限数量）
      const reactantsZone = createDropZone(currentStep.id, 'reactants', '反应前物料（点击或拖入微粒）');

      // 反应箭头与条件
      const arrowZone = document.createElement('div');
      arrowZone.className = 'track-arrow-zone';
      arrowZone.innerHTML = `
        <span class="track-condition-tag">${currentStep.condition}</span>
        <span class="track-arrow" aria-hidden="true">➔</span>
      `;

      // 反应后产物容器（不限数量）
      const productsZone = createDropZone(currentStep.id, 'products', '反应后产物（点击或拖入微粒）');

      flow.append(reactantsZone, arrowZone, productsZone);
      trackCard.append(flow);
    }

    activeStage.append(trackCard);
  }

  function getZoneList(stageId, role, reactionIndex) {
    if (reactionIndex !== null && reactionIndex !== undefined) {
      if (!pipelineData[stageId] || !Array.isArray(pipelineData[stageId].reactions)) {
        pipelineData[stageId] = {
          reactions: [
            { reactants: [], products: [] },
            { reactants: [], products: [] },
            { reactants: [], products: [] }
          ]
        };
      }
      if (!pipelineData[stageId].reactions[reactionIndex]) {
        pipelineData[stageId].reactions[reactionIndex] = { reactants: [], products: [] };
      }
      return pipelineData[stageId].reactions[reactionIndex][role];
    }
    if (!pipelineData[stageId]) {
      pipelineData[stageId] = { reactants: [], products: [] };
    }
    return pipelineData[stageId][role];
  }

  // 创建开放式微粒放置容器（支持任意数量微粒拖入与点击加入）
  function createDropZone(stageId, role, titleText, reactionIndex = null) {
    const zone = document.createElement('div');
    zone.className = 'pipeline-dropzone';
    zone.dataset.stageId = stageId;
    zone.dataset.role = role;
    if (reactionIndex !== null) zone.dataset.reactionIndex = String(reactionIndex);

    const zoneHeader = document.createElement('div');
    zoneHeader.className = 'dropzone-header';
    const currentList = getZoneList(stageId, role, reactionIndex);
    zoneHeader.innerHTML = `
      <span class="dropzone-title">${titleText}</span>
      <span class="dropzone-count">${currentList.length ? `共 ${currentList.length} 个微粒` : '空'}</span>
    `;

    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'dropzone-particles';

    if (currentList.length === 0) {
      const emptyPrompt = document.createElement('div');
      emptyPrompt.className = 'dropzone-empty-prompt';
      emptyPrompt.innerHTML = `
        <span class="dropzone-empty-icon">＋</span>
        <span>从上方微粒池拖入或点击放入</span>
      `;
      particlesContainer.append(emptyPrompt);
    } else {
      currentList.forEach((molId, itemIdx) => {
        const molMeta = POOL_MOLECULES.find(s => s.id === molId);
        const item = document.createElement('div');
        item.className = 'dropzone-particle-item';
        item.innerHTML = `
          <span class="particle-formula">${molMeta ? molMeta.formulaHtml : molId}</span>
          <span class="particle-name">${molMeta ? molMeta.name : ''}</span>
        `;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'particle-remove-btn';
        removeBtn.setAttribute('title', '移除此微粒');
        removeBtn.innerHTML = '×';
        removeBtn.onclick = (e) => {
          e.stopPropagation();
          currentList.splice(itemIdx, 1);
          renderPipelineScreen();
        };
        item.append(removeBtn);
        particlesContainer.append(item);
      });
    }

    zone.append(zoneHeader, particlesContainer);

    // 拖拽事件监听
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const molId = e.dataTransfer.getData('text/plain');
      if (molId && POOL_MOLECULES.some(s => s.id === molId)) {
        const list = getZoneList(stageId, role, reactionIndex);
        list.push(molId);
        renderPipelineScreen();
      }
    });

    // 点击直接放入选中的微粒
    zone.onclick = () => {
      if (selectedPoolMol) {
        const list = getZoneList(stageId, role, reactionIndex);
        list.push(selectedPoolMol);
        selectedPoolMol = null;
        renderPipelineScreen();
      }
    };

    return zone;
  }

  // 从门禁进入拼装页面
  function enterPipelineFromGate() {
    const validCount = [...slotState.values()].filter(s => s.status === 'valid').length;
    if (validCount !== 6) {
      toast(`当前仅通过 ${validCount} / 6，请先完成全部分子核验。`);
      return false;
    }
    $('gate-screen').hidden = true;
    $('pipeline-screen').hidden = false;
    $('main-stage').hidden = true;
    $('workflow-badge').innerHTML = '<i></i>第 2 步：组装反应链路';
    renderPipelineScreen();
    toast('已载入 6 种分子积木，请拼装微观反应序列！');
    return true;
  }

  // 验证拼装结果并进入三维演示阶段
  function submitPipelineAndEnterStage() {
    pipelineVerified = true;
    const feedback = $('pipeline-feedback');
    if (feedback) {
      feedback.hidden = true;
      feedback.className = 'pipeline-feedback';
      feedback.replaceChildren();
    }

    const res = ChemDeduction.verifyPipeline(pipelineData);
    renderPipelineScreen(); // 刷新 Tab 状态（打勾或红感叹号）

    if (!res.ok) {
      // 自动切换至出错的阶段 Tab
      if (res.errorStage) {
        const errIdx = ChemDeduction.PIPELINE_STEPS.findIndex(s => s.id === res.errorStage);
        if (errIdx >= 0) {
          activePipelineTab = errIdx;
          renderPipelineScreen();
        }
      }

      if (feedback) {
        feedback.className = 'pipeline-feedback error';
        feedback.innerHTML = `
          <span class="pipeline-feedback-icon" aria-hidden="true">⚠️</span>
          <div class="pipeline-feedback-content">
            <span class="pipeline-feedback-title">装配检验未通过 · 请反思并调整</span>
            <span class="pipeline-feedback-text">${res.hint}</span>
          </div>
        `;
        feedback.hidden = false;
        feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      toast(res.hint);
      return false;
    }

    try {
      const students = [...slotState.values()].map(s => s.doc);
      const assembled = files.assemble({
        project: baseData.project,
        catalog: baseData.catalog,
        steps: baseData.steps,
        students
      });
      const ok = install(assembled, '学生核验配置');
      if (!ok) return false;

      $('pipeline-screen').hidden = true;
      $('gate-screen').hidden = true;
      $('main-stage').hidden = false;
      $('workflow-badge').innerHTML = '<i></i>第 3 步：三维微观演播';
      resetView();
      toast('🎉 反应序列拼装正确！已激活三维反应工作台，请观察原子级断键成键！');
      return true;
    } catch (e) {
      toast('组装失败：' + e.message);
      return false;
    }
  }

  // 从拼装页返回门禁页
  function returnToGateFromPipeline() {
    $('pipeline-screen').hidden = true;
    $('gate-screen').hidden = false;
    $('main-stage').hidden = true;
    $('workflow-badge').innerHTML = '<i></i>第 1 步：配置核验';
    renderGateCards();
  }

  // 从三维演示返回拼装页
  function returnToPipeline() {
    pause();
    $('main-stage').hidden = true;
    $('pipeline-screen').hidden = false;
    $('gate-screen').hidden = true;
    $('workflow-badge').innerHTML = '<i></i>第 2 步：组装反应链路';
    renderPipelineScreen();
  }

  // 基础数据初次装载
  async function loadDefault(initial=false) {
    const revision=++loadRevision;
    if(location.protocol==='file:') {
      const bundle=window.CHEM_DEFAULT_FILES;
      baseData={project:bundle.project,catalog:bundle.catalog,steps:bundle.steps,students:bundle.students};
      if(revision!==loadRevision)return;
      loadPreset(true);
      return;
    }
    try {
      async function read(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(`${path}（HTTP ${r.status}）`);try{return await r.json();}catch{throw new Error(`${path} 格式有误。`);}}
      const project=await read('教师配置/项目.json');files.checkManifest(project);
      const [catalog,steps,students]=await Promise.all([read('教师配置/分子参考.json'),Promise.all(project.stepFiles.map(f=>read('教师配置/步骤/'+encodeURIComponent(f)))),Promise.all(project.moleculeFiles.map(f=>read('教师配置/标准答案/'+encodeURIComponent(f))))]);
      if(revision!==loadRevision)return;
      baseData={project,catalog,steps,students};
      loadPreset(true);
    }catch(e){
      if(revision!==loadRevision)return;
      toast('加载教师基准配置失败：'+e.message);
    }
  }

  // 事件绑定
  $('play').onclick=play;$('prev').onclick=()=>go(index-1,false);$('next').onclick=()=>go(index+1,solvedSteps.has(index+1));$('replay').onclick=()=>go(index,true);$('restart').onclick=restart;
  $('reset-view').onclick=()=>{resetView();if(currentState)draw(currentState);};
  $('progress').addEventListener('input',()=>{pause();progress=Number($('progress').value)/1000;updateControls();updateMeasurements();renderState();});
  if($('measure-toggle'))$('measure-toggle').onclick=()=>{showMeasurements=!showMeasurements;$('measure-toggle').setAttribute('aria-pressed',String(showMeasurements));updateMeasurements();};
  const contextToggle=$('context-toggle');
  if(contextToggle){
    contextToggle.onclick=()=>{
      showContext=!showContext;
      contextToggle.setAttribute('aria-pressed',String(showContext));
      contextToggle.textContent=showContext?'旁观粒子: 开':'旁观粒子: 关';
      if(currentState)draw(currentState);
    };
  }
  if($('config-open'))$('config-open').onclick=()=>showDialog('config-dialog');
  $('help-open').onclick=()=>showDialog('help-dialog');
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));

  // 推演卡片提交绑定
  const deductionSubmitBtn=$('deduction-submit-btn');
  if(deductionSubmitBtn)deductionSubmitBtn.onclick=handleDeductionSubmit;

  // 门禁界面的事件绑定
  $('gate-choose-files').onclick=()=>$('gate-file-input').click();
  $('gate-file-input').addEventListener('change',e=>{
    processFiles([...e.target.files]);e.target.value='';
  });
  const gateScreen=$('gate-screen');
  if(gateScreen){
    gateScreen.addEventListener('dragover',e=>{e.preventDefault();gateScreen.classList.add('dragover');});
    gateScreen.addEventListener('dragleave',()=>gateScreen.classList.remove('dragover'));
    gateScreen.addEventListener('drop',e=>{
      e.preventDefault();gateScreen.classList.remove('dragover');
      if(e.dataTransfer?.files?.length)processFiles([...e.dataTransfer.files]);
    });
  }
  $('enter-stage-btn').onclick=()=>enterPipelineFromGate();
  if($('gate-return-btn'))$('gate-return-btn').onclick=()=>returnToGateFromPipeline();

  // 阶段二：反应链路拼装事件绑定
  $('pipeline-submit-btn').onclick=()=>submitPipelineAndEnterStage();
  $('pipeline-return-gate-btn').onclick=()=>returnToGateFromPipeline();
  const autofillBtn = $('pipeline-autofill-btn');
  if (autofillBtn) {
    autofillBtn.onclick = () => {
      pipelineData.initiation = { reactants: ['Br2'], products: ['Br', 'Br'] };
      pipelineData.propagation1 = { reactants: ['CH4', 'Br'], products: ['CH3', 'HBr'] };
      pipelineData.propagation2 = { reactants: ['CH3', 'Br2'], products: ['CH3Br', 'Br'] };
      pipelineData.termination = {
        reactions: [
          { reactants: ['Br', 'Br'], products: ['Br2'] },
          { reactants: ['CH3', 'CH3'], products: ['CH3CH3'] },
          { reactants: ['CH3', 'Br'], products: ['CH3Br'] }
        ]
      };
      renderPipelineScreen();
      toast('已一键预填标准化学反应微粒！');
    };
  }
  $('pipeline-reset-btn').onclick=()=>{
    pipelineData.initiation = { reactants: [], products: [] };
    pipelineData.propagation1 = { reactants: [], products: [] };
    pipelineData.propagation2 = { reactants: [], products: [] };
    pipelineData.termination = {
      reactions: [
        { reactants: [], products: [] },
        { reactants: [], products: [] },
        { reactants: [], products: [] }
      ]
    };
    pipelineVerified = false;
    const feedback = $('pipeline-feedback');
    if (feedback) {
      feedback.hidden = true;
      feedback.replaceChildren();
    }
    renderPipelineScreen();
    toast('已清空所有反应微粒。');
  };

  // 阶段三：返回第二步拼装链路事件绑定
  if ($('stage-footer-back-btn')) $('stage-footer-back-btn').onclick = () => returnToPipeline();
  if ($('stage-return-pipeline-btn')) $('stage-return-pipeline-btn').onclick = () => returnToPipeline();

  // 原有「加载 JSON」弹窗的上传事件（阶段二内）
  $('choose-file').onclick=()=>$('file-input').click();
  $('file-input').addEventListener('change',async e=>{
    const selected=[...e.target.files];if(!selected.length)return;pause();const revision=++loadRevision;
    if(selected.length>6||selected.some(f=>f.size>1024*1024)){report({errors:['每次请选择 1—6 个分子文件，每个文件不超过 1 MB。'],warnings:[]},false);e.target.value='';return;}
    try {
      const docs=await Promise.all(selected.map(async file=>{try{return {name:file.name,data:JSON.parse(await file.text())};}catch{throw new Error(`${file.name}：文件读取失败，请检查文件内容格式。`);}}));
      if(revision!==loadRevision)return;
      const result=files.apply(config,docs);
      if(result.errors.length)report(result,false);
      else if(install(result.config,'已导入：'+result.changed.join('、'))){
        docs.forEach(d=>{try{verifySingleDoc(d.data);}catch{}});
        renderGateCards();
        $('export-molecule').value=result.changed[0];toast('已更新 '+result.changed.join('、')+'，其余分子保留当前配置。');
      }
    }catch(err){if(revision===loadRevision)report({errors:[err.message],warnings:[]},false);}
    e.target.value='';
  });

  $('reload-config').onclick=()=>{
    loadPreset(true);
    submitPipelineAndEnterStage();
    toast('已恢复为默认配置。');
  };
  $('download-config').onclick=()=>{
    if(!config)return;const id=$('export-molecule').value,doc=files.exportMolecule(config,id),url=URL.createObjectURL(new Blob([files.stringify(doc)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  $('viewport').addEventListener('pointerdown',pointerDown);$('viewport').addEventListener('pointermove',pointerMove);$('viewport').addEventListener('pointerup',pointerUp);$('viewport').addEventListener('pointercancel',e=>{pointer.delete(e.pointerId);gesture=null;});
  $('viewport').addEventListener('wheel',e=>{e.preventDefault();zoom.value=Math.max(.7,Math.min(2.3,zoom.value*Math.exp(-e.deltaY*.001)));resize();},{passive:false});
  document.addEventListener('keydown',e=>{
    if(document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA','BUTTON','SUMMARY','A'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.code==='Space'){e.preventDefault();if(solvedSteps.size===7)play();else if(solvedSteps.has(index)&&index>0)go(index,true);}
    if(e.key==='ArrowRight'){e.preventDefault();if(index<unlockedMaxStep+1)go(index+1,solvedSteps.has(index+1));}
    if(e.key==='ArrowLeft'){e.preventDefault();if(index>0)go(index-1,false);}
    if(e.key==='Home'){e.preventDefault();restart();}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});

  // 启动：载入基础数据，初始停留在阶段一门禁页面
  try {
    loadDefault(true);
  }catch(e){
    $('load-error').hidden=false;$('load-error').textContent='无法启动演示：'+e.message;console.error(e);
  }

  const enterStage = submitPipelineAndEnterStage;
  const returnToGate = returnToGateFromPipeline;

  // 暴露诊断与测试 API
  window.chemLab={
    getState:()=>({
      index,progress,playing,sourceName,
      gatePassed:[...slotState.values()].filter(s=>s.status==='valid').length,
      isStageUnlocked:!$('main-stage').hidden,
      unlockedMaxStep,
      solvedSteps:[...solvedSteps],
      allStepsSolved:solvedSteps.size===7,
      atoms:structuredClone(currentState?.atoms),
      bonds:structuredClone(currentState?.bonds)
    }),
    loadPreset:()=>{loadPreset(true);enterStage();},
    enterStage,
    returnToGate,
    openMoleculePreview,
    unlockAllSteps,
    resetDeduction,
    validate:core.validate
  };
})();
