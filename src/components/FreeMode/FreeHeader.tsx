import React from 'react';
import { ArrowLeft, Atom, ChevronRight } from 'lucide-react';
import { useFreeChemStore } from '../../store/useFreeChemStore';

export const FreeHeader: React.FC = () => {
  const screen = useFreeChemStore((s) => s.screen);
  const setScreen = useFreeChemStore((s) => s.setScreen);
  const setAppMode = useFreeChemStore((s) => s.setAppMode);
  const enterStage = useFreeChemStore((s) => s.enterStage);

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
            <h1>自由化学反应实验台</h1>
          </div>
          <p>
            自定义分子拓扑构建 <span>/</span> 多阶段三维断键成键推演
          </p>
        </div>
      </div>

      <nav className="header-stepper" aria-label="自由实验流程步骤">
        <button
          type="button"
          className={`stepper-item ${screen === 'gate' ? 'active' : 'done'}`}
          onClick={() => setScreen('gate')}
        >
          <span className="stepper-num">1</span>
          <span className="stepper-label">分子结构构建</span>
        </button>

        <ChevronRight size={14} className="stepper-sep" />

        <button
          type="button"
          className={`stepper-item ${
            screen === 'pipeline' ? 'active' : screen === 'stage' ? 'done' : ''
          }`}
          onClick={() => setScreen('pipeline')}
        >
          <span className="stepper-num">2</span>
          <span className="stepper-label">反应阶段编排</span>
        </button>

        <ChevronRight size={14} className="stepper-sep" />

        <button
          type="button"
          className={`stepper-item ${screen === 'stage' ? 'active' : ''}`}
          onClick={() => enterStage()}
        >
          <span className="stepper-num">3</span>
          <span className="stepper-label">三维反应动画</span>
        </button>
      </nav>

      <div style={{ width: 96 }} />
    </header>
  );
};
