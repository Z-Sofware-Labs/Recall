import { useState, useEffect, useRef, useMemo, useCallback, PointerEvent as ReactPointerEvent, ClipboardEvent } from 'react';
import {
  ArrowDownUp, CheckCircle2, AlertCircle,
  RotateCcw, Eye, Edit3, Award, MinusCircle,
  Save, X, Check, HelpCircle, ShieldAlert,
  Plus, Trash2, ArrowUp, ArrowDown, GripVertical,
  Move, ClipboardList, Sparkles, Undo2, Redo2
} from 'lucide-react';
import { scoreService } from '../../services/scoreService';
import { SequenceStep, SequencingActivityData, QuizActivity } from '../../types/quiz';
import { parsePastedList } from '../../utils/quizPasteParser';
import { useQuizUndoRedo } from '../../hooks/useQuizUndoRedo';
import { QuizUndoRedoButtons } from './QuizUndoRedoButtons';

const defaultSteps: SequenceStep[] = [
  { id: 'seq_1', text: 'Step 1', correctOrder: 1 },
  { id: 'seq_2', text: 'Step 2', correctOrder: 2 },
  { id: 'seq_3', text: 'Step 3', correctOrder: 3 },
];

interface SequencingProps {
  initialData?: QuizActivity | null;
  onBack?: () => void;
  onSaveToCourse?: (activity: QuizActivity) => void;
}

