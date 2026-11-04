import React from 'react';
import { ArrowLeft, Atom, Check, ChevronRight, Lock } from 'lucide-react';
import { useChemStore, REQUIRED_SLOTS } from '../store/useChemStore';
import { useFreeChemStore } from '../store/useFreeChemStore';
import * as deduction from '../engine/deduction';

export const Header: React.FC = () => {
  const screen = useChemStore((s) => s.screen);
  const config = useChemStore((s) => s.config);
  const slotState = useChemStore((s) => s.slotState);
  const pipelineData = useChemStore((s) => s.pipelineData);
  const pipelineVerified = useChemStore((s) => s.pipelineVerified);
  const setScreen = useChemStore((s) => s.setScreen);
  const enterPipelineFromGate = useChemStore((s) => s.enterPipelineFromGate);
  const submitPipelineAndEnterStage = useChemStore((s) => s.submitPipelineAndEnterStage);
  const showToast = useChemStore((s) => s.showToast);
  const setAppMode = useFreeChemStore((s) => s.setAppMode);

  const validMolCount = REQUIRED_SLOTS.filter((s) => slotState[s.id]?.status === 'valid').length;
  const step1Done = validMolCount === 6;
  const step2Done =
    step1Done &&
    pipelineVerified &&
    Boolean(config) &&
    deduction.verifyPipeline(pipelineData).ok;

  const badgeText =
    screen === 'gate'
      ? '第 1 步：分子核验'
      : screen === 'pipeline'
      ? '第 2 步：反应链路拼装'
      : '第 3 步：三维机理推演';

  const handleGoGate = () => {
    if (screen !== 'gate') setScreen('gate');
  };

  const handleGoPipeline = () => {
    if (screen === 'pipeline') return;
    if (!step1Done) {
      showToast(`🔒 请先完成第 1 步全部 6 种分子配置核验（当前 ${validMolCount}/6）。`);
      return;
    }
    if (screen === 'gate') {
      enterPipelineFromGate();
    } else {
      setScreen('pipeline');
    }
  };

  const handleGoStage = () => {
    if (screen === 'stage') return;
    if (!step1Done) {
      showToast('🔒 请先完成第 1 步分子结构核验。');
      return;
    }
    if (!step2Done) {
      showToast('🔒 请先在第 2 步完成反应链路拼装并点击验证通过。');
      return;
    }
    submitPipelineAndEnterStage();
  };

  return (
    <header className="app-header">
      <div className="identity">
        <button
          type="button"
          className="mode-back-btn"
          title="返回实验台模式选择首页"
          onClick={() => setAppMode('home')}
        >
          <ArrowLeft size={16} />
          <span>切换模式</span>
        </button>
        <span className="mark" aria-hidden="true">
          <Atom size={22} strokeWidth={2} />
        </span>
        <div>
          <div className="identity-title-row">
            <h1 id="project-title">{config?.title || '甲烷的自由基取代'}</h1>
          </div>
          <p>
            化学 × 信息技术 <span>/</span> 微观反应机理交互实验台
          </p>
        </div>
      </div>

      <nav className="header-stepper" aria-label="实验流程步骤">
        <button
          type="button"
          className={`stepper-item ${screen === 'gate' ? 'active' : ''} ${
            step1Done && screen !== 'gate' ? 'done' : ''
          }`}
          onClick={handleGoGate}
        >
          <span className="stepper-num">
            {step1Done && screen !== 'gate' ? <Check size={12} strokeWidth={3} /> : '1'}
          </span>
          <span className="stepper-label">分子结构核验</span>
        </button>

        <ChevronRight size={14} className="stepper-sep" />

        <button
          type="button"
          className={`stepper-item ${screen === 'pipeline' ? 'active' : ''} ${
            step2Done && screen !== 'pipeline' ? 'done' : ''
          } ${!step1Done ? 'locked' : ''}`}
          aria-disabled={!step1Done}
          title={!step1Done ? '请先完成第 1 步全部分子配置核验' : '前往第 2 步：反应链路拼装'}
          onClick={handleGoPipeline}
        >
          <span className="stepper-num">
            {!step1Done ? (
              <Lock size={11} strokeWidth={2.5} />
            ) : step2Done && screen !== 'pipeline' ? (
              <Check size={12} strokeWidth={3} />
            ) : (
              '2'
            )}
          </span>
          <span className="stepper-label">反应链路拼装</span>
        </button>

        <ChevronRight size={14} className="stepper-sep" />

        <button
          type="button"
          className={`stepper-item ${screen === 'stage' ? 'active' : ''} ${
            !step2Done ? 'locked' : ''
          }`}
          aria-disabled={!step2Done}
          title={
            !step2Done
              ? '请先完成前两步核验与反应链路装配'
              : '前往第 3 步：三维机理推演'
          }
          onClick={handleGoStage}
        >
          <span className="stepper-num">
            {!step2Done && screen !== 'stage' ? <Lock size={11} strokeWidth={2.5} /> : '3'}
          </span>
          <span className="stepper-label">三维机理推演</span>
        </button>
      </nav>

      <span className="local-state" id="workflow-badge" hidden>
        <i></i>
        {badgeText}
      </span>
    </header>
  );
};
