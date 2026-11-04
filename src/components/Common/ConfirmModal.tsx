import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="radix-dialog-overlay" />
        <Dialog.Content className="radix-dialog-content dialog-surface confirm-dialog" aria-describedby={undefined}>
          <div className="confirm-dialog-body">
            <div className={`confirm-dialog-icon-wrap ${danger ? 'danger' : 'info'}`}>
              <AlertTriangle size={24} />
            </div>
            <div className="confirm-dialog-text">
              <Dialog.Title asChild>
                <h3 className="confirm-dialog-title">{title}</h3>
              </Dialog.Title>
              <p className="confirm-dialog-desc">{description}</p>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="confirm-dialog-close" aria-label="Close">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="confirm-dialog-footer">
            <button
              type="button"
              className="toolbar-btn-outline"
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`primary-button ${danger ? 'danger-button' : ''}`}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
