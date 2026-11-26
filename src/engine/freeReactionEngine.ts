import * as core from './core';
import { ELEMENT_MAP } from './cpkPalette';
import type { AtomDef, BondDef, MeasurementDef, MoleculeModel } from '../types/chem';

export interface TopologyNode {
  id: string;
  element: string;
  radical: 0 | 1;
  charge?: number;
  /** 2D canvas coordinates for interactive builder */
  x?: number;
  y?: number;
  /** Optional per-center configuration for multi-center molecules */
  geometry?: string;
  hybridization?: string;
  bondAngles?: Record<string, number>;
}

export interface TopologyBond {
  id: string;
  from: string;
  to: string;
  order: 1 | 2 | 3;
  length?: number;
}

export interface FreeMoleculeItem {
  id: string;
  doc: Record<string, any>;
  mol: MoleculeModel;
  formulaHtml: string;
}

export type FreeProcessType = 'reaction' | 'approach' | 'excitation';
export type FreePhysicalCondition = 'none' | 'uv' | 'heat';

export interface FreeStageDef {
  id: string;
  name: string;
  processType?: FreeProcessType;
  condition?: FreePhysicalCondition;
  reactants: string[]; // array of FreeMoleculeItem.id
  products: string[];  // array of FreeMoleculeItem.id
}

export interface FreeStageAtomState {
  id: string;
  element: string;
  startPos: [number, number, number];
  approachPos: [number, number, number];
  departPos: [number, number, number];
  endPos: [number, number, number];
  startRadical: number;
  endRadical: number;
  startOpacity: number;
  endOpacity: number;
  reactantInstanceIdx: number | null;
  productInstanceIdx: number | null;
}

export interface FreeStageBondState {
  key: string;
  atoms: [string, string];
  order: number;
  inReactants: boolean;
  inProducts: boolean;
  label: string; // e.g. "C—H"
}

export interface FreeStageLabelInstance {
  molId: string;
  formula: string;
  name: string;
  atomIds: string[];
}

export interface CompiledFreeStage {
  stageId: string;
  name: string;
  processType: FreeProcessType;
  condition: FreePhysicalCondition;
  equationText: string;
  reactantMols: { id: string; name: string; formula: string; geometry: string }[];
  productMols: { id: string; name: string; formula: string; geometry: string }[];
  atoms: Record<string, FreeStageAtomState>;
  bonds: Record<string, FreeStageBondState>;
  brokenBondLabels: string[];
  formedBondLabels: string[];
  reactantLabels: FreeStageLabelInstance[];
  productLabels: FreeStageLabelInstance[];
  duration: number;
}

export interface FreeSampledFrame {
  atoms: Record<
    string,
    {
      id: string;
      element: string;
      position: [number, number, number];
      radical: number;
      opacity: number;
    }
  >;
  bonds: Record<
    string,
    {
      atoms: [string, string];
      order: number;
      weight: number;
      opacity: number;
    }
  >;
  activeLabels: FreeStageLabelInstance[];
}

export const GEOMETRY_OPTIONS: { value: string; label: string; defaultAngle: number }[] = [
  { value: 'atomic', label: 'Atomic (Single Atom)', defaultAngle: 0 },
  { value: 'diatomic', label: 'Diatomic', defaultAngle: 180 },
  { value: 'linear', label: 'Linear (180°)', defaultAngle: 180 },
  { value: 'bent', label: 'Bent / Angular (104.5°)', defaultAngle: 104.5 },
  { value: 'trigonalPlanar', label: 'Trigonal Planar (120°)', defaultAngle: 120 },
  { value: 'trigonalPyramidal', label: 'Trigonal Pyramidal (107°)', defaultAngle: 107 },
  { value: 'regularTetrahedral', label: 'Regular Tetrahedral (109.47°)', defaultAngle: 109.471 },
  { value: 'tetrahedral', label: 'Tetrahedral', defaultAngle: 109.5 },
  { value: 'squarePlanar', label: 'Square Planar (90°)', defaultAngle: 90 },
  { value: 'trigonalBipyramidal', label: 'Trigonal Bipyramidal', defaultAngle: 120 },
  { value: 'octahedral', label: 'Octahedral (90°)', defaultAngle: 90 },
];

export const GEOMETRY_LABEL_MAP: Record<string, string> = {
  atomic: 'Atomic',
  diatomic: 'Diatomic',
  linear: 'Linear',
  bent: 'Bent',
  angular: 'Bent',
  trigonalPlanar: 'Trigonal Planar',
  trigonalPyramidal: 'Trigonal Pyramidal',
  regularTetrahedral: 'Regular Tetrahedral',
  tetrahedral: 'Tetrahedral',
  squarePlanar: 'Square Planar',
  trigonalBipyramidal: 'Trigonal Bipyramidal',
  octahedral: 'Octahedral',
  multiCenter: 'Multi-Center 3D',
};

export const HYBRIDIZATION_OPTIONS = ['none', 'sp', 'sp2', 'sp3', 'sp3d', 'sp3d2'];

/** Standard experimental covalent bond lengths (Å) */
const STANDARD_BOND_LENGTHS: Record<string, number> = {
  'C-H:1': 1.09,
  'C-C:1': 1.54,
  'C-C:2': 1.34,
  'C-C:3': 1.20,
  'C-Br:1': 1.939,
  'C-Cl:1': 1.77,
  'C-F:1': 1.35,
  'C-I:1': 2.14,
  'C-O:1': 1.43,
  'C-O:2': 1.21,
  'C-N:1': 1.47,
  'C-N:2': 1.28,
  'C-N:3': 1.16,
  'Br-Br:1': 2.281,
  'Cl-Cl:1': 1.988,
  'F-F:1': 1.417,
  'I-I:1': 2.666,
  'H-H:1': 0.74,
  'H-Br:1': 1.414,
  'H-Cl:1': 1.274,
  'H-F:1': 0.917,
  'H-I:1': 1.609,
  'H-O:1': 0.958,
  'H-N:1': 1.01,
  'H-S:1': 1.34,
  'O-O:1': 1.48,
  'O-O:2': 1.21,
  'N-N:1': 1.45,
  'N-N:2': 1.25,
  'N-N:3': 1.10,
  'N-O:1': 1.40,
  'N-O:2': 1.21,
  'S-O:1': 1.48,
  'S-O:2': 1.43,
  'P-Cl:1': 2.04,
  'S-F:1': 1.56,
};

/** Common molecule names by formula (English) */
const COMMON_MOLECULE_NAMES: Record<string, { name: string; description: string }> = {
  CH4: { name: 'Methane', description: 'Regular tetrahedral saturated alkane with sp3 hybridized carbon.' },
  'CH3·': { name: 'Methyl Radical', description: 'Trigonal planar carbon radical with 1 unpaired electron.' },
  CH3Br: { name: 'Bromomethane', description: 'Tetrahedral haloalkane formed by bromine substitution.' },
  CH2Br2: { name: 'Dibromomethane', description: 'Tetrahedral dihaloalkane molecule.' },
  CHBr3: { name: 'Tribromomethane', description: 'Tetrahedral trihaloalkane molecule.' },
  CBr4: { name: 'Tetrabromomethane', description: 'Regular tetrahedral perhalogenated methane.' },
  CH3Cl: { name: 'Chloromethane', description: 'Tetrahedral haloalkane molecule.' },
  'Br·': { name: 'Bromine Radical', description: 'Reactive halogen radical with 1 unpaired electron.' },
  Br2: { name: 'Bromine', description: 'Diatomic halogen molecule susceptible to homolytic cleavage.' },
  HBr: { name: 'Hydrogen Bromide', description: 'Polar covalent diatomic molecule.' },
  'Cl·': { name: 'Chlorine Radical', description: 'Reactive chlorine atom radical with 1 unpaired electron.' },
  Cl2: { name: 'Chlorine', description: 'Diatomic halogen gas molecule.' },
  HCl: { name: 'Hydrogen Chloride', description: 'Polar covalent diatomic molecule.' },
  H2: { name: 'Hydrogen', description: 'Nonpolar covalent diatomic molecule.' },
  'H·': { name: 'Hydrogen Radical', description: 'Atomic hydrogen radical with 1 unpaired electron.' },
  O2: { name: 'Oxygen', description: 'Diatomic oxygen molecule.' },
  N2: { name: 'Nitrogen', description: 'Diatomic molecule with a nitrogen-nitrogen triple bond.' },
  H2O: { name: 'Water', description: 'Bent polar covalent molecule with sp3 hybridized oxygen.' },
  'OH·': { name: 'Hydroxyl Radical', description: 'Highly reactive radical with 1 unpaired electron.' },
  H2O2: { name: 'Hydrogen Peroxide', description: 'Two-center covalent molecule containing an O—O single bond.' },
  NH3: { name: 'Ammonia', description: 'Trigonal pyramidal polar molecule with sp3 hybridized nitrogen.' },
  CO2: { name: 'Carbon Dioxide', description: 'Linear covalent molecule with sp hybridized carbon.' },
  C2H6: { name: 'Ethane', description: 'Two-carbon saturated alkane connected by a C—C single bond.' },
  CH3CH3: { name: 'Ethane', description: 'Two-carbon saturated alkane connected by a C—C single bond.' },
  C2H4: { name: 'Ethylene', description: 'Planar unsaturated hydrocarbon containing a C=C double bond.' },
  C2H2: { name: 'Acetylene', description: 'Linear unsaturated hydrocarbon containing a C≡C triple bond.' },
  CH4O: { name: 'Methanol', description: 'Simplest saturated monohydric alcohol.' },
  CH3OH: { name: 'Methanol', description: 'Simplest saturated monohydric alcohol.' },
  BF3: { name: 'Boron Trifluoride', description: 'Trigonal planar electron-deficient molecule with sp2 boron.' },
  PCl3: { name: 'Phosphorus Trichloride', description: 'Trigonal pyramidal covalent molecule.' },
  PCl5: { name: 'Phosphorus Pentachloride', description: 'Trigonal bipyramidal covalent molecule.' },
  SF6: { name: 'Sulfur Hexafluoride', description: 'Octahedral covalent molecule.' },
};

export function formatFormulaHtml(formula: string): string {
  if (!formula) return '';
  return formula
    .replace(/[₀-₉]/g, (c) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c)))
    .replace(/\.$/, '·')
    .replace(/([A-Za-z)])(\d+)/g, '$1<sub>$2</sub>');
}

export function getCanonicalBondKey(el1: string, el2: string): string {
  // Prefer C first, then non-H before H, else alphabetical
  if (el1 === el2) return `${el1}-${el2}`;
  if (el1 === 'C') return `${el1}-${el2}`;
  if (el2 === 'C') return `${el2}-${el1}`;
  if (el2 === 'H') return `${el1}-${el2}`;
  if (el1 === 'H') return `${el2}-${el1}`;
  return [el1, el2].sort().join('-');
}

