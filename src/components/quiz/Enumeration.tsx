import { useState, useEffect, useRef, useMemo, useCallback, FormEvent, KeyboardEvent } from 'react';
import {
  ListOrdered, Plus, Trash2, CheckCircle2, AlertCircle,
  RotateCcw, Eye, Edit3, Sparkles, Award, MinusCircle,
  Save, X, Check, ArrowRight, HelpCircle, ShieldAlert,
  Tag, Sliders, ToggleLeft, ToggleRight, ArrowDownUp,
  Undo2, Redo2
} from 'lucide-react';
import { scoreService } from '../../services/scoreService';
import { EnumerationKeyItem, QuizActivity } from '../../types/quiz';
import { useQuizUndoRedo } from '../../hooks/useQuizUndoRedo';
import { QuizUndoRedoButtons } from './QuizUndoRedoButtons';

const defaultSampleItems: EnumerationKeyItem[] = [
  {
    id: 'enum_1',
    primaryAnswer: 'Item 1',
    acceptableAliases: [],
    explanation: '',
  },
  {
    id: 'enum_2',
    primaryAnswer: 'Item 2',
    acceptableAliases: [],
    explanation: '',
  },
];

interface EnumerationProps {
  initialData?: QuizActivity | null;
  onBack?: () => void;
  onSaveToCourse?: (activity: QuizActivity) => void;
}

