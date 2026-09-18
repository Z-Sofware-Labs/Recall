import { useState, useEffect, useRef, useMemo, useCallback, PointerEvent as ReactPointerEvent, ClipboardEvent } from 'react';
import {
  GitCommit, Plus, Trash2, CheckCircle2, AlertCircle,
  RotateCcw, Eye, Edit3, Sparkles, Award, MinusCircle,
  Save, X, Check, ArrowRight, Layers, HelpCircle, Shuffle, ShieldAlert,
  MoveRight, MousePointer, ClipboardList, Undo2, Redo2
} from 'lucide-react';
import { scoreService } from '../../services/scoreService';
import { MatchingPair, QuizActivity } from '../../types/quiz';
import { parseConnectTheDots, parsePastedList } from '../../utils/quizPasteParser';
import { useQuizUndoRedo } from '../../hooks/useQuizUndoRedo';
import { QuizUndoRedoButtons } from './QuizUndoRedoButtons';

const pairColors = [
  { stroke: '#3b82f6', bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-600 dark:text-blue-400', glow: 'rgba(59, 130, 246, 0.4)' },
  { stroke: '#10b981', bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', glow: 'rgba(16, 185, 129, 0.4)' },
  { stroke: '#8b5cf6', bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-600 dark:text-purple-400', glow: 'rgba(139, 92, 246, 0.4)' },
  { stroke: '#f59e0b', bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-400', glow: 'rgba(245, 158, 11, 0.4)' },
  { stroke: '#ec4899', bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-600 dark:text-pink-400', glow: 'rgba(236, 72, 153, 0.4)' },
  { stroke: '#06b6d4', bg: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', glow: 'rgba(6, 182, 212, 0.4)' },
];

const defaultSamplePairs: MatchingPair[] = [
  {
    id: 'pair_1',
    leftText: 'Item 1',
    rightText: 'Match 1',
    explanation: '',
  },
  {
    id: 'pair_2',
    leftText: 'Item 2',
    rightText: 'Match 2',
    explanation: '',
  },
];

interface ConnectTheDotsProps {
  initialData?: QuizActivity | null;
  onBack?: () => void;
  onSaveToCourse?: (activity: QuizActivity) => void;
}

export default function ConnectTheDots({ initialData, onBack, onSaveToCourse }: ConnectTheDotsProps) {
  const [viewMode, setViewMode] = useState<'author' | 'preview'>('author');
  const [prompt, setPrompt] = useState(
    initialData?.prompt || 'Connect the Dots Activity'
  );
  const [instructions, setInstructions] = useState(
    initialData?.instructions || 'Draw lines or click dots to match each concept in the left column with its correct pair on the right.'
  );
  const [leftColumnTitle, setLeftColumnTitle] = useState(
    initialData?.data?.connectTheDots?.leftTitle || 'Column A'
  );
  const [rightColumnTitle, setRightColumnTitle] = useState(
    initialData?.data?.connectTheDots?.rightTitle || 'Column B'
  );
  const [pairs, setPairs] = useState<MatchingPair[]>(
    initialData?.data?.connectTheDots?.pairs && initialData.data.connectTheDots.pairs.length > 0
      ? initialData.data.connectTheDots.pairs
      : defaultSamplePairs
  );

  // Scoring & Retry Parameters
  const [pointsPerCorrect, setPointsPerCorrect] = useState<number>(initialData?.pointsPerCorrect ?? 2);
  const [deductionPerMistake, setDeductionPerMistake] = useState<number>(initialData?.deductionPerMistake ?? 1);
  const [retries, setRetries] = useState<number>(initialData?.retries ?? 2);
  const [passingScore, setPassingScore] = useState<number>(() => {
    if (initialData?.passingScore !== undefined) return initialData.passingScore;
    const initialTotal = (initialData?.data?.connectTheDots?.pairs || defaultSamplePairs).length * (initialData?.pointsPerCorrect ?? 2);
    return Math.max(1, Math.ceil(initialTotal * 0.7));
  });

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Learner Interactive State
  const [shuffledRightItems, setShuffledRightItems] = useState<Array<{ id: string; rightText: string }>>([]);
  const [activeSelectedLeftId, setActiveSelectedLeftId] = useState<string | null>(null);
  const [activeSelectedRightId, setActiveSelectedRightId] = useState<string | null>(null);
  const [userConnections, setUserConnections] = useState<Record<string, string>>({}); // leftId -> rightPairId
  const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(retries);
  const [validationResults, setValidationResults] = useState<{
    checked: boolean;
    score: number;
    maxScore: number;
    correctCount: number;
    mistakeCount: number;
    deductionTotal: number;
    isPassed: boolean;
    isFailed: boolean;
  } | null>(null);

  // Drag-to-connect line state (Can start from Left or Right)
  const [activeLineDrag, setActiveLineDrag] = useState<{
    origin: 'left' | 'right';
    originId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isMoved: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const leftItemRefs = useRef<Record<string, HTMLElement | null>>({});
  const rightItemRefs = useRef<Record<string, HTMLElement | null>>({});
  const [nodeCoords, setNodeCoords] = useState<{
    left: Record<string, { x: number; y: number }>;
    right: Record<string, { x: number; y: number }>;
  }>({ left: {}, right: {} });

  // Sync initialData
  useEffect(() => {
    if (initialData) {
      setPrompt(initialData.prompt || 'Activity: Match Renewable Energy Concepts with Technical Principles');
      setInstructions(initialData.instructions || 'Draw lines or click dots to match each concept in the left column with its correct definition on the right.');
      if (initialData.data?.connectTheDots) {
        setPairs(initialData.data.connectTheDots.pairs || defaultSamplePairs);
        setLeftColumnTitle(initialData.data.connectTheDots.leftTitle || 'Energy Systems & Technologies');
        setRightColumnTitle(initialData.data.connectTheDots.rightTitle || 'Operating Principle & Function');
      }
      setPointsPerCorrect(initialData.pointsPerCorrect ?? 2);
      setDeductionPerMistake(initialData.deductionPerMistake ?? 1);
      setRetries(initialData.retries ?? 2);
      const count = initialData.data?.connectTheDots?.pairs?.length || defaultSamplePairs.length;
      setPassingScore(initialData.passingScore ?? Math.max(1, Math.ceil(count * (initialData.pointsPerCorrect ?? 2) * 0.7)));
    }
  }, [initialData]);

  // Undo & Redo History State
  const currentSnapshot = useMemo(() => ({
    prompt,
    instructions,
    leftColumnTitle,
    rightColumnTitle,
    pairs,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
  }), [
    prompt,
    instructions,
    leftColumnTitle,
    rightColumnTitle,
    pairs,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
  ]);

  const applySnapshot = useCallback((state: typeof currentSnapshot) => {
    if (state.prompt !== undefined) setPrompt(state.prompt);
    if (state.instructions !== undefined) setInstructions(state.instructions);
    if (state.leftColumnTitle !== undefined) setLeftColumnTitle(state.leftColumnTitle);
    if (state.rightColumnTitle !== undefined) setRightColumnTitle(state.rightColumnTitle);
    if (state.pairs !== undefined) setPairs(state.pairs);
    if (state.pointsPerCorrect !== undefined) setPointsPerCorrect(state.pointsPerCorrect);
    if (state.passingScore !== undefined) setPassingScore(state.passingScore);
    if (state.deductionPerMistake !== undefined) setDeductionPerMistake(state.deductionPerMistake);
    if (state.retries !== undefined) setRetries(state.retries);
  }, []);

  const { canUndo, canRedo, handleUndo, handleRedo } = useQuizUndoRedo(currentSnapshot, applySnapshot);

  // Recalculate anchor positions for SVG lines
  const updateNodeCoordinates = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    const left: Record<string, { x: number; y: number }> = {};
    const right: Record<string, { x: number; y: number }> = {};

    Object.entries(leftItemRefs.current).forEach(([id, el]) => {
      const element = el as HTMLElement | null;
      if (element) {
        const rect = element.getBoundingClientRect();
        left[id] = {
          x: rect.right - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top,
        };
      }
    });

    Object.entries(rightItemRefs.current).forEach(([id, el]) => {
      const element = el as HTMLElement | null;
      if (element) {
        const rect = element.getBoundingClientRect();
        right[id] = {
          x: rect.left - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top,
        };
      }
    });

    setNodeCoords({ left, right });
  };

  useEffect(() => {
    updateNodeCoordinates();
    window.addEventListener('resize', updateNodeCoordinates);
    return () => window.removeEventListener('resize', updateNodeCoordinates);
  }, [pairs, shuffledRightItems, viewMode]);

  // Initialize preview randomized items
  const handleEnterPreview = () => {
    setViewMode('preview');
    setActiveSelectedLeftId(null);
    setActiveSelectedRightId(null);
    setUserConnections({});
    setValidationResults(null);
    setAttemptsRemaining(retries);

    // Shuffle right column items
    const shuffled = [...pairs]
      .map(p => ({ id: p.id, rightText: p.rightText }))
      .sort(() => Math.random() - 0.5);
    setShuffledRightItems(shuffled);

    setTimeout(() => {
      updateNodeCoordinates();
    }, 60);
  };

  // Authoring: Pair modifications
  const handleAddPair = () => {
    const newPair: MatchingPair = {
      id: `pair_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      leftText: 'New Term / Concept',
      rightText: 'Matching definition or description',
      explanation: 'Detailed explanation for this pairing.',
    };
    setPairs(prev => [...prev, newPair]);
  };

  const handleUpdatePair = (id: string, field: 'leftText' | 'rightText' | 'explanation', value: string) => {
    setPairs(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // Bulk Import Modal State
  const [bulkModal, setBulkModal] = useState<{ isOpen: boolean; rawText: string; mode: 'replace' | 'append' } | null>(null);

  const handleApplyBulkPairs = (rawText: string, mode: 'replace' | 'append') => {
    const parsed = parseConnectTheDots(rawText);
    if (parsed.pairs.length === 0) return;

    if (parsed.leftTitle) setLeftColumnTitle(parsed.leftTitle);
    if (parsed.rightTitle) setRightColumnTitle(parsed.rightTitle);

    const createdPairs: MatchingPair[] = parsed.pairs.map((p, idx) => ({
      id: `pair_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      leftText: p.leftText,
      rightText: p.rightText,
      explanation: p.explanation || '',
    }));

    if (mode === 'replace') {
      setPairs(createdPairs);
    } else {
      setPairs(prev => [...prev, ...createdPairs]);
    }
    setBulkModal(null);
  };

  const handleLeftItemPaste = (pairIndex: number, e: ClipboardEvent<HTMLInputElement>) => {
    const pasteText = e.clipboardData.getData('text');
    if (!pasteText) return;

    // Check if it's a full matching activity with Hanay A / B or side-by-side
    const hasColumns = /hanay|column|kolum/i.test(pasteText) && (pasteText.includes('B') || pasteText.includes('2'));
    const isSideBySide = pasteText.includes('\t') || (pasteText.includes('-') && pasteText.includes('\n'));

    if (hasColumns || isSideBySide) {
      e.preventDefault();
      const parsed = parseConnectTheDots(pasteText);
      if (parsed.pairs.length > 0) {
        if (parsed.leftTitle) setLeftColumnTitle(parsed.leftTitle);
        if (parsed.rightTitle) setRightColumnTitle(parsed.rightTitle);

        const createdPairs: MatchingPair[] = parsed.pairs.map((p, idx) => ({
          id: `pair_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
          leftText: p.leftText,
          rightText: p.rightText,
          explanation: p.explanation || '',
        }));

        setPairs(createdPairs);
        return;
      }
    }

    // If it's a list of left items (e.g. 1. Visigoths \n 2. Excommunication...)
    const list = parsePastedList(pasteText);
    if (list.length > 1) {
      e.preventDefault();
      setPairs(prev => {
        const next = [...prev];
        list.forEach((itemText, lIdx) => {
          const targetIdx = pairIndex + lIdx;
          if (targetIdx < next.length) {
            next[targetIdx] = { ...next[targetIdx], leftText: itemText };
          } else {
            next.push({
              id: `pair_${Date.now()}_${lIdx}_${Math.random().toString(36).substring(2, 5)}`,
              leftText: itemText,
              rightText: `Match ${next.length + 1}`,
              explanation: '',
            });
          }
        });
        return next;
      });
    }
  };

  const handleRightItemPaste = (pairIndex: number, e: ClipboardEvent<HTMLInputElement>) => {
    const pasteText = e.clipboardData.getData('text');
    if (!pasteText) return;

    const list = parsePastedList(pasteText);
    if (list.length > 1) {
      e.preventDefault();
      setPairs(prev => {
        const next = [...prev];
        list.forEach((itemText, lIdx) => {
          const targetIdx = pairIndex + lIdx;
          if (targetIdx < next.length) {
            next[targetIdx] = { ...next[targetIdx], rightText: itemText };
          } else {
            next.push({
              id: `pair_${Date.now()}_${lIdx}_${Math.random().toString(36).substring(2, 5)}`,
              leftText: `Item ${next.length + 1}`,
              rightText: itemText,
              explanation: '',
            });
          }
        });
        return next;
      });
    }
  };

  const handleDeletePair = (id: string) => {
    if (pairs.length <= 2) return;
    setPairs(prev => prev.filter(p => p.id !== id));
  };

  // Connect helper
  const connectPair = (leftId: string, rightId: string) => {
    setUserConnections(prev => {
      const next = { ...prev };
      // Remove any existing duplicate links for these nodes
      Object.keys(next).forEach(lId => {
        if (next[lId] === rightId) delete next[lId];
      });
      next[leftId] = rightId;
      return next;
    });
    setActiveSelectedLeftId(null);
    setActiveSelectedRightId(null);
    setHoveredCandidateId(null);
  };

  const handleRemoveConnection = (leftId: string) => {
    if (validationResults?.checked) return;
    setUserConnections(prev => {
      const next = { ...prev };
      delete next[leftId];
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Pointer-Driven Live Line Drawing
  // ---------------------------------------------------------------------------
  const handlePointerDownLeftCard = (e: ReactPointerEvent, leftId: string) => {
    if (validationResults?.checked) return;
    if (e.button !== 0) return;
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const coord = nodeCoords.left[leftId] || {
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
    };

    setActiveLineDrag({
      origin: 'left',
      originId: leftId,
      startX: coord.x,
      startY: coord.y,
      currentX: e.clientX - containerRect.left,
      currentY: e.clientY - containerRect.top,
      isMoved: false,
    });

    // If right was already selected, connect immediately
    if (activeSelectedRightId) {
      connectPair(leftId, activeSelectedRightId);
    }
  };

  const handlePointerDownRightCard = (e: ReactPointerEvent, rightId: string) => {
    if (validationResults?.checked) return;
    if (e.button !== 0) return;
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const coord = nodeCoords.right[rightId] || {
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
    };

    setActiveLineDrag({
      origin: 'right',
      originId: rightId,
      startX: coord.x,
      startY: coord.y,
      currentX: e.clientX - containerRect.left,
      currentY: e.clientY - containerRect.top,
      isMoved: false,
    });

    // If left was already selected, connect immediately
    if (activeSelectedLeftId) {
      connectPair(activeSelectedLeftId, rightId);
    }
  };

  useEffect(() => {
    if (!activeLineDrag) return;

    const handleGlobalPointerMove = (e: globalThis.PointerEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - containerRect.left;
      const currentY = e.clientY - containerRect.top;

      const dist = Math.hypot(currentX - activeLineDrag.startX, currentY - activeLineDrag.startY);
      const isMoved = activeLineDrag.isMoved || dist > 6;

      setActiveLineDrag(prev => prev ? {
        ...prev,
        currentX,
        currentY,
        isMoved,
      } : null);

      // Detect candidate target card under pointer
      const targetEl = document.elementFromPoint(e.clientX, e.clientY);
      if (activeLineDrag.origin === 'left') {
        const rightCard = targetEl?.closest('[data-right-id]');
        const rightId = rightCard?.getAttribute('data-right-id') || null;
        setHoveredCandidateId(rightId);
      } else {
        const leftCard = targetEl?.closest('[data-left-id]');
        const leftId = leftCard?.getAttribute('data-left-id') || null;
        setHoveredCandidateId(leftId);
      }
    };

    const handleGlobalPointerUp = (e: globalThis.PointerEvent) => {
      if (!activeLineDrag) return;

      const targetEl = document.elementFromPoint(e.clientX, e.clientY);

      if (activeLineDrag.isMoved) {
        // Drop line connection onto target
        if (activeLineDrag.origin === 'left') {
          const rightCard = targetEl?.closest('[data-right-id]');
          const rightId = rightCard?.getAttribute('data-right-id');
          if (rightId) {
            connectPair(activeLineDrag.originId, rightId);
          }
        } else {
          const leftCard = targetEl?.closest('[data-left-id]');
          const leftId = leftCard?.getAttribute('data-left-id');
          if (leftId) {
            connectPair(leftId, activeLineDrag.originId);
          }
        }
      } else {
        // Simple click without dragging: toggle selection for click-to-connect
        if (activeLineDrag.origin === 'left') {
          setActiveSelectedLeftId(prev => prev === activeLineDrag.originId ? null : activeLineDrag.originId);
        } else {
          setActiveSelectedRightId(prev => prev === activeLineDrag.originId ? null : activeLineDrag.originId);
        }
      }

      setActiveLineDrag(null);
      setHoveredCandidateId(null);
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [activeLineDrag]);

  // Validation & Checking
  const handleCheckAnswers = () => {
    let correctCount = 0;
    let mistakeCount = 0;

    pairs.forEach(pair => {
      const connectedRightId = userConnections[pair.id];
      if (connectedRightId === pair.id) {
        correctCount += 1;
      } else {
        mistakeCount += 1;
      }
    });

    const isGradedTest = pointsPerCorrect > 0;
    const pointsEarned = correctCount * pointsPerCorrect;
    const deductionTotal = isGradedTest ? mistakeCount * deductionPerMistake : 0;
    const finalScore = Math.max(0, pointsEarned - deductionTotal);
    const maxScore = pairs.length * pointsPerCorrect;
    const isPassed = !isGradedTest || finalScore >= passingScore;

    setValidationResults({
      checked: true,
      score: finalScore,
      maxScore,
      correctCount,
      mistakeCount,
      deductionTotal,
      isPassed,
      isFailed: isGradedTest && !isPassed,
    });

    if (retries > 0 && attemptsRemaining > 0) {
      setAttemptsRemaining(prev => prev - 1);
    }

    // Persist score
    scoreService.recordQuizScore({
      courseId: 'proj_sample_01',
      quizId: initialData?.id || 'quiz_dots_01',
      quizTitle: prompt || 'Connect the Dots Activity',
      quizType: 'Connect the Dots',
      score: finalScore,
      maxScore,
      correctCount,
      mistakeCount,
      attempts: retries > 0 ? (retries - attemptsRemaining + 1) : 1,
    });
  };

  const totalMaxScore = pairs.length * pointsPerCorrect;

  const handleSaveToCourse = () => {
    const activity: QuizActivity = {
      id: initialData?.id || `quiz_dots_${Date.now()}`,
      name: prompt || 'Connect the Dots Activity',
      type: 'Connect the Dots',
      prompt,
      instructions,
      pointsPerCorrect,
      deductionPerMistake,
      retries,
      isGraded: pointsPerCorrect > 0,
      passingScore: pointsPerCorrect > 0 ? passingScore : undefined,
      data: {
        connectTheDots: {
          pairs,
          leftTitle: leftColumnTitle,
          rightTitle: rightColumnTitle,
        },
      },
      totalPoints: totalMaxScore,
      lastModified: Date.now(),
    };

    onSaveToCourse?.(activity);
    setSaveSuccessMessage('Activity saved to Course Editor! You can double-click this quiz in Course Editor to reload and update anytime.');
    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 4000);
  };

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-200 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <GitCommit size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Question Type
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Connect the Dots (Matching Pairs)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {prompt || 'Untitled Connect the Dots Activity'}
            </h2>
          </div>
        </div>

        {/* View Switcher, Undo/Redo & Action Controls */}
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
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Edit3 size={14} />
              <span>Authoring</span>
            </button>
            <button
              onClick={handleEnterPreview}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${viewMode === 'preview'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Eye size={14} />
              <span>Learner Preview</span>
            </button>
          </div>

          {/* Save to Course Editor */}
          <button
            onClick={handleSaveToCourse}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
            title="Save this activity directly to Course Editor (no disk file)"
          >
            <Save size={15} />
            <span>Save to Course Editor</span>
          </button>

          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Back
            </button>
          )}
        </div>
      </div>

      {/* Save Toast Notification */}
      {saveSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{saveSuccessMessage}</span>
          </div>
          <button onClick={() => setSaveSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 dark:hover:text-white cursor-pointer p-0.5">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. AUTHORING MODE                                                         */}
      {/* ========================================================================= */}
      {viewMode === 'author' && (
        <div className="space-y-6">
          {/* Metadata & Title Configuration */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Question Prompt / Title
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Match energy systems with their primary functions"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Learner Instructions
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Draw lines connecting matching items across both columns."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Column Titles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Left Column Header Label
                </label>
                <input
                  type="text"
                  value={leftColumnTitle}
                  onChange={(e) => setLeftColumnTitle(e.target.value)}
                  placeholder="e.g. Terms / Concepts"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Right Column Header Label
                </label>
                <input
                  type="text"
                  value={rightColumnTitle}
                  onChange={(e) => setRightColumnTitle(e.target.value)}
                  placeholder="e.g. Definitions / Matching Descriptions"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Scoring & Retries Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {/* 1. Score per correct match (0 for non-graded) */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Award size={15} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Score per correct match</span>
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
                  {pointsPerCorrect > 0 ? `Total possible score: ${totalMaxScore} pts` : '0 pts = Non-graded exploration'}
                </p>
              </div>

              {/* 2. Passing Score (Automatically grayed out if non-graded) */}
              <div className={`space-y-1.5 p-3.5 rounded-xl border transition-all ${pointsPerCorrect > 0
                ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                }`}>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Passing Score</span>
                  {pointsPerCorrect === 0 && (
                    <span className="text-[10px] font-medium text-slate-400">Grayed out</span>
                  )}
                </label>
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="number"
                    min="1"
                    max={totalMaxScore || 1}
                    disabled={pointsPerCorrect === 0}
                    value={pointsPerCorrect > 0 ? passingScore : ''}
                    onChange={(e) => setPassingScore(Math.max(1, Math.min(totalMaxScore, parseInt(e.target.value, 10) || 1)))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:bg-slate-100 disabled:dark:bg-slate-950 disabled:text-slate-400 disabled:cursor-not-allowed text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
                    placeholder={pointsPerCorrect > 0 ? 'e.g. 6' : 'N/A (Non-graded)'}
                  />
                  <span className="text-xs font-medium text-slate-500">pts</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {pointsPerCorrect > 0
                    ? `Fails if score < ${passingScore} pts (must repeat)`
                    : 'Non-graded tests have no passing score.'}
                </p>
              </div>

              {/* 3. Deduction per mismatch (Grayed out if non-graded) */}
              <div className={`space-y-1.5 p-3.5 rounded-xl border transition-all ${pointsPerCorrect > 0
                ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                }`}>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <MinusCircle size={15} className="text-rose-600 dark:text-rose-400" />
                    <span>Deduction per mismatch</span>
                  </span>
                  {pointsPerCorrect === 0 && (
                    <span className="text-[10px] font-medium text-slate-400">Grayed out</span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    disabled={pointsPerCorrect === 0}
                    value={pointsPerCorrect > 0 ? deductionPerMistake : ''}
                    onChange={(e) => setDeductionPerMistake(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:bg-slate-100 disabled:dark:bg-slate-950 disabled:text-slate-400 disabled:cursor-not-allowed text-sm font-semibold focus:ring-2 focus:ring-rose-500 outline-hidden"
                    placeholder={pointsPerCorrect > 0 ? '0' : 'N/A (Non-graded)'}
                  />
                  <span className="text-xs font-medium text-slate-500">pts</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {pointsPerCorrect > 0 ? 'Points subtracted per incorrect connection' : 'No deductions on non-graded activities'}
                </p>
              </div>

              {/* 4. Retries */}
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
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{retries === 0 ? 'Unlimited retries' : `Max ${retries} attempts`}</p>
              </div>
            </div>
          </div>

          {/* Pairs Editor Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <span>Matching Pairs Definition</span>
                  <span className="text-xs font-normal text-slate-400">({pairs.length} pairs configured)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Define the correct matching associations. In learner mode, the right column will be randomized.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkModal({ isOpen: true, rawText: '', mode: 'replace' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="Paste Hanay A & Hanay B or side-by-side matching pairs"
                >
                  <ClipboardList size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>Bulk Paste Pairs</span>
                </button>

                <button
                  onClick={handleAddPair}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add New Pair</span>
                </button>
              </div>
            </div>

            {/* Pair Row Cards */}
            <div className="space-y-3">
              {pairs.map((pair, idx) => {
                const color = pairColors[idx % pairColors.length];

                return (
                  <div
                    key={pair.id}
                    className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 transition-all hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${color.bg}`} />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Pair #{idx + 1}
                        </span>
                      </div>

                      {pairs.length > 2 && (
                        <button
                          onClick={() => handleDeletePair(pair.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer transition-colors"
                          title="Delete pair"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Item */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Left Item (Prompt / Concept)
                          </label>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                            💡 Paste list or pairs
                          </span>
                        </div>
                        <input
                          type="text"
                          value={pair.leftText}
                          onChange={(e) => handleUpdatePair(pair.id, 'leftText', e.target.value)}
                          onPaste={(e) => handleLeftItemPaste(idx, e)}
                          placeholder="e.g. Term or Concept"
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                        />
                      </div>

                      {/* Right Item */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Right Item (Matching Definition / Target)
                          </label>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                            💡 Paste list
                          </span>
                        </div>
                        <input
                          type="text"
                          value={pair.rightText}
                          onChange={(e) => handleUpdatePair(pair.id, 'rightText', e.target.value)}
                          onPaste={(e) => handleRightItemPaste(idx, e)}
                          placeholder="e.g. Definition or Matching Answer"
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. LEARNER PREVIEW MODE WITH FLUID DRAGGABLE & CLICKABLE LINES            */}
      {/* ========================================================================= */}
      {viewMode === 'preview' && (
        <div className="space-y-6">
          {/* Header instructions for learner */}
          <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <MousePointer size={16} className="text-blue-600 dark:text-blue-400" />
                <span>{instructions}</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Click or drag from any item on the left to its matching pair on the right. Lines snap automatically into place.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 shadow-2xs shrink-0">
              <GitCommit size={15} />
              <span>{Object.keys(userConnections).length} of {pairs.length} connected</span>
            </div>
          </div>

          {/* Interactive Line-Drawing Arena */}
          <div
            ref={containerRef}
            className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm min-h-[480px] overflow-hidden select-none touch-none cursor-default"
          >
            {/* SVG Connecting Vectors Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              {/* Active Established Connections */}
              {Object.entries(userConnections).map(([leftId, rightId], idx) => {
                const leftPos = nodeCoords.left[leftId];
                const rightPos = nodeCoords.right[rightId];
                if (!leftPos || !rightPos) return null;

                const isChecked = validationResults?.checked;
                const isCorrect = leftId === rightId;
                const color = isChecked
                  ? isCorrect ? '#10b981' : '#f43f5e'
                  : pairColors[idx % pairColors.length].stroke;

                const dx = rightPos.x - leftPos.x;
                const controlX1 = leftPos.x + dx * 0.45;
                const controlX2 = rightPos.x - dx * 0.45;

                const pathData = `M ${leftPos.x} ${leftPos.y} C ${controlX1} ${leftPos.y}, ${controlX2} ${rightPos.y}, ${rightPos.x} ${rightPos.y}`;

                return (
                  <g key={`conn_${leftId}_${rightId}`}>
                    {/* Glowing Underlay */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={color}
                      strokeWidth="8"
                      strokeOpacity="0.25"
                    />
                    {/* Core Line */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={color}
                      strokeWidth="3.5"
                      strokeDasharray={isChecked && !isCorrect ? '6 4' : 'none'}
                      strokeLinecap="round"
                      className="transition-all duration-200"
                    />
                    {/* Midpoint Node Marker */}
                    <circle
                      cx={(leftPos.x + rightPos.x) / 2}
                      cy={(leftPos.y + rightPos.y) / 2}
                      r="4"
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}

              {/* Rubberband line currently being drawn by user */}
              {activeLineDrag && (
                <g>
                  {/* Glowing drag trail */}
                  <path
                    d={`M ${activeLineDrag.startX} ${activeLineDrag.startY} C ${activeLineDrag.origin === 'left'
                      ? activeLineDrag.startX + (activeLineDrag.currentX - activeLineDrag.startX) * 0.5
                      : activeLineDrag.startX - (activeLineDrag.startX - activeLineDrag.currentX) * 0.5
                      } ${activeLineDrag.startY}, ${activeLineDrag.origin === 'left'
                        ? activeLineDrag.currentX - (activeLineDrag.currentX - activeLineDrag.startX) * 0.5
                        : activeLineDrag.currentX + (activeLineDrag.startX - activeLineDrag.currentX) * 0.5
                      } ${activeLineDrag.currentY}, ${activeLineDrag.currentX} ${activeLineDrag.currentY}`}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="4"
                    strokeOpacity="0.8"
                    strokeDasharray="6 3"
                    strokeLinecap="round"
                  />
                  {/* Cursor Anchor Dot */}
                  <circle
                    cx={activeLineDrag.currentX}
                    cy={activeLineDrag.currentY}
                    r="6"
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="animate-ping"
                  />
                  <circle
                    cx={activeLineDrag.currentX}
                    cy={activeLineDrag.currentY}
                    r="5"
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>

            <div className="relative z-20 grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-32">
              {/* Left Column Items */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                  {leftColumnTitle}
                </h4>

                <div className="space-y-3">
                  {pairs.map((pair, idx) => {
                    const isConnected = !!userConnections[pair.id];
                    const isSelected = activeSelectedLeftId === pair.id;
                    const isCandidateHovered = hoveredCandidateId === pair.id && activeLineDrag?.origin === 'right';
                    const isChecked = validationResults?.checked;
                    const isCorrect = userConnections[pair.id] === pair.id;

                    return (
                      <div
                        key={pair.id}
                        data-left-id={pair.id}
                        ref={(el) => { leftItemRefs.current[pair.id] = el; }}
                        onPointerDown={(e) => handlePointerDownLeftCard(e, pair.id)}
                        className={`group relative p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${isSelected || isCandidateHovered
                          ? 'border-blue-500 bg-blue-600 text-white scale-[1.02] shadow-lg ring-4 ring-blue-400/40'
                          : isChecked
                            ? isCorrect
                              ? 'border-emerald-500 bg-emerald-600 text-white'
                              : 'border-rose-500 bg-rose-600 text-white'
                            : isConnected
                              ? 'border-indigo-500 bg-indigo-600 text-white'
                              : 'border-slate-700 dark:border-slate-800 bg-slate-800 dark:bg-slate-950 text-white hover:border-blue-400 hover:shadow-md'
                          } cursor-grab active:cursor-grabbing touch-none`}
                        title="Click or drag across to connect with matching definition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pointer-events-none">
                          <span className="w-5 h-5 rounded-full bg-slate-700 dark:bg-slate-800 text-slate-200 dark:text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <p className="text-xs font-bold text-white truncate">
                            {pair.leftText}
                          </p>
                        </div>

                        {/* Anchor Connection Dot */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isConnected && !isChecked && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveConnection(pair.id);
                              }}
                              className="p-1 text-slate-300 hover:text-rose-450 rounded-md cursor-pointer transition-colors"
                              title="Disconnect line"
                            >
                              <X size={13} />
                            </button>
                          )}
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected || isConnected || isCandidateHovered
                              ? 'bg-blue-400 border-white ring-2 ring-blue-300 scale-110 shadow-md'
                              : 'bg-slate-600 dark:bg-slate-700 border-white dark:border-slate-900 group-hover:bg-blue-400 group-hover:scale-110'
                              }`}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column Items (Randomized) */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800 text-right">
                  {rightColumnTitle}
                </h4>

                <div className="space-y-3">
                  {shuffledRightItems.map((item) => {
                    const connectedLeftId = Object.entries(userConnections).find(([, rId]) => rId === item.id)?.[0];
                    const isConnected = !!connectedLeftId;
                    const isSelected = activeSelectedRightId === item.id;
                    const isCandidateHovered = hoveredCandidateId === item.id && activeLineDrag?.origin === 'left';
                    const isChecked = validationResults?.checked;
                    const isCorrect = isConnected && connectedLeftId === item.id;

                    return (
                      <div
                        key={item.id}
                        data-right-id={item.id}
                        ref={(el) => { rightItemRefs.current[item.id] = el; }}
                        onPointerDown={(e) => handlePointerDownRightCard(e, item.id)}
                        className={`group relative p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${isSelected || isCandidateHovered || (activeSelectedLeftId && !isConnected)
                          ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/70 ring-4 ring-blue-400/40 scale-[1.02] shadow-lg'
                          : isChecked
                            ? isCorrect
                              ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                              : 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/30'
                            : isConnected
                              ? 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/50 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 hover:shadow-md'
                          } cursor-grab active:cursor-grabbing touch-none`}
                        title="Click or drag across to connect with matching term"
                      >
                        {/* Anchor Connection Dot */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isConnected || isSelected || isCandidateHovered
                            ? 'bg-blue-600 border-white ring-2 ring-blue-500 scale-110 shadow-md'
                            : 'bg-slate-200 dark:bg-slate-700 border-white dark:border-slate-900 group-hover:bg-blue-500 group-hover:scale-110'
                            }`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>

                        <div className="flex-1 min-w-0 text-right pointer-events-none">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
                            {item.rightText}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Validation & Feedback Footer */}
          <div className={`bg-white dark:bg-slate-900 border ${validationResults?.isFailed
            ? 'border-rose-300 dark:border-rose-800 ring-2 ring-rose-500/20'
            : validationResults?.isPassed && pointsPerCorrect > 0
              ? 'border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800'
            } rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all`}>
            <div>
              {validationResults ? (
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-full ${validationResults.isFailed
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                    : validationResults.score === validationResults.maxScore
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                    }`}>
                    {validationResults.isFailed ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        Score: {validationResults.score} / {validationResults.maxScore} Points ({Math.round((validationResults.score / (validationResults.maxScore || 1)) * 100)}%)
                      </h4>
                      {pointsPerCorrect > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${validationResults.isFailed
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          }`}>
                          {validationResults.isFailed ? 'Failed (Must Repeat)' : 'Passed'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      +{validationResults.correctCount * pointsPerCorrect} pts ({validationResults.correctCount} correct match{validationResults.correctCount === 1 ? '' : 'es'})
                      {validationResults.deductionTotal > 0 && ` • -${validationResults.deductionTotal} pts deduction`}
                      {pointsPerCorrect > 0 && (
                        <span className="font-semibold ml-1 text-slate-700 dark:text-slate-300">
                          • Passing Score: {passingScore} pts
                        </span>
                      )}
                      {validationResults.isFailed && (
                        <span className="block text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                          Score is below the required passing threshold ({passingScore} pts). The test must be repeated.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Draw or click to connect all matching pairs, then click Check Answers to test validation.
                  {pointsPerCorrect > 0 && <span className="font-semibold ml-1 text-blue-600 dark:text-blue-400">(Passing requirement: {passingScore} / {totalMaxScore} pts)</span>}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {validationResults?.isFailed ? (
                <button
                  onClick={handleEnterPreview}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer animate-pulse"
                >
                  <RotateCcw size={15} />
                  <span>Repeat Test</span>
                </button>
              ) : (
                <button
                  onClick={handleEnterPreview}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Reset Lines</span>
                </button>
              )}

              {(!validationResults || !validationResults.isFailed) && (
                <button
                  onClick={handleCheckAnswers}
                  disabled={Object.keys(userConnections).length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Check Answers</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Pairs Modal */}
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
                    Bulk Paste Matching Pairs
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Paste columns (Column A & Column B) or side-by-side matching pairs.
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
                  Paste Matching Pairs Text:
                </label>
                {bulkModal.rawText.trim() && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    Detected {parseConnectTheDots(bulkModal.rawText).pairs.length} pairs
                  </span>
                )}
              </div>
              <textarea
                rows={10}
                value={bulkModal.rawText}
                onChange={(e) => setBulkModal(prev => prev ? { ...prev, rawText: e.target.value } : null)}
                placeholder={`Column A\n1. Question 1\n2. Question 2\n3. Question 3\n4. Question 4\n5. Question 5\n\Column B\nA. Choice A\nB. Choice B\nC. Choice C\nD. Choice D\nE. Choice E`}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden leading-relaxed"
                autoFocus
              />
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-blue-500" />
                  <span>Smart Formatting Support:</span>
                </div>
                <p>• Supports <code className="text-blue-600 dark:text-blue-400 font-mono">Column A</code> sections for the left side and <code className="text-blue-600 dark:text-blue-400 font-mono">Column B</code> for the right side.</p>
                <p>• Also supports side-by-side or tab-delimited pairs (e.g. <code className="text-emerald-600 dark:text-emerald-400 font-mono">Visigoths - Barbarians</code> or <code className="text-emerald-600 dark:text-emerald-400 font-mono">Term [TAB] Definition</code>).</p>
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
                  disabled={!bulkModal.rawText.trim() || parseConnectTheDots(bulkModal.rawText).pairs.length === 0}
                  onClick={() => handleApplyBulkPairs(bulkModal.rawText, bulkModal.mode)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Import {parseConnectTheDots(bulkModal.rawText).pairs.length} Pairs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