export function getRecommendedBondLength(el1: string, el2: string, order: 1 | 2 | 3 = 1): number {
  const k1 = `${el1}-${el2}:${order}`;
  const k2 = `${el2}-${el1}:${order}`;
  if (STANDARD_BOND_LENGTHS[k1]) return STANDARD_BOND_LENGTHS[k1];
  if (STANDARD_BOND_LENGTHS[k2]) return STANDARD_BOND_LENGTHS[k2];

  const r1 = ELEMENT_MAP[el1]?.covalentRadius ?? 0.85;
  const r2 = ELEMENT_MAP[el2]?.covalentRadius ?? 0.85;
  const factor = order === 3 ? 0.82 : order === 2 ? 0.9 : 1.0;
  return Number(((r1 + r2) * factor).toFixed(3));
}

export function recommendCenterConfig(
  centerElement: string,
  neighborElements: string[],
  radical: number
): {
  geometry: string;
  hybridization: string;
  bondAngles: Record<string, number>;
} {
  const n = neighborElements.length;
  if (n === 0) {
    return { geometry: 'atomic', hybridization: 'none', bondAngles: {} };
  }
  if (n === 1) {
    return { geometry: 'diatomic', hybridization: 'none', bondAngles: {} };
  }

  let geometry = 'tetrahedral';
  let hybridization = 'sp3';
  let defaultAngle = 109.5;

  if (n === 2) {
    if (['O', 'S', 'Se', 'Te'].includes(centerElement)) {
      geometry = 'bent';
      hybridization = 'sp3';
      defaultAngle = centerElement === 'O' ? 104.5 : 92.1;
    } else if (centerElement === 'C' && radical > 0) {
      geometry = 'bent';
      hybridization = 'sp2';
      defaultAngle = 120;
    } else {
      geometry = 'linear';
      hybridization = 'sp';
      defaultAngle = 180;
    }
  } else if (n === 3) {
    if (['N', 'P', 'As'].includes(centerElement) && radical === 0) {
      geometry = 'trigonalPyramidal';
      hybridization = 'sp3';
      defaultAngle = centerElement === 'N' ? 107.3 : 93.5;
    } else {
      geometry = 'trigonalPlanar';
      hybridization = 'sp2';
      defaultAngle = 120;
    }
  } else if (n === 4) {
    const uniqueNeighbors = new Set(neighborElements);
    if (uniqueNeighbors.size === 1) {
      geometry = 'regularTetrahedral';
      hybridization = 'sp3';
      defaultAngle = 109.471;
    } else {
      geometry = 'tetrahedral';
      hybridization = 'sp3';
      defaultAngle = 109.5;
    }
  } else if (n === 5) {
    geometry = 'trigonalBipyramidal';
    hybridization = 'sp3d';
    defaultAngle = 120;
  } else {
    geometry = 'octahedral';
    hybridization = 'sp3d2';
    defaultAngle = 90;
  }

  // Build unique angle keys X-Center-Y
  const bondAngles: Record<string, number> = {};
  const uniqueNeighborEls = [...new Set(neighborElements)];
  for (let i = 0; i < uniqueNeighborEls.length; i++) {
    const e1 = uniqueNeighborEls[i];
    const count1 = neighborElements.filter((e) => e === e1).length;
    if (count1 >= 2) {
      bondAngles[`${e1}-${centerElement}-${e1}`] = defaultAngle;
    }
    for (let j = i + 1; j < uniqueNeighborEls.length; j++) {
      const e2 = uniqueNeighborEls[j];
      const pair = [e1, e2].sort((a, b) => (a === 'H' ? -1 : b === 'H' ? 1 : a.localeCompare(b)));
      const key = `${pair[0]}-${centerElement}-${pair[1]}`;
      // For CH3Br-like tetrahedral, give slightly realistic angle if desired, or consistent 109.5
      if (geometry === 'tetrahedral' && centerElement === 'C' && uniqueNeighborEls.length === 2) {
        if (key === 'H-C-Br') {
          bondAngles[key] = 107.5;
          bondAngles['H-C-H'] = 111.37;
          continue;
        }
      }
      bondAngles[key] = defaultAngle;
    }
  }

  return { geometry, hybridization, bondAngles };
}

export function inferFormulaAndName(
  nodes: TopologyNode[],
  bonds: TopologyBond[]
): { formula: string; name: string; description: string } {
  if (nodes.length === 0) {
    return { formula: '', name: '', description: '' };
  }
  const counts: Record<string, number> = {};
  let totalRadicals = 0;
  let netCharge = 0;
  for (const n of nodes) {
    counts[n.element] = (counts[n.element] || 0) + 1;
    if (n.radical) totalRadicals += n.radical;
    if (typeof n.charge === 'number') netCharge += n.charge;
  }

  // Special structural formula for ethane CH3CH3
  let formula = '';
  if (counts['C'] === 2 && counts['H'] === 6 && Object.keys(counts).length === 2) {
    formula = 'CH3CH3';
  } else {
    // Hill system: C first, H second, then alphabetical (except H-X binary acids like HBr, HCl, H2O)
    const els = Object.keys(counts);
    if (!counts['C'] && counts['H'] && els.length === 2) {
      const other = els.find((e) => e !== 'H')!;
      if (['F', 'Cl', 'Br', 'I', 'O', 'S', 'Se'].includes(other)) {
        formula = `H${counts['H'] > 1 ? counts['H'] : ''}${other}${counts[other] > 1 ? counts[other] : ''}`;
      }
    }
    if (!formula) {
      const sorted = els.sort((a, b) => {
        if (a === 'C') return -1;
        if (b === 'C') return 1;
        if (a === 'H') return -1;
        if (b === 'H') return 1;
        return a.localeCompare(b);
      });
      formula = sorted.map((el) => `${el}${counts[el] > 1 ? counts[el] : ''}`).join('');
    }
  }
  if (totalRadicals > 0) {
    formula += '·';
  }
  if (netCharge !== 0) {
    const sign = netCharge > 0 ? '+' : '-';
    const magnitude = Math.abs(netCharge) > 1 ? String(Math.abs(netCharge)) : '';
    formula = nodes.length > 1 ? `[${formula}]${magnitude}${sign}` : `${formula}${magnitude}${sign}`;
  }

  if (netCharge !== 0) {
    const ionType = netCharge > 0 ? 'Cation' : 'Anion';
    const baseName = nodes.length === 1 ? (ELEMENT_MAP[nodes[0].element]?.name || nodes[0].element) : formula;
    return {
      formula,
      name: `${baseName} ${ionType}`,
      description: `Ionic chemical species with a net charge of ${netCharge > 0 ? `+${netCharge}` : netCharge}.`,
    };
  }

  const known = COMMON_MOLECULE_NAMES[formula];
  if (known) {
    return { formula, name: known.name, description: known.description };
  }

  if (nodes.length === 1) {
    const elMeta = ELEMENT_MAP[nodes[0].element];
    const elName = elMeta ? elMeta.name : nodes[0].element;
    return {
      formula,
      name: totalRadicals > 0 ? `${elName} Radical` : `${elName} Atom`,
      description: `Monoatomic species consisting of a single ${elName} (${nodes[0].element}) atom.`,
    };
  }

  if (nodes.length === 2 && nodes[0].element === nodes[1].element) {
    const elMeta = ELEMENT_MAP[nodes[0].element];
    const elName = elMeta ? elMeta.name : nodes[0].element;
    return {
      formula,
      name: `${elName}`,
      description: `Diatomic molecule formed by two ${elName} atoms.`,
    };
  }

  return {
    formula,
    name: `${formula.replace(/·$/, '')} ${totalRadicals > 0 ? 'Radical' : 'Molecule'}`,
    description: `Chemical species containing ${nodes.length} atoms and ${bonds.length} covalent bonds.`,
  };
}

/**
 * Compute 3D local vectors for N neighbors around a center at [0,0,0]
 */