export default function Sequencing({ initialData, onBack, onSaveToCourse }: SequencingProps) {
  const [viewMode, setViewMode] = useState<'author' | 'preview'>('author');
  const [prompt, setPrompt] = useState(
    initialData?.prompt || 'Sequencing Activity'
  );
  const [instructions, setInstructions] = useState(
    initialData?.instructions || 'Drag and drop or use arrow buttons to arrange the steps from first (top) to last (bottom).'
  );

  const [steps, setSteps] = useState<SequenceStep[]>(
    initialData?.data?.sequencing?.steps || defaultSteps
  );
  const [explanation, setExplanation] = useState<string>(
    initialData?.data?.sequencing?.explanation || ''
  );

  // Scoring
  const [pointsPerCorrect, setPointsPerCorrect] = useState<number>(initialData?.pointsPerCorrect ?? 5);
  const [deductionPerMistake, setDeductionPerMistake] = useState<number>(initialData?.deductionPerMistake ?? 0);
  const [retries, setRetries] = useState<number>(initialData?.retries ?? 2);
  const [passingScore, setPassingScore] = useState<number>(() => {
    if (initialData?.passingScore !== undefined) return initialData.passingScore;
    return initialData?.pointsPerCorrect ?? 5;
  });

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Learner Preview State
  const [learnerSteps, setLearnerSteps] = useState<SequenceStep[]>([]);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(retries);
  const [validationResult, setValidationResult] = useState<{
    checked: boolean;
    isCorrect: boolean;
    score: number;
    maxScore: number;
    correctPositions: number;
    isPassed: boolean;
    isFailed: boolean;
  } | null>(null);

  // Drag and Drop Pointer Engine (Works cleanly in Tauri WebView2)
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [dragItem, setDragItem] = useState<SequenceStep | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (initialData) {
      setPrompt(initialData.prompt || 'Arrange the Hydroelectric Power Generation Cycle in correct chronological order:');
      setInstructions(initialData.instructions || 'Drag and drop anywhere on the cards or use the arrow buttons to arrange the steps from first (top) to last (bottom).');
      if (initialData.data?.sequencing) {
        setSteps(initialData.data.sequencing.steps || defaultSteps);
        setExplanation(initialData.data.sequencing.explanation || '');
      }
      setPointsPerCorrect(initialData.pointsPerCorrect ?? 5);
      setDeductionPerMistake(initialData.deductionPerMistake ?? 0);
      setRetries(initialData.retries ?? 2);
      setPassingScore(initialData.passingScore ?? (initialData.pointsPerCorrect ?? 5));
    }
  }, [initialData]);

  // Undo & Redo History State
  const currentSnapshot = useMemo(() => ({
    prompt,
    instructions,
    steps,
    explanation,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
  }), [
    prompt,
    instructions,
    steps,
    explanation,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
  ]);

  const applySnapshot = useCallback((state: typeof currentSnapshot) => {
    if (state.prompt !== undefined) setPrompt(state.prompt);
    if (state.instructions !== undefined) setInstructions(state.instructions);
    if (state.steps !== undefined) setSteps(state.steps);
    if (state.explanation !== undefined) setExplanation(state.explanation);
    if (state.pointsPerCorrect !== undefined) setPointsPerCorrect(state.pointsPerCorrect);
    if (state.passingScore !== undefined) setPassingScore(state.passingScore);
    if (state.deductionPerMistake !== undefined) setDeductionPerMistake(state.deductionPerMistake);
    if (state.retries !== undefined) setRetries(state.retries);
  }, []);

  const { canUndo, canRedo, handleUndo, handleRedo } = useQuizUndoRedo(currentSnapshot, applySnapshot);

  const handleEnterPreview = () => {
    setViewMode('preview');
    setValidationResult(null);
    setAttemptsRemaining(retries);

    // Shuffle steps for learner
    const shuffled = [...steps].sort(() => Math.random() - 0.5);
    setLearnerSteps(shuffled);
  };

  // Bulk Steps Paste Modal State
  const [bulkModal, setBulkModal] = useState<{ isOpen: boolean; rawText: string; mode: 'replace' | 'append' } | null>(null);

  const handleStepPaste = (stepIndex: number, e: ClipboardEvent<HTMLInputElement>) => {
    const pasteText = e.clipboardData.getData('text');
    if (!pasteText) return;

    const items = parsePastedList(pasteText);
    if (items.length > 1) {
      e.preventDefault();
      setSteps(prev => {
        const next = [...prev];
        items.forEach((itemText, i) => {
          const targetIdx = stepIndex + i;
          if (targetIdx < next.length) {
            next[targetIdx] = { ...next[targetIdx], text: itemText };
          } else {
            next.push({
              id: `seq_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
              text: itemText,
              correctOrder: next.length + 1,
            });
          }
        });
        return next.map((s, idx) => ({ ...s, correctOrder: idx + 1 }));
      });
    }
  };

  const handleApplyBulkSteps = (rawText: string, mode: 'replace' | 'append') => {
    const items = parsePastedList(rawText);
    if (items.length === 0) return;

    const createdSteps: SequenceStep[] = items.map((text, idx) => ({
      id: `seq_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      text,
      correctOrder: idx + 1,
    }));

    if (mode === 'replace') {
      setSteps(createdSteps);
    } else {
      setSteps(prev => {
        const combined = [...prev, ...createdSteps];
        return combined.map((s, i) => ({ ...s, correctOrder: i + 1 }));
      });
    }
    setBulkModal(null);
  };

  // Authoring: Step modifications
  const handleAddStep = () => {
    const newStep: SequenceStep = {
      id: `seq_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      text: `Step #${steps.length + 1} description`,
      correctOrder: steps.length + 1,
    };
    setSteps(prev => [...prev, newStep]);
  };

  const handleUpdateStepText = (id: string, text: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, text } : s));
  };

  const handleMoveStepAuthor = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === steps.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const list = [...steps];
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    const updated = list.map((item, i) => ({ ...item, correctOrder: i + 1 }));
    setSteps(updated);
  };

  const handleDeleteStep = (id: string) => {
    if (steps.length <= 2) return;
    const list = steps.filter(s => s.id !== id).map((item, i) => ({ ...item, correctOrder: i + 1 }));
    setSteps(list);
  };

  // Learner: Move step up / down buttons
  const handleMoveStepLearner = (idx: number, direction: 'up' | 'down') => {
    if (validationResult?.checked) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === learnerSteps.length - 1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const list = [...learnerSteps];
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    setLearnerSteps(list);
  };

  // =========================================================================
  // Pointer-Driven Drag and Drop (Entire Box Grab Enabled)
  // =========================================================================
  const dragIndexRef = useRef<number | null>(null);
  const dropTargetIndexRef = useRef<number | null>(null);

  const handlePointerDownDrag = (e: ReactPointerEvent, index: number, isAuthor: boolean = false) => {
    if (validationResult?.checked) return;
    if (e.button !== 0) return; // only left click

    // Don't drag if clicking directly on buttons or inputs
    const target = e.target as HTMLElement;
    if (target.closest('input, button, textarea, a, select')) {
      return;
    }

    e.preventDefault();
    isDraggingRef.current = true;
    const currentList = isAuthor ? steps : learnerSteps;
    const item = currentList[index];

    dragIndexRef.current = index;
    dropTargetIndexRef.current = index;
    setDragIndex(index);
    setDropTargetIndex(index);
    setDragItem(item);
    setPointerPos({ x: e.clientX, y: e.clientY });

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;
      setPointerPos({ x: moveEvent.clientX, y: moveEvent.clientY });

      // Calculate the most accurate target based on center midpoints of rendered items
      const allItemElements = Array.from(document.querySelectorAll('[data-seq-index]'));
      let closestIdx: number | null = null;
      let minDistance = Infinity;

      for (const el of allItemElements) {
        const idxAttr = el.getAttribute('data-seq-index');
        if (idxAttr === null) continue;
        const targetIdx = parseInt(idxAttr, 10);
        if (isNaN(targetIdx)) continue;

        const rect = el.getBoundingClientRect();
        const midY = (rect.top + rect.bottom) / 2;
        const dist = Math.abs(moveEvent.clientY - midY);

        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = targetIdx;
        }
      }

      if (closestIdx !== null) {
        dropTargetIndexRef.current = closestIdx;
        setDropTargetIndex(closestIdx);
      }
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      const fromIdx = dragIndexRef.current;
      const toIdx = dropTargetIndexRef.current;

      if (fromIdx !== null && toIdx !== null && fromIdx !== toIdx) {
        if (isAuthor) {
          setSteps((prev) => {
            const list = [...prev];
            const temp = list[fromIdx];
            list[fromIdx] = list[toIdx];
            list[toIdx] = temp;
            return list.map((s, i) => ({ ...s, correctOrder: i + 1 }));
          });
        } else {
          setLearnerSteps((prev) => {
            const list = [...prev];
            const temp = list[fromIdx];
            list[fromIdx] = list[toIdx];
            list[toIdx] = temp;
            return list;
          });
        }
      }

      dragIndexRef.current = null;
      dropTargetIndexRef.current = null;
      setDragIndex(null);
      setDropTargetIndex(null);
      setDragItem(null);
      setPointerPos(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleCheckAnswer = () => {
    let correctPositions = 0;
    learnerSteps.forEach((s, idx) => {
      if (s.correctOrder === idx + 1) {
        correctPositions += 1;
      }
    });

    const isAllCorrect = correctPositions === steps.length;
    const isGradedTest = pointsPerCorrect > 0;
    const finalScore = isAllCorrect ? pointsPerCorrect : 0;
    const isPassed = !isGradedTest || finalScore >= passingScore;

    setValidationResult({
      checked: true,
      isCorrect: isAllCorrect,
      score: finalScore,
      maxScore: pointsPerCorrect,
      correctPositions,
      isPassed,
      isFailed: isGradedTest && !isPassed,
    });

    if (retries > 0 && attemptsRemaining > 0) {
      setAttemptsRemaining(prev => prev - 1);
    }

    scoreService.recordQuizScore({
      courseId: 'proj_sample_01',
      quizId: initialData?.id || 'quiz_seq_01',
      quizTitle: prompt || 'Sequencing Question',
      quizType: 'Sequencing',
      score: finalScore,
      maxScore: pointsPerCorrect,
      correctCount: isAllCorrect ? 1 : 0,
      mistakeCount: isAllCorrect ? 0 : 1,
      attempts: 1,
    });
  };

  const handleSaveToCourse = () => {
    const activity: QuizActivity = {
      id: initialData?.id || `quiz_seq_${Date.now()}`,
      name: prompt || 'Sequencing Activity',
      type: 'Sequencing',
      prompt,
      instructions,
      pointsPerCorrect,
      deductionPerMistake,
      retries,
      isGraded: pointsPerCorrect > 0,
      passingScore: pointsPerCorrect > 0 ? passingScore : undefined,
      data: {
        sequencing: {
          steps,
          explanation,
        },
      },
      totalPoints: pointsPerCorrect,
      lastModified: Date.now(),
    };

    onSaveToCourse?.(activity);
    setSaveSuccessMessage('Activity saved to Course Organizer!');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-200 select-none">
      {/* Floating Ghost during drag */}
      {dragItem && pointerPos && (
        <div
          className="fixed pointer-events-none z-50 p-4 bg-blue-600 text-white rounded-xl shadow-2xl border-2 border-white/80 flex items-center gap-3 w-80 max-w-sm transform -translate-x-1/2 -translate-y-1/2 opacity-95 scale-105"
          style={{ left: pointerPos.x, top: pointerPos.y }}
        >
          <GripVertical size={16} className="text-blue-200" />
          <span className="text-xs font-bold line-clamp-2">{dragItem.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <ArrowDownUp size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Question Type
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Sequencing (Full-Box Drag & Drop)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {prompt || 'Untitled Sequencing Question'}
            </h2>
          </div>
        </div>

        {/* View Mode Switcher, Undo/Redo & Save */}
        <div className="flex flex-wrap items-center justify-end gap-3 sm:ml-auto shrink-0">
          <QuizUndoRedoButtons
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />

          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('author')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${viewMode === 'author'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
            >
              <Edit3 size={14} />
              <span>Authoring</span>
            </button>
            <button
              onClick={handleEnterPreview}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${viewMode === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
            >
              <Eye size={14} />
              <span>Learner Preview</span>
            </button>
          </div>

          <button
            onClick={handleSaveToCourse}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Save size={15} />
            <span>Save to Course Editor</span>
          </button>

          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Back
            </button>
          )}
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{saveSuccessMessage}</span>
          </div>
          <button onClick={() => setSaveSuccessMessage(null)} className="p-0.5 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. AUTHORING */}
      {viewMode === 'author' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Sequencing Prompt
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Order the sequence of events from beginning to end"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Student Instructions / Question
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Drag and drop items into the correct order."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Sequence Steps in Correct Order */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Correct Master Order (Top to Bottom)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Drag any card or use the arrows to set the master order. Students receive a randomized list.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkModal({ isOpen: true, rawText: '', mode: 'replace' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    title="Paste numbered or bulleted list of steps"
                  >
                    <ClipboardList size={13} className="text-blue-600 dark:text-blue-400" />
                    <span>Bulk Paste Steps</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
                  >
                    <Plus size={14} /> Add Step
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {steps.map((step, idx) => (
                  <div
                    key={step.id}
                    data-seq-index={idx}
                    onPointerDown={(e) => handlePointerDownDrag(e, idx, true)}
                    className={`p-3 bg-slate-50 dark:bg-slate-950 border rounded-xl flex items-center gap-3 transition-all cursor-grab active:cursor-grabbing touch-none ${dropTargetIndex === idx && dragIndex !== null && dragIndex !== idx
                        ? 'border-blue-500 ring-2 ring-blue-400/40'
                        : dragIndex === idx
                          ? 'opacity-40 border-dashed border-slate-400'
                          : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'
                      }`}
                  >
                    <div className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg">
                      <GripVertical size={16} />
                    </div>

                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    <input
                      type="text"
                      value={step.text}
                      onChange={(e) => handleUpdateStepText(step.id, e.target.value)}
                      onPaste={(e) => handleStepPaste(idx, e)}
                      placeholder={`Step ${idx + 1} text (paste list directly)`}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500 cursor-text"
                    />

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveStepAuthor(idx, 'up')}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === steps.length - 1}
                        onClick={() => handleMoveStepAuthor(idx, 'down')}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown size={14} />
                      </button>
                      {steps.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteStep(step.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer ml-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scoring & Rules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Award size={15} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Points for Sequence</span>
                  </span>
                  {pointsPerCorrect === 0 && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Non-graded
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={pointsPerCorrect}
                    onChange={(e) => setPointsPerCorrect(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    placeholder="0"
                  />
                  <span className="text-xs font-medium text-slate-500">pts</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {pointsPerCorrect > 0 ? `Total value: ${pointsPerCorrect} pts` : '0 pts = Non-graded practice'}
                </p>
              </div>

              <div className={`space-y-1.5 p-3.5 rounded-xl border transition-all ${pointsPerCorrect > 0
                  ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                  : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                }`}>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Passing Score</span>
                  {pointsPerCorrect === 0 && <span className="text-[10px] font-medium text-slate-400">Grayed out</span>}
                </label>
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="number"
                    min="1"
                    max={pointsPerCorrect || 1}
                    disabled={pointsPerCorrect === 0}
                    value={pointsPerCorrect > 0 ? passingScore : ''}
                    onChange={(e) => setPassingScore(Math.max(1, Math.min(pointsPerCorrect, parseInt(e.target.value, 10) || 1)))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:bg-slate-100 disabled:dark:bg-slate-950 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
                    placeholder={pointsPerCorrect > 0 ? 'e.g. 5' : 'N/A (Non-graded)'}
                  />
                  <span className="text-xs font-medium text-slate-500">pts</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {pointsPerCorrect > 0 ? `Fails if score < ${passingScore} pts` : 'Non-graded tests have no passing score.'}
                </p>
              </div>

              <div className={`space-y-1.5 p-3.5 rounded-xl border transition-all ${pointsPerCorrect > 0
                  ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                  : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                }`}>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <MinusCircle size={15} className="text-rose-600 dark:text-rose-400" />
                    <span>Deduction per error</span>
                  </span>
                  {pointsPerCorrect === 0 && <span className="text-[10px] font-medium text-slate-400">Grayed out</span>}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    disabled={pointsPerCorrect === 0}
                    value={pointsPerCorrect > 0 ? deductionPerMistake : ''}
                    onChange={(e) => setDeductionPerMistake(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:bg-slate-100 disabled:dark:bg-slate-950 text-sm font-semibold focus:ring-2 focus:ring-rose-500 outline-hidden"
                    placeholder={pointsPerCorrect > 0 ? '0' : 'N/A (Non-graded)'}
                  />
                  <span className="text-xs font-medium text-slate-500">pts</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {pointsPerCorrect > 0 ? 'Points subtracted per error' : 'No deductions on non-graded'}
                </p>
              </div>

              <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <RotateCcw size={15} className="text-amber-600 dark:text-amber-400" />
                  <span>Allowed retries</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={retries}
                    onChange={(e) => setRetries(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-amber-500 outline-hidden"
                    placeholder="0"
                  />
                  <span className="text-xs font-medium text-slate-500">retries</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{retries === 0 ? 'Unlimited' : `Max ${retries} attempts`}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LEARNER PREVIEW */}
      {viewMode === 'preview' && (
        <div className="space-y-6">
          <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <ArrowDownUp size={16} className="text-blue-600 dark:text-blue-400" />
                <span>{instructions}</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Click and drag anywhere on any card or use the arrows to re-order the sequence from top to bottom.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Question Prompt
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                {prompt}
              </h3>
            </div>

            {/* Learner Steps with Entire Box Drag & Drop */}
            <div className="space-y-2.5">
              {learnerSteps.map((step, idx) => {
                const isChecked = validationResult?.checked;
                const isCorrectPosition = step.correctOrder === idx + 1;
                const isBeingDragged = dragIndex === idx;
                const isTarget = dropTargetIndex === idx && dragIndex !== null && dragIndex !== idx;

                return (
                  <div
                    key={step.id}
                    data-seq-index={idx}
                    onPointerDown={(e) => handlePointerDownDrag(e, idx, false)}
                    className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3.5 touch-none ${!isChecked ? 'cursor-grab active:cursor-grabbing select-none' : ''
                      } ${isChecked
                        ? isCorrectPosition
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40'
                          : 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40'
                        : isTarget
                          ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 ring-4 ring-blue-400/30 scale-[1.02]'
                          : isBeingDragged
                            ? 'opacity-30 border-dashed border-slate-400'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 hover:border-blue-300 hover:shadow-xs'
                      }`}
                  >
                    {!isChecked && (
                      <div className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 shrink-0">
                        <GripVertical size={18} />
                      </div>
                    )}

                    <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    <span className="text-sm font-medium text-slate-900 dark:text-white flex-1 select-none break-words whitespace-normal leading-relaxed">
                      {step.text}
                    </span>

                    {!isChecked && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveStepLearner(idx, 'up');
                          }}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 disabled:opacity-30 cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === learnerSteps.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveStepLearner(idx, 'down');
                          }}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 disabled:opacity-30 cursor-pointer"
                          title="Move down"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    )}

                    {isChecked && (
                      isCorrectPosition
                        ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                        : <span className="text-xs font-bold text-rose-600 shrink-0">(Correct: #{step.correctOrder})</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Validation Footer */}
          <div className={`bg-white dark:bg-slate-900 border ${validationResult?.isFailed
              ? 'border-rose-300 ring-2 ring-rose-500/20'
              : validationResult?.isPassed && pointsPerCorrect > 0
                ? 'border-emerald-300 ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800'
            } rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
            <div>
              {validationResult ? (
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-full ${validationResult.isFailed
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-emerald-100 text-emerald-600'
                    }`}>
                    {validationResult.isFailed ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        Score: {validationResult.score} / {validationResult.maxScore} Points
                      </h4>
                      {pointsPerCorrect > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${validationResult.isFailed ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                          {validationResult.isFailed ? 'Failed (Must Repeat)' : 'Passed'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {validationResult.correctPositions} of {steps.length} steps in correct order
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Drag and drop anywhere on the cards to arrange items in order, then click Check Order.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {validationResult?.isFailed ? (
                <button
                  onClick={handleEnterPreview}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold animate-pulse cursor-pointer"
                >
                  <RotateCcw size={15} />
                  <span>Repeat Question</span>
                </button>
              ) : (
                <button
                  onClick={handleEnterPreview}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
              )}

              {(!validationResult || !validationResult.isFailed) && (
                <button
                  onClick={handleCheckAnswer}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Check Order</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Steps Modal */}
      {bulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Bulk Paste Sequence Steps
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Paste listed items (numbered, bulleted, or line by line) in correct order from top to bottom.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Paste Steps in Master Order (Top to Bottom):
                </label>
                {bulkModal.rawText.trim() && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    Detected {parsePastedList(bulkModal.rawText).length} steps
                  </span>
                )}
              </div>
              <textarea
                rows={8}
                value={bulkModal.rawText}
                onChange={(e) => setBulkModal(prev => prev ? { ...prev, rawText: e.target.value } : null)}
                placeholder={`1. Apple\n2. Ball\n3. Candle\n\nOr:\nApple\nBall\nCandle`}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden leading-relaxed"
                autoFocus
              />
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-blue-500" />
                  <span>Smart Formatting Support:</span>
                </div>
                <p>• Automatically strips numbers (<code className="text-blue-600 dark:text-blue-400 font-mono">1.</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">1)</code>), letters, or bullets (<code className="text-blue-600 dark:text-blue-400 font-mono">•</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">-</code>).</p>
                <p>• Each line becomes an individual draggable sequence card.</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Mode:</label>
                <button
                  type="button"
                  onClick={() => setBulkModal(prev => prev ? { ...prev, mode: 'replace' } : null)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${bulkModal.mode === 'replace'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                >
                  Replace All
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModal(prev => prev ? { ...prev, mode: 'append' } : null)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${bulkModal.mode === 'append'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                >
                  Append
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!bulkModal.rawText.trim() || parsePastedList(bulkModal.rawText).length === 0}
                  onClick={() => handleApplyBulkSteps(bulkModal.rawText, bulkModal.mode)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Import {parsePastedList(bulkModal.rawText).length} Steps
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
