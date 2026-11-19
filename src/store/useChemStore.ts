import { create } from 'zustand';
import * as core from '../engine/core';
import * as files from '../engine/configFiles';
import * as deduction from '../engine/deduction';
import { CHEM_DEFAULT_FILES } from '../engine/defaultBundle';
import type { ChemConfig, CompiledState, MoleculeModel } from '../types/chem';

export interface SlotDef {
  id: string;
  num: string;
  name: string;
  formula: string;
  formulaHtml: string;
}

export const REQUIRED_SLOTS: SlotDef[] = [
  { id: 'CH4', num: '01', name: 'Methane', formula: 'CH4', formulaHtml: 'CH<sub>4</sub>' },
  { id: 'CH3', num: '02', name: 'Methyl Radical', formula: 'CH3·', formulaHtml: 'CH<sub>3</sub>·' },
  { id: 'CH3Br', num: '03', name: 'Bromomethane', formula: 'CH3Br', formulaHtml: 'CH<sub>3</sub>Br' },
  { id: 'Br2', num: '04', name: 'Bromine', formula: 'Br2', formulaHtml: 'Br<sub>2</sub>' },
  { id: 'HBr', num: '05', name: 'Hydrogen Bromide', formula: 'HBr', formulaHtml: 'HBr' },
  { id: 'Br', num: '06', name: 'Bromine Radical', formula: 'Br·', formulaHtml: 'Br·' },
];

export const POOL_MOLECULES: SlotDef[] = [
  ...REQUIRED_SLOTS,
  {
    id: 'CH3CH3',
    num: '07',
    name: 'Ethane',
    formula: 'CH3CH3',
    formulaHtml: 'CH<sub>3</sub>CH<sub>3</sub>',
  },
];

export interface SlotStatus {
  status: 'empty' | 'valid' | 'error';
  doc: any | null;
  mol: MoleculeModel | null;
  error: string | null;
  warnings: string[];
}

export interface PipelineData {
  initiation: { reactants: string[]; products: string[] };
  propagation1: { reactants: string[]; products: string[] };
  propagation2: { reactants: string[]; products: string[] };
  termination: {
    reactions: { reactants: string[]; products: string[] }[];
  };
  [key: string]: any;
}

const createInitialPipelineData = (): PipelineData => ({
  initiation: { reactants: ['Br2'], products: ['Br', 'Br'] },
  propagation1: { reactants: ['CH4', 'Br'], products: ['CH3', 'HBr'] },
  propagation2: { reactants: ['CH3', 'Br2'], products: ['CH3Br', 'Br'] },
  termination: {
    reactions: [
      { reactants: ['Br', 'Br'], products: ['Br2'] },
      { reactants: ['CH3', 'CH3'], products: ['CH3CH3'] },
      { reactants: ['CH3', 'Br'], products: ['CH3Br'] },
    ],
  },
});

const createEmptyPipelineData = (): PipelineData => ({
  initiation: { reactants: [], products: [] },
  propagation1: { reactants: [], products: [] },
  propagation2: { reactants: [], products: [] },
  termination: {
    reactions: [
      { reactants: [], products: [] },
      { reactants: [], products: [] },
      { reactants: [], products: [] },
    ],
  },
});

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastPayload {
  message: string;
  type: ToastType;
}

export function inferToastType(msg: string, explicitType?: ToastType): ToastType {
  if (explicitType) return explicitType;
  const lower = msg.toLowerCase();
  if (
    lower.includes('verified') ||
    lower.includes('success') ||
    lower.includes('congratulations') ||
    lower.includes('unlocked') ||
    lower.includes('exported') ||
    lower.includes('restored default') ||
    lower.includes('auto-filled')
  ) {
    return 'success';
  }
  if (
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('invalid') ||
    lower.includes('issue') ||
    lower.includes('mismatch') ||
    lower.includes('please add') ||
    lower.includes('please enter') ||
    lower.includes('please specify') ||
    lower.includes('must be connected') ||
    lower.includes('rejected')
  ) {
    return 'error';
  }
  if (
    lower.includes('warning') ||
    lower.includes('locked') ||
    lower.includes('deviates') ||
    lower.includes('only') ||
    lower.includes('must be kept')
  ) {
    return 'warning';
  }
  return 'info';
}

