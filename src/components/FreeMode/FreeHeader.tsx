import React, { useState } from 'react';
import { ArrowLeft, Atom, Check, ChevronRight, Save } from 'lucide-react';
import { useFreeChemStore } from '../../store/useFreeChemStore';

export const FreeHeader: React.FC = () => {
  const screen = useFreeChemStore((s) => s.screen);
  const setScreen = useFreeChemStore((s) => s.setScreen);
  const setAppMode = useFreeChemStore((s) => s.setAppMode);
  const enterStage = useFreeChemStore((s) => s.enterStage);
  const manualSaveProgress = useFreeChemStore((s) => s.manualSaveProgress);

  const [justSaved, setJustSaved] = useState(false);

  const handleManualSave = () => {
    const ok = manualSaveProgress();
    if (ok) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2200);
    }
  };

  return (
    <header className="app-header">
      <div className="identity">
        <button
          type="button"
          className="header-back-arrow"
          aria-label="Back to mode selection"
          title="Back to mode selection"
          onClick={() => setAppMode('home')}
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>
        <span className="mark" aria-hidden="true">
          <Atom size={22} strokeWidth={2} />
        </span>
        <div>
          <div className="identity-title-row">
            <h1>Free Reaction Workbench</h1>
          </div>
          <p>Custom Topology · Reaction Simulation</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          className={`header-manual-save-btn ${justSaved ? 'saved' : ''}`}
          onClick={handleManualSave}
          title="Save your current progress immediately (Ctrl+S / ⌘S)"
          aria-label="Save Progress"
        >
          {justSaved ? (
            <>
              <Check size={14} strokeWidth={2.5} />
              <span>Saved ✓</span>
            </>
          ) : (
            <>
              <Save size={14} strokeWidth={2.2} />
              <span>Save</span>
            </>
          )}
        </button>

        <div className="header-autosave-pill" title="Molecules and reaction stages are auto-saved in this browser">
          <span className="autosave-status-dot" />
          <span>Auto-saved</span>
        </div>

        <nav className="header-stepper header-stepper-right" aria-label="Experiment Steps">
        <button
          type="button"
          className={`stepper-item ${screen === 'gate' ? 'active' : 'done'}`}
          onClick={() => setScreen('gate')}
        >
          <span className="stepper-num">1</span>
          <span className="stepper-label">Molecular Structure</span>
        </button>

        <ChevronRight size={15} className="stepper-sep" />

        <button
          type="button"
          className={`stepper-item ${
            screen === 'pipeline' ? 'active' : screen === 'stage' ? 'done' : ''
          }`}
          onClick={() => setScreen('pipeline')}
        >
          <span className="stepper-num">2</span>
          <span className="stepper-label">Reaction Stages</span>
        </button>

        <ChevronRight size={15} className="stepper-sep" />

        <button
          type="button"
          className={`stepper-item ${screen === 'stage' ? 'active' : ''}`}
          onClick={() => enterStage()}
        >
          <span className="stepper-num">3</span>
          <span className="stepper-label">3D Animation</span>
        </button>
      </nav>
      </div>
    </header>
  );
};
