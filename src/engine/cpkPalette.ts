import * as THREE from 'three';

/**
 * Standard CPK (Corey-Pauling-Koltun) scientific element palette
 * Supports all 118 elements with curated colors for common elements and category-based CPK colors for the full periodic table.
 */
export const ELEMENT_COLORS: Record<string, number> = {
  H: 0xf8fafc,  // Hydrogen white
  He: 0xd9ffff, // Helium cyan-white
  Li: 0xcc80ff, // Lithium violet
  Be: 0xc2ff00, // Beryllium yellow-green
  B: 0xffb5b5,  // Boron salmon/pink
  C: 0x334155,  // Carbon charcoal slate
  N: 0x2563eb,  // Nitrogen cobalt blue
  O: 0xdc2626,  // Oxygen red
  F: 0x65a30d,  // Fluorine lime green
  Ne: 0xb3e3f5, // Neon sky blue
  Na: 0x6366f1, // Sodium indigo
  Mg: 0x10b981, // Magnesium emerald
  Al: 0x94a3b8, // Aluminum metallic grey
  Si: 0xd97706, // Silicon ochre/amber
  P: 0xea580c,  // Phosphorus orange
  S: 0xca8a04,  // Sulfur golden yellow
  Cl: 0x16a34a, // Chlorine green
  Ar: 0x80d1e3, // Argon cyan
  K: 0x7c3aed,  // Potassium violet
  Ca: 0x0d9488, // Calcium teal
  Fe: 0xb45309, // Iron rust amber
  Cu: 0xc2410c, // Copper warm orange
  Zn: 0x64748b, // Zinc slate
  Br: 0x9a3412, // Bromine deep red-brown
  Ag: 0xcbd5e1, // Silver
  I: 0x7e22ce,  // Iodine purple
  Ba: 0x059669, // Barium green
  Pt: 0x94a3b8, // Platinum
  Au: 0xeab308, // Gold
  Hg: 0x64748b, // Mercury
  Pb: 0x475569, // Lead
};

export const ELEMENT_RADII: Record<string, number> = {
  H: 0.245,
  He: 0.26,
  Li: 0.42,
  Be: 0.36,
  B: 0.34,
  C: 0.36,
  N: 0.35,
  O: 0.34,
  F: 0.32,
  Ne: 0.32,
  Na: 0.46,
  Mg: 0.43,
  Al: 0.41,
  Si: 0.40,
  P: 0.39,
  S: 0.40,
  Cl: 0.42,
  Ar: 0.40,
  K: 0.50,
  Ca: 0.47,
  Br: 0.46,
  I: 0.50,
};

export const RADICAL_COLOR = 0xea580c;
export const SELECTION_EMISSIVE = 0x2563eb;

export type ElementCategory =
  | 'nonmetal'
  | 'noble-gas'
  | 'alkali-metal'
  | 'alkaline-earth'
  | 'metalloid'
  | 'halogen'
  | 'post-transition'
  | 'transition'
  | 'lanthanide'
  | 'actinide';

export interface PeriodicElement {
  number: number;
  symbol: string;
  name: string;
  period: number; // 1-7 (8 for lanthanides display row, 9 for actinides display row)
  group: number;  // 1-18
  category: ElementCategory;
  covalentRadius: number; // in Å, used for default bond length calculation
  defaultValence: number;
}

export const CATEGORY_LABELS: Record<ElementCategory, string> = {
  nonmetal: '非金属',
  halogen: '卤素',
  'noble-gas': '稀有气体',
  'alkali-metal': '碱金属',
  'alkaline-earth': '碱土金属',
  metalloid: '类金属',
  'post-transition': '主族金属',
  transition: '过渡金属',
  lanthanide: '镧系元素',
  actinide: '锕系元素',
};

export const CATEGORY_COLORS: Record<ElementCategory, number> = {
  nonmetal: 0x2563eb,
  halogen: 0x16a34a,
  'noble-gas': 0x0891b2,
  'alkali-metal': 0x7c3aed,
  'alkaline-earth': 0x0d9488,
  metalloid: 0xd97706,
  'post-transition': 0x64748b,
  transition: 0xb45309,
  lanthanide: 0xdb2777,
  actinide: 0x9333ea,
};

