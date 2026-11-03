/* Student files contain chemistry only. Teacher metadata supplies names and wiring. */
import * as core from './core';
import type { ChemConfig, MoleculeModel } from '../types/chem';

const object = (v: unknown): v is Record<string, any> =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const own = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const specs: Record<string, any> = {
  CH4: {
    kind: 'center',
    center: 'c',
    neighbors: ['h1', 'h2', 'h3', 'h4'],
    shapes: ['regularTetrahedral'],
    radicals: 0,
  },
  CH3: {
    kind: 'center',
    center: 'c',
    neighbors: ['h1', 'h2', 'h3'],
    shapes: ['trigonalPlanar'],
    radicals: 1,
  },
  CH3Br: {
    kind: 'center',
    center: 'c',
    neighbors: ['h1', 'h2', 'h3', 'br'],
    shapes: ['tetrahedral', 'regularTetrahedral'],
    radicals: 0,
  },
  Br2: {
    kind: 'pair',
    ids: ['br1', 'br2'],
    shapes: ['diatomic', 'linear'],
    bond: 'Br-Br',
    sign: -1,
  },
  HBr: {
    kind: 'pair',
    ids: ['h', 'br'],
    shapes: ['diatomic', 'linear'],
    bond: 'H-Br',
    sign: 1,
  },
  Br: {
    kind: 'atom',
    ids: ['br'],
    shapes: ['atomic'],
    radicals: 1,
  },
};

export const geometryLabels: Record<string, string> = {
  regularTetrahedral: '正四面体',
  tetrahedral: '四面体',
  trigonalPlanar: '平面三角形',
  diatomic: '双原子分子',
  linear: '直线形',
  atomic: '单原子',
};

const sameElements = (a: unknown, b: string[]): boolean =>
  Array.isArray(a) &&
  a.every((x) => typeof x === 'string') &&
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

export function identify(doc: any): string {
  if (!object(doc) || typeof doc.formula !== 'string')
    throw new Error('请填写 formula，例如 "formula": "CH4"。');
  const formula = doc.formula
    .replace(/[₀-₉]/g, (c: string) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c)))
    .replace(/\.$/, '·');
  const ids: Record<string, string> = {
    CH4: 'CH4',
    'CH3·': 'CH3',
    CH3Br: 'CH3Br',
    Br2: 'Br2',
    HBr: 'HBr',
    'Br·': 'Br',
  };
  if (!own(ids, formula))
    throw new Error('formula 不受支持：请填写 CH4、CH3·、CH3Br、Br2、HBr 或 Br·，自由基须带点。');
  return ids[formula];
}