export function buildGuidedStudentDoc(builderDoc: any): any {
  if (!builderDoc) return null;

  // Idempotency: if already a complete central molecule doc
  if (builderDoc.center && Array.isArray(builderDoc.neighbors) && builderDoc.neighbors.length > 0) {
    const doc: any = {
      name: builderDoc.name,
      formula: builderDoc.formula,
      description: builderDoc.description || '',
      center: builderDoc.center,
      neighbors: [...builderDoc.neighbors],
      geometry: builderDoc.geometry || (builderDoc.unpairedElectrons ? 'trigonalPlanar' : 'regularTetrahedral'),
      hybridization: builderDoc.hybridization || (builderDoc.unpairedElectrons ? 'sp2' : 'sp3'),
      bondLengths: builderDoc.bondLengths || {},
      bondAngles: builderDoc.bondAngles || {},
    };
    if (builderDoc.nodes) doc.nodes = builderDoc.nodes;
    if (builderDoc.bonds) doc.bonds = builderDoc.bonds;
    if (builderDoc.unpairedElectrons) doc.unpairedElectrons = builderDoc.unpairedElectrons;
    return doc;
  }

  // Idempotency: if already a complete diatomic or atomic doc with atoms list
  if (Array.isArray(builderDoc.atoms) && builderDoc.atoms.length > 0 && !builderDoc.nodes) {
    const isSingle = builderDoc.atoms.length === 1;
    const doc: any = {
      name: builderDoc.name,
      formula: builderDoc.formula,
      description: builderDoc.description || '',
      atoms: [...builderDoc.atoms],
      geometry: builderDoc.geometry || (isSingle ? 'atomic' : 'diatomic'),
    };
    if (!isSingle) {
      doc.bondLengths = builderDoc.bondLengths || {};
    }
    if (builderDoc.unpairedElectrons) {
      doc.unpairedElectrons = builderDoc.unpairedElectrons;
    }
    return doc;
  }

  const nodes = Array.isArray(builderDoc.nodes) ? builderDoc.nodes : [];
  const bonds = Array.isArray(builderDoc.bonds) ? builderDoc.bonds : [];
  const radicals = nodes.filter((n: any) => n.radical === 1).length;

  const nonHNodes = nodes.filter((n: any) => n.element !== 'H');
  const centerNode = nonHNodes[0] || nodes[0];

  let center = '';
  let neighbors: string[] = [];
  const atoms = nodes.map((n: any) => n.element);

  if (centerNode && nodes.length > 2) {
    center = centerNode.element;
    const neighborIds = bonds
      .filter((b: any) => b.from === centerNode.id || b.to === centerNode.id)
      .map((b: any) => (b.from === centerNode.id ? b.to : b.from));
    neighbors = neighborIds
      .map((id: string) => nodes.find((n: any) => n.id === id)?.element)
      .filter(Boolean);
  }

  const cleanFormula = (builderDoc.formula || '').replace(/[·.]/g, '');

  // 1. Single atom (e.g. Br·)
  if (cleanFormula === 'Br' || (nodes.length <= 1 && cleanFormula !== 'CH4' && cleanFormula !== 'CH3' && cleanFormula !== 'CH3Br' && cleanFormula !== 'Br2' && cleanFormula !== 'HBr')) {
    const doc: any = {
      name: builderDoc.name || 'Bromine Radical',
      formula: builderDoc.formula || 'Br·',
      description: builderDoc.description || '',
      geometry: builderDoc.geometry || 'atomic',
      atoms: atoms.length > 0 ? atoms : ['Br'],
      unpairedElectrons: radicals || builderDoc.unpairedElectrons || 1,
    };
    if (builderDoc.nodes) doc.nodes = builderDoc.nodes;
    if (builderDoc.bonds) doc.bonds = builderDoc.bonds;
    return doc;
  }

  // 2. Diatomic pair (e.g. Br2, HBr)
  if (cleanFormula === 'Br2' || cleanFormula === 'HBr' || nodes.length === 2) {
    const defaultAtoms = cleanFormula === 'HBr' ? ['H', 'Br'] : ['Br', 'Br'];
    const resolvedAtoms = atoms.length === 2 ? atoms : defaultAtoms;
    const rawBL = builderDoc.bondLengths || {};
    const bl: Record<string, number> = {};
    const standardKey = resolvedAtoms.includes('H')
      ? `H-${resolvedAtoms.find((a: string) => a !== 'H')}`
      : `${resolvedAtoms[0]}-${resolvedAtoms[1]}`;
    const revKey = standardKey.split('-').reverse().join('-');
    const val = rawBL[standardKey] ?? rawBL[revKey];
    if (val !== undefined && Number.isFinite(Number(val))) {
      bl[standardKey] = Number(val);
    } else {
      for (const [k, v] of Object.entries(rawBL)) {
        bl[k] = Number(v);
      }
    }

    const doc: any = {
      name: builderDoc.name,
      formula: builderDoc.formula,
      description: builderDoc.description || '',
      geometry: builderDoc.geometry || 'diatomic',
      atoms: resolvedAtoms,
      bondLengths: bl,
    };
    if (builderDoc.nodes) doc.nodes = builderDoc.nodes;
    if (builderDoc.bonds) doc.bonds = builderDoc.bonds;
    if (radicals > 0 || builderDoc.unpairedElectrons) {
      doc.unpairedElectrons = radicals || builderDoc.unpairedElectrons;
    }
    return doc;
  }

  // 3. Central molecule (e.g. CH4, CH3·, CH3Br)
  if (!center) center = 'C';
  if (neighbors.length === 0) {
    if (cleanFormula === 'CH4') neighbors = ['H', 'H', 'H', 'H'];
    else if (cleanFormula === 'CH3') neighbors = ['H', 'H', 'H'];
    else if (cleanFormula === 'CH3Br') neighbors = ['H', 'H', 'H', 'Br'];
    else neighbors = ['H', 'H', 'H', 'H'];
  }

  const rawBL = builderDoc.bondLengths || {};
  const bl: Record<string, number> = {};
  const expectedBLKeys = Array.from(new Set(neighbors.map((nb) => `${center}-${nb}`)));
  for (const k of expectedBLKeys) {
    const rev = k.split('-').reverse().join('-');
    const val = rawBL[k] ?? rawBL[rev];
    if (val !== undefined && Number.isFinite(Number(val))) {
      bl[k] = Number(val);
    }
  }
  if (Object.keys(bl).length === 0) {
    for (const [k, v] of Object.entries(rawBL)) bl[k] = Number(v);
  }

  const rawBA = builderDoc.bondAngles || {};
  const ba: Record<string, number> = {};
  const candidateAngleKeys = ['H-C-H', 'H-C-Br'];
  for (const k of candidateAngleKeys) {
    const rev = k.split('-').reverse().join('-');
    const val = rawBA[k] ?? rawBA[rev];
    if (val !== undefined && Number.isFinite(Number(val))) {
      ba[k] = Number(val);
    }
  }
  if (Object.keys(ba).length === 0) {
    for (const [k, v] of Object.entries(rawBA)) ba[k] = Number(v);
  }

  const doc: any = {
    name: builderDoc.name,
    formula: builderDoc.formula,
    description: builderDoc.description || '',
    geometry: builderDoc.geometry || (cleanFormula === 'CH3' ? 'trigonalPlanar' : 'regularTetrahedral'),
    center,
    neighbors,
    hybridization: builderDoc.hybridization || (cleanFormula === 'CH3' || radicals > 0 ? 'sp2' : 'sp3'),
    bondLengths: bl,
    bondAngles: ba,
  };
  if (builderDoc.nodes) doc.nodes = builderDoc.nodes;
  if (builderDoc.bonds) doc.bonds = builderDoc.bonds;
  if (cleanFormula === 'CH3' || radicals > 0 || builderDoc.unpairedElectrons) {
    doc.unpairedElectrons = radicals || builderDoc.unpairedElectrons || 1;
  }
  return doc;
}

