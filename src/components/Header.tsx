import React from 'react';
import { Settings2, HelpCircle } from 'lucide-react';
import { useChemStore } from '../store/useChemStore';

export const Header: React.FC = () => {
  const screen = useChemStore((s) => s.screen);
  const config = useChemStore((s) => s.config);
  const setConfigDialogOpen = useChemStore((s) => s.setConfigDialogOpen);
  const setHelpDialogOpen = useChemStore((s) => s.setHelpDialogOpen);

  const badgeText =
    screen === 'gate'
      ? '第一步 · 分子核验'
      : screen === 'pipeline'
      ? '第二步 · 反应链路拼装'
      : '第三步 · 反应推演';

  return (
    <header className="topbar">
      <div className="title-block">
        <span className="eyebrow">有机化学 · 反应机理实验台</span>
        <div className="title-row">
          <h1 id="project-title">{config?.title || '甲烷的自由基溴代反应'}</h1>
          <span className="formula" id="project-subtitle">
            CH<sub>4</sub> + Br<sub>2</sub> <span aria-hidden="true">→</span> CH<sub>3</sub>Br + HBr
          </span>
        </div>
      </div>

      <div className="toolbar">
        <span className="status-pill" id="workflow-badge">
          {badgeText}
        </span>
        {screen === 'stage' && (
          <button
            className="ghost-btn"
            id="config-open"
            type="button"
            onClick={() => setConfigDialogOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Settings2 size={15} />
            课堂配置
          </button>
        )}
        <button
          className="ghost-btn"
          id="help-open"
          type="button"
          onClick={() => setHelpDialogOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <HelpCircle size={15} />
          使用说明
        </button>
      </div>
    </header>
  );
};
