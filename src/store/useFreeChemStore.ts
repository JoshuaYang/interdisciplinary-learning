import { create } from 'zustand';
import {
  buildUniversalMolecule,
  compileFreeStages,
  formatFormulaHtml,
  type CompiledFreeStage,
  type FreeMoleculeItem,
  type FreeStageDef,
} from '../engine/freeReactionEngine';
import { useChemStore } from './useChemStore';

/**
 * Clean, unified topology JSON schema for all molecules in the Free Reaction Workbench
 */
const SAMPLE_MOLECULE_DOCS: Record<string, any>[] = [
  {
    name: 'Methane',
    formula: 'CH4',
    geometry: 'regularTetrahedral',
    hybridization: 'sp3',
    bondLengths: { 'C-H': 1.087 },
    bondAngles: { 'H-C-H': 109.471 },
    description: 'Regular tetrahedral saturated alkane with sp3 hybridized carbon.',
    nodes: [
      { id: 'c1', element: 'C', radical: 0, x: 220, y: 155 },
      { id: 'h1', element: 'H', radical: 0, x: 220, y: 65 },
      { id: 'h2', element: 'H', radical: 0, x: 310, y: 155 },
      { id: 'h3', element: 'H', radical: 0, x: 220, y: 245 },
      { id: 'h4', element: 'H', radical: 0, x: 130, y: 155 },
    ],
    bonds: [
      { id: 'b1', from: 'c1', to: 'h1', order: 1, length: 1.087 },
      { id: 'b2', from: 'c1', to: 'h2', order: 1, length: 1.087 },
      { id: 'b3', from: 'c1', to: 'h3', order: 1, length: 1.087 },
      { id: 'b4', from: 'c1', to: 'h4', order: 1, length: 1.087 },
    ],
  },
  {
    name: 'Bromine',
    formula: 'Br2',
    geometry: 'diatomic',
    hybridization: 'none',
    bondLengths: { 'Br-Br': 2.281 },
    bondAngles: {},
    description: 'Reddish-brown diatomic halogen molecule susceptible to homolytic cleavage.',
    nodes: [
      { id: 'br1', element: 'Br', radical: 0, x: 165, y: 155 },
      { id: 'br2', element: 'Br', radical: 0, x: 275, y: 155 },
    ],
    bonds: [{ id: 'b1', from: 'br1', to: 'br2', order: 1, length: 2.281 }],
  },
  {
    name: 'Bromine Radical',
    formula: 'Br·',
    geometry: 'atomic',
    hybridization: 'none',
    bondLengths: {},
    bondAngles: {},
    description: 'Highly reactive bromine atom radical containing 1 unpaired electron.',
    nodes: [{ id: 'br1', element: 'Br', radical: 1, x: 220, y: 155 }],
    bonds: [],
  },
  {
    name: 'Methyl Radical',
    formula: 'CH3·',
    geometry: 'trigonalPlanar',
    hybridization: 'sp2',
    bondLengths: { 'C-H': 1.076 },
    bondAngles: { 'H-C-H': 120 },
    description: 'Trigonal planar carbon radical with 1 unpaired electron on the central C.',
    nodes: [
      { id: 'c1', element: 'C', radical: 1, x: 220, y: 155 },
      { id: 'h1', element: 'H', radical: 0, x: 220, y: 65 },
      { id: 'h2', element: 'H', radical: 0, x: 298, y: 205 },
      { id: 'h3', element: 'H', radical: 0, x: 142, y: 205 },
    ],
    bonds: [
      { id: 'b1', from: 'c1', to: 'h1', order: 1, length: 1.076 },
      { id: 'b2', from: 'c1', to: 'h2', order: 1, length: 1.076 },
      { id: 'b3', from: 'c1', to: 'h3', order: 1, length: 1.076 },
    ],
  },
  {
    name: 'Hydrogen Bromide',
    formula: 'HBr',
    geometry: 'diatomic',
    hybridization: 'none',
    bondLengths: { 'Br-H': 1.414 },
    bondAngles: {},
    description: 'Polar covalent diatomic molecule formed by hydrogen and bromine.',
    nodes: [
      { id: 'h1', element: 'H', radical: 0, x: 165, y: 155 },
      { id: 'br1', element: 'Br', radical: 0, x: 275, y: 155 },
    ],
    bonds: [{ id: 'b1', from: 'h1', to: 'br1', order: 1, length: 1.414 }],
  },
  {
    name: 'Bromomethane',
    formula: 'CH3Br',
    geometry: 'tetrahedral',
    hybridization: 'sp3',
    bondLengths: { 'C-H': 1.09, 'C-Br': 1.939 },
    bondAngles: { 'H-C-H': 111.37, 'H-C-Br': 107.5 },
    description: 'Tetrahedral haloalkane molecule.',
    nodes: [
      { id: 'c1', element: 'C', radical: 0, x: 220, y: 155 },
      { id: 'br1', element: 'Br', radical: 0, x: 310, y: 155 },
      { id: 'h1', element: 'H', radical: 0, x: 220, y: 65 },
      { id: 'h2', element: 'H', radical: 0, x: 220, y: 245 },
      { id: 'h3', element: 'H', radical: 0, x: 130, y: 155 },
    ],
    bonds: [
      { id: 'b1', from: 'c1', to: 'br1', order: 1, length: 1.939 },
      { id: 'b2', from: 'c1', to: 'h1', order: 1, length: 1.09 },
      { id: 'b3', from: 'c1', to: 'h2', order: 1, length: 1.09 },
      { id: 'b4', from: 'c1', to: 'h3', order: 1, length: 1.09 },
    ],
  },
  {
    name: 'Ethane',
    formula: 'CH3CH3',
    geometry: 'tetrahedral',
    hybridization: 'sp3',
    bondLengths: { 'C-C': 1.54, 'C-H': 1.09 },
    bondAngles: { 'H-C-H': 109.5, 'H-C-C': 109.5 },
    description: 'Two-center alkane formed by the combination of two methyl radicals.',
    nodes: [
      { id: 'c1', element: 'C', radical: 0, x: 170, y: 155 },
      { id: 'c2', element: 'C', radical: 0, x: 270, y: 155 },
      { id: 'h1', element: 'H', radical: 0, x: 170, y: 75 },
      { id: 'h2', element: 'H', radical: 0, x: 95, y: 155 },
      { id: 'h3', element: 'H', radical: 0, x: 170, y: 235 },
      { id: 'h4', element: 'H', radical: 0, x: 270, y: 75 },
      { id: 'h5', element: 'H', radical: 0, x: 345, y: 155 },
      { id: 'h6', element: 'H', radical: 0, x: 270, y: 235 },
    ],
    bonds: [
      { id: 'b1', from: 'c1', to: 'c2', order: 1, length: 1.54 },
      { id: 'b2', from: 'c1', to: 'h1', order: 1, length: 1.09 },
      { id: 'b3', from: 'c1', to: 'h2', order: 1, length: 1.09 },
      { id: 'b4', from: 'c1', to: 'h3', order: 1, length: 1.09 },
      { id: 'b5', from: 'c2', to: 'h4', order: 1, length: 1.09 },
      { id: 'b6', from: 'c2', to: 'h5', order: 1, length: 1.09 },
      { id: 'b7', from: 'c2', to: 'h6', order: 1, length: 1.09 },
    ],
  },
];