/**
 * Full 118-element periodic table data
 */
export const PERIODIC_TABLE: PeriodicElement[] = [
  // Period 1
  { number: 1, symbol: 'H', name: '氢', period: 1, group: 1, category: 'nonmetal', covalentRadius: 0.37, defaultValence: 1 },
  { number: 2, symbol: 'He', name: '氦', period: 1, group: 18, category: 'noble-gas', covalentRadius: 0.32, defaultValence: 0 },
  // Period 2
  { number: 3, symbol: 'Li', name: '锂', period: 2, group: 1, category: 'alkali-metal', covalentRadius: 1.34, defaultValence: 1 },
  { number: 4, symbol: 'Be', name: '铍', period: 2, group: 2, category: 'alkaline-earth', covalentRadius: 0.90, defaultValence: 2 },
  { number: 5, symbol: 'B', name: '硼', period: 2, group: 13, category: 'metalloid', covalentRadius: 0.82, defaultValence: 3 },
  { number: 6, symbol: 'C', name: '碳', period: 2, group: 14, category: 'nonmetal', covalentRadius: 0.77, defaultValence: 4 },
  { number: 7, symbol: 'N', name: '氮', period: 2, group: 15, category: 'nonmetal', covalentRadius: 0.75, defaultValence: 3 },
  { number: 8, symbol: 'O', name: '氧', period: 2, group: 16, category: 'nonmetal', covalentRadius: 0.73, defaultValence: 2 },
  { number: 9, symbol: 'F', name: '氟', period: 2, group: 17, category: 'halogen', covalentRadius: 0.71, defaultValence: 1 },
  { number: 10, symbol: 'Ne', name: '氖', period: 2, group: 18, category: 'noble-gas', covalentRadius: 0.69, defaultValence: 0 },
  // Period 3
  { number: 11, symbol: 'Na', name: '钠', period: 3, group: 1, category: 'alkali-metal', covalentRadius: 1.54, defaultValence: 1 },
  { number: 12, symbol: 'Mg', name: '镁', period: 3, group: 2, category: 'alkaline-earth', covalentRadius: 1.30, defaultValence: 2 },
  { number: 13, symbol: 'Al', name: '铝', period: 3, group: 13, category: 'post-transition', covalentRadius: 1.18, defaultValence: 3 },
  { number: 14, symbol: 'Si', name: '硅', period: 3, group: 14, category: 'metalloid', covalentRadius: 1.11, defaultValence: 4 },
  { number: 15, symbol: 'P', name: '磷', period: 3, group: 15, category: 'nonmetal', covalentRadius: 1.06, defaultValence: 3 },
  { number: 16, symbol: 'S', name: '硫', period: 3, group: 16, category: 'nonmetal', covalentRadius: 1.02, defaultValence: 2 },
  { number: 17, symbol: 'Cl', name: '氯', period: 3, group: 17, category: 'halogen', covalentRadius: 0.99, defaultValence: 1 },
  { number: 18, symbol: 'Ar', name: '氩', period: 3, group: 18, category: 'noble-gas', covalentRadius: 0.97, defaultValence: 0 },
  // Period 4
  { number: 19, symbol: 'K', name: '钾', period: 4, group: 1, category: 'alkali-metal', covalentRadius: 1.96, defaultValence: 1 },
  { number: 20, symbol: 'Ca', name: '钙', period: 4, group: 2, category: 'alkaline-earth', covalentRadius: 1.74, defaultValence: 2 },
  { number: 21, symbol: 'Sc', name: '钪', period: 4, group: 3, category: 'transition', covalentRadius: 1.44, defaultValence: 3 },
  { number: 22, symbol: 'Ti', name: '钛', period: 4, group: 4, category: 'transition', covalentRadius: 1.36, defaultValence: 4 },
  { number: 23, symbol: 'V', name: '钒', period: 4, group: 5, category: 'transition', covalentRadius: 1.25, defaultValence: 5 },
  { number: 24, symbol: 'Cr', name: '铬', period: 4, group: 6, category: 'transition', covalentRadius: 1.27, defaultValence: 3 },
  { number: 25, symbol: 'Mn', name: '锰', period: 4, group: 7, category: 'transition', covalentRadius: 1.39, defaultValence: 2 },
  { number: 26, symbol: 'Fe', name: '铁', period: 4, group: 8, category: 'transition', covalentRadius: 1.25, defaultValence: 3 },
  { number: 27, symbol: 'Co', name: '钴', period: 4, group: 9, category: 'transition', covalentRadius: 1.26, defaultValence: 2 },
  { number: 28, symbol: 'Ni', name: '镍', period: 4, group: 10, category: 'transition', covalentRadius: 1.21, defaultValence: 2 },
  { number: 29, symbol: 'Cu', name: '铜', period: 4, group: 11, category: 'transition', covalentRadius: 1.38, defaultValence: 2 },
  { number: 30, symbol: 'Zn', name: '锌', period: 4, group: 12, category: 'transition', covalentRadius: 1.31, defaultValence: 2 },
  { number: 31, symbol: 'Ga', name: '镓', period: 4, group: 13, category: 'post-transition', covalentRadius: 1.26, defaultValence: 3 },
  { number: 32, symbol: 'Ge', name: '锗', period: 4, group: 14, category: 'metalloid', covalentRadius: 1.22, defaultValence: 4 },
  { number: 33, symbol: 'As', name: '砷', period: 4, group: 15, category: 'metalloid', covalentRadius: 1.19, defaultValence: 3 },
  { number: 34, symbol: 'Se', name: '硒', period: 4, group: 16, category: 'nonmetal', covalentRadius: 1.16, defaultValence: 2 },
  { number: 35, symbol: 'Br', name: '溴', period: 4, group: 17, category: 'halogen', covalentRadius: 1.14, defaultValence: 1 },
  { number: 36, symbol: 'Kr', name: '氪', period: 4, group: 18, category: 'noble-gas', covalentRadius: 1.10, defaultValence: 0 },
  // Period 5
  { number: 37, symbol: 'Rb', name: '铷', period: 5, group: 1, category: 'alkali-metal', covalentRadius: 2.11, defaultValence: 1 },
  { number: 38, symbol: 'Sr', name: '锶', period: 5, group: 2, category: 'alkaline-earth', covalentRadius: 1.92, defaultValence: 2 },
  { number: 39, symbol: 'Y', name: '钇', period: 5, group: 3, category: 'transition', covalentRadius: 1.62, defaultValence: 3 },
  { number: 40, symbol: 'Zr', name: '锆', period: 5, group: 4, category: 'transition', covalentRadius: 1.48, defaultValence: 4 },
  { number: 41, symbol: 'Nb', name: '铌', period: 5, group: 5, category: 'transition', covalentRadius: 1.37, defaultValence: 5 },
  { number: 42, symbol: 'Mo', name: '钼', period: 5, group: 6, category: 'transition', covalentRadius: 1.45, defaultValence: 6 },
  { number: 43, symbol: 'Tc', name: '锝', period: 5, group: 7, category: 'transition', covalentRadius: 1.56, defaultValence: 4 },
  { number: 44, symbol: 'Ru', name: '钌', period: 5, group: 8, category: 'transition', covalentRadius: 1.26, defaultValence: 3 },
  { number: 45, symbol: 'Rh', name: '铑', period: 5, group: 9, category: 'transition', covalentRadius: 1.35, defaultValence: 3 },
  { number: 46, symbol: 'Pd', name: '钯', period: 5, group: 10, category: 'transition', covalentRadius: 1.31, defaultValence: 2 },
  { number: 47, symbol: 'Ag', name: '银', period: 5, group: 11, category: 'transition', covalentRadius: 1.53, defaultValence: 1 },
  { number: 48, symbol: 'Cd', name: '镉', period: 5, group: 12, category: 'transition', covalentRadius: 1.48, defaultValence: 2 },
  { number: 49, symbol: 'In', name: '铟', period: 5, group: 13, category: 'post-transition', covalentRadius: 1.44, defaultValence: 3 },
  { number: 50, symbol: 'Sn', name: '锡', period: 5, group: 14, category: 'post-transition', covalentRadius: 1.41, defaultValence: 4 },
  { number: 51, symbol: 'Sb', name: '锑', period: 5, group: 15, category: 'metalloid', covalentRadius: 1.38, defaultValence: 3 },
  { number: 52, symbol: 'Te', name: '碲', period: 5, group: 16, category: 'metalloid', covalentRadius: 1.35, defaultValence: 2 },
  { number: 53, symbol: 'I', name: '碘', period: 5, group: 17, category: 'halogen', covalentRadius: 1.33, defaultValence: 1 },
  { number: 54, symbol: 'Xe', name: '氙', period: 5, group: 18, category: 'noble-gas', covalentRadius: 1.30, defaultValence: 0 },
  // Period 6
  { number: 55, symbol: 'Cs', name: '铯', period: 6, group: 1, category: 'alkali-metal', covalentRadius: 2.25, defaultValence: 1 },
  { number: 56, symbol: 'Ba', name: '钡', period: 6, group: 2, category: 'alkaline-earth', covalentRadius: 1.98, defaultValence: 2 },
  { number: 57, symbol: 'La', name: '镧', period: 8, group: 3, category: 'lanthanide', covalentRadius: 1.69, defaultValence: 3 },
  { number: 58, symbol: 'Ce', name: '铈', period: 8, group: 4, category: 'lanthanide', covalentRadius: 1.65, defaultValence: 3 },
  { number: 59, symbol: 'Pr', name: '镨', period: 8, group: 5, category: 'lanthanide', covalentRadius: 1.65, defaultValence: 3 },
  { number: 60, symbol: 'Nd', name: '钕', period: 8, group: 6, category: 'lanthanide', covalentRadius: 1.64, defaultValence: 3 },
  { number: 61, symbol: 'Pm', name: '钷', period: 8, group: 7, category: 'lanthanide', covalentRadius: 1.63, defaultValence: 3 },
  { number: 62, symbol: 'Sm', name: '钐', period: 8, group: 8, category: 'lanthanide', covalentRadius: 1.62, defaultValence: 3 },
  { number: 63, symbol: 'Eu', name: '铕', period: 8, group: 9, category: 'lanthanide', covalentRadius: 1.85, defaultValence: 3 },
  { number: 64, symbol: 'Gd', name: '钆', period: 8, group: 10, category: 'lanthanide', covalentRadius: 1.61, defaultValence: 3 },
  { number: 65, symbol: 'Tb', name: '铽', period: 8, group: 11, category: 'lanthanide', covalentRadius: 1.59, defaultValence: 3 },
  { number: 66, symbol: 'Dy', name: '镝', period: 8, group: 12, category: 'lanthanide', covalentRadius: 1.59, defaultValence: 3 },
  { number: 67, symbol: 'Ho', name: '钬', period: 8, group: 13, category: 'lanthanide', covalentRadius: 1.58, defaultValence: 3 },
  { number: 68, symbol: 'Er', name: '铒', period: 8, group: 14, category: 'lanthanide', covalentRadius: 1.57, defaultValence: 3 },
  { number: 69, symbol: 'Tm', name: '铥', period: 8, group: 15, category: 'lanthanide', covalentRadius: 1.56, defaultValence: 3 },
  { number: 70, symbol: 'Yb', name: '镱', period: 8, group: 16, category: 'lanthanide', covalentRadius: 1.74, defaultValence: 3 },
  { number: 71, symbol: 'Lu', name: '镥', period: 8, group: 17, category: 'lanthanide', covalentRadius: 1.56, defaultValence: 3 },
  { number: 72, symbol: 'Hf', name: '铪', period: 6, group: 4, category: 'transition', covalentRadius: 1.50, defaultValence: 4 },
  { number: 73, symbol: 'Ta', name: '钽', period: 6, group: 5, category: 'transition', covalentRadius: 1.38, defaultValence: 5 },
  { number: 74, symbol: 'W', name: '钨', period: 6, group: 6, category: 'transition', covalentRadius: 1.46, defaultValence: 6 },
  { number: 75, symbol: 'Re', name: '铼', period: 6, group: 7, category: 'transition', covalentRadius: 1.59, defaultValence: 4 },
  { number: 76, symbol: 'Os', name: '锇', period: 6, group: 8, category: 'transition', covalentRadius: 1.28, defaultValence: 4 },
  { number: 77, symbol: 'Ir', name: '铱', period: 6, group: 9, category: 'transition', covalentRadius: 1.37, defaultValence: 3 },
  { number: 78, symbol: 'Pt', name: '铂', period: 6, group: 10, category: 'transition', covalentRadius: 1.28, defaultValence: 2 },
  { number: 79, symbol: 'Au', name: '金', period: 6, group: 11, category: 'transition', covalentRadius: 1.44, defaultValence: 1 },
  { number: 80, symbol: 'Hg', name: '汞', period: 6, group: 12, category: 'transition', covalentRadius: 1.49, defaultValence: 2 },
  { number: 81, symbol: 'Tl', name: '铊', period: 6, group: 13, category: 'post-transition', covalentRadius: 1.48, defaultValence: 1 },
  { number: 82, symbol: 'Pb', name: '铅', period: 6, group: 14, category: 'post-transition', covalentRadius: 1.47, defaultValence: 2 },
  { number: 83, symbol: 'Bi', name: '铋', period: 6, group: 15, category: 'post-transition', covalentRadius: 1.46, defaultValence: 3 },
  { number: 84, symbol: 'Po', name: '钋', period: 6, group: 16, category: 'post-transition', covalentRadius: 1.40, defaultValence: 2 },
  { number: 85, symbol: 'At', name: '砹', period: 6, group: 17, category: 'halogen', covalentRadius: 1.50, defaultValence: 1 },
  { number: 86, symbol: 'Rn', name: '氡', period: 6, group: 18, category: 'noble-gas', covalentRadius: 1.45, defaultValence: 0 },
  // Period 7
  { number: 87, symbol: 'Fr', name: '钫', period: 7, group: 1, category: 'alkali-metal', covalentRadius: 2.40, defaultValence: 1 },
  { number: 88, symbol: 'Ra', name: '镭', period: 7, group: 2, category: 'alkaline-earth', covalentRadius: 2.10, defaultValence: 2 },
  { number: 89, symbol: 'Ac', name: '锕', period: 9, group: 3, category: 'actinide', covalentRadius: 1.80, defaultValence: 3 },
  { number: 90, symbol: 'Th', name: '钍', period: 9, group: 4, category: 'actinide', covalentRadius: 1.75, defaultValence: 4 },
  { number: 91, symbol: 'Pa', name: '镤', period: 9, group: 5, category: 'actinide', covalentRadius: 1.70, defaultValence: 5 },
  { number: 92, symbol: 'U', name: '铀', period: 9, group: 6, category: 'actinide', covalentRadius: 1.70, defaultValence: 6 },
  { number: 93, symbol: 'Np', name: '镎', period: 9, group: 7, category: 'actinide', covalentRadius: 1.70, defaultValence: 5 },
  { number: 94, symbol: 'Pu', name: '钚', period: 9, group: 8, category: 'actinide', covalentRadius: 1.70, defaultValence: 4 },
  { number: 95, symbol: 'Am', name: '镅', period: 9, group: 9, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 96, symbol: 'Cm', name: '锔', period: 9, group: 10, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 97, symbol: 'Bk', name: '锫', period: 9, group: 11, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 98, symbol: 'Cf', name: '锎', period: 9, group: 12, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 99, symbol: 'Es', name: '锿', period: 9, group: 13, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 100, symbol: 'Fm', name: '镄', period: 9, group: 14, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 101, symbol: 'Md', name: '钔', period: 9, group: 15, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 102, symbol: 'No', name: '锘', period: 9, group: 16, category: 'actinide', covalentRadius: 1.70, defaultValence: 2 },
  { number: 103, symbol: 'Lr', name: '铹', period: 9, group: 17, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 104, symbol: 'Rf', name: '𬬻', period: 7, group: 4, category: 'transition', covalentRadius: 1.57, defaultValence: 4 },
  { number: 105, symbol: 'Db', name: '𬭊', period: 7, group: 5, category: 'transition', covalentRadius: 1.49, defaultValence: 5 },
  { number: 106, symbol: 'Sg', name: '𬭳', period: 7, group: 6, category: 'transition', covalentRadius: 1.43, defaultValence: 6 },
  { number: 107, symbol: 'Bh', name: '𬭛', period: 7, group: 7, category: 'transition', covalentRadius: 1.41, defaultValence: 7 },
  { number: 108, symbol: 'Hs', name: '𬭶', period: 7, group: 8, category: 'transition', covalentRadius: 1.34, defaultValence: 8 },
  { number: 109, symbol: 'Mt', name: '鿏', period: 7, group: 9, category: 'transition', covalentRadius: 1.29, defaultValence: 3 },
  { number: 110, symbol: 'Ds', name: '𫟼', period: 7, group: 10, category: 'transition', covalentRadius: 1.28, defaultValence: 2 },
  { number: 111, symbol: 'Rg', name: '𬬭', period: 7, group: 11, category: 'transition', covalentRadius: 1.21, defaultValence: 1 },
  { number: 112, symbol: 'Cn', name: '鎶', period: 7, group: 12, category: 'transition', covalentRadius: 1.22, defaultValence: 2 },
  { number: 113, symbol: 'Nh', name: '鉨', period: 7, group: 13, category: 'post-transition', covalentRadius: 1.36, defaultValence: 3 },
  { number: 114, symbol: 'Fl', name: '𫓧', period: 7, group: 14, category: 'post-transition', covalentRadius: 1.43, defaultValence: 4 },
  { number: 115, symbol: 'Mc', name: '镆', period: 7, group: 15, category: 'post-transition', covalentRadius: 1.62, defaultValence: 3 },
  { number: 116, symbol: 'Lv', name: '𫟷', period: 7, group: 16, category: 'post-transition', covalentRadius: 1.75, defaultValence: 2 },
  { number: 117, symbol: 'Ts', name: '鿬', period: 7, group: 17, category: 'halogen', covalentRadius: 1.65, defaultValence: 1 },
  { number: 118, symbol: 'Og', name: '鿫', period: 7, group: 18, category: 'noble-gas', covalentRadius: 1.57, defaultValence: 0 },
];

