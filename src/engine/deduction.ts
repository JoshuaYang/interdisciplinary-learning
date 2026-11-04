/* Step-by-step chemical reaction deduction rules and validator */

export interface DeductionStepData {
  index: number;
  title: string;
  isObservation: boolean;
  phase: string;
  phaseOptions?: string[];
  fieldLabel?: string;
  equation?: string;
  equationOptions?: string[];
  breakBond?: string;
  breakBondOptions?: string[];
  formBond?: string;
  formBondOptions?: string[];
  hints?: {
    phase: string;
    equation: string;
    breakBond: string;
    formBond: string;
  };
  summary: string;
}

export interface PipelineStepDef {
  id: string;
  phaseName: string;
  condition: string;
  summary: string;
  isMultiReaction?: boolean;
  expectedReactants?: string[];
  expectedProducts?: string[];
  expectedReactions?: { reactants: string[]; products: string[] }[];
}

export const STEPS_DATA: DeductionStepData[] = [
  {
    index: 0,
    title: 'Initial Species',
    isObservation: true,
    phase: 'Preparation',
    summary: 'System ready: observe the regular tetrahedral geometry of methane and the diatomic structure of bromine.',
  },
  {
    index: 1,
    title: 'Photoexcitation',
    isObservation: false,
    phase: 'Initiation',
    phaseOptions: ['Initiation', 'Propagation ①', 'Propagation ②', 'Net Summary'],
    fieldLabel: 'Species Change & Equation',
    equation: 'Br₂ → 2 Br·',
    equationOptions: [
      'Br₂ → 2 Br·',
      'CH₄ → CH₃· + H·',
      'Br· + CH₄ → CH₃· + HBr',
      'CH₃· + Br₂ → CH₃Br + Br·',
    ],
    breakBond: 'Br—Br',
    breakBondOptions: ['None', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
    formBond: 'None',
    formBondOptions: ['None', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
    hints: {
      phase:
        'Hint: Under UV light (hν), a stable non-radical molecule undergoes homolysis to generate initial radicals. Which stage is this?',
      equation: 'Hint: Observe the irradiated molecule—how does it cleave into two identical reactive species?',
      breakBond: 'Hint: The reactant is a bromine molecule. Which covalent bond undergoes homolytic cleavage?',
      formBond: 'Hint: Homolytic cleavage only separates atoms into isolated radicals. Is any new bond formed in this step?',
    },
    summary:
      'Light energy drives homolytic cleavage of the Br—Br bond, splitting the bonding electron pair equally to produce two reactive bromine radicals (Br·).',
  },
  {
    index: 2,
    title: 'Approach CH₄',
    isObservation: false,
    phase: 'Propagation ①',
    phaseOptions: ['Initiation', 'Propagation ①', 'Propagation ②', 'Net Summary'],
    fieldLabel: 'Particle Dynamics',
    equation: 'Br· approaches CH₄',
    equationOptions: [
      'Br· approaches CH₄',
      'Br· combines with Br·',
      'CH₃· approaches Br₂',
      'HBr collides with CH₃Br',
    ],
    breakBond: 'None',
    breakBondOptions: ['None', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
    formBond: 'None',
    formBondOptions: ['None', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
    hints: {
      phase: 'Hint: The reactive radical generated in initiation starts approaching a substrate molecule. Which stage has the reaction entered?',
      equation: 'Hint: Which substrate molecule does the reactive bromine radical approach first?',
      breakBond: 'Hint: Notice the interatomic distance—only spatial alignment is happening here. Has any bond broken yet?',
      formBond: 'Hint: The particles are only aligning for collision. Has any new covalent bond formed yet?',
    },
    summary:
      'A highly reactive bromine radical (Br·) approaches one of the C—H bonds of methane (CH₄) in an effective collision orientation.',
  },
  {
    index: 3,
    title: 'Collision ①',
    isObservation: false,
    phase: 'Propagation ①',
    phaseOptions: ['Initiation', 'Propagation ①', 'Propagation ②', 'Net Summary'],
    fieldLabel: 'Species Change & Equation',
    equation: 'Br· + CH₄ → CH₃· + HBr',
    equationOptions: [
      'Br· + CH₄ → CH₃· + HBr',
      'Br· + CH₄ → CH₃Br + H·',
      'CH₃· + Br₂ → CH₃Br + Br·',
      'CH₄ + Br₂ → CH₃Br + HBr',
    ],
    breakBond: 'C—H',
    breakBondOptions: ['None', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
    formBond: 'H—Br',
    formBondOptions: ['None', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
    hints: {
      phase: 'Hint: This step consumes one radical and generates a new carbon radical in the first propagation step.',
      equation: 'Hint: What atom does the bromine radical abstract from methane, and what carbon intermediate remains?',
      breakBond: 'Hint: Which covalent bond in methane undergoes homolysis as the hydrogen atom is abstracted?',
      formBond: 'Hint: What new covalent bond forms when the abstracted hydrogen combines with the bromine radical?',
    },
    summary: 'The C—H bond breaks and an H—Br bond forms; the remaining methyl radical adopts a trigonal planar geometry (CH₃·).',
  },
  {
    index: 4,
    title: 'Approach Br₂',
    isObservation: false,
    phase: 'Propagation ②',
    phaseOptions: ['Initiation', 'Propagation ①', 'Propagation ②', 'Net Summary'],
    fieldLabel: 'Particle Dynamics',
    equation: 'CH₃· approaches Br₂',
    equationOptions: [
      'CH₃· approaches Br₂',
      'CH₃· combines with CH₃·',
      'CH₃· collides with HBr',
      'Br· combines with Br·',
    ],
    breakBond: 'None',
    breakBondOptions: ['None', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
    formBond: 'None',
    formBondOptions: ['None', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
    hints: {
      phase: 'Hint: The methyl radical enters the second propagation step of the chain cycle.',
      equation: 'Hint: Which reactant molecule does the reactive methyl radical approach to abstract a halogen atom?',
      breakBond: 'Hint: During spatial approach prior to collision, has any covalent bond broken yet?',
      formBond: 'Hint: Before the reactive collision occurs, has any new covalent bond formed?',
    },
    summary:
      'The methyl radical (CH₃·) approaches another bromine molecule (Br₂) in the system, preparing to abstract a bromine atom.',
  },
  {
    index: 5,
    title: 'Collision ②',
    isObservation: false,
    phase: 'Propagation ②',
    phaseOptions: ['Initiation', 'Propagation ①', 'Propagation ②', 'Net Summary'],
    fieldLabel: 'Species Change & Equation',
    equation: 'CH₃· + Br₂ → CH₃Br + Br·',
    equationOptions: [
      'CH₃· + Br₂ → CH₃Br + Br·',
      'CH₃· + Br· → CH₃Br',
      'Br· + CH₄ → CH₃· + HBr',
      'CH₄ + Br₂ → CH₃Br + HBr',
    ],
    breakBond: 'Br—Br',
    breakBondOptions: ['None', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
    formBond: 'C—Br',
    formBondOptions: ['None', 'Br—Br', 'C—H', 'C—Br', 'H—Br'],
    hints: {
      phase: 'Hint: This step produces bromomethane and regenerates a bromine radical to sustain the chain cycle.',
      equation:
        'Hint: When the methyl radical reacts with bromine, in addition to bromomethane, what radical is regenerated?',
      breakBond: 'Hint: When the methyl radical attacks the bromine molecule, which covalent bond cleaves?',
      formBond: 'Hint: What new covalent bond forms between the carbon atom and the newly attached bromine atom?',
    },
    summary:
      'The Br—Br bond cleaves and a C—Br bond forms, yielding bromomethane (CH₃Br) and regenerating a Br· radical so the chain cycle continues!',
  },
  {
    index: 6,
    title: 'Net Summary',
    isObservation: false,
    phase: 'Net Summary',
    phaseOptions: ['Initiation', 'Propagation ①', 'Propagation ②', 'Net Summary'],
    fieldLabel: 'Overall Reaction Equation',
    equation: 'CH₄ + Br₂ → CH₃Br + HBr',
    equationOptions: [
      'CH₄ + Br₂ → CH₃Br + HBr',
      'CH₄ + 2 Br₂ → CH₂Br₂ + 2 HBr',
      '2 CH₃· → CH₃—CH₃',
      'Br· + Br· → Br₂',
    ],
    breakBond: 'C—H, Br—Br',
    breakBondOptions: ['None', 'Br—Br', 'C—H', 'C—H, Br—Br', 'C—Br, H—Br'],
    formBond: 'C—Br, H—Br',
    formBondOptions: ['None', 'Br—Br', 'C—H', 'C—H, Br—Br', 'C—Br, H—Br'],
    hints: {
      phase: 'Hint: Reviewing the overall material transformation across the entire substitution process corresponds to which stage?',
      equation: 'Hint: Adding the two propagation steps together (canceling radical intermediates) gives what overall equation?',
      breakBond: 'Hint: From initial reactants to final products, which covalent bonds are net broken?',
      formBond: 'Hint: In the final products bromomethane and hydrogen bromide, which covalent bonds are newly formed?',
    },
    summary:
      'The net radical substitution reaction between methane and bromine is CH₄ + Br₂ → CH₃Br + HBr, breaking C—H and Br—Br bonds and forming C—Br and H—Br bonds.',
  },
];

export function verify(
  stepIndex: number,
  submission?: Partial<{
    phase: string;
    equation: string;
    breakBond: string;
    formBond: string;
  }> | null
): {
  ok: boolean;
  errorField?: string;
  hint?: string;
  summary?: string;
} {
  const step = STEPS_DATA[stepIndex];
  if (!step) {
    return { ok: false, hint: 'Step does not exist.' };
  }
  if (step.isObservation) {
    return { ok: true, summary: step.summary };
  }
  if (!submission) {
    return { ok: false, hint: 'Please complete all deduction fields first.' };
  }
  if (submission.phase !== step.phase) {
    return { ok: false, errorField: 'phase', hint: step.hints!.phase };
  }
  if (submission.equation !== step.equation) {
    return { ok: false, errorField: 'equation', hint: step.hints!.equation };
  }
  if (submission.breakBond !== step.breakBond) {
    return { ok: false, errorField: 'breakBond', hint: step.hints!.breakBond };
  }
  if (submission.formBond !== step.formBond) {
    return { ok: false, errorField: 'formBond', hint: step.hints!.formBond };
  }
  return { ok: true, summary: step.summary };
}

export const PIPELINE_STEPS: PipelineStepDef[] = [
  {
    id: 'initiation',
    phaseName: 'Stage 1: Chain Initiation',
    condition: 'hν UV Light',
    summary: 'Bromine absorbs light energy and undergoes homolytic Br—Br cleavage to produce 2 reactive bromine radicals',
    expectedReactants: ['Br2'],
    expectedProducts: ['Br', 'Br'],
  },
  {
    id: 'propagation1',
    phaseName: 'Stage 2: Propagation ① (H-Abstraction)',
    condition: 'Collision Alignment',
    summary: 'A reactive bromine radical abstracts a hydrogen atom from methane to form a methyl radical and HBr',
    expectedReactants: ['CH4', 'Br'],
    expectedProducts: ['CH3', 'HBr'],
  },
  {
    id: 'propagation2',
    phaseName: 'Stage 3: Propagation ② (Halogen Transfer)',
    condition: 'Collision Alignment',
    summary: 'The methyl radical attacks another bromine molecule, forming bromomethane and regenerating a bromine radical',
    expectedReactants: ['CH3', 'Br2'],
    expectedProducts: ['CH3Br', 'Br'],
  },
  {
    id: 'termination',
    phaseName: 'Stage 4: Chain Termination',
    condition: 'Radical Coupling',
    summary:
      'Reactive radicals combine pairwise to form stable covalent bonds, terminating the chain reaction (assemble all 3 coupling pathways)',
    isMultiReaction: true,
    expectedReactions: [
      { reactants: ['Br', 'Br'], products: ['Br2'] },
      { reactants: ['CH3', 'CH3'], products: ['CH3CH3'] },
      { reactants: ['CH3', 'Br'], products: ['CH3Br'] },
    ],
  },
];

function compareLists(actual: unknown, expected: string[]): boolean {
  if (!Array.isArray(actual)) return false;
  if (actual.length !== expected.length) return false;
  const actSorted = [...actual].sort();
  const expSorted = [...expected].sort();
  return actSorted.every((val, idx) => val === expSorted[idx]);
}

function verifyTerminationStage(step: PipelineStepDef, stageData: any) {
  const reactions = stageData && Array.isArray(stageData.reactions) ? stageData.reactions : [];
  const expectedList = step.expectedReactions!;

  if (reactions.length < expectedList.length) {
    return {
      ok: false,
      empty: true,
      hint: `"${step.phaseName}" has 3 radical coupling pathways. Please complete all of them.`,
    };
  }

  const matchedIndices = new Set<number>();

  for (let i = 0; i < expectedList.length; i++) {
    const row = reactions[i] || { reactants: [], products: [] };
    const rList = Array.isArray(row.reactants) ? row.reactants : [];
    const pList = Array.isArray(row.products) ? row.products : [];
    const rowNum = i + 1;

    if (rList.length === 0) {
      return {
        ok: false,
        empty: i === 0,
        hint: `Pathway #${rowNum} in "${step.phaseName}" has no reactants yet. Drag radicals from the pool above.`,
      };
    }
    if (pList.length === 0) {
      return {
        ok: false,
        empty: false,
        hint: `Pathway #${rowNum} in "${step.phaseName}" has no products yet. Drag the coupled stable molecule.`,
      };
    }

    const validRadicals = ['Br', 'CH3'];
    if (rList.some((m: string) => !validRadicals.includes(m)) || rList.length !== 2) {
      return {
        ok: false,
        empty: false,
        hint: `Hint [Chain Termination · Pathway #${rowNum} Reactants]: Chain termination is the coupling of two reactive radicals carrying unpaired electrons (·). Check the reactant types and count.`,
      };
    }

    const expIdx = expectedList.findIndex((exp) => compareLists(rList, exp.reactants));
    if (expIdx === -1) {
      return {
        ok: false,
        empty: false,
        hint: `Hint [Chain Termination · Pathway #${rowNum} Reactants]: Please check whether the two radicals placed are valid.`,
      };
    }

    if (!compareLists(pList, expectedList[expIdx].products)) {
      return {
        ok: false,
        empty: false,
        hint: `Hint [Chain Termination · Pathway #${rowNum} Products]: By conservation of atoms, which stable molecule forms when these two radicals pair their unpaired electrons?`,
      };
    }

    if (matchedIndices.has(expIdx)) {
      return {
        ok: false,
        empty: false,
        hint: `Hint [Chain Termination · Pathway #${rowNum}]: Duplicate reaction pathway! With Br· and CH₃· in the system, assemble all 3 distinct pairwise combinations.`,
      };
    }
    matchedIndices.add(expIdx);
  }

  return { ok: true, message: `All 3 pathways in "${step.phaseName}" assembled correctly!` };
}

export function verifyStage(
  stageId: string,
  stageData: any
): { ok: boolean; empty?: boolean; hint?: string; message?: string } {
  const step = PIPELINE_STEPS.find((s) => s.id === stageId);
  if (!step) return { ok: false, hint: 'Unknown reaction stage' };

  if (step.id === 'termination') {
    return verifyTerminationStage(step, stageData);
  }

  const reactants = stageData && Array.isArray(stageData.reactants) ? stageData.reactants : [];
  const products = stageData && Array.isArray(stageData.products) ? stageData.products : [];

  if (reactants.length === 0) {
    return {
      ok: false,
      empty: true,
      hint: `"${step.phaseName}" has no reactants placed yet. Drag participating species from the pool above.`,
    };
  }
  if (products.length === 0) {
    return {
      ok: false,
      empty: false,
      hint: `"${step.phaseName}" has no products placed yet. Drag resulting species from the pool above.`,
    };
  }

  if (step.id === 'initiation') {
    if (!compareLists(reactants, step.expectedReactants!)) {
      return {
        ok: false,
        empty: false,
        hint: 'Hint [Initiation · Reactants]: Under UV irradiation, which non-radical molecule has the lowest bond dissociation energy and undergoes homolysis first?',
      };
    }
    if (!compareLists(products, step.expectedProducts!)) {
      return {
        ok: false,
        empty: false,
        hint: 'Hint [Initiation · Products]: After homolytic cleavage of the halogen molecule, how many radicals with unpaired electrons are produced?',
      };
    }
  } else if (step.id === 'propagation1') {
    if (!compareLists(reactants, step.expectedReactants!)) {
      return {
        ok: false,
        empty: false,
        hint: 'Hint [Propagation ① · Reactants]: Which reactive radical generated in initiation collides with which alkane substrate molecule?',
      };
    }
    if (!compareLists(products, step.expectedProducts!)) {
      return {
        ok: false,
        empty: false,
        hint: 'Hint [Propagation ① · Products]: What radical remains after methane loses a hydrogen atom, and what molecule forms when that hydrogen combines with the bromine radical?',
      };
    }
  } else if (step.id === 'propagation2') {
    if (!compareLists(reactants, step.expectedReactants!)) {
      return {
        ok: false,
        empty: false,
        hint: 'Hint [Propagation ② · Reactants]: Which abundant reactant molecule does the reactive methyl radical collide with next?',
      };
    }
    if (!compareLists(products, step.expectedProducts!)) {
      return {
        ok: false,
        empty: false,
        hint: 'Hint [Propagation ② · Products]: Besides forming the target bromomethane product, what active radical is regenerated to keep the chain cycle running?',
      };
    }
  }
  return { ok: true, message: `"${step.phaseName}" assembled correctly!` };
}

export function verifyPipeline(userPipeline: any): {
  ok: boolean;
  errorStage?: string;
  hint?: string;
  message?: string;
} {
  if (!userPipeline || typeof userPipeline !== 'object') {
    return { ok: false, hint: 'Invalid pipeline slot data. Please drag species into the slots and try again.' };
  }

  for (let i = 0; i < PIPELINE_STEPS.length; i++) {
    const step = PIPELINE_STEPS[i];
    const stageData = userPipeline[step.id] || { reactants: [], products: [] };
    const stageCheck = verifyStage(step.id, stageData);
    if (!stageCheck.ok) {
      return { ok: false, errorStage: step.id, hint: stageCheck.hint };
    }
  }

  return { ok: true, message: '🎉 All microscopic reaction stages assembled accurately!' };
}

export const ChemDeduction = {
  STEPS_DATA,
  PIPELINE_STEPS,
  verify,
  verifyPipeline,
  verifyStage,
};
export default ChemDeduction;
