import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { GateScreen } from './components/Step1Gate/GateScreen';
import { PipelineScreen } from './components/Step2Pipeline/PipelineScreen';
import { StageScreen } from './components/Step3Stage/StageScreen';
import { HomeEntry } from './components/HomeEntry';
import { FreeHeader } from './components/FreeMode/FreeHeader';
import { FreeGateScreen } from './components/FreeMode/FreeGateScreen';
import { FreePipelineScreen } from './components/FreeMode/FreePipelineScreen';
import { FreeStageScreen } from './components/FreeMode/FreeStageScreen';
import { AmbientParticles } from './components/Common/AmbientParticles';
import { useChemStore } from './store/useChemStore';
import { useFreeChemStore } from './store/useFreeChemStore';
import * as core from './engine/core';
import * as files from './engine/configFiles';
import * as deduction from './engine/deduction';
import * as freeEngine from './engine/freeReactionEngine';

export const App: React.FC = () => {
  const screen = useChemStore((s) => s.screen);
  const toastMessage = useChemStore((s) => s.toastMessage);
  const loadDefault = useChemStore((s) => s.loadDefault);

  const appMode = useFreeChemStore((s) => s.appMode);
  const freeScreen = useFreeChemStore((s) => s.screen);

  // HTML5 History & Subpath/Hash Adaptive Routing (supports local, custom domain, and GitHub Pages subpath)
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (pathname.endsWith('/guided') || hash === '#/guided' || hash === '#guided') {
        useFreeChemStore.getState().setAppMode('guided');
      } else if (pathname.endsWith('/free') || hash === '#/free' || hash === '#free') {
        useFreeChemStore.getState().setAppMode('free');
      } else {
        useFreeChemStore.getState().setAppMode('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    handlePopState();

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Sync mode changes to History API preserving base subpath
  useEffect(() => {
    const currentPath = window.location.pathname;
    const baseDir = currentPath.replace(/\/+(guided|free)\/?$/i, '').replace(/\/+$/, '') || '';
    const targetPath =
      appMode === 'guided'
        ? `${baseDir}/guided`
        : appMode === 'free'
        ? `${baseDir}/free`
        : baseDir ? `${baseDir}/` : '/';

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [appMode]);

  // Subtle interactive mouse spotlight glow
  useEffect(() => {
    let rafId: number;
    const handlePointerMove = (e: PointerEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
      });
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    loadDefault();

    // Expose diagnostic & programmatic API on window.chemLab for classroom scripts & tests
    (window as any).chemLab = {
      core,
      files,
      deduction,
      freeEngine,
      setAppMode: (mode: 'home' | 'guided' | 'free') =>
        useFreeChemStore.getState().setAppMode(mode),
      getState: () => {
        const s = useChemStore.getState();
        const fs = useFreeChemStore.getState();
        return {
          appMode: fs.appMode,
          screen: s.screen,
          freeScreen: fs.screen,
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
      const target = e.target as HTMLElement | null;
      if (target && target.matches('input, button, select, textarea, label')) return;

      const fs = useFreeChemStore.getState();
      if (fs.appMode === 'free' && fs.screen === 'stage') {
        if (e.code === 'Space') {
          e.preventDefault();
          fs.play();
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          if (fs.stageIndex < fs.compiledStages.length - 1) {
            fs.goStage(fs.stageIndex + 1, true);
          }
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          if (fs.stageIndex > 0) {
            fs.goStage(fs.stageIndex - 1, true);
          }
        } else if (e.code === 'Home') {
          e.preventDefault();
          fs.restart();
        }
        return;
      }

      const s = useChemStore.getState();
      if (fs.appMode !== 'guided' || s.screen !== 'stage' || s.configDialogOpen || s.helpDialogOpen)
        return;

      if (e.code === 'Space') {
        e.preventDefault();
        s.play();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (s.index < Math.min(6, s.unlockedMaxStep + 1)) {
          s.go(s.index + 1, false);
        } else {
          s.showToast('Complete the current step deduction to unlock the next step.');
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
    <div className="app-shell">
      <AmbientParticles />
      {appMode === 'home' && <HomeEntry />}

      {appMode === 'guided' && (
        <>
          <Header />
          {screen === 'gate' && <GateScreen />}
          {screen === 'pipeline' && <PipelineScreen />}
          {screen === 'stage' && <StageScreen />}
        </>
      )}

      {appMode === 'free' && (
        <>
          <FreeHeader />
          {freeScreen === 'gate' && <FreeGateScreen />}
          {freeScreen === 'pipeline' && <FreePipelineScreen />}
          {freeScreen === 'stage' && <FreeStageScreen />}
        </>
      )}

      <div
        className="toast"
        id="toast"
        role="status"
        aria-live="polite"
        hidden={!toastMessage}
      >
        {toastMessage}
      </div>
    </div>
  );
};
