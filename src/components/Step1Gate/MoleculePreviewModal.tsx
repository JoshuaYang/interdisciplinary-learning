import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as Dialog from '@radix-ui/react-dialog';
import { RotateCcw, X } from 'lucide-react';
import { useChemStore, REQUIRED_SLOTS } from '../../store/useChemStore';
import * as core from '../../engine/core';
import {
  ELEMENT_COLORS as COLORS,
  ELEMENT_RADII as RADII,
  RADICAL_COLOR,
  getElementSpriteTexture as getElementTexture,
} from '../../engine/cpkPalette';

export const MoleculePreviewModal: React.FC = () => {
  const previewSlotId = useChemStore((s) => s.previewSlotId);
  const slotState = useChemStore((s) => s.slotState);
  const setPreviewSlotId = useChemStore((s) => s.setPreviewSlotId);

  const viewportRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const resetFnRef = useRef<(() => void) | null>(null);

  const activeState = previewSlotId ? slotState[previewSlotId] : null;
  const activeSlot = previewSlotId ? REQUIRED_SLOTS.find((s) => s.id === previewSlotId) : null;
  const mol = activeState?.mol;
  const doc = activeState?.doc || {};
  const isOpen = Boolean(previewSlotId && activeState?.status === 'valid' && mol);

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

        const radius = RADII[a.element] || 0.35;
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(COLORS[a.element] || 0x888888),
          roughness: 0.36,
          metalness: 0,
        });
        const mesh = new THREE.Mesh(sphereGeo, mat);
        mesh.scale.setScalar(radius);
        mesh.position.fromArray(pos);

        const label = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: getElementTexture(a.element),
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
              color: new THREE.Color(COLORS[el] || 0x888888),
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

        for (const item of meshItems) {
          item.label.position
            .copy(item.mesh.position)
            .addScaledVector(front, item.radius + 0.02);
          if (item.hasRadical) {
            item.dot.position
              .copy(item.mesh.position)
              .addScaledVector(right, item.radius * 0.9)
              .addScaledVector(up, item.radius * 0.9)
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
      let gesture: { distance: number; zoom: number } | null = null;

      const onPointerDown = (e: PointerEvent) => {
        vp.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const pts = [...pointers.values()];
        gesture =
          pts.length === 2
            ? {
                distance: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
                zoom: zoom.value,
              }
            : null;
      };

      const onPointerMove = (e: PointerEvent) => {
        const old = pointers.get(e.pointerId);
        if (!old) return;
        const dx = e.clientX - old.x;
        const dy = e.clientY - old.y;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2 && gesture) {
          const p = [...pointers.values()];
          const dist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
          zoom.value = Math.max(
            0.65,
            Math.min(2.4, (gesture.zoom * dist) / Math.max(1, gesture.distance))
          );
          resize();
        } else {
          rotation.y += dx * 0.008;
          rotation.x = Math.max(-1.4, Math.min(1.4, rotation.x + dy * 0.008));
          draw();
        }
      };

      const onPointerUp = (e: PointerEvent) => {
        pointers.delete(e.pointerId);
        gesture = null;
      };

      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        zoom.value = Math.max(
          0.65,
          Math.min(2.4, zoom.value * Math.exp(-e.deltaY * 0.001))
        );
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

  if (!isOpen || !mol || !previewSlotId) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && setPreviewSlotId(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="radix-dialog-overlay" />
        <Dialog.Content
          id="molecule-preview-dialog"
          className="radix-dialog-content dialog-surface molecule-preview-dialog"
          aria-describedby={undefined}
        >
          <div className="dialog-header">
            <div>
              <span className="small-label" id="mol-preview-subtitle">
                3D MOLECULAR STRUCTURE PREVIEW · {mol.geometry}
              </span>
              <Dialog.Title asChild>
                <h2 id="mol-preview-title">
                  {activeSlot?.name || mol.name} · {mol.formula || activeSlot?.formula}
                </h2>
              </Dialog.Title>
            </div>
            <div className="mol-preview-header-actions">
              <Dialog.Close asChild>
                <button className="icon-button" aria-label="Close Preview">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="mol-preview-stage-wrap" id="mol-preview-stage-wrap" ref={wrapRef}>
            <div
              id="mol-preview-viewport"
              className="mol-preview-viewport"
              ref={viewportRef}
              tabIndex={0}
              role="img"
              aria-label="3D Ball-and-Stick Model; drag to rotate, scroll to zoom"
            />
            <div className="mol-preview-tools">
              <button
                type="button"
                id="mol-preview-reset"
                className="stage-icon-btn"
                title="Reset camera view"
                aria-label="Reset camera view"
                onClick={() => resetFnRef.current?.()}
              >
                <RotateCcw size={16} />
              </button>
            </div>
            <div className="stage-legend mol-preview-legend">
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
            <div className="stage-hint">Drag to rotate · Scroll to zoom</div>
          </div>

          <div className="mol-preview-info" id="mol-preview-info">
            <div className="mol-spec-grid">
              <div className="mol-spec-item">
                <span className="mol-spec-label">Spatial Geometry</span>
                <strong className="mol-spec-value">{mol.geometry || '-'}</strong>
              </div>
              <div className="mol-spec-item">
                <span className="mol-spec-label">Central Hybridization</span>
                <strong className="mol-spec-value mono">
                  {doc.hybridization && doc.hybridization !== 'none' ? doc.hybridization : 'None'}
                </strong>
              </div>
              <div className="mol-spec-item">
                <span className="mol-spec-label">Atoms / Covalent Bonds</span>
                <strong className="mol-spec-value mono">
                  {mol.atoms.length} Atoms · {mol.bonds.length} Bonds
                </strong>
              </div>
              <div className="mol-spec-item">
                <span className="mol-spec-label">Unpaired Electrons</span>
                <strong className="mol-spec-value">
                  {mol.radicals && mol.radicals.length > 0
                    ? `${mol.radicals.length} (Radical Species)`
                    : '0 (Closed-Shell)'}
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