export function structure(doc: any, template: any): MoleculeModel {
  const id = identify(doc);
  const spec = specs[id];
  if (!template) throw new Error(`缺少 ${id} 的教师参考配置。`);
  const fields =
    spec.kind === 'center'
      ? ['center', 'neighbors', 'geometry', 'bondLengths', 'unpairedElectrons']
      : spec.kind === 'pair'
      ? ['atoms', 'geometry', 'bondLengths']
      : ['atoms', 'geometry', 'unpairedElectrons'];
  fields.push('name', 'formula', 'description');
  if (spec.kind === 'center') fields.push('bondAngles', 'hybridization');
  for (const k of Object.keys(doc))
    if (!fields.includes(k))
      throw new Error(`不认识字段「${k}」。此类结构只使用：${fields.join('、')}。`);
  if (!spec.shapes.includes(doc['geometry']))
    throw new Error(`${id} 的空间构型填写有误，请结合中心原子杂化与成键形式填写标准构型标识。`);
  const elements: Record<string, string> =
    template.elements ||
    Object.fromEntries(template.atoms.map((a: any) => [a.id, a.element]));
  for (const [key, max] of [
    ['name', 80],
    ['description', 1000],
  ] as const)
    if (typeof doc[key] !== 'string' || !doc[key].trim() || doc[key].length > max)
      throw new Error(`${key} 请填写非空文字，不超过 ${max} 个字符。`);
  const formula =
    typeof doc.formula === 'string'
      ? doc.formula.replace(/[₀-₉]/g, (c: string) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c)))
      : '';
  const radicalFormula = spec.radicals === 1;
  if (radicalFormula !== /[·.]$/.test(formula))
    throw new Error('formula：自由基请在化学式末尾加 ·，普通分子不要加点。');
  const body = formula.replace(/[·.]$/, '');
  const parts = [...body.matchAll(/([A-Z][a-z]?)([1-9][0-9]*)?/g)];
  const counts: Record<string, number> = {};
  for (const m of parts) counts[m[1]] = (counts[m[1]] || 0) + Number(m[2] || 1);
  const expectedCounts: Record<string, number> = {};
  for (const e of Object.values(elements)) expectedCounts[e] = (expectedCounts[e] || 0) + 1;
  if (
    parts.map((m) => m[0]).join('') !== body ||
    Object.keys(counts).length !== Object.keys(expectedCounts).length ||
    Object.entries(expectedCounts).some(([e, n]) => counts[e] !== n)
  )
    throw new Error('formula 与原子组成不一致，请检查元素和数量。');
  if (spec.kind === 'center' && doc.hybridization !== (id === 'CH3' ? 'sp2' : 'sp3'))
    throw new Error(`hybridization：杂化类型不正确，请结合中心原子的价层电子对数与几何构型分析。`);
  const positions: Record<string, [number, number, number]> = {};
  let bonds: [string, string][] = [];
  let radicals: string[] = [];
  if (spec.kind === 'center') {
    if (doc['center'] !== elements[spec.center])
      throw new Error(`${id} 的中心原子填写有误，请核对分子式与成键中心。`);
    const expected = spec.neighbors.map((n: string) => elements[n]);
    if (!sameElements(doc['neighbors'], expected))
      throw new Error(`${id} 的周围原子填写有误，请核对与中心原子相连的元素种类和数量。`);
    const count = doc['unpairedElectrons'] ?? 0;
    if (count !== spec.radicals)
      throw new Error(`${id} 的未成对电子数不符合该物种特性，请判断其属于稳定分子还是自由基。`);
    if (count) radicals = [spec.center];
  } else {
    if (!sameElements(doc['atoms'], spec.ids.map((n: string) => elements[n])))
      throw new Error(`${id} 的原子组成有误，请检查化学式中的元素与原子个数。`);
    if (spec.kind === 'atom') {
      if (doc['unpairedElectrons'] !== 1)
        throw new Error('未成对电子数填写有误，请思考该自由基最外层电子分布。');
      positions.br = [0, 0, 0];
      radicals = ['br'];
    }
  }
  let lengths: Record<string, number> = {};
  if (spec.kind !== 'atom') {
    const required =
      spec.kind === 'pair'
        ? [spec.bond]
        : [
            ...new Set<string>(
              spec.neighbors.map((n: string) => elements[spec.center] + '-' + elements[n])
            ),
          ];
    lengths = doc['bondLengths'];
    if (!object(lengths)) throw new Error('请填写「bondLengths」，单位为 Å。');
    for (const k of required)
      if (!own(lengths, k) || !Number.isFinite(lengths[k]) || lengths[k] <= 0 || lengths[k] > 10)
        throw new Error(`键长「${k}」数值无效，应填写大于 0 的合理共价键长（Å）。`);
    for (const k of Object.keys(lengths))
      if (!required.includes(k))
        throw new Error(`键长「${k}」不属于当前分子的成键类型，请检查。`);
  }
  if (spec.kind === 'pair') {
    const half = lengths[spec.bond] / 2;
    positions[spec.ids[0]] = [spec.sign * half, 0, 0];
    positions[spec.ids[1]] = [-spec.sign * half, 0, 0];
    bonds = [[...spec.ids] as [string, string]];
  }
  if (spec.kind === 'center') {
    positions[spec.center] = [0, 0, 0];
    const angles = doc.bondAngles;
    const required = id === 'CH3Br' ? ['H-C-H', 'H-C-Br'] : ['H-C-H'];
    if (!object(angles)) throw new Error('请填写 bondAngles，单位为度。');
    for (const k of required)
      if (!Number.isFinite(angles[k]) || angles[k] <= 0 || angles[k] >= 180)
        throw new Error(`bondAngles.${k} 应为 0 到 180 之间的角度（度）。`);
    if (Object.keys(angles).some((k) => !required.includes(k)))
      throw new Error('bondAngles 含有此结构不支持的键角名称。');
    const ideal = (Math.acos(-1 / 3) * 180) / Math.PI;
    let axialCos = 0;
    if (id === 'CH3') {
      if (Math.abs(angles['H-C-H'] - 120) > 0.1)
        throw new Error(
          'bondAngles：H-C-H 键角不符合该分子的空间对称性，请结合中心原子的排布分析平面夹角。'
        );
    } else if (id === 'CH4' || doc.geometry === 'regularTetrahedral') {
      if (required.some((k) => Math.abs(angles[k] - ideal) > 0.1))
        throw new Error('bondAngles：键角不符合空间几何对称性，请思考等价共价键在空间的夹角。');
      axialCos = -1 / 3;
    } else {
      const angle = angles['H-C-Br'];
      if (angle <= 90 || angle >= 180)
        throw new Error('bondAngles.H-C-Br：键角范围异常，请核对钝角/锐角合理范围。');
      axialCos = Math.cos((angle * Math.PI) / 180);
      const derived = (Math.acos(1.5 * axialCos * axialCos - 0.5) * 180) / Math.PI;
      if (Math.abs(angles['H-C-H'] - derived) > 0.1)
        throw new Error(
          `bondAngles 不相容：H-C-Br 与 H-C-H 存在空间几何制约关系，请核对两组键角的空间匹配。`
        );
    }
    spec.neighbors.forEach((n: string, i: number) => {
      const L = lengths[elements[spec.center] + '-' + elements[n]];
      if (i === 3) positions[n] = [0, 0, L];
      else {
        const phi = (i * 2 * Math.PI) / 3;
        const r = L * Math.sqrt(1 - axialCos * axialCos);
        positions[n] = [r * Math.sin(phi), r * Math.cos(phi), L * axialCos];
      }
      bonds.push([spec.center, n]);
    });
  }
  const { elements: unused, ...metadata } = template;
  return {
    ...clone(metadata),
    name: doc.name,
    formula: doc.formula,
    description: doc.description,
    hybridization: doc.hybridization,
    geometry: geometryLabels[doc['geometry']],
    radicals,
    studentDefinition: clone(doc),
    atoms: Object.entries(elements).map(([atom, element]) => ({
      id: atom,
      element: element as any,
      position: positions[atom],
      radical: radicals.includes(atom) ? 1 : 0,
    })),
    bonds: bonds.map((atoms) => ({ atoms, order: 1 })),
  };
}