const GUIDED_STORAGE_KEY = 'chem_guided_progress_v2';

export function saveGuidedProgressToStorage(state: {
  slotState?: Record<string, any>;
  pipelineData?: any;
  screen?: string;
  unlockedMaxStep?: number;
  solvedSteps?: number[];
  presetPreFilled?: boolean;
}) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    // CRITICAL: NEVER persist backdoor pre-filled state to localStorage!
    if (state.presetPreFilled) return;

    const cleanSlotState: Record<string, any> = {};
    if (state.slotState) {
      for (const [k, v] of Object.entries(state.slotState)) {
        cleanSlotState[k] = {
          status: v.status,
          doc: v.doc,
          error: v.error,
          warnings: v.warnings,
        };
      }
    }
    const existing = getStoredGuidedProgress() || {};
    if (existing.presetPreFilled) {
      clearStoredGuidedProgress();
    }
    const payload = {
      slotState: state.slotState ? cleanSlotState : existing.slotState,
      pipelineData: state.pipelineData !== undefined ? state.pipelineData : existing.pipelineData,
      screen: state.screen !== undefined ? state.screen : existing.screen,
      unlockedMaxStep: state.unlockedMaxStep !== undefined ? state.unlockedMaxStep : existing.unlockedMaxStep,
      solvedSteps: state.solvedSteps !== undefined ? state.solvedSteps : existing.solvedSteps,
      presetPreFilled: false,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(GUIDED_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Auto-save to localStorage failed:', err);
  }
}

export function getStoredGuidedProgress(): any {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(GUIDED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStoredGuidedProgress() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(GUIDED_STORAGE_KEY);
    }
  } catch {}
}

export interface ChemStoreState {
  screen: 'gate' | 'pipeline' | 'stage';
  baseData: typeof CHEM_DEFAULT_FILES;
  slotState: Record<string, SlotStatus>;
  previewSlotId: string | null;
  builderSlotId: string | null;

