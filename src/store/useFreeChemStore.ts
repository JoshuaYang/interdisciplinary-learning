import { create } from 'zustand';
import {
  buildUniversalMolecule,
  compileFreeStages,
  formatFormulaHtml,
  type CompiledFreeStage,
  type FreeMoleculeItem,
  type FreeStageDef,
} from '../engine/freeReactionEngine';
import { useChemStore, REQUIRED_SLOTS, POOL_MOLECULES } from './useChemStore';

/**
 * Clean, unified topology JSON schema for all molecules in the Free Reaction Workbench
 */
export const SAMPLE_MOLECULE_DOCS: Record<string, any>[] = [
  {
    name: 'Methane',
    formula: 'CH4',
    geometry: 'regularTetrahedral',
    hybridization: 'sp3',
    bondLengths: { 'C-H': 1.087 },
    bondAngles: { 'H-C-H': 109.471 },
    description: 'Regular tetrahedral saturated alkane with sp3 hybridized carbon.',
    nodes: [
      { id: 'c1', element: 'C', radical: 0, x: 250, y: 160 },
      { id: 'h1', element: 'H', radical: 0, x: 250, y: 52 },
      { id: 'h2', element: 'H', radical: 0, x: 370, y: 160 },
      { id: 'h3', element: 'H', radical: 0, x: 250, y: 268 },
      { id: 'h4', element: 'H', radical: 0, x: 130, y: 160 },
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
      { id: 'br1', element: 'Br', radical: 0, x: 160, y: 160 },
      { id: 'br2', element: 'Br', radical: 0, x: 340, y: 160 },
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
    nodes: [{ id: 'br1', element: 'Br', radical: 1, x: 250, y: 160 }],
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
      { id: 'c1', element: 'C', radical: 1, x: 250, y: 160 },
      { id: 'h1', element: 'H', radical: 0, x: 250, y: 52 },
      { id: 'h2', element: 'H', radical: 0, x: 344, y: 214 },
      { id: 'h3', element: 'H', radical: 0, x: 156, y: 214 },
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
      { id: 'h1', element: 'H', radical: 0, x: 165, y: 160 },
      { id: 'br1', element: 'Br', radical: 0, x: 335, y: 160 },
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
      { id: 'c1', element: 'C', radical: 0, x: 230, y: 160 },
      { id: 'br1', element: 'Br', radical: 0, x: 375, y: 160 },
      { id: 'h1', element: 'H', radical: 0, x: 230, y: 52 },
      { id: 'h2', element: 'H', radical: 0, x: 230, y: 268 },
      { id: 'h3', element: 'H', radical: 0, x: 110, y: 160 },
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
      { id: 'c1', element: 'C', radical: 0, x: 185, y: 160 },
      { id: 'c2', element: 'C', radical: 0, x: 315, y: 160 },
      { id: 'h1', element: 'H', radical: 0, x: 185, y: 52 },
      { id: 'h2', element: 'H', radical: 0, x: 80, y: 160 },
      { id: 'h3', element: 'H', radical: 0, x: 185, y: 268 },
      { id: 'h4', element: 'H', radical: 0, x: 315, y: 52 },
      { id: 'h5', element: 'H', radical: 0, x: 420, y: 160 },
      { id: 'h6', element: 'H', radical: 0, x: 315, y: 268 },
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

export function getSampleDocForSlot(slotId: string): Record<string, any> | null {
  const meta =
    REQUIRED_SLOTS.find((s) => s.id === slotId) ||
    POOL_MOLECULES.find((s) => s.id === slotId);
  if (!meta) return null;
  const match = SAMPLE_MOLECULE_DOCS.find(
    (d) =>
      d.formula === meta.formula ||
      d.name.toLowerCase() === meta.name.toLowerCase() ||
      d.formula.replace(/·/g, '') === meta.id.replace(/·/g, '')
  );
  return match ? JSON.parse(JSON.stringify(match)) : null;
}

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

function buildInitialSampleState(full = false): {
  molecules: FreeMoleculeItem[];
  stages: FreeStageDef[];
} {
  nextMolSeq = 1;
  nextStageSeq = 1;
  // Default to 3 concise, essential molecules so the UI is tidy
  const docs = full ? SAMPLE_MOLECULE_DOCS : SAMPLE_MOLECULE_DOCS.slice(0, 3);
  const molecules = docs.map((d) => createItemFromDoc(d));
  const findId = (formula: string) =>
    molecules.find((m) => m.mol.formula === formula)?.id || molecules[0].id;

  const stages: FreeStageDef[] = full
    ? [
        {
          id: `stage_${nextStageSeq++}`,
          name: 'Homolytic Cleavage',
          reactants: [findId('Br2')],
          products: [findId('Br·'), findId('Br·')],
        },
        {
          id: `stage_${nextStageSeq++}`,
          name: 'Hydrogen Abstraction',
          reactants: [findId('CH4'), findId('Br·')],
          products: [findId('CH3·'), findId('HBr')],
        },
        {
          id: `stage_${nextStageSeq++}`,
          name: 'Radical Substitution',
          reactants: [findId('CH3·'), findId('Br2')],
          products: [findId('CH3Br'), findId('Br·')],
        },
        {
          id: `stage_${nextStageSeq++}`,
          name: 'Methyl Combination',
          reactants: [findId('CH3·'), findId('CH3·')],
          products: [findId('CH3CH3')],
        },
      ]
    : [
        {
          id: `stage_${nextStageSeq++}`,
          name: 'Homolytic Cleavage',
          reactants: [findId('Br2')],
          products: [findId('Br·'), findId('Br·')],
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
  setAppMode: (mode: 'home' | 'guided' | 'free', isBackdoor?: boolean) => void;
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
  manualSaveProgress: () => boolean;
}

const FREE_STORAGE_KEY = 'chem_free_progress_v2';

export function saveFreeProgressToStorage(state: {
  molecules?: FreeMoleculeItem[];
  stages?: FreeStageDef[];
  screen?: string;
  activeStageTab?: number;
}) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const existing = getStoredFreeProgress() || {};
    const payload = {
      molecules: state.molecules ? state.molecules.map((m) => m.doc) : existing.molecules,
      stages: state.stages !== undefined ? state.stages : existing.stages,
      screen: state.screen !== undefined ? state.screen : existing.screen,
      activeStageTab: state.activeStageTab !== undefined ? state.activeStageTab : existing.activeStageTab,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(FREE_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Auto-save free progress to localStorage failed:', err);
  }
}

export function getStoredFreeProgress(): any {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(FREE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getInitialFreeState() {
  const stored = getStoredFreeProgress();
  if (stored && Array.isArray(stored.molecules) && stored.molecules.length > 0) {
    try {
      const molecules: FreeMoleculeItem[] = stored.molecules.map((d: any) => createItemFromDoc(d));
      const stages: FreeStageDef[] =
        Array.isArray(stored.stages) && stored.stages.length > 0
          ? stored.stages
          : [{ id: `stage_1`, name: 'Stage 1', reactants: [], products: [] }];
      const screen =
        stored.screen === 'stage' || stored.screen === 'pipeline' || stored.screen === 'gate'
          ? stored.screen
          : 'gate';
      return {
        molecules,
        stages,
        screen,
        activeStageTab: typeof stored.activeStageTab === 'number' ? stored.activeStageTab : 0,
      };
    } catch (e) {
      console.warn('Failed to restore free progress:', e);
    }
  }
  const sample = buildInitialSampleState();
  return {
    molecules: sample.molecules,
    stages: sample.stages,
    screen: 'gate' as const,
    activeStageTab: 0,
  };
}

export const resolveInitialAppMode = (): 'home' | 'guided' | 'free' => {
  if (typeof window === 'undefined') return 'home';
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const hash = window.location.hash.toLowerCase().replace(/\/+$/, '');
  if (path.endsWith('/guided') || hash === '#/guided' || hash === '#guided') return 'guided';
  if (path.endsWith('/free') || hash === '#/free' || hash === '#free') return 'free';
  return 'home';
};

const initialSample = getInitialFreeState();

export const useFreeChemStore = create<FreeChemStoreState>((set, get) => ({
  appMode: resolveInitialAppMode(),
  screen: initialSample.screen,

  molecules: initialSample.molecules,
  previewMolId: null,
  builderOpen: false,
  editingMolId: null,

  stages: initialSample.stages,
  activeStageTab: initialSample.activeStageTab,
  selectedPoolMolId: null,

  compiledStages: compileFreeStages(initialSample.molecules, initialSample.stages),
  stageIndex: 0,
  progress: 0,
  playing: false,
  continuous: false,
  speed: 1,
  selection: null,
  resetCameraTrigger: 0,

  setAppMode: (appMode, isBackdoor = false) => {
    get().pause();
    useChemStore.getState().pause();
    // Always start from Step 1 ('gate') when entering any workbench
    if (appMode === 'guided') {
      const isAlreadyPreset = useChemStore.getState().presetPreFilled;
      if (isBackdoor) {
        useChemStore.getState().initGuidedMode(true);
      } else if (!isAlreadyPreset) {
        useChemStore.getState().initGuidedMode(false);
      }
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
      saveFreeProgressToStorage({ screen: 'stage' });
      return;
    }
    get().pause();
    set({ screen });
    saveFreeProgressToStorage({ screen });
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
    saveFreeProgressToStorage({ molecules: nextMolecules });
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
    saveFreeProgressToStorage({ molecules: nextMolecules, stages: nextStages });
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
    saveFreeProgressToStorage({ molecules: [], stages: nextStages });
    useChemStore.getState().showToast('Cleared all chemical substances.');
  },

  loadSampleMolecules: () => {
    const sample = buildInitialSampleState(true);
    set({
      molecules: sample.molecules,
      stages: sample.stages,
      activeStageTab: 0,
      compiledStages: compileFreeStages(sample.molecules, sample.stages),
    });
    saveFreeProgressToStorage({ molecules: sample.molecules, stages: sample.stages });
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

  setActiveStageTab: (idx) => {
    set({ activeStageTab: idx });
    saveFreeProgressToStorage({ activeStageTab: idx });
  },
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
    saveFreeProgressToStorage({ stages: nextStages, activeStageTab: nextStages.length - 1 });
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
    saveFreeProgressToStorage({ stages: nextStages, activeStageTab: nextTab });
    if (removed) {
      useChemStore.getState().showToast(`Deleted "${removed.name}"`);
    }
  },

  renameStage: (stageId, name) => {
    const nextStages = get().stages.map((s) => (s.id === stageId ? { ...s, name } : s));
    set({ stages: nextStages });
    saveFreeProgressToStorage({ stages: nextStages });
  },

  addMolToStageZone: (stageId, role, molId) => {
    const nextStages = get().stages.map((s) =>
      s.id === stageId ? { ...s, [role]: [...s[role], molId] } : s
    );
    set({ stages: nextStages, selectedPoolMolId: null });
    saveFreeProgressToStorage({ stages: nextStages });
  },

  removeMolFromStageZone: (stageId, role, itemIdx) => {
    const nextStages = get().stages.map((s) => {
      if (s.id !== stageId) return s;
      const list = [...s[role]];
      list.splice(itemIdx, 1);
      return { ...s, [role]: list };
    });
    set({ stages: nextStages });
    saveFreeProgressToStorage({ stages: nextStages });
  },

  clearCurrentStageZones: () => {
    const { stages, activeStageTab } = get();
    const cur = stages[activeStageTab];
    if (!cur) return;
    const nextStages = stages.map((s, idx) =>
      idx === activeStageTab ? { ...s, reactants: [], products: [] } : s
    );
    set({ stages: nextStages });
    saveFreeProgressToStorage({ stages: nextStages });
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
      playing: false,
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

  manualSaveProgress: () => {
    const { molecules, stages, screen, activeStageTab } = get();
    try {
      saveFreeProgressToStorage({ molecules, stages, screen, activeStageTab });
      useChemStore.getState().showToast('Free workbench progress saved successfully ✓', 'success');
      return true;
    } catch (e: any) {
      useChemStore.getState().showToast('Failed to save: ' + e.message, 'error');
      return false;
    }
  },
}));