export function apply(
  config: ChemConfig,
  files: { name?: string; data: any }[]
): {
  errors: string[];
  warnings: string[];
  config?: ChemConfig;
  changed: string[];
  states?: any[];
} {
  const errors: string[] = [];
  const seen = new Set<string>();
  const next = clone(config);
  const changed: string[] = [];
  if (!Array.isArray(files) || !files.length || files.length > 6)
    return { errors: ['每次请选择 1—6 个分子 JSON 文件。'], warnings: [], changed: [] };
  for (const file of files) {
    try {
      const d = file.data;
      const id = identify(d);
      if (seen.has(id)) throw new Error(`同一批次重复提交了 ${id}。每种分子请选择一份。`);
      seen.add(id);
      if (!own(next.molecules, id)) throw new Error(`不认识分子 ${id}。`);
      next.molecules[id] = structure(d, next.molecules[id]);
      changed.push(id);
    } catch (e: any) {
      errors.push(`${file.name || '分子文件'}：${e.message}`);
    }
  }
  if (errors.length) return { errors, warnings: [], changed: [] };
  const checked = core.validate(next);
  return { ...checked, config: checked.errors.length ? undefined : next, changed };
}

export function assemble(bundle: any): ChemConfig {
  if (
    !object(bundle.project) ||
    !object(bundle.catalog) ||
    !Array.isArray(bundle.steps) ||
    !Array.isArray(bundle.students)
  )
    throw new Error('教师配置或分子文件不完整。');
  const { moleculeFiles, stepFiles, ...project } = bundle.project;
  const molecules: Record<string, MoleculeModel> = {};
  const seen = new Set<string>();
  for (const d of bundle.students) {
    const id = identify(d);
    if (!own(bundle.catalog, id)) throw new Error('缺少此化学式的教师参考配置。');
    if (seen.has(id)) throw new Error(`分子文件重复：${id}。`);
    seen.add(id);
    try {
      molecules[id] = structure(d, bundle.catalog[id]);
    } catch (e: any) {
      throw new Error(`${id}.json：${e.message}`);
    }
  }
  return { ...clone(project), molecules, steps: clone(bundle.steps) };
}

export function exportMolecule(config: ChemConfig, id: string) {
  if (!own(config.molecules, id)) throw new Error('请选择一个分子。');
  const doc = config.molecules[id].studentDefinition;
  if (!doc) throw new Error('当前分子缺少结构描述，请重新加载默认文件。');
  return clone(doc);
}

export function extractStudents(
  config: ChemConfig
): { id: string; fileName: string; doc: Record<string, any> }[] {
  const items: { id: string; label: string }[] = [
    { id: 'CH4', label: '01-甲烷-CH4.json' },
    { id: 'CH3', label: '02-甲基自由基-CH3.json' },
    { id: 'CH3Br', label: '03-一溴甲烷-CH3Br.json' },
    { id: 'Br2', label: '04-溴单质-Br2.json' },
    { id: 'HBr', label: '05-溴化氢-HBr.json' },
    { id: 'Br', label: '06-溴自由基-Br.json' },
  ];
  return items.map((item) => ({
    id: item.id,
    fileName: item.label,
    doc: exportMolecule(config, item.id),
  }));
}

export function stringify(doc: Record<string, any>): string {
  return (
    '{\n' +
    Object.entries(doc)
      .map(([k, v]) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(v))
      .join(',\n') +
    '\n}\n'
  );
}

export function checkManifest(project: any) {
  for (const [key, size] of [
    ['moleculeFiles', 6],
    ['stepFiles', 7],
  ] as const) {
    const a = project?.[key];
    if (
      !Array.isArray(a) ||
      a.length !== size ||
      new Set(a).size !== size ||
      a.some(
        (s) =>
          typeof s !== 'string' ||
          !s.endsWith('.json') ||
          s.includes('/') ||
          s.includes('\\') ||
          s.startsWith('.')
      )
    )
      throw new Error(`${key} 需要 ${size} 个不重复的 JSON 文件名。`);
  }
}

export const ChemFiles = {
  assemble,
  apply,
  exportMolecule,
  stringify,
  checkManifest,
  identify,
  structure,
};
export default ChemFiles;