  // Step 2: Pipeline
  pipelineData: PipelineData;
  selectedPoolMol: string | null;
  activePipelineTab: number;
  pipelineVerified: boolean;
  pipelineFeedback: { ok: boolean; hint?: string } | null;

  // Step 3: 3D Stage & Deduction
  config: ChemConfig | null;
  states: CompiledState[];
  sourceName: string;
  index: number;
  progress: number;
  playing: boolean;
  continuous: boolean;
  speed: number;
  showMeasurements: boolean;
  showContext: boolean;
  selection: string | null;
  unlockedMaxStep: number;
  solvedSteps: number[];
  presetPreFilled: boolean;
  validationReport: { errors: string[]; warnings: string[]; accepted: boolean } | null;

  // Dialogs & Toast
  configDialogOpen: boolean;
  helpDialogOpen: boolean;
  toast: ToastPayload | null;
  toastMessage: string | null;
  resetCameraTrigger: number;

  // Actions
  showToast: (msg: string, type?: ToastType) => void;
  setScreen: (screen: 'gate' | 'pipeline' | 'stage') => void;
  setPreviewSlotId: (id: string | null) => void;
  openBuilderForSlot: (slotId: string) => void;
  closeBuilderForSlot: () => void;
  saveDocForSlot: (slotId: string, builderDoc: any) => { success: boolean; error?: string };
  setConfigDialogOpen: (open: boolean) => void;
  setHelpDialogOpen: (open: boolean) => void;
  verifySingleDoc: (doc: any, expectedId?: string | null) => {
    success: boolean;
    id: string;
    mol?: MoleculeModel;
    error?: string;
    warnings?: string[];
  };
  processFiles: (fileList: File[], targetSlotId?: string | null) => Promise<void>;
  loadPreset: (silent?: boolean) => void;
  loadDefault: () => Promise<void>;
  initGuidedMode: (preservePreset: boolean) => void;

  // Pipeline Actions
  setSelectedPoolMol: (id: string | null) => void;
  setActivePipelineTab: (idx: number) => void;
  addParticleToZone: (
    stageId: string,
    role: 'reactants' | 'products',
    molId: string,
    reactionIndex?: number | null
  ) => void;
  removeParticleFromZone: (
    stageId: string,
    role: 'reactants' | 'products',
    itemIdx: number,
    reactionIndex?: number | null
  ) => void;
  resetPipeline: () => void;
  autofillPipeline: () => void;
  enterPipelineFromGate: () => boolean;
  submitPipelineAndEnterStage: () => boolean;
  returnToGateFromPipeline: () => void;
  returnToPipeline: () => void;

  // Stage & Playback Actions
  installConfig: (data: ChemConfig, name: string) => boolean;
  importStageFiles: (fileList: File[]) => Promise<void>;
  reloadDefaultConfig: () => Promise<void>;
  go: (i: number, animate?: boolean) => void;
  play: () => void;
  pause: () => void;
  restart: () => void;
  triggerResetView: () => void;
  setProgress: (p: number, stopPlaying?: boolean) => void;
  setSpeed: (s: number) => void;
  toggleMeasurements: () => void;
  toggleContext: () => void;
  setSelection: (atomId: string | null) => void;
  unlockAllSteps: () => void;
  resetDeduction: () => void;
  markStepSolved: (stepIdx: number) => void;
}

let toastTimer: any = null;

const initialSlots: Record<string, SlotStatus> = {};
REQUIRED_SLOTS.forEach((s) => {
  initialSlots[s.id] = { status: 'empty', doc: null, mol: null, error: null, warnings: [] };
});