let nextMolSeq = 1;
let nextStageSeq = 1;

function createItemFromDoc(doc: Record<string, any>, forceId?: string): FreeMoleculeItem {
  const mol = buildUniversalMolecule(doc);
  const id = forceId || `free_mol_${nextMolSeq++}`;
  return {
    id,
    doc: JSON.parse(JSON.stringify(doc)),
    mol,
    formulaHtml: formatFormulaHtml(mol.formula),
  };
}

function buildInitialSampleState(): {
  molecules: FreeMoleculeItem[];
  stages: FreeStageDef[];
} {
  nextMolSeq = 1;
  nextStageSeq = 1;
  const molecules = SAMPLE_MOLECULE_DOCS.map((d) => createItemFromDoc(d));
  const findId = (formula: string) =>
    molecules.find((m) => m.mol.formula === formula)?.id || molecules[0].id;

  const stages: FreeStageDef[] = [
    {
      id: `stage_${nextStageSeq++}`,
      name: 'Stage 1: Homolytic Cleavage',
      reactants: [findId('Br2')],
      products: [findId('Br·'), findId('Br·')],
    },
    {
      id: `stage_${nextStageSeq++}`,
      name: 'Stage 2: Hydrogen Abstraction',
      reactants: [findId('CH4'), findId('Br·')],
      products: [findId('CH3·'), findId('HBr')],
    },
    {
      id: `stage_${nextStageSeq++}`,
      name: 'Stage 3: Radical Substitution',
      reactants: [findId('CH3·'), findId('Br2')],
      products: [findId('CH3Br'), findId('Br·')],
    },
    {
      id: `stage_${nextStageSeq++}`,
      name: 'Stage 4: Methyl Combination',
      reactants: [findId('CH3·'), findId('CH3·')],
      products: [findId('CH3CH3')],
    },
  ];
  return { molecules, stages };
}

