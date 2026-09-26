import { useState, useEffect, useRef, useMemo, useCallback, KeyboardEvent } from 'react';
import {
  ListOrdered, Plus, Trash2, CheckCircle2, AlertCircle,
  RotateCcw, Eye, Edit3, Award, MinusCircle,
  Save, X, Sliders, ToggleLeft, ToggleRight, ArrowDownUp,
  ChevronLeft, ChevronRight, HelpCircle
} from 'lucide-react';
import { scoreService } from '../../services/scoreService';
import { EnumerationKeyItem, EnumerationQuestionItem, QuizActivity } from '../../types/quiz';
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

const defaultQuestions: EnumerationQuestionItem[] = [
  {
    id: 'enum_q_1',
    prompt: 'Enumerate the primary required items:',
    items: [
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
    ],
    strictOrder: false,
  },
];

interface EnumerationProps {
  initialData?: QuizActivity | null;
  onBack?: () => void;
  onSaveToCourse?: (activity: QuizActivity) => void;
}

export default function Enumeration({ initialData, onBack, onSaveToCourse }: EnumerationProps) {
  const [viewMode, setViewMode] = useState<'author' | 'preview'>('author');
  const [activityTitle, setActivityTitle] = useState(
    initialData?.prompt || 'Enumeration Activity'
  );
  const [instructions, setInstructions] = useState(
    initialData?.instructions || 'Type each required item into the fields below.'
  );

  // Multi-Question State
  const [questions, setQuestions] = useState<EnumerationQuestionItem[]>(() => {
    if (initialData?.data?.enumeration?.questions && initialData.data.enumeration.questions.length > 0) {
      return initialData.data.enumeration.questions;
    }
    if (initialData?.data?.enumeration?.items && initialData.data.enumeration.items.length > 0) {
      return [
        {
          id: 'enum_q_1',
          prompt: initialData.prompt || 'Enumerate the primary required items:',
          items: initialData.data.enumeration.items,
          strictOrder: initialData.data.enumeration.strictOrder ?? false,
        },
      ];
    }
    return defaultQuestions;
  });

  const [caseSensitive, setCaseSensitive] = useState<boolean>(
    initialData?.data?.enumeration?.caseSensitive ?? false
  );

  // Scoring & Retry Parameters
  const [pointsPerCorrect, setPointsPerCorrect] = useState<number>(initialData?.pointsPerCorrect ?? 2);
  const [deductionPerMistake, setDeductionPerMistake] = useState<number>(initialData?.deductionPerMistake ?? 1);
  const [retries, setRetries] = useState<number>(initialData?.retries ?? 2);

  const totalItemCount = useMemo(() => {
    return questions.reduce((sum, q) => sum + (q.items?.length || 0), 0);
  }, [questions]);

  const totalMaxScore = totalItemCount * pointsPerCorrect;

  const [passingScore, setPassingScore] = useState<number>(() => {
    if (initialData?.passingScore !== undefined) return initialData.passingScore;
    const initialTotal = (initialData?.data?.enumeration?.items || defaultSampleItems).length * (initialData?.pointsPerCorrect ?? 2);
    return Math.max(1, Math.ceil(initialTotal * 0.7));
  });

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Learner Interactive State (1 Question on screen at a time)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  // userAnswers keyed by question ID -> array of user string inputs
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
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
    questionEvaluations: Record<string, {
      correctCount: number;
      mistakeCount: number;
      fieldEvaluations: Array<{
        input: string;
        isCorrect: boolean;
        matchedKeyItem?: EnumerationKeyItem;
        feedbackMessage: string;
      }>;
    }>;
  } | null>(null);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Sync initialData
  useEffect(() => {
    if (initialData) {
      setActivityTitle(initialData.prompt || 'Activity: Enumerate the 4 Primary Renewable Energy Sources');
      setInstructions(initialData.instructions || 'Type each renewable energy source into the numbered fields below. Answers are verified against the answer key.');
      if (initialData.data?.enumeration) {
        if (initialData.data.enumeration.questions && initialData.data.enumeration.questions.length > 0) {
          setQuestions(initialData.data.enumeration.questions);
        } else if (initialData.data.enumeration.items && initialData.data.enumeration.items.length > 0) {
          setQuestions([
            {
              id: 'enum_q_1',
              prompt: initialData.prompt || 'Enumerate the primary required items:',
              items: initialData.data.enumeration.items,
              strictOrder: initialData.data.enumeration.strictOrder ?? false,
            }
          ]);
        }
        setCaseSensitive(initialData.data.enumeration.caseSensitive ?? false);
      }
      setPointsPerCorrect(initialData.pointsPerCorrect ?? 2);
      setDeductionPerMistake(initialData.deductionPerMistake ?? 1);
      setRetries(initialData.retries ?? 2);
      const count = initialData.data?.enumeration?.itemCount || initialData.data?.enumeration?.items?.length || defaultSampleItems.length;
      setPassingScore(initialData.passingScore ?? Math.max(1, Math.ceil(count * (initialData.pointsPerCorrect ?? 2) * 0.7)));
    }
  }, [initialData]);

  // Undo & Redo History State
  const currentSnapshot = useMemo(() => ({
    activityTitle,
    instructions,
    questions,
    caseSensitive,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
  }), [
    activityTitle,
    instructions,
    questions,
    caseSensitive,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
  ]);

  const applySnapshot = useCallback((state: typeof currentSnapshot) => {
    if (state.activityTitle !== undefined) setActivityTitle(state.activityTitle);
    if (state.instructions !== undefined) setInstructions(state.instructions);
    if (state.questions !== undefined) setQuestions(state.questions);
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
    setActiveQuestionIndex(0);
    const initialInputs: Record<string, string[]> = {};
    questions.forEach(q => {
      initialInputs[q.id] = new Array(q.items.length).fill('');
    });
    setUserAnswers(initialInputs);
    setValidationResults(null);
    setAttemptsRemaining(retries);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  // Authoring: Question operations
  const handleAddQuestion = () => {
    const newQ: EnumerationQuestionItem = {
      id: `enum_q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      prompt: `Question #${questions.length + 1}: Enumerate the required items`,
      items: [
        {
          id: `enum_${Date.now()}_1`,
          primaryAnswer: 'Item 1',
          acceptableAliases: [],
          explanation: '',
        },
        {
          id: `enum_${Date.now()}_2`,
          primaryAnswer: 'Item 2',
          acceptableAliases: [],
          explanation: '',
        },
      ],
      strictOrder: false,
    };
    setQuestions(prev => [...prev, newQ]);
  };

  const handleRemoveQuestion = (qId: string) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter(q => q.id !== qId));
  };

  const handleUpdateQuestionPrompt = (qId: string, text: string) => {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, prompt: text } : q));
  };

  const handleToggleQuestionStrictOrder = (qId: string) => {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, strictOrder: !q.strictOrder } : q));
  };

  // Authoring: Item operations per question
  const handleAddItemToQuestion = (qId: string) => {
    const newItem: EnumerationKeyItem = {
      id: `enum_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      primaryAnswer: 'New Answer Key Item',
      acceptableAliases: [],
      explanation: '',
    };
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return { ...q, items: [...q.items, newItem] };
      }
      return q;
    }));
  };

  const handleUpdateItemPrimary = (qId: string, itemId: string, text: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          items: q.items.map(item => item.id === itemId ? { ...item, primaryAnswer: text } : item),
        };
      }
      return q;
    }));
  };

  const handleUpdateItemExplanation = (qId: string, itemId: string, text: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          items: q.items.map(item => item.id === itemId ? { ...item, explanation: text } : item),
        };
      }
      return q;
    }));
  };

  const handleDeleteItem = (qId: string, itemId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        if (q.items.length <= 1) return q;
        return {
          ...q,
          items: q.items.filter(item => item.id !== itemId),
        };
      }
      return q;
    }));
  };

  const handleAddAlias = (qId: string, itemId: string) => {
    const aliasText = (newAliasInputs[itemId] || '').trim();
    if (!aliasText) return;

    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          items: q.items.map(item => {
            if (item.id === itemId) {
              if (item.acceptableAliases.some(a => a.toLowerCase() === aliasText.toLowerCase())) return item;
              return { ...item, acceptableAliases: [...item.acceptableAliases, aliasText] };
            }
            return item;
          }),
        };
      }
      return q;
    }));

    setNewAliasInputs(prev => ({ ...prev, [itemId]: '' }));
  };

  const handleRemoveAlias = (qId: string, itemId: string, aliasIndex: number) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          items: q.items.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                acceptableAliases: item.acceptableAliases.filter((_, idx) => idx !== aliasIndex),
              };
            }
            return item;
          }),
        };
      }
      return q;
    }));
  };

  // Learner: Handle typing in direct inputs for current active question
  const handleUserInputChange = (qId: string, index: number, value: string) => {
    if (validationResults?.checked) return;
    setUserAnswers(prev => {
      const currentList = prev[qId] ? [...prev[qId]] : [];
      currentList[index] = value;
      return { ...prev, [qId]: currentList };
    });
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number, totalInQuestion: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < totalInQuestion - 1) {
        inputRefs.current[index + 1]?.focus();
      } else if (activeQuestionIndex < questions.length - 1) {
        setActiveQuestionIndex(prev => prev + 1);
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
    let totalCorrect = 0;
    let totalMistakes = 0;
    const qEvaluations: Record<string, {
      correctCount: number;
      mistakeCount: number;
      fieldEvaluations: Array<{
        input: string;
        isCorrect: boolean;
        matchedKeyItem?: EnumerationKeyItem;
        feedbackMessage: string;
      }>;
    }> = {};

    questions.forEach(q => {
      const qInputs = userAnswers[q.id] || new Array(q.items.length).fill('');
      let qCorrect = 0;
      let qMistakes = 0;
      const fieldEvals: Array<{
        input: string;
        isCorrect: boolean;
        matchedKeyItem?: EnumerationKeyItem;
        feedbackMessage: string;
      }> = [];

      if (q.strictOrder) {
        q.items.forEach((keyItem, idx) => {
          const userInput = qInputs[idx] || '';
          const isMatch = matchesKey(userInput, keyItem, caseSensitive);

          if (isMatch) {
            qCorrect += 1;
            fieldEvals.push({
              input: userInput,
              isCorrect: true,
              matchedKeyItem: keyItem,
              feedbackMessage: 'Correct match (position verified)',
            });
          } else {
            qMistakes += 1;
            fieldEvals.push({
              input: userInput,
              isCorrect: false,
              feedbackMessage: userInput.trim() === '' ? 'Empty field' : 'Incorrect for this position',
            });
          }
        });
      } else {
        const remainingKeys = [...q.items];
        for (let i = 0; i < q.items.length; i++) {
          const userInput = qInputs[i] || '';
          const matchIndex = remainingKeys.findIndex(k => matchesKey(userInput, k, caseSensitive));

          if (matchIndex !== -1) {
            const matchedKey = remainingKeys[matchIndex];
            remainingKeys.splice(matchIndex, 1);
            qCorrect += 1;
            fieldEvals.push({
              input: userInput,
              isCorrect: true,
              matchedKeyItem: matchedKey,
              feedbackMessage: 'Correct response',
            });
          } else {
            qMistakes += 1;
            fieldEvals.push({
              input: userInput,
              isCorrect: false,
              feedbackMessage: userInput.trim() === '' ? 'Empty field' : 'Incorrect or duplicate response',
            });
          }
        }
      }

      totalCorrect += qCorrect;
      totalMistakes += qMistakes;
      qEvaluations[q.id] = {
        correctCount: qCorrect,
        mistakeCount: qMistakes,
        fieldEvaluations: fieldEvals,
      };
    });

    const isGradedTest = pointsPerCorrect > 0;
    const pointsEarned = totalCorrect * pointsPerCorrect;
    const deductionTotal = isGradedTest ? totalMistakes * deductionPerMistake : 0;
    const finalScore = Math.max(0, pointsEarned - deductionTotal);
    const maxScore = totalItemCount * pointsPerCorrect;
    const isPassed = !isGradedTest || finalScore >= passingScore;

    setValidationResults({
      checked: true,
      score: finalScore,
      maxScore,
      correctCount: totalCorrect,
      mistakeCount: totalMistakes,
      deductionTotal,
      isPassed,
      isFailed: isGradedTest && !isPassed,
      questionEvaluations: qEvaluations,
    });

    if (retries > 0 && attemptsRemaining > 0) {
      setAttemptsRemaining(prev => prev - 1);
    }

    // Record score
    scoreService.recordQuizScore({
      courseId: 'proj_sample_01',
      quizId: initialData?.id || 'quiz_enum_01',
      quizTitle: activityTitle || 'Enumeration Activity',
      quizType: 'Enumeration',
      score: finalScore,
      maxScore,
      correctCount: totalCorrect,
      mistakeCount: totalMistakes,
      attempts: retries > 0 ? (retries - attemptsRemaining + 1) : 1,
    });
  };

  const handleSaveToCourse = () => {
    // Top-level flattened items for backward compatibility
    const allItems = questions.flatMap(q => q.items);
    const activity: QuizActivity = {
      id: initialData?.id || `quiz_enum_${Date.now()}`,
      name: activityTitle || 'Enumeration Activity',
      type: 'Enumeration',
      prompt: activityTitle,
      instructions,
      pointsPerCorrect,
      deductionPerMistake,
      retries,
      isGraded: pointsPerCorrect > 0,
      passingScore: pointsPerCorrect > 0 ? passingScore : undefined,
      data: {
        enumeration: {
          items: allItems,
          strictOrder: questions[0]?.strictOrder ?? false,
          caseSensitive,
          itemCount: allItems.length,
          questions,
        },
      },
      totalPoints: totalMaxScore,
      lastModified: Date.now(),
    };

    onSaveToCourse?.(activity);
    setSaveSuccessMessage('Activity saved to Course Editor! You can double-click this quiz in Course Editor to reload and update anytime.');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  const currentActiveQuestion = questions[activeQuestionIndex] || questions[0];

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
              {activityTitle || 'Untitled Enumeration Question'}
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
                <label
                  title="Write the name of the activity that will appear on the Course Organizer. (optional)"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-help"
                >
                  ACTIVITY NAME
                </label>
                <input
                  type="text"
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="e.g. Enumerate the 4 primary types of renewable energy resources"
                  title="Write the name of the activity that will appear on the Course Organizer. (optional)"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  title="Write the general instructions for this activity in this box. (optional)"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-help"
                >
                  OVERALL INSTRUCTION
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Type each answer into the numbered fields below."
                  title="Write the general instructions for this activity in this box. (optional)"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Questions Counter & Add Button Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {questions.length} Enumeration Question{questions.length === 1 ? '' : 's'} ({totalItemCount} total items)
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">Learners see 1 question per page</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Question ({questions.length})</span>
                </button>
              </div>
            </div>

            {/* Scoring & Retries Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              {/* 1. Score per correct item */}
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

              {/* 2. Passing Score */}
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
                    ? `Fails if score < ${passingScore} pts`
                    : 'Non-graded tests have no passing score.'}
                </p>
              </div>

              {/* 3. Deduction per mistake */}
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

            {/* Global Case-Sensitivity Toggle */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div
                onClick={() => setCaseSensitive(!caseSensitive)}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${caseSensitive
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                  }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <Sliders size={14} className={caseSensitive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                    <span>Case-Sensitive Evaluation Across Questions</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {caseSensitive
                      ? 'Learner capitalization must match answers exactly.'
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
          </div>

          {/* List of Question Cards */}
          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4"
              >
                {/* Question Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                      {qIndex + 1}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Question #{qIndex + 1}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">({q.items.length} items required)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddItemToQuestion(q.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Add Item</span>
                    </button>

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl cursor-pointer transition-colors"
                        title="Delete question"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Prompt & Strict Order Config */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Question #{qIndex + 1} Prompt
                    </label>
                    <input
                      type="text"
                      value={q.prompt}
                      onChange={(e) => handleUpdateQuestionPrompt(q.id, e.target.value)}
                      placeholder="e.g. Enumerate the 4 primary types of renewable energy resources"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>

                  <div
                    onClick={() => handleToggleQuestionStrictOrder(q.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all self-end ${q.strictOrder
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                      }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                        <ArrowDownUp size={13} className={q.strictOrder ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                        <span>Strict Order</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {q.strictOrder ? 'Ranked exact order' : 'Any order accepted'}
                      </p>
                    </div>
                    {q.strictOrder ? (
                      <ToggleRight size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    ) : (
                      <ToggleLeft size={20} className="text-slate-400 shrink-0" />
                    )}
                  </div>
                </div>

                {/* Enumeration Key Cards for this Question */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Expected Answer Keys ({q.items.length})
                  </span>

                  <div className="space-y-3">
                    {q.items.map((item, idx) => (
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

                          {q.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(q.id, item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer transition-colors"
                              title="Delete item"
                            >
                              <Trash2 size={14} />
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
                              onChange={(e) => handleUpdateItemPrimary(q.id, item.id, e.target.value)}
                              placeholder="e.g. Solar Energy"
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                            />
                          </div>

                          {/* Explanation */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                              Explanation or Additional Context
                            </label>
                            <input
                              type="text"
                              value={item.explanation || ''}
                              onChange={(e) => handleUpdateItemExplanation(q.id, item.id, e.target.value)}
                              placeholder="e.g. Generated directly by photovoltaic cells."
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                            />
                          </div>
                        </div>

                        {/* Acceptable Aliases */}
                        <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Acceptable Alternative Spellings / Synonyms (Optional)
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {item.acceptableAliases.map((alias, aIdx) => (
                              <span
                                key={aIdx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300"
                              >
                                <span>{alias}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAlias(q.id, item.id, aIdx)}
                                  className="text-slate-400 hover:text-rose-500 cursor-pointer ml-0.5"
                                >
                                  ×
                                </button>
                              </span>
                            ))}

                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={newAliasInputs[item.id] || ''}
                                onChange={(e) => setNewAliasInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddAlias(q.id, item.id);
                                  }
                                }}
                                placeholder="Add alternate..."
                                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-hidden w-28 sm:w-36"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddAlias(q.id, item.id)}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Bottom Add Question Button */}
            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-bold transition-all cursor-pointer bg-slate-50/50 dark:bg-slate-900/50"
            >
              <Plus size={16} />
              <span>Add Another Enumeration Question</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. LEARNER PREVIEW MODE (1 QUESTION AT A TIME)                             */}
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
                {currentActiveQuestion.strictOrder
                  ? 'Sequential order required: list each item in exact chronological/ranked order.'
                  : 'Items may be entered in any order. Press Enter or Tab to move between fields.'}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 shadow-2xs shrink-0">
              <span>
                {((userAnswers[currentActiveQuestion.id] || []).filter(u => ((u || '').trim().length > 0))).length} of {currentActiveQuestion.items.length} filled
              </span>
            </div>
          </div>

          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Stepper / Question Tabs */}
            {questions.length > 1 && (
              <div className="flex items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                <div className="flex items-center gap-1.5">
                  {questions.map((q, idx) => {
                    const answeredCount = (userAnswers[q.id] || []).filter(u => (u || '').trim().length > 0).length;
                    const isAllFilled = answeredCount === q.items.length;
                    const isActive = activeQuestionIndex === idx;
                    const isChecked = validationResults?.checked;
                    const qEval = validationResults?.questionEvaluations?.[q.id];
                    const isAllCorrect = qEval ? qEval.correctCount === q.items.length : false;

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setActiveQuestionIndex(idx)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                          isChecked
                            ? isAllCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                            : isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isAllFilled
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-500 px-2 shrink-0">
                    Question {activeQuestionIndex + 1} of {questions.length}
                  </span>
                  <button
                    type="button"
                    disabled={activeQuestionIndex === 0}
                    onClick={() => setActiveQuestionIndex(prev => Math.max(0, prev - 1))}
                    className="p-1 rounded-lg text-slate-500 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={activeQuestionIndex === questions.length - 1}
                    onClick={() => setActiveQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="p-1 rounded-lg text-slate-500 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Current Active Single Question Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="space-y-1 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Question #{activeQuestionIndex + 1}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                  {currentActiveQuestion.prompt}
                </h3>
              </div>

              {/* Numbered Input Form Fields for Current Question */}
              <div className="space-y-3.5">
                {currentActiveQuestion.items.map((_, idx) => {
                  const evalResult = validationResults?.questionEvaluations?.[currentActiveQuestion.id]?.fieldEvaluations?.[idx];
                  const isChecked = validationResults?.checked;
                  const isCorrect = evalResult?.isCorrect;
                  const currentAns = userAnswers[currentActiveQuestion.id]?.[idx] || '';

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
                            value={currentAns}
                            onChange={(e) => handleUserInputChange(currentActiveQuestion.id, idx, e.target.value)}
                            onKeyDown={(e) => handleInputKeyDown(e, idx, currentActiveQuestion.items.length)}
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

              {/* Prev / Next question buttons inside card */}
              {questions.length > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={activeQuestionIndex === 0}
                    onClick={() => setActiveQuestionIndex(prev => Math.max(0, prev - 1))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                    <span>Previous Question</span>
                  </button>

                  <button
                    type="button"
                    disabled={activeQuestionIndex === questions.length - 1}
                    onClick={() => setActiveQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  >
                    <span>Next Question</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
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
                      +{validationResults.correctCount * pointsPerCorrect} pts ({validationResults.correctCount} of {totalItemCount} correct items)
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
                  disabled={Object.values(userAnswers).flat().every(u => (u || '').trim() === '')}
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