function computeLocalDirections(
  neighborCount: number,
  geometry: string,
  axialAngleDeg = 109.471
): [number, number, number][] {
  if (neighborCount <= 0) return [];
  if (neighborCount === 1) return [[1, 0, 0]];

  if (neighborCount === 2) {
    const angle =
      geometry === 'linear' || geometry === 'diatomic'
        ? 180
        : Number.isFinite(axialAngleDeg) && axialAngleDeg > 30 && axialAngleDeg <= 180
        ? axialAngleDeg
        : 104.5;
    if (Math.abs(angle - 180) < 0.5) {
      return [
        [-1, 0, 0],
        [1, 0, 0],
      ];
    }
    const halfRad = ((angle / 2) * Math.PI) / 180;
    return [
      [-Math.sin(halfRad), -Math.cos(halfRad), 0],
      [Math.sin(halfRad), -Math.cos(halfRad), 0],
    ];
  }

  if (neighborCount === 3) {
    const isPyramidal = geometry === 'trigonalPyramidal';
    if (!isPyramidal) {
      const angle =
        Number.isFinite(axialAngleDeg) && axialAngleDeg > 30 && axialAngleDeg < 180
          ? axialAngleDeg
          : 120;
      if (Math.abs(angle - 120) < 0.01) {
        return [
          [1, 0, 0],
          [-0.5, Math.sqrt(3) / 2, 0],
          [-0.5, -Math.sqrt(3) / 2, 0],
        ];
      }
      const rad = (angle * Math.PI) / 180;
      return [
        [1, 0, 0],
        [Math.cos(rad), Math.sin(rad), 0],
        [Math.cos(rad), -Math.sin(rad), 0],
      ];
    }
    const angle =
      Number.isFinite(axialAngleDeg) && axialAngleDeg > 60 && axialAngleDeg < 150
        ? axialAngleDeg
        : 107;
    // Cone half-angle beta: sin(beta) = (2 / sqrt(3)) * sin(angle / 2)
    const sinBeta = Math.min(1, (2 / Math.sqrt(3)) * Math.sin(((angle / 2) * Math.PI) / 180));
    const cosBeta = Math.sqrt(Math.max(0, 1 - sinBeta * sinBeta));
    return [0, 1, 2].map((i) => {
      const phi = (i * 2 * Math.PI) / 3;
      return [sinBeta * Math.sin(phi), sinBeta * Math.cos(phi), -cosBeta];
    });
  }

  if (neighborCount === 4) {
    if (geometry === 'squarePlanar') {
      return [
        [1, 0, 0],
        [0, 1, 0],
        [-1, 0, 0],
        [0, -1, 0],
      ];
    }
    // Tetrahedral: index 3 along +Z, indices 0..2 around cone
    const angle =
      geometry === 'regularTetrahedral'
        ? 109.47122
        : Number.isFinite(axialAngleDeg) && axialAngleDeg > 70 && axialAngleDeg < 170
        ? axialAngleDeg
        : 109.47122;
    const axialCos = Math.cos((angle * Math.PI) / 180);
    const r = Math.sqrt(Math.max(0, 1 - axialCos * axialCos));
    return [
      [r * Math.sin(0), r * Math.cos(0), axialCos],
      [r * Math.sin((2 * Math.PI) / 3), r * Math.cos((2 * Math.PI) / 3), axialCos],
      [r * Math.sin((4 * Math.PI) / 3), r * Math.cos((4 * Math.PI) / 3), axialCos],
      [0, 0, 1],
    ];
  }

  if (neighborCount === 5) {
    return [
      [1, 0, 0],
      [-0.5, Math.sqrt(3) / 2, 0],
      [-0.5, -Math.sqrt(3) / 2, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
  }

  // 6 or more: octahedral + extra
  const dirs: [number, number, number][] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  while (dirs.length < neighborCount) {
    const k = dirs.length;
    dirs.push([Math.cos(k), Math.sin(k), 0.5]);
  }
  return dirs;
}

/**
 * Align a set of local unit vectors so that `dirs[anchorIdx]` points along `targetDir`
 */
function alignDirectionsToVector(
  dirs: [number, number, number][],
  anchorIdx: number,
  targetDir: [number, number, number],
  twistRad = Math.PI / 3
): [number, number, number][] {
  if (anchorIdx < 0 || anchorIdx >= dirs.length) return dirs;
  const from = dirs[anchorIdx];
  const fromLen = Math.hypot(...from) || 1;
  const u: [number, number, number] = [from[0] / fromLen, from[1] / fromLen, from[2] / fromLen];

  const tLen = Math.hypot(...targetDir) || 1;
  const v: [number, number, number] = [
    targetDir[0] / tLen,
    targetDir[1] / tLen,
    targetDir[2] / tLen,
  ];

  // Rotate any vector p from frame where u -> v, plus twist around v
  const dot = Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]));
  const rotateUtoV = (p: [number, number, number]): [number, number, number] => {
    if (dot > 0.9999) return [...p];
    if (dot < -0.9999) {
      // 180 deg rotation around an orthogonal axis
      const ref: [number, number, number] = Math.abs(u[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
      const ax = [
        u[1] * ref[2] - u[2] * ref[1],
        u[2] * ref[0] - u[0] * ref[2],
        u[0] * ref[1] - u[1] * ref[0],
      ];
      const n = Math.hypot(...ax) || 1;
      const k = [ax[0] / n, ax[1] / n, ax[2] / n];
      const kDotP = k[0] * p[0] + k[1] * p[1] + k[2] * p[2];
      return [2 * kDotP * k[0] - p[0], 2 * kDotP * k[1] - p[1], 2 * kDotP * k[2] - p[2]];
    }
    const cross = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    const s = Math.hypot(...cross);
    const k = [cross[0] / s, cross[1] / s, cross[2] / s];
    const kCrossP = [
      k[1] * p[2] - k[2] * p[1],
      k[2] * p[0] - k[0] * p[2],
      k[0] * p[1] - k[1] * p[0],
    ];
    const kDotP = k[0] * p[0] + k[1] * p[1] + k[2] * p[2];
    return [
      p[0] * dot + kCrossP[0] * s + k[0] * kDotP * (1 - dot),
      p[1] * dot + kCrossP[1] * s + k[1] * kDotP * (1 - dot),
      p[2] * dot + kCrossP[2] * s + k[2] * kDotP * (1 - dot),
    ];
  };

  const rotateAroundV = (p: [number, number, number], angle: number): [number, number, number] => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const vCrossP = [
      v[1] * p[2] - v[2] * p[1],
      v[2] * p[0] - v[0] * p[2],
      v[0] * p[1] - v[1] * p[0],
    ];
    const vDotP = v[0] * p[0] + v[1] * p[1] + v[2] * p[2];
    return [
      p[0] * c + vCrossP[0] * s + v[0] * vDotP * (1 - c),
      p[1] * c + vCrossP[1] * s + v[1] * vDotP * (1 - c),
      p[2] * c + vCrossP[2] * s + v[2] * vDotP * (1 - c),
    ];
  };

  return dirs.map((d) => rotateAroundV(rotateUtoV(d), twistRad));
}

/**
 * Convert legacy v1 JSON (`center` + `neighbors` or `atoms`) into normalized topology `nodes` + `bonds`
 */
export function normalizeDocToTopology(doc: any): {
  name: string;
  formula: string;
  description: string;
  nodes: TopologyNode[];
  bonds: TopologyBond[];
} {
  if (!doc || typeof doc !== 'object') {
    throw new Error('JSON content must be an object.');
  }

  // Case 1: Already v2 topology format (`nodes` + `bonds`)
  if (Array.isArray(doc.nodes) && doc.nodes.length > 0) {
    const nodes: TopologyNode[] = doc.nodes.map((n: any, idx: number) => ({
      id: String(n.id || `a${idx + 1}`),
      element: String(n.element || 'C'),
      radical: n.radical ? 1 : 0,
      x: typeof n.x === 'number' ? n.x : undefined,
      y: typeof n.y === 'number' ? n.y : undefined,
      geometry: n.geometry || doc.geometry,
      hybridization: n.hybridization || doc.hybridization,
      bondAngles: n.bondAngles || doc.bondAngles,
    }));
    const bonds: TopologyBond[] = Array.isArray(doc.bonds)
      ? doc.bonds.map((b: any, idx: number) => {
          const from = String(b.from ?? b.atoms?.[0] ?? '');
          const to = String(b.to ?? b.atoms?.[1] ?? '');
          const n1 = nodes.find((n) => n.id === from);
          const n2 = nodes.find((n) => n.id === to);
          let length = typeof b.length === 'number' && b.length > 0 ? b.length : undefined;
          if (!length && doc.bondLengths && n1 && n2) {
            const k1 = `${n1.element}-${n2.element}`;
            const k2 = `${n2.element}-${n1.element}`;
            length = doc.bondLengths[k1] ?? doc.bondLengths[k2];
          }
          return {
            id: String(b.id || `b${idx + 1}`),
            from,
            to,
            order: (b.order === 2 || b.order === 3 ? b.order : 1) as 1 | 2 | 3,
            length,
          };
        })
      : [];
    const inferred = inferFormulaAndName(nodes, bonds);
    return {
      name: doc.name || inferred.name,
      formula: doc.formula || inferred.formula,
      description: doc.description || inferred.description,
      nodes,
      bonds,
    };
  }

  // Case 2: v1 `center` + `neighbors` format
  if (typeof doc.center === 'string' && doc.center.trim()) {
    const centerEl = doc.center.trim();
    const neighborEls: string[] = Array.isArray(doc.neighbors)
      ? doc.neighbors.map((x: any) => String(x).trim()).filter(Boolean)
      : [];
    const unpaired = Number(doc.unpairedElectrons) > 0 ? 1 : 0;

    const centerId = centerEl.toLowerCase();
    const nodes: TopologyNode[] = [
      {
        id: centerId,
        element: centerEl,
        radical: unpaired as 0 | 1,
        x: 250,
        y: 160,
        geometry: doc.geometry,
        hybridization: doc.hybridization,
        bondAngles: doc.bondAngles,
      },
    ];
    const bonds: TopologyBond[] = [];
    const elCounters: Record<string, number> = {};

    neighborEls.forEach((el, idx) => {
      elCounters[el] = (elCounters[el] || 0) + 1;
      const totalSame = neighborEls.filter((x) => x === el).length;
      const nid =
        totalSame > 1 ? `${el.toLowerCase()}${elCounters[el]}` : el.toLowerCase() === centerId ? `${el.toLowerCase()}1` : el.toLowerCase();
      const angle = (idx * 2 * Math.PI) / Math.max(1, neighborEls.length) - Math.PI / 2;
      nodes.push({
        id: nid,
        element: el,
        radical: 0,
        x: Math.round(250 + 120 * Math.cos(angle)),
        y: Math.round(160 + 105 * Math.sin(angle)),
      });
      const k1 = `${centerEl}-${el}`;
      const k2 = `${el}-${centerEl}`;
      const len = doc.bondLengths?.[k1] ?? doc.bondLengths?.[k2];
      bonds.push({
        id: `b_${centerId}_${nid}`,
        from: centerId,
        to: nid,
        order: 1,
        length: typeof len === 'number' && len > 0 ? len : undefined,
      });
    });

    const inferred = inferFormulaAndName(nodes, bonds);
    return {
      name: doc.name || inferred.name,
      formula: doc.formula || inferred.formula,
      description: doc.description || inferred.description,
      nodes,
      bonds,
    };
  }

  // Case 3: v1 `atoms` array (e.g. ["Br"] or ["H", "Br"])
  if (Array.isArray(doc.atoms) && doc.atoms.length > 0) {
    if (typeof doc.atoms[0] === 'string') {
      const atomEls: string[] = doc.atoms.map((x: any) => String(x).trim()).filter(Boolean);
      const unpaired = Number(doc.unpairedElectrons) > 0 ? 1 : 0;
      const nodes: TopologyNode[] = [];
      const bonds: TopologyBond[] = [];
      const elCounters: Record<string, number> = {};

      atomEls.forEach((el, idx) => {
        elCounters[el] = (elCounters[el] || 0) + 1;
        const totalSame = atomEls.filter((x) => x === el).length;
        const id = totalSame > 1 ? `${el.toLowerCase()}${elCounters[el]}` : el.toLowerCase();
        nodes.push({
          id,
          element: el,
          radical: idx === 0 && unpaired ? 1 : 0,
          x: atomEls.length === 1 ? 250 : 160 + idx * 180,
          y: 160,
          geometry: doc.geometry,
        });
      });

      if (nodes.length === 2) {
        const e1 = nodes[0].element;
        const e2 = nodes[1].element;
        const len =
          doc.bondLengths?.[`${e1}-${e2}`] ??
          doc.bondLengths?.[`${e2}-${e1}`] ??
          (doc.bondLengths ? Number(Object.values(doc.bondLengths)[0]) : undefined);
        bonds.push({
          id: 'b1',
          from: nodes[0].id,
          to: nodes[1].id,
          order: 1,
          length: typeof len === 'number' && len > 0 ? len : undefined,
        });
      } else if (nodes.length > 2) {
        // Connect first atom to the rest
        for (let i = 1; i < nodes.length; i++) {
          const e1 = nodes[0].element;
          const e2 = nodes[i].element;
          const len = doc.bondLengths?.[`${e1}-${e2}`] ?? doc.bondLengths?.[`${e2}-${e1}`];
          bonds.push({
            id: `b${i}`,
            from: nodes[0].id,
            to: nodes[i].id,
            order: 1,
            length: typeof len === 'number' && len > 0 ? len : undefined,
          });
        }
      }

      const inferred = inferFormulaAndName(nodes, bonds);
      return {
        name: doc.name || inferred.name,
        formula: doc.formula || inferred.formula,
        description: doc.description || inferred.description,
        nodes,
        bonds,
      };
    }
  }

  throw new Error('Unrecognized molecule JSON format: please provide nodes/bonds, center/neighbors, or atoms.');
}

