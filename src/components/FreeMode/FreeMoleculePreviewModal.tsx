import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as Dialog from '@radix-ui/react-dialog';
import { RotateCcw, X } from 'lucide-react';
import { useFreeChemStore } from '../../store/useFreeChemStore';
import * as core from '../../engine/core';
import {
  RADICAL_COLOR,
  getElementColor,
  getElementColorHex,
  getElementRadius,
  getElementSpriteTexture,
} from '../../engine/cpkPalette';

export const FreeMoleculePreviewModal: React.FC = () => {
  const previewMolId = useFreeChemStore((s) => s.previewMolId);
  const molecules = useFreeChemStore((s) => s.molecules);
  const setPreviewMolId = useFreeChemStore((s) => s.setPreviewMolId);

  const viewportRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const resetFnRef = useRef<(() => void) | null>(null);

  const item = previewMolId ? molecules.find((m) => m.id === previewMolId) || null : null;
  const mol = item?.mol;
  const doc = item?.doc || {};
  const isOpen = Boolean(item && mol);

  useEffect(() => {
    if (!isOpen || !mol) return;

    let disposed = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let cleanupEvents: (() => void) | null = null;

    const timer = requestAnimationFrame(() => {
      if (disposed || !viewportRef.current || !wrapRef.current) return;
      const vp = viewportRef.current;
      const wrap = wrapRef.current;
      vp.replaceChildren();

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;
      vp.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-3, 3, 2, -2, 0.1, 100);
      camera.position.set(0, 0, 20);
      camera.lookAt(0, 0, 0);

      const root = new THREE.Group();
      scene.add(root);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.7));
      const dirLight = new THREE.DirectionalLight(0xfffdf5, 1.25);
      dirLight.position.set(-4, 7, 9);
      scene.add(dirLight);
      const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.42);
      fillLight.position.set(7, -2, 5);
      scene.add(fillLight);

      const sphereGeo = new THREE.SphereGeometry(1, 40, 28);
      const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 16);

      const atoms = mol.atoms || [];
      let cx = 0,
        cy = 0,
        cz = 0;
      if (atoms.length > 0) {
        for (const a of atoms) {
          cx += a.position[0];
          cy += a.position[1];
          cz += a.position[2];
        }
        cx /= atoms.length;
        cy /= atoms.length;
        cz /= atoms.length;
      }

      const posMap = new Map<string, [number, number, number]>();
      const elemMap = new Map<string, string>();
      const radicalSet = new Set(mol.radicals || []);
      const meshItems: {
        mesh: THREE.Mesh;
        label: THREE.Sprite;
        dot: THREE.Mesh;
        radius: number;
        hasRadical: boolean;
      }[] = [];

      for (const a of atoms) {
        const pos: [number, number, number] = [
          a.position[0] - cx,
          a.position[1] - cy,
          a.position[2] - cz,
        ];
        posMap.set(a.id, pos);
        elemMap.set(a.id, a.element);

        const radius = getElementRadius(a.element);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(getElementColor(a.element)),
          roughness: 0.36,
          metalness: 0,
        });
        const mesh = new THREE.Mesh(sphereGeo, mat);
        mesh.scale.setScalar(radius);
        mesh.position.fromArray(pos);

        const label = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: getElementSpriteTexture(a.element),
            transparent: true,
            depthTest: true,
            depthWrite: false,
            toneMapped: false,
          })
        );
        label.scale.setScalar(radius * 1.14);

        const hasRadical = radicalSet.has(a.id) || a.radical === 1;
        const dot = new THREE.Mesh(
          sphereGeo,
          new THREE.MeshBasicMaterial({ color: RADICAL_COLOR })
        );
        dot.scale.setScalar(0.08);
        dot.visible = hasRadical;

        root.add(mesh, label, dot);
        meshItems.push({ mesh, label, dot, radius, hasRadical });
      }

      const axis = new THREE.Vector3(0, 1, 0);
      for (const b of mol.bonds || []) {
        const p1 = posMap.get(b.atoms[0]);
        const p2 = posMap.get(b.atoms[1]);
        if (!p1 || !p2) continue;
        const v1 = new THREE.Vector3(...p1);
        const v2 = new THREE.Vector3(...p2);
        const dir = v2.clone().sub(v1);
        const len = dir.length();

        b.atoms.forEach((atomId, idx) => {
          const el = elemMap.get(atomId) || 'C';
          const m = new THREE.Mesh(
            cylinderGeo,
            new THREE.MeshStandardMaterial({
              color: new THREE.Color(getElementColor(el)),
              roughness: 0.5,
            })
          );
          m.position.copy(v1).lerp(v2, idx === 0 ? 0.25 : 0.75);
          m.quaternion.setFromUnitVectors(axis, dir.clone().normalize());
          m.scale.set(0.068, len / 2, 0.068);
          root.add(m);
        });
      }

      const rotation = { x: 0.24, y: 0.42 };
      const zoom = { value: 1 };

      const draw = () => {
        if (!renderer) return;
        root.rotation.set(rotation.x, rotation.y, 0);
        root.updateMatrixWorld(true);
        const inv = root.quaternion.clone().invert();
        const front = new THREE.Vector3(0, 0, 1).applyQuaternion(inv);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(inv);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(inv);

        for (const mItem of meshItems) {
          mItem.label.position
            .copy(mItem.mesh.position)
            .addScaledVector(front, mItem.radius + 0.02);
          if (mItem.hasRadical) {
            mItem.dot.position
              .copy(mItem.mesh.position)
              .addScaledVector(right, mItem.radius * 0.9)
              .addScaledVector(up, mItem.radius * 0.9)
              .addScaledVector(front, 0.05);
          }
        }
        root.updateMatrixWorld(true);
        renderer.render(scene, camera);
      };

      const resize = () => {
        if (!renderer) return;
        const rect = wrap.getBoundingClientRect();
        const w = Math.max(1, rect.width);
        const h = Math.max(1, rect.height);
        renderer.setSize(w, h);
        const aspect = w / h;
        const halfH = Math.max(2.1, 3.2 / aspect) / zoom.value;
        camera.left = -halfH * aspect;
        camera.right = halfH * aspect;
        camera.top = halfH;
        camera.bottom = -halfH;
        camera.updateProjectionMatrix();
        draw();
      };

      resetFnRef.current = () => {
        rotation.x = 0.24;
        rotation.y = 0.42;
        zoom.value = 1;
        resize();
      };

      const pointers = new Map<number, { x: number; y: number }>();
      const onPointerDown = (e: PointerEvent) => {
        vp.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      };
      const onPointerMove = (e: PointerEvent) => {
        const old = pointers.get(e.pointerId);
        if (!old) return;
        const dx = e.clientX - old.x;
        const dy = e.clientY - old.y;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        rotation.y += dx * 0.008;
        rotation.x = Math.max(-1.4, Math.min(1.4, rotation.x + dy * 0.008));
        draw();
      };
      const onPointerUp = (e: PointerEvent) => {
        pointers.delete(e.pointerId);
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        zoom.value = Math.max(0.65, Math.min(2.4, zoom.value * Math.exp(-e.deltaY * 0.001)));
        resize();
      };

      vp.addEventListener('pointerdown', onPointerDown);
      vp.addEventListener('pointermove', onPointerMove);
      vp.addEventListener('pointerup', onPointerUp);
      vp.addEventListener('pointercancel', onPointerUp);
      vp.addEventListener('wheel', onWheel, { passive: false });

      const ro = new ResizeObserver(resize);
      ro.observe(wrap);
      resize();

      cleanupEvents = () => {
        ro.disconnect();
        vp.removeEventListener('pointerdown', onPointerDown);
        vp.removeEventListener('pointermove', onPointerMove);
        vp.removeEventListener('pointerup', onPointerUp);
        vp.removeEventListener('pointercancel', onPointerUp);
        vp.removeEventListener('wheel', onWheel);
        sphereGeo.dispose();
        cylinderGeo.dispose();
        renderer?.dispose();
      };
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(timer);
      cleanupEvents?.();
    };
  }, [isOpen, mol]);

  if (!isOpen || !mol || !item) return null;

  const uniqueElements = [...new Set(mol.atoms.map((a) => a.element))];

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && setPreviewMolId(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="radix-dialog-overlay" />
        <Dialog.Content
          className="radix-dialog-content dialog-surface molecule-preview-dialog"
          aria-describedby={undefined}
        >
          <div className="dialog-header">
            <div>
              <span className="small-label">分子三维结构预览 · {mol.geometry}</span>
              <Dialog.Title asChild>
                <h2>
                  {mol.name} · {mol.formula}
                </h2>
              </Dialog.Title>
            </div>
            <div className="mol-preview-header-actions">
              <Dialog.Close asChild>
                <button className="icon-button" aria-label="关闭预览">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="mol-preview-stage-wrap" ref={wrapRef}>
            <div
              className="mol-preview-viewport"
              ref={viewportRef}
              tabIndex={0}
              role="img"
              aria-label="分子三维球棍模型；拖动旋转，滚轮缩放"
            />
            <div className="mol-preview-tools">
              <button
                type="button"
                className="quiet-button"
                onClick={() => resetFnRef.current?.()}
              >
                复位视角 <RotateCcw size={13} style={{ display: 'inline', marginLeft: 4 }} />
              </button>
            </div>
            <div className="stage-legend mol-preview-legend">
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
              {mol.radicals && mol.radicals.length > 0 && (
                <span className="radical-legend">
                  <b>·</b> 未成对电子
                </span>
              )}
            </div>
            <div className="stage-hint">拖动旋转 · 滚轮缩放</div>
          </div>

          <div className="mol-preview-info">
            <div className="mol-spec-grid">
              <div className="mol-spec-item">
                <span className="mol-spec-label">空间构型</span>
                <strong className="mol-spec-value">{mol.geometry || '-'}</strong>
              </div>
              <div className="mol-spec-item">
                <span className="mol-spec-label">中心原子杂化</span>
                <strong className="mol-spec-value mono">
                  {mol.hybridization && mol.hybridization !== 'none'
                    ? mol.hybridization
                    : '无'}
                </strong>
              </div>
              <div className="mol-spec-item">
                <span className="mol-spec-label">原子总数 / 成键数</span>
                <strong className="mol-spec-value mono">
                  {mol.atoms.length} 原子 · {mol.bonds.length} 共价键
                </strong>
              </div>
              <div className="mol-spec-item">
                <span className="mol-spec-label">未成对电子</span>
                <strong className="mol-spec-value">
                  {mol.radicals && mol.radicals.length > 0
                    ? `${mol.radicals.length} 个（自由基微粒）`
                    : '0（稳定微粒）'}
                </strong>
              </div>
              {Array.isArray(mol.measurements) &&
                mol.measurements.map((q) => {
                  const val = core.measure(mol, q.atoms);
                  const unit = q.atoms.length === 2 ? ' Å' : '°';
                  const formatted = Number.isFinite(val)
                    ? val.toFixed(q.atoms.length === 2 ? 3 : 2)
                    : '';
                  return (
                    <div key={q.label} className="mol-spec-item">
                      <span className="mol-spec-label">{q.label}</span>
                      <strong className="mol-spec-value mono">
                        {formatted}
                        {unit}
                      </strong>
                    </div>
                  );
                })}
            </div>
            {(mol.description || doc.description) && (
              <p className="mol-preview-desc">{mol.description || doc.description}</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
