import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Box, Upload } from 'lucide-react';
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
              <span>批量上传文件</span>
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

        {/* 6 分子点击上传与 3D 预览卡片网格 */}
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
                role="button"
                tabIndex={0}
                title={isValid ? '点击查看分子三维结构' : '点击上传该分子配置文件'}
                onClick={() => {
                  if (isValid) {
                    setPreviewSlotId(slot.id);
                  } else {
                    triggerSingleUpload(slot.id);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (isValid) {
                      setPreviewSlotId(slot.id);
                    } else {
                      triggerSingleUpload(slot.id);
                    }
                  }
                }}
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

                {/* 顶排：分子编号 + 重新上传与状态徽标 */}
                <div className="gate-card-top">
                  <span className="gate-card-num mono">{slot.num}</span>
                  <div className="gate-card-top-right">
                    {isValid && (
                      <button
                        type="button"
                        className="gate-reupload-btn"
                        title="重新选择并上传该分子的 JSON 配置文件"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerSingleUpload(slot.id);
                        }}
                      >
                        重新上传
                      </button>
                    )}
                    <span className="gate-status-badge">
                      {isValid ? '✓' : isError ? '✗' : '○'}
                    </span>
                  </div>
                </div>

                {/* 核心区：大字化学式 + 中文名 + 构型胶囊 */}
                <div className="gate-card-center">
                  <div
                    className="gate-formula"
                    dangerouslySetInnerHTML={{
                      __html: state.mol?.formula || slot.formulaHtml,
                    }}
                  />
                  <div className="gate-meta-row">
                    <span className="gate-name">{state.mol?.name || slot.name}</span>
                    {isValid && state.mol?.geometry && (
                      <span className="gate-geometry-pill">{state.mol.geometry}</span>
                    )}
                  </div>
                </div>

                {/* 底栏 */}
                <div className="gate-card-bottom">
                  {isValid && state.doc ? (
                    <div className="gate-valid-footer">
                      <div className="gate-param-tags">
                        {state.doc.bondLengths &&
                          Object.entries(state.doc.bondLengths).map(([k, v]) => (
                            <span key={k} className="param-tag">
                              {k} {String(v)} Å
                            </span>
                          ))}
                        {state.doc.bondAngles &&
                          Object.entries(state.doc.bondAngles).map(([k, v]) => (
                            <span key={k} className="param-tag">
                              {String(v)}°
                            </span>
                          ))}
                        {state.doc.hybridization && (
                          <span className="param-tag">{state.doc.hybridization}</span>
                        )}
                      </div>
                      <span className="gate-preview-trigger">
                        <Box size={14} />
                        <span>查看 3D 结构</span>
                        <span aria-hidden="true">↗</span>
                      </span>
                    </div>
                  ) : isError ? (
                    <span className="gate-error-text">{state.error || '校验未通过'}</span>
                  ) : (
                    <div className="gate-card-prompt">
                      <span className="prompt-plus">+</span>
                      <span>点击上传文件</span>
                    </div>
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

      {/* 单分子三维构型预览弹窗 */}
      <MoleculePreviewModal onReupload={triggerSingleUpload} />
    </section>
  );
};
