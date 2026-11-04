import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, HelpCircle, RotateCcw } from 'lucide-react';
import { useFreeChemStore } from '../../store/useFreeChemStore';
import { CustomSelect } from '../Common/CustomSelect';
import {
  formatFormulaHtml,
  sampleFreeStage,
  type FreeSampledFrame,
  type FreeStageLabelInstance,
} from '../../engine/freeReactionEngine';
import {
  RADICAL_COLOR,
  SELECTION_EMISSIVE,
  getElementColor,
  getElementColorHex,
  getElementRadius,
  getElementSpriteTexture,
} from '../../engine/cpkPalette';

export const FreeStageScreen: React.FC = () => {
  const compiledStages = useFreeChemStore((s) => s.compiledStages);
  const stageIndex = useFreeChemStore((s) => s.stageIndex);
  const progress = useFreeChemStore((s) => s.progress);
  const playing = useFreeChemStore((s) => s.playing);
  const speed = useFreeChemStore((s) => s.speed);
  const selection = useFreeChemStore((s) => s.selection);
  const resetCameraTrigger = useFreeChemStore((s) => s.resetCameraTrigger);

  const goStage = useFreeChemStore((s) => s.goStage);
  const play = useFreeChemStore((s) => s.play);
  const restart = useFreeChemStore((s) => s.restart);
  const triggerResetView = useFreeChemStore((s) => s.triggerResetView);
  const setProgress = useFreeChemStore((s) => s.setProgress);
  const setSpeed = useFreeChemStore((s) => s.setSpeed);
  const setScreen = useFreeChemStore((s) => s.setScreen);

  const stageRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const rotationRef = useRef({ x: 0.14, y: 0.16 });
  const zoomRef = useRef(1);
  const currentSampleRef = useRef<FreeSampledFrame | null>(null);

  const currentStage = compiledStages[stageIndex] || compiledStages[0];

  useEffect(() => {
    rotationRef.current = { x: 0.14, y: 0.16 };
    zoomRef.current = 1;
  }, [resetCameraTrigger]);

  // Three.js WebGL lifecycle for the active custom stage
  useEffect(() => {
    if (!currentStage || !viewportRef.current || !stageRef.current) return;

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
    camera.position.set(0, -0.25, 20);
    camera.lookAt(0, -0.25, 0);

    const root = new THREE.Group();
    scene.add(root);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.65));
    const light = new THREE.DirectionalLight(0xfffdf5, 1.3);
    light.position.set(-4, 7, 9);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    scene.add(light);
    const fill = new THREE.DirectionalLight(0xe0f2fe, 0.4);
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

    for (const [id, a] of Object.entries(currentStage.atoms)) {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(getElementColor(a.element)),
        roughness: 0.36,
        metalness: 0,
        transparent: true,
      });
      const mesh = new THREE.Mesh(sphereGeo, material);
      const r = getElementRadius(a.element);
      mesh.scale.setScalar(r);
      mesh.castShadow = true;
      mesh.userData.id = id;

      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: getElementSpriteTexture(a.element),
          transparent: true,
          depthTest: true,
          depthWrite: false,
          toneMapped: false,
        })
      );
      label.scale.setScalar(r * 1.14);

      const dot = new THREE.Mesh(
        sphereGeo,
        new THREE.MeshBasicMaterial({ color: RADICAL_COLOR, transparent: true })
      );
      dot.scale.setScalar(0.075);

      root.add(mesh, label, dot);
      meshes.set(id, { mesh, label, dot, element: a.element });
    }

    for (const [k, b] of Object.entries(currentStage.bonds)) {
      const pair = b.atoms.map(
        (id) =>
          new THREE.Mesh(
            cylinderGeo,
            new THREE.MeshStandardMaterial({
              color: new THREE.Color(getElementColor(currentStage.atoms[id].element)),
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
    let currentLabelPhase = '';
    const labelNodes: { node: HTMLDivElement; inst: FreeStageLabelInstance }[] = [];

    const worldToScreen = (position: [number, number, number]) => {
      const v = new THREE.Vector3(...position);
      root.localToWorld(v);
      v.project(camera);
      return { x: (v.x * 0.5 + 0.5) * width, y: (-0.5 * v.y + 0.5) * height };
    };

    const syncLabels = (prog: number) => {
      const labelsContainer = labelsRef.current;
      if (!labelsContainer) return;
      const phase = prog < 0.52 ? 'pre' : 'post';
      if (phase === currentLabelPhase) return;
      currentLabelPhase = phase;

      labelsContainer.replaceChildren();
      labelNodes.length = 0;
      const list =
        phase === 'pre' ? currentStage.reactantLabels : currentStage.productLabels;
      for (const inst of list) {
        const n = document.createElement('div');
        n.className = 'molecule-label';
        const strong = document.createElement('strong');
        strong.innerHTML = formatFormulaHtml(inst.formula);
        const small = document.createElement('small');
        small.textContent = inst.name;
        n.append(strong, small);
        labelsContainer.append(n);
        labelNodes.push({ node: n, inst });
      }
    };

    const draw = (state: FreeSampledFrame, prog: number) => {
      const st = useFreeChemStore.getState();
      syncLabels(prog);

      root.rotation.set(rotationRef.current.x, rotationRef.current.y, 0);
      root.updateMatrixWorld(true);
      const inv = root.quaternion.clone().invert();
      const front = new THREE.Vector3(0, 0, 1).applyQuaternion(inv);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(inv);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(inv);

      for (const [id, a] of Object.entries(state.atoms)) {
        const obj = meshes.get(id);
        if (!obj) continue;
        if (a.opacity < 0.02) {
          obj.mesh.visible = false;
          obj.label.visible = false;
          obj.dot.visible = false;
          continue;
        }
        obj.mesh.visible = true;
        obj.label.visible = true;
        const radius = getElementRadius(a.element);
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
        obj.dot.visible = a.radical > 0.02 && a.opacity > 0.05;
      }

      const axis = new THREE.Vector3(0, 1, 0);
      for (const [k, pair] of bonds) {
        const b = state.bonds[k];
        if (!b || b.weight < 0.01 || b.opacity < 0.02) {
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
          m.scale.set(0.066, len / 2, 0.066);
          const mat = m.material as THREE.MeshStandardMaterial;
          mat.opacity = b.weight * b.opacity;
          mat.depthWrite = mat.opacity > 0.8;
          m.castShadow = mat.opacity > 0.8;
        });
      }

      root.updateMatrixWorld(true);
      renderer.render(scene, camera);

      for (const { node, inst } of labelNodes) {
        const validIds = inst.atomIds.filter((id) => state.atoms[id]);
        if (!validIds.length) {
          node.style.display = 'none';
          continue;
        }
        node.style.display = '';
        const positions = validIds.map((id) =>
          worldToScreen(state.atoms[id].position)
        );
        const x = positions.reduce((s, p) => s + p.x, 0) / positions.length;
        const bottom = Math.max(...positions.map((p) => p.y));
        const maxRadius = Math.max(
          ...validIds.map((id) => getElementRadius(state.atoms[id].element))
        );
        const offset = (maxRadius * height) / (camera.top - camera.bottom) + 10;
        node.style.left = Math.max(72, Math.min(width - 72, x)) + 'px';
        node.style.top = Math.min(height - 35, bottom + offset) + 'px';
        node.style.opacity = '1';
      }
    };

    const resize = () => {
      const rect = stageEl.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      renderer.setSize(width, height);
      const aspect = width / height;
      const halfHeight = Math.max(3.2, 5.9 / aspect) / zoomRef.current;
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      if (currentSampleRef.current) {
        draw(currentSampleRef.current, useFreeChemStore.getState().progress);
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(stageEl);
    resize();

    const pointers = new Map<number, { x: number; y: number }>();
    let dragDistance = 0;

    const onPointerDown = (e: PointerEvent) => {
      vp.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragDistance = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      const old = pointers.get(e.pointerId);
      if (!old) return;
      const dx = e.clientX - old.x;
      const dy = e.clientY - old.y;
      dragDistance += Math.abs(dx) + Math.abs(dy);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      rotationRef.current.y += dx * 0.007;
      rotationRef.current.x = Math.max(
        -1.3,
        Math.min(1.3, rotationRef.current.x + dy * 0.007)
      );
      if (currentSampleRef.current) {
        draw(currentSampleRef.current, useFreeChemStore.getState().progress);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const click = dragDistance < 5 && pointers.size === 1;
      pointers.delete(e.pointerId);
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
        useFreeChemStore.getState().setSelection(hit[0]?.object.userData.id || null);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.max(
        0.65,
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

      const st = useFreeChemStore.getState();
      const activeStage = st.compiledStages[st.stageIndex];
      if (st.playing && activeStage) {
        if (st.progress < 1) {
          const duration = activeStage.duration || 2.8;
          const nextProg = Math.min(1, st.progress + (dt * st.speed) / duration);
          if (nextProg === 1) {
            hold = 0;
            if (!st.continuous) {
              useFreeChemStore.setState({ progress: 1, playing: false });
            } else {
              useFreeChemStore.setState({ progress: 1 });
            }
          } else {
            useFreeChemStore.setState({ progress: nextProg });
          }
        } else if (st.continuous) {
          hold += dt;
          if (hold >= 1.1) {
            hold = 0;
            if (st.stageIndex >= st.compiledStages.length - 1) {
              st.pause();
            } else {
              useFreeChemStore.setState({
                stageIndex: st.stageIndex + 1,
                progress: 0,
                selection: null,
              });
            }
          }
        }
      }

      const latest = useFreeChemStore.getState();
      const latestStage = latest.compiledStages[latest.stageIndex];
      if (latestStage) {
        const sampled = sampleFreeStage(latestStage, latest.progress);
        currentSampleRef.current = sampled;
        draw(sampled, latest.progress);
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
  }, [currentStage]);

  if (!currentStage) {
    return (
      <div className="free-stage-empty">
        <p>No reaction stages configured yet. Please return to Step 2 to add stages and substances.</p>
        <button
          type="button"
          className="primary-button"
          onClick={() => setScreen('pipeline')}
        >
          Back to Stage Orchestration
        </button>
      </div>
    );
  }

  const sampledFrame = sampleFreeStage(currentStage, progress);
  const selectedAtom = selection ? sampledFrame.atoms[selection] : null;
  const uniqueElements = [
    ...new Set(Object.values(currentStage.atoms).map((a) => a.element)),
  ];

  let playIcon = '▶';
  let playText = 'Play';
  if (playing) {
    playIcon = 'Ⅱ';
    playText = 'Pause';
  } else if (progress >= 1) {
    playIcon = '↻';
    playText = 'Replay';
  } else if (progress > 0) {
    playIcon = '▶';
    playText = 'Resume';
  }

  const phaseHintText =
    progress < 0.35
      ? 'Reactants approaching…'
      : progress < 0.68
      ? 'Bonds breaking & reforming…'
      : progress < 1
      ? 'Products separating…'
      : 'Stage complete';

  return (
    <div className="stage-screen-shell">
      <div className="app-layout has-fixed-bottom-bar-stage" id="free-main-stage">
        {/* Left Sidebar: Custom Reaction Stages (no redundant back button here) */}
        <aside className="sidebar" aria-label="Reaction Stages">
          <div className="sidebar-heading">
            <span>Reaction Stages ({compiledStages.length})</span>
          </div>
          <nav id="free-steps" aria-label="Select Reaction Stage">
            {compiledStages.map((st, i) => {
              const displayStepName = (st.name || '')
                .replace(/^(?:stage|step)\s*\d+[\s:：\-_.]*/i, '')
                .trim() || `Reaction Step ${i + 1}`;
              return (
                <button
                  key={st.stageId}
                  type="button"
                  className="step-button solved"
                  aria-current={i === stageIndex ? 'step' : undefined}
                  onClick={() => goStage(i, true)}
                >
                  <span className="step-num mono">{String(i + 1).padStart(2, '0')}</span>
                  <span className="step-text">
                    <span className="step-name">{displayStepName}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Center 3D Reaction Stage */}
        <main className="workspace">
          <section className="step-heading" aria-live="polite" aria-atomic="true">
            <h2>{currentStage.name}</h2>
            <p
              dangerouslySetInnerHTML={{
                __html: formatFormulaHtml(currentStage.equationText),
              }}
            />
          </section>

          <section
            className="stage"
            ref={stageRef}
            aria-label="Interactive 3D Reaction Stage"
          >
            <div
              id="free-viewport"
              ref={viewportRef}
              tabIndex={0}
              role="img"
              aria-label={`${currentStage.name} 3D Reaction Model`}
            />
            <div id="labels" ref={labelsRef} aria-hidden="true" />

            <div className="stage-tools">
              <button
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
              {uniqueElements.map((el) => (
                <span key={el}>
                  <i
                    className="element-dot"
                    style={{
                      background: getElementColorHex(el),
                      border: el === 'H' ? '1.5px solid #94a3b8' : undefined,
                    }}
                  />
                  {el}
                </span>
              ))}
              <span className="radical-legend">
                <b>·</b> Unpaired Electron
              </span>
            </div>

            <div className="canvas-help-trigger stage-help-corner">
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
                  {selectedAtom.radical > 0.5 ? 'Unpaired Electron (Radical)' : 'Closed-Shell Bonded State'}
                </span>
              </div>
            )}

            {loadError && (
              <div className="load-error" role="alert">
                {loadError}
              </div>
            )}
          </section>
        </main>

        {/* Right Summary Panel: Stage Analysis & Bond Changes (no Stage X/Y badge, no duplicate replay button) */}
        <aside className="panel-sidebar" aria-label="Stage 3D Summary">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <span className="small-label">STAGE SUMMARY</span>
              <h3>Stage Analysis & Bond Changes</h3>
            </div>
          </div>

          <section className="explanation">
            <div className="deduction-card free-summary-card">
              {/* 1. Stage Reaction Equation */}
              <div className="free-summary-section">
                <span className="free-summary-label">Stage Reaction Equation</span>
                <div
                  className="free-equation-box"
                  dangerouslySetInnerHTML={{
                    __html: formatFormulaHtml(currentStage.equationText),
                  }}
                />
              </div>

              {/* 2. Broken & Formed Covalent Bonds */}
              <div className="free-bond-stats-grid">
                <div className="free-bond-stat-box broken">
                  <span className="stat-title">Broken Covalent Bonds</span>
                  <strong>
                    {currentStage.brokenBondLabels.length > 0
                      ? currentStage.brokenBondLabels.join(', ')
                      : 'None'}
                  </strong>
                </div>
                <div className="free-bond-stat-box formed">
                  <span className="stat-title">Formed Covalent Bonds</span>
                  <strong>
                    {currentStage.formedBondLabels.length > 0
                      ? currentStage.formedBondLabels.join(', ')
                      : 'None'}
                  </strong>
                </div>
              </div>

              {/* 3. Reactants List */}
              <div className="free-summary-section">
                <span className="free-summary-label">
                  Reactants ({currentStage.reactantMols.length})
                </span>
                <div className="free-mol-mini-list">
                  {currentStage.reactantMols.map((m, idx) => (
                    <div key={`${m.id}-${idx}`} className="free-mol-mini-item">
                      <strong
                        dangerouslySetInnerHTML={{
                          __html: formatFormulaHtml(m.formula),
                        }}
                      />
                      <span>{m.name}</span>
                      <small>{m.geometry}</small>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Products List */}
              <div className="free-summary-section">
                <span className="free-summary-label">
                  Products ({currentStage.productMols.length})
                </span>
                <div className="free-mol-mini-list">
                  {currentStage.productMols.map((m, idx) => (
                    <div key={`${m.id}-${idx}`} className="free-mol-mini-item">
                      <strong
                        dangerouslySetInnerHTML={{
                          __html: formatFormulaHtml(m.formula),
                        }}
                      />
                      <span>{m.name}</span>
                      <small>{m.geometry}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {/* Unified Full-Width Fixed Bottom Bar (Matches Step 1 & Step 2 height & layout) */}
      <footer className="fixed-bottom-bar stage-fixed-footer" aria-label="Stage Playback & Navigation">
        <div className="fixed-bottom-bar-inner stage-bottom-bar-inner">
          <div className="fixed-bottom-left">
            <button
              type="button"
              className="toolbar-btn-outline"
              onClick={() => setScreen('pipeline')}
            >
              <ArrowLeft size={17} />
              <span>Previous</span>
            </button>
          </div>

          <div className="stage-bottom-center">
            <div className="transport">
              <button
                type="button"
                className="icon-button transport-side"
                title="Previous Stage"
                aria-label="Previous Stage"
                disabled={stageIndex === 0}
                onClick={() => goStage(stageIndex - 1, true)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="primary-button stage-play-btn"
                onClick={play}
              >
                <span aria-hidden="true">{playIcon}</span>
                <span>{playText}</span>
              </button>
              <button
                type="button"
                className="icon-button transport-side"
                title="Next Stage"
                aria-label="Next Stage"
                disabled={stageIndex >= compiledStages.length - 1}
                onClick={() => goStage(stageIndex + 1, true)}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="scrub-container">
              <div className="scrub-meta-row">
                <span id="animation-status" className="scrub-status-badge">
                  {phaseHintText}
                </span>
                <span className="scrub-pct-badge mono">{Math.round(progress * 100)}%</span>
              </div>
              <div className="scrub-slider-row">
                <input
                  type="range"
                  min="0"
                  max="1000"
                  value={Math.round(progress * 1000)}
                  aria-label="Stage Animation Progress"
                  onChange={(e) => setProgress(Number(e.target.value) / 1000, true)}
                />
              </div>
            </div>
          </div>

          <div className="fixed-bottom-right play-options">
            <div className="speed-label">
              <span>Speed</span>
              <CustomSelect
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
              type="button"
              className="icon-button"
              title="Restart all stages from beginning"
              aria-label="Restart all stages"
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
