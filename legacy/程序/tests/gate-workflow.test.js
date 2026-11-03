const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../core.js');
const files = require('../config-files.js');
const deduction = require('../deduction.js');
const { bundle } = require('./fixtures.cjs');

test('gate workflow: individual molecule validation, error reporting and checkmarking', () => {
  const catalog = bundle.catalog;
  const validStudents = bundle.students;

  // 1. 验证每一个合法学生文件都能被识别且 structure 成功
  const passedSlots = new Map();
  for (const doc of validStudents) {
    const id = files.identify(doc);
    assert.ok(catalog[id], `必须有 ${id} 的参考模板`);
    const mol = files.structure(doc, catalog[id]);
    assert.ok(mol.atoms.length > 0);
    assert.ok(mol.name);
    passedSlots.set(id, { doc, mol });
  }
  assert.equal(passedSlots.size, 6, '全部 6 个分子应能成功通过校验');

  // 2. 模拟一个错误的分子（如 CH3Br 键角不相容）
  const brokenCH3Br = structuredClone(validStudents.find(d => d.formula === 'CH3Br'));
  brokenCH3Br.bondAngles['H-C-H'] = 90; // 不相容的角度
  assert.throws(() => {
    files.structure(brokenCH3Br, catalog['CH3Br']);
  }, /bondAngles 不相容/);

  // 3. 模拟自由基缺少未成对电子声明
  const brokenCH3 = structuredClone(validStudents.find(d => d.formula.startsWith('CH3')));
  delete brokenCH3.unpairedElectrons;
  assert.throws(() => {
    files.structure(brokenCH3, catalog['CH3']);
  }, /未成对电子/);

  // 4. 当 6 个分子全部合法时，assemble 并经由 core.validate() 验证完整性
  const assembled = files.assemble({
    project: bundle.project,
    catalog: bundle.catalog,
    steps: bundle.steps,
    students: validStudents
  });
  const res = core.validate(assembled);
  assert.equal(res.errors.length, 0, '组装后的全局配置不能有任何错误');
  assert.equal(res.states.length, 7, '必须产出 7 步反应动画状态');
  assert.equal(Object.keys(res.states[0].atoms).length, 9, '初始状态必须有 9 个跟踪原子');

  // 5. 验证分子卡片定向上传时的防串门机制
  const ch3Doc = validStudents.find(d => d.formula.startsWith('CH3'));
  const ch4SlotId = 'CH4';
  const identified = files.identify(ch3Doc);
  assert.equal(identified, 'CH3');
  assert.notEqual(identified, ch4SlotId, 'CH3 文件不能等于 CH4 槽位');
});

test('deduction workflow: step-by-step heuristic verification and unlocking logic', () => {
  const steps = deduction.STEPS_DATA;
  assert.equal(steps.length, 7, '必须定义 7 步反应推演数据');

  // 第 1 步为初始观察，默认通过
  assert.equal(steps[0].isObservation, true);
  const r0 = deduction.verify(0);
  assert.equal(r0.ok, true);

  // 异常参数保护
  assert.equal(deduction.verify(-1).ok, false);
  assert.equal(deduction.verify(99).ok, false);
  assert.equal(deduction.verify(1, null).ok, false);

  // 第 2 步（引发 · 均裂）的启发式判题（不直接泄露答案）
  const step1 = steps[1];
  // 故意选错阶段
  const wrongPhaseRes = deduction.verify(1, {
    phase: '链增长 ①',
    equation: step1.equation,
    breakBond: step1.breakBond,
    formBond: step1.formBond
  });
  assert.equal(wrongPhaseRes.ok, false);
  assert.equal(wrongPhaseRes.errorField, 'phase');
  assert.match(wrongPhaseRes.hint, /思考/);
  assert.doesNotMatch(wrongPhaseRes.hint, /正确答案/);

  // 故意选错断键
  const wrongBondRes = deduction.verify(1, {
    phase: step1.phase,
    equation: step1.equation,
    breakBond: 'C—H',
    formBond: step1.formBond
  });
  assert.equal(wrongBondRes.ok, false);
  assert.equal(wrongBondRes.errorField, 'breakBond');
  assert.match(wrongBondRes.hint, /思考/);

  // 全对提交
  const correctStep1 = deduction.verify(1, {
    phase: step1.phase,
    equation: step1.equation,
    breakBond: step1.breakBond,
    formBond: step1.formBond
  });
  assert.equal(correctStep1.ok, true);
  assert.ok(correctStep1.summary);

  // 遍历 1~6 步，确保所有标准机理答案均能 100% 正确通关
  for (let i = 1; i <= 6; i++) {
    const s = steps[i];
    const check = deduction.verify(i, {
      phase: s.phase,
      equation: s.equation,
      breakBond: s.breakBond,
      formBond: s.formBond
    });
    assert.equal(check.ok, true, `第 ${i + 1} 步推演答案必须能通过验证`);
    assert.ok(check.summary.length > 10, `第 ${i + 1} 步必须有详细机理总结`);
  }
});

