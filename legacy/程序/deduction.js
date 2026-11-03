/* Step-by-step chemical reaction deduction rules and validator */
(function (root) {
  'use strict';

  const STEPS_DATA = [
    {
      index: 0,
      title: '初始分子',
      isObservation: true,
      phase: '准备',
      summary: '体系准备就绪：观察甲烷的正四面体立体构型与溴单质的双原子分子结构。'
    },
    {
      index: 1,
      title: '光照激发',
      isObservation: false,
      phase: '引发',
      phaseOptions: ['引发', '链增长 ①', '链增长 ②', '净反应总结'],
      fieldLabel: '微粒变化与反应式',
      equation: 'Br₂ → 2 Br·',
      equationOptions: [
        'Br₂ → 2 Br·',
        'CH₄ → CH₃· + H·',
        'Br· + CH₄ → CH₃· + HBr',
        'CH₃· + Br₂ → CH₃Br + Br·'
      ],
      breakBond: 'Br—Br',
      breakBondOptions: ['无', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
      formBond: '无',
      formBondOptions: ['无', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
      hints: {
        phase: '思考：在光照 hν 作用下，初始稳定的非自由基分子发生均裂并产生初始自由基，这属于哪个阶段？',
        equation: '思考：观察此时受到光照照射的分子，它是如何裂解为两个相同微粒的？',
        breakBond: '思考：反应物为溴单质分子，被光能均裂的是分子内部的哪种共价键？',
        formBond: '思考：均裂过程产生孤立自由基，当前步骤是否有新共价键生成？'
      },
      summary: '光能促使 Br—Br 键均裂，一对成键电子各自归属一个溴原子，产生 2 个高活性的溴自由基（Br·）。'
    },
    {
      index: 2,
      title: '接近甲烷',
      isObservation: false,
      phase: '链增长 ①',
      phaseOptions: ['引发', '链增长 ①', '链增长 ②', '净反应总结'],
      fieldLabel: '反应微粒动态',
      equation: 'Br· 与 CH₄ 相互接近',
      equationOptions: [
        'Br· 与 CH₄ 相互接近',
        'Br· 与 Br· 相互结合',
        'CH₃· 与 Br₂ 相互接近',
        'HBr 与 CH₃Br 相互碰撞'
      ],
      breakBond: '无',
      breakBondOptions: ['无', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
      formBond: '无',
      formBondOptions: ['无', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
      hints: {
        phase: '思考：引发阶段产生的活性自由基开始寻找底物分子碰撞，反应进入了哪个阶段？',
        equation: '思考：均裂生成的活性溴自由基，首先在体系中向哪种底物分子靠拢？',
        breakBond: '思考：注意观察微粒距离，此时主要发生空间相对位移，化学键是否已经发生断裂？',
        formBond: '思考：此时仅处于碰撞取向准备阶段，是否已经形成了新化学键？'
      },
      summary: '高活性的溴自由基（Br·）向甲烷（CH₄）分子的一个 C—H 键方向靠近，形成有效碰撞取向。'
    },
    {
      index: 3,
      title: '碰撞反应 ①',
      isObservation: false,
      phase: '链增长 ①',
      phaseOptions: ['引发', '链增长 ①', '链增长 ②', '净反应总结'],
      fieldLabel: '微粒变化与反应式',
      equation: 'Br· + CH₄ → CH₃· + HBr',
      equationOptions: [
        'Br· + CH₄ → CH₃· + HBr',
        'Br· + CH₄ → CH₃Br + H·',
        'CH₃· + Br₂ → CH₃Br + Br·',
        'CH₄ + Br₂ → CH₃Br + HBr'
      ],
      breakBond: 'C—H',
      breakBondOptions: ['无', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
      formBond: 'H—Br',
      formBondOptions: ['无', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
      hints: {
        phase: '思考：本步骤仍属于消耗一种自由基、生成另一种自由基的链循环阶段，是哪一步？',
        equation: '思考：高活性溴自由基从烷烃中夺取了什么原子？留下了什么含碳中间体？',
        breakBond: '思考：甲烷分子中哪一个共价键被均裂，使氢原子被夺走？',
        formBond: '思考：被夺走的氢原子与溴微粒结合生成了什么共价键？'
      },
      summary: 'C—H 键断裂，生成 H—Br 键；留下的甲基自由基变为平面三角形构型（CH₃·）。'
    },
    {
      index: 4,
      title: '接近另一分子 Br₂',
      isObservation: false,
      phase: '链增长 ②',
      phaseOptions: ['引发', '链增长 ①', '链增长 ②', '净反应总结'],
      fieldLabel: '反应微粒动态',
      equation: 'CH₃· 与 Br₂ 相互接近',
      equationOptions: [
        'CH₃· 与 Br₂ 相互接近',
        'CH₃· 与 CH₃· 相互结合',
        'CH₃· 与 HBr 相互碰撞',
        'Br· 与 Br· 相互结合'
      ],
      breakBond: '无',
      breakBondOptions: ['无', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
      formBond: '无',
      formBondOptions: ['无', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
      hints: {
        phase: '思考：甲基自由基进入第二轮链反应，这属于哪个阶段？',
        equation: '思考：活泼的甲基自由基在体系中将向哪种反应物分子靠拢并准备夺取原子？',
        breakBond: '思考：空间距离调整与接近过程中，化学键是否已经断裂？',
        formBond: '思考：微粒尚未接触反应前，是否有新化学键形成？'
      },
      summary: '甲基自由基（CH₃·）向体系中另一分子溴单质（Br₂）靠拢，准备夺取其中的一个溴原子。'
    },
    {
      index: 5,
      title: '碰撞反应 ②',
      isObservation: false,
      phase: '链增长 ②',
      phaseOptions: ['引发', '链增长 ①', '链增长 ②', '净反应总结'],
      fieldLabel: '微粒变化与反应式',
      equation: 'CH₃· + Br₂ → CH₃Br + Br·',
      equationOptions: [
        'CH₃· + Br₂ → CH₃Br + Br·',
        'CH₃· + Br· → CH₃Br',
        'Br· + CH₄ → CH₃· + HBr',
        'CH₄ + Br₂ → CH₃Br + HBr'
      ],
      breakBond: 'Br—Br',
      breakBondOptions: ['无', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
      formBond: 'C—Br',
      formBondOptions: ['无', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
      hints: {
        phase: '思考：这是产生一溴甲烷目标产物并再生催化活性自由基的循环步，属于哪个阶段？',
        equation: '思考：甲基自由基与溴单质反应后，除了生成一溴甲烷，还会再生出什么活性自由基延续链反应？',
        breakBond: '思考：甲基自由基进攻溴单质分子时，哪一个共价键发生了均裂？',
        formBond: '思考：碳原子与新结合的溴原子之间形成了什么新化学键？'
      },
      summary: 'Br—Br 键均裂，生成 C—Br 键；得到一溴甲烷（CH₃Br），并重新释放出 1 个 Br·，让链反应循环继续！'
    },
    {
      index: 6,
      title: '产物总结',
      isObservation: false,
      phase: '净反应总结',
      phaseOptions: ['引发', '链增长 ①', '链增长 ②', '净反应总结'],
      fieldLabel: '总反应方程式',
      equation: 'CH₄ + Br₂ → CH₃Br + HBr',
      equationOptions: [
        'CH₄ + Br₂ → CH₃Br + HBr',
        'CH₄ + 2 Br₂ → CH₂Br₂ + 2 HBr',
        '2 CH₃· → CH₃—CH₃',
        'Br· + Br· → Br₂'
      ],
      breakBond: 'C—H、Br—Br',
      breakBondOptions: ['无', 'Br—Br', 'C—H', 'C—H、Br—Br', 'C—Br、H—Br'],
      formBond: 'C—Br、H—Br',
      formBondOptions: ['无', 'Br—Br', 'C—H', 'C—H、Br—Br', 'C—Br、H—Br'],
      hints: {
        phase: '思考：纵观整个自由基取代过程，此时对全过程的物料变化进行归纳，属于什么阶段？',
        equation: '思考：将链增长两步反应相加（消去中间自由基），得到一溴代反应的总化学方程式是什么？',
        breakBond: '思考：从始态物料到终态产物，总共发生了哪些共价键的实质断裂？',
        formBond: '思考：最终产物一溴甲烷和溴化氢中，分别新生成了什么共价键？'
      },
      summary: '甲烷与溴单质发生自由基取代反应的净反应为 CH₄ + Br₂ → CH₃Br + HBr，实质断裂 C—H 键与 Br—Br 键，生成 C—Br 键与 H—Br 键。'
    }
  ];

  function verify(stepIndex, submission) {
    const step = STEPS_DATA[stepIndex];
    if (!step) {
      return { ok: false, hint: '步骤不存在。' };
    }
    if (step.isObservation) {
      return { ok: true, summary: step.summary };
    }

    if (!submission) {
      return { ok: false, hint: '请先完成推演选项填写。' };
    }

    // 1. 检验反应阶段
    if (submission.phase !== step.phase) {
      return {
        ok: false,
        errorField: 'phase',
        hint: step.hints.phase
      };
    }

    // 2. 检验微粒/反应式
    if (submission.equation !== step.equation) {
      return {
        ok: false,
        errorField: 'equation',
        hint: step.hints.equation
      };
    }

    // 3. 检验共价键断裂
    if (submission.breakBond !== step.breakBond) {
      return {
        ok: false,
        errorField: 'breakBond',
        hint: step.hints.breakBond
      };
    }

    // 4. 检验共价键形成
    if (submission.formBond !== step.formBond) {
      return {
        ok: false,
        errorField: 'formBond',
        hint: step.hints.formBond
      };
    }

    return {
      ok: true,
      summary: step.summary
    };
  }

  // 反应链路拖拽装配（4 个核心微观化学反应阶段）
  const PIPELINE_STEPS = [
    {
      id: 'initiation',
      phaseName: '阶段一：链引发',
      condition: 'hν 光照',
      summary: '溴单质受光照激发，Br—Br 键均裂产生 2 个活性溴自由基',
      expectedReactants: ['Br2'],
      expectedProducts: ['Br', 'Br']
    },
    {
      id: 'propagation1',
      phaseName: '阶段二：链增长 ①（夺氢反应）',
      condition: '碰撞取向',
      summary: '高活性溴自由基夺取甲烷中的 H 原子，生成甲基自由基与溴化氢',
      expectedReactants: ['CH4', 'Br'],
      expectedProducts: ['CH3', 'HBr']
    },
    {
      id: 'propagation2',
      phaseName: '阶段三：链增长 ②（成键与再生）',
      condition: '碰撞取向',
      summary: '甲基自由基进攻另一分子溴单质，生成一溴甲烷产物并再生溴自由基继续引发循环',
      expectedReactants: ['CH3', 'Br2'],
      expectedProducts: ['CH3Br', 'Br']
    },
    {
      id: 'termination',
      phaseName: '阶段四：链终止',
      condition: '自由基偶联',
      summary: '体系中的活性自由基两两结合形成稳定共价键，自由基消失，链反应终止（请拼出全部 3 种偶联方式）',
      isMultiReaction: true,
      expectedReactions: [
        { reactants: ['Br', 'Br'], products: ['Br2'] },
        { reactants: ['CH3', 'CH3'], products: ['CH3CH3'] },
        { reactants: ['CH3', 'Br'], products: ['CH3Br'] }
      ]
    }
  ];

  function compareLists(actual, expected) {
    if (!Array.isArray(actual)) return false;
    if (actual.length !== expected.length) return false;
    const actSorted = [...actual].sort();
    const expSorted = [...expected].sort();
    return actSorted.every((val, idx) => val === expSorted[idx]);
  }

  function verifyTerminationStage(step, stageData) {
    const reactions = (stageData && Array.isArray(stageData.reactions)) ? stageData.reactions : [];
    const expectedList = step.expectedReactions;

    if (reactions.length < expectedList.length) {
      return { ok: false, empty: true, hint: `「${step.phaseName}」共有 3 种自由基结合方式，请补充完整。` };
    }

    const matchedIndices = new Set();

    for (let i = 0; i < expectedList.length; i++) {
      const row = reactions[i] || { reactants: [], products: [] };
      const rList = Array.isArray(row.reactants) ? row.reactants : [];
      const pList = Array.isArray(row.products) ? row.products : [];
      const rowNum = i + 1;

      if (rList.length === 0) {
        return { ok: false, empty: i === 0, hint: `「${step.phaseName}」第 ${rowNum} 条反应尚未放置任何反应物，请从微粒池拖入自由基。` };
      }
      if (pList.length === 0) {
        return { ok: false, empty: false, hint: `「${step.phaseName}」第 ${rowNum} 条反应尚未放置生成物，请拖入偶联后的稳定分子。` };
      }

      // 检查反应物是否都是自由基且数量为 2
      const validRadicals = ['Br', 'CH3'];
      if (rList.some(m => !validRadicals.includes(m)) || rList.length !== 2) {
        return {
          ok: false,
          empty: false,
          hint: `思考【链终止 · 第 ${rowNum} 条反应物】：链终止是由两个带有未成对电子（·）的活性自由基相互碰撞结合的过程，请检查第 ${rowNum} 条反应的反应物种类与个数。`
        };
      }

      // 寻找匹配的预期反应物组合
      const expIdx = expectedList.findIndex(exp => compareLists(rList, exp.reactants));
      if (expIdx === -1) {
        return {
          ok: false,
          empty: false,
          hint: `思考【链终止 · 第 ${rowNum} 条反应物】：请检查放入的两个自由基组合是否合理。`
        };
      }

      // 检查生成物是否对应所选的两个自由基
      if (!compareLists(pList, expectedList[expIdx].products)) {
        return {
          ok: false,
          empty: false,
          hint: `思考【链终止 · 第 ${rowNum} 条生成物】：当这两个自由基的孤电子配对成键时，根据元素与原子个数守恒，应当结合成哪一个稳定分子？`
        };
      }

      if (matchedIndices.has(expIdx)) {
        return {
          ok: false,
          empty: false,
          hint: `思考【链终止 · 第 ${rowNum} 条反应】：该反应与上方已拼装的反应重复了！体系中有 Br· 和 CH₃· 两种自由基，请写出它们两两结合的全部 3 种不同组合。`
        };
      }
      matchedIndices.add(expIdx);
    }

    return { ok: true, message: `「${step.phaseName}」全部 3 条偶联反应装配正确！` };
  }

  function verifyStage(stageId, stageData) {
    const step = PIPELINE_STEPS.find(s => s.id === stageId);
    if (!step) return { ok: false, hint: '未知反应阶段' };

    if (step.id === 'termination') {
      return verifyTerminationStage(step, stageData);
    }

    const reactants = (stageData && Array.isArray(stageData.reactants)) ? stageData.reactants : [];
    const products = (stageData && Array.isArray(stageData.products)) ? stageData.products : [];

    if (reactants.length === 0) {
      return { ok: false, empty: true, hint: `「${step.phaseName}」尚未放置任何反应物，请从上方微粒池拖入参与反应的分子。` };
    }
    if (products.length === 0) {
      return { ok: false, empty: false, hint: `「${step.phaseName}」尚未放置任何生成物，请拖入反应生成的微粒。` };
    }

    if (step.id === 'initiation') {
      if (!compareLists(reactants, step.expectedReactants)) {
        return { ok: false, empty: false, hint: '思考【链引发 · 反应物】：在光照激发下，体系中主要是哪种非自由基分子的化学键键能较低、最容易发生均裂？注意检查参与反应的分子种类与数量。' };
      }
      if (!compareLists(products, step.expectedProducts)) {
        return { ok: false, empty: false, hint: '思考【链引发 · 生成物】：卤素单质分子均裂后，化学键断裂平分电子；根据质量守恒与共价键特点，共生成了几个带有孤电子的什么自由基？' };
      }
    } else if (step.id === 'propagation1') {
      if (!compareLists(reactants, step.expectedReactants)) {
        return { ok: false, empty: false, hint: '思考【链增长 ① · 反应物】：引发出的高活性自由基开始搜寻反应底物，首先是哪种自由基与哪种烷烃分子发生碰撞？请核实放入的微粒。' };
      }
      if (!compareLists(products, step.expectedProducts)) {
        return { ok: false, empty: false, hint: '思考【链增长 ① · 生成物】：烷烃失去一个氢原子后留下的自由基是什么？夺走的氢原子与反应微粒结合生成了什么产物？' };
      }
    } else if (step.id === 'propagation2') {
      if (!compareLists(reactants, step.expectedReactants)) {
        return { ok: false, empty: false, hint: '思考【链增长 ② · 反应物】：第一轮链反应留下的碳自由基非常活泼，它将在体系中与大量存在的哪种底物分子继续碰撞？' };
      }
      if (!compareLists(products, step.expectedProducts)) {
        return { ok: false, empty: false, hint: '思考【链增长 ② · 生成物】：这一步除了生成目标有机物外，还需产生什么活性微粒，以确保链反应可以自发循环进行下去？' };
      }
    }
    return { ok: true, message: `「${step.phaseName}」装配正确！` };
  }

  function verifyPipeline(userPipeline) {
    if (!userPipeline || typeof userPipeline !== 'object') {
      return { ok: false, hint: '装配插槽数据无效，请拖入微粒后重试。' };
    }

    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      const step = PIPELINE_STEPS[i];
      const stageData = userPipeline[step.id] || { reactants: [], products: [] };
      const stageCheck = verifyStage(step.id, stageData);
      if (!stageCheck.ok) {
        return { ok: false, errorStage: step.id, hint: stageCheck.hint };
      }
    }

    return { ok: true, message: '🎉 全链路微观反应序列装配完全正确！' };
  }

  const api = {
    STEPS_DATA,
    PIPELINE_STEPS,
    verify,
    verifyPipeline,
    verifyStage
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.ChemDeduction = api;
})(typeof window !== 'undefined' ? window : globalThis);