/**
 * Fast & accurate distance-geometry and bond-angle relaxation solver.
 * Enforces:
 * 1. Target bond lengths (including ring closure bonds that tree BFS ignores)
 * 2. Target bond angles from doc.bondAngles (or standard geometry angles)
 * 3. Double-bond planar / dihedral flatness
 * 4. Steric non-overlap
 */
function relaxUniversalGeometry(
  nodes: TopologyNode[],
  bonds: TopologyBond[],
  positions: Map<string, [number, number, number]>,
  targetBondLengths: Record<string, number>,
  targetBondAngles: Record<string, number>
) {
  if (nodes.length <= 2) return;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => adj.set(n.id, []));
  bonds.forEach((b) => {
    if (adj.has(b.from) && adj.has(b.to)) {
      adj.get(b.from)!.push(b.to);
      adj.get(b.to)!.push(b.from);
    }
  });

  // Extract all target bond lengths
  const bondConstraints = bonds.map((b) => {
    const n1 = nodeMap.get(b.from)!;
    const n2 = nodeMap.get(b.to)!;
    const canon = getCanonicalBondKey(n1.element, n2.element);
    const alt = `${n2.element}-${n1.element}`;
    const targetL =
      b.length ??
      targetBondLengths[canon] ??
      targetBondLengths[alt] ??
      getRecommendedBondLength(n1.element, n2.element, b.order);
    return { from: b.from, to: b.to, targetL, order: b.order };
  });

  // Extract all angle constraints (A-C-B)
  const angleConstraints: {
    center: string;
    a: string;
    b: string;
    targetAngleRad: number;
    weight: number;
  }[] = [];

  for (const center of nodes) {
    const nbs = adj.get(center.id) || [];
    if (nbs.length < 2) continue;

    const isPlanarCenter =
      nbs.length === 3 &&
      (center.geometry === 'trigonalPlanar' ||
        center.hybridization === 'sp2' ||
        bonds.some((b) => (b.from === center.id || b.to === center.id) && b.order === 2));

    // For planar 3-coordinate center (e.g. ethylene carbon):
    // Ensure the 3 angles around this center sum strictly to 360 degrees to avoid non-planar folding
    if (isPlanarCenter) {
      const elCenter = center.element;
      const el0 = nodeMap.get(nbs[0])!.element;
      const el1 = nodeMap.get(nbs[1])!.element;
      const el2 = nodeMap.get(nbs[2])!.element;

      const pairs: [number, number, string, string][] = [
        [0, 1, nbs[0], nbs[1]],
        [0, 2, nbs[0], nbs[2]],
        [1, 2, nbs[1], nbs[2]],
      ];

      const rawAngles = pairs.map(([i, j]) => {
        const ea = nodeMap.get(nbs[i])!.element;
        const eb = nodeMap.get(nbs[j])!.element;
        const k1 = `${ea}-${elCenter}-${eb}`;
        const k2 = `${eb}-${elCenter}-${ea}`;
        return (
          targetBondAngles[k1] ??
          targetBondAngles[k2] ??
          center.bondAngles?.[k1] ??
          center.bondAngles?.[k2]
        );
      });

      // Distinguish heavy substituent (e.g. C=C bond) vs ligand substituents
      const heavyIdx = nbs.findIndex((id) => nodeMap.get(id)!.element !== 'H');
      let finalDegs: number[] = [120, 120, 120];

      if (heavyIdx >= 0) {
        // Ligands are the other two
        const ligIndices = [0, 1, 2].filter((i) => i !== heavyIdx);
        // Pair between heavy and lig1:
        const p1Idx = pairs.findIndex(
          ([i, j]) => (i === heavyIdx && j === ligIndices[0]) || (j === heavyIdx && i === ligIndices[0])
        );
        // Pair between heavy and lig2:
        const p2Idx = pairs.findIndex(
          ([i, j]) => (i === heavyIdx && j === ligIndices[1]) || (j === heavyIdx && i === ligIndices[1])
        );
        // Pair between lig1 and lig2:
        const pLigIdx = pairs.findIndex(
          ([i, j]) => (i === ligIndices[0] && j === ligIndices[1]) || (j === ligIndices[0] && i === ligIndices[1])
        );

        const heavyAngleInput = rawAngles[p1Idx] ?? rawAngles[p2Idx];
        const ligAngleInput = rawAngles[pLigIdx];

        if (typeof heavyAngleInput === 'number' && heavyAngleInput > 0) {
          const theta = heavyAngleInput;
          const phi =
            typeof ligAngleInput === 'number' && ligAngleInput > 0
              ? ligAngleInput
              : Math.max(30, 360 - 2 * theta);
          const sum = 2 * theta + phi;
          const norm = 360 / sum;
          finalDegs[p1Idx] = theta * norm;
          finalDegs[p2Idx] = theta * norm;
          finalDegs[pLigIdx] = phi * norm;
        } else if (typeof ligAngleInput === 'number' && ligAngleInput > 0) {
          const phi = ligAngleInput;
          const theta = (360 - phi) / 2;
          finalDegs[p1Idx] = theta;
          finalDegs[p2Idx] = theta;
          finalDegs[pLigIdx] = phi;
        }
      } else {
        const sum = rawAngles.reduce((s: number, a) => s + (typeof a === 'number' && a > 0 ? a : 120), 0);
        const norm = 360 / sum;
        finalDegs = rawAngles.map((a) => (typeof a === 'number' && a > 0 ? a * norm : 120 * norm));
      }

      pairs.forEach(([i, j, idA, idB], pIdx) => {
        angleConstraints.push({
          center: center.id,
          a: idA,
          b: idB,
          targetAngleRad: (finalDegs[pIdx] * Math.PI) / 180,
          weight: 4.0,
        });
      });
      continue;
    }

    for (let i = 0; i < nbs.length; i++) {
      for (let j = i + 1; j < nbs.length; j++) {
        const idA = nbs[i];
        const idB = nbs[j];
        const elA = nodeMap.get(idA)!.element;
        const elB = nodeMap.get(idB)!.element;
        const k1 = `${elA}-${center.element}-${elB}`;
        const k2 = `${elB}-${center.element}-${elA}`;
        const inputAngle =
          targetBondAngles[k1] ??
          targetBondAngles[k2] ??
          center.bondAngles?.[k1] ??
          center.bondAngles?.[k2];

        const isAHeavy = elA !== 'H';
        const isBHeavy = elB !== 'H';
        const isBothHeavy = isAHeavy && isBHeavy;
        const isRing3 = bonds.some(
          (b) => (b.from === idA && b.to === idB) || (b.from === idB && b.to === idA)
        );

        let targetDeg = inputAngle;
        if (!targetDeg || !Number.isFinite(targetDeg) || targetDeg <= 0) {
          if (isRing3) {
            targetDeg = 60.0;
          } else if (center.geometry === 'trigonalPlanar' || center.hybridization === 'sp2') {
            targetDeg = 120.0;
          } else if (center.geometry === 'regularTetrahedral') {
            targetDeg = 109.471;
          } else if (center.geometry === 'bent') {
            targetDeg = center.element === 'O' ? 104.5 : 109.5;
          } else if (center.geometry === 'linear') {
            targetDeg = 180.0;
          } else {
            targetDeg = 109.5;
          }
        }

        const weight = isRing3
          ? 8.0
          : inputAngle
          ? isBothHeavy
            ? 6.0
            : 2.0
          : isBothHeavy
          ? 3.0
          : 0.8;

        angleConstraints.push({
          center: center.id,
          a: idA,
          b: idB,
          targetAngleRad: (targetDeg * Math.PI) / 180,
          weight,
        });
      }
    }
  }

  const doubleBonds = bonds.filter((b) => b.order === 2);

  // Gradient relaxation iterations
  const steps = 140;
  for (let it = 0; it < steps; it++) {
    const decay = 1 - it / steps;
    const bondAlpha = 0.38 * Math.max(0.18, decay);
    const angleAlpha = 0.24 * Math.max(0.18, decay);

    // 1. Bond length constraints (Hooke's spring relaxation)
    for (const bc of bondConstraints) {
      const p1 = positions.get(bc.from);
      const p2 = positions.get(bc.to);
      if (!p1 || !p2) continue;

      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const dz = p2[2] - p1[2];
      const dist = Math.hypot(dx, dy, dz) || 0.0001;
      const diff = dist - bc.targetL;
      const factor = (diff / dist) * bondAlpha * 0.5;

      p1[0] += dx * factor;
      p1[1] += dy * factor;
      p1[2] += dz * factor;
      p2[0] -= dx * factor;
      p2[1] -= dy * factor;
      p2[2] -= dz * factor;
    }

    // 2. Bond angle constraints
    for (const ac of angleConstraints) {
      const pC = positions.get(ac.center);
      const pA = positions.get(ac.a);
      const pB = positions.get(ac.b);
      if (!pC || !pA || !pB) continue;

      const vAx = pA[0] - pC[0];
      const vAy = pA[1] - pC[1];
      const vAz = pA[2] - pC[2];
      const lenA = Math.hypot(vAx, vAy, vAz) || 0.0001;

      const vBx = pB[0] - pC[0];
      const vBy = pB[1] - pC[1];
      const vBz = pB[2] - pC[2];
      const lenB = Math.hypot(vBx, vBy, vBz) || 0.0001;

      const uAx = vAx / lenA;
      const uAy = vAy / lenA;
      const uAz = vAz / lenA;

      const uBx = vBx / lenB;
      const uBy = vBy / lenB;
      const uBz = vBz / lenB;

      const dot = Math.max(-1, Math.min(1, uAx * uBx + uAy * uBy + uAz * uBz));
      const curAngle = Math.acos(dot);
      const angleDiff = curAngle - ac.targetAngleRad;

      if (Math.abs(angleDiff) > 0.001) {
        const sinVal = Math.sin(curAngle);
        if (sinVal > 0.001) {
          // wA is unit tangent on uA pointing towards uB (closing the angle)
          const wAx = (uBx - dot * uAx) / sinVal;
          const wAy = (uBy - dot * uAy) / sinVal;
          const wAz = (uBz - dot * uAz) / sinVal;

          // wB is unit tangent on uB pointing towards uA (closing the angle)
          const wBx = (uAx - dot * uBx) / sinVal;
          const wBy = (uAy - dot * uBy) / sinVal;
          const wBz = (uAz - dot * uBz) / sinVal;

          const elA = nodeMap.get(ac.a)!.element;
          const elB = nodeMap.get(ac.b)!.element;
          const massA = elA === 'H' ? 1.0 : elA === 'C' ? 12.0 : 35.0;
          const massB = elB === 'H' ? 1.0 : elB === 'C' ? 12.0 : 35.0;
          const totalMass = massA + massB;
          const factorA = massB / totalMass; // Ligand moves much more, heavy skeleton stays steady!
          const factorB = massA / totalMass;

          // When angleDiff > 0 (curAngle > targetAngle), move towards each other (+wA, +wB) to close angle
          const moveA = angleDiff * angleAlpha * ac.weight * factorA * lenA;
          const moveB = angleDiff * angleAlpha * ac.weight * factorB * lenB;

          pA[0] += wAx * moveA;
          pA[1] += wAy * moveA;
          pA[2] += wAz * moveA;

          pB[0] += wBx * moveB;
          pB[1] += wBy * moveB;
          pB[2] += wBz * moveB;
        }
      }
    }

    // 3. Double bond planar torsion constraint (ensures ethylene is strictly flat)
    for (const db of doubleBonds) {
      const p1 = positions.get(db.from);
      const p2 = positions.get(db.to);
      if (!p1 || !p2) continue;

      const nbs1 = (adj.get(db.from) || []).filter((id) => id !== db.to);
      const nbs2 = (adj.get(db.to) || []).filter((id) => id !== db.from);
      if (nbs1.length >= 1 && nbs2.length >= 1) {
        const ux = p2[0] - p1[0];
        const uy = p2[1] - p1[1];
        const uz = p2[2] - p1[2];

        const pA = positions.get(nbs1[0])!;
        const vAx = pA[0] - p1[0];
        const vAy = pA[1] - p1[1];
        const vAz = pA[2] - p1[2];

        let nx = uy * vAz - uz * vAy;
        let ny = uz * vAx - ux * vAz;
        let nz = ux * vAy - uy * vAx;
        const nLen = Math.hypot(nx, ny, nz);
        if (nLen < 0.001) {
          nx = 0; ny = 0; nz = 1;
        } else {
          nx /= nLen; ny /= nLen; nz /= nLen;
        }

        [...nbs1, ...nbs2].forEach((id) => {
          const p = positions.get(id)!;
          const vx = p[0] - p1[0];
          const vy = p[1] - p1[1];
          const vz = p[2] - p1[2];
          const distToPlane = vx * nx + vy * ny + vz * nz;
          p[0] -= distToPlane * nx * 0.7;
          p[1] -= distToPlane * ny * 0.7;
          p[2] -= distToPlane * nz * 0.7;
        });
      }
    }

    // 4. Steric repulsion (prevent atom overlapping, ignore 1-2 and 1-3 pairs)
    for (let i = 0; i < nodes.length; i++) {
      const pA = positions.get(nodes[i].id)!;
      for (let j = i + 1; j < nodes.length; j++) {
        const idB = nodes[j].id;
        const isBonded = bonds.some(
          (b) =>
            (b.from === nodes[i].id && b.to === idB) || (b.from === idB && b.to === nodes[i].id)
        );
        if (isBonded) continue;
        const isAnglePair = (adj.get(nodes[i].id) || []).some((common) =>
          (adj.get(idB) || []).includes(common)
        );
        if (isAnglePair) continue;

        const pB = positions.get(idB)!;
        const dx = pB[0] - pA[0];
        const dy = pB[1] - pA[1];
        const dz = pB[2] - pA[2];
        const d = Math.hypot(dx, dy, dz) || 0.0001;
        const minDist = 1.35;
        if (d < minDist) {
          const push = (minDist - d) * 0.15;
          pA[0] -= (dx / d) * push;
          pA[1] -= (dy / d) * push;
          pA[2] -= (dz / d) * push;
          pB[0] += (dx / d) * push;
          pB[1] += (dy / d) * push;
          pB[2] += (dz / d) * push;
        }
      }
    }
  }

  // Final exact bond length projection to guarantee measured distances match targetL perfectly
  for (let it = 0; it < 25; it++) {
    for (const bc of bondConstraints) {
      const p1 = positions.get(bc.from);
      const p2 = positions.get(bc.to);
      if (!p1 || !p2) continue;

      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const dz = p2[2] - p1[2];
      const dist = Math.hypot(dx, dy, dz) || 0.0001;
      const diff = dist - bc.targetL;
      const factor = (diff / dist) * 0.5;

      p1[0] += dx * factor;
      p1[1] += dy * factor;
      p1[2] += dz * factor;
      p2[0] -= dx * factor;
      p2[1] -= dy * factor;
      p2[2] -= dz * factor;
    }
  }
}