export const ELEMENT_MAP: Record<string, PeriodicElement> = Object.fromEntries(
  PERIODIC_TABLE.map((el) => [el.symbol, el])
);

export function getElementColor(element: string): number {
  if (ELEMENT_COLORS[element] !== undefined) return ELEMENT_COLORS[element];
  const meta = ELEMENT_MAP[element];
  if (meta) return CATEGORY_COLORS[meta.category];
  return 0x64748b;
}

export function getElementColorHex(element: string): string {
  return '#' + getElementColor(element).toString(16).padStart(6, '0');
}

export function getElementRadius(element: string): number {
  if (ELEMENT_RADII[element] !== undefined) return ELEMENT_RADII[element];
  const meta = ELEMENT_MAP[element];
  if (meta) {
    return Math.max(0.28, Math.min(0.52, 0.22 + meta.covalentRadius * 0.14));
  }
  return 0.38;
}

const textureCache = new Map<string, THREE.CanvasTexture>();

export function getElementSpriteTexture(element: string): THREE.CanvasTexture {
  if (textureCache.has(element)) return textureCache.get(element)!;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.font = '600 64px -apple-system, BlinkMacSystemFont, "Inter", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ['H', 'He', 'Be', 'B', 'Ne'].includes(element) ? '#334155' : '#ffffff';
  ctx.fillText(element, 64, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(element, tex);
  return tex;
}
