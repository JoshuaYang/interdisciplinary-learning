import React, { useRef, useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Box,
  Download,
  Edit3,
  Info,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useFreeChemStore } from '../../store/useFreeChemStore';
import { useChemStore } from '../../store/useChemStore';
import { FreeMoleculePreviewModal } from './FreeMoleculePreviewModal';
import { MoleculeBuilderModal } from './MoleculeBuilderModal';

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
  const [screenDragover, setScreenDragover] = useState(false);

  const handleDownloadCardJson = (doc: Record<string, any>, formula: string) => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formula || 'molecule'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`已下载 ${formula || 'molecule'}.json`);
  };

  return (
    <Tooltip.Provider delayDuration={140}>
      <section
        id="free-gate-screen"
        className={`gate-screen ${screenDragover ? 'dragover' : ''}`}
        aria-label="自定义分子结构构建与管理"
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
              <h2>分子结构库</h2>
              <p className="free-gate-subtitle">
                通过元素周期表交互式构建任意化学物质，或直接导入/导出分子 JSON 文件
              </p>
            </div>
            <div className="gate-actions">
              <button
                type="button"
                id="free-open-builder-btn"
                className="primary-button top-action-btn"
                onClick={() => openBuilder(null)}
              >
                <Plus size={16} />
                <span>交互式构建分子</span>
              </button>
              <button
                type="button"
                className="text-button batch-upload-btn top-action-btn"
                onClick={() => batchInputRef.current?.click()}
              >
                <Upload size={16} />
                <span>上传文件</span>
              </button>
              <button
                type="button"
                className="text-button top-action-btn"
                onClick={loadSampleMolecules}
                title="载入示例反应微粒库"
              >
                <Sparkles size={15} />
                <span>载入示例</span>
              </button>
              {molecules.length > 0 && (
                <button
                  type="button"
                  className="text-button top-action-btn"
                  onClick={clearAllMolecules}
                  title="清空当前全部分子"
                >
                  <Trash2 size={15} />
                  <span>清空</span>
                </button>
              )}
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

          {/* 分子卡片网格（无任何核验门禁，无“已通过”标签，支持随时新增、编辑、导出、删除） */}
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
                  {/* 第 1 行：编号 + 参数速览 + 导出 + 删除（无“已通过”标签） */}
                  <div className="gate-card-top">
                    <span className="gate-card-num mono">NO.{numStr}</span>
                    <div className="gate-card-top-right">
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <button
                            type="button"
                            className="gate-hover-info-trigger"
                            aria-label="悬停查看分子结构参数"
                            onClick={() => setPreviewMolId(item.id)}
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
                                <span>空间构型</span>
                                <strong>{mol.geometry || '-'}</strong>
                              </div>
                              <div className="mol-hover-row">
                                <span>中心杂化</span>
                                <strong className="mono">
                                  {mol.hybridization && mol.hybridization !== 'none'
                                    ? mol.hybridization
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
                              {mol.radicals && mol.radicals.length > 0 && (
                                <div className="mol-hover-row">
                                  <span>未成对电子</span>
                                  <strong>{mol.radicals.length} 个 (自由基)</strong>
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
                        className="card-mini-icon-btn"
                        title="导出该分子 JSON"
                        onClick={() => handleDownloadCardJson(doc, mol.formula)}
                      >
                        <Download size={13} />
                      </button>
                      <button
                        type="button"
                        className="card-mini-icon-btn danger"
                        title="删除该分子"
                        onClick={() => deleteMolecule(item.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* 第 2 行：大字化学式 + 中文名 + 构型胶囊 */}
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

                  {/* 第 3 行：编辑结构 + 3D 结构与详情 */}
                  <div className="gate-card-actions">
                    <button
                      type="button"
                      className="gate-action-btn secondary"
                      onClick={() => openBuilder(item.id)}
                    >
                      <Edit3 size={14} />
                      <span>编辑结构</span>
                    </button>
                    <button
                      type="button"
                      className="gate-action-btn primary"
                      onClick={() => setPreviewMolId(item.id)}
                    >
                      <Box size={15} />
                      <span>3D 结构与详情</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {/* 网格末尾新增卡片入口 */}
            <button
              type="button"
              className="gate-card add-mol-card"
              onClick={() => openBuilder(null)}
            >
              <div className="add-mol-card-inner">
                <span className="add-mol-icon">
                  <Plus size={24} />
                </span>
                <strong>新增化学物质</strong>
                <span>从元素周期表选元素连键构建</span>
              </div>
            </button>
          </div>

          {/* 底部控制栏（无校验锁，随时可进入下一步） */}
          <div className="gate-footer">
            <div className="gate-progress-info">
              <span>
                当前已构建 <strong className="mono">{molecules.length}</strong> 种化学微粒
              </span>
            </div>
            <button
              id="free-enter-pipeline-btn"
              type="button"
              className="primary-button enter-stage-btn"
              onClick={enterPipeline}
            >
              <span>下一步：编排反应阶段</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <FreeMoleculePreviewModal />
        <MoleculeBuilderModal />
      </section>
    </Tooltip.Provider>
  );
};
