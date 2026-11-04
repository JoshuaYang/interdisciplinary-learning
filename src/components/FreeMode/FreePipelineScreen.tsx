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
import { ArrowLeft, ArrowRight, Edit3, Package, Plus, Trash2, X } from 'lucide-react';
import { useFreeChemStore } from '../../store/useFreeChemStore';
import { useChemStore } from '../../store/useChemStore';
import type { FreeMoleculeItem } from '../../engine/freeReactionEngine';

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
          {particles.length ? `共 ${particles.length} 个物质` : '空'}
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
              <span>从上方物质池拖入或点击放入</span>
            </motion.div>
          ) : (
            particles.map((molId, itemIdx) => {
              const item = moleculesMap.get(molId);
              return (
                <motion.div
                  key={`${molId}-${itemIdx}`}
                  layout
                  initial={{ scale: 0.75, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.65, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 28 }}
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
                    title="移除此物质"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMolFromStageZone(stageId, role, itemIdx);
                    }}
                  >
                    <X size={13} />
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

  const currentStage = stages[activeStageTab] || stages[0];
  const activeDragItem = activeDragMolId ? moleculesMap.get(activeDragMolId) : null;

  return (
    <section
      id="free-pipeline-screen"
      className="pipeline-screen"
      aria-label="自定义反应阶段编排"
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
              <h2>编排反应阶段</h2>
              <p className="pipeline-subtitle">
                自由增减反应阶段并命名，为每个阶段指定反应前与反应后的化学物质。
              </p>
            </div>
            <div className="pipeline-header-actions">
              <button
                type="button"
                className="primary-button top-action-btn"
                onClick={() => addStage()}
              >
                <Plus size={16} />
                <span>新增阶段</span>
              </button>
              <button
                type="button"
                className="text-button top-action-btn"
                onClick={clearCurrentStageZones}
              >
                <Trash2 size={16} />
                <span>清空当前阶段</span>
              </button>
            </div>
          </div>

          {/* 顶部可用微粒池 */}
          <div className="molecule-pool-card">
            <div className="pool-title">
              <span>
                <Package
                  size={17}
                  style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }}
                />
                已构建的化学物质池
              </span>
              <small>拖拽或点击化学物质放入下方「反应前」或「反应后」区域</small>
            </div>
            <div className="molecule-chips">
              {molecules.length === 0 ? (
                <div className="pool-empty-hint">
                  暂未添加化学物质，请先返回第 1 步构建或上传分子。
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
                          `已选取 ${item.mol.name} (${item.mol.formula})，点击下方「反应前」或「反应后」区域即可放入。`
                        );
                      }
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* 动态阶段 Tab 栏（支持点击切换、新增阶段） */}
          <div className="pipeline-tabs-nav free-tabs-nav" role="tablist">
            {stages.map((st, idx) => (
              <button
                key={st.id}
                type="button"
                role="tab"
                aria-selected={idx === activeStageTab}
                className="pipeline-tab-btn"
                onClick={() => setActiveStageTab(idx)}
              >
                <span className="tab-badge">{idx + 1}</span>
                <span>{st.name || `阶段 ${idx + 1}`}</span>
              </button>
            ))}
            <button
              type="button"
              className="pipeline-tab-add-btn"
              onClick={() => addStage()}
              title="新增一个反应阶段"
            >
              <Plus size={15} />
              <span>新增阶段</span>
            </button>
          </div>

          {/* 当前选中阶段的编辑区：阶段名称输入框 + [反应前] ➔ [反应后]（无多余描述与条件） */}
          {currentStage && (
            <div className="pipeline-active-stage">
              <motion.div
                key={currentStage.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="pipeline-track-card"
              >
                <div className="track-header free-track-header">
                  <div className="stage-name-editor">
                    <Edit3 size={15} className="stage-name-icon" />
                    <label htmlFor="free-stage-name-input" className="stage-name-label">
                      阶段名称：
                    </label>
                    <input
                      id="free-stage-name-input"
                      type="text"
                      className="stage-name-input"
                      value={currentStage.name}
                      placeholder="输入阶段名称…"
                      onChange={(e) => renameStage(currentStage.id, e.target.value)}
                    />
                  </div>
                  {stages.length > 1 && (
                    <button
                      type="button"
                      className="text-button danger-text-btn"
                      onClick={() => removeStage(currentStage.id)}
                    >
                      <Trash2 size={14} />
                      <span>删除此阶段</span>
                    </button>
                  )}
                </div>

                {/* 纯净的 [反应前物质] ➔ [反应后物质] 结构 */}
                <div className="track-flow">
                  <FreeDropZone
                    stageId={currentStage.id}
                    role="reactants"
                    titleText="反应前化学物质"
                    particles={currentStage.reactants}
                    moleculesMap={moleculesMap}
                  />
                  <div className="track-arrow-zone">
                    <span className="track-arrow" aria-hidden="true">
                      ➔
                    </span>
                  </div>
                  <FreeDropZone
                    stageId={currentStage.id}
                    role="products"
                    titleText="反应后化学物质"
                    particles={currentStage.products}
                    moleculesMap={moleculesMap}
                  />
                </div>
              </motion.div>
            </div>
          )}

          {/* 底部流转控制栏 */}
          <div className="pipeline-footer">
            <div className="pipeline-footer-left">
              <button
                type="button"
                className="text-button footer-back-btn"
                onClick={() => setScreen('gate')}
              >
                <ArrowLeft size={16} />
                <span>上一步：分子结构构建</span>
              </button>
            </div>
            <div className="pipeline-footer-right">
              <button
                id="free-enter-stage-btn"
                type="button"
                className="primary-button enter-stage-btn"
                onClick={enterStage}
              >
                <span>下一步：生成三维反应动画</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <DragOverlay>
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
    </section>
  );
};
