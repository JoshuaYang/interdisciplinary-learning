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
  regularTetrahedral: 'Regular Tetrahedral',
  tetrahedral: 'Tetrahedral',
  trigonalPlanar: 'Trigonal Planar',
  diatomic: 'Diatomic',
  linear: 'Linear',
  atomic: 'Monatomic',
};

const sameElements = (a: unknown, b: string[]): boolean =>
  Array.isArray(a) &&
  a.every((x) => typeof x === 'string') &&
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

export function identify(doc: any): string {
  if (!object(doc) || typeof doc.formula !== 'string')
    throw new Error('Please provide "formula", e.g. "formula": "CH4".');
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
    throw new Error('Unsupported formula: please enter CH4, CH3·, CH3Br, Br2, HBr, or Br· (radicals must include ·).');
  return ids[formula];
}

export function structure(doc: any, template: any): MoleculeModel {
  const id = identify(doc);
  const spec = specs[id];
  if (!template) throw new Error(`Missing teacher reference configuration for ${id}.`);
  const fields =
    spec.kind === 'center'
      ? ['center', 'neighbors', 'geometry', 'bondLengths', 'unpairedElectrons']
      : spec.kind === 'pair'
      ? ['atoms', 'geometry', 'bondLengths']
      : ['atoms', 'geometry', 'unpairedElectrons'];
  fields.push('name', 'formula', 'description');
  if (spec.kind === 'center') fields.push('bondAngles', 'hybridization');
  fields.push('nodes', 'bonds');
  for (const k of Object.keys(doc))
    if (!fields.includes(k))
      throw new Error(`Unrecognized field "${k}". Allowed fields for this structure: ${fields.join(', ')}.`);
  if (!spec.shapes.includes(doc['geometry']))
    throw new Error(`Invalid geometry for ${id}. Please specify the correct geometry according to central atom hybridization and bonding.`);
  const elements: Record<string, string> =
    template.elements ||
    Object.fromEntries(template.atoms.map((a: any) => [a.id, a.element]));
  for (const [key, max] of [
    ['name', 80],
    ['description', 1000],
  ] as const)
    if (typeof doc[key] !== 'string' || !doc[key].trim() || doc[key].length > max)
      throw new Error(`${key} must be a non-empty string of up to ${max} characters.`);
  const formula =
    typeof doc.formula === 'string'
      ? doc.formula.replace(/[₀-₉]/g, (c: string) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c)))
      : '';
  const radicalFormula = spec.radicals === 1;
  if (radicalFormula !== /[·.]$/.test(formula))
    throw new Error('formula: radicals must end with ·, neutral closed-shell molecules must not.');
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
    throw new Error('formula does not match atomic composition; please check elements and counts.');
  if (spec.kind === 'center' && doc.hybridization !== (id === 'CH3' ? 'sp2' : 'sp3'))
    throw new Error(`hybridization: incorrect hybridization type based on VSEPR theory and geometry.`);
  const positions: Record<string, [number, number, number]> = {};
  let bonds: [string, string][] = [];
  let radicals: string[] = [];
  if (spec.kind === 'center') {
    if (doc['center'] !== elements[spec.center])
      throw new Error(`${id}: incorrect central atom. Please verify the molecular center.`);
    const expected = spec.neighbors.map((n: string) => elements[n]);
    if (!sameElements(doc['neighbors'], expected))
      throw new Error(`${id}: incorrect surrounding atoms. Please verify neighboring elements and counts.`);
    const count = doc['unpairedElectrons'] ?? 0;
    if (count !== spec.radicals)
      throw new Error(`${id}: incorrect number of unpaired electrons for this chemical species.`);
    if (count) radicals = [spec.center];
  } else {
    if (!sameElements(doc['atoms'], spec.ids.map((n: string) => elements[n])))
      throw new Error(`${id}: atomic composition is incorrect. Please check formula elements and counts.`);
    if (spec.kind === 'atom') {
      if (doc['unpairedElectrons'] !== 1)
        throw new Error('Incorrect unpaired electron count for radical valence distribution.');
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
    if (!object(lengths)) throw new Error('Please provide "bondLengths" in Ångströms (Å).');
    for (const k of required)
      if (!own(lengths, k) || !Number.isFinite(lengths[k]) || lengths[k] <= 0 || lengths[k] > 10)
        throw new Error(`Invalid bond length for "${k}". Please enter a reasonable positive value in Å.`);
    for (const k of Object.keys(lengths))
      if (!required.includes(k))
        throw new Error(`Bond length "${k}" is not a valid bond in this molecule.`);
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
    if (!object(angles)) throw new Error('Please provide bondAngles in degrees (°).');
    for (const k of required)
      if (!Number.isFinite(angles[k]) || angles[k] <= 0 || angles[k] >= 180)
        throw new Error(`bondAngles.${k} must be an angle between 0° and 180°.`);
    if (Object.keys(angles).some((k) => !required.includes(k)))
      throw new Error('bondAngles contains unsupported angle keys for this structure.');
    const ideal = (Math.acos(-1 / 3) * 180) / Math.PI;
    let axialCos = 0;
    if (id === 'CH3') {
      if (Math.abs(angles['H-C-H'] - 120) > 0.1)
        throw new Error(
          'bondAngles: H-C-H angle does not match trigonal planar molecular symmetry (expected 120°).'
        );
    } else if (id === 'CH4' || doc.geometry === 'regularTetrahedral') {
      if (required.some((k) => Math.abs(angles[k] - ideal) > 0.1))
        throw new Error('bondAngles: angle does not match regular tetrahedral symmetry (expected 109.471°).');
      axialCos = -1 / 3;
    } else {
      const angle = angles['H-C-Br'];
      if (angle <= 90 || angle >= 180)
        throw new Error('bondAngles.H-C-Br: angle out of range.');
      axialCos = Math.cos((angle * Math.PI) / 180);
      const derived = (Math.acos(1.5 * axialCos * axialCos - 0.5) * 180) / Math.PI;
      if (Math.abs(angles['H-C-H'] - derived) > 0.1)
        throw new Error(
          `bondAngles incompatible: H-C-Br and H-C-H are constrained by 3D tetrahedral geometry.`
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
    return { errors: ['Please select 1 to 6 molecule JSON files.'], warnings: [], changed: [] };
  for (const file of files) {
    try {
      const d = file.data;
      const id = identify(d);
      if (seen.has(id)) throw new Error(`Duplicate submission for ${id}. Please submit one file per molecule.`);
      seen.add(id);
      if (!own(next.molecules, id)) throw new Error(`Unrecognized molecule ${id}.`);
      next.molecules[id] = structure(d, next.molecules[id]);
      changed.push(id);
    } catch (e: any) {
      errors.push(`${file.name || 'Molecule file'}: ${e.message}`);
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
    throw new Error('Teacher configuration or molecule files are incomplete.');
  const { moleculeFiles, stepFiles, ...project } = bundle.project;
  const molecules: Record<string, MoleculeModel> = {};
  const seen = new Set<string>();
  for (const d of bundle.students) {
    const id = identify(d);
    if (!own(bundle.catalog, id)) throw new Error('Missing teacher reference configuration for this chemical formula.');
    if (seen.has(id)) throw new Error(`Duplicate molecule file: ${id}.`);
    seen.add(id);
    try {
      molecules[id] = structure(d, bundle.catalog[id]);
    } catch (e: any) {
      throw new Error(`${id}.json: ${e.message}`);
    }
  }
  return { ...clone(project), molecules, steps: clone(bundle.steps) };
}

export function exportMolecule(config: ChemConfig, id: string) {
  if (!own(config.molecules, id)) throw new Error('Please select a molecule.');
  const doc = config.molecules[id].studentDefinition;
  if (!doc) throw new Error('Missing structure definition for this molecule; please reload default files.');
  return clone(doc);
}

export function extractStudents(
  config: ChemConfig
): { id: string; fileName: string; doc: Record<string, any> }[] {
  const items: { id: string; label: string }[] = [
    { id: 'CH4', label: '01-Methane-CH4.json' },
    { id: 'CH3', label: '02-MethylRadical-CH3.json' },
    { id: 'CH3Br', label: '03-Bromomethane-CH3Br.json' },
    { id: 'Br2', label: '04-Bromine-Br2.json' },
    { id: 'HBr', label: '05-HydrogenBromide-HBr.json' },
    { id: 'Br', label: '06-BromineRadical-Br.json' },
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
      throw new Error(`${key} requires ${size} unique JSON filenames.`);
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
