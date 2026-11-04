import React, { useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  Box,
  CheckCircle2,
  CircleDashed,
  Edit3,
  Info,
  RotateCcw,
} from 'lucide-react';
import { useChemStore, REQUIRED_SLOTS } from '../../store/useChemStore';
import { MoleculePreviewModal } from './MoleculePreviewModal';
import { MoleculeBuilderModal } from '../FreeMode/MoleculeBuilderModal';
import { ConfirmModal } from '../Common/ConfirmModal';

export const GateScreen: React.FC = () => {
  const slotState = useChemStore((s) => s.slotState);
  const setPreviewSlotId = useChemStore((s) => s.setPreviewSlotId);
  const openBuilderForSlot = useChemStore((s) => s.openBuilderForSlot);
  const enterPipelineFromGate = useChemStore((s) => s.enterPipelineFromGate);

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const validCount = REQUIRED_SLOTS.filter((s) => slotState[s.id]?.status === 'valid').length;

  return (
    <Tooltip.Provider delayDuration={140}>
      <section
        id="gate-screen"
        className="gate-screen has-fixed-bottom-bar"
        aria-label="Molecule Structure Configuration & Verification"
      >
        <div className="gate-container">
          <div className="gate-header">
            <div>
              <span className="small-label">STEP 1 / 3 · MOLECULE CONFIGURATION</span>
              <h2>Configure & Verify Molecular Structures</h2>
              <p className="pipeline-subtitle" style={{ marginTop: 4, marginBottom: 0 }}>
                Build each chemical structure visually on the interactive canvas. Parameters will be automatically verified against reaction requirements.
              </p>
            </div>
            <div className="gate-actions-toolbar">
              <button
                type="button"
                className="toolbar-icon-btn danger-icon-btn"
                title="Reset molecular configurations"
                aria-label="Reset configurations"
                onClick={() => setConfirmResetOpen(true)}
              >
                <RotateCcw size={17} />
              </button>
            </div>
          </div>

          {/* 6 Molecule Visual Configuration Cards */}
          <div className="gate-grid" id="gate-card-grid">
            {REQUIRED_SLOTS.map((slot, idx) => {
              const state = slotState[slot.id] || {
                status: 'empty',
                doc: null,
                mol: null,
                error: null,
                warnings: [],
              };
              const isValid = state.status === 'valid';
              const isError = state.status === 'error';
              const doc = state.doc || {};
              const mol = state.mol;

              const bondLengths = doc.bondLengths ? Object.entries(doc.bondLengths) : [];
              const bondAngles = doc.bondAngles ? Object.entries(doc.bondAngles) : [];

              return (
                <motion.div
                  key={slot.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: idx * 0.04 }}
                  className={`gate-card status-${state.status}`}
                  data-id={slot.id}
                >
                  {/* Row 1: Number + Status & Hover Specs Trigger */}
                  <div className="gate-card-top">
                    <span className="gate-card-num mono">NO.{slot.num}</span>
                    <div className="gate-card-top-right">
                      {isValid && (
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <button
                              type="button"
                              className="card-mini-icon-btn"
                              title="Quick Specifications"
                              aria-label="Hover to view molecular parameters"
                              onClick={() => setPreviewSlotId(slot.id)}
                            >
                              <Info size={15} />
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              className="mol-hover-card"
                              side="top"
                              align="end"
                              sideOffset={8}
                            >
                              <div className="mol-hover-head">
                                <strong>{slot.name}</strong>
                                <span
                                  className="mol-hover-formula"
                                  dangerouslySetInnerHTML={{
                                    __html: mol?.formula || slot.formulaHtml,
                                  }}
                                />
                              </div>
                              <div className="mol-hover-rows">
                                <div className="mol-hover-row">
                                  <span>Geometry</span>
                                  <strong>{mol?.geometry || '-'}</strong>
                                </div>
                                <div className="mol-hover-row">
                                  <span>Hybridization</span>
                                  <strong className="mono">
                                    {doc.hybridization && doc.hybridization !== 'none'
                                      ? doc.hybridization
                                      : 'None'}
                                  </strong>
                                </div>
                                {bondLengths.map(([k, v]) => (
                                  <div key={k} className="mol-hover-row">
                                    <span>Bond Length ({k})</span>
                                    <strong className="mono">{String(v)} Å</strong>
                                  </div>
                                ))}
                                {bondAngles.map(([k, v]) => (
                                  <div key={k} className="mol-hover-row">
                                    <span>Bond Angle ({k})</span>
                                    <strong className="mono">{String(v)}°</strong>
                                  </div>
                                ))}
                                {mol?.radicals && mol.radicals.length > 0 && (
                                  <div className="mol-hover-row">
                                    <span>Unpaired Electrons</span>
                                    <strong>{mol.radicals.length} (Radical)</strong>
                                  </div>
                                )}
                              </div>
                              {(mol?.description || doc.description) && (
                                <p className="mol-hover-desc">
                                  {mol?.description || doc.description}
                                </p>
                              )}
                              <Tooltip.Arrow className="mol-hover-arrow" />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      )}

                      <span className="gate-status-pill">
                        {isValid ? (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Verified</span>
                          </>
                        ) : isError ? (
                          <>
                            <AlertCircle size={14} />
                            <span>Invalid</span>
                          </>
                        ) : (
                          <>
                            <CircleDashed size={14} />
                            <span>Pending</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Formula + Name + Geometry */}
                  <div className="gate-card-center">
                    <div
                      className="gate-formula"
                      dangerouslySetInnerHTML={{
                        __html: mol?.formula || slot.formulaHtml,
                      }}
                    />
                    <div className="gate-meta-row">
                      <span className="gate-name">{slot.name}</span>
                      {isValid && mol?.geometry && (
                        <span className="gate-geometry-pill">{mol.geometry}</span>
                      )}
                    </div>
                    {isError && (
                      <div className="gate-error-text">
                        {state.error || 'Configuration verification failed'}
                      </div>
                    )}
                  </div>

                  {/* Row 3: Visual Action Buttons (No JSON Upload) */}
                  <div className="gate-card-actions">
                    {isValid ? (
                      <>
                        <button
                          type="button"
                          className="gate-action-btn secondary"
                          title="Edit molecular structure visually"
                          onClick={() => openBuilderForSlot(slot.id)}
                        >
                          <Edit3 size={15} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="gate-action-btn primary"
                          title="Inspect 3D ball-and-stick model"
                          onClick={() => setPreviewSlotId(slot.id)}
                        >
                          <Box size={16} />
                          <span>3D View</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="gate-action-btn primary upload-full"
                        title="Open visual canvas to build this molecular structure"
                        onClick={() => openBuilderForSlot(slot.id)}
                      >
                        <Edit3 size={16} />
                        <span>{isError ? 'Modify Structure' : 'Configure Structure'}</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Fixed Full-Width Bottom Step Bar */}
        <div className="fixed-bottom-bar">
          <div className="fixed-bottom-bar-inner">
            <div className="gate-progress-info">
              <div className="gate-progress-track">
                <div
                  id="gate-progress-bar"
                  className="gate-progress-bar"
                  style={{ width: `${(validCount / 6) * 100}%` }}
                />
              </div>
              <span id="gate-progress-text">
                Verified <strong className="mono">{validCount}</strong> / 6
              </span>
            </div>
            <button
              id="enter-stage-btn"
              type="button"
              className="primary-button enter-stage-btn"
              disabled={validCount !== 6}
              onClick={enterPipelineFromGate}
            >
              <span id="enter-btn-text">
                {validCount === 6 ? 'Next' : `Next (${validCount}/6)`}
              </span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Universal 2D/3D Molecule Builder Modal */}
        <MoleculeBuilderModal />

        {/* 3D Structure Preview Modal */}
        <MoleculePreviewModal />

        {/* Reset Confirmation Modal */}
        <ConfirmModal
          open={confirmResetOpen}
          onOpenChange={setConfirmResetOpen}
          title="Reset All Configurations?"
          description="Are you sure you want to reset all molecular configurations back to initial status?"
          confirmLabel="Reset All"
          onConfirm={() => {
            const emptySlots: Record<string, any> = {};
            REQUIRED_SLOTS.forEach((s) => {
              emptySlots[s.id] = { status: 'empty', doc: null, mol: null, error: null, warnings: [] };
            });
            useChemStore.setState({ slotState: emptySlots });
            setConfirmResetOpen(false);
          }}
        />
      </section>
    </Tooltip.Provider>
  );
};
