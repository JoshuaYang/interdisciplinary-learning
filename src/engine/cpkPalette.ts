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
  nonmetal: 'Nonmetals',
  halogen: 'Halogens',
  'noble-gas': 'Noble Gases',
  'alkali-metal': 'Alkali Metals',
  'alkaline-earth': 'Alkaline Earth',
  metalloid: 'Metalloids',
  'post-transition': 'Post-Transition',
  transition: 'Transition Metals',
  lanthanide: 'Lanthanides',
  actinide: 'Actinides',
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
 * Full 118-element periodic table data (English names)
 */
export const PERIODIC_TABLE: PeriodicElement[] = [
  // Period 1
  { number: 1, symbol: 'H', name: 'Hydrogen', period: 1, group: 1, category: 'nonmetal', covalentRadius: 0.37, defaultValence: 1 },
  { number: 2, symbol: 'He', name: 'Helium', period: 1, group: 18, category: 'noble-gas', covalentRadius: 0.32, defaultValence: 0 },
  // Period 2
  { number: 3, symbol: 'Li', name: 'Lithium', period: 2, group: 1, category: 'alkali-metal', covalentRadius: 1.34, defaultValence: 1 },
  { number: 4, symbol: 'Be', name: 'Beryllium', period: 2, group: 2, category: 'alkaline-earth', covalentRadius: 0.90, defaultValence: 2 },
  { number: 5, symbol: 'B', name: 'Boron', period: 2, group: 13, category: 'metalloid', covalentRadius: 0.82, defaultValence: 3 },
  { number: 6, symbol: 'C', name: 'Carbon', period: 2, group: 14, category: 'nonmetal', covalentRadius: 0.77, defaultValence: 4 },
  { number: 7, symbol: 'N', name: 'Nitrogen', period: 2, group: 15, category: 'nonmetal', covalentRadius: 0.75, defaultValence: 3 },
  { number: 8, symbol: 'O', name: 'Oxygen', period: 2, group: 16, category: 'nonmetal', covalentRadius: 0.73, defaultValence: 2 },
  { number: 9, symbol: 'F', name: 'Fluorine', period: 2, group: 17, category: 'halogen', covalentRadius: 0.71, defaultValence: 1 },
  { number: 10, symbol: 'Ne', name: 'Neon', period: 2, group: 18, category: 'noble-gas', covalentRadius: 0.69, defaultValence: 0 },
  // Period 3
  { number: 11, symbol: 'Na', name: 'Sodium', period: 3, group: 1, category: 'alkali-metal', covalentRadius: 1.54, defaultValence: 1 },
  { number: 12, symbol: 'Mg', name: 'Magnesium', period: 3, group: 2, category: 'alkaline-earth', covalentRadius: 1.30, defaultValence: 2 },
  { number: 13, symbol: 'Al', name: 'Aluminum', period: 3, group: 13, category: 'post-transition', covalentRadius: 1.18, defaultValence: 3 },
  { number: 14, symbol: 'Si', name: 'Silicon', period: 3, group: 14, category: 'metalloid', covalentRadius: 1.11, defaultValence: 4 },
  { number: 15, symbol: 'P', name: 'Phosphorus', period: 3, group: 15, category: 'nonmetal', covalentRadius: 1.06, defaultValence: 3 },
  { number: 16, symbol: 'S', name: 'Sulfur', period: 3, group: 16, category: 'nonmetal', covalentRadius: 1.02, defaultValence: 2 },
  { number: 17, symbol: 'Cl', name: 'Chlorine', period: 3, group: 17, category: 'halogen', covalentRadius: 0.99, defaultValence: 1 },
  { number: 18, symbol: 'Ar', name: 'Argon', period: 3, group: 18, category: 'noble-gas', covalentRadius: 0.97, defaultValence: 0 },
  // Period 4
  { number: 19, symbol: 'K', name: 'Potassium', period: 4, group: 1, category: 'alkali-metal', covalentRadius: 1.96, defaultValence: 1 },
  { number: 20, symbol: 'Ca', name: 'Calcium', period: 4, group: 2, category: 'alkaline-earth', covalentRadius: 1.74, defaultValence: 2 },
  { number: 21, symbol: 'Sc', name: 'Scandium', period: 4, group: 3, category: 'transition', covalentRadius: 1.44, defaultValence: 3 },
  { number: 22, symbol: 'Ti', name: 'Titanium', period: 4, group: 4, category: 'transition', covalentRadius: 1.36, defaultValence: 4 },
  { number: 23, symbol: 'V', name: 'Vanadium', period: 4, group: 5, category: 'transition', covalentRadius: 1.25, defaultValence: 5 },
  { number: 24, symbol: 'Cr', name: 'Chromium', period: 4, group: 6, category: 'transition', covalentRadius: 1.27, defaultValence: 3 },
  { number: 25, symbol: 'Mn', name: 'Manganese', period: 4, group: 7, category: 'transition', covalentRadius: 1.39, defaultValence: 2 },
  { number: 26, symbol: 'Fe', name: 'Iron', period: 4, group: 8, category: 'transition', covalentRadius: 1.25, defaultValence: 3 },
  { number: 27, symbol: 'Co', name: 'Cobalt', period: 4, group: 9, category: 'transition', covalentRadius: 1.26, defaultValence: 2 },
  { number: 28, symbol: 'Ni', name: 'Nickel', period: 4, group: 10, category: 'transition', covalentRadius: 1.21, defaultValence: 2 },
  { number: 29, symbol: 'Cu', name: 'Copper', period: 4, group: 11, category: 'transition', covalentRadius: 1.38, defaultValence: 2 },
  { number: 30, symbol: 'Zn', name: 'Zinc', period: 4, group: 12, category: 'transition', covalentRadius: 1.31, defaultValence: 2 },
  { number: 31, symbol: 'Ga', name: 'Gallium', period: 4, group: 13, category: 'post-transition', covalentRadius: 1.26, defaultValence: 3 },
  { number: 32, symbol: 'Ge', name: 'Germanium', period: 4, group: 14, category: 'metalloid', covalentRadius: 1.22, defaultValence: 4 },
  { number: 33, symbol: 'As', name: 'Arsenic', period: 4, group: 15, category: 'metalloid', covalentRadius: 1.19, defaultValence: 3 },
  { number: 34, symbol: 'Se', name: 'Selenium', period: 4, group: 16, category: 'nonmetal', covalentRadius: 1.16, defaultValence: 2 },
  { number: 35, symbol: 'Br', name: 'Bromine', period: 4, group: 17, category: 'halogen', covalentRadius: 1.14, defaultValence: 1 },
  { number: 36, symbol: 'Kr', name: 'Krypton', period: 4, group: 18, category: 'noble-gas', covalentRadius: 1.10, defaultValence: 0 },
  // Period 5
  { number: 37, symbol: 'Rb', name: 'Rubidium', period: 5, group: 1, category: 'alkali-metal', covalentRadius: 2.11, defaultValence: 1 },
  { number: 38, symbol: 'Sr', name: 'Strontium', period: 5, group: 2, category: 'alkaline-earth', covalentRadius: 1.92, defaultValence: 2 },
  { number: 39, symbol: 'Y', name: 'Yttrium', period: 5, group: 3, category: 'transition', covalentRadius: 1.62, defaultValence: 3 },
  { number: 40, symbol: 'Zr', name: 'Zirconium', period: 5, group: 4, category: 'transition', covalentRadius: 1.48, defaultValence: 4 },
  { number: 41, symbol: 'Nb', name: 'Niobium', period: 5, group: 5, category: 'transition', covalentRadius: 1.37, defaultValence: 5 },
  { number: 42, symbol: 'Mo', name: 'Molybdenum', period: 5, group: 6, category: 'transition', covalentRadius: 1.45, defaultValence: 6 },
  { number: 43, symbol: 'Tc', name: 'Technetium', period: 5, group: 7, category: 'transition', covalentRadius: 1.56, defaultValence: 4 },
  { number: 44, symbol: 'Ru', name: 'Ruthenium', period: 5, group: 8, category: 'transition', covalentRadius: 1.26, defaultValence: 3 },
  { number: 45, symbol: 'Rh', name: 'Rhodium', period: 5, group: 9, category: 'transition', covalentRadius: 1.35, defaultValence: 3 },
  { number: 46, symbol: 'Pd', name: 'Palladium', period: 5, group: 10, category: 'transition', covalentRadius: 1.31, defaultValence: 2 },
  { number: 47, symbol: 'Ag', name: 'Silver', period: 5, group: 11, category: 'transition', covalentRadius: 1.53, defaultValence: 1 },
  { number: 48, symbol: 'Cd', name: 'Cadmium', period: 5, group: 12, category: 'transition', covalentRadius: 1.48, defaultValence: 2 },
  { number: 49, symbol: 'In', name: 'Indium', period: 5, group: 13, category: 'post-transition', covalentRadius: 1.44, defaultValence: 3 },
  { number: 50, symbol: 'Sn', name: 'Tin', period: 5, group: 14, category: 'post-transition', covalentRadius: 1.41, defaultValence: 4 },
  { number: 51, symbol: 'Sb', name: 'Antimony', period: 5, group: 15, category: 'metalloid', covalentRadius: 1.38, defaultValence: 3 },
  { number: 52, symbol: 'Te', name: 'Tellurium', period: 5, group: 16, category: 'metalloid', covalentRadius: 1.35, defaultValence: 2 },
  { number: 53, symbol: 'I', name: 'Iodine', period: 5, group: 17, category: 'halogen', covalentRadius: 1.33, defaultValence: 1 },
  { number: 54, symbol: 'Xe', name: 'Xenon', period: 5, group: 18, category: 'noble-gas', covalentRadius: 1.30, defaultValence: 0 },
  // Period 6
  { number: 55, symbol: 'Cs', name: 'Cesium', period: 6, group: 1, category: 'alkali-metal', covalentRadius: 2.25, defaultValence: 1 },
  { number: 56, symbol: 'Ba', name: 'Barium', period: 6, group: 2, category: 'alkaline-earth', covalentRadius: 1.98, defaultValence: 2 },
  { number: 57, symbol: 'La', name: 'Lanthanum', period: 8, group: 3, category: 'lanthanide', covalentRadius: 1.69, defaultValence: 3 },
  { number: 58, symbol: 'Ce', name: 'Cerium', period: 8, group: 4, category: 'lanthanide', covalentRadius: 1.65, defaultValence: 3 },
  { number: 59, symbol: 'Pr', name: 'Praseodymium', period: 8, group: 5, category: 'lanthanide', covalentRadius: 1.65, defaultValence: 3 },
  { number: 60, symbol: 'Nd', name: 'Neodymium', period: 8, group: 6, category: 'lanthanide', covalentRadius: 1.64, defaultValence: 3 },
  { number: 61, symbol: 'Pm', name: 'Promethium', period: 8, group: 7, category: 'lanthanide', covalentRadius: 1.63, defaultValence: 3 },
  { number: 62, symbol: 'Sm', name: 'Samarium', period: 8, group: 8, category: 'lanthanide', covalentRadius: 1.62, defaultValence: 3 },
  { number: 63, symbol: 'Eu', name: 'Europium', period: 8, group: 9, category: 'lanthanide', covalentRadius: 1.85, defaultValence: 3 },
  { number: 64, symbol: 'Gd', name: 'Gadolinium', period: 8, group: 10, category: 'lanthanide', covalentRadius: 1.61, defaultValence: 3 },
  { number: 65, symbol: 'Tb', name: 'Terbium', period: 8, group: 11, category: 'lanthanide', covalentRadius: 1.59, defaultValence: 3 },
  { number: 66, symbol: 'Dy', name: 'Dysprosium', period: 8, group: 12, category: 'lanthanide', covalentRadius: 1.59, defaultValence: 3 },
  { number: 67, symbol: 'Ho', name: 'Holmium', period: 8, group: 13, category: 'lanthanide', covalentRadius: 1.58, defaultValence: 3 },
  { number: 68, symbol: 'Er', name: 'Erbium', period: 8, group: 14, category: 'lanthanide', covalentRadius: 1.57, defaultValence: 3 },
  { number: 69, symbol: 'Tm', name: 'Thulium', period: 8, group: 15, category: 'lanthanide', covalentRadius: 1.56, defaultValence: 3 },
  { number: 70, symbol: 'Yb', name: 'Ytterbium', period: 8, group: 16, category: 'lanthanide', covalentRadius: 1.74, defaultValence: 3 },
  { number: 71, symbol: 'Lu', name: 'Lutetium', period: 8, group: 17, category: 'lanthanide', covalentRadius: 1.56, defaultValence: 3 },
  { number: 72, symbol: 'Hf', name: 'Hafnium', period: 6, group: 4, category: 'transition', covalentRadius: 1.50, defaultValence: 4 },
  { number: 73, symbol: 'Ta', name: 'Tantalum', period: 6, group: 5, category: 'transition', covalentRadius: 1.38, defaultValence: 5 },
  { number: 74, symbol: 'W', name: 'Tungsten', period: 6, group: 6, category: 'transition', covalentRadius: 1.46, defaultValence: 6 },
  { number: 75, symbol: 'Re', name: 'Rhenium', period: 6, group: 7, category: 'transition', covalentRadius: 1.59, defaultValence: 4 },
  { number: 76, symbol: 'Os', name: 'Osmium', period: 6, group: 8, category: 'transition', covalentRadius: 1.28, defaultValence: 4 },
  { number: 77, symbol: 'Ir', name: 'Iridium', period: 6, group: 9, category: 'transition', covalentRadius: 1.37, defaultValence: 3 },
  { number: 78, symbol: 'Pt', name: 'Platinum', period: 6, group: 10, category: 'transition', covalentRadius: 1.28, defaultValence: 2 },
  { number: 79, symbol: 'Au', name: 'Gold', period: 6, group: 11, category: 'transition', covalentRadius: 1.44, defaultValence: 1 },
  { number: 80, symbol: 'Hg', name: 'Mercury', period: 6, group: 12, category: 'transition', covalentRadius: 1.49, defaultValence: 2 },
  { number: 81, symbol: 'Tl', name: 'Thallium', period: 6, group: 13, category: 'post-transition', covalentRadius: 1.48, defaultValence: 1 },
  { number: 82, symbol: 'Pb', name: 'Lead', period: 6, group: 14, category: 'post-transition', covalentRadius: 1.47, defaultValence: 2 },
  { number: 83, symbol: 'Bi', name: 'Bismuth', period: 6, group: 15, category: 'post-transition', covalentRadius: 1.46, defaultValence: 3 },
  { number: 84, symbol: 'Po', name: 'Polonium', period: 6, group: 16, category: 'post-transition', covalentRadius: 1.40, defaultValence: 2 },
  { number: 85, symbol: 'At', name: 'Astatine', period: 6, group: 17, category: 'halogen', covalentRadius: 1.50, defaultValence: 1 },
  { number: 86, symbol: 'Rn', name: 'Radon', period: 6, group: 18, category: 'noble-gas', covalentRadius: 1.45, defaultValence: 0 },
  // Period 7
  { number: 87, symbol: 'Fr', name: 'Francium', period: 7, group: 1, category: 'alkali-metal', covalentRadius: 2.40, defaultValence: 1 },
  { number: 88, symbol: 'Ra', name: 'Radium', period: 7, group: 2, category: 'alkaline-earth', covalentRadius: 2.10, defaultValence: 2 },
  { number: 89, symbol: 'Ac', name: 'Actinium', period: 9, group: 3, category: 'actinide', covalentRadius: 1.80, defaultValence: 3 },
  { number: 90, symbol: 'Th', name: 'Thorium', period: 9, group: 4, category: 'actinide', covalentRadius: 1.75, defaultValence: 4 },
  { number: 91, symbol: 'Pa', name: 'Protactinium', period: 9, group: 5, category: 'actinide', covalentRadius: 1.70, defaultValence: 5 },
  { number: 92, symbol: 'U', name: 'Uranium', period: 9, group: 6, category: 'actinide', covalentRadius: 1.70, defaultValence: 6 },
  { number: 93, symbol: 'Np', name: 'Neptunium', period: 9, group: 7, category: 'actinide', covalentRadius: 1.70, defaultValence: 5 },
  { number: 94, symbol: 'Pu', name: 'Plutonium', period: 9, group: 8, category: 'actinide', covalentRadius: 1.70, defaultValence: 4 },
  { number: 95, symbol: 'Am', name: 'Americium', period: 9, group: 9, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 96, symbol: 'Cm', name: 'Curium', period: 9, group: 10, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 97, symbol: 'Bk', name: 'Berkelium', period: 9, group: 11, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 98, symbol: 'Cf', name: 'Californium', period: 9, group: 12, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 99, symbol: 'Es', name: 'Einsteinium', period: 9, group: 13, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 100, symbol: 'Fm', name: 'Fermium', period: 9, group: 14, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 101, symbol: 'Md', name: 'Mendelevium', period: 9, group: 15, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 102, symbol: 'No', name: 'Nobelium', period: 9, group: 16, category: 'actinide', covalentRadius: 1.70, defaultValence: 2 },
  { number: 103, symbol: 'Lr', name: 'Lawrencium', period: 9, group: 17, category: 'actinide', covalentRadius: 1.70, defaultValence: 3 },
  { number: 104, symbol: 'Rf', name: 'Rutherfordium', period: 7, group: 4, category: 'transition', covalentRadius: 1.57, defaultValence: 4 },
  { number: 105, symbol: 'Db', name: 'Dubnium', period: 7, group: 5, category: 'transition', covalentRadius: 1.49, defaultValence: 5 },
  { number: 106, symbol: 'Sg', name: 'Seaborgium', period: 7, group: 6, category: 'transition', covalentRadius: 1.43, defaultValence: 6 },
  { number: 107, symbol: 'Bh', name: 'Bohrium', period: 7, group: 7, category: 'transition', covalentRadius: 1.41, defaultValence: 7 },
  { number: 108, symbol: 'Hs', name: 'Hassium', period: 7, group: 8, category: 'transition', covalentRadius: 1.34, defaultValence: 8 },
  { number: 109, symbol: 'Mt', name: 'Meitnerium', period: 7, group: 9, category: 'transition', covalentRadius: 1.29, defaultValence: 3 },
  { number: 110, symbol: 'Ds', name: 'Darmstadtium', period: 7, group: 10, category: 'transition', covalentRadius: 1.28, defaultValence: 2 },
  { number: 111, symbol: 'Rg', name: 'Roentgenium', period: 7, group: 11, category: 'transition', covalentRadius: 1.21, defaultValence: 1 },
  { number: 112, symbol: 'Cn', name: 'Copernicium', period: 7, group: 12, category: 'transition', covalentRadius: 1.22, defaultValence: 2 },
  { number: 113, symbol: 'Nh', name: 'Nihonium', period: 7, group: 13, category: 'post-transition', covalentRadius: 1.36, defaultValence: 3 },
  { number: 114, symbol: 'Fl', name: 'Flerovium', period: 7, group: 14, category: 'post-transition', covalentRadius: 1.43, defaultValence: 4 },
  { number: 115, symbol: 'Mc', name: 'Moscovium', period: 7, group: 15, category: 'post-transition', covalentRadius: 1.62, defaultValence: 3 },
  { number: 116, symbol: 'Lv', name: 'Livermorium', period: 7, group: 16, category: 'post-transition', covalentRadius: 1.75, defaultValence: 2 },
  { number: 117, symbol: 'Ts', name: 'Tennessine', period: 7, group: 17, category: 'halogen', covalentRadius: 1.65, defaultValence: 1 },
  { number: 118, symbol: 'Og', name: 'Oganesson', period: 7, group: 18, category: 'noble-gas', covalentRadius: 1.57, defaultValence: 0 },
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
