import React, { useEffect, useRef, useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'motion/react';
import {
  Archive,
  ArrowRight,
  Box,
  Edit3,
  FileDown,
  Info,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useFreeChemStore } from '../../store/useFreeChemStore';
import { useChemStore } from '../../store/useChemStore';
import { createZipBlob } from '../../engine/zipExporter';
import { FreeMoleculePreviewModal } from './FreeMoleculePreviewModal';
import { MoleculeBuilderModal } from './MoleculeBuilderModal';
import { ConfirmModal } from '../Common/ConfirmModal';

export const FreeGateScreen: React.FC = () => {
  const molecules = useFreeChemStore((s) => s.molecules);
  const openBuilder = useFreeChemStore((s) => s.openBuilder);
  const setPreviewMolId = useFreeChemStore((s) => s.setPreviewMolId);
  const deleteMolecule = useFreeChemStore((s) => s.deleteMolecule);
  const clearAllMolecules = useFreeChemStore((s) => s.clearAllMolecules);
  const loadSampleMolecules = useFreeChemStore((s) => s.loadSampleMolecules);
  const processUploadedFiles = useFreeChemStore((s) => s.processUploadedFiles);
  const enterPipeline = useFreeChemStore((s) => s.enterPipeline);
  const showToast = useChemStore((s) => s.showToast);

  const batchInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [screenDragover, setScreenDragover] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [molToDelete, setMolToDelete] = useState<{ id: string; name: string; formula: string } | null>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [moreMenuOpen]);

  const handleExportAllZip = () => {
    setMoreMenuOpen(false);
    if (molecules.length === 0) {
      showToast('No chemical substances available to export.');
      return;
    }
    const entries = molecules.map((item, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      const safeFormula = (item.mol.formula || `molecule_${num}`).replace(
        /[^a-zA-Z0-9._-]/g,
        ''
      );
      return {
        fileName: `${num}-${safeFormula || 'substance'}.json`,
        content: JSON.stringify(item.doc, null, 2) + '\n',
      };
    });
    const zipBlob = createZipBlob(entries);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chemical-substances-${molecules.length}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${molecules.length} substances as a ZIP archive!`);
  };

  const handleClearAllWithConfirm = () => {
    setMoreMenuOpen(false);
    if (molecules.length === 0) return;
    setConfirmClearOpen(true);
  };

  return (
    <Tooltip.Provider delayDuration={140}>
      <section
        id="free-gate-screen"
        className={`gate-screen has-fixed-bottom-bar ${screenDragover ? 'dragover' : ''}`}
        aria-label="Custom Molecular Structure Library"
        onDragOver={(e) => {
          e.preventDefault();
          setScreenDragover(true);
        }}
        onDragLeave={() => setScreenDragover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setScreenDragover(false);
          if (e.dataTransfer?.files?.length) {
            processUploadedFiles([...e.dataTransfer.files]);
          }
        }}
      >
        <div className="gate-container">
          <div className="gate-header">
            <div>
              <h2>Chemical Substance Library</h2>
              <p className="free-gate-subtitle">
                Build custom molecules interactively from the periodic table, or batch import/export JSON configurations
              </p>
            </div>

            {/* Clean, icon-only actions toolbar */}
            <div className="gate-actions-toolbar">
              <button
                type="button"
                id="free-open-builder-btn"
                className="toolbar-icon-btn primary-icon-btn"
                title="Add Chemical Substance"
                aria-label="Add Chemical Substance"
                onClick={() => openBuilder(null)}
              >
                <Plus size={20} />
              </button>

              <button
                type="button"
                className="toolbar-icon-btn"
                title="Import JSON Files"
                aria-label="Import JSON Files"
                onClick={() => batchInputRef.current?.click()}
              >
                <FileDown size={19} />
              </button>

              <div className="toolbar-dropdown-wrap" ref={menuRef}>
                <button
                  type="button"
                  className={`toolbar-icon-btn ${moreMenuOpen ? 'active' : ''}`}
                  title="Library actions"
                  aria-label="Library actions"
                  aria-expanded={moreMenuOpen}
                  onClick={() => setMoreMenuOpen((v) => !v)}
                >
                  <MoreHorizontal size={18} />
                </button>

                {moreMenuOpen && (
                  <div className="toolbar-dropdown-menu" role="menu">
                    <button
                      type="button"
                      className="toolbar-dropdown-item"
                      role="menuitem"
                      onClick={handleExportAllZip}
                    >
                      <Archive size={16} />
                      <span>Export All as ZIP</span>
                    </button>

                    <button
                      type="button"
                      className="toolbar-dropdown-item"
                      role="menuitem"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        loadSampleMolecules();
                      }}
                    >
                      <Sparkles size={16} />
                      <span>Load Sample Library</span>
                    </button>

                    {molecules.length > 0 && (
                      <>
                        <div className="toolbar-dropdown-divider" />
                        <button
                          type="button"
                          className="toolbar-dropdown-item danger"
                          role="menuitem"
                          onClick={handleClearAllWithConfirm}
                        >
                          <Trash2 size={16} />
                          <span>Clear All Substances</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <input
                ref={batchInputRef}
                type="file"
                accept=".json,application/json"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files?.length) {
                    processUploadedFiles([...e.target.files]);
                  }
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          {/* Molecule Card Grid (no individual export, no "Passed" badge) */}
          <div className="gate-grid" id="free-gate-card-grid">
            {molecules.map((item, idx) => {
              const { mol, doc } = item;
              const bondLengths = doc.bondLengths ? Object.entries(doc.bondLengths) : [];
              const bondAngles = doc.bondAngles ? Object.entries(doc.bondAngles) : [];
              const numStr = String(idx + 1).padStart(2, '0');

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.25) }}
                  className="gate-card free-mol-card"
                  data-id={item.id}
                >
                  {/* Row 1: Number + Icon-only Specs Quick View + Icon-only Delete */}
                  <div className="gate-card-top">
                    <span className="gate-card-num mono">NO.{numStr}</span>
                    <div className="gate-card-top-right">
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <button
                            type="button"
                            className="card-mini-icon-btn"
                            title="Quick Specifications"
                            aria-label="Quick Specifications"
                            onClick={() => setPreviewMolId(item.id)}
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
                              <strong>{mol.name}</strong>
                              <span
                                className="mol-hover-formula"
                                dangerouslySetInnerHTML={{
                                  __html: item.formulaHtml,
                                }}
                              />
                            </div>
                            <div className="mol-hover-rows">
                              <div className="mol-hover-row">
                                <span>Geometry</span>
                                <strong>{mol.geometry || '-'}</strong>
                              </div>
                              <div className="mol-hover-row">
                                <span>Hybridization</span>
                                <strong className="mono">
                                  {mol.hybridization && mol.hybridization !== 'none'
                                    ? mol.hybridization
                                    : 'None'}
                                </strong>
                              </div>
                              {bondLengths.map(([k, v]) => (
                                <div key={k} className="mol-hover-row">
                                  <span>Bond ({k})</span>
                                  <strong className="mono">{String(v)} Å</strong>
                                </div>
                              ))}
                              {bondAngles.map(([k, v]) => (
                                <div key={k} className="mol-hover-row">
                                  <span>Angle ({k})</span>
                                  <strong className="mono">{String(v)}°</strong>
                                </div>
                              ))}
                              {mol.radicals && mol.radicals.length > 0 && (
                                <div className="mol-hover-row">
                                  <span>Unpaired e⁻</span>
                                  <strong>{mol.radicals.length} (Radical)</strong>
                                </div>
                              )}
                            </div>
                            {mol.description && (
                              <p className="mol-hover-desc">{mol.description}</p>
                            )}
                            <Tooltip.Arrow className="mol-hover-arrow" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>

                      <button
                        type="button"
                        className="card-mini-icon-btn danger"
                        title="Delete substance"
                        aria-label="Delete substance"
                        onClick={() =>
                          setMolToDelete({
                            id: item.id,
                            name: mol.name,
                            formula: mol.formula,
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Formula + Name + Geometry Pill */}
                  <div className="gate-card-center">
                    <div
                      className="gate-formula"
                      dangerouslySetInnerHTML={{
                        __html: item.formulaHtml,
                      }}
                    />
                    <div className="gate-meta-row">
                      <span className="gate-name">{mol.name}</span>
                      {mol.geometry && (
                        <span className="gate-geometry-pill">{mol.geometry}</span>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Concise Edit & 3D View Buttons */}
                  <div className="gate-card-actions">
                    <button
                      type="button"
                      className="gate-action-btn secondary"
                      title="Edit molecular structure"
                      onClick={() => openBuilder(item.id)}
                    >
                      <Edit3 size={15} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="gate-action-btn primary"
                      title="Inspect 3D model and specifications"
                      onClick={() => setPreviewMolId(item.id)}
                    >
                      <Box size={15} />
                      <span>3D View</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {/* Add Chemical Substance Card */}
            <button
              type="button"
              className="gate-card add-mol-card"
              onClick={() => openBuilder(null)}
            >
              <div className="add-mol-card-inner">
                <span className="add-mol-icon">
                  <Plus size={26} />
                </span>
                <strong>Add Chemical Substance</strong>
                <span>Select elements from periodic table & connect bonds</span>
              </div>
            </button>
          </div>
        </div>

        {/* Fixed Full-Width Bottom Step Bar */}
        <div className="fixed-bottom-bar">
          <div className="fixed-bottom-bar-inner">
            <div className="gate-progress-info">
              <span>
                <strong className="mono">{molecules.length}</strong> chemical substance(s) in library
              </span>
            </div>
            <button
              id="free-enter-pipeline-btn"
              type="button"
              className="primary-button enter-stage-btn"
              onClick={enterPipeline}
            >
              <span>Next</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <FreeMoleculePreviewModal />
        <MoleculeBuilderModal />
        <ConfirmModal
          open={confirmClearOpen}
          onOpenChange={setConfirmClearOpen}
          title="Clear Substance Library?"
          description={`Are you sure you want to delete all ${molecules.length} chemical substances from the library? This action cannot be undone.`}
          confirmLabel="Delete All"
          danger={true}
          onConfirm={clearAllMolecules}
        />
        <ConfirmModal
          open={Boolean(molToDelete)}
          onOpenChange={(open) => !open && setMolToDelete(null)}
          title={`Delete ${molToDelete?.formula || 'Substance'}?`}
          description={`Are you sure you want to delete "${molToDelete?.name || ''} (${molToDelete?.formula || ''})" from your library?`}
          confirmLabel="Delete"
          danger={true}
          onConfirm={() => {
            if (molToDelete) {
              deleteMolecule(molToDelete.id);
              setMolToDelete(null);
            }
          }}
        />
      </section>
    </Tooltip.Provider>
  );
};
