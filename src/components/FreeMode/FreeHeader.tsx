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
    </header>
  );
};
