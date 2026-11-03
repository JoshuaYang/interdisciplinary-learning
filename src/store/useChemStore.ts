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
  { id: 'CH4', num: '01', name: '甲烷', formula: 'CH4', formulaHtml: 'CH<sub>4</sub>' },
  { id: 'CH3', num: '02', name: '甲基自由基', formula: 'CH3·', formulaHtml: 'CH<sub>3</sub>·' },
  { id: 'CH3Br', num: '03', name: '一溴甲烷', formula: 'CH3Br', formulaHtml: 'CH<sub>3</sub>Br' },
  { id: 'Br2', num: '04', name: '溴单质', formula: 'Br2', formulaHtml: 'Br<sub>2</sub>' },
  { id: 'HBr', num: '05', name: '溴化氢', formula: 'HBr', formulaHtml: 'HBr' },
  { id: 'Br', num: '06', name: '溴自由基', formula: 'Br·', formulaHtml: 'Br·' },
];

export const POOL_MOLECULES: SlotDef[] = [
  ...REQUIRED_SLOTS,
  {
    id: 'CH3CH3',
    num: '07',
    name: '乙烷',
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

export interface ChemStoreState {
  screen: 'gate' | 'pipeline' | 'stage';
  baseData: typeof CHEM_DEFAULT_FILES;
  slotState: Record<string, SlotStatus>;
  previewSlotId: string | null;

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
  validationReport: { errors: string[]; warnings: string[]; accepted: boolean } | null;

  // Dialogs & Toast
  configDialogOpen: boolean;
  helpDialogOpen: boolean;
  toastMessage: string | null;
  resetCameraTrigger: number;

  // Actions
  showToast: (msg: string) => void;
  setScreen: (screen: 'gate' | 'pipeline' | 'stage') => void;
  setPreviewSlotId: (id: string | null) => void;
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

  pipelineData: createInitialPipelineData(),
  selectedPoolMol: null,
  activePipelineTab: 0,
  pipelineVerified: false,
  pipelineFeedback: null,

  config: null,
  states: [],
  sourceName: '预置标准配置',
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
  validationReport: null,

  configDialogOpen: false,
  helpDialogOpen: false,
  toastMessage: null,
  resetCameraTrigger: 0,

  showToast: (msg: string) => {
    clearTimeout(toastTimer);
    set({ toastMessage: msg });
    toastTimer = setTimeout(() => {
      set({ toastMessage: null });
    }, 4200);
  },

  setScreen: (screen) => set({ screen }),
  setPreviewSlotId: (id) => set({ previewSlotId: id }),
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
      const msg = `分子不匹配：当前为 ${expName}，上传的文件为 ${actName}。`;
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
      throw new Error(`不认识的分子标识 ${targetId}`);
    }

    try {
      const template = (baseData.catalog as any)[targetId];
      if (!template) throw new Error(`缺少 ${targetId} 的参考模板。`);
      const mol = files.structure(doc, template);
      const warnings: string[] = [];
      if (Array.isArray(template.measurements)) {
        template.measurements.forEach((q: any) => {
          const n = core.measure(mol, q.atoms);
          if (Number.isFinite(n) && Math.abs(n - q.value) > q.tolerance) {
            warnings.push(
              `${q.label}：当前测量值为 ${n.toFixed(q.atoms.length === 2 ? 3 : 2)}${
                q.atoms.length === 2 ? ' Å' : '°'
              }，偏离实验/理论参考范围，请核对。`
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
            doc: null,
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
                  error: `文件格式有误：${je.message}`,
                  warnings: [],
                },
              },
            });
          } else {
            get().showToast(`${file.name}：文件格式有误，请检查语法。`);
          }
          anyFailed++;
          continue;
        }
        const res = get().verifySingleDoc(doc, targetSlotId);
        if (res.success) anyPassed++;
        else anyFailed++;
      } catch (e: any) {
        anyFailed++;
        get().showToast(`${file.name}：${e.message}`);
      }
    }
    if (anyPassed > 0 && anyFailed === 0) get().showToast(`成功通过 ${anyPassed} 个分子核验！`);
    else if (anyPassed > 0 && anyFailed > 0)
      get().showToast(`${anyPassed} 个通过核验，${anyFailed} 个存在错误。`);
  },

  loadPreset: (silent = false) => {
    const { baseData } = get();
    if (!baseData.students) return;
    baseData.students.forEach((doc) => {
      try {
        get().verifySingleDoc(doc);
      } catch {}
    });
    if (!silent) get().showToast('已载入全部 6 种分子的预置标准配置！');
  },

  loadDefault: async () => {
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      const bundle = (window as any).CHEM_DEFAULT_FILES || CHEM_DEFAULT_FILES;
      set({ baseData: bundle });
      get().loadPreset(true);
      return;
    }
    try {
      async function read(path: string) {
        const r = await fetch(path, { cache: 'no-store' });
        if (!r.ok) throw new Error(`${path}（HTTP ${r.status}）`);
        return await r.json();
      }
      const project = await read('教师配置/项目.json');
      files.checkManifest(project);
      const [catalog, steps, students] = await Promise.all([
        read('教师配置/分子参考.json'),
        Promise.all(
          project.stepFiles.map((f: string) => read('教师配置/步骤/' + encodeURIComponent(f)))
        ),
        Promise.all(
          project.moleculeFiles.map((f: string) =>
            read('教师配置/标准答案/' + encodeURIComponent(f))
          )
        ),
      ]);
      set({ baseData: { project, catalog, steps, students } });
      get().loadPreset(true);
    } catch {
      // Fallback to embedded default bundle
      set({ baseData: CHEM_DEFAULT_FILES });
      get().loadPreset(true);
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
    set({ pipelineData: next, selectedPoolMol: null });
  },

  removeParticleFromZone: (stageId, role, itemIdx, reactionIndex = null) => {
    const next = structuredClone(get().pipelineData);
    if (reactionIndex !== null && reactionIndex !== undefined) {
      next[stageId]?.reactions?.[reactionIndex]?.[role]?.splice(itemIdx, 1);
    } else {
      next[stageId]?.[role]?.splice(itemIdx, 1);
    }
    set({ pipelineData: next });
  },

  resetPipeline: () => {
    set({
      pipelineData: createEmptyPipelineData(),
      pipelineVerified: false,
      pipelineFeedback: null,
    });
    get().showToast('已清空所有反应微粒。');
  },

  autofillPipeline: () => {
    set({
      pipelineData: createInitialPipelineData(),
      pipelineFeedback: null,
    });
    get().showToast('已一键预填标准化学反应微粒！');
  },

  enterPipelineFromGate: () => {
    const validCount = Object.values(get().slotState).filter((s) => s.status === 'valid').length;
    if (validCount !== 6) {
      get().showToast(`当前仅通过 ${validCount} / 6，请先完成全部分子核验。`);
      return false;
    }
    set({ screen: 'pipeline' });
    get().showToast('已载入分子积木，请拼装微观反应序列！');
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

    try {
      const students = REQUIRED_SLOTS.map((s) => slotState[s.id].doc);
      const assembled = files.assemble({
        project: baseData.project,
        catalog: baseData.catalog,
        steps: baseData.steps,
        students,
      });
      const ok = get().installConfig(assembled, '学生核验配置');
      if (!ok) return false;
      set({
        pipelineVerified: true,
        pipelineFeedback: null,
        screen: 'stage',
      });
      get().triggerResetView();
      get().showToast('🎉 反应序列拼装正确！已激活三维反应工作台，请观察原子级断键成键！');
      return true;
    } catch (e: any) {
      get().showToast('组装失败：' + e.message);
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
      result = { errors: ['配置结构无法读取，请检查字段类型。' + e.message], warnings: [] };
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
      document.title = data.title + ' · 反应可视化';
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
          errors: ['每次请选择 1—6 个分子文件，每个文件不超过 1 MB。'],
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
            throw new Error(`${file.name}：JSON 读取失败（${je.message}）`);
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
      } else if (get().installConfig(result.config, '已导入：' + result.changed.join('、'))) {
        docs.forEach((d) => {
          try {
            get().verifySingleDoc(d.data);
          } catch {}
        });
        get().showToast('已更新 ' + result.changed.join('、') + '，其余分子保留当前配置。');
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
    const { slotState, baseData } = get();
    const students = REQUIRED_SLOTS.map((s) => slotState[s.id].doc);
    const assembled = files.assemble({
      project: baseData.project,
      catalog: baseData.catalog,
      steps: baseData.steps,
      students,
    });
    get().installConfig(assembled, '分文件配置');
    get().showToast('已恢复为默认配置。');
  },

  go: (i: number, animate = false) => {
    const { config, unlockedMaxStep, solvedSteps } = get();
    if (!config || i < 0 || i > 6) return;
    if (i > unlockedMaxStep + 1) {
      get().showToast(`🔒 第 ${i + 1} 步尚未解锁，请先完成前序步骤推演。`);
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
    const allSolved = solvedSteps.length === 7;
    const isCurrentSolved = solvedSteps.includes(index);

    if (!isCurrentSolved) {
      get().showToast('🔒 请先完成本步反应推演并检验，即可解锁动画播放。');
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
      nextIndex = index === 6 ? 1 : index + 1;
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
    set({
      solvedSteps: [0, 1, 2, 3, 4, 5, 6],
      unlockedMaxStep: 6,
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
    get().go(stepIdx, true);
    if (nextSolved.length === 7) {
      get().showToast('🎉 恭喜！已完成全部 7 步反应机理推演，全流程连续播放已解锁！');
    } else {
      get().showToast(`第 ${stepIdx + 1} 步推演通过！已解锁下一步。`);
    }
  },
}));