export const useChemStore = create<ChemStoreState>((set, get) => ({
  screen: 'gate',
  baseData: CHEM_DEFAULT_FILES,
  slotState: initialSlots,
  previewSlotId: null,
  builderSlotId: null,

  pipelineData: createEmptyPipelineData(),
  selectedPoolMol: null,
  activePipelineTab: 0,
  pipelineVerified: false,
  pipelineFeedback: null,

  config: null,
  states: [],
  sourceName: 'Default Configuration',
  index: 0,
  progress: 1,
  playing: false,
  continuous: false,
  speed: 1,
  showMeasurements: false,
  showContext: false,
  selection: null,
  unlockedMaxStep: 0,
  solvedSteps: [0],
  presetPreFilled: false,
  validationReport: null,

  configDialogOpen: false,
  helpDialogOpen: false,
  toast: null,
  toastMessage: null,
  resetCameraTrigger: 0,

  showToast: (msg: string, type?: ToastType) => {
    clearTimeout(toastTimer);
    const resolvedType = inferToastType(msg, type);
    set({
      toast: { message: msg, type: resolvedType },
      toastMessage: msg,
    });
    toastTimer = setTimeout(() => {
      set({ toast: null, toastMessage: null });
    }, 4200);
  },

  setScreen: (screen) => {
    set({ screen });
    saveGuidedProgressToStorage({ screen });
  },
  setPreviewSlotId: (id) => set({ previewSlotId: id }),
  openBuilderForSlot: (slotId) => set({ builderSlotId: slotId }),
  closeBuilderForSlot: () => set({ builderSlotId: null }),
  saveDocForSlot: (slotId, builderDoc) => {
    const guidedDoc = buildGuidedStudentDoc(builderDoc);
    let verifyRes: any = { success: false, error: 'Structure incomplete' };
    try {
      verifyRes = get().verifySingleDoc(guidedDoc, slotId);
    } catch (e: any) {
      verifyRes = { success: false, error: e.message || 'Structure incomplete' };
    }

    // Always preserve user's edited document in slotState and let outer card reflect status
    set((state) => {
      const nextSlotState = {
        ...state.slotState,
        [slotId]: {
          status: (verifyRes.success ? 'valid' : 'error') as SlotStatus['status'],
          doc: guidedDoc,
          mol: verifyRes.mol || null,
          error: verifyRes.success ? null : verifyRes.error || 'Configuration incomplete',
          warnings: verifyRes.warnings || [],
        },
      };
      saveGuidedProgressToStorage({ slotState: nextSlotState });
      return {
        slotState: nextSlotState,
      };
    });

    return { success: true };
  },
  setConfigDialogOpen: (open) => {
    if (open) get().pause();
    set({ configDialogOpen: open });
  },
  setHelpDialogOpen: (open) => {
    if (open) get().pause();
    set({ helpDialogOpen: open });
  },

  verifySingleDoc: (doc: any, expectedId: string | null = null) => {
    const { baseData, slotState } = get();
    let id: string;
    try {
      id = files.identify(doc);
    } catch (e: any) {
      if (expectedId) {
        set({
          slotState: {
            ...slotState,
            [expectedId]: {
              status: 'error',
              doc: null,
              mol: null,
              error: e.message,
              warnings: [],
            },
          },
        });
        return { success: false, id: expectedId, error: e.message };
      }
      throw e;
    }

    if (expectedId && id !== expectedId) {
      const exp = REQUIRED_SLOTS.find((s) => s.id === expectedId);
      const act = REQUIRED_SLOTS.find((s) => s.id === id);
      const expName = exp ? `${exp.name} (${exp.formula})` : expectedId;
      const actName = act ? `${act.name} (${act.formula})` : id;
      const msg = `Molecule mismatch: expected ${expName}, but uploaded ${actName}.`;
      set({
        slotState: {
          ...get().slotState,
          [expectedId]: { status: 'error', doc: null, mol: null, error: msg, warnings: [] },
        },
      });
      return { success: false, id: expectedId, error: msg };
    }

    const targetId = expectedId || id;
    if (!REQUIRED_SLOTS.some((s) => s.id === targetId)) {
      throw new Error(`Unrecognized molecule ID: ${targetId}`);
    }

    try {
      const template = (baseData.catalog as any)[targetId];
      if (!template) throw new Error(`Missing reference template for ${targetId}.`);
      const mol = files.structure(doc, template);
      const warnings: string[] = [];
      if (Array.isArray(template.measurements)) {
        template.measurements.forEach((q: any) => {
          const n = core.measure(mol, q.atoms);
          if (Number.isFinite(n) && Math.abs(n - q.value) > q.tolerance) {
            warnings.push(
              `${q.label}: measured ${n.toFixed(q.atoms.length === 2 ? 3 : 2)}${
                q.atoms.length === 2 ? ' Å' : '°'
              }, deviates from reference value.`
            );
          }
        });
      }
      set({
        slotState: {
          ...get().slotState,
          [targetId]: { status: 'valid', doc, mol, error: null, warnings },
        },
      });
      return { success: true, id: targetId, mol, warnings };
    } catch (err: any) {
      set({
        slotState: {
          ...get().slotState,
          [targetId]: {
            status: 'error',
            doc,
            mol: null,
            error: err.message,
            warnings: [],
          },
        },
      });
      return { success: false, id: targetId, error: err.message };
    }
  },

  processFiles: async (fileList: File[], targetSlotId: string | null = null) => {
    if (!fileList.length) return;
    let anyPassed = 0;
    let anyFailed = 0;
    for (const file of fileList) {
      try {
        const text = await file.text();
        let doc: any;
        try {
          doc = JSON.parse(text);
        } catch (je: any) {
          if (targetSlotId) {
            set({
              slotState: {
                ...get().slotState,
                [targetSlotId]: {
                  status: 'error',
                  doc: null,
                  mol: null,
                  error: `Invalid JSON format: ${je.message}`,
                  warnings: [],
                },
              },
            });
          } else {
            get().showToast(`${file.name}: Invalid JSON syntax.`);
          }
          anyFailed++;
          continue;
        }
        const res = get().verifySingleDoc(doc, targetSlotId);
        if (res.success) anyPassed++;
        else anyFailed++;
      } catch (e: any) {
        anyFailed++;
        get().showToast(`${file.name}: ${e.message}`);
      }
    }
    if (anyPassed > 0 && anyFailed === 0)
      get().showToast(`Successfully verified ${anyPassed} molecule(s)!`);
    else if (anyPassed > 0 && anyFailed > 0)
      get().showToast(`${anyPassed} verified, ${anyFailed} failed verification.`);
  },

  loadPreset: (silent = false) => {
    const { baseData } = get();
    if (!baseData.students) return;
    baseData.students.forEach((doc) => {
      try {
        get().verifySingleDoc(doc);
      } catch {}
    });
    if (!silent) get().showToast('Loaded all 6 preset molecular configurations!');
  },

  loadDefault: async () => {
    const bundle = (typeof window !== 'undefined' && (window as any).CHEM_DEFAULT_FILES) || CHEM_DEFAULT_FILES;
    set({ baseData: bundle });
  },

  initGuidedMode: (preservePreset: boolean) => {
    const bundle = (typeof window !== 'undefined' && (window as any).CHEM_DEFAULT_FILES) || CHEM_DEFAULT_FILES;
    set({ baseData: bundle });
    if (preservePreset) {
      clearStoredGuidedProgress();
      get().loadPreset(true);
      set({
        pipelineData: createInitialPipelineData(),
        pipelineVerified: true,
        pipelineFeedback: { ok: true, hint: 'All 4 reaction stages fully verified!' },
        presetPreFilled: true,
        unlockedMaxStep: 7,
        solvedSteps: [0],
        index: 0,
        progress: 1,
      });
      get().showToast('Developer Mode: Loaded pre-filled deductions (manual verify required)', 'info');
    } else {
      const stored = getStoredGuidedProgress();
      if (stored && !stored.presetPreFilled && stored.slotState && Object.keys(stored.slotState).length > 0) {
        // Restore from legitimate auto-saved progress
        const rehydratedSlotState: Record<string, SlotStatus> = {};
        for (const [k, v] of Object.entries(stored.slotState as Record<string, any>)) {
          let mol = null;
          if (v.doc && v.status === 'valid') {
            try {
              const template = (bundle.catalog as any)[k];
              if (template) {
                const guidedDoc = buildGuidedStudentDoc(v.doc);
                mol = files.structure(guidedDoc, template);
              }
            } catch {
              mol = null;
            }
          }
          rehydratedSlotState[k] = {
            status: v.status || 'empty',
            doc: v.doc || null,
            mol,
            error: v.error || null,
            warnings: v.warnings || [],
          };
        }
        set({
          slotState: rehydratedSlotState,
          pipelineData: stored.pipelineData || createEmptyPipelineData(),
          pipelineVerified: !!stored.pipelineData?.reactions?.length,
          presetPreFilled: !!stored.presetPreFilled,
          screen: stored.screen || 'gate',
          unlockedMaxStep: stored.unlockedMaxStep || 0,
          solvedSteps: stored.solvedSteps || [0],
          index: 0,
          progress: 1,
        });
        get().showToast('Auto-restored your previous experimental progress ✓', 'success');
      } else {
        const emptySlots: Record<string, SlotStatus> = {};
        REQUIRED_SLOTS.forEach((s) => {
          emptySlots[s.id] = { status: 'empty', doc: null, mol: null, error: null, warnings: [] };
        });
        set({
          slotState: emptySlots,
          pipelineData: createEmptyPipelineData(),
          pipelineVerified: false,
          pipelineFeedback: null,
          presetPreFilled: false,
          screen: 'gate',
          unlockedMaxStep: 0,
          solvedSteps: [0],
          index: 0,
          progress: 1,
        });
      }
    }
  },

  setSelectedPoolMol: (id) => set({ selectedPoolMol: id }),
  setActivePipelineTab: (idx) => set({ activePipelineTab: idx }),

  addParticleToZone: (stageId, role, molId, reactionIndex = null) => {
    const next = structuredClone(get().pipelineData);
    if (reactionIndex !== null && reactionIndex !== undefined) {
      if (!next[stageId] || !Array.isArray(next[stageId].reactions)) {
        next[stageId] = {
          reactions: [
            { reactants: [], products: [] },
            { reactants: [], products: [] },
            { reactants: [], products: [] },
          ],
        };
      }
      next[stageId].reactions[reactionIndex][role].push(molId);
    } else {
      if (!next[stageId]) next[stageId] = { reactants: [], products: [] };
      next[stageId][role].push(molId);
    }
    set({ pipelineData: next, selectedPoolMol: null, pipelineFeedback: null });
  },

  removeParticleFromZone: (stageId, role, itemIdx, reactionIndex = null) => {
    const next = structuredClone(get().pipelineData);
    if (reactionIndex !== null && reactionIndex !== undefined) {
      next[stageId]?.reactions?.[reactionIndex]?.[role]?.splice(itemIdx, 1);
    } else {
      next[stageId]?.[role]?.splice(itemIdx, 1);
    }
    set({ pipelineData: next, pipelineFeedback: null });
  },

  resetPipeline: () => {
    set({
      pipelineData: createEmptyPipelineData(),
      pipelineVerified: false,
      pipelineFeedback: null,
    });
    get().showToast('Cleared all reaction species.');
  },

  autofillPipeline: () => {
    set({
      pipelineData: createInitialPipelineData(),
      pipelineFeedback: null,
    });
    get().showToast('Auto-filled standard reaction pathway!');
  },

  enterPipelineFromGate: () => {
    const validCount = Object.values(get().slotState).filter((s) => s.status === 'valid').length;
    if (validCount !== 6) {
      get().showToast(`Only ${validCount} / 6 verified. Please complete all molecule verifications first.`);
      return false;
    }
    set({ screen: 'pipeline' });
    get().showToast('Loaded molecular building blocks. Assemble the reaction pathway!');
    return true;
  },

  submitPipelineAndEnterStage: () => {
    const { pipelineData, slotState, baseData } = get();
    const res = deduction.verifyPipeline(pipelineData);
    if (!res.ok) {
      let nextTab = get().activePipelineTab;
      if (res.errorStage) {
        const errIdx = deduction.PIPELINE_STEPS.findIndex((s) => s.id === res.errorStage);
        if (errIdx >= 0) nextTab = errIdx;
      }
      set({
        pipelineVerified: true,
        activePipelineTab: nextTab,
        pipelineFeedback: { ok: false, hint: res.hint },
      });
      if (res.hint) get().showToast(res.hint);
      return false;
    }

    set({ pipelineFeedback: null });

    try {
      const students = REQUIRED_SLOTS.map((s) => buildGuidedStudentDoc(slotState[s.id]?.doc));
      const assembled = files.assemble({
        project: baseData.project,
        catalog: baseData.catalog,
        steps: baseData.steps,
        students,
      });
      const ok = get().installConfig(assembled, 'Verified Student Config');
      if (!ok) return false;
      set({
        pipelineVerified: true,
        pipelineFeedback: null,
        screen: 'stage',
      });
      get().triggerResetView();
      get().showToast('Reaction pathway verified! Entering 3D Mechanism Workbench.');
      return true;
    } catch (e: any) {
      get().showToast('Assembly failed: ' + e.message);
      return false;
    }
  },

  returnToGateFromPipeline: () => {
    set({ screen: 'gate' });
  },

  returnToPipeline: () => {
    get().pause();
    set({ screen: 'pipeline' });
  },

  installConfig: (data: ChemConfig, name: string) => {
    let result: { errors: string[]; warnings: string[]; states?: CompiledState[] };
    try {
      result = core.validate(data);
    } catch (e: any) {
      result = { errors: ['Invalid configuration structure: ' + e.message], warnings: [] };
    }
    if (result.errors.length || !result.states) {
      set({
        validationReport: {
          errors: result.errors,
          warnings: result.warnings,
          accepted: false,
        },
      });
      return false;
    }
    if (typeof document !== 'undefined') {
      document.title = '3D Interactive Chemical Reaction Workbench';
    }
    set({
      playing: false,
      continuous: false,
      config: data,
      states: result.states,
      sourceName: name,
      index: 0,
      progress: 1,
      selection: null,
      validationReport: {
        errors: result.errors,
        warnings: result.warnings,
        accepted: true,
      },
    });
    return true;
  },

  importStageFiles: async (fileList: File[]) => {
    const { config } = get();
    if (!fileList.length || !config) return;
    get().pause();
    if (fileList.length > 6 || fileList.some((f) => f.size > 1024 * 1024)) {
      set({
        validationReport: {
          errors: ['Please select 1–6 molecule files, each under 1 MB.'],
          warnings: [],
          accepted: false,
        },
      });
      return;
    }
    try {
      const docs = await Promise.all(
        fileList.map(async (file) => {
          try {
            return { name: file.name, data: JSON.parse(await file.text()) };
          } catch (je: any) {
            throw new Error(`${file.name}: Failed to parse JSON (${je.message})`);
          }
        })
      );
      const result = files.apply(config, docs);
      if (result.errors.length || !result.config) {
        set({
          validationReport: {
            errors: result.errors,
            warnings: result.warnings,
            accepted: false,
          },
        });
      } else if (get().installConfig(result.config, 'Imported: ' + result.changed.join(', '))) {
        docs.forEach((d) => {
          try {
            get().verifySingleDoc(d.data);
          } catch {}
        });
        get().showToast('Updated ' + result.changed.join(', ') + '.');
      }
    } catch (err: any) {
      set({
        validationReport: {
          errors: [err.message],
          warnings: [],
          accepted: false,
        },
      });
    }
  },

  reloadDefaultConfig: async () => {
    await get().loadDefault();
    get().loadPreset(true);
    const { slotState, baseData } = get();
    const students = REQUIRED_SLOTS.map((s) => buildGuidedStudentDoc(slotState[s.id]?.doc));
    const assembled = files.assemble({
      project: baseData.project,
      catalog: baseData.catalog,
      steps: baseData.steps,
      students,
    });
    get().installConfig(assembled, 'Default Config');
    get().showToast('Restored default configuration.');
  },

  go: (i: number, animate = false) => {
    const { config, unlockedMaxStep, solvedSteps } = get();
    const maxIdx = config ? config.steps.length - 1 : 7;
    if (!config || i < 0 || i > maxIdx) return;
    if (i > unlockedMaxStep + 1) {
      get().showToast(`Step ${i + 1} is locked. Complete previous step deductions first.`);
      return;
    }
    const isSolved = solvedSteps.includes(i);
    const nextProgress = animate && isSolved && i > 0 ? 0 : isSolved ? 1 : 0;
    const nextPlaying = animate && isSolved && i > 0;
    set({
      index: i,
      progress: nextProgress,
      playing: nextPlaying,
      continuous: false,
      selection: null,
    });
  },

  pause: () => set({ playing: false, continuous: false }),

  play: () => {
    const { config, solvedSteps, index, playing, progress } = get();
    if (!config) return;
    const maxIdx = config.steps.length - 1;
    const allSolved = solvedSteps.length >= config.steps.length;
    const isCurrentSolved = solvedSteps.includes(index);

    if (!isCurrentSolved) {
      get().showToast('Complete and verify the deduction for this step to unlock animation playback.');
      return;
    }
    if (playing) {
      get().pause();
      return;
    }
    if (!allSolved) {
      get().go(index, true);
      return;
    }
    let nextIndex = index;
    let nextProgress = progress;
    if (progress === 1) {
      nextIndex = index >= maxIdx ? 1 : index + 1;
      nextProgress = 0;
    }
    set({
      continuous: true,
      playing: true,
      index: nextIndex,
      progress: nextProgress,
      selection: null,
    });
  },

  restart: () => {
    set({
      playing: false,
      continuous: false,
      index: 0,
      progress: 1,
      selection: null,
    });
    get().triggerResetView();
  },

  triggerResetView: () => set((s) => ({ resetCameraTrigger: s.resetCameraTrigger + 1 })),

  setProgress: (p: number, stopPlaying = false) => {
    if (stopPlaying) {
      set({ playing: false, continuous: false, progress: p });
    } else {
      set({ progress: p });
    }
  },

  setSpeed: (speed) => set({ speed }),
  toggleMeasurements: () => set((s) => ({ showMeasurements: !s.showMeasurements })),
  toggleContext: () => set((s) => ({ showContext: !s.showContext })),
  setSelection: (selection) => set({ selection }),

  unlockAllSteps: () => {
    const maxIdx = (get().config?.steps.length || 8) - 1;
    const all = Array.from({ length: maxIdx + 1 }, (_, i) => i);
    set({
      solvedSteps: all,
      unlockedMaxStep: maxIdx,
    });
  },

  resetDeduction: () => {
    set({
      solvedSteps: [0],
      unlockedMaxStep: 0,
    });
  },

  markStepSolved: (stepIdx: number) => {
    const { solvedSteps, unlockedMaxStep } = get();
    const nextSolved = solvedSteps.includes(stepIdx) ? solvedSteps : [...solvedSteps, stepIdx];
    const nextMax = Math.max(unlockedMaxStep, stepIdx);
    set({
      solvedSteps: nextSolved,
      unlockedMaxStep: nextMax,
    });
    saveGuidedProgressToStorage({ solvedSteps: nextSolved, unlockedMaxStep: nextMax });
    get().go(stepIdx, true);
    if (nextSolved.length === 7) {
      get().showToast('Congratulations! All 7 reaction mechanism steps completed. Continuous playback unlocked!');
    } else {
      get().showToast(`Step ${stepIdx + 1} verified! Next step unlocked.`);
    }
  },
}));
