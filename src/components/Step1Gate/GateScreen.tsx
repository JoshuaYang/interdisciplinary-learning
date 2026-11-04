import React, { useRef, useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  Box,
  CheckCircle2,
  CircleDashed,
  Info,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { useChemStore, REQUIRED_SLOTS } from '../../store/useChemStore';
import { MoleculePreviewModal } from './MoleculePreviewModal';

export const GateScreen: React.FC = () => {
  const slotState = useChemStore((s) => s.slotState);
  const processFiles = useChemStore((s) => s.processFiles);
  const setPreviewSlotId = useChemStore((s) => s.setPreviewSlotId);
  const enterPipelineFromGate = useChemStore((s) => s.enterPipelineFromGate);

  const batchInputRef = useRef<HTMLInputElement>(null);
  const singleInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [dragoverSlot, setDragoverSlot] = useState<string | null>(null);
  const [screenDragover, setScreenDragover] = useState(false);

  const validCount = REQUIRED_SLOTS.filter((s) => slotState[s.id]?.status === 'valid').length;

  const triggerSingleUpload = (slotId: string) => {
    singleInputRefs.current[slotId]?.click();
  };

  return (
    <Tooltip.Provider delayDuration={140}>
      <section
        id="gate-screen"
        className={`gate-screen has-fixed-bottom-bar ${screenDragover ? 'dragover' : ''}`}
        aria-label="Molecule Configuration Verification"
        onDragOver={(e) => {
          e.preventDefault();
          setScreenDragover(true);
        }}
        onDragLeave={() => setScreenDragover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setScreenDragover(false);
          if (e.dataTransfer?.files?.length) {
            processFiles([...e.dataTransfer.files]);
          }
        }}
      >
        <div className="gate-container">
          <div className="gate-header">
            <div>
              <span className="small-label">STEP 1 / 3 · MOLECULE VERIFICATION</span>
              <h2>Upload & Verify Molecular Configurations</h2>
            </div>
            <div className="gate-actions-toolbar">
              <button
                id="gate-choose-files"
                type="button"
                className="toolbar-icon-btn"
                title="Upload JSON configuration files"
                aria-label="Upload JSON configuration files"
                onClick={() => batchInputRef.current?.click()}
              >
                <Upload size={18} />
              </button>
              <input
                ref={batchInputRef}
                type="file"
                id="gate-file-input"
                accept=".json,application/json"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files?.length) {
                    processFiles([...e.target.files]);
                  }
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          {/* 6 Molecule Verification Cards */}
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
                  className={`gate-card status-${state.status} ${
                    dragoverSlot === slot.id ? 'dragover' : ''
                  }`}
                  data-id={slot.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragoverSlot(slot.id);
                  }}
                  onDragLeave={() => setDragoverSlot(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragoverSlot(null);
                    if (e.dataTransfer?.files?.length) {
                      processFiles([...e.dataTransfer.files], slot.id);
                    }
                  }}
                >
                  <input
                    ref={(el) => {
                      singleInputRefs.current[slot.id] = el;
                    }}
                    type="file"
                    accept=".json,application/json"
                    hidden
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        processFiles([...e.target.files], slot.id);
                      }
                      e.target.value = '';
                    }}
                  />

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

                  {/* Row 3: Action Buttons */}
                  <div className="gate-card-actions">
                    {isValid ? (
                      <>
                        <button
                          type="button"
                          className="gate-action-btn secondary"
                          onClick={() => triggerSingleUpload(slot.id)}
                        >
                          <RefreshCw size={15} />
                          <span>Re-upload</span>
                        </button>
                        <button
                          type="button"
                          className="gate-action-btn primary"
                          onClick={() => setPreviewSlotId(slot.id)}
                        >
                          <Box size={16} />
                          <span>3D View</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="gate-action-btn upload-full"
                        onClick={() => triggerSingleUpload(slot.id)}
                      >
                        <Upload size={16} />
                        <span>{isError ? 'Re-select' : 'Upload JSON'}</span>
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

        {/* 3D Structure Preview Modal */}
        <MoleculePreviewModal />
      </section>
    </Tooltip.Provider>
  );
};
