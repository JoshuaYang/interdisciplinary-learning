export type ElementSymbol = string;

export interface AtomDef {
  id: string;
  element: ElementSymbol;
  position: [number, number, number];
  radical: 0 | 1;
}

export interface BondDef {
  atoms: [string, string];
  order: number;
}

export interface MeasurementDef {
  label: string;
  atoms: string[];
  value: number;
  tolerance: number;
}

export interface ReferenceDef {
  status?: string;
  source?: string;
  url?: string;
}

export interface MoleculeModel {
  name: string;
  formula: string;
  geometry: string;
  description?: string;
  hybridization?: string;
  atoms: AtomDef[];
  bonds: BondDef[];
  radicals?: string[];
  measurements: MeasurementDef[];
  reference?: ReferenceDef;
  studentDefinition?: Record<string, any>;
}

export interface StepInstance {
  molecule: string;
  position: [number, number, number];
  rotation: [number, number, number];
  atomMap: Record<string, string>;
  role: 'focus' | 'context';
  caption?: string;
}

export interface StepTransition {
  kind: 'initial' | 'initiation' | 'reaction' | 'reframe' | 'summary';
  duration: number;
  breakBonds: [string, string][];
  formBonds: [string, string][];
}

export interface StepDef {
  title: string;
  shortTitle: string;
  phase: string;
  formula: string;
  description: string;
  note: string;
  instances: StepInstance[];
  transition: StepTransition;
}

export interface ChemConfig {
  version: number;
  title: string;
  units: string;
  dataStatus?: string;
  teachingNote?: string;
  sources?: { title: string; url: string }[];
  molecules: Record<string, MoleculeModel>;
  steps: StepDef[];
}

export interface SampledAtom {
  id: string;
  element: ElementSymbol;
  position: [number, number, number];
  radical: number;
  opacity: number;
  molecule: string;
  localId: string;
  instance: number;
}

export interface SampledBond {
  atoms: [string, string];
  order: number;
  weight: number;
  opacity: number;
}

export interface CompiledState {
  atoms: Record<string, SampledAtom>;
  bonds: Record<string, SampledBond>;
  step: StepDef;
}