/**
 * Universal 3D structure generator: converts any valid JSON doc into a 3D MoleculeModel
 * purely from the JSON fields without any hardcoded molecule templates or restrictions.
 */
export function buildUniversalMolecule(doc: any): MoleculeModel {
  // If doc already has explicit 3D `atoms: [{id, element, position}]`
  if (
    doc &&
    Array.isArray(doc.atoms) &&
    doc.atoms.length > 0 &&
    typeof doc.atoms[0] === 'object' &&
    Array.isArray(doc.atoms[0].position)
  ) {
    const atoms: AtomDef[] = doc.atoms.map((a: any, i: number) => ({
      id: String(a.id || `a${i + 1}`),
      element: String(a.element || 'C'),
      position: [
        Number(a.position[0]) || 0,
        Number(a.position[1]) || 0,
        Number(a.position[2]) || 0,
      ],
      radical: a.radical ? 1 : 0,
      charge: typeof a.charge === 'number' ? a.charge : 0,
    }));
    const bonds: BondDef[] = Array.isArray(doc.bonds)
      ? doc.bonds.map((b: any) => ({
          atoms: [String(b.atoms?.[0] ?? b.from), String(b.atoms?.[1] ?? b.to)],
          order: Number(b.order) || 1,
        }))
      : [];
    return {
      name: doc.name || doc.formula || 'Custom Molecule',
      formula: doc.formula || 'Custom',
      geometry: GEOMETRY_LABEL_MAP[doc.geometry] || doc.geometry || 'Custom Geometry',
      description: doc.description || '',
      hybridization: doc.hybridization || 'none',
      atoms,
      bonds,
      radicals: atoms.filter((a) => a.radical === 1).map((a) => a.id),
      measurements: Array.isArray(doc.measurements) ? doc.measurements : [],
      studentDefinition: JSON.parse(JSON.stringify(doc)),
    };
  }

  const topo = normalizeDocToTopology(doc);
  const { nodes, bonds } = topo;

  // Build adjacency list
  const adj = new Map<string, { neighborId: string; bond: TopologyBond }[]>();
  nodes.forEach((n) => adj.set(n.id, []));
  bonds.forEach((b) => {
    if (adj.has(b.from) && adj.has(b.to) && b.from !== b.to) {
      adj.get(b.from)!.push({ neighborId: b.to, bond: b });
      adj.get(b.to)!.push({ neighborId: b.from, bond: b });
    }
  });

  const nodeMap = new Map<string, TopologyNode>(nodes.map((n) => [n.id, n]));
  const positions = new Map<string, [number, number, number]>();

  // Sort nodes so highest-degree non-H atom is placed at origin first
  const sortedRootCandidates = [...nodes].sort((a, b) => {
    const degA = adj.get(a.id)?.length || 0;
    const degB = adj.get(b.id)?.length || 0;
    if (degA !== degB) return degB - degA;
    if (a.element === 'C' && b.element !== 'C') return -1;
    if (b.element === 'C' && a.element !== 'C') return 1;
    return 0;
  });

  let componentOffsetX = 0;

  for (const rootCandidate of sortedRootCandidates) {
    if (positions.has(rootCandidate.id)) continue;

    positions.set(rootCandidate.id, [componentOffsetX, 0, 0]);
    const queue: { nodeId: string; parentId: string | null }[] = [
      { nodeId: rootCandidate.id, parentId: null },
    ];

    while (queue.length > 0) {
      const { nodeId, parentId } = queue.shift()!;
      const centerNode = nodeMap.get(nodeId)!;
      const centerPos = positions.get(nodeId)!;
      const neighbors = adj.get(nodeId) || [];
      if (neighbors.length === 0) continue;

      // Order neighbors so that if there's a parentId or a distinct substituent (like Br in CH3Br),
      // for 4-coordinate tetrahedral, the parent or unique substituent is at index 3 (+Z axis)
      const orderedNeighbors = [...neighbors];
      if (orderedNeighbors.length === 3) {
        if (parentId) {
          const pIdx = orderedNeighbors.findIndex((x) => x.neighborId === parentId);
          if (pIdx > 0) {
            const [item] = orderedNeighbors.splice(pIdx, 1);
            orderedNeighbors.unshift(item);
          }
        } else {
          const nonHIdx = orderedNeighbors.findIndex(
            (x) => nodeMap.get(x.neighborId)!.element !== 'H'
          );
          if (nonHIdx > 0) {
            const [item] = orderedNeighbors.splice(nonHIdx, 1);
            orderedNeighbors.unshift(item);
          }
        }
      } else if (orderedNeighbors.length === 4) {
        if (parentId) {
          const pIdx = orderedNeighbors.findIndex((x) => x.neighborId === parentId);
          if (pIdx >= 0 && pIdx !== 3) {
            const [item] = orderedNeighbors.splice(pIdx, 1);
            orderedNeighbors.push(item);
          }
        } else {
          // Find element that appears only once among neighbors (e.g. Br in CH3Br)
          const elCounts: Record<string, number> = {};
          orderedNeighbors.forEach((x) => {
            const el = nodeMap.get(x.neighborId)!.element;
            elCounts[el] = (elCounts[el] || 0) + 1;
          });
          const uniqueIdx = orderedNeighbors.findIndex(
            (x) => elCounts[nodeMap.get(x.neighborId)!.element] === 1 && nodeMap.get(x.neighborId)!.element !== 'H'
          );
          if (uniqueIdx >= 0 && uniqueIdx !== 3) {
            const [item] = orderedNeighbors.splice(uniqueIdx, 1);
            orderedNeighbors.push(item);
          }
        }
      }

      const geo =
        centerNode.geometry ||
        doc.geometry ||
        recommendCenterConfig(
          centerNode.element,
          orderedNeighbors.map((x) => nodeMap.get(x.neighborId)!.element),
          centerNode.radical
        ).geometry;

      // Determine axial/characteristic angle from bondAngles if provided
      const anglesObj = centerNode.bondAngles || doc.bondAngles || {};
      let axialAngle = 109.47122;
      if (orderedNeighbors.length === 3) {
        const a0 = nodeMap.get(orderedNeighbors[0].neighborId)!.element;
        const a1 = nodeMap.get(orderedNeighbors[1].neighborId)!.element;
        const a2 = nodeMap.get(orderedNeighbors[2].neighborId)!.element;
        const k1 = `${a0}-${centerNode.element}-${a1}`;
        const k2 = `${a1}-${centerNode.element}-${a0}`;
        const kLig = `${a1}-${centerNode.element}-${a2}`;
        if (typeof anglesObj[k1] === 'number' && anglesObj[k1] > 0) {
          axialAngle = anglesObj[k1];
        } else if (typeof anglesObj[k2] === 'number' && anglesObj[k2] > 0) {
          axialAngle = anglesObj[k2];
        } else if (typeof anglesObj[kLig] === 'number' && anglesObj[kLig] > 0) {
          axialAngle = (360 - anglesObj[kLig]) / 2;
        } else {
          const firstAngle = Object.values(anglesObj).find((v) => typeof v === 'number' && v > 0);
          if (typeof firstAngle === 'number') axialAngle = firstAngle;
          else axialAngle = 120;
        }
      } else if (orderedNeighbors.length === 4) {
        const axialEl = nodeMap.get(orderedNeighbors[3].neighborId)!.element;
        const basalEl = nodeMap.get(orderedNeighbors[0].neighborId)!.element;
        const k1 = `${basalEl}-${centerNode.element}-${axialEl}`;
        const k2 = `${axialEl}-${centerNode.element}-${basalEl}`;
        const kBasal = `${basalEl}-${centerNode.element}-${basalEl}`;
        if (typeof anglesObj[k1] === 'number') {
          axialAngle = anglesObj[k1];
        } else if (typeof anglesObj[k2] === 'number') {
          axialAngle = anglesObj[k2];
        } else if (typeof anglesObj[kBasal] === 'number') {
          // Derive axial angle from basal angle if possible
          const cosBasal = Math.cos((anglesObj[kBasal] * Math.PI) / 180);
          const cosAxialSq = Math.max(0, Math.min(1, (cosBasal + 0.5) / 1.5));
          axialAngle = (Math.acos(-Math.sqrt(cosAxialSq)) * 180) / Math.PI;
        }
      } else {
        const firstAngle = Object.values(anglesObj).find((v) => typeof v === 'number' && v > 0);
        if (typeof firstAngle === 'number') axialAngle = firstAngle;
      }

      let dirs = computeLocalDirections(orderedNeighbors.length, geo, axialAngle);

      // If this center has an already-placed parent, align the parent's slot to the vector (parentPos - centerPos)
      if (parentId && positions.has(parentId)) {
        const parentPos = positions.get(parentId)!;
        const toParent: [number, number, number] = [
          parentPos[0] - centerPos[0],
          parentPos[1] - centerPos[1],
          parentPos[2] - centerPos[2],
        ];
        const parentSlotIdx = orderedNeighbors.findIndex((x) => x.neighborId === parentId);
        if (parentSlotIdx >= 0) {
          const parentBond = orderedNeighbors[parentSlotIdx]?.bond;
          const isDoubleOrTriple = parentBond && parentBond.order >= 2;
          const isPlanarCenter =
            geo === 'trigonalPlanar' ||
            centerNode.hybridization === 'sp2' ||
            (orderedNeighbors.length === 3 && geo !== 'trigonalPyramidal');
          const twist = isDoubleOrTriple || isPlanarCenter ? 0 : Math.PI / 3;
          dirs = alignDirectionsToVector(dirs, parentSlotIdx, toParent, twist);
        }
      } else if (orderedNeighbors.length === 2 && !parentId && (geo === 'diatomic' || geo === 'linear')) {
        // Place 2-atom molecule symmetrically around origin if root
        if (nodes.length === 2) {
          const b = orderedNeighbors[0].bond;
          const L =
            b.length ??
            getRecommendedBondLength(
              centerNode.element,
              nodeMap.get(orderedNeighbors[0].neighborId)!.element,
              b.order
            );
          positions.set(nodeId, [-L / 2, 0, 0]);
          positions.set(orderedNeighbors[0].neighborId, [L / 2, 0, 0]);
          continue;
        }
      }

      // If root is a 2-atom molecule (degree 1), handle directly
      if (!parentId && orderedNeighbors.length === 1 && nodes.length === 2) {
        const nb = orderedNeighbors[0];
        const nbNode = nodeMap.get(nb.neighborId)!;
        const L = nb.bond.length ?? getRecommendedBondLength(centerNode.element, nbNode.element, nb.bond.order);
        positions.set(nodeId, [-L / 2, 0, 0]);
        positions.set(nb.neighborId, [L / 2, 0, 0]);
        continue;
      }

      orderedNeighbors.forEach((nb, idx) => {
        if (positions.has(nb.neighborId)) return;
        const nbNode = nodeMap.get(nb.neighborId)!;
        const L =
          nb.bond.length ??
          getRecommendedBondLength(centerNode.element, nbNode.element, nb.bond.order);
        const d = dirs[idx] || [1, 0, 0];
        positions.set(nb.neighborId, [
          Number((centerPos[0] + d[0] * L).toFixed(5)),
          Number((centerPos[1] + d[1] * L).toFixed(5)),
          Number((centerPos[2] + d[2] * L).toFixed(5)),
        ]);
        queue.push({ nodeId: nb.neighborId, parentId: nodeId });
      });
    }

    componentOffsetX += 3.2;
  }

  // Apply geometry relaxation when cyclic rings exist (bonds.length >= nodes.length)
  if (bonds.length >= nodes.length) {
    relaxUniversalGeometry(
      nodes,
      bonds,
      positions,
      doc.bondLengths || {},
      doc.bondAngles || {}
    );
  }

  // Center the entire molecule at [0, 0, 0]
  let cx = 0,
    cy = 0,
    cz = 0;
  for (const pos of positions.values()) {
    cx += pos[0];
    cy += pos[1];
    cz += pos[2];
  }
  if (positions.size > 0) {
    cx /= positions.size;
    cy /= positions.size;
    cz /= positions.size;
  }

  const atoms: AtomDef[] = nodes.map((n) => {
    const raw = positions.get(n.id) || [0, 0, 0];
    return {
      id: n.id,
      element: n.element,
      position: [
        Number((raw[0] - cx).toFixed(4)),
        Number((raw[1] - cy).toFixed(4)),
        Number((raw[2] - cz).toFixed(4)),
      ],
      radical: n.radical ? 1 : 0,
      charge: typeof n.charge === 'number' ? n.charge : 0,
    };
  });

  const modelBonds: BondDef[] = bonds
    .filter((b) => positions.has(b.from) && positions.has(b.to))
    .map((b) => ({
      atoms: [b.from, b.to],
      order: b.order || 1,
    }));

  // Auto-generate measurements from bonds and angles
  const measurements: MeasurementDef[] = [];
  const seenBondLabels = new Set<string>();
  for (const b of modelBonds) {
    const a1 = atoms.find((a) => a.id === b.atoms[0]);
    const a2 = atoms.find((a) => a.id === b.atoms[1]);
    if (!a1 || !a2) continue;
    const label = `${getCanonicalBondKey(a1.element, a2.element).replace('-', '—')} Length`;
    if (seenBondLabels.has(label)) continue;
    seenBondLabels.add(label);
    const dist = core.length(core.sub(a1.position, a2.position));
    measurements.push({
      label,
      atoms: [a1.id, a2.id],
      value: Number(dist.toFixed(3)),
      tolerance: 0.2,
    });
  }

  const seenAngleLabels = new Set<string>();
  for (const n of nodes) {
    const nbs = adj.get(n.id) || [];
    if (nbs.length < 2) continue;
    for (let i = 0; i < nbs.length; i++) {
      for (let j = i + 1; j < nbs.length; j++) {
        const a1 = nodeMap.get(nbs[i].neighborId)!;
        const a2 = nodeMap.get(nbs[j].neighborId)!;
        const pair = [a1.element, a2.element].sort();
        const label = `${pair[0]}—${n.element}—${pair[1]} Angle`;
        if (seenAngleLabels.has(label)) continue;
        seenAngleLabels.add(label);
        const tempMol = { atoms } as MoleculeModel;
        const ang = core.measure(tempMol, [a1.id, n.id, a2.id]);
        if (Number.isFinite(ang)) {
          measurements.push({
            label,
            atoms: [a1.id, n.id, a2.id],
            value: Number(ang.toFixed(2)),
            tolerance: 3,
          });
        }
      }
    }
  }

  // Determine overall geometry label
  const multiCenters = nodes.filter((n) => (adj.get(n.id)?.length || 0) >= 2);
  let rawGeo = doc.geometry || multiCenters[0]?.geometry || (nodes.length === 1 ? 'atomic' : 'diatomic');
  const geoLabel =
    multiCenters.length > 1 && !doc.geometry
      ? `${GEOMETRY_LABEL_MAP[rawGeo] || rawGeo} (Multi-Center)`
      : GEOMETRY_LABEL_MAP[rawGeo] || rawGeo;

  const hyb =
    doc.hybridization ||
    multiCenters[0]?.hybridization ||
    (multiCenters.length > 0 ? 'sp3' : 'none');

  return {
    name: topo.name || 'Unnamed Molecule',
    formula: topo.formula || 'Custom',
    geometry: geoLabel,
    description: topo.description || '',
    hybridization: hyb,
    atoms,
    bonds: modelBonds,
    radicals: atoms.filter((a) => a.radical === 1).map((a) => a.id),
    measurements,
    studentDefinition: JSON.parse(JSON.stringify(doc)),
  };
}

