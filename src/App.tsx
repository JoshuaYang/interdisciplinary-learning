import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { GateScreen } from './components/Step1Gate/GateScreen';
import { PipelineScreen } from './components/Step2Pipeline/PipelineScreen';
import { StageScreen } from './components/Step3Stage/StageScreen';
import { ConfigDialog } from './components/Dialogs/ConfigDialog';
import { HelpDialog } from './components/Dialogs/HelpDialog';
import { useChemStore } from './store/useChemStore';
import * as core from './engine/core';
import * as files from './engine/configFiles';
import * as deduction from './engine/deduction';

export const App: React.FC = () => {
  const screen = useChemStore((s) => s.screen);
  const toastMessage = useChemStore((s) => s.toastMessage);
  const loadDefault = useChemStore((s) => s.loadDefault);

  useEffect(() => {
    loadDefault();

    // Expose diagnostic & programmatic API on window.chemLab for classroom scripts & tests
    (window as any).chemLab = {
      core,
      files,
      deduction,
      getState: () => {
        const s = useChemStore.getState();
        return {
          screen: s.screen,
          stepIndex: s.index,
          progress: s.progress,
          playing: s.playing,
          continuous: s.continuous,
          speed: s.speed,
          sourceName: s.sourceName,
          unlockedMaxStep: s.unlockedMaxStep,
          solvedSteps: [...s.solvedSteps],
        };
      },
      goToStep: (i: number, animate = false) => useChemStore.getState().go(i, animate),
      setProgress: (p: number) => useChemStore.getState().setProgress(p, true),
      loadPreset: () => useChemStore.getState().loadPreset(),
      enterPipeline: () => useChemStore.getState().enterPipelineFromGate(),
      autofillPipeline: () => useChemStore.getState().autofillPipeline(),
      enterStage: () => useChemStore.getState().submitPipelineAndEnterStage(),
      unlockAllSteps: () => useChemStore.getState().unlockAllSteps(),
    };
  }, [loadDefault]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = useChemStore.getState();
      if (s.screen !== 'stage' || s.configDialogOpen || s.helpDialogOpen) return;
      const target = e.target as HTMLElement | null;
      if (target && target.matches('input, button, select, textarea, label')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        s.play();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (s.index < Math.min(6, s.unlockedMaxStep + 1)) {
          s.go(s.index + 1, false);
        } else {
          s.showToast('🔒 请先完成当前步骤推演，才能前往下一步。');
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        s.go(Math.max(0, s.index - 1), false);
      } else if (e.code === 'Home') {
        e.preventDefault();
        s.restart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Header />
      <GateScreen />
      <PipelineScreen />
      <StageScreen />
      <ConfigDialog />
      <HelpDialog />
      <div
        className="toast"
        id="toast"
        role="status"
        aria-live="polite"
        hidden={!toastMessage}
      >
        {toastMessage}
      </div>
    </>
  );
};
