import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  Lock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useChemStore } from '../../store/useChemStore';
import { CustomSelect } from '../Common/CustomSelect';
import { ReactionPESHUD } from '../Common/ReactionPESHUD';
import * as core from '../../engine/core';
import * as deduction from '../../engine/deduction';
import type { ChemConfig, CompiledState, StepInstance } from '../../types/chem';
import {
  ELEMENT_COLORS as COLORS,
  ELEMENT_RADII as RADII,
  RADICAL_COLOR,
  SELECTION_EMISSIVE,
  getElementSpriteTexture as elementTexture,
} from '../../engine/cpkPalette';

export function getStepInstances(
  config: ChemConfig | null,
  stepIdx: number,
  prog: number
): StepInstance[] {
  if (!config) return [];
  if ([1, 3, 5].includes(stepIdx) && prog < 0.6) {
    if (stepIdx === 1) {
      return [
        {
          molecule: 'Br2',
          role: 'focus',
          position: [-2.6, 0.45, 0],
          rotation: [0, 0, 0],
          atomMap: { br1: 'BrA', br2: 'BrB' },
        },
        {
          molecule: 'CH4',
          role: 'context',
          position: [3, -2.4, -0.5],
          rotation: [0, -53.130102, 0],
          atomMap: { c: 'C', h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4' },
          caption: 'CH₄ · Unreacted',
        },
        {
          molecule: 'Br2',
          role: 'context',
          position: [-2.7, -2.4, -0.5],
          rotation: [0, 0, 0],
          atomMap: { br1: 'BrD', br2: 'BrC' },
          caption: 'Spectator Br₂',
        },
      ];
    }
    return config.steps[stepIdx - 1].instances;
  }
  return config.steps[stepIdx].instances;
}

export const StageScreen: React.FC = () => {
  const config = useChemStore((s) => s.config);
  const states = useChemStore((s) => s.states);
  const index = useChemStore((s) => s.index);
  const progress = useChemStore((s) => s.progress);
  const playing = useChemStore((s) => s.playing);
  const speed = useChemStore((s) => s.speed);
  const showMeasurements = useChemStore((s) => s.showMeasurements);
  const showContext = useChemStore((s) => s.showContext);
  const selection = useChemStore((s) => s.selection);
  const unlockedMaxStep = useChemStore((s) => s.unlockedMaxStep);
  const solvedSteps = useChemStore((s) => s.solvedSteps);
  const resetCameraTrigger = useChemStore((s) => s.resetCameraTrigger);

  const go = useChemStore((s) => s.go);
  const play = useChemStore((s) => s.play);
  const restart = useChemStore((s) => s.restart);
  const triggerResetView = useChemStore((s) => s.triggerResetView);
  const setProgress = useChemStore((s) => s.setProgress);
  const setSpeed = useChemStore((s) => s.setSpeed);
  const toggleContext = useChemStore((s) => s.toggleContext);
  const returnToPipeline = useChemStore((s) => s.returnToPipeline);
  const markStepSolved = useChemStore((s) => s.markStepSolved);

  const stageRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const lightCueRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Deduction card form state
  const stepData = deduction.STEPS_DATA[index];
  const [selPhase, setSelPhase] = useState('');
  const [selEq, setSelEq] = useState('');
  const [selBreak, setSelBreak] = useState('');
  const [selForm, setSelForm] = useState('');
  const [deductionFeedback, setDeductionFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  useEffect(() => {
    const d = deduction.STEPS_DATA[index];
    if (d && !d.isObservation) {
      setSelPhase(d.phase || '');
      setSelEq(d.equation || '');
      setSelBreak(d.breakBond || '');
      setSelForm(d.formBond || '');
    }
    setDeductionFeedback(null);
  }, [index]);

  const rotationRef = useRef({ x: 0.1, y: 0.12 });
  const zoomRef = useRef(1);
  const currentSampleRef = useRef<CompiledState | null>(null);

  useEffect(() => {
    rotationRef.current = { x: 0.1, y: 0.12 };
    zoomRef.current = 1;
  }, [resetCameraTrigger]);

  useEffect(() => {
    if (config && states.length) {
      currentSampleRef.current = core.sample(config, states, index, progress);
      (window as any).__chemCurrentState = currentSampleRef.current;
    }
  }, [config, states, index, progress]);

  // Main Three.js WebGL Stage Lifecycle
  useEffect(() => {
    if (!config || !states.length || !viewportRef.current || !stageRef.current) return;

    const vp = viewportRef.current;
    const stageEl = stageRef.current;
    vp.replaceChildren();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: false,
      });
    } catch (e: any) {
      setLoadError('Failed to initialize WebGL 3D renderer: ' + e.message);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    vp.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-6, 6, 3, -3, 0.1, 100);
    camera.position.set(0, -0.35, 20);
    camera.lookAt(0, -0.35, 0);

    const root = new THREE.Group();
    scene.add(root);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.62));
    const light = new THREE.DirectionalLight(0xfffdf5, 1.3);
    light.position.set(-4, 7, 9);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -10;
    light.shadow.camera.right = 10;
    light.shadow.camera.top = 8;
    light.shadow.camera.bottom = -8;
    light.shadow.bias = -0.002;
    scene.add(light);
    const fill = new THREE.DirectionalLight(0xe0f2fe, 0.38);
    fill.position.set(7, -2, 5);
    scene.add(fill);

    const sphereGeo = new THREE.SphereGeometry(1, 40, 28);
    const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 16);
    const raycaster = new THREE.Raycaster();

    const meshes = new Map<
      string,
      { mesh: THREE.Mesh; label: THREE.Sprite; dot: THREE.Mesh; element: string }
    >();
    const bonds = new Map<string, THREE.Mesh[]>();

    for (const [id, a] of Object.entries(states[0].atoms)) {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(COLORS[a.element]),
        roughness: 0.36,
        metalness: 0,
        transparent: true,
      });
      const mesh = new THREE.Mesh(sphereGeo, material);
      mesh.scale.setScalar(RADII[a.element]);
      mesh.castShadow = true;
      mesh.userData.id = id;

      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: elementTexture(a.element),
          transparent: true,
          depthTest: true,
          depthWrite: false,
          toneMapped: false,
        })
      );
      label.scale.setScalar(RADII[a.element] * 1.14);

      const dot = new THREE.Mesh(
        sphereGeo,
        new THREE.MeshBasicMaterial({ color: RADICAL_COLOR, transparent: true })
      );
      dot.scale.setScalar(0.075);

      root.add(mesh, label, dot);
      meshes.set(id, { mesh, label, dot, element: a.element });
    }

    // Transition State Quantum Shockwave Mesh (expands on bond break/formation at progress ~ 0.5)
    const shockwaveGeo = new THREE.RingGeometry(0.12, 0.28, 36);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    root.add(shockwaveMesh);

    const allBonds = new Map<string, { atoms: [string, string] }>();
    states.forEach((s) =>
      Object.entries(s.bonds).forEach(([k, b]) => allBonds.set(k, b))
    );
    for (const [k, b] of allBonds) {
      const pair = b.atoms.map(
        (id) =>
          new THREE.Mesh(
            cylinderGeo,
            new THREE.MeshStandardMaterial({
              color: new THREE.Color(COLORS[states[0].atoms[id].element]),
              roughness: 0.5,
              transparent: true,
            })
          )
      );
      pair.forEach((m) => {
        m.castShadow = true;
        root.add(m);
      });
      bonds.set(k, pair);
    }

    let width = 1;
    let height = 1;
    let currentLabelKey = '';
    const labelNodes: { node: HTMLDivElement; inst: StepInstance }[] = [];

    const worldToScreen = (position: [number, number, number]) => {
      const v = new THREE.Vector3(...position);
      root.localToWorld(v);
      v.project(camera);
      return { x: (v.x * 0.5 + 0.5) * width, y: (-0.5 * v.y + 0.5) * height };
    };

    const syncLabels = (stepIdx: number, prog: number) => {
      const labelsContainer = labelsRef.current;
      if (!labelsContainer) return;
      const isReact = [1, 3, 5].includes(stepIdx);
      const phase = isReact && prog < 0.6 ? 'pre' : 'post';
      const key = `${stepIdx}_${phase}`;
      if (key === currentLabelKey) return;
      currentLabelKey = key;

      labelsContainer.replaceChildren();
      labelNodes.length = 0;
      const instances = getStepInstances(config, stepIdx, prog);
      for (const inst of instances) {
        const m = config.molecules[inst.molecule];
        if (!m) continue;
        const n = document.createElement('div');
        n.className = 'molecule-label' + (inst.role === 'context' ? ' context' : '');
        const strong = document.createElement('strong');
        strong.textContent = inst.caption || m.formula;
        const small = document.createElement('small');
        small.textContent = m.name;
        n.append(strong, small);
        labelsContainer.append(n);
        labelNodes.push({ node: n, inst });
      }
    };

    const draw = (state: CompiledState) => {
      const st = useChemStore.getState();
      syncLabels(st.index, st.progress);

      root.rotation.set(rotationRef.current.x, rotationRef.current.y, 0);
      root.updateMatrixWorld(true);
      const inv = root.quaternion.clone().invert();
      const front = new THREE.Vector3(0, 0, 1).applyQuaternion(inv);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(inv);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(inv);

      for (const [id, a] of Object.entries(state.atoms)) {
        const obj = meshes.get(id);
        if (!obj) continue;
        const isContext = a.opacity < 0.5;
        if (isContext && !st.showContext) {
          obj.mesh.visible = false;
          obj.label.visible = false;
          obj.dot.visible = false;
          continue;
        }
        obj.mesh.visible = true;
        obj.label.visible = true;
        const radius = RADII[a.element];
        obj.mesh.position.fromArray(a.position);
        const meshMat = obj.mesh.material as THREE.MeshStandardMaterial;
        meshMat.opacity = a.opacity;
        meshMat.depthWrite = a.opacity > 0.7;
        obj.mesh.castShadow = a.opacity > 0.7;
        meshMat.emissive.setHex(st.selection === id ? SELECTION_EMISSIVE : 0x000000);
        meshMat.emissiveIntensity = 0.35;

        obj.label.position
          .copy(obj.mesh.position)
          .addScaledVector(front, radius + 0.02);
        obj.label.material.opacity = a.opacity;

        obj.dot.position
          .copy(obj.mesh.position)
          .addScaledVector(right, radius * 0.9)
          .addScaledVector(up, radius * 0.9)
          .addScaledVector(front, 0.05);
        const dotMat = obj.dot.material as THREE.MeshBasicMaterial;
        dotMat.opacity = a.radical * a.opacity;
        obj.dot.visible = a.radical > 0.01;
        dotMat.depthWrite = a.opacity > 0.7;
        if (a.radical > 0.01) {
          const pulse = 0.075 * (1 + 0.32 * Math.sin(Date.now() * 0.009));
          obj.dot.scale.setScalar(pulse);
        }
      }

      // Transition State Quantum Burst Shockwave Update
      const tsDelta = Math.abs(st.progress - 0.5);
      if (tsDelta < 0.12) {
        const norm = 1 - tsDelta / 0.12; // 0 -> 1 -> 0
        shockwaveMesh.visible = true;
        const ringScale = 1.0 + (1 - norm) * 4.6;
        shockwaveMesh.scale.set(ringScale, ringScale, ringScale);
        shockwaveMat.opacity = Math.pow(norm, 1.8) * 0.8;
        shockwaveMesh.quaternion.copy(camera.quaternion);

        const primaryAtoms = Object.values(state.atoms).filter((a) => a.opacity > 0.8);
        if (primaryAtoms.length > 0) {
          const avgX = primaryAtoms.reduce((s, a) => s + a.position[0], 0) / primaryAtoms.length;
          const avgY = primaryAtoms.reduce((s, a) => s + a.position[1], 0) / primaryAtoms.length;
          const avgZ = primaryAtoms.reduce((s, a) => s + a.position[2], 0) / primaryAtoms.length;
          shockwaveMesh.position.set(avgX, avgY, avgZ);
        }
      } else {
        shockwaveMesh.visible = false;
      }

      const axis = new THREE.Vector3(0, 1, 0);
      for (const [k, pair] of bonds) {
        const b = state.bonds[k];
        if (!b || b.weight < 0.01 || (b.opacity < 0.5 && !st.showContext)) {
          pair.forEach((m) => (m.visible = false));
          continue;
        }
        const a = new THREE.Vector3(...state.atoms[b.atoms[0]].position);
        const z = new THREE.Vector3(...state.atoms[b.atoms[1]].position);
        const direction = z.clone().sub(a);
        const len = direction.length();
        pair.forEach((m, i) => {
          m.visible = true;
          m.position.copy(a).lerp(z, i === 0 ? 0.25 : 0.75);
          m.quaternion.setFromUnitVectors(axis, direction.clone().normalize());
          m.scale.set(0.065, len / 2, 0.065);
          const mat = m.material as THREE.MeshStandardMaterial;
          mat.opacity = b.weight * b.opacity;
          mat.depthWrite = mat.opacity > 0.8;
          m.castShadow = mat.opacity > 0.8;

          // Transition State / Breaking bond high-energy glow
          if (b.weight > 0.01 && b.weight < 0.92) {
            const glowFactor = Math.sin(b.weight * Math.PI);
            mat.emissive.setHex(0x38bdf8);
            mat.emissiveIntensity = glowFactor * 1.3;
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        });
      }

      root.updateMatrixWorld(true);
      renderer.render(scene, camera);

      for (const { node, inst } of labelNodes) {
        if (inst.role === 'context' && !st.showContext) {
          node.style.display = 'none';
          continue;
        }
        node.style.display = '';
        const positions = Object.values(inst.atomMap).map((id) =>
          worldToScreen(state.atoms[id].position)
        );
        const x = positions.reduce((s, p) => s + p.x, 0) / positions.length;
        const bottom = Math.max(...positions.map((p) => p.y));
        const maxRadius = Math.max(
          ...Object.values(inst.atomMap).map((id) => RADII[state.atoms[id].element])
        );
        const offset = (maxRadius * height) / (camera.top - camera.bottom) + 9;
        node.style.left = Math.max(72, Math.min(width - 72, x)) + 'px';
        node.style.top = Math.min(height - 35, bottom + offset) + 'px';
        node.style.opacity = '1';
      }

      if (lightCueRef.current) {
        lightCueRef.current.style.opacity =
          st.index === 1
            ? String(0.4 + 0.6 * Math.sin(Math.PI * Math.min(st.progress, 1)))
            : '0';
      }
    };

    const resize = () => {
      const rect = stageEl.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      renderer.setSize(width, height);
      const aspect = width / height;
      const halfHeight = Math.max(3.12, 5.85 / aspect) / zoomRef.current;
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      if (currentSampleRef.current) draw(currentSampleRef.current);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(stageEl);
    resize();

    const pointers = new Map<number, { x: number; y: number }>();
    let gesture: { distance: number; zoom: number } | null = null;
    let dragDistance = 0;

    const onPointerDown = (e: PointerEvent) => {
      vp.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragDistance = 0;
      const pts = [...pointers.values()];
      gesture =
        pts.length === 2
          ? {
              distance: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
              zoom: zoomRef.current,
            }
          : null;
    };

    const onPointerMove = (e: PointerEvent) => {
      const old = pointers.get(e.pointerId);
      if (!old) return;
      const dx = e.clientX - old.x;
      const dy = e.clientY - old.y;
      dragDistance += Math.abs(dx) + Math.abs(dy);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && gesture) {
        const p = [...pointers.values()];
        const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        zoomRef.current = Math.max(
          0.7,
          Math.min(2.3, (gesture.zoom * dist) / Math.max(1, gesture.distance))
        );
        resize();
      } else {
        rotationRef.current.y += dx * 0.007;
        rotationRef.current.x = Math.max(
          -1.3,
          Math.min(1.3, rotationRef.current.x + dy * 0.007)
        );
        if (currentSampleRef.current) draw(currentSampleRef.current);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const click = dragDistance < 5 && pointers.size === 1;
      pointers.delete(e.pointerId);
      gesture = null;
      if (click) {
        const rect = vp.getBoundingClientRect();
        raycaster.setFromCamera(
          new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
          ),
          camera
        );
        const hit = raycaster.intersectObjects(
          [...meshes.values()].map((m) => m.mesh)
        );
        useChemStore.getState().setSelection(hit[0]?.object.userData.id || null);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.max(
        0.7,
        Math.min(2.3, zoomRef.current * Math.exp(-e.deltaY * 0.001))
      );
      resize();
    };

    vp.addEventListener('pointerdown', onPointerDown);
    vp.addEventListener('pointermove', onPointerMove);
    vp.addEventListener('pointerup', onPointerUp);
    vp.addEventListener('pointercancel', onPointerUp);
    vp.addEventListener('wheel', onWheel, { passive: false });

    let rafId = 0;
    let lastTime = performance.now();
    let hold = 0;

    const frame = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.08);
      lastTime = timestamp;

      const st = useChemStore.getState();
      if (st.playing && st.config) {
        if (st.progress < 1) {
          const duration = st.config.steps[st.index].transition.duration || 1;
          const nextProg = Math.min(1, st.progress + (dt * st.speed) / duration);
          if (nextProg === 1) {
            hold = 0;
            if (!st.continuous) {
              useChemStore.setState({ progress: 1, playing: false });
            } else {
              useChemStore.setState({ progress: 1 });
            }
          } else {
            useChemStore.setState({ progress: nextProg });
          }
        } else if (st.continuous) {
          hold += dt;
          if (hold >= 1.2) {
            hold = 0;
            if (st.index === 6) {
              st.pause();
            } else {
              useChemStore.setState({
                index: st.index + 1,
                progress: 0,
                selection: null,
              });
            }
          }
        }
      }

      const latest = useChemStore.getState();
      if (latest.config && latest.states.length) {
        const sampled = core.sample(
          latest.config,
          latest.states,
          latest.index,
          latest.progress
        );
        currentSampleRef.current = sampled;
        (window as any).__chemCurrentState = sampled;
        draw(sampled);
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      vp.removeEventListener('pointerdown', onPointerDown);
      vp.removeEventListener('pointermove', onPointerMove);
      vp.removeEventListener('pointerup', onPointerUp);
      vp.removeEventListener('pointercancel', onPointerUp);
      vp.removeEventListener('wheel', onWheel);
      sphereGeo.dispose();
      cylinderGeo.dispose();
      renderer.dispose();
    };
  }, [config, states]);

  if (!config || !states.length) return null;

  const currentStep = config.steps[index];
  const isCurrentSolved = solvedSteps.includes(index);
  const allSolved = solvedSteps.length === 7;
  const sampledState = core.sample(config, states, index, progress);
  const selectedAtom = selection ? sampledState.atoms[selection] : null;

  const handleDeductionSubmit = () => {
    if (!selPhase || !selEq || !selBreak || !selForm) {
      setDeductionFeedback({
        type: 'error',
        text: 'Please select all 4 deduction items before verifying.',
      });
      return;
    }
    const res = deduction.verify(index, {
      phase: selPhase,
      equation: selEq,
      breakBond: selBreak,
      formBond: selForm,
    });
    if (!res.ok) {
      setDeductionFeedback({
        type: 'error',
        text: res.hint || 'Deduction incorrect, please review.',
      });
      return;
    }
    setDeductionFeedback({
      type: 'success',
      text: 'Correct! Playing 3D molecular mechanism animation…',
    });
    markStepSolved(index);
  };

  let playIcon = '↻';
  let playText = 'Replay Step';
  if (playing) {
    playIcon = 'Ⅱ';
    playText = 'Pause';
  } else if (progress < 1) {
    playIcon = '▶';
    playText = 'Resume';
  } else if (allSolved) {
    playIcon = '▶';
    playText = index === 6 ? 'Play from Start' : 'Continuous Play';
  }

  return (
    <div className="stage-screen-shell">
      <div className="app-layout has-fixed-bottom-bar-stage" id="main-stage">
        {/* Left Sidebar: Reaction Steps */}
        <aside className="sidebar" aria-label="Reaction Steps">
          <div className="sidebar-heading">
            <span>Mechanism Steps</span>
          </div>
        <nav id="steps" aria-label="Select Reaction Step">
          {config.steps.map((s, i) => {
            const solved = solvedSteps.includes(i);
            const locked = i > unlockedMaxStep + 1;
            const currentTask = i === unlockedMaxStep + 1;
            return (
              <button
                key={i}
                type="button"
                className={`step-button ${solved ? 'solved' : ''} ${
                  locked ? 'locked' : ''
                } ${currentTask ? 'current-task' : ''}`}
                data-index={i}
                aria-label={`Step ${i + 1}: ${s.title}`}
                aria-current={i === index ? 'step' : undefined}
                onClick={() => go(i, false)}
              >
                <span className="step-num mono">
                  {solved ? '✓' : locked ? '🔒' : String(i + 1).padStart(2, '0')}
                </span>
                <span className="step-text">
                  <span className="step-name">{s.shortTitle}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Center 3D Stage & Playback Transport */}
      <main className="workspace">
        <section className="step-heading" aria-live="polite" aria-atomic="true">
          <h2 id="step-title">{currentStep.title}</h2>
          <p id="step-description">{currentStep.description}</p>
        </section>

        <section
          className="stage"
          id="stage"
          ref={stageRef}
          aria-label="Interactive 3D Reaction Model"
        >
          <div
            id="viewport"
            ref={viewportRef}
            tabIndex={0}
            role="img"
            aria-label={`Step ${index + 1}: ${currentStep.description}. Drag to rotate, scroll to zoom.`}
          />
          <div id="labels" ref={labelsRef} aria-hidden="true" />
          <div className="stage-tools">
            <button
              id="context-toggle"
              type="button"
              className="stage-icon-btn"
              aria-pressed={showContext}
              title={showContext ? 'Hide spectator species' : 'Show spectator species'}
              aria-label="Toggle spectator species"
              onClick={toggleContext}
            >
              {showContext ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button
              id="reset-view"
              type="button"
              className="stage-icon-btn"
              title="Reset camera view"
              aria-label="Reset camera view"
              onClick={triggerResetView}
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="stage-legend">
            <span>
              <i className="element-dot carbon" />C
            </span>
            <span>
              <i className="element-dot hydrogen" />H
            </span>
            <span>
              <i className="element-dot bromine" />
              Br
            </span>
            <span className="radical-legend">
              <b>·</b> Unpaired Electron
            </span>
          </div>

          {/* Real-time Interactive Potential Energy Surface (PES) HUD */}
          <ReactionPESHUD
            progress={progress}
            onSeek={(p) => setProgress(p, true)}
            stageName={currentStep.title}
            eaKj={index === 1 ? 193 : index === 3 ? 75 : index === 5 ? 12 : 2}
            deltaHKj={index === 1 ? 193 : index === 3 ? 67 : index === 5 ? -101 : -350}
          />

          <div id="light-cue" ref={lightCueRef} hidden={index !== 1}>
            <span>hν</span>
            <small>UV Light</small>
          </div>

          <div className="canvas-help-trigger stage-help-corner" id="stage-help-trigger">
            <button
              type="button"
              className="canvas-help-icon-btn"
              title="3D Stage Controls"
              aria-label="3D Stage Controls"
            >
              <HelpCircle size={15} />
            </button>
            <div className="canvas-help-popover">
              <div className="help-popover-title">3D Stage Controls</div>
              <div className="help-popover-item">
                <span className="help-key">Drag</span>
                <span className="help-desc">Rotate 3D model</span>
              </div>
              <div className="help-popover-item">
                <span className="help-key">Wheel</span>
                <span className="help-desc">Zoom in / out</span>
              </div>
              <div className="help-popover-item">
                <span className="help-key">Pan</span>
                <span className="help-desc">Right-drag viewport</span>
              </div>
              <div className="help-popover-item">
                <span className="help-key">Space</span>
                <span className="help-desc">Play / Pause</span>
              </div>
            </div>
          </div>

          {selectedAtom && (
            <div id="atom-detail">
              <strong>
                {selectedAtom.element} · Atom {selection}
              </strong>
              <br />
              <span>
                Coordinates ({selectedAtom.position.map((n) => n.toFixed(3)).join(', ')}) Å
              </span>
              <br />
              <span>
                {selectedAtom.radical > 0.95
                  ? 'Contains an unpaired electron'
                  : progress < 1
                  ? 'In transition'
                  : 'Closed-shell state'}
              </span>
            </div>
          )}

          {loadError && (
            <div id="load-error" className="load-error" role="alert">
              {loadError}
            </div>
          )}
        </section>
      </main>

      {/* Right Sidebar: Mechanism Deduction Panel */}
      <aside className="panel-sidebar" id="panel-sidebar" aria-label="Reaction Mechanism Deduction">
        <div className="panel-header">
          <div className="panel-title-wrap">
            <span className="small-label">STEP ANALYSIS</span>
            <h3>Mechanism Deduction</h3>
          </div>
          <span
            id="deduction-status"
            className={`deduction-status-badge ${
              index === 0 || isCurrentSolved
                ? 'solved'
                : index <= unlockedMaxStep + 1
                ? 'pending'
                : 'locked'
            }`}
          >
            {index === 0
              ? '✓ Observation'
              : isCurrentSolved
              ? '✓ Verified'
              : index <= unlockedMaxStep + 1
              ? 'Pending'
              : '🔒 Locked'}
          </span>
        </div>

        <section className="explanation">
          {showMeasurements && (
            <div id="measurement-strip">
              {progress < 1 ? (
                <span>In transition · View bond lengths & angles after step completes</span>
              ) : (
                (() => {
                  const unique = [
                    ...new Set(
                      currentStep.instances
                        .filter((x) => x.role === 'focus')
                        .map((x) => x.molecule)
                    ),
                  ];
                  const items = unique
                    .map((id) => config.molecules[id])
                    .filter((m) => m && m.measurements.length > 0);
                  if (!items.length) {
                    return <span>Monatomic radicals have no intramolecular bond lengths or angles.</span>;
                  }
                  return items.map((m) => {
                    const q = m.measurements.map((x) => {
                      const n = core.measure(m, x.atoms);
                      return `${x.label} ${n.toFixed(x.atoms.length === 2 ? 3 : 2)}${
                        x.atoms.length === 2 ? ' Å' : '°'
                      }`;
                    });
                    const warn = m.measurements.some(
                      (x) => Math.abs(core.measure(m, x.atoms) - x.value) > x.tolerance
                    );
                    return (
                      <span key={m.formula} className={warn ? 'measure-warning' : ''}>
                        <strong>
                          {m.formula} · {m.geometry}
                        </strong>
                        {q.join(' / ')}
                        {warn ? ' · Check values' : ''}
                      </span>
                    );
                  });
                })()
              )}
            </div>
          )}

          {/* Step Mechanism Deduction Card */}
          {stepData && (
            <div id="deduction-card" className="deduction-card">
              {deductionFeedback && (
                <div
                  id="deduction-feedback"
                  className={`deduction-feedback ${deductionFeedback.type}`}
                >
                  {deductionFeedback.text}
                </div>
              )}

              <div className="deduction-body" id="deduction-body">
                {index === 0 ? (
                  <div className="deduction-summary-box">
                    <div className="summary-box-title">Initial Observation</div>
                    <p className="summary-box-text">{stepData.summary}</p>
                    <div className="summary-box-hint">
                      After observing the initial molecules, click <strong>02</strong> on the left sidebar to begin deducing the reaction mechanism.
                    </div>
                  </div>
                ) : isCurrentSolved ? (
                  <div className="deduction-summary-box solved-box">
                    <div className="summary-box-title">
                      <CheckCircle2 size={16} />
                      <span>Step Conclusion</span>
                    </div>
                    <p className="summary-box-text">{stepData.summary}</p>
                  </div>
                ) : index <= unlockedMaxStep + 1 ? (
                  <div className="deduction-form-list">
                    <div className="deduction-field">
                      <label className="deduction-label" htmlFor="deduce-phase">
                        <span className="deduction-q-num">01</span>
                        <span>Which reaction stage does this step belong to?</span>
                      </label>
                      <CustomSelect
                        id="deduce-phase"
                        value={selPhase}
                        onChange={(val) => setSelPhase(val)}
                        options={stepData.phaseOptions || []}
                        placeholder="Select reaction stage…"
                      />
                    </div>

                    <div className="deduction-field">
                      <label className="deduction-label" htmlFor="deduce-equation">
                        <span className="deduction-q-num">02</span>
                        <span>{stepData.fieldLabel || 'Reaction Equation'}?</span>
                      </label>
                      <CustomSelect
                        id="deduce-equation"
                        value={selEq}
                        onChange={(val) => setSelEq(val)}
                        options={stepData.equationOptions || []}
                        placeholder="Select species change…"
                      />
                    </div>

                    <div className="deduction-field">
                      <label className="deduction-label" htmlFor="deduce-break">
                        <span className="deduction-q-num">03</span>
                        <span>Broken Covalent Bond in this step?</span>
                      </label>
                      <CustomSelect
                        id="deduce-break"
                        value={selBreak}
                        onChange={(val) => setSelBreak(val)}
                        options={stepData.breakBondOptions || []}
                        placeholder="Select broken bond…"
                      />
                    </div>

                    <div className="deduction-field">
                      <label className="deduction-label" htmlFor="deduce-form">
                        <span className="deduction-q-num">04</span>
                        <span>Formed Covalent Bond in this step?</span>
                      </label>
                      <CustomSelect
                        id="deduce-form"
                        value={selForm}
                        onChange={(val) => setSelForm(val)}
                        options={stepData.formBondOptions || []}
                        placeholder="Select formed bond…"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="deduction-summary-box locked-box">
                    <div className="summary-box-title">
                      <Lock size={15} />
                      <span>Locked</span>
                    </div>
                    <p className="summary-box-text">
                      Please complete Step {unlockedMaxStep + 2} deduction first to unlock subsequent steps.
                    </p>
                  </div>
                )}
              </div>

              {!isCurrentSolved && index > 0 && index <= unlockedMaxStep + 1 ? (
                <div className="deduction-action">
                  <button
                    id="deduction-submit-btn"
                    type="button"
                    className="primary-button deduction-btn"
                    onClick={handleDeductionSubmit}
                  >
                    <Sparkles size={16} />
                    <span>Verify Deduction</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}

          <div className="step-note-card" id="step-note-card">
            <div className="note-icon">💡</div>
            <p id="step-note">{currentStep.note}</p>
          </div>
        </section>
      </aside>
      </div>

      {/* Unified Full-Width Fixed Bottom Bar (Matches Step 1 & Step 2 height & layout) */}
      <footer className="fixed-bottom-bar stage-fixed-footer" aria-label="Step Playback & Navigation">
        <div className="fixed-bottom-bar-inner stage-bottom-bar-inner">
          <div className="fixed-bottom-left">
            <button
              id="stage-footer-back-btn"
              type="button"
              className="toolbar-btn-outline"
              title="Return to Step 2 Pathway Assembly"
              onClick={returnToPipeline}
            >
              <ArrowLeft size={17} />
              <span>Previous</span>
            </button>
          </div>

          <div className="stage-bottom-center">
            <div className="transport">
              <button
                id="prev"
                type="button"
                className="icon-button transport-side"
                aria-label="Previous Step"
                title="Previous Step (←)"
                disabled={index === 0}
                onClick={() => go(index - 1, false)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                id="play"
                type="button"
                className="primary-button stage-play-btn"
                disabled={!isCurrentSolved}
                aria-label={playText}
                onClick={play}
              >
                <span id="play-icon" aria-hidden="true">
                  {playIcon}
                </span>
                <span id="play-text">{playText}</span>
              </button>
              <button
                id="next"
                type="button"
                className="icon-button transport-side"
                aria-label="Next Step"
                title="Next Step (→)"
                disabled={index >= 6 || index > unlockedMaxStep}
                onClick={() => go(index + 1, solvedSteps.includes(index + 1))}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="scrub-container">
              <div className="scrub-meta-row">
                <span id="animation-status" className="scrub-status-badge">
                  {playing
                    ? progress === 1
                      ? 'Holding'
                      : 'Playing'
                    : progress < 1
                    ? 'Paused'
                    : index === 6
                    ? 'Completed'
                    : 'Ready'}
                </span>
                <span id="progress-label" className="scrub-pct-badge mono">
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <div className="scrub-slider-row">
                <input
                  id="progress"
                  type="range"
                  min="0"
                  max="1000"
                  value={Math.round(progress * 1000)}
                  disabled={!isCurrentSolved || index === 0}
                  aria-label="Step Animation Progress"
                  onChange={(e) => setProgress(Number(e.target.value) / 1000, true)}
                />
              </div>
            </div>
          </div>

          <div className="fixed-bottom-right play-options">
            <div className="speed-label">
              <span>Speed</span>
              <CustomSelect
                id="speed"
                size="sm"
                className="speed-custom-select"
                ariaLabel="Animation Speed"
                value={String(speed)}
                onChange={(val) => setSpeed(Number(val))}
                options={[
                  { value: '0.5', label: '0.5×' },
                  { value: '1', label: '1×' },
                  { value: '1.5', label: '1.5×' },
                  { value: '2', label: '2×' },
                ]}
              />
            </div>
            <button
              id="restart"
              type="button"
              className="icon-button"
              title="Restart all steps"
              aria-label="Restart all steps"
              onClick={restart}
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
