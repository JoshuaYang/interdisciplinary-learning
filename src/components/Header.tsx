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
      ? 'Step 1: Molecule Verification'
      : screen === 'pipeline'
      ? 'Step 2: Pathway Assembly'
      : 'Step 3: 3D Mechanism Deduction';

  const handleGoGate = () => {
    if (screen !== 'gate') setScreen('gate');
  };

  const handleGoPipeline = () => {
    if (screen === 'pipeline') return;
    if (!step1Done) {
      showToast(`Please verify all 6 required molecular structures first (${validMolCount}/6 completed).`);
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
      showToast('Please complete Step 1: Molecule Verification first.');
      return;
    }
    if (!step2Done) {
      showToast('Please assemble and verify the reaction pathway in Step 2 first.');
      return;
    }
    submitPipelineAndEnterStage();
  };

  return (
    <header className="app-header">
      <div className="identity">
        <button
          type="button"
          className="header-back-arrow"
          aria-label="Back to Home"
          title="Back to Home"
          onClick={() => setAppMode('home')}
        >
          <ArrowLeft size={22} strokeWidth={2.2} />
        </button>
        <span className="mark" aria-hidden="true">
          <Atom size={22} strokeWidth={2} />
        </span>
        <div>
          <div className="identity-title-row">
            <h1 id="project-title">{config?.title || 'Methane Radical Substitution'}</h1>
          </div>
          <p>Guided Curriculum · Reaction Dynamics</p>
        </div>
      </div>

      <nav className="header-stepper header-stepper-right" aria-label="Experiment Steps">
        <button
          type="button"
          className={`stepper-item ${screen === 'gate' ? 'active' : ''} ${
            step1Done && screen !== 'gate' ? 'done' : ''
          }`}
          onClick={handleGoGate}
        >
          <span className="stepper-num">
            {step1Done && screen !== 'gate' ? <Check size={13} strokeWidth={3} /> : '1'}
          </span>
          <span className="stepper-label">Verify Molecules</span>
        </button>

        <ChevronRight size={15} className="stepper-sep" />

        <button
          type="button"
          className={`stepper-item ${screen === 'pipeline' ? 'active' : ''} ${
            step2Done && screen !== 'pipeline' ? 'done' : ''
          } ${!step1Done ? 'locked' : ''}`}
          aria-disabled={!step1Done}
          title={!step1Done ? 'Verify all 6 molecules in Step 1 first' : 'Go to Step 2: Pathway Assembly'}
          onClick={handleGoPipeline}
        >
          <span className="stepper-num">
            {!step1Done ? (
              <Lock size={12} strokeWidth={2.5} />
            ) : step2Done && screen !== 'pipeline' ? (
              <Check size={13} strokeWidth={3} />
            ) : (
              '2'
            )}
          </span>
          <span className="stepper-label">Assemble Pathway</span>
        </button>

        <ChevronRight size={15} className="stepper-sep" />

        <button
          type="button"
          className={`stepper-item ${screen === 'stage' ? 'active' : ''} ${
            !step2Done ? 'locked' : ''
          }`}
          aria-disabled={!step2Done}
          title={
            !step2Done
              ? 'Complete Step 1 and Step 2 verification first'
              : 'Go to Step 3: 3D Mechanism Deduction'
          }
          onClick={handleGoStage}
        >
          <span className="stepper-num">
            {!step2Done && screen !== 'stage' ? <Lock size={12} strokeWidth={2.5} /> : '3'}
          </span>
          <span className="stepper-label">3D Mechanism</span>
        </button>
      </nav>

      <span className="local-state" id="workflow-badge" hidden>
        <i></i>
        {badgeText}
      </span>
    </header>
  );
};
