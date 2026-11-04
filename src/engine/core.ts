/* Data and geometry layer: independent from the renderer. */
import type { ChemConfig, CompiledState, MoleculeModel } from '../types/chem';

export const clamp = (n: number, a = 0, b = 1): number => Math.min(b, Math.max(a, n));
export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerp = (a: number[], b: number[], t: number): [number, number, number] =>
  a.map((n, i) => mix(n, b[i], t)) as [number, number, number];
export const sub = (a: number[], b: number[]): [number, number, number] =>
  a.map((n, i) => n - b[i]) as [number, number, number];
export const add = (a: number[], b: number[]): [number, number, number] =>
  a.map((n, i) => n + b[i]) as [number, number, number];
export const length = (a: number[]): number => Math.hypot(...a);
export const key = (pair: string[]): string => [...pair].sort().join('|');
export const smooth = (t: number): number => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};

const isObj = (x: unknown): x is Record<string, any> =>
  Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const own = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);
const vec = (a: unknown): a is [number, number, number] =>
  Array.isArray(a) && a.length === 3 && a.every((n) => Number.isFinite(n) && Math.abs(n) <= 100);

export function interpolateDirection(a: number[], b: number[], t: number): [number, number, number] {
  const dot = clamp(
    a.reduce((s, n, i) => s + n * b[i], 0),
    -1,
    1
  );
  if (dot > 0.9999) {
    const v = lerp(a, b, t);
    const len = length(v);
    return v.map((n) => n / len) as [number, number, number];
  }
  if (dot < -0.9999) {
    const axis = Math.abs(a[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
    const cross = [
      a[1] * axis[2] - a[2] * axis[1],
      a[2] * axis[0] - a[0] * axis[2],
      a[0] * axis[1] - a[1] * axis[0],
    ];
    const norm = length(cross);
    return a.map(
      (n, i) => n * Math.cos(Math.PI * t) + (cross[i] / norm) * Math.sin(Math.PI * t)
    ) as [number, number, number];
  }
  const angle = Math.acos(dot);
  const sin = Math.sin(angle);
  return a.map(
    (n, i) => (n * Math.sin((1 - t) * angle) + b[i] * Math.sin(t * angle)) / sin
  ) as [number, number, number];
}

export function rotate(p: number[], degrees: number[] = [0, 0, 0]): [number, number, number] {
  let [x, y, z] = p;
  const [a, b, c] = degrees.map((n) => (n * Math.PI) / 180);
  [y, z] = [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
  [x, z] = [x * Math.cos(b) + z * Math.sin(b), -x * Math.sin(b) + z * Math.cos(b)];
  return [x * Math.cos(c) - y * Math.sin(c), x * Math.sin(c) + y * Math.cos(c), z];
}

export function measure(molecule: MoleculeModel, ids: string[]): number {
  const p = ids.map((id) => molecule.atoms.find((a) => a.id === id)!.position);
  if (ids.length === 2) return length(sub(p[0], p[1]));
  const a = sub(p[0], p[1]);
  const b = sub(p[2], p[1]);
  return (
    (Math.acos(
      clamp(a.reduce((s, n, i) => s + n * b[i], 0) / (length(a) * length(b)), -1, 1)
    ) *
      180) /
    Math.PI
  );
}

export function compile(config: ChemConfig): CompiledState[] {
  return config.steps.map((step) => {
    const atoms: Record<string, any> = Object.create(null);
    const bonds: Record<string, any> = Object.create(null);
    step.instances.forEach((inst, index) => {
      const mol = config.molecules[inst.molecule];
      mol.atoms.forEach((a) => {
        const id = inst.atomMap[a.id];
        atoms[id] = {
          id,
          element: a.element,
          position: add(rotate(a.position, inst.rotation), inst.position),
          radical: a.radical,
          opacity: inst.role === 'context' ? 0.28 : 1,
          molecule: inst.molecule,
          localId: a.id,
          instance: index,
        };
      });
      mol.bonds.forEach((b) => {
        const ids = b.atoms.map((id) => inst.atomMap[id]) as [string, string];
        bonds[key(ids)] = {
          atoms: ids,
          order: b.order,
          weight: 1,
          opacity: inst.role === 'context' ? 0.28 : 1,
        };
      });
    });
    return { atoms, bonds, step };
  });
}

export function validate(config: any): {
  errors: string[];
  warnings: string[];
  states?: CompiledState[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (m: string) => errors.push(m);
  if (!isObj(config)) return { errors: ['Configuration root must be a JSON object.'], warnings };
  if (config.version !== 1) err('version must be 1.');
  if (config.units !== 'angstrom') err('units must be "angstrom" (Å).');
  if (typeof config.title !== 'string' || !config.title.trim()) err('title is required.');
  if (
    config.sources !== undefined &&
    (!Array.isArray(config.sources) ||
      config.sources.some(
        (s: any) => !isObj(s) || typeof s.title !== 'string' || typeof s.url !== 'string'
      ))
  )
    err('sources must be an array of objects containing title and url.');
  if (!isObj(config.molecules))
    return { errors: [...errors, 'Missing "molecules" structure dictionary.'], warnings };
  if (!Array.isArray(config.steps) || config.steps.length !== 7)
    err('Exactly 7 steps are required.');
  const counts: Record<string, Record<string, number>> = {
    CH4: { C: 1, H: 4 },
    CH3: { C: 1, H: 3 },
    CH3Br: { C: 1, H: 3, Br: 1 },
    Br2: { Br: 2 },
    Br: { Br: 1 },
    HBr: { H: 1, Br: 1 },
  };
  for (const id of Object.keys(counts))
    if (!own(config.molecules, id)) err(`Missing molecule ${id}.`);
  for (const [id, m] of Object.entries<any>(config.molecules)) {
    const prefix = `molecules.${id}`;
    if (
      !isObj(m) ||
      !Array.isArray(m.atoms) ||
      m.atoms.length < 1 ||
      m.atoms.length > 20 ||
      !Array.isArray(m.bonds)
    ) {
      err(`${prefix} must contain atoms and bonds arrays.`);
      continue;
    }
    for (const field of ['name', 'formula', 'geometry'])
      if (typeof m[field] !== 'string') err(`${prefix}.${field} must be a string.`);
    if (
      m.reference !== undefined &&
      (!isObj(m.reference) ||
        ['status', 'source', 'url'].some(
          (f) => m.reference[f] !== undefined && typeof m.reference[f] !== 'string'
        ))
    )
      err(`${prefix}.reference must contain status, source, and url as strings.`);
    const ids = new Set<string>();
    const total: Record<string, number> = {};
    const degree: Record<string, number> = Object.create(null);
    let valid = true;
    for (const a of m.atoms) {
      if (!isObj(a) || typeof a.id !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(a.id)) {
        err(`${prefix}: atom id must start with a letter and contain only alphanumeric characters.`);
        valid = false;
        continue;
      }
      if (ids.has(a.id)) {
        err(`${prefix}: duplicate atom id ${a.id}.`);
        valid = false;
      }
      ids.add(a.id);
      degree[a.id] = 0;
      if (!['C', 'H', 'Br'].includes(a.element)) {
        err(`${prefix}.${a.id}: element must be C, H, or Br.`);
        valid = false;
      }
      total[a.element] = (total[a.element] || 0) + 1;
      if (!vec(a.position)) {
        err(`${prefix}.${a.id}.position must be 3 finite numbers within [-100, 100].`);
        valid = false;
      }
      if (a.radical !== 0 && a.radical !== 1) {
        err(`${prefix}.${a.id}.radical must be 0 or 1.`);
        valid = false;
      }
    }
    if (
      counts[id] &&
      JSON.stringify(Object.entries(total).sort()) !==
        JSON.stringify(Object.entries(counts[id]).sort())
    )
      err(
        `${prefix} atomic composition mismatch: expected ${Object.entries(counts[id])
          .map(([e, n]) => e + '×' + n)
          .join(', ')}.`
      );
    const seen = new Set<string>();
    for (const b of m.bonds) {
      if (
        !isObj(b) ||
        !Array.isArray(b.atoms) ||
        b.atoms.length !== 2 ||
        b.atoms.some((a: string) => !ids.has(a)) ||
        b.atoms[0] === b.atoms[1]
      ) {
        err(`${prefix} contains invalid bond references; check atom ids.`);
        valid = false;
        continue;
      }
      if (b.order !== 1) err(`${prefix}: only single bonds (order: 1) are used in this reaction.`);
      if (seen.has(key(b.atoms))) err(`${prefix}: duplicate bond between ${b.atoms.join('—')}.`);
      seen.add(key(b.atoms));
      b.atoms.forEach((a: string) => degree[a]++);
      if (valid && measure(m as MoleculeModel, b.atoms) < 0.1)
        err(`${prefix}: bond length between ${b.atoms.join('—')} is too small; check coordinates.`);
    }
    if (valid) {
      for (const a of m.atoms) {
        const expected = (a.element === 'C' ? 4 : 1) - a.radical;
        if (degree[a.id] !== expected)
          err(
            `${prefix}.${a.id} has ${degree[a.id]} bonds; expected ${expected} for this species.`
          );
      }
      for (let i = 0; i < m.atoms.length; i++)
        for (let j = i + 1; j < m.atoms.length; j++)
          if (length(sub(m.atoms[i].position, m.atoms[j].position)) < 0.1)
            err(`${prefix}: overlapping coordinates between atoms ${m.atoms[i].id} and ${m.atoms[j].id}.`);
    }
    if (!Array.isArray(m.measurements)) {
      err(`${prefix}.measurements must be an array.`);
      continue;
    }
    for (const q of m.measurements) {
      if (
        !isObj(q) ||
        typeof q.label !== 'string' ||
        !Array.isArray(q.atoms) ||
        ![2, 3].includes(q.atoms.length) ||
        new Set(q.atoms).size !== q.atoms.length ||
        q.atoms.some((a: string) => !ids.has(a)) ||
        !Number.isFinite(q.value) ||
        q.value <= 0 ||
        !Number.isFinite(q.tolerance) ||
        q.tolerance < 0
      ) {
        err(`${prefix}: invalid measurement definition.`);
        continue;
      }
      if (valid) {
        const n = measure(m as MoleculeModel, q.atoms);
        if (!Number.isFinite(n))
          err(`${prefix}: cannot calculate ${q.label}; check coordinates.`);
        else if (Math.abs(n - q.value) > q.tolerance)
          warnings.push(
            `${m.formula} ${q.label}: calculated ${n.toFixed(
              q.atoms.length === 2 ? 3 : 2
            )}${q.atoms.length === 2 ? ' Å' : '°'}, reference is ${q.value}.`
          );
      }
    }
  }
  if (errors.length) return { errors, warnings };
  config.steps.forEach((s: any, i: number) => {
    const prefix = `Step ${i + 1}`;
    if (!isObj(s)) {
      err(`${prefix} must be an object.`);
      return;
    }
    for (const f of ['title', 'shortTitle', 'phase', 'formula', 'description', 'note'])
      if (typeof s[f] !== 'string') err(`${prefix} missing string field "${f}".`);
    if (!Array.isArray(s.instances) || s.instances.length < 1 || s.instances.length > 12) {
      err(`${prefix} instances must contain 1 to 12 molecule instances.`);
      return;
    }
    const global = new Set<string>();
    for (const inst of s.instances) {
      if (!isObj(inst) || !own(config.molecules, inst.molecule)) {
        err(`${prefix} references a non-existent molecule.`);
        continue;
      }
      if (!vec(inst.position))
        err(`${prefix} position must be 3 numbers within [-100, 100].`);
      if (
        !Array.isArray(inst.rotation) ||
        inst.rotation.length !== 3 ||
        inst.rotation.some((n: number) => !Number.isFinite(n) || Math.abs(n) > 360)
      )
        err(`${prefix} rotation must be 3 angles within [-360, 360].`);
      if (!['focus', 'context'].includes(inst.role))
        err(`${prefix} role must be "focus" or "context".`);
      if (inst.caption !== undefined && typeof inst.caption !== 'string')
        err(`${prefix} caption must be a string.`);
      if (!isObj(inst.atomMap)) {
        err(`${prefix} missing atomMap.`);
        continue;
      }
      const local = config.molecules[inst.molecule].atoms.map((a: any) => a.id);
      if (
        Object.keys(inst.atomMap).length !== local.length ||
        local.some((id: string) => !own(inst.atomMap, id))
      )
        err(`${prefix}: ${inst.molecule} atomMap must map every local atom.`);
      for (const id of Object.values<any>(inst.atomMap)) {
        if (typeof id !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(id))
          err(`${prefix}: invalid global atom id.`);
        if (global.has(id)) err(`${prefix}: duplicate global atom id ${id}.`);
        global.add(id);
      }
    }
    const t = s.transition;
    if (
      !isObj(t) ||
      !['initial', 'initiation', 'reaction', 'reframe', 'summary'].includes(t.kind) ||
      !Number.isFinite(t.duration) ||
      (i > 0 ? t.duration < 0.2 || t.duration > 30 : t.duration !== 0)
    ) {
      err(`${prefix}: invalid transition type or duration.`);
      return;
    }
    if ((i === 0) !== (t.kind === 'initial')) err('Only Step 1 can use "initial" transition.');
    for (const field of ['breakBonds', 'formBonds'])
      if (
        !Array.isArray(t[field]) ||
        t[field].some(
          (p: any) =>
            !Array.isArray(p) ||
            p.length !== 2 ||
            p[0] === p[1] ||
            p.some((a: string) => !global.has(a))
        )
      )
        err(`${prefix}: ${field} contains invalid global atom id.`);
  });
  if (errors.length) return { errors, warnings };
  const states = compile(config as ChemConfig);
  const all = states[0].atoms;
  states.forEach((s, i) => {
    if (
      Object.keys(s.atoms).length !== Object.keys(all).length ||
      Object.keys(all).some((id) => !s.atoms[id] || s.atoms[id].element !== all[id].element)
    )
      err(
        `Step ${i + 1}: atom ids or elements do not match initial state.`
      );
    if (!i) return;
    const prev = states[i - 1];
    const t = s.step.transition;
    for (const inst of prev.step.instances) {
      const same = s.step.instances.find(
        (x) =>
          x.molecule === inst.molecule &&
          JSON.stringify(Object.values(x.atomMap).sort()) ===
            JSON.stringify(Object.values(inst.atomMap).sort())
      );
      if (
        same &&
        JSON.stringify(Object.entries(same.atomMap).sort()) !==
          JSON.stringify(Object.entries(inst.atomMap).sort())
      )
        err(
          `Step ${i + 1}: ${inst.molecule} swapped atom mappings of unreacted atoms; please preserve atomMap and use rotation to orient.`
        );
    }
    const removed = Object.keys(prev.bonds)
      .filter((k) => !s.bonds[k])
      .sort();
    const added = Object.keys(s.bonds)
      .filter((k) => !prev.bonds[k])
      .sort();
    if (JSON.stringify(removed) !== JSON.stringify(t.breakBonds.map(key).sort()))
      err(`Step ${i + 1}: breakBonds does not match broken bonds.`);
    if (JSON.stringify(added) !== JSON.stringify(t.formBonds.map(key).sort()))
      err(`Step ${i + 1}: formBonds does not match formed bonds.`);
    if (['reframe', 'summary'].includes(t.kind) && (removed.length || added.length))
      err(`Step ${i + 1} is a view transition; chemical bonds cannot change.`);
  });
  return { errors, warnings, states };
}

export function sample(
  config: ChemConfig,
  states: CompiledState[],
  index: number,
  progress: number
): CompiledState {
  if (index === 0 || progress >= 1) return states[index];
  if (progress <= 0) return states[index - 1];
  const from = states[index - 1];
  const to = states[index];
  const t = smooth(progress);
  const atoms: Record<string, any> = Object.create(null);
  const bonds: Record<string, any> = Object.create(null);
  const handled = new Set<string>();
  for (const [id, a] of Object.entries(from.atoms)) {
    const b = to.atoms[id];
    const rt = smooth((progress - 0.28) / 0.42);
    atoms[id] = {
      ...b,
      position: lerp(a.position, b.position, t),
      opacity: mix(a.opacity, b.opacity, t),
      radical: mix(a.radical, b.radical, rt),
    };
  }
  for (const inst of from.step.instances) {
    const signature = JSON.stringify(Object.entries(inst.atomMap).sort());
    const target = to.step.instances.find(
      (x) =>
        x.molecule === inst.molecule &&
        JSON.stringify(Object.entries(x.atomMap).sort()) === signature
    );
    if (!target) continue;
    const position = lerp(inst.position, target.position, t);
    const angles = inst.rotation.map(
      (a, i) => a + (((target.rotation[i] - a + 540) % 360) - 180) * t
    );
    for (const local of config.molecules[inst.molecule].atoms) {
      const id = inst.atomMap[local.id];
      atoms[id].position = add(rotate(local.position, angles), position);
      handled.add(id);
    }
  }
  for (const [k, bond] of Object.entries(from.bonds)) {
    if (!to.bonds[k]) continue;
    const c = bond.atoms.find((id) => from.atoms[id].element === 'C');
    const h = bond.atoms.find((id) => from.atoms[id].element === 'H');
    if (!c || !h || handled.has(h)) continue;
    const a = sub(from.atoms[h].position, from.atoms[c].position);
    const b = sub(to.atoms[h].position, to.atoms[c].position);
    const v = interpolateDirection(
      a.map((n) => n / length(a)),
      b.map((n) => n / length(b)),
      t
    );
    atoms[h].position = add(
      atoms[c].position,
      v.map((n) => n * mix(length(a), length(b), t))
    );
  }
  const rt = smooth((progress - 0.2) / 0.5);
  for (const k of new Set([...Object.keys(from.bonds), ...Object.keys(to.bonds)])) {
    const a = from.bonds[k];
    const b = to.bonds[k];
    bonds[k] = {
      ...(b || a),
      weight: a && b ? 1 : a ? 1 - rt : rt,
      opacity: mix(a?.opacity ?? b.opacity, b?.opacity ?? a.opacity, t),
    };
  }
  return { atoms, bonds, step: to.step };
}

export const ChemCore = {
  validate,
  compile,
  sample,
  measure,
  rotate,
  key,
  smooth,
  lerp,
  length,
  sub,
};
export default ChemCore;
