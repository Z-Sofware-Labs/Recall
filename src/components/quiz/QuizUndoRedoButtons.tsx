import { Undo2, Redo2 } from 'lucide-react';

interface QuizUndoRedoButtonsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  className?: string;
}

export function QuizUndoRedoButtons({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  className = '',
}: QuizUndoRedoButtonsProps) {
  return (
    <div className={`flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs ${className}`}>
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        title="Undo change (Ctrl+Z / ⌘Z)"
      >
        <Undo2 size={14} />
        <span className="hidden sm:inline">Undo</span>
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        title="Redo change (Ctrl+Y / ⌘Shift+Z)"
      >
        <Redo2 size={14} />
        <span className="hidden sm:inline">Redo</span>
      </button>
    </div>
  );
}

export default QuizUndoRedoButtons;
