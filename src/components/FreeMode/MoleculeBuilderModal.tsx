import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Atom,
  ChevronDown,
  Download,
  Grid,
  Link2,
  Move,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  ELEMENT_MAP,
  PERIODIC_TABLE,
  RADICAL_COLOR,
  getElementColor,
  getElementColorHex,
  getElementRadius,
  getElementSpriteTexture,
  type ElementCategory,
  type PeriodicElement,
} from '../../engine/cpkPalette';
import {
  GEOMETRY_OPTIONS,
  HYBRIDIZATION_OPTIONS,
  buildUniversalMolecule,
  getCanonicalBondKey,
  getRecommendedBondLength,
  inferFormulaAndName,
  normalizeDocToTopology,
  recommendCenterConfig,
  type TopologyBond,
  type TopologyNode,
} from '../../engine/freeReactionEngine';
import { useFreeChemStore } from '../../store/useFreeChemStore';
import { useChemStore } from '../../store/useChemStore';

const COMMON_SYMBOLS = ['C', 'H', 'Br', 'Cl', 'O', 'N', 'F', 'I', 'S', 'P', 'B', 'Si'];

export const MoleculeBuilderModal: React.FC = () => {
  const builderOpen = useFreeChemStore((s) => s.builderOpen);
  const editingMolId = useFreeChemStore((s) => s.editingMolId);
  const molecules = useFreeChemStore((s) => s.molecules);
  const closeBuilder = useFreeChemStore((s) => s.closeBuilder);
  const saveMoleculeDoc = useFreeChemStore((s) => s.saveMoleculeDoc);
  const showToast = useChemStore((s) => s.showToast);

  const editingItem = useMemo(
    () => (editingMolId ? molecules.find((m) => m.id === editingMolId) || null : null),
    [editingMolId, molecules]
  );

  // Topology graph state
  const [nodes, setNodes] = useState<TopologyNode[]>([]);
  const [bonds, setBonds] = useState<TopologyBond[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedBondId, setSelectedBondId] = useState<string | null>(null);
  const [activeElement, setActiveElement] = useState<string>('C');
  const [canvasTool, setCanvasTool] = useState<'connect' | 'move'>('connect');
  const [showFullPeriodicTable, setShowFullPeriodicTable] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<ElementCategory | 'all'>('all');

  // Form parameter state (starts empty for new molecules until user fills or clicks "一键填入默认值")
  const [name, setName] = useState<string>('');
  const [formula, setFormula] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [geometry, setGeometry] = useState<string>('');
  const [hybridization, setHybridization] = useState<string>('');
  const [bondLengthsInput, setBondLengthsInput] = useState<Record<string, string>>({});
  const [bondAnglesInput, setBondAnglesInput] = useState<Record<string, string>>({});

  // Dragging state on 2D SVG canvas
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragLinkFromId, setDragLinkFromId] = useState<string | null>(null);
  const [dragLinkCursor, setDragLinkCursor] = useState<{ x: number; y: number } | null>(null);
  const dragMovedRef = useRef<boolean>(false);

  // Initialize state when modal opens
  useEffect(() => {
    if (!builderOpen) return;
    if (editingItem) {
      try {
        const topo = normalizeDocToTopology(editingItem.doc);
        // Ensure 2D coordinates exist for all nodes
        const laidOut = topo.nodes.map((n, idx) => {
          if (typeof n.x === 'number' && typeof n.y === 'number') return n;
          const angle = (idx * 2 * Math.PI) / Math.max(1, topo.nodes.length);
          return {
            ...n,
            x: idx === 0 ? 220 : Math.round(220 + 88 * Math.cos(angle)),
            y: idx === 0 ? 150 : Math.round(150 + 88 * Math.sin(angle)),
          };
        });
        setNodes(laidOut);
        setBonds(topo.bonds);
        setName(editingItem.doc.name || editingItem.mol.name || '');
        setFormula(editingItem.doc.formula || editingItem.mol.formula || '');
        setDescription(editingItem.doc.description || editingItem.mol.description || '');
        setGeometry(editingItem.doc.geometry || laidOut[0]?.geometry || '');
        setHybridization(editingItem.doc.hybridization || laidOut[0]?.hybridization || '');

        const lengthsMap: Record<string, string> = {};
        if (editingItem.doc.bondLengths && typeof editingItem.doc.bondLengths === 'object') {
          for (const [k, v] of Object.entries(editingItem.doc.bondLengths)) {
            const parts = k.split('-');
            const canon = parts.length === 2 ? getCanonicalBondKey(parts[0], parts[1]) : k;
            lengthsMap[canon] = String(v);
          }
        }
        topo.bonds.forEach((b) => {
          const n1 = laidOut.find((n) => n.id === b.from);
          const n2 = laidOut.find((n) => n.id === b.to);
          if (n1 && n2 && typeof b.length === 'number') {
            const canon = getCanonicalBondKey(n1.element, n2.element);
            if (!lengthsMap[canon]) lengthsMap[canon] = String(b.length);
          }
        });
        setBondLengthsInput(lengthsMap);

        const anglesMap: Record<string, string> = {};
        const rawAngles = editingItem.doc.bondAngles || laidOut[0]?.bondAngles;
        if (rawAngles && typeof rawAngles === 'object') {
          for (const [k, v] of Object.entries(rawAngles)) {
            if (typeof v === 'number') anglesMap[k] = String(v);
          }
        }
        setBondAnglesInput(anglesMap);
        setSelectedNodeId(laidOut[0]?.id || null);
        setSelectedBondId(null);
      } catch {
        resetEmptyBuilder();
      }
    } else {
      resetEmptyBuilder();
    }
  }, [builderOpen, editingItem]);

  const resetEmptyBuilder = () => {
    setNodes([]);
    setBonds([]);
    setSelectedNodeId(null);
    setSelectedBondId(null);
    setName('');
    setFormula('');
    setDescription('');
    setGeometry('');
    setHybridization('');
    setBondLengthsInput({});
    setBondAnglesInput({});
  };

  // Compute unique bond types & angle keys present in current topology
  const activeBondKeys = useMemo(() => {
    const keys = new Set<string>();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    for (const b of bonds) {
      const n1 = nodeMap.get(b.from);
      const n2 = nodeMap.get(b.to);
      if (n1 && n2) {
        keys.add(getCanonicalBondKey(n1.element, n2.element));
      }
    }
    return [...keys];
  }, [nodes, bonds]);

  const activeAngleKeys = useMemo(() => {
    const keys = new Set<string>();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const adj = new Map<string, string[]>();
    nodes.forEach((n) => adj.set(n.id, []));
    bonds.forEach((b) => {
      if (adj.has(b.from) && adj.has(b.to)) {
        adj.get(b.from)!.push(b.to);
        adj.get(b.to)!.push(b.from);
      }
    });

    for (const n of nodes) {
      const nbs = adj.get(n.id) || [];
      if (nbs.length < 2) continue;
      for (let i = 0; i < nbs.length; i++) {
        for (let j = i + 1; j < nbs.length; j++) {
          const e1 = nodeMap.get(nbs[i])!.element;
          const e2 = nodeMap.get(nbs[j])!.element;
          const pair = [e1, e2].sort((a, b) =>
            a === 'H' ? -1 : b === 'H' ? 1 : a.localeCompare(b)
          );
          keys.add(`${pair[0]}-${n.element}-${pair[1]}`);
        }
      }
    }
    return [...keys];
  }, [nodes, bonds]);

  // Add an atom of `symbol` to the 2D topology canvas
  const addAtomNode = (symbol: string, customPos?: { x: number; y: number }) => {
    setActiveElement(symbol);
    const sameCount = nodes.filter((n) => n.element === symbol).length;
    const newId = `${symbol.toLowerCase()}${sameCount + 1}_${Date.now().toString(36).slice(-2)}`;

    let x = customPos?.x ?? 220;
    let y = customPos?.y ?? 150;
    if (!customPos && nodes.length > 0) {
      const anchor = nodes.find((n) => n.id === selectedNodeId) || nodes[nodes.length - 1];
      const existingNbs = bonds.filter(
        (b) => b.from === anchor.id || b.to === anchor.id
      ).length;
      const angle = (existingNbs * Math.PI) / 2 - Math.PI / 2 + (nodes.length % 3) * 0.25;
      x = Math.max(44, Math.min(410, Math.round((anchor.x ?? 220) + 78 * Math.cos(angle))));
      y = Math.max(44, Math.min(256, Math.round((anchor.y ?? 150) + 78 * Math.sin(angle))));
    }

    const newNode: TopologyNode = {
      id: newId,
      element: symbol,
      radical: 0,
      x,
      y,
    };

    const nextNodes = [...nodes, newNode];
    let nextBonds = [...bonds];

    // If a node is currently selected, automatically connect the newly added atom to it for smooth building!
    if (selectedNodeId && nodes.some((n) => n.id === selectedNodeId)) {
      nextBonds.push({
        id: `b_${selectedNodeId}_${newId}`,
        from: selectedNodeId,
        to: newId,
        order: 1,
      });
    }

    setNodes(nextNodes);
    setBonds(nextBonds);
    if (!selectedNodeId) {
      setSelectedNodeId(newId);
    }
  };

  // Connect or cycle bond between two nodes
  const connectOrToggleBond = (idA: string, idB: string) => {
    if (idA === idB) return;
    const existing = bonds.find(
      (b) => (b.from === idA && b.to === idB) || (b.from === idB && b.to === idA)
    );
    if (existing) {
      // Cycle bond order 1 -> 2 -> 3 -> 1
      const nextOrder = ((existing.order % 3) + 1) as 1 | 2 | 3;
      setBonds(bonds.map((b) => (b.id === existing.id ? { ...b, order: nextOrder } : b)));
      setSelectedBondId(existing.id);
      showToast(`已将化学键切换为 ${nextOrder === 1 ? '单键' : nextOrder === 2 ? '双键' : '三键'}`);
    } else {
      const newBond: TopologyBond = {
        id: `b_${idA}_${idB}_${Date.now().toString(36).slice(-2)}`,
        from: idA,
        to: idB,
        order: 1,
      };
      setBonds([...bonds, newBond]);
      setSelectedBondId(newBond.id);
    }
  };

  // Auto-fill hydrogens for the selected atom based on standard valence
  const autoFillHydrogensForSelected = () => {
    if (!selectedNodeId) return;
    const target = nodes.find((n) => n.id === selectedNodeId);
    if (!target) return;
    const elMeta = ELEMENT_MAP[target.element];
    const maxValence = elMeta?.defaultValence ?? 4;
    const currentBondOrderSum = bonds
      .filter((b) => b.from === target.id || b.to === target.id)
      .reduce((sum, b) => sum + b.order, 0);
    const needed = Math.max(0, maxValence - currentBondOrderSum - target.radical);
    if (needed <= 0) {
      showToast(`${target.element} 当前成键数与未成对电子已达饱和（${maxValence} 价）。`);
      return;
    }

    const newNodes = [...nodes];
    const newBonds = [...bonds];
    const baseCount = nodes.filter((n) => n.element === 'H').length;

    for (let i = 0; i < needed; i++) {
      const hId = `h${baseCount + i + 1}_${Date.now().toString(36).slice(-2)}`;
      const angle = ((currentBondOrderSum + i) * 2 * Math.PI) / Math.max(3, maxValence) - Math.PI / 2;
      newNodes.push({
        id: hId,
        element: 'H',
        radical: 0,
        x: Math.max(36, Math.min(420, Math.round((target.x ?? 220) + 74 * Math.cos(angle)))),
        y: Math.max(36, Math.min(264, Math.round((target.y ?? 150) + 74 * Math.sin(angle)))),
      });
      newBonds.push({
        id: `b_${target.id}_${hId}`,
        from: target.id,
        to: hId,
        order: 1,
      });
    }
    setNodes(newNodes);
    setBonds(newBonds);
    showToast(`已为 ${target.element} 自动补齐 ${needed} 个氢原子 (H)！`);
  };

  // Toggle radical on selected node
  const toggleSelectedNodeRadical = () => {
    if (!selectedNodeId) return;
    setNodes(
      nodes.map((n) =>
        n.id === selectedNodeId ? { ...n, radical: n.radical ? 0 : 1 } : n
      )
    );
  };

  // Delete selected node or bond
  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    const nextNodes = nodes.filter((n) => n.id !== selectedNodeId);
    const nextBonds = bonds.filter(
      (b) => b.from !== selectedNodeId && b.to !== selectedNodeId
    );
    setNodes(nextNodes);
    setBonds(nextBonds);
    setSelectedNodeId(nextNodes[0]?.id || null);
  };

  const deleteSelectedBond = () => {
    if (!selectedBondId) return;
    setBonds(bonds.filter((b) => b.id !== selectedBondId));
    setSelectedBondId(null);
  };

  // ONE-CLICK RECOMMENDED DEFAULTS ("一键填入推荐默认值")
  const handleFillRecommendedDefaults = () => {
    if (nodes.length === 0) {
      showToast('请先在左侧点选元素添加原子到画布中。');
      return;
    }
    const inferred = inferFormulaAndName(nodes, bonds);
    setFormula(inferred.formula);
    setName(inferred.name);
    setDescription(inferred.description);

    // Compute bond lengths for all active bonds
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const nextLengths: Record<string, string> = {};
    for (const b of bonds) {
      const n1 = nodeMap.get(b.from);
      const n2 = nodeMap.get(b.to);
      if (!n1 || !n2) continue;
      const key = getCanonicalBondKey(n1.element, n2.element);
      const recLen = getRecommendedBondLength(n1.element, n2.element, b.order);
      nextLengths[key] = String(recLen);
    }
    setBondLengthsInput(nextLengths);

    // Find primary center atom (highest degree)
    const adj = new Map<string, string[]>();
    nodes.forEach((n) => adj.set(n.id, []));
    bonds.forEach((b) => {
      if (adj.has(b.from) && adj.has(b.to)) {
        adj.get(b.from)!.push(b.to);
        adj.get(b.to)!.push(b.from);
      }
    });

    const sortedCenters = [...nodes].sort(
      (a, b) => (adj.get(b.id)?.length || 0) - (adj.get(a.id)?.length || 0)
    );
    const primaryCenter = sortedCenters[0];
    const primaryNbEls = (adj.get(primaryCenter.id) || []).map(
      (id) => nodeMap.get(id)!.element
    );
    const recCenter = recommendCenterConfig(
      primaryCenter.element,
      primaryNbEls,
      primaryCenter.radical
    );

    setGeometry(recCenter.geometry);
    setHybridization(recCenter.hybridization);

    // Populate all active angle keys
    const nextAngles: Record<string, string> = {};
    for (const [k, v] of Object.entries(recCenter.bondAngles)) {
      nextAngles[k] = String(v);
    }
    for (const ak of activeAngleKeys) {
      if (!nextAngles[ak]) {
        const defOpt = GEOMETRY_OPTIONS.find((g) => g.value === recCenter.geometry);
        nextAngles[ak] = String(defOpt?.defaultAngle || 109.5);
      }
    }
    setBondAnglesInput(nextAngles);
    showToast('✨ 已根据分子拓扑自动填入推荐构型、杂化方式、键长与键角！');
  };

  // Assemble the JSON document from current builder state
  const currentDoc = useMemo(() => {
    if (nodes.length === 0) return null;
    // Check if required geometric parameters are filled
    const missingBondLengths = activeBondKeys.some((k) => {
      const val = Number(bondLengthsInput[k]);
      return !bondLengthsInput[k] || !Number.isFinite(val) || val <= 0;
    });
    const needsGeometry = nodes.length >= 1 && !geometry;
    const missingAngles = activeAngleKeys.some((k) => {
      const val = Number(bondAnglesInput[k]);
      return !bondAnglesInput[k] || !Number.isFinite(val) || val <= 0;
    });

    if (missingBondLengths || needsGeometry || missingAngles) {
      return null;
    }

    const parsedLengths: Record<string, number> = {};
    for (const k of activeBondKeys) {
      parsedLengths[k] = Number(bondLengthsInput[k]);
    }
    const parsedAngles: Record<string, number> = {};
    for (const k of activeAngleKeys) {
      parsedAngles[k] = Number(bondAnglesInput[k]);
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const inferred = inferFormulaAndName(nodes, bonds);
    const finalName = name.trim() || inferred.name;
    const finalFormula = formula.trim() || inferred.formula;
    const finalDesc = description.trim() || inferred.description;

    return {
      name: finalName,
      formula: finalFormula,
      geometry,
      hybridization: hybridization || 'none',
      bondLengths: parsedLengths,
      bondAngles: parsedAngles,
      description: finalDesc,
      nodes: nodes.map((n) => ({
        id: n.id,
        element: n.element,
        radical: n.radical,
        x: n.x,
        y: n.y,
      })),
      bonds: bonds.map((b) => {
        const n1 = nodeMap.get(b.from);
        const n2 = nodeMap.get(b.to);
        const canon = n1 && n2 ? getCanonicalBondKey(n1.element, n2.element) : '';
        return {
          id: b.id,
          from: b.from,
          to: b.to,
          order: b.order,
          length: parsedLengths[canon] || 1.4,
        };
      }),
    };
  }, [
    nodes,
    bonds,
    activeBondKeys,
    activeAngleKeys,
    bondLengthsInput,
    bondAnglesInput,
    geometry,
    hybridization,
    name,
    formula,
    description,
  ]);

  const previewMol = useMemo(() => {
    if (!currentDoc) return null;
    try {
      return buildUniversalMolecule(currentDoc);
    } catch {
      return null;
    }
  }, [currentDoc]);

  // 3D Live Preview Renderer inside the builder
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const previewVpRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!builderOpen || !previewMol || !previewVpRef.current || !previewWrapRef.current) return;
    let disposed = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let cleanup: (() => void) | null = null;

    const timer = requestAnimationFrame(() => {
      if (disposed || !previewVpRef.current || !previewWrapRef.current) return;
      const vp = previewVpRef.current;
      const wrap = previewWrapRef.current;
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
      scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.72));
      const dirLight = new THREE.DirectionalLight(0xfffdf5, 1.25);
      dirLight.position.set(-4, 7, 9);
      scene.add(dirLight);
      const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.42);
      fillLight.position.set(7, -2, 5);
      scene.add(fillLight);

      const sphereGeo = new THREE.SphereGeometry(1, 36, 24);
      const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 16);

      const posMap = new Map<string, [number, number, number]>();
      const elemMap = new Map<string, string>();
      const meshItems: {
        mesh: THREE.Mesh;
        label: THREE.Sprite;
        dot: THREE.Mesh;
        radius: number;
        hasRadical: boolean;
      }[] = [];

      for (const a of previewMol.atoms) {
        posMap.set(a.id, a.position);
        elemMap.set(a.id, a.element);
        const radius = getElementRadius(a.element);
        const mesh = new THREE.Mesh(
          sphereGeo,
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(getElementColor(a.element)),
            roughness: 0.36,
            metalness: 0,
          })
        );
        mesh.scale.setScalar(radius);
        mesh.position.fromArray(a.position);

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

        const hasRadical = a.radical === 1;
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
      for (const b of previewMol.bonds) {
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

      const rotation = { x: 0.25, y: 0.45 };
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
        const halfH = Math.max(2.0, 2.8 / aspect) / zoom.value;
        camera.left = -halfH * aspect;
        camera.right = halfH * aspect;
        camera.top = halfH;
        camera.bottom = -halfH;
        camera.updateProjectionMatrix();
        draw();
      };

      let isDragging = false;
      let lastPos = { x: 0, y: 0 };
      const onDown = (e: PointerEvent) => {
        vp.setPointerCapture(e.pointerId);
        isDragging = true;
        lastPos = { x: e.clientX, y: e.clientY };
      };
      const onMove = (e: PointerEvent) => {
        if (!isDragging) return;
        rotation.y += (e.clientX - lastPos.x) * 0.009;
        rotation.x = Math.max(-1.4, Math.min(1.4, rotation.x + (e.clientY - lastPos.y) * 0.009));
        lastPos = { x: e.clientX, y: e.clientY };
        draw();
      };
      const onUp = () => {
        isDragging = false;
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        zoom.value = Math.max(0.6, Math.min(2.2, zoom.value * Math.exp(-e.deltaY * 0.001)));
        resize();
      };

      vp.addEventListener('pointerdown', onDown);
      vp.addEventListener('pointermove', onMove);
      vp.addEventListener('pointerup', onUp);
      vp.addEventListener('wheel', onWheel, { passive: false });

      const ro = new ResizeObserver(resize);
      ro.observe(wrap);
      resize();

      cleanup = () => {
        ro.disconnect();
        vp.removeEventListener('pointerdown', onDown);
        vp.removeEventListener('pointermove', onMove);
        vp.removeEventListener('pointerup', onUp);
        vp.removeEventListener('wheel', onWheel);
        sphereGeo.dispose();
        cylinderGeo.dispose();
        renderer?.dispose();
      };
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(timer);
      cleanup?.();
    };
  }, [builderOpen, previewMol]);

  // Export JSON file
  const handleExportJson = () => {
    if (!currentDoc) {
      showToast('请先完成参数配置（或点击「一键填入推荐默认值」）后再导出 JSON。');
      return;
    }
    const blob = new Blob([JSON.stringify(currentDoc, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDoc.formula || 'molecule'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`已导出配置文件 ${currentDoc.formula || 'molecule'}.json`);
  };

  // Save to store
  const handleSaveMolecule = () => {
    if (nodes.length === 0) {
      showToast('请先在画布中添加至少 1 个元素原子。');
      return;
    }
    if (!currentDoc) {
      showToast('请填写右侧的键长、空间构型与键角参数，或点击「一键填入推荐默认值」。');
      return;
    }
    const saved = saveMoleculeDoc(currentDoc, editingMolId);
    showToast(
      editingMolId
        ? `已更新分子「${saved.mol.name} (${saved.mol.formula})」`
        : `已创建分子「${saved.mol.name} (${saved.mol.formula})」`
    );
    closeBuilder();
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedBond = bonds.find((b) => b.id === selectedBondId) || null;

  return (
    <Dialog.Root open={builderOpen} onOpenChange={(open) => !open && closeBuilder()}>
      <Dialog.Portal>
        <Dialog.Overlay className="radix-dialog-overlay" />
        <Dialog.Content
          className="radix-dialog-content dialog-surface mol-builder-dialog"
          aria-describedby={undefined}
        >
          {/* 顶部栏 */}
          <div className="dialog-header mol-builder-header">
            <div>
              <span className="small-label">INTERACTIVE MOLECULE BUILDER · 分子结构构建工作台</span>
              <Dialog.Title asChild>
                <h2>{editingMolId ? '编辑分子结构与参数' : '交互式构建新分子'}</h2>
              </Dialog.Title>
            </div>
            <div className="mol-builder-header-actions">
              <button
                type="button"
                className="text-button top-action-btn"
                onClick={handleExportJson}
                title="将当前分子配置导出为 JSON 文件"
              >
                <Download size={15} />
                <span>导出 JSON</span>
              </button>
              <Dialog.Close asChild>
                <button className="icon-button" aria-label="关闭构建器">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="mol-builder-body">
            {/* 第 1 部分：元素周期表选择面板 */}
            <div className="builder-periodic-section">
              <div className="builder-section-bar">
                <div className="builder-section-title">
                  <Atom size={16} />
                  <strong>1. 点击周期表元素添加原子</strong>
                  <span className="builder-hint-pill">
                    选中画布中的原子再点元素，将自动成键连接
                  </span>
                </div>
                <div className="builder-periodic-controls">
                  <div className="quick-elements-row">
                    <span className="quick-label">高频：</span>
                    {COMMON_SYMBOLS.map((sym) => {
                      const el = ELEMENT_MAP[sym];
                      return (
                        <button
                          key={sym}
                          type="button"
                          className={`quick-el-btn ${activeElement === sym ? 'active' : ''}`}
                          onClick={() => addAtomNode(sym)}
                          title={`点击向画布添加 ${el?.name || sym} (${sym})`}
                        >
                          <i
                            className="quick-el-dot"
                            style={{ background: getElementColorHex(sym) }}
                          />
                          <strong>{sym}</strong>
                          <small>{el?.name}</small>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="quiet-button ptable-toggle-btn"
                    onClick={() => setShowFullPeriodicTable((v) => !v)}
                  >
                    <Grid size={13} />
                    <span>{showFullPeriodicTable ? '收起全周期表' : '展开全周期表 (118 元素)'}</span>
                  </button>
                </div>
              </div>

              {showFullPeriodicTable && (
                <div className="ptable-wrapper">
                  <div className="ptable-category-bar">
                    <button
                      type="button"
                      className={`ptable-cat-chip ${categoryFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setCategoryFilter('all')}
                    >
                      全部 (118)
                    </button>
                    {(Object.entries(CATEGORY_LABELS) as [ElementCategory, string][]).map(
                      ([cat, label]) => (
                        <button
                          key={cat}
                          type="button"
                          className={`ptable-cat-chip cat-${cat} ${
                            categoryFilter === cat ? 'active' : ''
                          }`}
                          onClick={() =>
                            setCategoryFilter(categoryFilter === cat ? 'all' : cat)
                          }
                        >
                          {label}
                        </button>
                      )
                    )}
                  </div>

                  {/* 18-Column Standard Periodic Table Grid */}
                  <div className="ptable-grid" role="grid" aria-label="全周期元素周期表">
                    {PERIODIC_TABLE.map((el: PeriodicElement) => {
                      const dimmed =
                        categoryFilter !== 'all' && el.category !== categoryFilter;
                      const gridRow = el.period <= 7 ? el.period : el.period + 1;
                      const gridColumn = el.group;
                      return (
                        <button
                          key={el.number}
                          type="button"
                          className={`ptable-cell cat-${el.category} ${
                            activeElement === el.symbol ? 'selected' : ''
                          } ${dimmed ? 'dimmed' : ''}`}
                          style={{ gridRow, gridColumn }}
                          title={`${el.number} ${el.name} (${el.symbol}) · 点击添加至分子画布`}
                          onClick={() => addAtomNode(el.symbol)}
                        >
                          <span className="pt-num">{el.number}</span>
                          <strong className="pt-sym">{el.symbol}</strong>
                          <span className="pt-name">{el.name}</span>
                        </button>
                      );
                    })}
                    <div
                      className="ptable-series-placeholder"
                      style={{ gridRow: 6, gridColumn: 3 }}
                    >
                      57-71
                      <small>镧系</small>
                    </div>
                    <div
                      className="ptable-series-placeholder"
                      style={{ gridRow: 7, gridColumn: 3 }}
                    >
                      89-103
                      <small>锕系</small>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 第 2 部分：下方左右双栏（左：2D 拓扑连接画布 + 3D 实时预览；右：参数配置面板） */}
            <div className="builder-main-columns">
              {/* 左栏：2D 拓扑画布与 3D 实时预览 */}
              <div className="builder-visual-col">
                <div className="builder-canvas-card">
                  <div className="builder-canvas-toolbar">
                    <div className="canvas-tool-group">
                      <button
                        type="button"
                        className={`canvas-tool-btn ${canvasTool === 'connect' ? 'active' : ''}`}
                        onClick={() => setCanvasTool('connect')}
                        title="从一个原子拖拽到另一个原子即可连键（也可直接拖动原子调整位置）"
                      >
                        <Link2 size={14} />
                        <span>连键 / 选择</span>
                      </button>
                      <button
                        type="button"
                        className={`canvas-tool-btn ${canvasTool === 'move' ? 'active' : ''}`}
                        onClick={() => setCanvasTool('move')}
                        title="仅拖动调整原子在 2D 画布上的位置"
                      >
                        <Move size={14} />
                        <span>移动排布</span>
                      </button>
                    </div>

                    {selectedNode && (
                      <div className="canvas-node-actions">
                        <span className="selected-node-badge">
                          已选: <strong>{selectedNode.element}</strong> ({selectedNode.id})
                        </span>
                        <button
                          type="button"
                          className="canvas-mini-btn"
                          onClick={autoFillHydrogensForSelected}
                          title="按标准价态为当前选中原子一键补齐氢原子"
                        >
                          <Plus size={12} />
                          <span>一键补氢</span>
                        </button>
                        <button
                          type="button"
                          className={`canvas-mini-btn ${selectedNode.radical ? 'is-radical' : ''}`}
                          onClick={toggleSelectedNodeRadical}
                          title="切换未成对电子（自由基 · 标记）"
                        >
                          <span>· 自由基: {selectedNode.radical ? '有' : '无'}</span>
                        </button>
                        <button
                          type="button"
                          className="canvas-mini-btn danger"
                          onClick={deleteSelectedNode}
                          title="删除当前选中的原子"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}

                    {selectedBond && !selectedNode && (
                      <div className="canvas-node-actions">
                        <span className="selected-node-badge">
                          已选化学键 ({selectedBond.order} 键)
                        </span>
                        <button
                          type="button"
                          className="canvas-mini-btn"
                          onClick={() =>
                            connectOrToggleBond(selectedBond.from, selectedBond.to)
                          }
                        >
                          切换单/双/三键
                        </button>
                        <button
                          type="button"
                          className="canvas-mini-btn danger"
                          onClick={deleteSelectedBond}
                        >
                          <Trash2 size={12} />
                          <span>断开此键</span>
                        </button>
                      </div>
                    )}

                    {nodes.length > 0 && (
                      <button
                        type="button"
                        className="canvas-mini-btn quiet"
                        onClick={resetEmptyBuilder}
                        title="清空画布重新搭建"
                      >
                        <RotateCcw size={12} />
                        <span>清空</span>
                      </button>
                    )}
                  </div>

                  {/* 2D 交互式拓扑画布 */}
                  <div className="topology-canvas-wrap">
                    <svg
                      ref={svgRef}
                      className="topology-svg"
                      viewBox="0 0 440 280"
                      onPointerMove={(e) => {
                        if (!svgRef.current) return;
                        const rect = svgRef.current.getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / rect.width) * 440;
                        const y = ((e.clientY - rect.top) / rect.height) * 280;
                        if (draggingNodeId) {
                          dragMovedRef.current = true;
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === draggingNodeId
                                ? {
                                    ...n,
                                    x: Math.max(28, Math.min(412, Math.round(x))),
                                    y: Math.max(28, Math.min(252, Math.round(y))),
                                  }
                                : n
                            )
                          );
                        } else if (dragLinkFromId) {
                          setDragLinkCursor({ x, y });
                        }
                      }}
                      onPointerUp={() => {
                        setDraggingNodeId(null);
                        setDragLinkFromId(null);
                        setDragLinkCursor(null);
                      }}
                      onClick={(e) => {
                        if (e.target === svgRef.current) {
                          setSelectedBondId(null);
                        }
                      }}
                    >
                      {/* Grid background */}
                      <defs>
                        <pattern
                          id="builder-grid"
                          width="22"
                          height="22"
                          patternUnits="userSpaceOnUse"
                        >
                          <circle cx="2" cy="2" r="1" fill="#cbd5e1" opacity="0.65" />
                        </pattern>
                      </defs>
                      <rect width="440" height="280" fill="url(#builder-grid)" />

                      {/* Temporary drag-to-connect line */}
                      {dragLinkFromId &&
                        dragLinkCursor &&
                        (() => {
                          const src = nodes.find((n) => n.id === dragLinkFromId);
                          if (!src) return null;
                          return (
                            <line
                              x1={src.x ?? 220}
                              y1={src.y ?? 140}
                              x2={dragLinkCursor.x}
                              y2={dragLinkCursor.y}
                              stroke="#2563eb"
                              strokeWidth="2.5"
                              strokeDasharray="5 4"
                            />
                          );
                        })()}

                      {/* Render Bonds */}
                      {bonds.map((b) => {
                        const n1 = nodes.find((n) => n.id === b.from);
                        const n2 = nodes.find((n) => n.id === b.to);
                        if (!n1 || !n2) return null;
                        const x1 = n1.x ?? 220;
                        const y1 = n1.y ?? 140;
                        const x2 = n2.x ?? 220;
                        const y2 = n2.y ?? 140;
                        const mx = (x1 + x2) / 2;
                        const my = (y1 + y2) / 2;
                        const dx = x2 - x1;
                        const dy = y2 - y1;
                        const len = Math.hypot(dx, dy) || 1;
                        const nx = (-dy / len) * 4.2;
                        const ny = (dx / len) * 4.2;
                        const canonKey = getCanonicalBondKey(n1.element, n2.element);
                        const lenVal = bondLengthsInput[canonKey];
                        const isSelected = selectedBondId === b.id;

                        return (
                          <g
                            key={b.id}
                            className={`topo-bond-group ${isSelected ? 'selected' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBondId(b.id);
                              setSelectedNodeId(null);
                            }}
                          >
                            {/* Wide invisible hit target */}
                            <line
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke="transparent"
                              strokeWidth="14"
                            />
                            {b.order === 1 && (
                              <line
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke={isSelected ? '#2563eb' : '#64748b'}
                                strokeWidth={isSelected ? '4' : '3'}
                              />
                            )}
                            {b.order === 2 && (
                              <>
                                <line
                                  x1={x1 + nx}
                                  y1={y1 + ny}
                                  x2={x2 + nx}
                                  y2={y2 + ny}
                                  stroke={isSelected ? '#2563eb' : '#64748b'}
                                  strokeWidth="2.6"
                                />
                                <line
                                  x1={x1 - nx}
                                  y1={y1 - ny}
                                  x2={x2 - nx}
                                  y2={y2 - ny}
                                  stroke={isSelected ? '#2563eb' : '#64748b'}
                                  strokeWidth="2.6"
                                />
                              </>
                            )}
                            {b.order === 3 && (
                              <>
                                <line
                                  x1={x1}
                                  y1={y1}
                                  x2={x2}
                                  y2={y2}
                                  stroke={isSelected ? '#2563eb' : '#64748b'}
                                  strokeWidth="2.4"
                                />
                                <line
                                  x1={x1 + nx * 1.4}
                                  y1={y1 + ny * 1.4}
                                  x2={x2 + nx * 1.4}
                                  y2={y2 + ny * 1.4}
                                  stroke={isSelected ? '#2563eb' : '#64748b'}
                                  strokeWidth="2.2"
                                />
                                <line
                                  x1={x1 - nx * 1.4}
                                  y1={y1 - ny * 1.4}
                                  x2={x2 - nx * 1.4}
                                  y2={y2 - ny * 1.4}
                                  stroke={isSelected ? '#2563eb' : '#64748b'}
                                  strokeWidth="2.2"
                                />
                              </>
                            )}
                            {/* Bond length pill on midpoint */}
                            <rect
                              x={mx - 22}
                              y={my - 9}
                              width="44"
                              height="18"
                              rx="6"
                              fill={lenVal ? '#ffffff' : '#fef3c7'}
                              stroke={isSelected ? '#2563eb' : '#cbd5e1'}
                              strokeWidth="1"
                            />
                            <text
                              x={mx}
                              y={my + 3.5}
                              textAnchor="middle"
                              fontSize="9.5"
                              fontWeight="600"
                              fill={lenVal ? '#334155' : '#b45309'}
                            >
                              {lenVal ? `${lenVal}Å` : '待填'}
                            </text>
                          </g>
                        );
                      })}

                      {/* Render Atom Nodes */}
                      {nodes.map((n) => {
                        const x = n.x ?? 220;
                        const y = n.y ?? 140;
                        const isSelected = selectedNodeId === n.id;
                        const bgHex = getElementColorHex(n.element);
                        const isLight = ['H', 'He', 'Be', 'B', 'Ne'].includes(n.element);
                        const r = n.element === 'H' ? 17 : 22;

                        return (
                          <g
                            key={n.id}
                            className={`topo-node-group ${isSelected ? 'selected' : ''}`}
                            transform={`translate(${x}, ${y})`}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              dragMovedRef.current = false;
                              if (canvasTool === 'move' || e.shiftKey) {
                                setDraggingNodeId(n.id);
                                setSelectedNodeId(n.id);
                                setSelectedBondId(null);
                              } else {
                                setDragLinkFromId(n.id);
                                setDragLinkCursor({ x, y });
                              }
                            }}
                            onPointerUp={(e) => {
                              e.stopPropagation();
                              if (dragLinkFromId && dragLinkFromId !== n.id) {
                                connectOrToggleBond(dragLinkFromId, n.id);
                                setSelectedNodeId(n.id);
                              } else if (!dragMovedRef.current) {
                                // If clicking another node while one is selected in connect mode, allow quick shift-click or direct select
                                setSelectedNodeId(n.id);
                                setSelectedBondId(null);
                              }
                              setDraggingNodeId(null);
                              setDragLinkFromId(null);
                              setDragLinkCursor(null);
                            }}
                          >
                            {isSelected && (
                              <circle
                                r={r + 5}
                                fill="none"
                                stroke="#2563eb"
                                strokeWidth="2.5"
                                strokeDasharray="3 2"
                              />
                            )}
                            <circle
                              r={r}
                              fill={bgHex}
                              stroke={isSelected ? '#2563eb' : '#475569'}
                              strokeWidth={isSelected ? '2.2' : '1.4'}
                            />
                            <text
                              y="4.5"
                              textAnchor="middle"
                              fontSize={n.element === 'H' ? '12.5' : '14'}
                              fontWeight="700"
                              fill={isLight ? '#1e293b' : '#ffffff'}
                              style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                              {n.element}
                            </text>
                            {n.radical === 1 && (
                              <circle
                                cx={r * 0.75}
                                cy={-r * 0.75}
                                r="5"
                                fill="#ea580c"
                                stroke="#ffffff"
                                strokeWidth="1.5"
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {nodes.length === 0 && (
                      <div className="topology-empty-overlay">
                        <Atom size={28} />
                        <strong>画布为空 · 请点击上方元素周期表添加原子</strong>
                        <span>
                          添加原子后，从一个原子拖动到另一个原子即可连成共价键，或使用「一键补氢」快速构建分子。
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="topology-footer-tip">
                    <span>💡 操作提示：从一个原子拖向另一个原子即可连键；点击已有化学键可切换单/双/三键或断开。</span>
                  </div>
                </div>

                {/* 实时 3D 球棍预览区 */}
                <div className="builder-3d-card" ref={previewWrapRef}>
                  <div className="builder-3d-header">
                    <span>实时 3D 结构预览</span>
                    {previewMol && (
                      <span className="builder-3d-meta">
                        {previewMol.name} · {previewMol.geometry}
                      </span>
                    )}
                  </div>
                  {previewMol ? (
                    <div
                      ref={previewVpRef}
                      className="builder-3d-viewport"
                      role="img"
                      aria-label="实时三维分子预览"
                    />
                  ) : (
                    <div className="builder-3d-placeholder">
                      <Sparkles size={22} />
                      <p>
                        {nodes.length === 0
                          ? '添加原子并配置参数后，此处将实时生成 3D 分子结构'
                          : '请填写右侧的键长、空间构型与键角，或点击右上角「✨ 一键填入推荐默认值」立即生成 3D 模型'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 右栏：参数配置表单（默认留空 + 一键填入推荐默认值按钮） */}
              <div className="builder-params-col">
                <div className="builder-params-top">
                  <div>
                    <h3>2. 结构与化学键参数配置</h3>
                    <p>根据拓扑结构填写参数，或一键填入标准推荐值</p>
                  </div>
                  <button
                    type="button"
                    id="builder-autofill-defaults-btn"
                    className="autofill-defaults-btn"
                    onClick={handleFillRecommendedDefaults}
                  >
                    <Sparkles size={15} />
                    <span>一键填入推荐默认值</span>
                  </button>
                </div>

                <div className="builder-params-scroll">
                  {/* 基本标识信息 */}
                  <div className="param-group-card">
                    <div className="param-group-title">基本标识信息</div>
                    <div className="param-grid-2">
                      <label className="param-field">
                        <span>化学式 (formula)</span>
                        <input
                          type="text"
                          placeholder="如 CH4、CH3·、CH3CH3"
                          value={formula}
                          onChange={(e) => setFormula(e.target.value)}
                        />
                      </label>
                      <label className="param-field">
                        <span>中文名称 (name)</span>
                        <input
                          type="text"
                          placeholder="如 甲烷、甲基自由基"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </label>
                    </div>
                    <label className="param-field">
                      <span>微粒描述 (description · 选填)</span>
                      <input
                        type="text"
                        placeholder="简要描述该分子或自由基的结构特性…"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </label>
                  </div>

                  {/* 空间构型与杂化 */}
                  <div className="param-group-card">
                    <div className="param-group-title">空间构型与中心杂化</div>
                    <div className="param-grid-2">
                      <label className="param-field">
                        <span>空间构型 (geometry) *</span>
                        <div className="select-wrapper">
                          <select
                            value={geometry}
                            onChange={(e) => setGeometry(e.target.value)}
                          >
                            <option value="">请选择空间构型…</option>
                            {GEOMETRY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={15} className="select-chevron" />
                        </div>
                      </label>

                      <label className="param-field">
                        <span>中心杂化方式 (hybridization)</span>
                        <div className="select-wrapper">
                          <select
                            value={hybridization}
                            onChange={(e) => setHybridization(e.target.value)}
                          >
                            <option value="">请选择杂化类型…</option>
                            {HYBRIDIZATION_OPTIONS.map((h) => (
                              <option key={h} value={h}>
                                {h === 'none' ? '无 (none)' : h}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={15} className="select-chevron" />
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* 共价键键长 (Å) */}
                  <div className="param-group-card">
                    <div className="param-group-title">
                      <span>共价键长 (bondLengths · 单位 Å) *</span>
                    </div>
                    {activeBondKeys.length === 0 ? (
                      <div className="param-empty-hint">
                        {nodes.length <= 1
                          ? '单原子微粒无分子内共价键，无需填写键长。'
                          : '请先在左侧画布中将原子连线成键。'}
                      </div>
                    ) : (
                      <div className="param-grid-2">
                        {activeBondKeys.map((k) => (
                          <label key={k} className="param-field">
                            <span className="mono">{k} 键长 (Å)</span>
                            <input
                              type="number"
                              step="0.001"
                              min="0.1"
                              max="10"
                              placeholder="填写键长，如 1.09"
                              value={bondLengthsInput[k] || ''}
                              onChange={(e) =>
                                setBondLengthsInput((prev) => ({
                                  ...prev,
                                  [k]: e.target.value,
                                }))
                              }
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 键角 (°) */}
                  <div className="param-group-card">
                    <div className="param-group-title">
                      <span>键角参数 (bondAngles · 单位 °) *</span>
                    </div>
                    {activeAngleKeys.length === 0 ? (
                      <div className="param-empty-hint">
                        单原子或双原子分子无键角参数，无需填写。
                      </div>
                    ) : (
                      <div className="param-grid-2">
                        {activeAngleKeys.map((k) => (
                          <label key={k} className="param-field">
                            <span className="mono">{k} 键角 (°)</span>
                            <input
                              type="number"
                              step="0.01"
                              min="30"
                              max="180"
                              placeholder="如 109.5 或 120"
                              value={bondAnglesInput[k] || ''}
                              onChange={(e) =>
                                setBondAnglesInput((prev) => ({
                                  ...prev,
                                  [k]: e.target.value,
                                }))
                              }
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 底部保存操作栏 */}
                <div className="builder-params-footer">
                  <button
                    type="button"
                    className="text-button"
                    onClick={closeBuilder}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    id="builder-save-mol-btn"
                    className="primary-button"
                    onClick={handleSaveMolecule}
                  >
                    <span>{editingMolId ? '保存修改并生成 3D 卡片' : '完成构建并加入分子库'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
