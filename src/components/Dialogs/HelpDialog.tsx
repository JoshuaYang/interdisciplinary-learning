import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useChemStore } from '../../store/useChemStore';

export const HelpDialog: React.FC = () => {
  const open = useChemStore((s) => s.helpDialogOpen);
  const setOpen = useChemStore((s) => s.setHelpDialogOpen);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="radix-dialog-overlay" />
        <Dialog.Content className="radix-dialog-content dialog-surface" aria-labelledby="help-title">
          <div className="dialog-header">
            <div>
              <span className="small-label">USER GUIDE</span>
              <Dialog.Title asChild>
                <h2 id="help-title">Classroom Experiment & Interaction Guide</h2>
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="icon-button" id="help-close" type="button" aria-label="Close Guide">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <ol className="help-list">
            <li>
              <strong>Step 1 · Molecular Structure Configuration & 3D Preview</strong>
              <p>
                Configure and verify all 6 chemical species. The system verifies formulas, hybridization, geometries, bond lengths, and bond angles. Click on any card to inspect its 3D ball-and-stick model.
              </p>
            </li>
            <li>
              <strong>Step 2 · Reaction Pathway Construction</strong>
              <p>
                Drag or place species into reaction zones to build Initiation, Propagation (I & II), and Termination (3 radical coupling reactions).
              </p>
            </li>
            <li>
              <strong>Step 3 · 3D Reaction Deduction & Atom Tracking</strong>
              <p>
                Rotate and zoom the 3D model, click atoms to inspect bonds and coordinates, and solve reaction deduction questions to unlock all 7 steps and continuous animation.
              </p>
            </li>
          </ol>

          <div className="keyboard-help">
            <kbd>Space</kbd> Play / Pause <kbd>←</kbd>
            <kbd>→</kbd> Step Forward / Back <kbd>Home</kbd> Reset Step & View
          </div>
          <p className="dialog-footnote">
            Offline ready · Bond lengths in Å · 3D animations depict microscopic reaction mechanisms
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
