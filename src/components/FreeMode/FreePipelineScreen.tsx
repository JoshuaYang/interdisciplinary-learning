import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Edit3, Package, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useFreeChemStore } from '../../store/useFreeChemStore';
import { useChemStore } from '../../store/useChemStore';
import type { FreeMoleculeItem } from '../../engine/freeReactionEngine';
import { ConfirmModal } from '../Common/ConfirmModal';

interface DraggableMolChipProps {
  item: FreeMoleculeItem;
  isSelected: boolean;
  onSelect: () => void;
}

const DraggableMolChip: React.FC<DraggableMolChipProps> = ({
  item,
  isSelected,
  onSelect,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `free-pool-${item.id}`,
    data: { molId: item.id },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className={`mol-chip ${isSelected ? 'selected-for-place' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      data-mol-id={item.id}
      onClick={onSelect}
    >
      <span
        className="mol-chip-formula"
        dangerouslySetInnerHTML={{ __html: item.formulaHtml }}
      />
      <span className="mol-chip-name">{item.mol.name}</span>
    </div>
  );
};

interface FreeDropZoneProps {
  stageId: string;
  role: 'reactants' | 'products';
  titleText: string;
  particles: string[];
  moleculesMap: Map<string, FreeMoleculeItem>;
}

const FreeDropZone: React.FC<FreeDropZoneProps> = ({
  stageId,
  role,
  titleText,
  particles,
  moleculesMap,
}) => {
  const selectedPoolMolId = useFreeChemStore((s) => s.selectedPoolMolId);
  const addMolToStageZone = useFreeChemStore((s) => s.addMolToStageZone);
  const removeMolFromStageZone = useFreeChemStore((s) => s.removeMolFromStageZone);
  const [nativeDragOver, setNativeDragOver] = useState(false);

  const { isOver, setNodeRef } = useDroppable({
    id: `free-zone:${stageId}:${role}`,
    data: { stageId, role },
  });

  const activeOver = isOver || nativeDragOver;

  return (
    <div
      ref={setNodeRef}
      className={`pipeline-dropzone ${activeOver ? 'dragover' : ''}`}
      data-stage-id={stageId}
      data-role={role}
      onDragOver={(e) => {
        e.preventDefault();
        setNativeDragOver(true);
      }}
      onDragLeave={() => setNativeDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setNativeDragOver(false);
        const molId = e.dataTransfer?.getData('text/plain');
        if (molId && moleculesMap.has(molId)) {
          addMolToStageZone(stageId, role, molId);
        }
      }}
      onClick={() => {
        if (selectedPoolMolId && moleculesMap.has(selectedPoolMolId)) {
          addMolToStageZone(stageId, role, selectedPoolMolId);
        }
      }}
    >
      <div className="dropzone-header">
        <span className="dropzone-title">{titleText}</span>
        <span className="dropzone-count">
          {particles.length
            ? `${particles.length} substance${particles.length > 1 ? 's' : ''}`
            : 'Empty'}
        </span>
      </div>

      <div className="dropzone-particles">
        <AnimatePresence mode="popLayout">
          {particles.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="dropzone-empty-prompt"
            >
              <span className="dropzone-empty-icon">＋</span>
              <span>Drag from the substance pool above or click to place</span>
            </motion.div>
          ) : (
            particles.map((molId, itemIdx) => {
              const item = moleculesMap.get(molId);
              return (
                <motion.div
                  key={`${molId}-${itemIdx}`}
                  layout
                  initial={{ scale: 0.82, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="dropzone-particle-item"
                >
                  <span
                    className="particle-formula"
                    dangerouslySetInnerHTML={{
                      __html: item ? item.formulaHtml : molId,
                    }}
                  />
                  <span className="particle-name">{item ? item.mol.name : ''}</span>
                  <button
                    type="button"
                    className="particle-remove-btn"
                    title="Remove this substance"
                    aria-label="Remove this substance"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMolFromStageZone(stageId, role, itemIdx);
                    }}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const FreePipelineScreen: React.FC = () => {
  const molecules = useFreeChemStore((s) => s.molecules);
  const stages = useFreeChemStore((s) => s.stages);
  const activeStageTab = useFreeChemStore((s) => s.activeStageTab);
  const selectedPoolMolId = useFreeChemStore((s) => s.selectedPoolMolId);

  const setActiveStageTab = useFreeChemStore((s) => s.setActiveStageTab);
  const setSelectedPoolMolId = useFreeChemStore((s) => s.setSelectedPoolMolId);
  const addStage = useFreeChemStore((s) => s.addStage);
  const removeStage = useFreeChemStore((s) => s.removeStage);
  const renameStage = useFreeChemStore((s) => s.renameStage);
  const addMolToStageZone = useFreeChemStore((s) => s.addMolToStageZone);
  const clearCurrentStageZones = useFreeChemStore((s) => s.clearCurrentStageZones);
  const setScreen = useFreeChemStore((s) => s.setScreen);
  const enterStage = useFreeChemStore((s) => s.enterStage);
  const showToast = useChemStore((s) => s.showToast);

  const [activeDragMolId, setActiveDragMolId] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [stageToDelete, setStageToDelete] = useState<{ id: string; name: string } | null>(null);

  const moleculesMap = new Map<string, FreeMoleculeItem>(
    molecules.map((m) => [m.id, m])
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const molId = event.active.data.current?.molId as string | undefined;
    if (molId) setActiveDragMolId(molId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragMolId(null);
    const molId = event.active.data.current?.molId as string | undefined;
    const overData = event.over?.data.current as
      | { stageId: string; role: 'reactants' | 'products' }
      | undefined;

    if (molId && overData) {
      addMolToStageZone(overData.stageId, overData.role, molId);
    }
  };

  const handleClearCurrentStageWithConfirm = () => {
    setConfirmClearOpen(true);
  };

  const currentStage = stages[activeStageTab] || stages[0];
  const activeDragItem = activeDragMolId ? moleculesMap.get(activeDragMolId) : null;

  return (
    <section
      id="free-pipeline-screen"
      className="pipeline-screen has-fixed-bottom-bar"
      aria-label="Reaction Stage Orchestration"
    >
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="pipeline-container">
          <div className="pipeline-header">
            <div>
              <span className="small-label">STEP 2 / 3 · STAGE ORCHESTRATION</span>
              <h2>Orchestrate Reaction Stages</h2>
              <p className="pipeline-subtitle">
                Add, rename, or remove reaction stages freely, and assign reactants and products for each stage.
              </p>
            </div>
            <div className="pipeline-header-actions">
              <button
                type="button"
                className="toolbar-icon-btn danger-icon-btn"
                title="Clear current stage reactants & products"
                aria-label="Clear current stage"
                onClick={handleClearCurrentStageWithConfirm}
              >
                <RotateCcw size={17} />
              </button>
            </div>
          </div>

          {/* Top Available Substance Pool */}
          <div className="molecule-pool-card">
            <div className="pool-title">
              <span>
                <Package
                  size={18}
                  style={{ display: 'inline', verticalAlign: '-3px', marginRight: 7 }}
                />
                Available Chemical Substance Pool
              </span>
              <small>Drag or click a substance to place it into "Reactants" or "Products" below</small>
            </div>
            <div className="molecule-chips">
              {molecules.length === 0 ? (
                <div className="pool-empty-hint">
                  No chemical substances yet. Please return to Step 1 to build or upload molecules.
                </div>
              ) : (
                molecules.map((item) => (
                  <DraggableMolChip
                    key={item.id}
                    item={item}
                    isSelected={selectedPoolMolId === item.id}
                    onSelect={() => {
                      if (selectedPoolMolId === item.id) {
                        setSelectedPoolMolId(null);
                      } else {
                        setSelectedPoolMolId(item.id);
                        showToast(
                          `Selected ${item.mol.name} (${item.mol.formula}). Click "Reactants" or "Products" below to place it.`
                        );
                      }
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Integrated Stage Assembly Studio Card */}
          {currentStage && (
            <div className="pipeline-active-stage">
              <div className="pipeline-track-card">
                {/* Stage Tabs Bar (Integrated at top of card) */}
                <div className="stage-bar-header">
                  <div className="stage-pills-track" role="tablist" aria-label="Reaction Stages">
                    {stages.map((st, idx) => (
                      <button
                        key={st.id}
                        type="button"
                        role="tab"
                        aria-selected={idx === activeStageTab}
                        className={`stage-pill-tab ${idx === activeStageTab ? 'active' : ''}`}
                        onClick={() => setActiveStageTab(idx)}
                      >
                        <span className="tab-badge">{idx + 1}</span>
                        <span>{st.name || `Stage ${idx + 1}`}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="stage-add-pill-btn"
                    onClick={() => addStage()}
                    title="Add a new reaction stage"
                  >
                    <Plus size={16} />
                    <span>Add Stage</span>
                  </button>
                </div>

                <div className="track-header free-track-header">
                  <div className="stage-name-editor">
                    <Edit3 size={16} className="stage-name-icon" />
                    <label htmlFor="free-stage-name-input" className="stage-name-label">
                      Stage Name:
                    </label>
                    <input
                      id="free-stage-name-input"
                      type="text"
                      className="stage-name-input"
                      value={currentStage.name}
                      placeholder="Enter stage name…"
                      onChange={(e) => renameStage(currentStage.id, e.target.value)}
                    />
                  </div>
                  {stages.length > 1 && (
                    <button
                      type="button"
                      className="stage-delete-btn"
                      title="Delete stage"
                      aria-label="Delete stage"
                      onClick={() =>
                        setStageToDelete({
                          id: currentStage.id,
                          name: currentStage.name || 'this reaction stage',
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Integrated Reaction Chamber Tunnel */}
                <div className="track-flow">
                  <FreeDropZone
                    stageId={currentStage.id}
                    role="reactants"
                    titleText="Reactants (Before Reaction)"
                    particles={currentStage.reactants}
                    moleculesMap={moleculesMap}
                  />
                  <div className="track-arrow-zone">
                    <span className="track-conduit-pill">Reaction</span>
                    <div className="track-arrow-circle" aria-hidden="true">
                      <ArrowRight size={20} />
                    </div>
                  </div>
                  <FreeDropZone
                    stageId={currentStage.id}
                    role="products"
                    titleText="Products (After Reaction)"
                    particles={currentStage.products}
                    moleculesMap={moleculesMap}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Full-Width Fixed Bottom Step Bar */}
        <div className="fixed-bottom-bar">
          <div className="fixed-bottom-bar-inner">
            <div className="fixed-bottom-left">
              <button
                type="button"
                className="toolbar-btn-outline"
                onClick={() => setScreen('gate')}
              >
                <ArrowLeft size={17} />
                <span>Previous</span>
              </button>
            </div>
            <div className="fixed-bottom-right">
              <button
                id="free-enter-stage-btn"
                type="button"
                className="primary-button enter-stage-btn"
                onClick={enterStage}
              >
                <span>Next</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Disable dropAnimation so the dragged chip does NOT fly back to the pool on release */}
        <DragOverlay dropAnimation={null}>
          {activeDragItem ? (
            <div
              className="mol-chip selected-for-place"
              style={{ boxShadow: '0 12px 28px rgba(15, 23, 42, 0.2)' }}
            >
              <span
                className="mol-chip-formula"
                dangerouslySetInnerHTML={{ __html: activeDragItem.formulaHtml }}
              />
              <span className="mol-chip-name">{activeDragItem.mol.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <ConfirmModal
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        title="Clear Current Stage?"
        description="Are you sure you want to clear all placed reactants and products in this stage? This cannot be undone."
        confirmLabel="Clear Stage"
        danger={true}
        onConfirm={clearCurrentStageZones}
      />
      <ConfirmModal
        open={Boolean(stageToDelete)}
        onOpenChange={(open) => !open && setStageToDelete(null)}
        title="Delete Reaction Stage?"
        description={`Are you sure you want to delete "${stageToDelete?.name || ''}"? This action cannot be undone.`}
        confirmLabel="Delete Stage"
        danger={true}
        onConfirm={() => {
          if (stageToDelete) {
            removeStage(stageToDelete.id);
            setStageToDelete(null);
          }
        }}
      />
    </section>
  );
};
