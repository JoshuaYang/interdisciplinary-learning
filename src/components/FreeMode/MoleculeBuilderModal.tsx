import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Atom,
  ChevronDown,
  ChevronUp,
  Grid,
  Link2,
  Move,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
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

/**
 * Convert screen (clientX, clientY) into exact SVG viewBox coordinates using the inverse Screen CTM.
 * Eliminates any jump/offset caused by preserveAspectRatio letterboxing or zoom/pan viewBox transforms.
 */
function clientToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const ctm = svg.getScreenCTM();
  if (ctm) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }
  const rect = svg.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / Math.max(1, rect.width)) * 500,
    y: ((clientY - rect.top) / Math.max(1, rect.height)) * 320,
  };
}

/**
 * Check whether all nodes in the topology graph form a single connected component.
 */
function isTopologyConnected(nodes: TopologyNode[], bonds: TopologyBond[]): boolean {
  if (nodes.length <= 1) return nodes.length === 1;
  if (bonds.length === 0) return false;
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const b of bonds) {
    if (adj.has(b.from) && adj.has(b.to) && b.from !== b.to) {
      adj.get(b.from)!.push(b.to);
      adj.get(b.to)!.push(b.from);
    }
  }
  const visited = new Set<string>();
  const queue = [nodes[0].id];
  visited.add(nodes[0].id);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nb of adj.get(cur) || []) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }
  return visited.size === nodes.length;
}

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

  // 2D Topology Zoom & Pan state
  const [topoZoom, setTopoZoom] = useState<number>(1);
  const [topoPan, setTopoPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 3D Preview Zoom state (for UI indicator)
  const [preview3DZoomPct, setPreview3DZoomPct] = useState<number>(100);

  // Form parameter state
  const [name, setName] = useState<string>('');
  const [formula, setFormula] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [geometry, setGeometry] = useState<string>('');
  const [hybridization, setHybridization] = useState<string>('');
  const [bondLengthsInput, setBondLengthsInput] = useState<Record<string, string>>({});
  const [bondAnglesInput, setBondAnglesInput] = useState<Record<string, string>>({});

  // Dragging state on 2D SVG canvas
  const svgWrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [isPanning2D, setIsPanning2D] = useState<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });
  const [dragLinkFromId, setDragLinkFromId] = useState<string | null>(null);
  const [dragLinkCursor, setDragLinkCursor] = useState<{ x: number; y: number } | null>(null);
  const dragMovedRef = useRef<boolean>(false);

  const resetEmptyBuilder = useCallback(() => {
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
    setTopoZoom(1);
    setTopoPan({ x: 0, y: 0 });
  }, []);

  // Initialize state when modal opens
  useEffect(() => {
    if (!builderOpen) return;
    setTopoZoom(1);
    setTopoPan({ x: 0, y: 0 });
    if (editingItem) {
      try {
        const topo = normalizeDocToTopology(editingItem.doc);
        // Center existing 2D coordinates nicely around (250, 160)
        const rawNodes = topo.nodes.map((n, idx) => {
          if (typeof n.x === 'number' && typeof n.y === 'number') return n;
          const angle = (idx * 2 * Math.PI) / Math.max(1, topo.nodes.length);
          return {
            ...n,
            x: idx === 0 ? 250 : Math.round(250 + 92 * Math.cos(angle)),
            y: idx === 0 ? 160 : Math.round(160 + 92 * Math.sin(angle)),
          };
        });
        let avgX = 0;
        let avgY = 0;
        rawNodes.forEach((n) => {
          avgX += n.x ?? 250;
          avgY += n.y ?? 160;
        });
        avgX /= Math.max(1, rawNodes.length);
        avgY /= Math.max(1, rawNodes.length);
        const shiftX = Math.round(250 - avgX);
        const shiftY = Math.round(160 - avgY);
        const laidOut = rawNodes.map((n) => ({
          ...n,
          x: (n.x ?? 250) + shiftX,
          y: (n.y ?? 160) + shiftY,
        }));

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
  }, [builderOpen, editingItem, resetEmptyBuilder]);

  // 2D Canvas wheel zoom listener
  useEffect(() => {
    const wrap = svgWrapRef.current;
    if (!wrap || !builderOpen) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setTopoZoom((prev) =>
        Math.max(0.5, Math.min(2.5, Number((prev * Math.exp(-e.deltaY * 0.0012)).toFixed(3))))
      );
    };
    wrap.addEventListener('wheel', onWheel, { passive: false });
    return () => wrap.removeEventListener('wheel', onWheel);
  }, [builderOpen]);

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

    let x = customPos?.x ?? 250;
    let y = customPos?.y ?? 160;
    if (!customPos && nodes.length > 0) {
      const anchor = nodes.find((n) => n.id === selectedNodeId) || nodes[nodes.length - 1];
      const existingNbs = bonds.filter(
        (b) => b.from === anchor.id || b.to === anchor.id
      ).length;
      const angle = (existingNbs * Math.PI) / 2 - Math.PI / 2 + (nodes.length % 3) * 0.25;
      x = Math.round((anchor.x ?? 250) + 84 * Math.cos(angle));
      y = Math.round((anchor.y ?? 160) + 84 * Math.sin(angle));
    }

    const newNode: TopologyNode = {
      id: newId,
      element: symbol,
      radical: 0,
      x,
      y,
    };

    const nextNodes = [...nodes, newNode];
    const nextBonds = [...bonds];

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
      const nextOrder = ((existing.order % 3) + 1) as 1 | 2 | 3;
      setBonds(bonds.map((b) => (b.id === existing.id ? { ...b, order: nextOrder } : b)));
      setSelectedBondId(existing.id);
      showToast(
        `Switched covalent bond to ${
          nextOrder === 1 ? 'Single Bond' : nextOrder === 2 ? 'Double Bond' : 'Triple Bond'
        }`
      );
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
      showToast(`${target.element} has reached its standard valence (${maxValence}).`);
      return;
    }

    const newNodes = [...nodes];
    const newBonds = [...bonds];
    const baseCount = nodes.filter((n) => n.element === 'H').length;

    for (let i = 0; i < needed; i++) {
      const hId = `h${baseCount + i + 1}_${Date.now().toString(36).slice(-2)}`;
      const angle =
        ((currentBondOrderSum + i) * 2 * Math.PI) / Math.max(3, maxValence) - Math.PI / 2;
      newNodes.push({
        id: hId,
        element: 'H',
        radical: 0,
        x: Math.round((target.x ?? 250) + 82 * Math.cos(angle)),
        y: Math.round((target.y ?? 160) + 82 * Math.sin(angle)),
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
    showToast(`Added ${needed} H atom${needed > 1 ? 's' : ''} to ${target.element}.`);
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

  // Delete selected node (and any terminal H atoms exclusively attached to it)
  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    const targetNode = nodes.find((n) => n.id === selectedNodeId);
    const idsToRemove = new Set<string>([selectedNodeId]);

    // If deleting a non-H center atom, also remove terminal H atoms that were ONLY bonded to it
    if (targetNode && targetNode.element !== 'H') {
      for (const n of nodes) {
        if (n.id === selectedNodeId || n.element !== 'H') continue;
        const nBonds = bonds.filter((b) => b.from === n.id || b.to === n.id);
        if (
          nBonds.length === 1 &&
          (nBonds[0].from === selectedNodeId || nBonds[0].to === selectedNodeId)
        ) {
          idsToRemove.add(n.id);
        }
      }
    }

    const nextNodes = nodes.filter((n) => !idsToRemove.has(n.id));
    const nextBonds = bonds.filter(
      (b) => !idsToRemove.has(b.from) && !idsToRemove.has(b.to)
    );

    if (nextNodes.length === 0) {
      resetEmptyBuilder();
      return;
    }

    setNodes(nextNodes);
    setBonds(nextBonds);
    setSelectedNodeId(nextNodes[0]?.id || null);
  };

  const deleteSelectedBond = () => {
    if (!selectedBondId) return;
    setBonds(bonds.filter((b) => b.id !== selectedBondId));
    setSelectedBondId(null);
  };

  // ONE-CLICK AUTO-FILL
  const handleFillRecommendedDefaults = () => {
    if (nodes.length === 0) {
      showToast('Please select an element from the periodic table to add atoms first.');
      return;
    }
    const inferred = inferFormulaAndName(nodes, bonds);
    setFormula(inferred.formula);
    setName(inferred.name);
    setDescription(inferred.description);

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
    showToast('Auto-filled recommended parameters!');
  };

  const connectedGraph = useMemo(() => isTopologyConnected(nodes, bonds), [nodes, bonds]);

  // Structural signature that ignores 2D (x, y) coordinates so moving atoms in 2D doesn't rebuild 3D
  const structuralTopoKey = useMemo(
    () =>
      JSON.stringify({
        n: nodes.map((n) => [n.id, n.element, n.radical]),
        b: bonds.map((b) => [b.id, b.from, b.to, b.order]),
      }),
    [nodes, bonds]
  );

  // Assemble the JSON document from current builder state
  const currentDoc = useMemo(() => {
    if (nodes.length === 0) return null;
    if (!connectedGraph) return null;

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
    connectedGraph,
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

  // 3D molecule model (recomputes only when structural parameters change, NOT when 2D x/y changes)
  const previewMol = useMemo(() => {
    if (!currentDoc) return null;
    try {
      return buildUniversalMolecule(currentDoc);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    structuralTopoKey,
    connectedGraph,
    activeBondKeys,
    activeAngleKeys,
    bondLengthsInput,
    bondAnglesInput,
    geometry,
    hybridization,
    name,
    formula,
  ]);

  // Callback refs for the 3D stage box & viewport so Radix Portal mount always triggers WebGL init
  const [previewWrapEl, setPreviewWrapEl] = useState<HTMLDivElement | null>(null);
  const [previewVpEl, setPreviewVpEl] = useState<HTMLDivElement | null>(null);

  const threeCtxRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    root: THREE.Group;
    sphereGeo: THREE.SphereGeometry;
    cylinderGeo: THREE.CylinderGeometry;
    meshItems: {
      mesh: THREE.Mesh;
      label: THREE.Sprite;
      dot: THREE.Mesh;
      radius: number;
      hasRadical: boolean;
    }[];
    rotation: { x: number; y: number };
    zoom: { value: number };
    modelRadius: { value: number };
    draw: () => void;
    resize: () => void;
    zoomBy: (factor: number) => void;
    resetView: () => void;
  } | null>(null);

  // Effect 1: Initialize persistent WebGL Renderer + Pointer/Wheel interactivity when Portal DOM mounts
  useEffect(() => {
    if (!builderOpen || !previewVpEl || !previewWrapEl) return;

    const vp = previewVpEl;
    const wrap = previewWrapEl;
    vp.replaceChildren();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
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

    const rotation = { x: 0.28, y: 0.48 };
    const zoom = { value: 1 };
    const modelRadius = { value: 2.2 };
    const meshItems: {
      mesh: THREE.Mesh;
      label: THREE.Sprite;
      dot: THREE.Mesh;
      radius: number;
      hasRadical: boolean;
    }[] = [];

    const draw = () => {
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
      const w = Math.max(1, wrap.clientWidth);
      const h = Math.max(1, wrap.clientHeight);
      renderer.setSize(w, h);
      const aspect = w / h;
      const baseSpan = Math.max(2.1, modelRadius.value * 1.35);
      const halfH = Math.max(baseSpan, (baseSpan * 1.25) / Math.max(0.5, aspect)) / zoom.value;
      camera.left = -halfH * aspect;
      camera.right = halfH * aspect;
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.updateProjectionMatrix();
      draw();
    };

    const zoomBy = (factor: number) => {
      zoom.value = Math.max(0.5, Math.min(2.5, Number((zoom.value * factor).toFixed(3))));
      setPreview3DZoomPct(Math.round(zoom.value * 100));
      resize();
    };

    const resetView = () => {
      rotation.x = 0.28;
      rotation.y = 0.48;
      zoom.value = 1;
      setPreview3DZoomPct(100);
      resize();
    };

    const pointers = new Map<number, { x: number; y: number }>();
    const onPointerDown = (e: PointerEvent) => {
      e.stopPropagation();
      vp.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const onPointerMove = (e: PointerEvent) => {
      const old = pointers.get(e.pointerId);
      if (!old) return;
      e.stopPropagation();
      const dx = e.clientX - old.x;
      const dy = e.clientY - old.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      rotation.y += dx * 0.009;
      rotation.x = Math.max(-1.45, Math.min(1.45, rotation.x + dy * 0.009));
      draw();
    };
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      zoom.value = Math.max(0.5, Math.min(2.5, zoom.value * Math.exp(-e.deltaY * 0.0012)));
      setPreview3DZoomPct(Math.round(zoom.value * 100));
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
    const postAnimTimer = window.setTimeout(resize, 180);

    threeCtxRef.current = {
      renderer,
      scene,
      camera,
      root,
      sphereGeo,
      cylinderGeo,
      meshItems,
      rotation,
      zoom,
      modelRadius,
      draw,
      resize,
      zoomBy,
      resetView,
    };

    return () => {
      window.clearTimeout(postAnimTimer);
      ro.disconnect();
      vp.removeEventListener('pointerdown', onPointerDown);
      vp.removeEventListener('pointermove', onPointerMove);
      vp.removeEventListener('pointerup', onPointerUp);
      vp.removeEventListener('pointercancel', onPointerUp);
      vp.removeEventListener('wheel', onWheel);
      sphereGeo.dispose();
      cylinderGeo.dispose();
      renderer.dispose();
      vp.replaceChildren();
      threeCtxRef.current = null;
    };
  }, [builderOpen, previewVpEl, previewWrapEl]);

  // Effect 2: Sync 3D meshes whenever `previewMol` changes (clears immediately when `previewMol` is null)
  useEffect(() => {
    const ctx = threeCtxRef.current;
    if (!ctx) return;

    while (ctx.root.children.length > 0) {
      ctx.root.remove(ctx.root.children[0]);
    }
    ctx.meshItems.length = 0;

    if (!previewMol || previewMol.atoms.length === 0) {
      ctx.draw();
      return;
    }

    // Center atoms around [0, 0, 0] and compute bounding radius
    const atoms = previewMol.atoms;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const a of atoms) {
      cx += a.position[0];
      cy += a.position[1];
      cz += a.position[2];
    }
    cx /= atoms.length;
    cy /= atoms.length;
    cz /= atoms.length;

    let maxDist = 1.6;
    const posMap = new Map<string, [number, number, number]>();
    const elemMap = new Map<string, string>();

    for (const a of atoms) {
      const centered: [number, number, number] = [
        a.position[0] - cx,
        a.position[1] - cy,
        a.position[2] - cz,
      ];
      posMap.set(a.id, centered);
      elemMap.set(a.id, a.element);
      const radius = getElementRadius(a.element);
      const d = Math.hypot(...centered) + radius;
      if (d > maxDist) maxDist = d;

      const mesh = new THREE.Mesh(
        ctx.sphereGeo,
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(getElementColor(a.element)),
          roughness: 0.34,
          metalness: 0.04,
        })
      );
      mesh.scale.setScalar(radius);
      mesh.position.fromArray(centered);

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
        ctx.sphereGeo,
        new THREE.MeshBasicMaterial({ color: RADICAL_COLOR })
      );
      dot.scale.setScalar(0.085);
      dot.visible = hasRadical;

      ctx.root.add(mesh, label, dot);
      ctx.meshItems.push({ mesh, label, dot, radius, hasRadical });
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
      if (len < 0.001) continue;
      const unitDir = dir.clone().normalize();
      const perp = new THREE.Vector3(0, 0, 1).cross(unitDir);
      if (perp.lengthSq() < 0.01) perp.set(0, 1, 0).cross(unitDir);
      perp.normalize();

      const order = b.order || 1;
      const offsets =
        order === 3 ? [-0.11, 0, 0.11] : order === 2 ? [-0.075, 0.075] : [0];
      const cylRadius = order === 3 ? 0.038 : order === 2 ? 0.046 : 0.066;

      for (const off of offsets) {
        const shift = perp.clone().multiplyScalar(off);
        b.atoms.forEach((atomId, idx) => {
          const el = elemMap.get(atomId) || 'C';
          const m = new THREE.Mesh(
            ctx.cylinderGeo,
            new THREE.MeshStandardMaterial({
              color: new THREE.Color(getElementColor(el)),
              roughness: 0.45,
            })
          );
          m.position.copy(v1).lerp(v2, idx === 0 ? 0.25 : 0.75).add(shift);
          m.quaternion.setFromUnitVectors(axis, unitDir);
          m.scale.set(cylRadius, len / 2, cylRadius);
          ctx.root.add(m);
        });
      }
    }

    ctx.modelRadius.value = maxDist;
    ctx.resize();
  }, [previewMol, previewVpEl]);

  // Save to store
  const handleSaveMolecule = () => {
    if (nodes.length === 0) {
      showToast('Please add at least 1 atom to the canvas.');
      return;
    }
    if (!connectedGraph) {
      showToast('Please connect all atoms on the canvas with covalent bonds.');
      return;
    }
    if (!currentDoc) {
      showToast('Please complete the parameters or click "Auto-Fill" in the top right.');
      return;
    }
    const saved = saveMoleculeDoc(currentDoc, editingMolId);
    showToast(
      editingMolId
        ? `Updated "${saved.mol.name} (${saved.mol.formula})"`
        : `Added "${saved.mol.name} (${saved.mol.formula})"`
    );
    closeBuilder();
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedBond = bonds.find((b) => b.id === selectedBondId) || null;

  // Compute dynamic 2D viewBox from topoZoom & topoPan
  const vbW = 500 / topoZoom;
  const vbH = 320 / topoZoom;
  const vbX = 250 - vbW / 2 + topoPan.x;
  const vbY = 160 - vbH / 2 + topoPan.y;

  return (
    <Dialog.Root open={builderOpen} onOpenChange={(open) => !open && closeBuilder()}>
      <Dialog.Portal>
        <Dialog.Overlay className="radix-dialog-overlay" />
        <Dialog.Content
          className="radix-dialog-content dialog-surface mol-builder-dialog"
          aria-describedby={undefined}
        >
          {/* Top Header: Title on left, Auto-Fill + Close on right (no Export JSON) */}
          <div className="dialog-header mol-builder-header">
            <div>
              <span className="small-label">INTERACTIVE MOLECULE BUILDER</span>
              <Dialog.Title asChild>
                <h2>{editingMolId ? 'Edit Chemical Substance' : 'Add Chemical Substance'}</h2>
              </Dialog.Title>
            </div>
            <div className="mol-builder-header-actions">
              <button
                type="button"
                id="builder-autofill-defaults-btn"
                className="autofill-defaults-btn"
                onClick={handleFillRecommendedDefaults}
                title="Auto-fill recommended VSEPR geometry, hybridization, bond lengths, and angles"
              >
                <Sparkles size={16} />
                <span>Auto-Fill</span>
              </button>
              <Dialog.Close asChild>
                <button className="icon-button" aria-label="Close Builder" title="Close">
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="mol-builder-body">
            {/* Section 1: Periodic Table Selector */}
            <div className="builder-periodic-section">
              <div className="builder-section-bar">
                <div className="builder-section-title">
                  <Atom size={18} />
                  <strong>1. Select Elements from Periodic Table</strong>
                  <span className="builder-hint-pill">
                    Clicking an element while an atom is selected automatically forms a bond
                  </span>
                </div>
                <div className="builder-periodic-controls">
                  <div className="quick-elements-row">
                    <span className="quick-label">Common:</span>
                    {COMMON_SYMBOLS.map((sym) => {
                      const el = ELEMENT_MAP[sym];
                      return (
                        <button
                          key={sym}
                          type="button"
                          className={`quick-el-btn ${activeElement === sym ? 'active' : ''}`}
                          onClick={() => addAtomNode(sym)}
                          title={`Add ${el?.name || sym} (${sym})`}
                        >
                          <i
                            className="quick-el-dot"
                            style={{ background: getElementColorHex(sym) }}
                          />
                          <strong>{sym}</strong>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setShowFullPeriodicTable((v) => !v)}
                    title={
                      showFullPeriodicTable
                        ? 'Collapse Periodic Table'
                        : 'Expand Full Periodic Table (118)'
                    }
                    aria-label="Toggle Periodic Table"
                  >
                    <Grid size={16} />
                    {showFullPeriodicTable ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
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
                      All (118)
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
                  <div className="ptable-grid" role="grid" aria-label="Full Periodic Table of Elements">
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
                          title={`${el.number} ${el.name} (${el.symbol}) · Click to add atom`}
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
                      <small>Lanthanides</small>
                    </div>
                    <div
                      className="ptable-series-placeholder"
                      style={{ gridRow: 7, gridColumn: 3 }}
                    >
                      89-103
                      <small>Actinides</small>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Two-column workspace (Left: 2D Topology + Live 3D Preview; Right: Parameters Form) */}
            <div className="builder-main-columns">
              {/* Left Column: 2D Topology Canvas + Live 3D Preview (both support zoom!) */}
              <div className="builder-visual-col">
                <div className="builder-canvas-card">
                  <div className="builder-canvas-toolbar">
                    <div className="canvas-tool-group">
                      <button
                        type="button"
                        className={`canvas-tool-btn ${canvasTool === 'connect' ? 'active' : ''}`}
                        onClick={() => setCanvasTool('connect')}
                        title="Bond / Select mode: Drag between atoms to connect"
                      >
                        <Link2 size={15} />
                        <span>Bond</span>
                      </button>
                      <button
                        type="button"
                        className={`canvas-tool-btn ${canvasTool === 'move' ? 'active' : ''}`}
                        onClick={() => setCanvasTool('move')}
                        title="Move mode: Drag atoms to rearrange 2D layout"
                      >
                        <Move size={15} />
                        <span>Move</span>
                      </button>
                    </div>

                    {selectedNode && (
                      <div className="canvas-node-actions">
                        <span className="selected-node-badge">
                          <strong>{selectedNode.element}</strong> ({selectedNode.id})
                        </span>
                        <button
                          type="button"
                          className="canvas-mini-btn"
                          onClick={autoFillHydrogensForSelected}
                          title="Auto-fill Hydrogen atoms based on standard valence"
                        >
                          <Plus size={14} />
                          <span>H</span>
                        </button>
                        <button
                          type="button"
                          className={`canvas-mini-btn ${selectedNode.radical ? 'is-radical' : ''}`}
                          onClick={toggleSelectedNodeRadical}
                          title="Toggle unpaired electron (radical dot)"
                        >
                          <span>· {selectedNode.radical ? 'Radical' : 'No Radical'}</span>
                        </button>
                        <button
                          type="button"
                          className="canvas-mini-btn danger"
                          onClick={deleteSelectedNode}
                          title="Delete selected atom"
                          aria-label="Delete selected atom"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}

                    {selectedBond && !selectedNode && (
                      <div className="canvas-node-actions">
                        <span className="selected-node-badge">
                          Order {selectedBond.order}
                        </span>
                        <button
                          type="button"
                          className="canvas-mini-btn"
                          onClick={() =>
                            connectOrToggleBond(selectedBond.from, selectedBond.to)
                          }
                          title="Cycle Single / Double / Triple Bond"
                        >
                          <span>1 / 2 / 3</span>
                        </button>
                        <button
                          type="button"
                          className="canvas-mini-btn danger"
                          onClick={deleteSelectedBond}
                          title="Delete selected bond"
                          aria-label="Delete selected bond"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}

                    {nodes.length > 0 && (
                      <button
                        type="button"
                        className="canvas-mini-btn danger"
                        onClick={resetEmptyBuilder}
                        title="Clear entire structure"
                        aria-label="Clear entire structure"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </div>

                  {/* 2D Interactive Topology Canvas with Wheel + Button Zoom & Pan */}
                  <div className="topology-canvas-wrap" ref={svgWrapRef}>
                    <svg
                      ref={svgRef}
                      className="topology-svg"
                      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                      onPointerDown={(e) => {
                        if (e.target === svgRef.current || (e.target as Element).tagName === 'rect') {
                          setSelectedBondId(null);
                          setIsPanning2D(true);
                          panStartRef.current = {
                            clientX: e.clientX,
                            clientY: e.clientY,
                            panX: topoPan.x,
                            panY: topoPan.y,
                          };
                        }
                      }}
                      onPointerMove={(e) => {
                        if (!svgRef.current) return;
                        if (draggingNodeId) {
                          const pt = clientToSvgPoint(svgRef.current, e.clientX, e.clientY);
                          dragMovedRef.current = true;
                          const nextX = Math.round(pt.x + dragOffsetRef.current.dx);
                          const nextY = Math.round(pt.y + dragOffsetRef.current.dy);
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === draggingNodeId
                                ? { ...n, x: nextX, y: nextY }
                                : n
                            )
                          );
                        } else if (dragLinkFromId) {
                          const pt = clientToSvgPoint(svgRef.current, e.clientX, e.clientY);
                          setDragLinkCursor(pt);
                        } else if (isPanning2D) {
                          const rect = svgRef.current.getBoundingClientRect();
                          const scaleX = vbW / Math.max(1, rect.width);
                          const scaleY = vbH / Math.max(1, rect.height);
                          const dx = (e.clientX - panStartRef.current.clientX) * scaleX;
                          const dy = (e.clientY - panStartRef.current.clientY) * scaleY;
                          setTopoPan({
                            x: Math.round(panStartRef.current.panX - dx),
                            y: Math.round(panStartRef.current.panY - dy),
                          });
                        }
                      }}
                      onPointerUp={() => {
                        setDraggingNodeId(null);
                        setDragLinkFromId(null);
                        setDragLinkCursor(null);
                        setIsPanning2D(false);
                      }}
                      onPointerCancel={() => {
                        setDraggingNodeId(null);
                        setDragLinkFromId(null);
                        setDragLinkCursor(null);
                        setIsPanning2D(false);
                      }}
                    >
                      {/* Grid background */}
                      <defs>
                        <pattern
                          id="builder-grid"
                          width="24"
                          height="24"
                          patternUnits="userSpaceOnUse"
                        >
                          <circle cx="2" cy="2" r="1.2" fill="#cbd5e1" opacity="0.7" />
                        </pattern>
                      </defs>
                      <rect
                        x={vbX - 500}
                        y={vbY - 500}
                        width={vbW + 1000}
                        height={vbH + 1000}
                        fill="url(#builder-grid)"
                      />

                      {/* Temporary drag-to-connect line */}
                      {dragLinkFromId &&
                        dragLinkCursor &&
                        (() => {
                          const src = nodes.find((n) => n.id === dragLinkFromId);
                          if (!src) return null;
                          return (
                            <line
                              x1={src.x ?? 250}
                              y1={src.y ?? 160}
                              x2={dragLinkCursor.x}
                              y2={dragLinkCursor.y}
                              stroke="#2563eb"
                              strokeWidth="3"
                              strokeDasharray="6 4"
                            />
                          );
                        })()}

                      {/* Render Bonds */}
                      {bonds.map((b) => {
                        const n1 = nodes.find((n) => n.id === b.from);
                        const n2 = nodes.find((n) => n.id === b.to);
                        if (!n1 || !n2) return null;
                        const x1 = n1.x ?? 250;
                        const y1 = n1.y ?? 160;
                        const x2 = n2.x ?? 250;
                        const y2 = n2.y ?? 160;
                        const mx = (x1 + x2) / 2;
                        const my = (y1 + y2) / 2;
                        const dx = x2 - x1;
                        const dy = y2 - y1;
                        const len = Math.hypot(dx, dy) || 1;
                        const nx = (-dy / len) * 4.8;
                        const ny = (dx / len) * 4.8;
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
                            <line
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke="transparent"
                              strokeWidth="16"
                            />
                            {b.order === 1 && (
                              <line
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke={isSelected ? '#2563eb' : '#64748b'}
                                strokeWidth={isSelected ? '4.5' : '3.5'}
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
                                  strokeWidth="3"
                                />
                                <line
                                  x1={x1 - nx}
                                  y1={y1 - ny}
                                  x2={x2 - nx}
                                  y2={y2 - ny}
                                  stroke={isSelected ? '#2563eb' : '#64748b'}
                                  strokeWidth="3"
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
                                  strokeWidth="2.8"
                                />
                                <line
                                  x1={x1 + nx * 1.4}
                                  y1={y1 + ny * 1.4}
                                  x2={x2 + nx * 1.4}
                                  y2={y2 + ny * 1.4}
                                  stroke={isSelected ? '#2563eb' : '#64748b'}
                                  strokeWidth="2.5"
                                />
                                <line
                                  x1={x1 - nx * 1.4}
                                  y1={y1 - ny * 1.4}
                                  x2={x2 - nx * 1.4}
                                  y2={y2 - ny * 1.4}
                                  stroke={isSelected ? '#2563eb' : '#64748b'}
                                  strokeWidth="2.5"
                                />
                              </>
                            )}
                            <rect
                              x={mx - 26}
                              y={my - 11}
                              width="52"
                              height="22"
                              rx="6"
                              fill={lenVal ? '#ffffff' : '#fef3c7'}
                              stroke={isSelected ? '#2563eb' : '#cbd5e1'}
                              strokeWidth="1.2"
                            />
                            <text
                              x={mx}
                              y={my + 4}
                              textAnchor="middle"
                              fontSize="11.5"
                              fontWeight="600"
                              fill={lenVal ? '#334155' : '#b45309'}
                            >
                              {lenVal ? `${lenVal}Å` : 'Unset'}
                            </text>
                          </g>
                        );
                      })}

                      {/* Render Atom Nodes */}
                      {nodes.map((n) => {
                        const x = n.x ?? 250;
                        const y = n.y ?? 160;
                        const isSelected = selectedNodeId === n.id;
                        const bgHex = getElementColorHex(n.element);
                        const isLight = ['H', 'He', 'Be', 'B', 'Ne'].includes(n.element);
                        const r = n.element === 'H' ? 20 : 25;

                        return (
                          <g
                            key={n.id}
                            className={`topo-node-group ${isSelected ? 'selected' : ''}`}
                            transform={`translate(${x}, ${y})`}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              dragMovedRef.current = false;
                              if (canvasTool === 'move' || e.shiftKey) {
                                if (svgRef.current) {
                                  const pt = clientToSvgPoint(
                                    svgRef.current,
                                    e.clientX,
                                    e.clientY
                                  );
                                  dragOffsetRef.current = {
                                    dx: x - pt.x,
                                    dy: y - pt.y,
                                  };
                                } else {
                                  dragOffsetRef.current = { dx: 0, dy: 0 };
                                }
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
                                r={r + 6}
                                fill="none"
                                stroke="#2563eb"
                                strokeWidth="2.8"
                                strokeDasharray="4 2.5"
                              />
                            )}
                            <circle
                              r={r}
                              fill={bgHex}
                              stroke={isSelected ? '#2563eb' : '#475569'}
                              strokeWidth={isSelected ? '2.5' : '1.6'}
                            />
                            <text
                              y="5"
                              textAnchor="middle"
                              fontSize={n.element === 'H' ? '14' : '16'}
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
                                r="5.5"
                                fill="#ea580c"
                                stroke="#ffffff"
                                strokeWidth="1.6"
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* 2D Zoom & Reset Controls */}
                    <div className="canvas-zoom-bar">
                      <button
                        type="button"
                        className="canvas-zoom-btn"
                        title="Zoom Out (2D)"
                        aria-label="Zoom Out 2D"
                        onClick={() =>
                          setTopoZoom((z) => Math.max(0.5, Number((z / 1.2).toFixed(2))))
                        }
                      >
                        <ZoomOut size={14} />
                      </button>
                      <span className="canvas-zoom-pct mono">{Math.round(topoZoom * 100)}%</span>
                      <button
                        type="button"
                        className="canvas-zoom-btn"
                        title="Zoom In (2D)"
                        aria-label="Zoom In 2D"
                        onClick={() =>
                          setTopoZoom((z) => Math.min(2.5, Number((z * 1.2).toFixed(2))))
                        }
                      >
                        <ZoomIn size={14} />
                      </button>
                      <button
                        type="button"
                        className="canvas-zoom-btn"
                        title="Reset 2D View"
                        aria-label="Reset 2D View"
                        onClick={() => {
                          setTopoZoom(1);
                          setTopoPan({ x: 0, y: 0 });
                        }}
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>

                    {nodes.length === 0 && (
                      <div className="topology-empty-overlay">
                        <Atom size={32} />
                        <strong>Canvas is empty · Click an element above to add atoms</strong>
                        <span>
                          Drag between atoms to form bonds, or scroll to zoom in/out.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live 3D Ball-and-Stick Preview Card (Interactive Rotate + Wheel/Button Zoom) */}
                <div className="builder-3d-card">
                  <div className="builder-3d-header">
                    <span>Live 3D Structure Preview</span>
                    {previewMol && (
                      <span className="builder-3d-meta">
                        {previewMol.name} · {previewMol.geometry}
                      </span>
                    )}
                  </div>
                  <div className="builder-3d-stage-box" ref={setPreviewWrapEl}>
                    <div
                      ref={setPreviewVpEl}
                      className="builder-3d-viewport"
                      style={{
                        opacity: previewMol ? 1 : 0,
                        pointerEvents: previewMol ? 'auto' : 'none',
                      }}
                      role="img"
                      aria-label="Interactive 3D Molecular Structure Preview: drag to rotate, scroll to zoom"
                    />

                    {previewMol ? (
                      <>
                        <div className="builder-3d-hint">Drag to rotate · Scroll to zoom</div>
                        <div className="canvas-zoom-bar">
                          <button
                            type="button"
                            className="canvas-zoom-btn"
                            title="Zoom Out (3D)"
                            aria-label="Zoom Out 3D"
                            onClick={() => threeCtxRef.current?.zoomBy(1 / 1.2)}
                          >
                            <ZoomOut size={14} />
                          </button>
                          <span className="canvas-zoom-pct mono">{preview3DZoomPct}%</span>
                          <button
                            type="button"
                            className="canvas-zoom-btn"
                            title="Zoom In (3D)"
                            aria-label="Zoom In 3D"
                            onClick={() => threeCtxRef.current?.zoomBy(1.2)}
                          >
                            <ZoomIn size={14} />
                          </button>
                          <button
                            type="button"
                            className="canvas-zoom-btn"
                            title="Reset 3D View"
                            aria-label="Reset 3D View"
                            onClick={() => threeCtxRef.current?.resetView()}
                          >
                            <RotateCcw size={13} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="builder-3d-placeholder">
                        <Sparkles size={26} />
                        <p>
                          {nodes.length === 0
                            ? 'Add atoms from the periodic table above to build a 3D molecular model.'
                            : !connectedGraph
                            ? 'Unconnected atoms detected — connect all atoms on the 2D canvas or delete isolated atoms.'
                            : 'Complete parameters on the right or click "Auto-Fill" in the top right to generate the 3D model.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Parameters Configuration Form */}
              <div className="builder-params-col">
                <div className="builder-params-top">
                  <div>
                    <h3>2. Structure & Bond Parameters</h3>
                    <p>Configure geometric parameters or click Auto-Fill in the top right</p>
                  </div>
                </div>

                <div className="builder-params-scroll">
                  {/* Basic Identity */}
                  <div className="param-group-card">
                    <div className="param-group-title">Basic Identity</div>
                    <div className="param-grid-2">
                      <label className="param-field">
                        <span>Chemical Formula (formula)</span>
                        <input
                          type="text"
                          placeholder="e.g. CH4, CH3·, CH3CH3"
                          value={formula}
                          onChange={(e) => setFormula(e.target.value)}
                        />
                      </label>
                      <label className="param-field">
                        <span>Substance Name (name)</span>
                        <input
                          type="text"
                          placeholder="e.g. Methane, Methyl Radical"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </label>
                    </div>
                    <label className="param-field">
                      <span>Description (optional)</span>
                      <input
                        type="text"
                        placeholder="Brief description of structural or chemical properties…"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Spatial Geometry & Hybridization */}
                  <div className="param-group-card">
                    <div className="param-group-title">Spatial Geometry & Hybridization</div>
                    <div className="param-grid-2">
                      <label className="param-field">
                        <span>Spatial Geometry (geometry) *</span>
                        <div className="select-wrapper">
                          <select
                            value={geometry}
                            onChange={(e) => setGeometry(e.target.value)}
                          >
                            <option value="">Select spatial geometry…</option>
                            {GEOMETRY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="select-chevron" />
                        </div>
                      </label>

                      <label className="param-field">
                        <span>Central Hybridization (hybridization)</span>
                        <div className="select-wrapper">
                          <select
                            value={hybridization}
                            onChange={(e) => setHybridization(e.target.value)}
                          >
                            <option value="">Select hybridization…</option>
                            {HYBRIDIZATION_OPTIONS.map((h) => (
                              <option key={h} value={h}>
                                {h === 'none' ? 'None (none)' : h}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="select-chevron" />
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Covalent Bond Lengths (Å) */}
                  <div className="param-group-card">
                    <div className="param-group-title">
                      <span>Covalent Bond Lengths (bondLengths · in Å) *</span>
                    </div>
                    {activeBondKeys.length === 0 ? (
                      <div className="param-empty-hint">
                        {nodes.length <= 1
                          ? 'Monatomic species have no intramolecular covalent bonds.'
                          : 'Connect atoms on the left canvas to configure bond lengths.'}
                      </div>
                    ) : (
                      <div className="param-grid-2">
                        {activeBondKeys.map((k) => (
                          <label key={k} className="param-field">
                            <span className="mono">{k} Bond Length (Å)</span>
                            <input
                              type="number"
                              step="0.001"
                              min="0.1"
                              max="10"
                              placeholder="e.g. 1.09"
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

                  {/* Bond Angles (°) */}
                  <div className="param-group-card">
                    <div className="param-group-title">
                      <span>Bond Angles (bondAngles · in °) *</span>
                    </div>
                    {activeAngleKeys.length === 0 ? (
                      <div className="param-empty-hint">
                        Monatomic or diatomic species do not require bond angle parameters.
                      </div>
                    ) : (
                      <div className="param-grid-2">
                        {activeAngleKeys.map((k) => (
                          <label key={k} className="param-field">
                            <span className="mono">{k} Bond Angle (°)</span>
                            <input
                              type="number"
                              step="0.01"
                              min="30"
                              max="180"
                              placeholder="e.g. 109.5 or 120"
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

                {/* Footer Save Bar */}
                <div className="builder-params-footer">
                  <button
                    type="button"
                    className="toolbar-btn-outline"
                    onClick={closeBuilder}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="builder-save-mol-btn"
                    className="primary-button"
                    onClick={handleSaveMolecule}
                  >
                    <span>Save</span>
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