export default function Enumeration({ initialData, onBack, onSaveToCourse }: EnumerationProps) {
  const [viewMode, setViewMode] = useState<'author' | 'preview'>('author');
  const [prompt, setPrompt] = useState(
    initialData?.prompt || 'Enumeration Activity'
  );
  const [instructions, setInstructions] = useState(
    initialData?.instructions || 'Type each required item into the fields below.'
  );

  const [items, setItems] = useState<EnumerationKeyItem[]>(
    initialData?.data?.enumeration?.items && initialData.data.enumeration.items.length > 0
      ? initialData.data.enumeration.items
      : defaultSampleItems
  );

  const [strictOrder, setStrictOrder] = useState<boolean>(
    initialData?.data?.enumeration?.strictOrder ?? false
  );
  const [caseSensitive, setCaseSensitive] = useState<boolean>(
    initialData?.data?.enumeration?.caseSensitive ?? false
  );

  // Scoring & Retry Parameters
  const [pointsPerCorrect, setPointsPerCorrect] = useState<number>(initialData?.pointsPerCorrect ?? 2);
  const [deductionPerMistake, setDeductionPerMistake] = useState<number>(initialData?.deductionPerMistake ?? 1);
  const [retries, setRetries] = useState<number>(initialData?.retries ?? 2);
  const [passingScore, setPassingScore] = useState<number>(() => {
    if (initialData?.passingScore !== undefined) return initialData.passingScore;
    const initialTotal = (initialData?.data?.enumeration?.items || defaultSampleItems).length * (initialData?.pointsPerCorrect ?? 2);
    return Math.max(1, Math.ceil(initialTotal * 0.7));
  });

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Learner Interactive State
  const [userInputs, setUserInputs] = useState<string[]>([]);
  const [newAliasInputs, setNewAliasInputs] = useState<Record<string, string>>({});
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
    fieldEvaluations: Array<{
      input: string;
      isCorrect: boolean;
      matchedKeyItem?: EnumerationKeyItem;
      feedbackMessage: string;
    }>;
  } | null>(null);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Sync initialData
  useEffect(() => {
    if (initialData) {
      setPrompt(initialData.prompt || 'Activity: Enumerate the 4 Primary Renewable Energy Sources');
      setInstructions(initialData.instructions || 'Type each renewable energy source into the numbered fields below. Answers are verified against the answer key.');
      if (initialData.data?.enumeration) {
        setItems(initialData.data.enumeration.items || defaultSampleItems);
        setStrictOrder(initialData.data.enumeration.strictOrder ?? false);
        setCaseSensitive(initialData.data.enumeration.caseSensitive ?? false);
      }
      setPointsPerCorrect(initialData.pointsPerCorrect ?? 2);
      setDeductionPerMistake(initialData.deductionPerMistake ?? 1);
      setRetries(initialData.retries ?? 2);
      const count = initialData.data?.enumeration?.items?.length || defaultSampleItems.length;
      setPassingScore(initialData.passingScore ?? Math.max(1, Math.ceil(count * (initialData.pointsPerCorrect ?? 2) * 0.7)));
    }
  }, [initialData]);

  // Undo & Redo History State
  const currentSnapshot = useMemo(() => ({
    prompt,
    instructions,
    items,
    strictOrder,
    caseSensitive,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
  }), [
    prompt,
    instructions,
    items,
    strictOrder,
    caseSensitive,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
  ]);

  const applySnapshot = useCallback((state: typeof currentSnapshot) => {
    if (state.prompt !== undefined) setPrompt(state.prompt);
    if (state.instructions !== undefined) setInstructions(state.instructions);
    if (state.items !== undefined) setItems(state.items);
    if (state.strictOrder !== undefined) setStrictOrder(state.strictOrder);
    if (state.caseSensitive !== undefined) setCaseSensitive(state.caseSensitive);
    if (state.pointsPerCorrect !== undefined) setPointsPerCorrect(state.pointsPerCorrect);
    if (state.passingScore !== undefined) setPassingScore(state.passingScore);
    if (state.deductionPerMistake !== undefined) setDeductionPerMistake(state.deductionPerMistake);
    if (state.retries !== undefined) setRetries(state.retries);
  }, []);

  const { canUndo, canRedo, handleUndo, handleRedo } = useQuizUndoRedo(currentSnapshot, applySnapshot);

  // Handle enter preview
  const handleEnterPreview = () => {
    setViewMode('preview');
    setUserInputs(new Array(items.length).fill(''));
    setValidationResults(null);
    setAttemptsRemaining(retries);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  // Authoring: Item operations
  const handleAddItem = () => {
    const newItem: EnumerationKeyItem = {
      id: `enum_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      primaryAnswer: 'New Answer Key Item',
      acceptableAliases: [],
      explanation: 'Explanation or context for this answer.',
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateItemPrimary = (id: string, text: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, primaryAnswer: text } : item));
  };

  const handleUpdateItemExplanation = (id: string, text: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, explanation: text } : item));
  };

  const handleDeleteItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddAlias = (itemId: string) => {
    const aliasText = (newAliasInputs[itemId] || '').trim();
    if (!aliasText) return;

    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        if (item.acceptableAliases.some(a => a.toLowerCase() === aliasText.toLowerCase())) return item;
        return { ...item, acceptableAliases: [...item.acceptableAliases, aliasText] };
      }
      return item;
    }));

    setNewAliasInputs(prev => ({ ...prev, [itemId]: '' }));
  };

  const handleRemoveAlias = (itemId: string, aliasIndex: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          acceptableAliases: item.acceptableAliases.filter((_, idx) => idx !== aliasIndex),
        };
      }
      return item;
    }));
  };

  // Learner: Handle typing in direct inputs
  const handleUserInputChange = (index: number, value: string) => {
    if (validationResults?.checked) return;
    setUserInputs(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < items.length - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        handleCheckAnswers();
      }
    }
  };

  // Answer matching logic
  const normalize = (str: string, isCaseSensitive: boolean) => {
    const trimmed = (str || '').trim();
    return isCaseSensitive ? trimmed : trimmed.toLowerCase();
  };

  const matchesKey = (input: string, keyItem: EnumerationKeyItem, isCaseSensitive: boolean) => {
    const normalizedInput = normalize(input, isCaseSensitive);
    if (!normalizedInput) return false;

    if (normalize(keyItem.primaryAnswer, isCaseSensitive) === normalizedInput) return true;
    return keyItem.acceptableAliases.some(alias => normalize(alias, isCaseSensitive) === normalizedInput);
  };

  const handleCheckAnswers = () => {
    let correctCount = 0;
    let mistakeCount = 0;
    const fieldEvaluations: Array<{
      input: string;
      isCorrect: boolean;
      matchedKeyItem?: EnumerationKeyItem;
      feedbackMessage: string;
    }> = [];

    if (strictOrder) {
      // In strict order, position `i` must match `items[i]`
      items.forEach((keyItem, idx) => {
        const userInput = userInputs[idx] || '';
        if (matchesKey(userInput, keyItem, caseSensitive)) {
          correctCount += 1;
          fieldEvaluations.push({
            input: userInput,
            isCorrect: true,
            matchedKeyItem: keyItem,
            feedbackMessage: `Correct (#${idx + 1}: ${keyItem.primaryAnswer})`,
          });
        } else {
          mistakeCount += 1;
          fieldEvaluations.push({
            input: userInput,
            isCorrect: false,
            feedbackMessage: `Expected: "${keyItem.primaryAnswer}"`,
          });
        }
      });
    } else {
      // Unordered enumeration: each matched item can only be claimed once
      const claimedKeyIds = new Set<string>();

      for (let i = 0; i < items.length; i++) {
        const userInput = userInputs[i] || '';
        let foundMatch: EnumerationKeyItem | null = null;

        for (const keyItem of items) {
          if (!claimedKeyIds.has(keyItem.id) && matchesKey(userInput, keyItem, caseSensitive)) {
            foundMatch = keyItem;
            break;
          }
        }

        if (foundMatch) {
          claimedKeyIds.add(foundMatch.id);
          correctCount += 1;
          fieldEvaluations.push({
            input: userInput,
            isCorrect: true,
            matchedKeyItem: foundMatch,
            feedbackMessage: `Matched: ${foundMatch.primaryAnswer}`,
          });
        } else {
          mistakeCount += 1;
          fieldEvaluations.push({
            input: userInput,
            isCorrect: false,
            feedbackMessage: userInput.trim() === '' ? 'Empty field' : 'Incorrect or duplicate response',
          });
        }
      }
    }

    const isGradedTest = pointsPerCorrect > 0;
    const pointsEarned = correctCount * pointsPerCorrect;
    const deductionTotal = isGradedTest ? mistakeCount * deductionPerMistake : 0;
    const finalScore = Math.max(0, pointsEarned - deductionTotal);
    const maxScore = items.length * pointsPerCorrect;
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
      fieldEvaluations,
    });

    if (retries > 0 && attemptsRemaining > 0) {
      setAttemptsRemaining(prev => prev - 1);
    }

    // Record score
    scoreService.recordQuizScore({
      courseId: 'proj_sample_01',
      quizId: initialData?.id || 'quiz_enum_01',
      quizTitle: prompt || 'Enumeration Activity',
      quizType: 'Enumeration',
      score: finalScore,
      maxScore,
      correctCount,
      mistakeCount,
      attempts: retries > 0 ? (retries - attemptsRemaining + 1) : 1,
    });
  };

  const totalMaxScore = items.length * pointsPerCorrect;

  const handleSaveToCourse = () => {
    const activity: QuizActivity = {
      id: initialData?.id || `quiz_enum_${Date.now()}`,
      name: prompt || 'Enumeration Activity',
      type: 'Enumeration',
      prompt,
      instructions,
      pointsPerCorrect,
      deductionPerMistake,
      retries,
      isGraded: pointsPerCorrect > 0,
      passingScore: pointsPerCorrect > 0 ? passingScore : undefined,
      data: {
        enumeration: {
          items,
          strictOrder,
          caseSensitive,
          itemCount: items.length,
        },
      },
      totalPoints: totalMaxScore,
      lastModified: Date.now(),
    };

    onSaveToCourse?.(activity);
    setSaveSuccessMessage('Activity saved to Course Editor! You can double-click this quiz in Course Editor to reload and update anytime.');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-200 select-none">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <ListOrdered size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Question Type
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Enumeration (Listing Challenge)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {prompt || 'Untitled Enumeration Question'}
            </h2>
          </div>
        </div>

        {/* View Mode Toggle, Undo/Redo & Save Button */}
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
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
            title="Save this activity directly to Course Editor"
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
                  Enumeration Prompt / Question
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Enumerate the 4 primary types of renewable energy resources"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Learner Instructions / Question
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Type each answer into the numbered fields below."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Evaluation Options: Strict Order & Case Sensitivity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div
                onClick={() => setStrictOrder(!strictOrder)}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${strictOrder
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                  }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <ArrowDownUp size={14} className={strictOrder ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                    <span>Strict Sequential Order</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {strictOrder
                      ? 'Item 1 must be typed in box #1, Item 2 in box #2, etc.'
                      : 'Any order accepted: learners can list answers in any order.'}
                  </p>
                </div>
                {strictOrder ? (
                  <ToggleRight size={24} className="text-blue-600 dark:text-blue-400 shrink-0" />
                ) : (
                  <ToggleLeft size={24} className="text-slate-400 shrink-0" />
                )}
              </div>

              <div
                onClick={() => setCaseSensitive(!caseSensitive)}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${caseSensitive
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                  }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <Sliders size={14} className={caseSensitive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                    <span>Case-Sensitive Evaluation</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {caseSensitive
                      ? 'Capitalization must match exactly.'
                      : 'Case-insensitive (recommended): "solar" matches "Solar".'}
                  </p>
                </div>
                {caseSensitive ? (
                  <ToggleRight size={24} className="text-blue-600 dark:text-blue-400 shrink-0" />
                ) : (
                  <ToggleLeft size={24} className="text-slate-400 shrink-0" />
                )}
              </div>
            </div>

            {/* Scoring & Retries Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {/* 1. Score per correct item (0 for non-graded) */}
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
                  {pointsPerCorrect > 0 ? `Total possible score: ${totalMaxScore} pts` : '0 pts = Non-graded practice'}
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
                  {pointsPerCorrect > 0 ? 'Points subtracted per incorrect field' : 'No deductions on non-graded activities'}
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

          {/* Answer Key Editor Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <span>Instructor Answer Key Definition</span>
                  <span className="text-xs font-normal text-slate-400">({items.length} items required)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provide the primary correct answers along with any acceptable alternative spellings or synonyms.
                </p>
              </div>

              <button
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Expected Item</span>
              </button>
            </div>

            {/* Enumeration Key Cards */}
            <div className="space-y-4">
              {items.map((item, idx) => {
                return (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 transition-all hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Expected Answer #{idx + 1}
                        </span>
                      </div>

                      {items.length > 1 && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer transition-colors"
                          title="Delete item"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Primary Answer */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Primary Answer Text (Canonical)
                        </label>
                        <input
                          type="text"
                          value={item.primaryAnswer}
                          onChange={(e) => handleUpdateItemPrimary(item.id, e.target.value)}
                          placeholder="e.g. Solar Energy"
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
                        />
                      </div>

                      {/* Explanation / Notes */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Context / Explanation Note
                        </label>
                        <input
                          type="text"
                          value={item.explanation || ''}
                          onChange={(e) => handleUpdateItemExplanation(item.id, e.target.value)}
                          placeholder="e.g. Solar PV captures photon radiation (Optional)"
                          className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Acceptable Synonyms / Aliases */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        <Tag size={12} className="text-blue-500" />
                        <span>Acceptable Alternate Synonyms & Spellings</span>
                      </label>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.acceptableAliases.map((alias, aIdx) => (
                          <span
                            key={aIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 font-medium"
                          >
                            <span>{alias}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAlias(item.id, aIdx)}
                              className="text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}

                        {/* Quick Add Alias Input */}
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newAliasInputs[item.id] || ''}
                            onChange={(e) => setNewAliasInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddAlias(item.id);
                              }
                            }}
                            placeholder="Add synonym (Enter)..."
                            className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden w-40"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddAlias(item.id)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
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
      {/* 2. LEARNER PREVIEW MODE                                                   */}
      {/* ========================================================================= */}
      {viewMode === 'preview' && (
        <div className="space-y-6">
          {/* Header instructions for learner */}
          <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <ListOrdered size={16} className="text-blue-600 dark:text-blue-400" />
                <span>{instructions}</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {strictOrder
                  ? 'Sequential order required: list each item in exact chronological/ranked order.'
                  : 'Items may be entered in any order. Press Enter or Tab to move between fields.'}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 shadow-2xs shrink-0">
              <span>{userInputs.filter(u => (u || '').trim().length > 0).length} of {items.length} filled</span>
            </div>
          </div>

          {/* Numbered Input Form Fields */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="space-y-3.5 max-w-2xl mx-auto">
              {items.map((_, idx) => {
                const evalResult = validationResults?.fieldEvaluations?.[idx];
                const isChecked = validationResults?.checked;
                const isCorrect = evalResult?.isCorrect;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${isChecked
                        ? isCorrect
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-rose-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}>
                        {idx + 1}
                      </span>

                      <div className="relative flex-1">
                        <input
                          ref={(el) => { inputRefs.current[idx] = el; }}
                          type="text"
                          disabled={isChecked}
                          value={userInputs[idx] || ''}
                          onChange={(e) => handleUserInputChange(idx, e.target.value)}
                          onKeyDown={(e) => handleInputKeyDown(e, idx)}
                          placeholder={`Type item #${idx + 1}...`}
                          className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all outline-hidden ${isChecked
                            ? isCorrect
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/40 border-2 border-emerald-400 text-slate-900 dark:text-white'
                              : 'bg-rose-50/50 dark:bg-rose-950/40 border-2 border-rose-400 text-slate-900 dark:text-white'
                            : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900'
                            }`}
                        />

                        {isChecked && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                            {isCorrect ? (
                              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <AlertCircle size={18} className="text-rose-600 dark:text-rose-400" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Field Evaluation Feedback */}
                    {isChecked && evalResult && (
                      <div className={`ml-11 text-xs font-semibold flex items-center gap-1.5 ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                        <span>{evalResult.feedbackMessage}</span>
                        {evalResult.matchedKeyItem?.explanation && (
                          <span className="font-normal text-slate-500 dark:text-slate-400">
                            • {evalResult.matchedKeyItem.explanation}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
                      +{validationResults.correctCount * pointsPerCorrect} pts ({validationResults.correctCount} correct item{validationResults.correctCount === 1 ? '' : 's'})
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
                  Type your answers into the numbered boxes and press Check Answers.
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
                  <span>Clear Inputs</span>
                </button>
              )}

              {(!validationResults || !validationResults.isFailed) && (
                <button
                  onClick={handleCheckAnswers}
                  disabled={userInputs.every(u => (u || '').trim() === '')}
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
    </div>
  );
}
