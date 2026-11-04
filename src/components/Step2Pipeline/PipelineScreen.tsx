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
import { AlertTriangle, ArrowLeft, ArrowRight, Package, RotateCcw, X } from 'lucide-react';
import {
  useChemStore,
  POOL_MOLECULES,
  type SlotDef,
} from '../../store/useChemStore';
import { PIPELINE_STEPS, verifyStage } from '../../engine/deduction';
import { ConfirmModal } from '../Common/ConfirmModal';

interface DraggablePoolChipProps {
  slot: SlotDef;
  isSelected: boolean;
  onSelect: () => void;
}

const DraggablePoolChip: React.FC<DraggablePoolChipProps> = ({
  slot,
  isSelected,
  onSelect,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool-${slot.id}`,
    data: { molId: slot.id },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', slot.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className={`mol-chip ${isSelected ? 'selected-for-place' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      data-mol-id={slot.id}
      onClick={onSelect}
    >
      <span
        className="mol-chip-formula"
        dangerouslySetInnerHTML={{ __html: slot.formulaHtml }}
      />
      <span className="mol-chip-name">{slot.name}</span>
    </div>
  );
};

interface DropZoneProps {
  stageId: string;
  role: 'reactants' | 'products';
  titleText: string;
  reactionIndex?: number | null;
  particles: string[];
}

const DropZone: React.FC<DropZoneProps> = ({
  stageId,
  role,
  titleText,
  reactionIndex = null,
  particles,
}) => {
  const selectedPoolMol = useChemStore((s) => s.selectedPoolMol);
  const addParticleToZone = useChemStore((s) => s.addParticleToZone);
  const removeParticleFromZone = useChemStore((s) => s.removeParticleFromZone);
  const [nativeDragOver, setNativeDragOver] = useState(false);

  const droppableId =
    reactionIndex !== null
      ? `zone:${stageId}:${role}:${reactionIndex}`
      : `zone:${stageId}:${role}`;

  const { isOver, setNodeRef } = useDroppable({
    id: droppableId,
    data: { stageId, role, reactionIndex },
  });

  const activeOver = isOver || nativeDragOver;

  return (
    <div
      ref={setNodeRef}
      className={`pipeline-dropzone ${activeOver ? 'dragover' : ''}`}
      data-stage-id={stageId}
      data-role={role}
      data-reaction-index={reactionIndex !== null ? String(reactionIndex) : undefined}
      onDragOver={(e) => {
        e.preventDefault();
        setNativeDragOver(true);
      }}
      onDragLeave={() => setNativeDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setNativeDragOver(false);
        const molId = e.dataTransfer?.getData('text/plain');
        if (molId && POOL_MOLECULES.some((s) => s.id === molId)) {
          addParticleToZone(stageId, role, molId, reactionIndex);
        }
      }}
      onClick={() => {
        if (selectedPoolMol) {
          addParticleToZone(stageId, role, selectedPoolMol, reactionIndex);
        }
      }}
    >
      <div className="dropzone-header">
        <span className="dropzone-title">{titleText}</span>
        <span className="dropzone-count">
          {particles.length
            ? `${particles.length} species`
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
              <span>Drag from the species pool above or click to place</span>
            </motion.div>
          ) : (
            particles.map((molId, itemIdx) => {
              const molMeta = POOL_MOLECULES.find((s) => s.id === molId);
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
                      __html: molMeta ? molMeta.formulaHtml : molId,
                    }}
                  />
                  <span className="particle-name">{molMeta ? molMeta.name : ''}</span>
                  <button
                    type="button"
                    className="particle-remove-btn"
                    title="Remove species"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeParticleFromZone(stageId, role, itemIdx, reactionIndex);
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

export const PipelineScreen: React.FC = () => {
  const pipelineData = useChemStore((s) => s.pipelineData);
  const selectedPoolMol = useChemStore((s) => s.selectedPoolMol);
  const activePipelineTab = useChemStore((s) => s.activePipelineTab);
  const pipelineVerified = useChemStore((s) => s.pipelineVerified);
  const pipelineFeedback = useChemStore((s) => s.pipelineFeedback);
  const setSelectedPoolMol = useChemStore((s) => s.setSelectedPoolMol);
  const setActivePipelineTab = useChemStore((s) => s.setActivePipelineTab);
  const addParticleToZone = useChemStore((s) => s.addParticleToZone);
  const resetPipeline = useChemStore((s) => s.resetPipeline);
  const returnToGateFromPipeline = useChemStore((s) => s.returnToGateFromPipeline);
  const submitPipelineAndEnterStage = useChemStore((s) => s.submitPipelineAndEnterStage);
  const showToast = useChemStore((s) => s.showToast);

  const [activeDragMolId, setActiveDragMolId] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

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
      | { stageId: string; role: 'reactants' | 'products'; reactionIndex?: number | null }
      | undefined;

    if (molId && overData) {
      addParticleToZone(overData.stageId, overData.role, molId, overData.reactionIndex ?? null);
    }
  };

  const handleResetPipelineWithConfirm = () => {
    setConfirmResetOpen(true);
  };

  const currentStep = PIPELINE_STEPS[activePipelineTab] || PIPELINE_STEPS[0];
  const activeDragSlot = activeDragMolId
    ? POOL_MOLECULES.find((s) => s.id === activeDragMolId)
    : null;

  return (
    <section
      id="pipeline-screen"
      className="pipeline-screen has-fixed-bottom-bar"
      aria-label="Reaction Pathway Assembly"
    >
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="pipeline-container">
          <div className="pipeline-header">
            <div>
              <span className="small-label">STEP 2 / 3 · REACTION ASSEMBLY</span>
              <h2>Assemble Reaction Pathway</h2>
              <p className="pipeline-subtitle">
                Drag species from the pool above (or click to place) to assemble chain initiation, propagation, and termination stages.
              </p>
            </div>
            <div className="pipeline-header-actions">
              <button
                id="pipeline-reset-btn"
                type="button"
                className="toolbar-icon-btn danger-icon-btn"
                title="Clear all stages"
                aria-label="Clear all stages"
                onClick={handleResetPipelineWithConfirm}
              >
                <RotateCcw size={17} />
              </button>
            </div>
          </div>

          {/* Available Species Pool */}
          <div className="molecule-pool-card">
            <div className="pool-title">
              <span>
                <Package
                  size={18}
                  style={{ display: 'inline', verticalAlign: '-3px', marginRight: 7 }}
                />
                Available Species Pool
              </span>
            </div>
            <div className="molecule-chips" id="molecule-chips">
              {POOL_MOLECULES.map((slot) => (
                <DraggablePoolChip
                  key={slot.id}
                  slot={slot}
                  isSelected={selectedPoolMol === slot.id}
                  onSelect={() => {
                    if (selectedPoolMol === slot.id) {
                      setSelectedPoolMol(null);
                    } else {
                      setSelectedPoolMol(slot.id);
                      showToast(
                        `Selected ${slot.name} (${slot.formula}). Click "Reactants" or "Products" below to place it.`
                      );
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Active Stage Workspace */}
          <div className="pipeline-active-stage" id="pipeline-active-stage">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="pipeline-track-card"
            >
              {/* Integrated Stage Tabs Bar */}
              <div className="stage-bar-header">
                <div className="stage-pills-track" id="pipeline-tabs-nav" role="tablist">
                  {PIPELINE_STEPS.map((step, idx) => {
                    const stageObj =
                      pipelineData[step.id] ||
                      (step.isMultiReaction ? { reactions: [] } : { reactants: [], products: [] });
                    let badgeContent = String(idx + 1);
                    let statusClass = '';

                    if (pipelineVerified) {
                      const check = verifyStage(step.id, stageObj);
                      if (check.ok) {
                        statusClass = 'is-valid';
                        badgeContent = '✓';
                      } else {
                        statusClass = 'is-invalid';
                        badgeContent = '!';
                      }
                    }

                    return (
                      <button
                        key={step.id}
                        type="button"
                        role="tab"
                        aria-selected={idx === activePipelineTab}
                        className={`stage-pill-tab ${idx === activePipelineTab ? 'active' : ''} ${statusClass}`}
                        onClick={() => setActivePipelineTab(idx)}
                      >
                        <span className="tab-badge">{badgeContent}</span>
                        <span>{step.phaseName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="track-header">
                <div className="track-header-left">
                  <span className="track-summary">{currentStep.summary}</span>
                </div>
                <span className="track-condition-pill">Condition: {currentStep.condition}</span>
              </div>

              {currentStep.isMultiReaction ? (
                <div className="track-multi-list">
                  {[0, 1, 2].map((rIdx) => {
                    const row = pipelineData[currentStep.id]?.reactions?.[rIdx] || {
                      reactants: [],
                      products: [],
                    };
                    return (
                      <div key={rIdx} className="track-multi-row">
                        <div className="track-multi-row-badge">Path {rIdx + 1}</div>
                        <div className="track-flow track-flow-compact">
                          <DropZone
                            stageId={currentStep.id}
                            role="reactants"
                            titleText={`Path ${rIdx + 1} · Reactant Radicals`}
                            reactionIndex={rIdx}
                            particles={row.reactants || []}
                          />
                          <div className="track-arrow-zone">
                            <span className="track-condition-tag">Coupling</span>
                            <div className="track-arrow-circle" aria-hidden="true">
                              <ArrowRight size={18} />
                            </div>
                          </div>
                          <DropZone
                            stageId={currentStep.id}
                            role="products"
                            titleText={`Path ${rIdx + 1} · Products`}
                            reactionIndex={rIdx}
                            particles={row.products || []}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="track-flow">
                  <DropZone
                    stageId={currentStep.id}
                    role="reactants"
                    titleText="Reactants (Click or Drag Species)"
                    particles={pipelineData[currentStep.id]?.reactants || []}
                  />
                  <div className="track-arrow-zone">
                    <span className="track-condition-tag">{currentStep.condition}</span>
                    <div className="track-arrow-circle" aria-hidden="true">
                      <ArrowRight size={20} />
                    </div>
                  </div>
                  <DropZone
                    stageId={currentStep.id}
                    role="products"
                    titleText="Products (Click or Drag Species)"
                    particles={pipelineData[currentStep.id]?.products || []}
                  />
                </div>
              )}
            </motion.div>
          </div>

          {/* Validation Feedback Card */}
          {pipelineFeedback && !pipelineFeedback.ok && (
            <motion.div
              id="pipeline-feedback"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="pipeline-feedback error"
            >
              <span className="pipeline-feedback-icon" aria-hidden="true">
                <AlertTriangle size={22} />
              </span>
              <div className="pipeline-feedback-content">
                <span className="pipeline-feedback-title">Pathway Verification Failed · Please Review</span>
                <span className="pipeline-feedback-text">{pipelineFeedback.hint}</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Fixed Full-Width Bottom Step Bar */}
        <div className="fixed-bottom-bar">
          <div className="fixed-bottom-bar-inner">
            <div className="fixed-bottom-left">
              <button
                id="pipeline-return-gate-btn"
                type="button"
                className="toolbar-btn-outline"
                onClick={returnToGateFromPipeline}
              >
                <ArrowLeft size={17} />
                <span>Previous</span>
              </button>
            </div>
            <div className="fixed-bottom-right">
              <button
                id="pipeline-submit-btn"
                type="button"
                className="primary-button enter-stage-btn"
                onClick={submitPipelineAndEnterStage}
              >
                <span>Next</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Disable dropAnimation so the dragged chip does NOT fly back to the pool on release */}
        <DragOverlay dropAnimation={null}>
          {activeDragSlot ? (
            <div
              className="mol-chip selected-for-place"
              style={{ boxShadow: '0 12px 28px rgba(35, 55, 45, 0.22)' }}
            >
              <span
                className="mol-chip-formula"
                dangerouslySetInnerHTML={{ __html: activeDragSlot.formulaHtml }}
              />
              <span className="mol-chip-name">{activeDragSlot.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <ConfirmModal
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="Reset Reaction Stages?"
        description="Are you sure you want to clear all placed chemical species across all stages? This action cannot be undone."
        confirmLabel="Reset All"
        danger={true}
        onConfirm={resetPipeline}
      />
    </section>
  );
};