export interface FreeChemStoreState {
  appMode: 'home' | 'guided' | 'free';
  screen: 'gate' | 'pipeline' | 'stage';

  // Step 1: Arbitrary molecules
  molecules: FreeMoleculeItem[];
  previewMolId: string | null;
  builderOpen: boolean;
  editingMolId: string | null;

  // Step 2: Dynamic stages
  stages: FreeStageDef[];
  activeStageTab: number;
  selectedPoolMolId: string | null;

  // Step 3: 3D Stage & Playback
  compiledStages: CompiledFreeStage[];
  stageIndex: number;
  progress: number;
  playing: boolean;
  continuous: boolean;
  speed: number;
  selection: string | null;
  resetCameraTrigger: number;

  // Actions
  setAppMode: (mode: 'home' | 'guided' | 'free') => void;
  setScreen: (screen: 'gate' | 'pipeline' | 'stage') => void;
  setPreviewMolId: (id: string | null) => void;
  openBuilder: (molId?: string | null) => void;
  closeBuilder: () => void;

  saveMoleculeDoc: (doc: Record<string, any>, targetId?: string | null) => FreeMoleculeItem;
  deleteMolecule: (id: string) => void;
  clearAllMolecules: () => void;
  loadSampleMolecules: () => void;
  processUploadedFiles: (files: File[], targetId?: string | null) => Promise<void>;

  // Step 2 Actions
  setActiveStageTab: (idx: number) => void;
  setSelectedPoolMolId: (id: string | null) => void;
  addStage: (name?: string) => void;
  removeStage: (stageId: string) => void;
  renameStage: (stageId: string, name: string) => void;
  addMolToStageZone: (stageId: string, role: 'reactants' | 'products', molId: string) => void;
  removeMolFromStageZone: (
    stageId: string,
    role: 'reactants' | 'products',
    itemIdx: number
  ) => void;
  clearCurrentStageZones: () => void;
  enterPipeline: () => void;
  enterStage: () => void;

  // Step 3 Playback Actions
  goStage: (idx: number, animate?: boolean) => void;
  play: () => void;
  pause: () => void;
  restart: () => void;
  setProgress: (p: number, stopPlaying?: boolean) => void;
  setSpeed: (s: number) => void;
  setSelection: (atomId: string | null) => void;
  triggerResetView: () => void;
}

const initialSample = buildInitialSampleState();