/**
 * Compute spatial offsets for K molecules in a stage (separated vs collision contact)
 */
function computeInstanceOffsets(
  count: number,
  mode: 'separated' | 'contact'
): [number, number, number][] {
  if (count <= 0) return [];
  if (count === 1) return [[0, 0, 0]];
  const stepX = mode === 'separated' ? 3.8 : 1.75;
  const startX = -((count - 1) * stepX) / 2;
  return Array.from({ length: count }, (_, i) => {
    const yOffset = count > 2 ? (i % 2 === 0 ? 0.35 : -0.35) : 0;
    return [startX + i * stepX, yOffset, 0];
  });
}

/**
 * Compile user-defined stages and molecules into animated 3D stage transitions
 */
export function compileFreeStages(
  molecules: FreeMoleculeItem[],
  stages: FreeStageDef[]
): CompiledFreeStage[] {
  const molMap = new Map<string, FreeMoleculeItem>(molecules.map((m) => [m.id, m]));

  return stages.map((stage, sIdx) => {
    const processType: FreeProcessType = stage.processType || 'reaction';
    const condition: FreePhysicalCondition =
      stage.condition || (processType === 'excitation' ? 'uv' : 'none');

    const rItems = stage.reactants.map((id) => molMap.get(id)).filter(Boolean) as FreeMoleculeItem[];
    const pItems = stage.products.map((id) => molMap.get(id)).filter(Boolean) as FreeMoleculeItem[];

    // Physical Process 1: Spatial Approach & Alignment (No bond breaking or formation)
    if (processType === 'approach') {
      const allItems: { item: FreeMoleculeItem; isTarget: boolean; roleIdx: number }[] = [];
      rItems.forEach((item, i) => allItems.push({ item, isTarget: false, roleIdx: i }));
      pItems.forEach((item, i) => allItems.push({ item, isTarget: true, roleIdx: i }));

      const atoms: Record<string, FreeStageAtomState> = {};
      const bonds: Record<string, FreeStageBondState> = {};
      const reactantLabels: FreeStageLabelInstance[] = [];
      const productLabels: FreeStageLabelInstance[] = [];

      let atomCounter = 1;

      allItems.forEach(({ item, isTarget, roleIdx }) => {
        const startX = isTarget ? 2.4 + roleIdx * 1.5 : -2.6 - roleIdx * 1.5;
        const endX = isTarget ? 0.85 + roleIdx * 1.0 : -0.85 - roleIdx * 1.0;
        const yOffset = 0.45;

        const instAtomIds: string[] = [];
        const localToGlobal = new Map<string, string>();

        item.mol.atoms.forEach((a) => {
          const uId = `a_${atomCounter++}`;
          instAtomIds.push(uId);
          localToGlobal.set(a.id, uId);

          const startPos: [number, number, number] = [
            a.position[0] + startX,
            a.position[1] + yOffset,
            a.position[2],
          ];
          const endPos: [number, number, number] = [
            a.position[0] + endX,
            a.position[1] + yOffset,
            a.position[2],
          ];
          const midPos: [number, number, number] = [
            (startPos[0] + endPos[0]) / 2,
            (startPos[1] + endPos[1]) / 2,
            (startPos[2] + endPos[2]) / 2,
          ];

          atoms[uId] = {
            id: uId,
            element: a.element,
            startPos,
            approachPos: midPos,
            departPos: endPos,
            endPos,
            startRadical: a.radical,
            endRadical: a.radical,
            startOpacity: 1,
            endOpacity: 1,
            reactantInstanceIdx: roleIdx,
            productInstanceIdx: roleIdx,
          };
        });

        item.mol.bonds.forEach((b) => {
          const u1 = localToGlobal.get(b.atoms[0]);
          const u2 = localToGlobal.get(b.atoms[1]);
          if (!u1 || !u2) return;
          const k = core.key([u1, u2]);
          const el1 = atoms[u1].element;
          const el2 = atoms[u2].element;
          bonds[k] = {
            key: k,
            atoms: [u1, u2],
            order: b.order || 1,
            inReactants: true,
            inProducts: true,
            label: getCanonicalBondKey(el1, el2).replace('-', '—'),
          };
        });

        const labelInstance: FreeStageLabelInstance = {
          molId: item.id,
          formula: item.mol.formula,
          name: item.mol.name,
          atomIds: instAtomIds,
        };
        reactantLabels.push(labelInstance);
        productLabels.push(labelInstance);
      });

      const leftFormula = rItems.map((m) => m.mol.formula).join(' + ') || '(Approaching Species)';
      const rightFormula = pItems.map((m) => m.mol.formula).join(' + ') || '(Target Substrate)';
      const equationText = pItems.length
        ? `${leftFormula} ➔ ${rightFormula} (Spatial Approach)`
        : `${leftFormula} (Particle Approach)`;

      return {
        stageId: stage.id,
        name: stage.name || `Stage ${sIdx + 1}`,
        processType,
        condition,
        equationText,
        reactantMols: rItems.map((m) => ({
          id: m.id,
          name: m.mol.name,
          formula: m.mol.formula,
          geometry: m.mol.geometry,
        })),
        productMols: pItems.map((m) => ({
          id: m.id,
          name: m.mol.name,
          formula: m.mol.formula,
          geometry: m.mol.geometry,
        })),
        atoms,
        bonds,
        brokenBondLabels: [],
        formedBondLabels: [],
        reactantLabels,
        productLabels,
        duration: 3.8,
      };
    }

    // Physical Process 2: Photoexcitation / Thermal Activation
    if (processType === 'excitation') {
      const activeItems = rItems.length ? rItems : pItems;
      const atoms: Record<string, FreeStageAtomState> = {};
      const bonds: Record<string, FreeStageBondState> = {};
      const reactantLabels: FreeStageLabelInstance[] = [];
      const productLabels: FreeStageLabelInstance[] = [];

      let atomCounter = 1;
      const offsets = computeInstanceOffsets(activeItems.length, 'separated');

      activeItems.forEach((item, instIdx) => {
        const offset = offsets[instIdx];
        const instAtomIds: string[] = [];
        const localToGlobal = new Map<string, string>();

        item.mol.atoms.forEach((a) => {
          const uId = `a_${atomCounter++}`;
          instAtomIds.push(uId);
          localToGlobal.set(a.id, uId);

          const basePos: [number, number, number] = [
            a.position[0] + offset[0],
            a.position[1] + offset[1],
            a.position[2] + offset[2],
          ];

          atoms[uId] = {
            id: uId,
            element: a.element,
            startPos: basePos,
            approachPos: basePos,
            departPos: basePos,
            endPos: basePos,
            startRadical: a.radical,
            endRadical: a.radical,
            startOpacity: 1,
            endOpacity: 1,
            reactantInstanceIdx: instIdx,
            productInstanceIdx: instIdx,
          };
        });

        item.mol.bonds.forEach((b) => {
          const u1 = localToGlobal.get(b.atoms[0]);
          const u2 = localToGlobal.get(b.atoms[1]);
          if (!u1 || !u2) return;
          const k = core.key([u1, u2]);
          const el1 = atoms[u1].element;
          const el2 = atoms[u2].element;
          bonds[k] = {
            key: k,
            atoms: [u1, u2],
            order: b.order || 1,
            inReactants: true,
            inProducts: true,
            label: getCanonicalBondKey(el1, el2).replace('-', '—'),
          };
        });

        const labelInstance: FreeStageLabelInstance = {
          molId: item.id,
          formula: item.mol.formula,
          name: item.mol.name,
          atomIds: instAtomIds,
        };
        reactantLabels.push(labelInstance);
        productLabels.push(labelInstance);
      });

      const condTag = condition === 'uv' ? 'hν (UV Light)' : condition === 'heat' ? 'Δ (Heat)' : 'Energy Absorption';
      const formulaNames = activeItems.map((m) => m.mol.formula).join(' + ') || '(Absorbing Molecule)';
      const equationText = `${formulaNames} + ${condTag} ➔ ${formulaNames}* (Photoexcitation)`;

      return {
        stageId: stage.id,
        name: stage.name || `Stage ${sIdx + 1}`,
        processType,
        condition,
        equationText,
        reactantMols: activeItems.map((m) => ({
          id: m.id,
          name: m.mol.name,
          formula: m.mol.formula,
          geometry: m.mol.geometry,
        })),
        productMols: activeItems.map((m) => ({
          id: m.id,
          name: m.mol.name,
          formula: m.mol.formula,
          geometry: m.mol.geometry,
        })),
        atoms,
        bonds,
        brokenBondLabels: [],
        formedBondLabels: [],
        reactantLabels,
        productLabels,
        duration: 3.5,
      };
    }

    const rSepOffsets = computeInstanceOffsets(rItems.length, 'separated');
    const rContactOffsets =
      rItems.length <= 1 ? computeInstanceOffsets(rItems.length, 'separated') : computeInstanceOffsets(rItems.length, 'contact');
    const pContactOffsets =
      pItems.length <= 1 ? computeInstanceOffsets(pItems.length, 'separated') : computeInstanceOffsets(pItems.length, 'contact');
    const pSepOffsets = computeInstanceOffsets(pItems.length, 'separated');

    interface InstanceAtom {
      globalId: string;
      localId: string;
      element: string;
      localPos: [number, number, number];
      radical: number;
      instanceIdx: number;
      molId: string;
    }

    const rAtoms: InstanceAtom[] = [];
    const pAtoms: InstanceAtom[] = [];

    rItems.forEach((item, instIdx) => {
      item.mol.atoms.forEach((a) => {
        rAtoms.push({
          globalId: `r_${instIdx}_${a.id}`,
          localId: a.id,
          element: a.element,
          localPos: [...a.position],
          radical: a.radical,
          instanceIdx: instIdx,
          molId: item.id,
        });
      });
    });

    pItems.forEach((item, instIdx) => {
      item.mol.atoms.forEach((a) => {
        pAtoms.push({
          globalId: `p_${instIdx}_${a.id}`,
          localId: a.id,
          element: a.element,
          localPos: [...a.position],
          radical: a.radical,
          instanceIdx: instIdx,
          molId: item.id,
        });
      });
    });

    // Smart Atom Pairing between rAtoms and pAtoms:
    // 1. Pair heavy/center atoms first (non-H) in instance order
    // 2. Pair H atoms attached to the same paired center atom so conserved groups stay together!
    // 3. Pair any remaining atoms of the same element
    const rToP = new Map<string, InstanceAtom>();
    const usedP = new Set<string>();

    // Helper: find bonded neighbors inside an instance
    const rAdj = new Map<string, string[]>();
    rItems.forEach((item, instIdx) => {
      item.mol.bonds.forEach((b) => {
        const g1 = `r_${instIdx}_${b.atoms[0]}`;
        const g2 = `r_${instIdx}_${b.atoms[1]}`;
        rAdj.set(g1, [...(rAdj.get(g1) || []), g2]);
        rAdj.set(g2, [...(rAdj.get(g2) || []), g1]);
      });
    });

    const pAdj = new Map<string, string[]>();
    pItems.forEach((item, instIdx) => {
      item.mol.bonds.forEach((b) => {
        const g1 = `p_${instIdx}_${b.atoms[0]}`;
        const g2 = `p_${instIdx}_${b.atoms[1]}`;
        pAdj.set(g1, [...(pAdj.get(g1) || []), g2]);
        pAdj.set(g2, [...(pAdj.get(g2) || []), g1]);
      });
    });

    // Step 1: Pair non-H atoms first, preferring centers with highest degree similarity
    const nonHR = rAtoms.filter((a) => a.element !== 'H');
    for (const ra of nonHR) {
      const candidates = pAtoms.filter((pa) => pa.element === ra.element && !usedP.has(pa.globalId));
      if (candidates.length > 0) {
        const chosen = candidates[0];
        rToP.set(ra.globalId, chosen);
        usedP.add(chosen.globalId);

        // Immediately pair shared H neighbors of this center!
        const rHNeighbors = (rAdj.get(ra.globalId) || [])
          .map((id) => rAtoms.find((x) => x.globalId === id)!)
          .filter((x) => x && x.element === 'H' && !rToP.has(x.globalId));
        const pHNeighbors = (pAdj.get(chosen.globalId) || [])
          .map((id) => pAtoms.find((x) => x.globalId === id)!)
          .filter((x) => x && x.element === 'H' && !usedP.has(x.globalId));

        const pairCount = Math.min(rHNeighbors.length, pHNeighbors.length);
        for (let k = 0; k < pairCount; k++) {
          rToP.set(rHNeighbors[k].globalId, pHNeighbors[k]);
          usedP.add(pHNeighbors[k].globalId);
        }
      }
    }

    // Step 2: Pair any remaining atoms of matching element
    for (const ra of rAtoms) {
      if (rToP.has(ra.globalId)) continue;
      const candidate = pAtoms.find((pa) => pa.element === ra.element && !usedP.has(pa.globalId));
      if (candidate) {
        rToP.set(ra.globalId, candidate);
        usedP.add(candidate.globalId);
      }
    }

    // Smart orientation of reactant molecules: if an atom in Reactant i transfers to another Product instance,
    // rotate Reactant i around Y/Z so that the transferring atom faces toward the center (x=0)!
    const rRotations: [number, number, number][] = rItems.map(() => [0, 0, 0]);
    rItems.forEach((item, instIdx) => {
      if (rItems.length < 2 || item.mol.atoms.length < 2) return;
      const instAtoms = rAtoms.filter((a) => a.instanceIdx === instIdx);
      // Find an atom that changes its partner group in products
      const transferring = instAtoms.find((ra) => {
        const pa = rToP.get(ra.globalId);
        if (!pa) return false;
        const rNeighbors = rAdj.get(ra.globalId) || [];
        return rNeighbors.some((rnId) => {
          const pn = rToP.get(rnId);
          return pn && pn.instanceIdx !== pa.instanceIdx;
        });
      });
      if (transferring && (Math.hypot(...transferring.localPos) > 0.2)) {
        // Point towards +X if inst is on the left, or -X if inst is on the right
        const targetSign = rSepOffsets[instIdx][0] <= 0 ? 1 : -1;
        const [lx, , lz] = transferring.localPos;
        const currentYaw = Math.atan2(lx, lz);
        const desiredYaw = targetSign > 0 ? Math.PI / 2 : -Math.PI / 2;
        const degY = ((desiredYaw - currentYaw) * 180) / Math.PI;
        rRotations[instIdx] = [0, degY, 0];
      }
    });

    const atoms: Record<string, FreeStageAtomState> = {};
    const pGlobalToUnifiedId = new Map<string, string>();
    const rGlobalToUnifiedId = new Map<string, string>();

    let atomCounter = 1;
    // Matched + Reactant-only atoms
    for (const ra of rAtoms) {
      const uid = `atom_${atomCounter++}`;
      rGlobalToUnifiedId.set(ra.globalId, uid);
      const rotLocal = core.rotate(ra.localPos, rRotations[ra.instanceIdx]);
      const startPos = core.add(rotLocal, rSepOffsets[ra.instanceIdx]);
      const approachPos = core.add(rotLocal, rContactOffsets[ra.instanceIdx]);

      const matchedP = rToP.get(ra.globalId);
      if (matchedP) {
        pGlobalToUnifiedId.set(matchedP.globalId, uid);
        const departPos = core.add(matchedP.localPos, pContactOffsets[matchedP.instanceIdx]);
        const endPos = core.add(matchedP.localPos, pSepOffsets[matchedP.instanceIdx]);
        atoms[uid] = {
          id: uid,
          element: ra.element,
          startPos,
          approachPos,
          departPos,
          endPos,
          startRadical: ra.radical,
          endRadical: matchedP.radical,
          startOpacity: 1,
          endOpacity: 1,
          reactantInstanceIdx: ra.instanceIdx,
          productInstanceIdx: matchedP.instanceIdx,
        };
      } else {
        // Unbalanced reactant atom: fades out smoothly
        atoms[uid] = {
          id: uid,
          element: ra.element,
          startPos,
          approachPos,
          departPos: [approachPos[0], approachPos[1] + 0.8, approachPos[2]],
          endPos: [approachPos[0], approachPos[1] + 1.4, approachPos[2]],
          startRadical: ra.radical,
          endRadical: 0,
          startOpacity: 1,
          endOpacity: 0,
          reactantInstanceIdx: ra.instanceIdx,
          productInstanceIdx: null,
        };
      }
    }

    // Unbalanced product-only atoms: fade in smoothly
    for (const pa of pAtoms) {
      if (usedP.has(pa.globalId)) continue;
      const uid = `atom_${atomCounter++}`;
      pGlobalToUnifiedId.set(pa.globalId, uid);
      const departPos = core.add(pa.localPos, pContactOffsets[pa.instanceIdx]);
      const endPos = core.add(pa.localPos, pSepOffsets[pa.instanceIdx]);
      atoms[uid] = {
        id: uid,
        element: pa.element,
        startPos: [departPos[0], departPos[1] + 1.4, departPos[2]],
        approachPos: [departPos[0], departPos[1] + 0.8, departPos[2]],
        departPos,
        endPos,
        startRadical: 0,
        endRadical: pa.radical,
        startOpacity: 0,
        endOpacity: 1,
        reactantInstanceIdx: null,
        productInstanceIdx: pa.instanceIdx,
      };
    }

    // Compile unified bonds across Reactants and Products
    const bonds: Record<string, FreeStageBondState> = {};

    rItems.forEach((item, instIdx) => {
      item.mol.bonds.forEach((b) => {
        const u1 = rGlobalToUnifiedId.get(`r_${instIdx}_${b.atoms[0]}`);
        const u2 = rGlobalToUnifiedId.get(`r_${instIdx}_${b.atoms[1]}`);
        if (!u1 || !u2) return;
        const k = core.key([u1, u2]);
        const el1 = atoms[u1].element;
        const el2 = atoms[u2].element;
        bonds[k] = {
          key: k,
          atoms: [u1, u2],
          order: b.order || 1,
          inReactants: true,
          inProducts: false,
          label: getCanonicalBondKey(el1, el2).replace('-', '—'),
        };
      });
    });

    pItems.forEach((item, instIdx) => {
      item.mol.bonds.forEach((b) => {
        const u1 = pGlobalToUnifiedId.get(`p_${instIdx}_${b.atoms[0]}`);
        const u2 = pGlobalToUnifiedId.get(`p_${instIdx}_${b.atoms[1]}`);
        if (!u1 || !u2) return;
        const k = core.key([u1, u2]);
        const el1 = atoms[u1].element;
        const el2 = atoms[u2].element;
        if (bonds[k]) {
          bonds[k].inProducts = true;
          bonds[k].order = b.order || bonds[k].order;
        } else {
          bonds[k] = {
            key: k,
            atoms: [u1, u2],
            order: b.order || 1,
            inReactants: false,
            inProducts: true,
            label: getCanonicalBondKey(el1, el2).replace('-', '—'),
          };
        }
      });
    });

    const brokenBondLabels = Object.values(bonds)
      .filter((b) => b.inReactants && !b.inProducts)
      .map((b) => b.label);
    const formedBondLabels = Object.values(bonds)
      .filter((b) => !b.inReactants && b.inProducts)
      .map((b) => b.label);

    const reactantLabels: FreeStageLabelInstance[] = rItems.map((item, instIdx) => ({
      molId: item.id,
      formula: item.mol.formula,
      name: item.mol.name,
      atomIds: rAtoms
        .filter((a) => a.instanceIdx === instIdx)
        .map((a) => rGlobalToUnifiedId.get(a.globalId)!)
        .filter(Boolean),
    }));

    const productLabels: FreeStageLabelInstance[] = pItems.map((item, instIdx) => ({
      molId: item.id,
      formula: item.mol.formula,
      name: item.mol.name,
      atomIds: pAtoms
        .filter((a) => a.instanceIdx === instIdx)
        .map((a) => pGlobalToUnifiedId.get(a.globalId)!)
        .filter(Boolean),
    }));

    const lhs = rItems.length ? rItems.map((m) => m.mol.formula).join(' + ') : '(No Reactants)';
    const rhs = pItems.length ? pItems.map((m) => m.mol.formula).join(' + ') : '(No Products)';

    return {
      stageId: stage.id,
      name: stage.name || `Stage ${sIdx + 1}`,
      processType,
      condition,
      equationText: `${lhs} ➔ ${rhs}`,
      reactantMols: rItems.map((m) => ({
        id: m.id,
        name: m.mol.name,
        formula: m.mol.formula,
        geometry: m.mol.geometry,
      })),
      productMols: pItems.map((m) => ({
        id: m.id,
        name: m.mol.name,
        formula: m.mol.formula,
        geometry: m.mol.geometry,
      })),
      atoms,
      bonds,
      brokenBondLabels,
      formedBondLabels,
      reactantLabels,
      productLabels,
      duration: 4.6,
    };
  });
}

