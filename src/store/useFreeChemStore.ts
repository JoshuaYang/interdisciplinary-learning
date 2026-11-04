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
    name: '甲烷',
    formula: 'CH4',
    geometry: 'regularTetrahedral',
    hybridization: 'sp3',
    bondLengths: { 'C-H': 1.087 },
    bondAngles: { 'H-C-H': 109.471 },
    description: '正四面体饱和烷烃分子，C 原子采取 sp3 杂化。',
    nodes: [
      { id: 'c1', element: 'C', radical: 0, x: 220, y: 145 },
      { id: 'h1', element: 'H', radical: 0, x: 220, y: 65 },
      { id: 'h2', element: 'H', radical: 0, x: 300, y: 145 },
      { id: 'h3', element: 'H', radical: 0, x: 220, y: 225 },
      { id: 'h4', element: 'H', radical: 0, x: 140, y: 145 },
    ],
    bonds: [
      { id: 'b1', from: 'c1', to: 'h1', order: 1, length: 1.087 },
      { id: 'b2', from: 'c1', to: 'h2', order: 1, length: 1.087 },
      { id: 'b3', from: 'c1', to: 'h3', order: 1, length: 1.087 },
      { id: 'b4', from: 'c1', to: 'h4', order: 1, length: 1.087 },
    ],
  },
  {
    name: '溴单质',
    formula: 'Br2',
    geometry: 'diatomic',
    hybridization: 'none',
    bondLengths: { 'Br-Br': 2.281 },
    bondAngles: {},
    description: '红棕色双原子卤素分子，受光照或加热易发生共价键均裂。',
    nodes: [
      { id: 'br1', element: 'Br', radical: 0, x: 165, y: 145 },
      { id: 'br2', element: 'Br', radical: 0, x: 275, y: 145 },
    ],
    bonds: [{ id: 'b1', from: 'br1', to: 'br2', order: 1, length: 2.281 }],
  },
  {
    name: '溴自由基',
    formula: 'Br·',
    geometry: 'atomic',
    hybridization: 'none',
    bondLengths: {},
    bondAngles: {},
    description: '含一个未成对电子的高活性溴原子自由基。',
    nodes: [{ id: 'br1', element: 'Br', radical: 1, x: 220, y: 145 }],
    bonds: [],
  },
  {
    name: '甲基自由基',
    formula: 'CH3·',
    geometry: 'trigonalPlanar',
    hybridization: 'sp2',
    bondLengths: { 'C-H': 1.076 },
    bondAngles: { 'H-C-H': 120 },
    description: '平面三角形碳自由基，中心 C 含 1 个未成对电子。',
    nodes: [
      { id: 'c1', element: 'C', radical: 1, x: 220, y: 145 },
      { id: 'h1', element: 'H', radical: 0, x: 220, y: 65 },
      { id: 'h2', element: 'H', radical: 0, x: 290, y: 190 },
      { id: 'h3', element: 'H', radical: 0, x: 150, y: 190 },
    ],
    bonds: [
      { id: 'b1', from: 'c1', to: 'h1', order: 1, length: 1.076 },
      { id: 'b2', from: 'c1', to: 'h2', order: 1, length: 1.076 },
      { id: 'b3', from: 'c1', to: 'h3', order: 1, length: 1.076 },
    ],
  },
  {
    name: '溴化氢',
    formula: 'HBr',
    geometry: 'diatomic',
    hybridization: 'none',
    bondLengths: { 'Br-H': 1.414 },
    bondAngles: {},
    description: '由氢原子与溴原子结合形成的极性双原子共价分子。',
    nodes: [
      { id: 'h1', element: 'H', radical: 0, x: 165, y: 145 },
      { id: 'br1', element: 'Br', radical: 0, x: 275, y: 145 },
    ],
    bonds: [{ id: 'b1', from: 'h1', to: 'br1', order: 1, length: 1.414 }],
  },
  {
    name: '一溴甲烷',
    formula: 'CH3Br',
    geometry: 'tetrahedral',
    hybridization: 'sp3',
    bondLengths: { 'C-H': 1.09, 'C-Br': 1.939 },
    bondAngles: { 'H-C-H': 111.37, 'H-C-Br': 107.5 },
    description: '四面体构型卤代烷烃分子。',
    nodes: [
      { id: 'c1', element: 'C', radical: 0, x: 220, y: 145 },
      { id: 'br1', element: 'Br', radical: 0, x: 305, y: 145 },
      { id: 'h1', element: 'H', radical: 0, x: 220, y: 65 },
      { id: 'h2', element: 'H', radical: 0, x: 220, y: 225 },
      { id: 'h3', element: 'H', radical: 0, x: 140, y: 145 },
    ],
    bonds: [
      { id: 'b1', from: 'c1', to: 'br1', order: 1, length: 1.939 },
      { id: 'b2', from: 'c1', to: 'h1', order: 1, length: 1.09 },
      { id: 'b3', from: 'c1', to: 'h2', order: 1, length: 1.09 },
      { id: 'b4', from: 'c1', to: 'h3', order: 1, length: 1.09 },
    ],
  },
  {
    name: '乙烷',
    formula: 'CH3CH3',
    geometry: 'tetrahedral',
    hybridization: 'sp3',
    bondLengths: { 'C-C': 1.54, 'C-H': 1.09 },
    bondAngles: { 'H-C-H': 109.5, 'H-C-C': 109.5 },
    description: '两个甲基自由基通过 C—C 单键结合生成的双中心烷烃分子。',
    nodes: [
      { id: 'c1', element: 'C', radical: 0, x: 170, y: 145 },
      { id: 'c2', element: 'C', radical: 0, x: 270, y: 145 },
      { id: 'h1', element: 'H', radical: 0, x: 170, y: 70 },
      { id: 'h2', element: 'H', radical: 0, x: 100, y: 145 },
      { id: 'h3', element: 'H', radical: 0, x: 170, y: 220 },
      { id: 'h4', element: 'H', radical: 0, x: 270, y: 70 },
      { id: 'h5', element: 'H', radical: 0, x: 340, y: 145 },
      { id: 'h6', element: 'H', radical: 0, x: 270, y: 220 },
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
      name: '阶段 1：双原子均裂',
      reactants: [findId('Br2')],
      products: [findId('Br·'), findId('Br·')],
    },
    {
      id: `stage_${nextStageSeq++}`,
      name: '阶段 2：夺氢反应',
      reactants: [findId('CH4'), findId('Br·')],
      products: [findId('CH3·'), findId('HBr')],
    },
    {
      id: `stage_${nextStageSeq++}`,
      name: '阶段 3：自由基成键',
      reactants: [findId('CH3·'), findId('Br2')],
      products: [findId('CH3Br'), findId('Br·')],
    },
    {
      id: `stage_${nextStageSeq++}`,
      name: '阶段 4：甲基结合生成乙烷',
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
      useChemStore.getState().showToast(`已删除分子「${removed.mol.name} (${removed.mol.formula})」`);
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
    useChemStore.getState().showToast('已清空全部分子卡片。');
  },

  loadSampleMolecules: () => {
    const sample = buildInitialSampleState();
    set({
      molecules: sample.molecules,
      stages: sample.stages,
      activeStageTab: 0,
      compiledStages: compileFreeStages(sample.molecules, sample.stages),
    });
    useChemStore.getState().showToast(`已载入 ${sample.molecules.length} 种示例分子与 4 个反应阶段！`);
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
          .showToast(`${file.name} 解析失败：${err.message || 'JSON 格式有误'}`);
      }
    }
    if (addedCount > 0 && failedCount === 0) {
      useChemStore
        .getState()
        .showToast(
          targetId
            ? '已更新分子配置并重新生成 3D 结构！'
            : `成功导入 ${addedCount} 个分子结构！`
        );
    }
  },

  setActiveStageTab: (idx) => set({ activeStageTab: idx }),
  setSelectedPoolMolId: (id) => set({ selectedPoolMolId: id }),

  addStage: (name) => {
    const { stages } = get();
    const newStage: FreeStageDef = {
      id: `stage_${Date.now()}_${nextStageSeq++}`,
      name: name?.trim() || `阶段 ${stages.length + 1}`,
      reactants: [],
      products: [],
    };
    const nextStages = [...stages, newStage];
    set({
      stages: nextStages,
      activeStageTab: nextStages.length - 1,
    });
    useChemStore.getState().showToast(`已新增「${newStage.name}」`);
  },

  removeStage: (stageId) => {
    const { stages, activeStageTab } = get();
    if (stages.length <= 1) {
      useChemStore.getState().showToast('至少需要保留 1 个反应阶段。');
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
      useChemStore.getState().showToast(`已删除阶段「${removed.name}」`);
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
    useChemStore.getState().showToast(`已清空「${cur.name}」的反应物与生成物。`);
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
