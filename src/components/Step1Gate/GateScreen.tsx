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
        className={`gate-screen ${screenDragover ? 'dragover' : ''}`}
        aria-label="分子配置文件核验"
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
            <h2>上传分子配置</h2>
            <div className="gate-actions">
              <button
                id="gate-choose-files"
                type="button"
                className="text-button batch-upload-btn top-action-btn"
                onClick={() => batchInputRef.current?.click()}
              >
                <Upload size={16} />
                <span>上传文件</span>
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

          {/* 6 分子配置核验卡片网格（无冗余 Tag 堆砌，支持 Hover 参数速览 + 3D 详情弹窗） */}
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

                  {/* 第 1 行：编号 + 状态与 Hover 参数浮层触发器 */}
                  <div className="gate-card-top">
                    <span className="gate-card-num mono">NO.{slot.num}</span>
                    <div className="gate-card-top-right">
                      {isValid && (
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <button
                              type="button"
                              className="gate-hover-info-trigger"
                              aria-label="悬停查看分子结构参数"
                              onClick={() => setPreviewSlotId(slot.id)}
                            >
                              <Info size={13} />
                              <span>参数速览</span>
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
                                <strong>{mol?.name || slot.name}</strong>
                                <span
                                  className="mol-hover-formula"
                                  dangerouslySetInnerHTML={{
                                    __html: mol?.formula || slot.formulaHtml,
                                  }}
                                />
                              </div>
                              <div className="mol-hover-rows">
                                <div className="mol-hover-row">
                                  <span>空间构型</span>
                                  <strong>{mol?.geometry || '-'}</strong>
                                </div>
                                <div className="mol-hover-row">
                                  <span>中心杂化</span>
                                  <strong className="mono">
                                    {doc.hybridization && doc.hybridization !== 'none'
                                      ? doc.hybridization
                                      : '无'}
                                  </strong>
                                </div>
                                {bondLengths.map(([k, v]) => (
                                  <div key={k} className="mol-hover-row">
                                    <span>键长 ({k})</span>
                                    <strong className="mono">{String(v)} Å</strong>
                                  </div>
                                ))}
                                {bondAngles.map(([k, v]) => (
                                  <div key={k} className="mol-hover-row">
                                    <span>键角 ({k})</span>
                                    <strong className="mono">{String(v)}°</strong>
                                  </div>
                                ))}
                                {mol?.radicals && mol.radicals.length > 0 && (
                                  <div className="mol-hover-row">
                                    <span>未成对电子</span>
                                    <strong>{mol.radicals.length} 个 (自由基)</strong>
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
                            <span>已通过</span>
                          </>
                        ) : isError ? (
                          <>
                            <AlertCircle size={14} />
                            <span>未通过</span>
                          </>
                        ) : (
                          <>
                            <CircleDashed size={14} />
                            <span>待上传</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* 第 2 行：清爽大字化学式 + 中文名 + 构型 */}
                  <div className="gate-card-center">
                    <div
                      className="gate-formula"
                      dangerouslySetInnerHTML={{
                        __html: mol?.formula || slot.formulaHtml,
                      }}
                    />
                    <div className="gate-meta-row">
                      <span className="gate-name">{mol?.name || slot.name}</span>
                      {isValid && mol?.geometry && (
                        <span className="gate-geometry-pill">{mol.geometry}</span>
                      )}
                    </div>
                    {isError && (
                      <div className="gate-error-text">
                        {state.error || '配置文件校验未通过'}
                      </div>
                    )}
                  </div>

                  {/* 第 3 行：底部双按钮操作栏 */}
                  <div className="gate-card-actions">
                    {isValid ? (
                      <>
                        <button
                          type="button"
                          className="gate-action-btn secondary"
                          onClick={() => triggerSingleUpload(slot.id)}
                        >
                          <RefreshCw size={14} />
                          <span>重新上传</span>
                        </button>
                        <button
                          type="button"
                          className="gate-action-btn primary"
                          onClick={() => setPreviewSlotId(slot.id)}
                        >
                          <Box size={15} />
                          <span>3D 结构与详情</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="gate-action-btn upload-full"
                        onClick={() => triggerSingleUpload(slot.id)}
                      >
                        <Upload size={15} />
                        <span>{isError ? '重新选择文件上传' : '上传配置文件'}</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* 底部控制栏 */}
          <div className="gate-footer">
            <div className="gate-progress-info">
              <div className="gate-progress-track">
                <div
                  id="gate-progress-bar"
                  className="gate-progress-bar"
                  style={{ width: `${(validCount / 6) * 100}%` }}
                />
              </div>
              <span id="gate-progress-text">
                已通过 <strong className="mono">{validCount}</strong> / 6
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
                {validCount === 6 ? '下一步：组装反应链路' : `组装反应链路 (${validCount}/6)`}
              </span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* 单分子 3D 结构与完整参数详情弹窗 */}
        <MoleculePreviewModal />
      </section>
    </Tooltip.Provider>
  );
};