/**
 * Sample a 3D frame at `progress ∈ [0, 1]` for a compiled custom stage:
 * - [0.00 -> 0.28]: Reactants approach from separated positions to collision zone
 * - [0.28 -> 0.52]: Old covalent bonds stretch, cleave, and break cleanly (Bond Cleavage)
 * - [0.52 -> 0.76]: Intermediate fragments rotate/align and form new bonds (Bond Formation)
 * - [0.76 -> 1.00]: Products separate from collision zone to final observation positions
 */
export function sampleFreeStage(stage: CompiledFreeStage, progress: number): FreeSampledFrame {
  const p = core.clamp(progress, 0, 1);
  const atoms: FreeSampledFrame['atoms'] = {};
  const bonds: FreeSampledFrame['bonds'] = {};

  for (const [id, a] of Object.entries(stage.atoms)) {
    let position: [number, number, number];
    if (p <= 0.28) {
      const t = core.smooth(p / 0.28);
      position = core.lerp(a.startPos, a.approachPos, t);
    } else if (p <= 0.52) {
      const t = core.smooth((p - 0.28) / 0.24);
      const midPos: [number, number, number] = [
        a.approachPos[0] * 0.7 + a.departPos[0] * 0.3,
        a.approachPos[1] * 0.7 + a.departPos[1] * 0.3,
        a.approachPos[2] * 0.7 + a.departPos[2] * 0.3,
      ];
      position = core.lerp(a.approachPos, midPos, t);
    } else if (p <= 0.76) {
      const t = core.smooth((p - 0.52) / 0.24);
      const midPos: [number, number, number] = [
        a.approachPos[0] * 0.7 + a.departPos[0] * 0.3,
        a.approachPos[1] * 0.7 + a.departPos[1] * 0.3,
        a.approachPos[2] * 0.7 + a.departPos[2] * 0.3,
      ];
      position = core.lerp(midPos, a.departPos, t);
    } else {
      const t = core.smooth((p - 0.76) / 0.24);
      position = core.lerp(a.departPos, a.endPos, t);
    }

    const recombT = core.smooth((p - 0.4) / 0.3);
    atoms[id] = {
      id,
      element: a.element,
      position,
      radical: core.mix(a.startRadical, a.endRadical, recombT),
      opacity: core.mix(a.startOpacity, a.endOpacity, recombT),
    };
  }

  // Clear temporal separation: break first [0.28, 0.52], form later [0.52, 0.76]
  const breakT = p < 0.28 ? 0 : p > 0.52 ? 1 : core.smooth((p - 0.28) / 0.24);
  const formT = p < 0.52 ? 0 : p > 0.76 ? 1 : core.smooth((p - 0.52) / 0.24);

  for (const [k, b] of Object.entries(stage.bonds)) {
    let weight = 1;
    if (b.inReactants && b.inProducts) {
      weight = 1;
    } else if (b.inReactants) {
      weight = 1 - breakT;
    } else {
      weight = formT;
    }

    const op1 = atoms[b.atoms[0]]?.opacity ?? 1;
    const op2 = atoms[b.atoms[1]]?.opacity ?? 1;
    bonds[k] = {
      atoms: b.atoms,
      order: b.order,
      weight,
      opacity: Math.min(op1, op2),
    };
  }

  return {
    atoms,
    bonds,
    activeLabels: p < 0.52 ? stage.reactantLabels : stage.productLabels,
  };
}