export const useFreeChemStore = create<FreeChemStoreState>((set, get) => ({
  appMode: 'home',
  screen: 'gate',

  molecules: initialSample.molecules,
  previewMolId: null,
  builderOpen: false,
  editingMolId: null,

  stages: initialSample.stages,
  activeStageTab: 0,
  selectedPoolMolId: null,

  compiledStages: compileFreeStages(initialSample.molecules, initialSample.stages),
  stageIndex: 0,
  progress: 0,
  playing: false,
  continuous: false,
  speed: 1,
  selection: null,
  resetCameraTrigger: 0,

  setAppMode: (appMode) => {
    get().pause();
    useChemStore.getState().pause();
    // Always start from Step 1 ('gate') when entering any workbench
    if (appMode === 'guided') {
      useChemStore.getState().setScreen('gate');
    } else if (appMode === 'free') {
      set({ appMode, screen: 'gate', previewMolId: null, builderOpen: false });
      return;
    }
    set({ appMode });
  },

  setScreen: (screen) => {
    if (screen === 'stage') {
      const compiled = compileFreeStages(get().molecules, get().stages);
      set({
        screen: 'stage',
        compiledStages: compiled,
        stageIndex: 0,
        progress: 0,
        playing: false,
        continuous: false,
      });
      return;
    }
    get().pause();
    set({ screen });
  },

  setPreviewMolId: (previewMolId) => set({ previewMolId }),

  openBuilder: (molId = null) => set({ builderOpen: true, editingMolId: molId }),
  closeBuilder: () => set({ builderOpen: false, editingMolId: null }),

  saveMoleculeDoc: (doc, targetId = null) => {
    const { molecules, stages } = get();
    const item = createItemFromDoc(doc, targetId || undefined);
    let nextMolecules: FreeMoleculeItem[];
    if (targetId && molecules.some((m) => m.id === targetId)) {
      nextMolecules = molecules.map((m) => (m.id === targetId ? item : m));
    } else {
      nextMolecules = [...molecules, item];
    }
    set({
      molecules: nextMolecules,
      compiledStages: compileFreeStages(nextMolecules, stages),
    });
    return item;
  },

  deleteMolecule: (id) => {
    const { molecules, stages, previewMolId, selectedPoolMolId } = get();
    const removed = molecules.find((m) => m.id === id);
    const nextMolecules = molecules.filter((m) => m.id !== id);
    const nextStages = stages.map((st) => ({
      ...st,
      reactants: st.reactants.filter((mId) => mId !== id),
      products: st.products.filter((mId) => mId !== id),
    }));
    set({
      molecules: nextMolecules,
      stages: nextStages,
      previewMolId: previewMolId === id ? null : previewMolId,
      selectedPoolMolId: selectedPoolMolId === id ? null : selectedPoolMolId,
      compiledStages: compileFreeStages(nextMolecules, nextStages),
    });
    if (removed) {
      useChemStore.getState().showToast(`Deleted "${removed.mol.name} (${removed.mol.formula})"`);
    }
  },

  clearAllMolecules: () => {
    const nextStages = get().stages.map((st) => ({
      ...st,
      reactants: [],
      products: [],
    }));
    set({
      molecules: [],
      stages: nextStages,
      previewMolId: null,
      selectedPoolMolId: null,
      compiledStages: [],
    });
    useChemStore.getState().showToast('Cleared all chemical substances.');
  },

  loadSampleMolecules: () => {
    const sample = buildInitialSampleState();
    set({
      molecules: sample.molecules,
      stages: sample.stages,
      activeStageTab: 0,
      compiledStages: compileFreeStages(sample.molecules, sample.stages),
    });
    useChemStore
      .getState()
      .showToast(`Loaded ${sample.molecules.length} sample substances and 4 reaction stages!`);
  },

  processUploadedFiles: async (files, targetId = null) => {
    if (!files.length) return;
    let addedCount = 0;
    let failedCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        const doc = JSON.parse(text);
        const replaceId = i === 0 && targetId ? targetId : null;
        get().saveMoleculeDoc(doc, replaceId);
        addedCount++;
      } catch (err: any) {
        failedCount++;
        useChemStore
          .getState()
          .showToast(`${file.name} failed to parse: ${err.message || 'Invalid JSON'}`);
      }
    }
    if (addedCount > 0 && failedCount === 0) {
      useChemStore
        .getState()
        .showToast(
          targetId
            ? 'Updated molecular structure and regenerated 3D model!'
            : `Successfully imported ${addedCount} chemical substance(s)!`
        );
    }
  },

  setActiveStageTab: (idx) => set({ activeStageTab: idx }),
  setSelectedPoolMolId: (id) => set({ selectedPoolMolId: id }),

  addStage: (name) => {
    const { stages } = get();
    const newStage: FreeStageDef = {
      id: `stage_${Date.now()}_${nextStageSeq++}`,
      name: name?.trim() || `Stage ${stages.length + 1}`,
      reactants: [],
      products: [],
    };
    const nextStages = [...stages, newStage];
    set({
      stages: nextStages,
      activeStageTab: nextStages.length - 1,
    });
    useChemStore.getState().showToast(`Added "${newStage.name}"`);
  },

  removeStage: (stageId) => {
    const { stages, activeStageTab } = get();
    if (stages.length <= 1) {
      useChemStore.getState().showToast('At least 1 reaction stage must be kept.');
      return;
    }
    const idx = stages.findIndex((s) => s.id === stageId);
    const removed = stages[idx];
    const nextStages = stages.filter((s) => s.id !== stageId);
    const nextTab = Math.max(0, Math.min(activeStageTab, nextStages.length - 1));
    set({
      stages: nextStages,
      activeStageTab: nextTab,
    });
    if (removed) {
      useChemStore.getState().showToast(`Deleted "${removed.name}"`);
    }
  },

  renameStage: (stageId, name) => {
    const nextStages = get().stages.map((s) => (s.id === stageId ? { ...s, name } : s));
    set({ stages: nextStages });
  },

  addMolToStageZone: (stageId, role, molId) => {
    const nextStages = get().stages.map((s) =>
      s.id === stageId ? { ...s, [role]: [...s[role], molId] } : s
    );
    set({ stages: nextStages, selectedPoolMolId: null });
  },

  removeMolFromStageZone: (stageId, role, itemIdx) => {
    const nextStages = get().stages.map((s) => {
      if (s.id !== stageId) return s;
      const list = [...s[role]];
      list.splice(itemIdx, 1);
      return { ...s, [role]: list };
    });
    set({ stages: nextStages });
  },

  clearCurrentStageZones: () => {
    const { stages, activeStageTab } = get();
    const cur = stages[activeStageTab];
    if (!cur) return;
    const nextStages = stages.map((s, idx) =>
      idx === activeStageTab ? { ...s, reactants: [], products: [] } : s
    );
    set({ stages: nextStages });
    useChemStore.getState().showToast(`Cleared reactants and products in "${cur.name}".`);
  },

  enterPipeline: () => {
    set({ screen: 'pipeline' });
  },

  enterStage: () => {
    const { molecules, stages } = get();
    const compiled = compileFreeStages(molecules, stages);
    set({
      compiledStages: compiled,
      stageIndex: 0,
      progress: 0,
      playing: true,
      continuous: false,
      selection: null,
      screen: 'stage',
    });
    get().triggerResetView();
  },

  goStage: (idx, animate = true) => {
    const { compiledStages } = get();
    if (idx < 0 || idx >= compiledStages.length) return;
    set({
      stageIndex: idx,
      progress: animate ? 0 : 1,
      playing: animate,
      continuous: false,
      selection: null,
    });
  },

  pause: () => set({ playing: false, continuous: false }),

  play: () => {
    const { playing, progress, stageIndex, compiledStages } = get();
    if (!compiledStages.length) return;
    if (playing) {
      get().pause();
      return;
    }
    if (progress >= 1) {
      set({
        progress: 0,
        playing: true,
        continuous: compiledStages.length > 1,
        stageIndex: stageIndex >= compiledStages.length - 1 && progress >= 1 ? 0 : stageIndex,
      });
    } else {
      set({
        playing: true,
        continuous: true,
      });
    }
  },

  restart: () => {
    set({
      playing: false,
      continuous: false,
      stageIndex: 0,
      progress: 0,
      selection: null,
    });
    get().triggerResetView();
  },

  setProgress: (p, stopPlaying = false) => {
    if (stopPlaying) {
      set({ playing: false, continuous: false, progress: p });
    } else {
      set({ progress: p });
    }
  },

  setSpeed: (speed) => set({ speed }),
  setSelection: (selection) => set({ selection }),
  triggerResetView: () => set((s) => ({ resetCameraTrigger: s.resetCameraTrigger + 1 })),
}));
