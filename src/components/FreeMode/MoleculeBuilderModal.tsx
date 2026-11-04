import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Atom,
  ChevronDown,
  ChevronUp,
  Grid,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useFreeChemStore } from '../../store/useFreeChemStore';
import { useChemStore } from '../../store/useChemStore';
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

const COMMON_SYMBOLS = ['C', 'H', 'Br', 'Cl', 'O', 'N', 'F', 'I', 'S', 'P', 'B', 'Si'];

/**
 * Utility to convert screen clientX/clientY to SVG user coordinates
 */
function clientToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (ctm) {
    const inv = ctm.inverse();
    const res = pt.matrixTransform(inv);
    return { x: res.x, y: res.y };
  }
  const rect = svg.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / Math.max(1, rect.width)) * 500,
    y: ((clientY - rect.top) / Math.max(1, rect.height)) * 320,
  };
}

/**
 * Connectivity test: returns true if all nodes belong to one connected component
 */
function isTopologyConnected(nodes: TopologyNode[], bonds: TopologyBond[]): boolean {
  if (nodes.length <= 1) return true;
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => adj.set(n.id, []));
  bonds.forEach((b) => {
    if (adj.has(b.from) && adj.has(b.to)) {
      adj.get(b.from)!.push(b.to);
      adj.get(b.to)!.push(b.from);
    }
  });

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
  const [activeElement, setActiveElement] = useState<string | null>(null);
  const [showFullPeriodicTable, setShowFullPeriodicTable] = useState<boolean>(false);
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

  // Unified Dragging & Linking state on 2D SVG canvas
  const svgWrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragLinkFromId, setDragLinkFromId] = useState<string | null>(null);
  const [dragLinkCursor, setDragLinkCursor] = useState<{ x: number; y: number } | null>(null);
  const activePointerDownNodeRef = useRef<TopologyNode | null>(null);
  const pointerDownPosRef = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });
  const isDraggingNodeRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Panning background state
  const [isPanning2D, setIsPanning2D] = useState<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });

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

  // Sync internal state when opening modal (new vs editing)
  useEffect(() => {
    if (!builderOpen) return;
    if (editingItem && editingItem.doc) {
      const doc = editingItem.doc;
      const initialNodes: TopologyNode[] = (doc.nodes || []).map((n: any, idx: number) => ({
        id: n.id || `atom_${idx + 1}`,
        element: n.element || 'C',
        radical: n.radical || 0,
        x: n.x ?? 250 + (idx % 3) * 60,
        y: n.y ?? 160 + Math.floor(idx / 3) * 60,
      }));
      const initialBonds: TopologyBond[] = (doc.bonds || []).map((b: any, idx: number) => ({
        id: b.id || `bond_${idx + 1}`,
        from: b.from,
        to: b.to,
        order: (b.order || 1) as 1 | 2 | 3,
      }));

      setNodes(initialNodes);
      setBonds(initialBonds);
      setSelectedNodeId(initialNodes[0]?.id || null);
      setSelectedBondId(null);
      setName(doc.name || '');
      setFormula(doc.formula || '');
      setDescription(doc.description || '');
      setGeometry(doc.geometry || '');
      setHybridization(doc.hybridization || '');

      const blMap: Record<string, string> = {};
      if (doc.bondLengths) {
        for (const [k, v] of Object.entries(doc.bondLengths)) {
          blMap[k] = String(v);
        }
      }
      setBondLengthsInput(blMap);

      const baMap: Record<string, string> = {};
      if (doc.bondAngles) {
        for (const [k, v] of Object.entries(doc.bondAngles)) {
          baMap[k] = String(v);
        }
      }
      setBondAnglesInput(baMap);
      setTopoZoom(1);
      setTopoPan({ x: 0, y: 0 });
    } else {
      resetEmptyBuilder();
    }
  }, [builderOpen, editingItem, resetEmptyBuilder]);

  // Active bonds and angle keys
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
    if (nodes.length < 3) return [];
    const adj = new Map<string, string[]>();
    nodes.forEach((n) => adj.set(n.id, []));
    bonds.forEach((b) => {
      if (adj.has(b.from) && adj.has(b.to)) {
        adj.get(b.from)!.push(b.to);
        adj.get(b.to)!.push(b.from);
      }
    });

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const keys = new Set<string>();
    for (const n of nodes) {
      const neighbors = adj.get(n.id) || [];
      if (neighbors.length < 2) continue;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const el1 = nodeMap.get(neighbors[i])!.element;
          const el2 = nodeMap.get(neighbors[j])!.element;
          const pair = [el1, el2].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
          );
          keys.add(`${pair[0]}-${n.element}-${pair[1]}`);
        }
      }
    }
    return [...keys];
  }, [nodes, bonds]);

  /**
   * Helper: Automatically synthesize recommended default parameters into state
   * so adding atoms or connecting bonds immediately generates 3D coordinates.
   */
  const synthesizeDefaultsForNodesAndBonds = (
    currentNodes: TopologyNode[],
    currentBonds: TopologyBond[],
    currentBLMap: Record<string, string>,
    currentBAMap: Record<string, string>
  ) => {
    const nodeMap = new Map(currentNodes.map((n) => [n.id, n]));
    const updatedBL = { ...currentBLMap };
    for (const b of currentBonds) {
      const n1 = nodeMap.get(b.from);
      const n2 = nodeMap.get(b.to);
      if (!n1 || !n2) continue;
      const key = getCanonicalBondKey(n1.element, n2.element);
      if (!updatedBL[key]) {
        updatedBL[key] = String(getRecommendedBondLength(n1.element, n2.element, b.order));
      }
    }

    const adj = new Map<string, string[]>();
    currentNodes.forEach((n) => adj.set(n.id, []));
    currentBonds.forEach((b) => {
      if (adj.has(b.from) && adj.has(b.to)) {
        adj.get(b.from)!.push(b.to);
        adj.get(b.to)!.push(b.from);
      }
    });

    const sortedCenters = [...currentNodes].sort(
      (a, b) => (adj.get(b.id)?.length || 0) - (adj.get(a.id)?.length || 0)
    );
    const primaryCenter = sortedCenters[0];
    let recommendedGeometry = geometry;
    let recommendedHybridization = hybridization;

    const updatedBA = { ...currentBAMap };

    if (primaryCenter) {
      const primaryNbEls = (adj.get(primaryCenter.id) || []).map(
        (id) => nodeMap.get(id)!.element
      );
      const rec = recommendCenterConfig(
        primaryCenter.element,
        primaryNbEls,
        primaryCenter.radical
      );
      if (!recommendedGeometry) {
        recommendedGeometry = rec.geometry;
      }
      if (!recommendedHybridization) {
        recommendedHybridization = rec.hybridization;
      }

      for (const [k, v] of Object.entries(rec.bondAngles)) {
        if (!updatedBA[k]) {
          updatedBA[k] = String(v);
        }
      }
    }

    const inferred = inferFormulaAndName(currentNodes, currentBonds);
    return {
      name: name || inferred.name,
      formula: formula || inferred.formula,
      description: description || inferred.description,
      geometry: recommendedGeometry || (currentNodes.length === 2 ? 'diatomic' : 'monatomic'),
      hybridization: recommendedHybridization || 'none',
      bondLengths: updatedBL,
      bondAngles: updatedBA,
    };
  };

  // Add an atom of `symbol` to the 2D topology canvas
  const addAtomNode = (symbol: string, customPos?: { x: number; y: number }) => {
    setActiveElement(symbol);
    setTimeout(() => {
      setActiveElement((cur) => (cur === symbol ? null : cur));
    }, 350);
    const sameCount = nodes.filter((n) => n.element === symbol).length;
    const newId = `${symbol.toLowerCase()}${sameCount + 1}_${Date.now().toString(36).slice(-2)}`;

    let x = customPos?.x ?? 250;
    let y = customPos?.y ?? 160;
    if (!customPos && nodes.length > 0) {
      const anchor = nodes.find((n) => n.id === selectedNodeId) || nodes[nodes.length - 1];
      const existingNbs = bonds.filter(
        (b) => b.from === anchor.id || b.to === anchor.id
      ).length;
      const angle = (existingNbs * Math.PI) / 2 - Math.PI / 2 + (nodes.length % 3) * 0.35;
      x = Math.round((anchor.x ?? 250) + 125 * Math.cos(angle));
      y = Math.round((anchor.y ?? 160) + 125 * Math.sin(angle));
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

    // Auto-populate recommended defaults so 3D renders immediately!
    const autoParams = synthesizeDefaultsForNodesAndBonds(
      nextNodes,
      nextBonds,
      bondLengthsInput,
      bondAnglesInput
    );

    setNodes(nextNodes);
    setBonds(nextBonds);
    setSelectedNodeId(newId);
    setSelectedBondId(null);
    setName(autoParams.name);
    setFormula(autoParams.formula);
    setDescription(autoParams.description);
    setGeometry(autoParams.geometry);
    setHybridization(autoParams.hybridization);
    setBondLengthsInput(autoParams.bondLengths);
    setBondAnglesInput(autoParams.bondAngles);
  };

  // Connect or toggle bond order (1, 2, 3) between two nodes
  const connectOrSetBond = (idA: string, idB: string, explicitOrder?: 1 | 2 | 3) => {
    if (idA === idB) return;
    const existing = bonds.find(
      (b) => (b.from === idA && b.to === idB) || (b.from === idB && b.to === idA)
    );
    let nextBonds = [...bonds];
    let targetBondId = '';

    if (existing) {
      const nextOrder = explicitOrder ?? (((existing.order % 3) + 1) as 1 | 2 | 3);
      nextBonds = bonds.map((b) => (b.id === existing.id ? { ...b, order: nextOrder } : b));
      targetBondId = existing.id;
    } else {
      const newBond: TopologyBond = {
        id: `b_${idA}_${idB}_${Date.now().toString(36).slice(-2)}`,
        from: idA,
        to: idB,
        order: explicitOrder ?? 1,
      };
      nextBonds = [...bonds, newBond];
      targetBondId = newBond.id;
    }

    const autoParams = synthesizeDefaultsForNodesAndBonds(
      nodes,
      nextBonds,
      bondLengthsInput,
      bondAnglesInput
    );

    setBonds(nextBonds);
    setSelectedBondId(targetBondId);
    setSelectedNodeId(null);
    setGeometry(autoParams.geometry);
    setHybridization(autoParams.hybridization);
    setBondLengthsInput(autoParams.bondLengths);
    setBondAnglesInput(autoParams.bondAngles);
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

    const autoParams = synthesizeDefaultsForNodesAndBonds(
      newNodes,
      newBonds,
      bondLengthsInput,
      bondAnglesInput
    );

    setNodes(newNodes);
    setBonds(newBonds);
    setName(autoParams.name);
    setFormula(autoParams.formula);
    setDescription(autoParams.description);
    setGeometry(autoParams.geometry);
    setHybridization(autoParams.hybridization);
    setBondLengthsInput(autoParams.bondLengths);
    setBondAnglesInput(autoParams.bondAngles);
    showToast(`Added ${needed} H atom${needed > 1 ? 's' : ''} to ${target.element}.`);
  };

  // Toggle radical on selected node
  const toggleSelectedNodeRadical = () => {
    if (!selectedNodeId) return;
    const updated: TopologyNode[] = nodes.map((n) =>
      n.id === selectedNodeId ? { ...n, radical: (n.radical ? 0 : 1) as 0 | 1 } : n
    );
    const autoParams = synthesizeDefaultsForNodesAndBonds(
      updated,
      bonds,
      bondLengthsInput,
      bondAnglesInput
    );
    setNodes(updated);
    setGeometry(autoParams.geometry);
    setHybridization(autoParams.hybridization);
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

    const autoParams = synthesizeDefaultsForNodesAndBonds(
      nextNodes,
      nextBonds,
      bondLengthsInput,
      bondAnglesInput
    );

    setNodes(nextNodes);
    setBonds(nextBonds);
    setSelectedNodeId(nextNodes[0]?.id || null);
    setName(autoParams.name);
    setFormula(autoParams.formula);
    setDescription(autoParams.description);
    setGeometry(autoParams.geometry);
    setHybridization(autoParams.hybridization);
    setBondLengthsInput(autoParams.bondLengths);
    setBondAnglesInput(autoParams.bondAngles);
  };

  const deleteSelectedBond = () => {
    if (!selectedBondId) return;
    const nextBonds = bonds.filter((b) => b.id !== selectedBondId);
    setBonds(nextBonds);
    setSelectedBondId(null);
  };

  // Listen to keyboard Delete / Backspace keys to remove selected atom or bond
  useEffect(() => {
    if (!builderOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);
      if (isInput) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault();
          deleteSelectedNode();
        } else if (selectedBondId) {
          e.preventDefault();
          deleteSelectedBond();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // ONE-CLICK AUTO-FILL (Fills recommended VSEPR geometry, bond lengths & angles)
  const handleFillRecommendedDefaults = () => {
    if (nodes.length === 0) {
      showToast('Please select an element from the periodic table to add atoms first.');
      return;
    }
    const autoParams = synthesizeDefaultsForNodesAndBonds(
      nodes,
      bonds,
      {},
      {}
    );
    setFormula(autoParams.formula);
    setName(autoParams.name);
    setDescription(autoParams.description);
    setGeometry(autoParams.geometry);
    setHybridization(autoParams.hybridization);
    setBondLengthsInput(autoParams.bondLengths);
    setBondAnglesInput(autoParams.bondAngles);
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
  ]);

  // Save the constructed molecule into the Zustand store
  const handleSaveMolecule = () => {
    if (nodes.length === 0) {
      showToast('Please add at least one atom to the structure.');
      return;
    }
    if (!connectedGraph) {
      showToast('All atoms in the molecule must be connected into a single structure.');
      return;
    }
    if (!geometry) {
      showToast('Please specify the Spatial Geometry (e.g. tetrahedral, linear).');
      return;
    }
    for (const bk of activeBondKeys) {
      if (!bondLengthsInput[bk] || Number(bondLengthsInput[bk]) <= 0) {
        showToast(`Please enter a valid bond length for ${bk}.`);
        return;
      }
    }
    for (const ak of activeAngleKeys) {
      if (!bondAnglesInput[ak] || Number(bondAnglesInput[ak]) <= 0) {
        showToast(`Please enter a valid bond angle for ${ak}.`);
        return;
      }
    }
    if (!currentDoc) {
      showToast('Invalid molecule configuration. Please check the parameter inputs.');
      return;
    }

    saveMoleculeDoc(currentDoc, editingMolId);
    showToast(`Saved substance ${currentDoc.formula} (${currentDoc.name}) successfully!`);
    closeBuilder();
  };

  // 3D Preview Three.js WebGL rendering
  const previewVpRef = useRef<HTMLDivElement | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const threeContextRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    root: THREE.Group;
    sphereGeo: THREE.SphereGeometry;
    cylinderGeo: THREE.CylinderGeometry;
    rotation: { x: number; y: number };
    zoom: { value: number };
    draw: () => void;
    resize: () => void;
    resetView: () => void;
    cleanup: () => void;
  } | null>(null);

  const setupThreePreview = useCallback(() => {
    const vp = previewVpRef.current;
    const wrap = previewWrapRef.current;
    if (!vp || !wrap) return;

    if (threeContextRef.current) {
      threeContextRef.current.cleanup();
      threeContextRef.current = null;
    }
    vp.replaceChildren();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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
    const dirLight = new THREE.DirectionalLight(0xfffdf5, 1.3);
    dirLight.position.set(-4, 7, 9);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.45);
    fillLight.position.set(7, -2, 5);
    scene.add(fillLight);

    const sphereGeo = new THREE.SphereGeometry(1, 36, 24);
    const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 16);

    const rotation = { x: 0.22, y: 0.38 };
    const zoom = { value: 1 };

    const draw = () => {
      root.rotation.set(rotation.x, rotation.y, 0);
      root.updateMatrixWorld(true);

      const inv = root.quaternion.clone().invert();
      const front = new THREE.Vector3(0, 0, 1).applyQuaternion(inv);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(inv);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(inv);

      root.traverse((obj) => {
        if (obj.userData?.isLabel) {
          const r = obj.userData.radius;
          obj.position.copy(obj.userData.basePos).addScaledVector(front, r + 0.02);
        } else if (obj.userData?.isRadicalDot) {
          const r = obj.userData.radius;
          obj.position
            .copy(obj.userData.basePos)
            .addScaledVector(right, r * 0.9)
            .addScaledVector(up, r * 0.9)
            .addScaledVector(front, 0.05);
        }
      });

      root.updateMatrixWorld(true);
      renderer.render(scene, camera);
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      renderer.setSize(w, h);
      const aspect = w / h;
      const halfH = Math.max(2.0, 3.1 / aspect) / zoom.value;
      camera.left = -halfH * aspect;
      camera.right = halfH * aspect;
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.updateProjectionMatrix();
      draw();
    };

    const resetView = () => {
      rotation.x = 0.22;
      rotation.y = 0.38;
      zoom.value = 1;
      setPreview3DZoomPct(100);
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
      zoom.value = Math.max(0.65, Math.min(2.5, zoom.value * Math.exp(-e.deltaY * 0.001)));
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

    const cleanup = () => {
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

    threeContextRef.current = {
      renderer,
      scene,
      camera,
      root,
      sphereGeo,
      cylinderGeo,
      rotation,
      zoom,
      draw,
      resize,
      resetView,
      cleanup,
    };
  }, []);

  // Update 3D scene whenever previewMol changes
  const updateThreeModel = useCallback((mol: any | null) => {
    const ctx = threeContextRef.current;
    if (!ctx) return;
    const { root, sphereGeo, cylinderGeo, draw, resize } = ctx;

    root.clear();

    if (!mol || !mol.atoms.length) {
      draw();
      return;
    }

    let cx = 0,
      cy = 0,
      cz = 0;
    for (const a of mol.atoms) {
      cx += a.position[0];
      cy += a.position[1];
      cz += a.position[2];
    }
    cx /= mol.atoms.length;
    cy /= mol.atoms.length;
    cz /= mol.atoms.length;

    const posMap = new Map<string, THREE.Vector3>();
    const elemMap = new Map<string, string>();
    const radicalSet = new Set(mol.radicals || []);

    for (const a of mol.atoms) {
      const v = new THREE.Vector3(a.position[0] - cx, a.position[1] - cy, a.position[2] - cz);
      posMap.set(a.id, v);
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
      mesh.position.copy(v);
      root.add(mesh);

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
      label.userData = { isLabel: true, basePos: v, radius };
      root.add(label);

      if (radicalSet.has(a.id) || a.radical === 1) {
        const dot = new THREE.Mesh(
          sphereGeo,
          new THREE.MeshBasicMaterial({ color: RADICAL_COLOR })
        );
        dot.scale.setScalar(0.08);
        dot.userData = { isRadicalDot: true, basePos: v, radius };
        root.add(dot);
      }
    }

    const axis = new THREE.Vector3(0, 1, 0);
    for (const b of mol.bonds) {
      const p1 = posMap.get(b.atoms[0]);
      const p2 = posMap.get(b.atoms[1]);
      if (!p1 || !p2) continue;
      const dir = p2.clone().sub(p1);
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
        m.position.copy(p1).lerp(p2, idx === 0 ? 0.25 : 0.75);
        m.quaternion.setFromUnitVectors(axis, dir.clone().normalize());
        m.scale.set(0.068, len / 2, 0.068);
        root.add(m);
      });
    }

    resize();
  }, []);

  const [previewWrapEl, setPreviewWrapEl] = useState<HTMLDivElement | null>(null);
  const [previewVpEl, setPreviewVpEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    previewWrapRef.current = previewWrapEl;
    previewVpRef.current = previewVpEl;
    if (previewWrapEl && previewVpEl && builderOpen) {
      setupThreePreview();
      updateThreeModel(previewMol);
    }
    return () => {
      if (threeContextRef.current) {
        threeContextRef.current.cleanup();
        threeContextRef.current = null;
      }
    };
  }, [previewWrapEl, previewVpEl, builderOpen, setupThreePreview, updateThreeModel, previewMol]);

  useEffect(() => {
    updateThreeModel(previewMol);
  }, [previewMol, updateThreeModel]);

  // 2D SVG ViewBox calculation
  const vbW = 500 / topoZoom;
  const vbH = 320 / topoZoom;
  const vbX = topoPan.x - (vbW - 500) / 2;
  const vbY = topoPan.y - (vbH - 320) / 2;

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const selectedBond = selectedBondId ? bonds.find((b) => b.id === selectedBondId) : null;

  return (
    <Dialog.Root open={builderOpen} onOpenChange={(open) => !open && closeBuilder()}>
      <Dialog.Portal>
        <Dialog.Overlay className="radix-dialog-overlay" />
        <Dialog.Content
          className="radix-dialog-content dialog-surface mol-builder-dialog"
          aria-describedby={undefined}
        >
          {/* Top Header: Title on left, Close on right */}
          <div className="dialog-header mol-builder-header">
            <div>
              <span className="small-label">INTERACTIVE MOLECULE BUILDER</span>
              <Dialog.Title asChild>
                <h2>{editingMolId ? 'Edit Chemical Substance' : 'Add Chemical Substance'}</h2>
              </Dialog.Title>
            </div>
            <div className="mol-builder-header-actions">
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
                    className="ptable-toggle-button"
                    onClick={() => setShowFullPeriodicTable((v) => !v)}
                    title={
                      showFullPeriodicTable
                        ? 'Collapse Periodic Table'
                        : 'Expand Full Periodic Table'
                    }
                    aria-label="Toggle Periodic Table"
                  >
                    <Grid size={15} />
                    <span>{showFullPeriodicTable ? 'Collapse Table' : 'Full Periodic Table'}</span>
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
                    {(
                      [
                        ['nonmetal', 'Reactive Nonmetals'],
                        ['noble-gas', 'Noble Gases'],
                        ['alkali-metal', 'Alkali Metals'],
                        ['alkaline-earth', 'Alkaline Earth'],
                        ['transition', 'Transition Metals'],
                        ['halogen', 'Halogens'],
                      ] as const
                    ).map(([cat, label]) => (
                      <button
                        key={cat}
                        type="button"
                        className={`ptable-cat-chip ${categoryFilter === cat ? 'active' : ''}`}
                        onClick={() => setCategoryFilter(cat as ElementCategory)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="ptable-grid">
                    {PERIODIC_TABLE.map((el) => {
                      const isDim =
                        categoryFilter !== 'all' && el.category !== categoryFilter;
                      return (
                        <button
                          key={el.number}
                          type="button"
                          className={`ptable-cell cat-${el.category} ${
                            activeElement === el.symbol ? 'selected' : ''
                          } ${isDim ? 'dimmed' : ''}`}
                          style={{
                            gridRow: el.period,
                            gridColumn: el.group,
                          }}
                          onClick={() => addAtomNode(el.symbol)}
                          title={`${el.name} (${el.symbol}) · Atomic No. ${el.number}`}
                        >
                          <span className="pt-num">{el.number}</span>
                          <span className="pt-sym">{el.symbol}</span>
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
              {/* Left Column: 2D Topology Canvas + Live 3D Preview */}
              <div className="builder-visual-col">
                <div className="builder-canvas-card">
                  <div className="builder-canvas-toolbar">
                    {selectedNode ? (
                      <div className="canvas-node-actions">
                        <span className="selected-node-badge">
                          <strong>{selectedNode.element}</strong>
                        </span>
                        <button
                          type="button"
                          className="canvas-mini-btn"
                          onClick={autoFillHydrogensForSelected}
                          title="Auto-fill Hydrogen atoms based on standard valence"
                        >
                          <span>+ H</span>
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
                          title="Delete selected atom (or press Del / Backspace)"
                          aria-label="Delete selected atom"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : selectedBond ? (
                      <div className="canvas-node-actions">
                        <span className="selected-node-badge">
                          Bond Order:
                        </span>
                        <div className="bond-order-pill-group">
                          {([1, 2, 3] as const).map((ord) => (
                            <button
                              key={ord}
                              type="button"
                              className={`bond-order-pill ${selectedBond.order === ord ? 'active' : ''}`}
                              onClick={() => connectOrSetBond(selectedBond.from, selectedBond.to, ord)}
                            >
                              {ord === 1 ? 'Single' : ord === 2 ? 'Double' : 'Triple'}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="canvas-mini-btn danger"
                          onClick={deleteSelectedBond}
                          title="Delete selected bond (or press Del / Backspace)"
                          aria-label="Delete selected bond"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="canvas-empty-state-hint">
                        <span>Click an atom to select · Drag its handle to link bonds</span>
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

                  {/* 2D Interactive Topology Canvas: Unified Click, Drag-to-Move, and Drag-to-Connect */}
                  <div
                    className="topology-canvas-wrap"
                    ref={svgWrapRef}
                    onWheel={(e) => {
                      e.preventDefault();
                      const factor = e.deltaY < 0 ? 1.1 : 0.9;
                      setTopoZoom((z) => Math.min(2.5, Math.max(0.4, Number((z * factor).toFixed(2)))));
                    }}
                  >
                    <svg
                      ref={svgRef}
                      className="topology-svg"
                      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                      onPointerDown={(e) => {
                        if (e.target === svgRef.current || (e.target as Element).tagName === 'rect') {
                          setSelectedBondId(null);
                          setSelectedNodeId(null);
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

                        if (dragLinkFromId) {
                          const pt = clientToSvgPoint(svgRef.current, e.clientX, e.clientY);
                          setDragLinkCursor(pt);
                        } else if (activePointerDownNodeRef.current) {
                          const dist = Math.hypot(
                            e.clientX - pointerDownPosRef.current.clientX,
                            e.clientY - pointerDownPosRef.current.clientY
                          );

                          // When dragging past threshold (> 6px): determine if it's node move or bond connection
                          if (dist > 6) {
                            const pt = clientToSvgPoint(svgRef.current, e.clientX, e.clientY);
                            if (e.shiftKey) {
                              // Shift + Drag: drag to connect bond
                              setDragLinkFromId(activePointerDownNodeRef.current.id);
                              setDragLinkCursor(pt);
                              isDraggingNodeRef.current = false;
                            } else {
                              // Default drag: move atom
                              isDraggingNodeRef.current = true;
                              const nextX = Math.round(pt.x + dragOffsetRef.current.dx);
                              const nextY = Math.round(pt.y + dragOffsetRef.current.dy);
                              setNodes((prev) =>
                                prev.map((n) =>
                                  n.id === activePointerDownNodeRef.current?.id
                                    ? { ...n, x: nextX, y: nextY }
                                    : n
                                )
                              );
                            }
                          }
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
                        activePointerDownNodeRef.current = null;
                        isDraggingNodeRef.current = false;
                        setDragLinkFromId(null);
                        setDragLinkCursor(null);
                        setIsPanning2D(false);
                      }}
                      onPointerCancel={() => {
                        activePointerDownNodeRef.current = null;
                        isDraggingNodeRef.current = false;
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
                              activePointerDownNodeRef.current = n;
                              pointerDownPosRef.current = { clientX: e.clientX, clientY: e.clientY };
                              isDraggingNodeRef.current = false;

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
                              }
                            }}
                            onPointerUp={(e) => {
                              e.stopPropagation();
                              // If we were dragging a link from another atom onto this one
                              if (dragLinkFromId && dragLinkFromId !== n.id) {
                                connectOrSetBond(dragLinkFromId, n.id);
                                setSelectedNodeId(n.id);
                              } else if (!isDraggingNodeRef.current) {
                                // Simple click: ONLY select target node, NEVER automatically create bond!
                                setSelectedNodeId(n.id);
                                setSelectedBondId(null);
                              }
                              activePointerDownNodeRef.current = null;
                              isDraggingNodeRef.current = false;
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
                            {isSelected && (
                              <g
                                className="topo-connect-handle"
                                transform={`translate(${r * 0.72 + 6}, ${-r * 0.72 - 6})`}
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  setDragLinkFromId(n.id);
                                  if (svgRef.current) {
                                    const pt = clientToSvgPoint(
                                      svgRef.current,
                                      e.clientX,
                                      e.clientY
                                    );
                                    setDragLinkCursor(pt);
                                  }
                                }}
                              >
                                <circle r="14" fill="transparent" />
                                <circle className="handle-dot" r="8.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                                <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
                                <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* Floating mini guide in canvas corner */}
                    <div className="canvas-floating-guide">
                      <span>Drag <b>+</b> to bond · Drag atom to move · Del to delete</span>
                    </div>

                    {/* 2D Zoom & Reset Controls */}
                    <div className="canvas-zoom-bar">
                      <button
                        type="button"
                        className="canvas-zoom-btn"
                        title="Zoom Out (2D)"
                        aria-label="Zoom Out 2D"
                        onClick={() => setTopoZoom((z) => Math.max(0.5, z * 0.85))}
                      >
                        <ZoomOut size={14} />
                      </button>
                      <span className="canvas-zoom-pct">{Math.round(topoZoom * 100)}%</span>
                      <button
                        type="button"
                        className="canvas-zoom-btn"
                        title="Zoom In (2D)"
                        aria-label="Zoom In 2D"
                        onClick={() => setTopoZoom((z) => Math.min(2.5, z * 1.18))}
                      >
                        <ZoomIn size={14} />
                      </button>
                      <button
                        type="button"
                        className="canvas-zoom-btn"
                        title="Reset 2D Canvas"
                        aria-label="Reset 2D Canvas"
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
                        <Sparkles size={28} />
                        <strong>Canvas is Empty</strong>
                        <span>
                          Click any element in the periodic table above to place atoms.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3D Real-time Ball-and-Stick Preview (Dynamic Equal Height) */}
                <div className="builder-3d-card" ref={setPreviewWrapEl}>
                  <div className="builder-3d-header">
                    <span>Live 3D Ball-and-Stick Model</span>
                    {previewMol && (
                      <span className="builder-3d-meta mono">
                        {previewMol.atoms.length} Atoms · {previewMol.bonds.length} Bonds
                      </span>
                    )}
                  </div>

                  <div className="builder-3d-stage-box">
                    <div
                      className="builder-3d-viewport"
                      ref={setPreviewVpEl}
                      tabIndex={0}
                      role="img"
                      aria-label="Interactive 3D Ball-and-Stick Model Preview"
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
                            onClick={() => {
                              const ctx = threeContextRef.current;
                              if (ctx) {
                                ctx.zoom.value = Math.max(0.65, ctx.zoom.value * 0.85);
                                setPreview3DZoomPct(Math.round(ctx.zoom.value * 100));
                                ctx.resize();
                              }
                            }}
                          >
                            <ZoomOut size={14} />
                          </button>
                          <span className="canvas-zoom-pct">{preview3DZoomPct}%</span>
                          <button
                            type="button"
                            className="canvas-zoom-btn"
                            title="Zoom In (3D)"
                            aria-label="Zoom In 3D"
                            onClick={() => {
                              const ctx = threeContextRef.current;
                              if (ctx) {
                                ctx.zoom.value = Math.min(2.5, ctx.zoom.value * 1.18);
                                setPreview3DZoomPct(Math.round(ctx.zoom.value * 100));
                                ctx.resize();
                              }
                            }}
                          >
                            <ZoomIn size={14} />
                          </button>
                          <button
                            type="button"
                            className="canvas-zoom-btn"
                            title="Reset 3D View"
                            aria-label="Reset 3D View"
                            onClick={() => threeContextRef.current?.resetView()}
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
                            : 'Complete parameters on the right or click "Auto-Fill" to generate the 3D model.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Parameters Configuration Form (with Auto-Fill in top right) */}
              <div className="builder-params-col">
                <div className="builder-params-top">
                  <div>
                    <h3>2. Structure & Bond Parameters</h3>
                    <p>Adjust spatial geometry, hybridization, and bond parameters</p>
                  </div>
                  <button
                    type="button"
                    id="builder-autofill-defaults-btn"
                    className="autofill-defaults-btn"
                    onClick={handleFillRecommendedDefaults}
                    title="Auto-fill recommended VSEPR geometry, hybridization, bond lengths, and angles"
                  >
                    <Sparkles size={15} />
                    <span>Auto-Fill</span>
                  </button>
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
                            <option value="">Select Spatial Geometry…</option>
                            {GEOMETRY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="select-chevron" />
                        </div>
                      </label>
                      <label className="param-field">
                        <span>Central Hybridization (hybridization)</span>
                        <div className="select-wrapper">
                          <select
                            value={hybridization}
                            onChange={(e) => setHybridization(e.target.value)}
                          >
                            <option value="">Select Hybridization…</option>
                            {HYBRIDIZATION_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="select-chevron" />
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Covalent Bond Lengths (Å) */}
                  <div className="param-group-card">
                    <div className="param-group-title">
                      <span>Bond Lengths (bondLengths · in Å) *</span>
                    </div>
                    {activeBondKeys.length === 0 ? (
                      <div className="param-empty-hint">
                        Single monatomic radical species do not require covalent bond lengths.
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
                              max="4.0"
                              placeholder="e.g. 1.087 or 1.4"
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
              </div>
            </div>
          </div>

          {/* Fixed Modal Bottom Bar: Cancel on left, Save on right */}
          <footer className="mol-builder-fixed-footer">
            <div className="mol-builder-footer-inner">
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
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
