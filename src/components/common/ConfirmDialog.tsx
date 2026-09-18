import { AlertTriangle } from 'lucide-react';
import ModalWindow from './ModalWindow';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmation',
  message = 'This action will discard any unsaved progress. Are you sure you want to continue?',
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  isDestructive = true,
}: ConfirmDialogProps) {
  return (
    <ModalWindow isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md" showMinMax={false}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full shrink-0 ${isDestructive ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-950/50 text-blue-600'}`}>
          <AlertTriangle size={24} />
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900 dark:text-white text-base">{title}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors cursor-pointer shadow-sm ${
            isDestructive 
              ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800' 
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalWindow>
  );
}
