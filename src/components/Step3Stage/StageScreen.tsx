import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useChemStore } from '../../store/useChemStore';
import * as core from '../../engine/core';
import * as deduction from '../../engine/deduction';
import type { ChemConfig, CompiledState, StepInstance } from '../../types/chem';

const COLORS: Record<string, number> = {
  C: 0x3d5047,
  H: 0xf6f7ed,
  Br: 0x9e382b,
};

const RADII: Record<string, number> = {
  C: 0.36,
  H: 0.245,
  Br: 0.46,
};

const textures = new Map<string, THREE.CanvasTexture>();
function elementTexture(element: string): THREE.CanvasTexture {
  if (textures.has(element)) return textures.get(element)!;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.font = '500 66px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = element === 'C' || element === 'Br' ? '#ffffff' : '#344b29';
  ctx.fillText(element, 64, 66);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  textures.set(element, texture);
  return texture;
}

export function getStepInstances(
  config: ChemConfig | null,
  stepIdx: number,
  prog: number
): StepInstance[] {
  if (!config) return [];
  // 化学反应发生步骤：index 1 (均裂), index 3 (夺氢), index 5 (成键)
  // 反应发生并完成断键成键前 (prog < 0.6)，三维模型处于反应前初始状态，标签应对应起始微粒
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
          caption: 'CH₄ · 尚未反应',
        },
        {
          molecule: 'Br2',
          role: 'context',
          position: [-2.7, -2.4, -0.5],
          rotation: [0, 0, 0],
          atomMap: { br1: 'BrD', br2: 'BrC' },
          caption: '另一分子 Br₂',
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
  const setSelection = useChemStore((s) => s.setSelection);
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

  // Expose current sampled state for window.chemLab diagnostics
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
      setLoadError('无法初始化 WebGL 三维渲染器：' + e.message);
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
    scene.add(new THREE.HemisphereLight(0xffffff, 0x929e82, 0.55));
    const light = new THREE.DirectionalLight(0xfff9e8, 1.3);
    light.position.set(-4, 7, 9);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -10;
    light.shadow.camera.right = 10;
    light.shadow.camera.top = 8;
    light.shadow.camera.bottom = -8;
    light.shadow.bias = -0.002;
    scene.add(light);
    const fill = new THREE.DirectionalLight(0xe1efcf, 0.35);
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
        new THREE.MeshBasicMaterial({ color: 0xaa642c, transparent: true })
      );
      dot.scale.setScalar(0.075);

      root.add(mesh, label, dot);
      meshes.set(id, { mesh, label, dot, element: a.element });
    }

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
        meshMat.emissive.setHex(st.selection === id ? 0x52663a : 0x000000);
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

    // Pointer & Wheel handlers
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

    // 60fps Animation loop using transient store reads
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
        text: '请完整选择全部 4 项推演内容后再进行核验。',
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
        text: res.hint || '推演有误，请重新思考。',
      });
      return;
    }
    setDeductionFeedback({
      type: 'success',
      text: '🎉 推演正确！正在呈现三维分子动态变化…',
    });
    markStepSolved(index);
  };

  let playIcon = '↻';
  let playText = '重播本步';
  if (playing) {
    playIcon = 'Ⅱ';
    playText = '暂停';
  } else if (progress < 1) {
    playIcon = '▶';
    playText = '继续播放';
  } else if (allSolved) {
    playIcon = '▶';
    playText = index === 6 ? '从头播放' : '连续播放';
  }

  return (
    <div className="app-layout" id="main-stage">
      {/* 左侧步骤导航 */}
      <aside className="sidebar" aria-label="反应步骤">
        <div className="sidebar-heading">
          <span>反应过程</span>
          <button
            id="stage-return-pipeline-btn"
            type="button"
            className="text-button sidebar-return-btn"
            title="返回反应链路组装"
            onClick={returnToPipeline}
          >
            ‹ 返回组装
          </button>
        </div>
        <nav id="steps" aria-label="选择展示步骤">
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
                aria-label={`第 ${i + 1} 步：${s.title}`}
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

      {/* 中央三维舞台与播放控制栏 */}
      <main className="workspace">
        <section className="step-heading" aria-live="polite" aria-atomic="true">
          <h2 id="step-title">{currentStep.title}</h2>
          <p id="step-description">{currentStep.description}</p>
        </section>

        <section
          className="stage"
          id="stage"
          ref={stageRef}
          aria-label="可旋转的三维反应模型"
        >
          <div
            id="viewport"
            ref={viewportRef}
            tabIndex={0}
            role="img"
            aria-label={`第 ${index + 1} 步：${currentStep.description} 拖动旋转，滚轮缩放。`}
          />
          <div id="labels" ref={labelsRef} aria-hidden="true" />
          <div className="stage-tools">
            <button
              id="context-toggle"
              type="button"
              className="quiet-button"
              aria-pressed={showContext}
              title="切换背景旁观微粒显示"
              onClick={toggleContext}
            >
              旁观粒子: {showContext ? '开' : '关'}
            </button>
            <button
              id="reset-view"
              type="button"
              className="quiet-button"
              title="恢复模型的默认观察方向"
              onClick={triggerResetView}
            >
              复位视角 <span aria-hidden="true">⤾</span>
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
              <b>·</b> 未成对电子
            </span>
          </div>

          <div id="light-cue" ref={lightCueRef} hidden={index !== 1}>
            <span>hν</span>
            <small>光照</small>
          </div>

          <div className="stage-hint" id="stage-hint">
            拖动旋转 · 滚轮缩放
          </div>

          {selectedAtom && (
            <div id="atom-detail">
              <strong>
                {selectedAtom.element} · 原子 {selection}
              </strong>
              <br />
              <span>
                场景坐标 ({selectedAtom.position.map((n) => n.toFixed(3)).join(', ')}) Å
              </span>
              <br />
              <span>
                {selectedAtom.radical > 0.95
                  ? '含一个未成对电子'
                  : progress < 1
                  ? '反应过渡中'
                  : '无自由基标记'}
              </span>
            </div>
          )}

          {loadError && (
            <div id="load-error" className="load-error" role="alert">
              {loadError}
            </div>
          )}
        </section>

        <footer className="playback">
          <div className="transport">
            <button
              id="stage-footer-back-btn"
              type="button"
              className="text-button footer-back-btn stage-back-btn"
              title="返回第二步组装反应链路"
              onClick={returnToPipeline}
            >
              ‹ 组装链路
            </button>
            <button
              id="prev"
              type="button"
              className="icon-button transport-side"
              aria-label="上一步"
              title="上一步（←）"
              disabled={index === 0}
              onClick={() => go(index - 1, false)}
            >
              ‹
            </button>
            <button
              id="play"
              type="button"
              className="primary-button"
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
              aria-label="下一步"
              title="下一步（→）"
              disabled={index >= 6 || index > unlockedMaxStep}
              onClick={() => go(index + 1, solvedSteps.includes(index + 1))}
            >
              ›
            </button>
            <button
              id="replay"
              type="button"
              className="text-button replay-button"
              title="从当前步骤的起点重播"
              disabled={!isCurrentSolved || index === 0}
              onClick={() => go(index, true)}
            >
              ↻ <span>重播本步</span>
            </button>
          </div>

          <div className="scrub-row">
            <span id="animation-status">
              {playing
                ? progress === 1
                  ? '观察停留'
                  : '正在演示'
                : progress < 1
                ? '已暂停'
                : index === 6
                ? '演示完成'
                : '准备就绪'}
            </span>
            <input
              id="progress"
              type="range"
              min="0"
              max="1000"
              value={Math.round(progress * 1000)}
              disabled={!isCurrentSolved || index === 0}
              aria-label="当前步骤动画进度"
              onChange={(e) => setProgress(Number(e.target.value) / 1000, true)}
            />
            <span id="progress-label" className="mono">
              {Math.round(progress * 100)}%
            </span>
          </div>

          <div className="play-options">
            <label>
              速度{' '}
              <select
                id="speed"
                aria-label="动画速度"
                value={String(speed)}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                <option value="0.5">0.5×</option>
                <option value="1">1×</option>
                <option value="1.5">1.5×</option>
                <option value="2">2×</option>
              </select>
            </label>
            <button
              id="restart"
              type="button"
              className="text-button"
              onClick={restart}
            >
              重新开始
            </button>
          </div>
        </footer>
      </main>

      {/* 右侧机理推演面板 */}
      <aside className="panel-sidebar" id="panel-sidebar" aria-label="反应机理推演">
        <div className="panel-header">
          <div className="panel-title-wrap">
            <span className="small-label">STEP ANALYSIS</span>
            <h3>反应推演与机理</h3>
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
              ? '✓ 初始观察'
              : isCurrentSolved
              ? '✓ 推演已通过'
              : index <= unlockedMaxStep + 1
              ? '待推演'
              : '🔒 未解锁'}
          </span>
        </div>

        <section className="explanation">
          {showMeasurements && (
            <div id="measurement-strip">
              {progress < 1 ? (
                <span>反应过渡中 · 在步骤结束后查看结构的键长与键角</span>
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
                    return <span>单原子自由基没有分子内键长或键角。</span>;
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
                        {warn ? ' · 请核对' : ''}
                      </span>
                    );
                  });
                })()
              )}
            </div>
          )}

          {/* 步骤反应推演交互卡片 */}
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
                    <strong>初始观察：</strong>
                    {stepData.summary}
                    <br />
                    <span
                      style={{
                        color: 'var(--muted)',
                        fontSize: 14,
                        marginTop: 8,
                        display: 'inline-block',
                      }}
                    >
                      👉 观察完毕后，请点击左侧导航栏
                      <strong>「02 光照激发」</strong>开始本步微观反应机理推演。
                    </span>
                  </div>
                ) : isCurrentSolved ? (
                  <div className="deduction-summary-box">
                    <strong>本步推演结论：</strong>
                    {stepData.summary}
                  </div>
                ) : index <= unlockedMaxStep + 1 ? (
                  <>
                    <div className="deduction-field">
                      <label className="deduction-label" htmlFor="deduce-phase">
                        1. 本步属于自由基取代的哪个阶段？
                      </label>
                      <select
                        id="deduce-phase"
                        className="deduction-select"
                        value={selPhase}
                        onChange={(e) => setSelPhase(e.target.value)}
                      >
                        <option value="">-- 请选择阶段 --</option>
                        {stepData.phaseOptions?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="deduction-field">
                      <label className="deduction-label" htmlFor="deduce-equation">
                        2. {stepData.fieldLabel || '微粒变化与反应式'}？
                      </label>
                      <select
                        id="deduce-equation"
                        className="deduction-select"
                        value={selEq}
                        onChange={(e) => setSelEq(e.target.value)}
                      >
                        <option value="">-- 请选择 --</option>
                        {stepData.equationOptions?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="deduction-field">
                      <label className="deduction-label" htmlFor="deduce-break">
                        3. 本步发生断裂的共价键？
                      </label>
                      <select
                        id="deduce-break"
                        className="deduction-select"
                        value={selBreak}
                        onChange={(e) => setSelBreak(e.target.value)}
                      >
                        <option value="">-- 请选择断键 --</option>
                        {stepData.breakBondOptions?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="deduction-field">
                      <label className="deduction-label" htmlFor="deduce-form">
                        4. 本步新生成的共价键？
                      </label>
                      <select
                        id="deduce-form"
                        className="deduction-select"
                        value={selForm}
                        onChange={(e) => setSelForm(e.target.value)}
                      >
                        <option value="">-- 请选择成键 --</option>
                        {stepData.formBondOptions?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div
                    className="deduction-summary-box"
                    style={{
                      background: '#f4f6f1',
                      borderLeftColor: '#a7b4a2',
                      color: '#6d7b69',
                    }}
                  >
                    🔒 <strong>尚未解锁：</strong>请先完成第 {unlockedMaxStep + 2}{' '}
                    步的反应推演，遵循化学反应发生的时序逐步探究。
                  </div>
                )}
              </div>

              {(isCurrentSolved && index > 0) ||
              (!isCurrentSolved && index > 0 && index <= unlockedMaxStep + 1) ? (
                <div className="deduction-action">
                  <button
                    id="deduction-submit-btn"
                    type="button"
                    className="primary-button deduction-btn"
                    onClick={() => {
                      if (isCurrentSolved) {
                        go(index, true);
                      } else {
                        handleDeductionSubmit();
                      }
                    }}
                  >
                    {isCurrentSolved ? '↻ 再次播放本步 3D 动画' : '检验反应推演'}
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
  );
};
