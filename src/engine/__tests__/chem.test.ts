import { describe, it, expect } from 'vitest';
import * as core from '../core';
import * as files from '../configFiles';
import * as deduction from '../deduction';
import { CHEM_DEFAULT_FILES } from '../defaultBundle';

const fullBundle = () => structuredClone(CHEM_DEFAULT_FILES);
const assembleDefault = () => files.assemble(fullBundle());

describe('Chem Engine & Deduction Suite', () => {
  it('validates and compiles the assembled default 7-step config', () => {
    const config = assembleDefault();
    const res = core.validate(config);
    expect(res.errors).toEqual([]);
    expect(res.states?.length).toBe(7);
  });

  it('rejects Br2 or HBr if geometry is tetrahedral instead of diatomic', () => {
    const bundle = fullBundle();
    const br2 = structuredClone(bundle.students.find((s) => s.formula === 'Br2')!);
    br2.geometry = 'tetrahedral';
    expect(() => files.structure(br2, bundle.catalog.Br2)).toThrow(/空间构型填写有误/);
  });

  it('accepts diatomic (and legacy linear) for Br2 and HBr, and trigonalPlanar for CH3·', () => {
    const bundle = fullBundle();
    const br2 = structuredClone(bundle.students.find((s) => s.formula === 'Br2')!);
    expect(br2.geometry).toBe('diatomic');
    const molBr2 = files.structure(br2, bundle.catalog.Br2);
    expect(molBr2.atoms.length).toBe(2);

    // Also verify legacy 'linear' compatibility for Br2
    const br2Legacy = structuredClone(br2);
    br2Legacy.geometry = 'linear';
    expect(files.structure(br2Legacy, bundle.catalog.Br2).atoms.length).toBe(2);

    const hbr = structuredClone(bundle.students.find((s) => s.formula === 'HBr')!);
    expect(hbr.geometry).toBe('diatomic');
    const molHbr = files.structure(hbr, bundle.catalog.HBr);
    expect(molHbr.atoms.length).toBe(2);

    const ch3 = structuredClone(bundle.students.find((s) => s.formula === 'CH3·')!);
    expect(ch3.geometry).toBe('trigonalPlanar');
    const molCh3 = files.structure(ch3, bundle.catalog.CH3);
    expect(molCh3.atoms.length).toBe(4);
  });

  it('measures bond lengths and bond angles accurately', () => {
    const config = assembleDefault();
    const ch4 = config.molecules.CH4;
    const cId = ch4.atoms.find((a) => a.element === 'C')!.id;
    const hAtoms = ch4.atoms.filter((a) => a.element === 'H');
    const chLen = core.measure(ch4, [cId, hAtoms[0].id]);
    expect(Math.abs(chLen - 1.09)).toBeLessThan(0.02);

    const hchAngle = core.measure(ch4, [hAtoms[0].id, cId, hAtoms[1].id]);
    expect(Math.abs(hchAngle - 109.47)).toBeLessThan(0.5);
  });

  it('interpolates 3D state smoothly between steps via sample()', () => {
    const config = assembleDefault();
    const res = core.validate(config);
    const states = res.states!;
    const frame0 = core.sample(config, states, 1, 0);
    const frameMid = core.sample(config, states, 1, 0.5);
    const frameEnd = core.sample(config, states, 1, 1);

    const atomKey = Object.keys(frame0.atoms)[0];
    expect(frame0.atoms[atomKey]).toBeDefined();
    expect(frameMid.atoms[atomKey]).toBeDefined();
    expect(frameEnd.atoms[atomKey]).toBeDefined();
  });

  it('verifies all 4 stages of the reaction pipeline including 3 termination reactions', () => {
    const validData = {
      initiation: { reactants: ['Br2'], products: ['Br', 'Br'] },
      propagation1: { reactants: ['CH4', 'Br'], products: ['CH3', 'HBr'] },
      propagation2: { reactants: ['CH3', 'Br2'], products: ['CH3Br', 'Br'] },
      termination: {
        reactions: [
          { reactants: ['CH3', 'Br'], products: ['CH3Br'] },
          { reactants: ['Br', 'Br'], products: ['Br2'] },
          { reactants: ['CH3', 'CH3'], products: ['CH3CH3'] },
        ],
      },
    };
    const res = deduction.verifyPipeline(validData);
    expect(res.ok).toBe(true);
  });

  it('detects duplicate coupling equations or wrong products in termination stage', () => {
    const dupData = {
      initiation: { reactants: ['Br2'], products: ['Br', 'Br'] },
      propagation1: { reactants: ['CH4', 'Br'], products: ['CH3', 'HBr'] },
      propagation2: { reactants: ['CH3', 'Br2'], products: ['CH3Br', 'Br'] },
      termination: {
        reactions: [
          { reactants: ['Br', 'Br'], products: ['Br2'] },
          { reactants: ['Br', 'Br'], products: ['Br2'] },
          { reactants: ['CH3', 'CH3'], products: ['CH3CH3'] },
        ],
      },
    };
    const res = deduction.verifyPipeline(dupData);
    expect(res.ok).toBe(false);
    expect(res.errorStage).toBe('termination');
    expect(res.hint).toMatch(/重复/);
  });

  it('verifies step deduction questions accurately', () => {
    expect(deduction.verify(0, {}).ok).toBe(true);
    expect(
      deduction.verify(1, {
        phase: '引发',
        equation: 'Br₂ → 2 Br·',
        breakBond: 'Br—Br',
        formBond: '无',
      }).ok
    ).toBe(true);
    expect(
      deduction.verify(1, {
        phase: '链增长 ①',
        equation: 'Br₂ → 2 Br·',
        breakBond: 'Br—Br',
        formBond: '无',
      }).ok
    ).toBe(false);
  });
});