test('reaction steps resolve reactant instances before progress=0.6 and products after', () => {
  const fs = require('fs');
  const path = require('path');
  const appCode = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf-8');
  assert.ok(appCode.includes('getStepInstances'), 'app.js 必须具备基于动画时序的微粒标签解析函数');
  assert.ok(appCode.includes('[1, 3, 5].includes(stepIdx) && prog < 0.6'), '反应步骤在 progress<0.6 时必须按起始物料呈现');
});

test('reaction pipeline assembly puzzle validation', () => {
  assert.ok(deduction.PIPELINE_STEPS.length === 4, '必须有 4 个反应装配阶段（含链终止）');

  const validTermination = {
    reactions: [
      { reactants: ['Br', 'Br'], products: ['Br2'] },
      { reactants: ['CH3', 'CH3'], products: ['CH3CH3'] },
      { reactants: ['CH3', 'Br'], products: ['CH3Br'] }
    ]
  };

  // 空微粒区拦截
  const emptyRes = deduction.verifyPipeline({});
  assert.equal(emptyRes.ok, false);
  assert.match(emptyRes.hint, /尚未放置任何反应物/);

  // 错误反应物拦截（启发式反思提问，不泄露具体答案）
  const wrongRes = deduction.verifyPipeline({
    initiation: { reactants: ['CH4'], products: ['Br', 'Br'] },
    propagation1: { reactants: ['CH4', 'Br'], products: ['CH3', 'HBr'] },
    propagation2: { reactants: ['CH3', 'Br2'], products: ['CH3Br', 'Br'] },
    termination: validTermination
  });
  assert.equal(wrongRes.ok, false);
  assert.equal(wrongRes.errorStage, 'initiation');
  assert.match(wrongRes.hint, /思考【链引发 · 反应物】/);
  assert.doesNotMatch(wrongRes.hint, /答案是/);

  // 数量不对拦截（比如引发阶段放了 1 个 Br· 而非 2 个）
  const wrongQtyRes = deduction.verifyPipeline({
    initiation: { reactants: ['Br2'], products: ['Br'] },
    propagation1: { reactants: ['CH4', 'Br'], products: ['CH3', 'HBr'] },
    propagation2: { reactants: ['CH3', 'Br2'], products: ['CH3Br', 'Br'] },
    termination: validTermination
  });
  assert.equal(wrongQtyRes.ok, false);
  assert.equal(wrongQtyRes.errorStage, 'initiation');
  assert.match(wrongQtyRes.hint, /思考【链引发 · 生成物】/);

  // 链终止阶段：重复偶联反应拦截
  const duplicateTermRes = deduction.verifyPipeline({
    initiation: { reactants: ['Br2'], products: ['Br', 'Br'] },
    propagation1: { reactants: ['Br', 'CH4'], products: ['HBr', 'CH3'] },
    propagation2: { reactants: ['Br2', 'CH3'], products: ['Br', 'CH3Br'] },
    termination: {
      reactions: [
        { reactants: ['Br', 'Br'], products: ['Br2'] },
        { reactants: ['Br', 'Br'], products: ['Br2'] },
        { reactants: ['CH3', 'Br'], products: ['CH3Br'] }
      ]
    }
  });
  assert.equal(duplicateTermRes.ok, false);
  assert.equal(duplicateTermRes.errorStage, 'termination');
  assert.match(duplicateTermRes.hint, /重复/);

  // 正确拼装全部通过（支持各阶段微粒无序，且支持链终止 3 条偶联反应任意顺序排列）
  const correctRes = deduction.verifyPipeline({
    initiation: { reactants: ['Br2'], products: ['Br', 'Br'] },
    propagation1: { reactants: ['Br', 'CH4'], products: ['HBr', 'CH3'] },
    propagation2: { reactants: ['Br2', 'CH3'], products: ['Br', 'CH3Br'] },
    termination: {
      reactions: [
        { reactants: ['Br', 'CH3'], products: ['CH3Br'] },
        { reactants: ['CH3', 'CH3'], products: ['CH3CH3'] },
        { reactants: ['Br', 'Br'], products: ['Br2'] }
      ]
    }
  });
  assert.equal(correctRes.ok, true);
  assert.match(correctRes.message, /完全正确/);
});


