import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ChevronDown, Play, RotateCcw, Sparkles } from 'lucide-react';
import { useFreeChemStore } from '../../store/useFreeChemStore';
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
  const setSelection = useFreeChemStore((s) => s.setSelection);
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
        <p>暂未配置反应阶段，请返回第 2 步添加阶段与反应物质。</p>
        <button
          type="button"
          className="primary-button"
          onClick={() => setScreen('pipeline')}
        >
          返回反应阶段编排
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
  let playText = '播放动画';
  if (playing) {
    playIcon = 'Ⅱ';
    playText = '暂停';
  } else if (progress >= 1) {
    playIcon = '↻';
    playText = '重新播放';
  } else if (progress > 0) {
    playIcon = '▶';
    playText = '继续播放';
  }

  const phaseHintText =
    progress < 0.35
      ? '反应前物质相互靠近…'
      : progress < 0.68
      ? '化学键断裂与重组过渡中…'
      : progress < 1
      ? '生成物分子分离定型中…'
      : '当前阶段反应完成';

  return (
    <div className="app-layout" id="free-main-stage">
      {/* 左侧自定义阶段列表（全部直接解锁可点） */}
      <aside className="sidebar" aria-label="自定义反应阶段">
        <div className="sidebar-heading">
          <span>反应阶段 ({compiledStages.length})</span>
          <button
            type="button"
            className="text-button sidebar-return-btn"
            onClick={() => setScreen('pipeline')}
          >
            ‹ 返回编排
          </button>
        </div>
        <nav id="free-steps" aria-label="选择展示阶段">
          {compiledStages.map((st, i) => (
            <button
              key={st.stageId}
              type="button"
              className="step-button solved"
              aria-current={i === stageIndex ? 'step' : undefined}
              onClick={() => goStage(i, true)}
            >
              <span className="step-num mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="step-text">
                <span className="step-name">{st.name}</span>
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 中央三维反应舞台 */}
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
          aria-label="可旋转的三维反应模型"
        >
          <div
            id="free-viewport"
            ref={viewportRef}
            tabIndex={0}
            role="img"
            aria-label={`${currentStage.name} 三维反应模型`}
          />
          <div id="labels" ref={labelsRef} aria-hidden="true" />

          <div className="stage-tools">
            <button
              type="button"
              className="quiet-button"
              onClick={triggerResetView}
            >
              复位视角 <span aria-hidden="true">⤾</span>
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
              <b>·</b> 未成对电子
            </span>
          </div>

          <div className="stage-hint">拖动旋转 · 滚轮缩放</div>

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
                {selectedAtom.radical > 0.5 ? '含未成对电子 (自由基)' : '闭壳层成键状态'}
              </span>
            </div>
          )}

          {loadError && (
            <div className="load-error" role="alert">
              {loadError}
            </div>
          )}
        </section>

        {/* 底部播放控制条 */}
        <footer className="playback">
          <div className="transport">
            <button
              type="button"
              className="text-button footer-back-btn stage-back-btn"
              onClick={() => setScreen('pipeline')}
            >
              ‹ 阶段编排
            </button>
            <button
              type="button"
              className="icon-button transport-side"
              aria-label="上一阶段"
              disabled={stageIndex === 0}
              onClick={() => goStage(stageIndex - 1, true)}
            >
              ‹
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={play}
            >
              <span aria-hidden="true">{playIcon}</span>
              <span>{playText}</span>
            </button>
            <button
              type="button"
              className="icon-button transport-side"
              aria-label="下一阶段"
              disabled={stageIndex >= compiledStages.length - 1}
              onClick={() => goStage(stageIndex + 1, true)}
            >
              ›
            </button>
            <button
              type="button"
              className="text-button replay-button"
              onClick={() => goStage(stageIndex, true)}
            >
              ↻ <span>重播本阶段</span>
            </button>
          </div>

          <div className="scrub-row">
            <span id="animation-status">{phaseHintText}</span>
            <input
              type="range"
              min="0"
              max="1000"
              value={Math.round(progress * 1000)}
              aria-label="当前阶段动画进度"
              onChange={(e) => setProgress(Number(e.target.value) / 1000, true)}
            />
            <span className="mono">{Math.round(progress * 100)}%</span>
          </div>

          <div className="play-options">
            <label className="speed-label">
              <span>速度</span>
              <div className="select-wrapper speed-select-wrapper">
                <select
                  className="speed-select"
                  aria-label="动画速度"
                  value={String(speed)}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                >
                  <option value="0.5">0.5×</option>
                  <option value="1">1×</option>
                  <option value="1.5">1.5×</option>
                  <option value="2">2×</option>
                </select>
                <ChevronDown size={14} className="select-chevron" />
              </div>
            </label>
            <button
              type="button"
              className="text-button"
              onClick={restart}
            >
              重新开始
            </button>
          </div>
        </footer>
      </main>

      {/* 右侧阶段详情与断键/成键变化摘要面板（无需答题） */}
      <aside className="panel-sidebar" aria-label="阶段三维变化摘要">
        <div className="panel-header">
          <div className="panel-title-wrap">
            <span className="small-label">STAGE SUMMARY</span>
            <h3>阶段反应与成键分析</h3>
          </div>
          <span className="deduction-status-badge solved">
            阶段 {stageIndex + 1}/{compiledStages.length}
          </span>
        </div>

        <section className="explanation">
          {/* 1. 当前阶段方程式 */}
          <div className="deduction-card free-summary-card">
            <div className="free-summary-section">
              <span className="free-summary-label">当前阶段反应式</span>
              <div
                className="free-equation-box"
                dangerouslySetInnerHTML={{
                  __html: formatFormulaHtml(currentStage.equationText),
                }}
              />
            </div>

            {/* 2. 断键与成键统计 */}
            <div className="free-bond-stats-grid">
              <div className="free-bond-stat-box broken">
                <span className="stat-title">断裂的共价键</span>
                <strong>
                  {currentStage.brokenBondLabels.length > 0
                    ? currentStage.brokenBondLabels.join('、')
                    : '无共价键断裂'}
                </strong>
              </div>
              <div className="free-bond-stat-box formed">
                <span className="stat-title">生成的共价键</span>
                <strong>
                  {currentStage.formedBondLabels.length > 0
                    ? currentStage.formedBondLabels.join('、')
                    : '无新共价键生成'}
                </strong>
              </div>
            </div>

            {/* 3. 反应前物质清单 */}
            <div className="free-summary-section">
              <span className="free-summary-label">
                反应前物质 ({currentStage.reactantMols.length})
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

            {/* 4. 反应后物质清单 */}
            <div className="free-summary-section">
              <span className="free-summary-label">
                反应后物质 ({currentStage.productMols.length})
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

            <div className="deduction-action">
              <button
                type="button"
                className="primary-button deduction-btn"
                onClick={() => goStage(stageIndex, true)}
              >
                <RotateCcw size={15} />
                <span>重播本阶段结合/分离动画</span>
              </button>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
};
