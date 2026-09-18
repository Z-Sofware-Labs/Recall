import { useState, useEffect, useMemo, useCallback, PointerEvent as ReactPointerEvent, ClipboardEvent } from 'react';
import {
  Plus, Trash2, GripVertical, CheckCircle2, AlertCircle,
  RotateCcw, Eye, Edit3, Sparkles, HelpCircle, ArrowRight,
  Layers, Check, X, Tag, MoveRight, Shuffle, Tags, Award, MinusCircle,
  Save, ArrowLeft, Send, ClipboardList, Undo2, Redo2
} from 'lucide-react';
import { scoreService } from '../../services/scoreService';
import { Category, QuizActivity } from '../../types/quiz';
import { parsePastedList } from '../../utils/quizPasteParser';
import { useQuizUndoRedo } from '../../hooks/useQuizUndoRedo';
import { QuizUndoRedoButtons } from './QuizUndoRedoButtons';

const colorThemes = [
  { name: 'Emerald', border: 'border-emerald-300 dark:border-emerald-800', bg: 'bg-emerald-50 dark:bg-emerald-950/30', header: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' },
  { name: 'Amber', border: 'border-amber-300 dark:border-amber-800', bg: 'bg-amber-50 dark:bg-amber-950/30', header: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' },
  { name: 'Blue', border: 'border-blue-300 dark:border-blue-800', bg: 'bg-blue-50 dark:bg-blue-950/30', header: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' },
  { name: 'Purple', border: 'border-purple-300 dark:border-purple-800', bg: 'bg-purple-50 dark:bg-purple-950/30', header: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' },
];

const defaultSampleCategories: Category[] = [
  {
    id: 'cat_1',
    name: 'Category 1',
    color: 'Emerald',
    items: [
      { id: 'item_1', text: 'Item 1' },
      { id: 'item_2', text: 'Item 2' },
    ],
  },
  {
    id: 'cat_2',
    name: 'Category 2',
    color: 'Blue',
    items: [
      { id: 'item_3', text: 'Item 3' },
      { id: 'item_4', text: 'Item 4' },
    ],
  },
];

interface CategorizationProps {
  initialData?: QuizActivity | null;
  onBack?: () => void;
  onSaveToCourse?: (activity: QuizActivity) => void;
}

export default function Categorization({ initialData, onBack, onSaveToCourse }: CategorizationProps) {
  const [viewMode, setViewMode] = useState<'author' | 'preview'>('author');
  const [prompt, setPrompt] = useState(
    initialData?.prompt || 'Categorization Activity'
  );
  const [instructions, setInstructions] = useState(
    initialData?.instructions || 'Drag each item from the unsorted pool into its correct category column below.'
  );
  const [categories, setCategories] = useState<Category[]>(
    initialData?.data?.categories && initialData.data.categories.length > 0
      ? initialData.data.categories
      : defaultSampleCategories
  );

  // Scoring & Retry Parameters (Teacher configured)
  const [pointsPerCorrect, setPointsPerCorrect] = useState<number>(initialData?.pointsPerCorrect ?? 2);
  const [deductionPerMistake, setDeductionPerMistake] = useState<number>(initialData?.deductionPerMistake ?? 1);
  const [retries, setRetries] = useState<number>(initialData?.retries ?? 2);
  const [isGraded, setIsGraded] = useState<boolean>(initialData?.isGraded ?? true);
  const [passingScore, setPassingScore] = useState<number>(() => {
    if (initialData?.passingScore !== undefined) return initialData.passingScore;
    const initialTotal = (initialData?.data?.categories || defaultSampleCategories)
      .reduce((sum, c) => sum + c.items.length * (initialData?.pointsPerCorrect ?? 2), 0);
    return Math.max(1, Math.ceil(initialTotal * 0.7));
  });
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Reload data if initialData changes (e.g. user double-clicked another quiz)
  useEffect(() => {
    if (initialData) {
      setPrompt(initialData.prompt || 'Activity: Classifying Renewable vs. Non-Renewable Energy Resources');
      setInstructions(initialData.instructions || 'Drag each energy source or technology card from the unsorted pool into its correct category column below.');
      if (initialData.data?.categories && initialData.data.categories.length > 0) {
        setCategories(initialData.data.categories);
      }
      setPointsPerCorrect(initialData.pointsPerCorrect ?? 2);
      setDeductionPerMistake(initialData.deductionPerMistake ?? 1);
      setRetries(initialData.retries ?? 2);
      setIsGraded(initialData.isGraded ?? true);
      const calculatedTotal = (initialData.data?.categories || defaultSampleCategories)
        .reduce((sum, c) => sum + c.items.length * (initialData.pointsPerCorrect ?? 2), 0);
      setPassingScore(initialData.passingScore ?? Math.max(1, Math.ceil(calculatedTotal * 0.7)));
    }
  }, [initialData]);

  // Undo & Redo History State
  const currentSnapshot = useMemo(() => ({
    prompt,
    instructions,
    categories,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
    isGraded,
  }), [
    prompt,
    instructions,
    categories,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
    isGraded,
  ]);

  const applySnapshot = useCallback((state: typeof currentSnapshot) => {
    if (state.prompt !== undefined) setPrompt(state.prompt);
    if (state.instructions !== undefined) setInstructions(state.instructions);
    if (state.categories !== undefined) setCategories(state.categories);
    if (state.pointsPerCorrect !== undefined) setPointsPerCorrect(state.pointsPerCorrect);
    if (state.passingScore !== undefined) setPassingScore(state.passingScore);
    if (state.deductionPerMistake !== undefined) setDeductionPerMistake(state.deductionPerMistake);
    if (state.retries !== undefined) setRetries(state.retries);
    if (state.isGraded !== undefined) setIsGraded(state.isGraded);
  }, []);

  const { canUndo, canRedo, handleUndo, handleRedo } = useQuizUndoRedo(currentSnapshot, applySnapshot);

  // New item input states per category
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});

  // --- Interactive Preview State ---
  const allItemsList = categories.flatMap(c => c.items.map(i => ({ ...i, correctCategoryId: c.id })));
  const [unsortedPool, setUnsortedPool] = useState<Array<{ id: string; text: string; correctCategoryId: string }>>([]);
  const [placedItems, setPlacedItems] = useState<Record<string, Array<{ id: string; text: string; correctCategoryId: string }>>>({});
  const [selectedPoolItem, setSelectedPoolItem] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);
  const [isDragOverPool, setIsDragOverPool] = useState<boolean>(false);
  const [validationResults, setValidationResults] = useState<{
    checked: boolean;
    score: number;
    maxScore: number;
    correctCount: number;
    mistakeCount: number;
    deductionTotal: number;
    isPassed?: boolean;
    isFailed?: boolean;
  } | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(retries);

  // Floating Pointer Drag State (immune to webview/OS limitations)
  const [activePointerDrag, setActivePointerDrag] = useState<{
    itemId: string;
    itemText: string;
    clientX: number;
    clientY: number;
    originCatId?: string;
  } | null>(null);
  const [hoveredDropTarget, setHoveredDropTarget] = useState<string | null>(null);

  // Enter Preview Mode
  const handleEnterPreview = () => {
    // Shuffle items for preview
    const shuffled = [...allItemsList].sort(() => Math.random() - 0.5);
    setUnsortedPool(shuffled);
    const initialPlaced: Record<string, any[]> = {};
    categories.forEach(c => {
      initialPlaced[c.id] = [];
    });
    setPlacedItems(initialPlaced);
    setValidationResults(null);
    setAttemptsRemaining(retries);
    setSelectedPoolItem(null);
    setDraggedItemId(null);
    setDragOverCatId(null);
    setIsDragOverPool(false);
    setActivePointerDrag(null);
    setHoveredDropTarget(null);
    setViewMode('preview');
  };

  // Pointer drag start handler
  const handlePointerDownItem = (e: ReactPointerEvent, item: { id: string; text: string }, originCatId?: string) => {
    if (validationResults?.checked) return;
    if ((e.target as HTMLElement).closest('button')) return;

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;

    setActivePointerDrag({
      itemId: item.id,
      itemText: item.text,
      clientX: startX,
      clientY: startY,
      originCatId,
    });

    const onPointerMove = (moveEvent: PointerEvent) => {
      setActivePointerDrag(prev => prev ? {
        ...prev,
        clientX: moveEvent.clientX,
        clientY: moveEvent.clientY,
      } : null);

      const elem = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const catBucket = elem?.closest('[data-category-bucket-id]');
      const poolZone = elem?.closest('[data-pool-zone="true"]');

      if (catBucket) {
        const catId = catBucket.getAttribute('data-category-bucket-id');
        setHoveredDropTarget(catId);
      } else if (poolZone) {
        setHoveredDropTarget('pool');
      } else {
        setHoveredDropTarget(null);
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      const elem = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      const catBucket = elem?.closest('[data-category-bucket-id]');
      const poolZone = elem?.closest('[data-pool-zone="true"]');

      if (catBucket) {
        const targetCatId = catBucket.getAttribute('data-category-bucket-id');
        if (targetCatId) {
          handleDropIntoCategory(targetCatId, item.id);
        }
      } else if (poolZone) {
        handleDropBackToPool(item.id);
      }

      setActivePointerDrag(null);
      setHoveredDropTarget(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Authoring handlers
  const handleAddCategory = () => {
    const nextColor = colorThemes[categories.length % colorThemes.length].name;
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      name: `Category ${categories.length + 1}`,
      color: nextColor,
      items: [],
    };
    setCategories([...categories, newCat]);
  };

  const handleDeleteCategory = (catId: string) => {
    setCategories(categories.filter(c => c.id !== catId));
  };

  const handleUpdateCategoryName = (catId: string, name: string) => {
    setCategories(categories.map(c => c.id === catId ? { ...c, name } : c));
  };

  // Bulk Category Items Modal State
  const [bulkModal, setBulkModal] = useState<{
    isOpen: boolean;
    rawText: string;
    mode: 'replace' | 'append';
    targetCatId?: string; // if null/undefined, parses across all categories or asks user
  } | null>(null);

  const handleCategoryItemPaste = (catId: string, e: ClipboardEvent<HTMLInputElement>) => {
    const pasteText = e.clipboardData.getData('text');
    if (!pasteText) return;

    const items = parsePastedList(pasteText);
    if (items.length > 1) {
      e.preventDefault();
      const newItems = items.map((text, idx) => ({
        id: `item_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
        text,
      }));

      setCategories(categories.map(c => {
        if (c.id === catId) {
          return {
            ...c,
            items: [...c.items, ...newItems],
          };
        }
        return c;
      }));
      setNewItemTexts(prev => ({ ...prev, [catId]: '' }));
    }
  };

  const handleApplyBulkCategoryItems = (rawText: string, mode: 'replace' | 'append', targetCatId?: string) => {
    const items = parsePastedList(rawText);
    if (items.length === 0) return;

    const newItems = items.map((text, idx) => ({
      id: `item_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      text,
    }));

    if (targetCatId) {
      setCategories(categories.map(c => {
        if (c.id === targetCatId) {
          return {
            ...c,
            items: mode === 'replace' ? newItems : [...c.items, ...newItems],
          };
        }
        return c;
      }));
    }
    setBulkModal(null);
  };

  const handleAddItemToCategory = (catId: string) => {
    const text = (newItemTexts[catId] || '').trim();
    if (!text) return;

    setCategories(categories.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          items: [...c.items, { id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, text }]
        };
      }
      return c;
    }));

    setNewItemTexts({ ...newItemTexts, [catId]: '' });
  };

  const handleDeleteItem = (catId: string, itemId: string) => {
    setCategories(categories.map(c => {
      if (c.id === catId) {
        return { ...c, items: c.items.filter(i => i.id !== itemId) };
      }
      return c;
    }));
  };

  // Preview interactive placement & Drag-and-Drop
  const handleDropIntoCategory = (targetCatId: string, itemId: string) => {
    // 1. Check if item is in pool
    const fromPool = unsortedPool.find(i => i.id === itemId);
    if (fromPool) {
      setUnsortedPool(prev => prev.filter(i => i.id !== itemId));
      setPlacedItems(prev => ({
        ...prev,
        [targetCatId]: [...(prev[targetCatId] || []).filter(i => i.id !== itemId), fromPool],
      }));
      setSelectedPoolItem(null);
      setValidationResults(null);
      return;
    }

    // 2. Check if item is moving from another category
    let foundItem: any = null;
    const newPlaced: Record<string, any[]> = {};
    Object.keys(placedItems).forEach(catId => {
      const remaining = placedItems[catId].filter(i => {
        if (i.id === itemId) {
          foundItem = i;
          return false;
        }
        return true;
      });
      newPlaced[catId] = remaining;
    });

    if (foundItem) {
      newPlaced[targetCatId] = [...(newPlaced[targetCatId] || []), foundItem];
      setPlacedItems(newPlaced);
      setSelectedPoolItem(null);
      setValidationResults(null);
    }
  };

  const handleDropBackToPool = (itemId: string) => {
    let foundItem: any = null;
    const newPlaced: Record<string, any[]> = {};
    Object.keys(placedItems).forEach(catId => {
      const remaining = placedItems[catId].filter(i => {
        if (i.id === itemId) {
          foundItem = i;
          return false;
        }
        return true;
      });
      newPlaced[catId] = remaining;
    });

    if (foundItem && !unsortedPool.some(i => i.id === itemId)) {
      setPlacedItems(newPlaced);
      setUnsortedPool(prev => [...prev, foundItem]);
      setSelectedPoolItem(null);
      setValidationResults(null);
    }
  };

  const handlePlaceItemIntoCategory = (catId: string) => {
    if (!selectedPoolItem) return;
    handleDropIntoCategory(catId, selectedPoolItem);
  };

  const handleReturnItemToPool = (catId: string, itemId: string) => {
    handleDropBackToPool(itemId);
  };

  const handleCheckAnswers = () => {
    let correctCount = 0;
    let mistakeCount = 0;

    categories.forEach(cat => {
      const itemsInCat = placedItems[cat.id] || [];
      itemsInCat.forEach(item => {
        if (item.correctCategoryId === cat.id) {
          correctCount += 1;
        } else {
          mistakeCount += 1;
        }
      });
    });

    const pointsEarned = correctCount * pointsPerCorrect;
    const deductionTotal = mistakeCount * deductionPerMistake;
    const finalScore = Math.max(0, pointsEarned - deductionTotal);
    const maxScore = allItemsList.length * pointsPerCorrect;
    const isPassed = !isGraded || finalScore >= passingScore;

    setValidationResults({
      checked: true,
      score: finalScore,
      maxScore,
      correctCount,
      mistakeCount,
      deductionTotal,
      isPassed,
      isFailed: isGraded && !isPassed,
    });

    if (retries > 0 && attemptsRemaining > 0) {
      setAttemptsRemaining(attemptsRemaining - 1);
    }

    // Persist score to Course Score Ledger
    scoreService.recordQuizScore({
      courseId: 'proj_sample_01',
      quizId: 'quiz_categorization_01',
      quizTitle: prompt || 'Energy Categorization Activity',
      quizType: 'Categorization',
      score: finalScore,
      maxScore,
      correctCount,
      mistakeCount,
      attempts: retries > 0 ? (retries - attemptsRemaining + 1) : 1,
    });

    // Populate mock companion course scores if needed for a full course tally experience
    const initialTally = scoreService.getCourseScoreTally('proj_sample_01');
    if (initialTally.records.length === 1) {
      scoreService.recordQuizScore({
        courseId: 'proj_sample_01',
        quizId: 'quiz_intro_01',
        quizTitle: 'Slide Presentation Review Quiz',
        quizType: 'Multiple Choice',
        score: 10,
        maxScore: 10,
        correctCount: 5,
        mistakeCount: 0,
        attempts: 1,
      });
      scoreService.recordQuizScore({
        courseId: 'proj_sample_01',
        quizId: 'quiz_media_02',
        quizTitle: 'Science Lab Video Checkpoint',
        quizType: 'True or False',
        score: 8,
        maxScore: 10,
        correctCount: 4,
        mistakeCount: 1,
        attempts: 1,
      });
    }
  };

  const totalItemsCount = categories.reduce((sum, c) => sum + c.items.length, 0);
  const totalMaxScore = totalItemsCount * pointsPerCorrect;

  const handleSaveToCourse = () => {
    const activity: QuizActivity = {
      id: initialData?.id || `quiz_cat_${Date.now()}`,
      name: prompt || 'Categorization Activity',
      type: 'Categorization',
      prompt,
      instructions,
      pointsPerCorrect,
      deductionPerMistake,
      retries,
      isGraded,
      passingScore: isGraded ? passingScore : undefined,
      data: {
        categories,
      },
      totalPoints: totalMaxScore,
      lastModified: Date.now(),
    };

    onSaveToCourse?.(activity);
    setSaveSuccessMessage('Activity saved to Course Editor! You can double-click this quiz in Course Editor to reload and update.');
    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 4000);
  };

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-200">
      {/* Top Breadcrumb / Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <Tags size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Question Type
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Categorization / Bucket Sorting
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {prompt || 'Untitled Categorization Question'}
            </h2>
          </div>
        </div>

        {/* View Mode Toggle, Undo/Redo & Actions (Right Aligned Dynamically) */}
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

          {/* Save to Course Editor Button */}
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

      {/* Save Success Toast Banner */}
      {saveSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{saveSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:hover:text-white cursor-pointer p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. AUTHORING MODE                                                         */}
      {/* ========================================================================= */}
      {viewMode === 'author' && (
        <div className="space-y-6">
          {/* Question Details and Metadata Configuration */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Question Title & Prompt */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Question Prompt / Title
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Sort each item into its correct group"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* Learner Instructions */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Learner Instructions / Question
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Drag each card to the matching category bucket."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Scoring & Retry Configuration Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {/* 1. Score for each correct answer (0 for non-graded) */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Award size={15} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Score per correct item</span>
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
                  {pointsPerCorrect > 0 ? `Max score: ${totalMaxScore} pts` : '0 pts = Non-graded practice'}
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:bg-slate-100 disabled:dark:bg-slate-950 disabled:text-slate-400 disabled:cursor-not-allowed text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    placeholder={pointsPerCorrect > 0 ? 'e.g. 15' : 'N/A (Non-graded)'}
                  />
                  <span className="text-xs font-medium text-slate-500">pts</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {pointsPerCorrect > 0
                    ? `Fails if score < ${passingScore} pts (must repeat)`
                    : 'Non-graded tests have no passing score.'}
                </p>
              </div>

              {/* 3. Deduction per mistake (Grayed out if non-graded) */}
              <div className={`space-y-1.5 p-3.5 rounded-xl border transition-all ${pointsPerCorrect > 0
                ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                }`}>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <MinusCircle size={15} className="text-rose-600 dark:text-rose-400" />
                    <span>Deduction per mistake</span>
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
                  {pointsPerCorrect > 0 ? 'Points subtracted per error' : 'No deductions on non-graded activities'}
                </p>
              </div>

              {/* 4. Retries possible */}
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
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{retries === 0 ? 'Unlimited attempts' : `Max ${retries} attempts`}</p>
              </div>
            </div>
          </div>

          {/* Category Columns Designer */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers size={18} className="text-blue-600 dark:text-blue-400" />
                  Category Buckets ({categories.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add categories and define the correct items assigned to each bucket.
                </p>
              </div>

              <button
                onClick={handleAddCategory}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Plus size={15} />
                <span>Add Category Bucket</span>
              </button>
            </div>

            {/* Category Buckets Grid - Auto Width Resizing */}
            <div
              className="grid gap-5 w-full transition-all duration-150"
              style={{
                gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, max(240px, calc((100% - ${(categories.length - 1) * 20}px) / ${categories.length}))), 1fr))`
              }}
            >
              {categories.map((cat, idx) => {
                const theme = colorThemes.find(t => t.name === cat.color) || colorThemes[0];

                return (
                  <div
                    key={cat.id}
                    className={`bg-white dark:bg-slate-900 border-2 ${theme.border} rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3 transition-all min-w-0`}
                  >
                    {/* Category Header */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${theme.badge}`}>
                            Column {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) => handleUpdateCategoryName(cat.id, e.target.value)}
                            placeholder="Category Name"
                            className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 outline-hidden px-1 flex-1 min-w-0 truncate"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setBulkModal({ isOpen: true, rawText: '', mode: 'append', targetCatId: cat.id })}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                            title={`Bulk paste items into ${cat.name}`}
                          >
                            <ClipboardList size={14} />
                          </button>

                          {categories.length > 2 && (
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 p-1 rounded-lg transition-colors cursor-pointer"
                              title="Delete category"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Items List in this Category */}
                      <div className="space-y-2 min-h-[160px] p-3 bg-slate-50/80 dark:bg-slate-950/50 rounded-xl border border-slate-200/80 dark:border-slate-800 transition-all overflow-y-auto">
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 px-1">
                          <span>Assigned Items ({cat.items.length})</span>
                          <span>{cat.items.length * pointsPerCorrect} pts</span>
                        </div>

                        {cat.items.length === 0 ? (
                          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                            No items added yet. Type or paste list below.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {cat.items.map((item) => (
                              <div
                                key={item.id}
                                className="group flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 shadow-2xs hover:border-blue-400 transition-colors"
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <Tag size={12} className="text-blue-500 shrink-0" />
                                  <span className="truncate">{item.text}</span>
                                </span>
                                <button
                                  onClick={() => handleDeleteItem(cat.id, item.id)}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer p-0.5"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Add Item Input */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        value={newItemTexts[cat.id] || ''}
                        onChange={(e) => setNewItemTexts({ ...newItemTexts, [cat.id]: e.target.value })}
                        onPaste={(e) => handleCategoryItemPaste(cat.id, e)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItemToCategory(cat.id);
                          }
                        }}
                        placeholder="Add item (or paste list)..."
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-hidden"
                      />
                      <button
                        onClick={() => handleAddItemToCategory(cat.id)}
                        disabled={!(newItemTexts[cat.id] || '').trim()}
                        className="p-1.5 bg-blue-600 disabled:opacity-40 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                        title="Add item"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE LEARNER PREVIEW MODE                                       */}
      {/* ========================================================================= */}
      {viewMode === 'preview' && (
        <div className="space-y-6">
          {/* Header Card for Learner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Interactive Quiz Item
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {prompt}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {instructions}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium">
                  {totalMaxScore} Points
                </span>
                {retries > 0 && (
                  <span className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl font-medium flex items-center gap-1.5">
                    <RotateCcw size={13} />
                    {attemptsRemaining} retries left
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Unsorted Items Pool */}
          <div
            data-pool-zone="true"
            onClick={() => {
              if (validationResults?.checked || !selectedPoolItem) return;
              handleDropBackToPool(selectedPoolItem);
              setSelectedPoolItem(null);
            }}
            className={`p-5 rounded-2xl space-y-3 transition-all cursor-pointer ${isDragOverPool || hoveredDropTarget === 'pool'
              ? 'bg-blue-100/80 dark:bg-blue-900/50 border-2 border-blue-500 scale-[1.005] ring-2 ring-blue-400'
              : 'bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-900 dark:to-blue-950/20 border-2 border-dashed border-blue-300 dark:border-blue-800/80'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Shuffle size={14} className="text-blue-500" />
                Unsorted Items Pool ({unsortedPool.length} remaining)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Drag items directly to target buckets below, or click to place
              </span>
            </div>

            {unsortedPool.length === 0 ? (
              <div className="py-6 text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                <span>All items placed! Click "Check Answers" below to evaluate.</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5 pt-1">
                {unsortedPool.map((item) => {
                  const isSelected = selectedPoolItem === item.id;
                  const isBeingDragged = draggedItemId === item.id || activePointerDrag?.itemId === item.id;

                  return (
                    <div
                      key={item.id}
                      onPointerDown={(e) => handlePointerDownItem(e, item)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPoolItem(isSelected ? null : item.id);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold select-none transition-all cursor-grab active:cursor-grabbing flex items-center gap-2 shadow-xs touch-none ${isBeingDragged ? 'opacity-30 scale-95 border-dashed border-blue-400' : ''
                        } ${isSelected
                          ? 'bg-blue-600 text-white ring-4 ring-blue-300 dark:ring-blue-900 scale-105'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:shadow-md'
                        }`}
                    >
                      <GripVertical size={13} className={isSelected ? 'text-white' : 'text-slate-400'} />
                      <span>{item.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drop Target Buckets - Auto Width Resizing */}
          <div
            className="grid gap-5 w-full transition-all duration-150"
            style={{
              gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, max(240px, calc((100% - ${(categories.length - 1) * 20}px) / ${categories.length}))), 1fr))`
            }}
          >
            {categories.map((cat) => {
              const theme = colorThemes.find(t => t.name === cat.color) || colorThemes[0];
              const itemsInBucket = placedItems[cat.id] || [];
              const isOverThis = dragOverCatId === cat.id || hoveredDropTarget === cat.id;

              return (
                <div
                  key={cat.id}
                  data-category-bucket-id={cat.id}
                  onClick={() => selectedPoolItem && handlePlaceItemIntoCategory(cat.id)}
                  className={`bg-white dark:bg-slate-900 border-2 ${isOverThis
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 scale-[1.02] shadow-lg ring-4 ring-blue-400/40'
                    : selectedPoolItem
                      ? 'border-blue-400 dark:border-blue-600 bg-blue-50/20 cursor-pointer animate-pulse'
                      : theme.border
                    } rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between transition-all min-w-0`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${theme.badge.split(' ')[0]}`} />
                        {cat.name}
                      </h4>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {itemsInBucket.length} items
                      </span>
                    </div>

                    {/* Placed Items Box */}
                    <div className="min-h-[160px] space-y-2 p-3 bg-slate-50/60 dark:bg-slate-950/40 rounded-xl border border-slate-200/60 dark:border-slate-800 transition-all overflow-y-auto">
                      {itemsInBucket.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic py-8">
                          {isOverThis ? 'Drop item here' : selectedPoolItem ? 'Click here to place selected item' : 'Drag items here'}
                        </div>
                      ) : (
                        itemsInBucket.map((item) => {
                          const isCorrect = item.correctCategoryId === cat.id;
                          const showGrading = validationResults?.checked;
                          const isBeingDragged = draggedItemId === item.id || activePointerDrag?.itemId === item.id;

                          return (
                            <div
                              key={item.id}
                              onPointerDown={(e) => handlePointerDownItem(e, item, cat.id)}
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium border shadow-2xs select-none transition-all touch-none ${!showGrading ? 'cursor-grab active:cursor-grabbing' : ''
                                } ${isBeingDragged ? 'opacity-30 scale-95 border-dashed border-blue-400' : ''} ${showGrading
                                  ? isCorrect
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-blue-400'
                                }`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                {!showGrading && <GripVertical size={13} className="text-slate-400 shrink-0" />}
                                {showGrading && (
                                  isCorrect ? <Check size={14} className="text-emerald-600 shrink-0" /> : <X size={14} className="text-rose-600 shrink-0" />
                                )}
                                <span className="truncate">{item.text}</span>
                              </span>

                              {!showGrading && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReturnItemToPool(cat.id, item.id);
                                  }}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                                  title="Return to pool"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {isOverThis ? (
                    <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      Release to drop into {cat.name}
                    </div>
                  ) : selectedPoolItem ? (
                    <div className="text-center text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      + Place here
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Validation & Feedback Footer */}
          <div className={`bg-white dark:bg-slate-900 border ${validationResults?.isFailed
            ? 'border-rose-300 dark:border-rose-800 ring-2 ring-rose-500/20'
            : validationResults?.isPassed && isGraded
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
                    {validationResults.isFailed ? (
                      <AlertCircle size={24} />
                    ) : validationResults.score === validationResults.maxScore ? (
                      <CheckCircle2 size={24} />
                    ) : (
                      <CheckCircle2 size={24} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        Score: {validationResults.score} / {validationResults.maxScore} Points ({Math.round((validationResults.score / validationResults.maxScore) * 100)}%)
                      </h4>
                      {isGraded && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${validationResults.isFailed
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          }`}>
                          {validationResults.isFailed ? 'Failed (Must Repeat)' : 'Passed'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      +{validationResults.correctCount * pointsPerCorrect} pts ({validationResults.correctCount} correct)
                      {validationResults.deductionTotal > 0 && ` • -${validationResults.deductionTotal} pts (${validationResults.mistakeCount} mistake${validationResults.mistakeCount === 1 ? '' : 's'})`}
                      {isGraded && (
                        <span className="font-semibold ml-1 text-slate-700 dark:text-slate-300">
                          • Passing Score: {passingScore} pts
                        </span>
                      )}
                      {validationResults.isFailed && (
                        <span className="block text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                          Score is lower than the passing threshold ({passingScore} pts). The test must be repeated.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Place all items in their designated buckets, then click Check Answers to test validation.
                  {isGraded && <span className="font-semibold ml-1 text-indigo-600 dark:text-indigo-400">(Passing requirement: {passingScore} / {totalMaxScore} pts)</span>}
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
                  <span>Reset Items</span>
                </button>
              )}

              {(!validationResults || !validationResults.isFailed) && (
                <button
                  onClick={handleCheckAnswers}
                  disabled={unsortedPool.length > 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Check Answers</span>
                </button>
              )}
            </div>
          </div>

          {/* Floating Dragged Avatar Preview */}
          {activePointerDrag && (
            <div
              style={{
                left: `${activePointerDrag.clientX}px`,
                top: `${activePointerDrag.clientY}px`,
              }}
              className="fixed pointer-events-none z-100 -translate-x-1/2 -translate-y-1/2 px-4 py-2.5 bg-blue-600 text-white rounded-xl shadow-2xl border-2 border-white dark:border-slate-800 text-xs font-bold flex items-center gap-2 scale-110 opacity-95 rotate-2 cursor-grabbing"
            >
              <GripVertical size={14} className="text-blue-200" />
              <span>{activePointerDrag.itemText}</span>
            </div>
          )}
        </div>
      )}

      {/* Bulk Import Category Items Modal */}
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
                    Bulk Paste Category Items
                    {bulkModal.targetCatId && (
                      <span className="ml-1 text-blue-600 dark:text-blue-400 font-normal">
                        ({categories.find(c => c.id === bulkModal.targetCatId)?.name})
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Paste listed items (numbered, bulleted, or line by line) into this category.
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
                  Paste Items:
                </label>
                {bulkModal.rawText.trim() && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    Detected {parsePastedList(bulkModal.rawText).length} items
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
                <p>• Creates separate assigned items for each line.</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Mode:</label>
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
                  onClick={() => handleApplyBulkCategoryItems(bulkModal.rawText, bulkModal.mode, bulkModal.targetCatId)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Import {parsePastedList(bulkModal.rawText).length} Items
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
