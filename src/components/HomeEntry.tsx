import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Atom, Compass, FlaskConical, Layers, Sparkles } from 'lucide-react';
import { useFreeChemStore } from '../store/useFreeChemStore';

export const HomeEntry: React.FC = () => {
  const setAppMode = useFreeChemStore((s) => s.setAppMode);

  return (
    <div className="home-entry-shell">
      <header className="app-header">
        <div className="identity">
          <span className="mark" aria-hidden="true">
            <Atom size={24} strokeWidth={2} />
          </span>
          <div>
            <div className="identity-title-row">
              <h1>ChemReaction 3D</h1>
            </div>
            <p>
              Molecular Geometry & Reaction Workbench
            </p>
          </div>
        </div>
      </header>

      <main className="home-entry-main">
        <div className="home-entry-container">
          <div className="home-hero">
            <span className="small-label">SELECT WORKBENCH MODE</span>
            <h2>Choose Your Reaction Workbench</h2>
            <p>
              Supports both Guided Radical Substitution Curriculum and Universal Free-Form Reaction Construction
            </p>
          </div>

          <div className="home-cards-grid">
            {/* Card 1: Guided Radical Substitution */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className="home-mode-card guided-card"
              onClick={() => setAppMode('guided')}
            >
              <div className="home-card-top">
                <span className="home-card-icon guided">
                  <FlaskConical size={26} />
                </span>
                <span className="home-card-badge">Guided Curriculum</span>
              </div>

              <h3>Radical Substitution of Methane</h3>
              <p className="home-card-desc">
                Explore the photochemical radical bromination of methane by verifying 6 core molecular species, assembling chain initiation, propagation, and termination pathways, and solving 7 interactive 3D mechanism steps.
              </p>

              <ul className="home-card-features">
                <li>
                  <Layers size={16} />
                  <span>6 core molecular structure verifications with interactive 3D ball-and-stick previews</span>
                </li>
                <li>
                  <Compass size={16} />
                  <span>4-stage chain reaction pathway assembly with real-time validation</span>
                </li>
                <li>
                  <Atom size={16} />
                  <span>7-step 3D bond-breaking and bond-forming animations with guided deduction</span>
                </li>
              </ul>

              <button
                type="button"
                id="enter-guided-mode-btn"
                className="primary-button home-enter-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setAppMode('guided');
                }}
              >
                <span>Enter Guided Workbench</span>
                <ArrowRight size={18} />
              </button>
            </motion.div>

            {/* Card 2: Free Chemical Reaction Workbench */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.06 }}
              className="home-mode-card free-card"
              onClick={() => setAppMode('free')}
            >
              <div className="home-card-top">
                <span className="home-card-icon free">
                  <Sparkles size={26} />
                </span>
                <span className="home-card-badge accent">Free-Form Builder</span>
              </div>

              <h3>Free Chemical Reaction Workbench</h3>
              <p className="home-card-desc">
                Build any molecule interactively from the 118-element periodic table (or import/export JSON), freely add and name reaction stages, and automatically generate 3D molecular structures and reaction animations.
              </p>

              <ul className="home-card-features">
                <li>
                  <Sparkles size={16} />
                  <span>118-element periodic table builder with one-click recommended VSEPR geometry & bond lengths</span>
                </li>
                <li>
                  <Layers size={16} />
                  <span>Dynamically add, rename, or remove reaction stages and drag-and-drop reactants & products</span>
                </li>
                <li>
                  <Atom size={16} />
                  <span>Automatic atom-mapping and 3D molecular approach, bond rearrangement, and separation animations</span>
                </li>
              </ul>

              <button
                type="button"
                id="enter-free-mode-btn"
                className="primary-button home-enter-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setAppMode('free');
                }}
              >
                <span>Enter Free Reaction Workbench</span>
                <ArrowRight size={18} />
              </button>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};
