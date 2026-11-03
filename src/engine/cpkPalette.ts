import * as THREE from 'three';

/**
 * Standard CPK (Corey-Pauling-Koltun) scientific element palette
 * Designed for multi-reaction extensibility (C, H, Br, Cl, O, N, F, I, S, P)
 */
export const ELEMENT_COLORS: Record<string, number> = {
  C: 0x334155,  // Slate 700 (Carbon charcoal)
  H: 0xf8fafc,  // Slate 50 (Hydrogen white)
  Br: 0x9a3412, // Orange/Red-Brown 800 (Bromine liquid red-brown)
  Cl: 0x16a34a, // Green 600 (Chlorine)
  O: 0xdc2626,  // Red 600 (Oxygen)
  N: 0x2563eb,  // Blue 600 (Nitrogen)
  F: 0x65a30d,  // Lime 600 (Fluorine)
  I: 0x7e22ce,  // Purple 700 (Iodine)
  S: 0xca8a04,  // Yellow 600 (Sulfur)
  P: 0xea580c,  // Orange 600 (Phosphorus)
};

export const ELEMENT_RADII: Record<string, number> = {
  C: 0.36,
  H: 0.245,
  Br: 0.46,
  Cl: 0.42,
  O: 0.34,
  N: 0.35,
  F: 0.32,
  I: 0.50,
  S: 0.42,
  P: 0.40,
};

export const RADICAL_COLOR = 0xea580c;
export const SELECTION_EMISSIVE = 0x2563eb;

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
  ctx.fillStyle = element === 'H' ? '#334155' : '#ffffff';
  ctx.fillText(element, 64, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(element, tex);
  return tex;
}
