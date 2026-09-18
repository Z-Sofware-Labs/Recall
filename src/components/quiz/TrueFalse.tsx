import { useState, useEffect, useMemo, useCallback, ClipboardEvent } from 'react';
import {
  ToggleLeft, CheckCircle2, AlertCircle,
  RotateCcw, Eye, Edit3, Award, MinusCircle,
  Save, X, Check, HelpCircle, ShieldAlert,
  Plus, Trash2, Sliders, ChevronLeft, ChevronRight,
  Layers, CheckSquare, Sparkles, Tag, Type, ClipboardList,
  Undo2, Redo2
} from 'lucide-react';
import { scoreService } from '../../services/scoreService';
import { TrueFalseQuestionItem, TrueFalseActivityData, QuizActivity } from '../../types/quiz';
import { parseTrueFalseQuestions } from '../../utils/quizPasteParser';
import { MathRenderer } from './MathRenderer';
import { useQuizUndoRedo } from '../../hooks/useQuizUndoRedo';
import { QuizUndoRedoButtons } from './QuizUndoRedoButtons';

const defaultTraditionalQuestions: TrueFalseQuestionItem[] = [
  {
    id: 'tf_t_1',
    statement: '1. Enter statement to evaluate as True or False.',
    isTrue: true,
    explanation: '',
  },
];

const defaultModifiedQuestions: TrueFalseQuestionItem[] = [
  {
    id: 'tf_m_1',
    statement: '1. Enter statement with an underlined word to evaluate.',
    isTrue: true,
    underlinedWord: '',
    replacementAnswer: '',
    acceptableAliases: [],
    explanation: '',
  },
];

interface TrueFalseProps {
  initialData?: QuizActivity | null;
  onBack?: () => void;
  onSaveToCourse?: (activity: QuizActivity) => void;
}

export default function TrueFalse({ initialData, onBack, onSaveToCourse }: TrueFalseProps) {
  const [viewMode, setViewMode] = useState<'author' | 'preview'>('author');
  const [activityTitle, setActivityTitle] = useState(
    initialData?.prompt || 'True or False Activity'
  );
  const [instructions, setInstructions] = useState(
    initialData?.instructions || 'Evaluate each statement and select whether it is True or False.'
  );

  // Mode: Traditional vs Modified
  const [tfMode, setTfMode] = useState<'traditional' | 'modified'>(
    initialData?.data?.trueFalse?.mode || 'traditional'
  );

  // Questions List (Unlimited)
  const [questions, setQuestions] = useState<TrueFalseQuestionItem[]>(() => {
    if (initialData?.data?.trueFalse?.questions && initialData.data.trueFalse.questions.length > 0) {
      return initialData.data.trueFalse.questions;
    }
    if (initialData?.data?.trueFalse?.statement) {
      return [
        {
          id: 'tf_legacy_1',
          statement: initialData.data.trueFalse.statement,
          isTrue: initialData.data.trueFalse.correctAnswer ?? true,
          explanation: initialData.data.trueFalse.explanation || '',
        },
      ];
    }
    return defaultTraditionalQuestions;
  });

  // Traditional Mode Display per page: 1 | 5 | 10 (No 'all' option)
  const [displayPerPage, setDisplayPerPage] = useState<1 | 5 | 10>(
    initialData?.data?.trueFalse?.displayPerPage || 1
  );

  // Scoring
  const [pointsPerCorrect, setPointsPerCorrect] = useState<number>(initialData?.pointsPerCorrect ?? 2);
  const [deductionPerMistake, setDeductionPerMistake] = useState<number>(initialData?.deductionPerMistake ?? 0);
  const [retries, setRetries] = useState<number>(initialData?.retries ?? 2);

  const totalMaxScore = pointsPerCorrect * questions.length;
  const [passingScore, setPassingScore] = useState<number>(() => {
    if (initialData?.passingScore !== undefined) return initialData.passingScore;
    return Math.max(1, Math.ceil(totalMaxScore * 0.7));
  });

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Authoring: Draft aliases input per question
  const [aliasDrafts, setAliasDrafts] = useState<Record<string, string>>({});

  // Learner Preview State
  const [activePageIndex, setActivePageIndex] = useState<number>(0); // for Traditional
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0); // for Modified
  const [userSelections, setUserSelections] = useState<Record<string, boolean>>({}); // { [qId]: boolean }
  const [userReplacements, setUserReplacements] = useState<Record<string, string>>({}); // { [qId]: string }
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(retries);

  const [validationResult, setValidationResult] = useState<{
    checked: boolean;
    score: number;
    maxScore: number;
    correctCount: number;
    mistakeCount: number;
    isPassed: boolean;
    isFailed: boolean;
    itemResults: Record<string, { isCorrect: boolean; feedback: string }>;
  } | null>(null);

  useEffect(() => {
    if (initialData) {
      setActivityTitle(initialData.prompt || 'Renewable Energy Truth & Verification Assessment');
      setInstructions(initialData.instructions || 'Evaluate each statement and select whether it is True or False.');
      if (initialData.data?.trueFalse) {
        setTfMode(initialData.data.trueFalse.mode || 'traditional');
        if (initialData.data.trueFalse.questions && initialData.data.trueFalse.questions.length > 0) {
          setQuestions(initialData.data.trueFalse.questions);
        }
        if (initialData.data.trueFalse.displayPerPage) {
          setDisplayPerPage(initialData.data.trueFalse.displayPerPage);
        }
      }
      setPointsPerCorrect(initialData.pointsPerCorrect ?? 2);
      setDeductionPerMistake(initialData.deductionPerMistake ?? 0);
      setRetries(initialData.retries ?? 2);
      const calculatedMax = (initialData.pointsPerCorrect ?? 2) * (initialData.data?.trueFalse?.questions?.length || defaultTraditionalQuestions.length);
      setPassingScore(initialData.passingScore ?? Math.max(1, Math.ceil(calculatedMax * 0.7)));
    }
  }, [initialData]);

  // Undo & Redo History State
  const currentSnapshot = useMemo(() => ({
    activityTitle,
    instructions,
    tfMode,
    questions,
    displayPerPage,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
  }), [
    activityTitle,
    instructions,
    tfMode,
    questions,
    displayPerPage,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
  ]);

  const applySnapshot = useCallback((state: typeof currentSnapshot) => {
    if (state.activityTitle !== undefined) setActivityTitle(state.activityTitle);
    if (state.instructions !== undefined) setInstructions(state.instructions);
    if (state.tfMode !== undefined) setTfMode(state.tfMode);
    if (state.questions !== undefined) setQuestions(state.questions);
    if (state.displayPerPage !== undefined) setDisplayPerPage(state.displayPerPage);
    if (state.pointsPerCorrect !== undefined) setPointsPerCorrect(state.pointsPerCorrect);
    if (state.passingScore !== undefined) setPassingScore(state.passingScore);
    if (state.deductionPerMistake !== undefined) setDeductionPerMistake(state.deductionPerMistake);
    if (state.retries !== undefined) setRetries(state.retries);
  }, []);

  const { canUndo, canRedo, handleUndo, handleRedo } = useQuizUndoRedo(currentSnapshot, applySnapshot);

  // Mode change handler
  const handleSwitchMode = (mode: 'traditional' | 'modified') => {
    setTfMode(mode);
    setValidationResult(null);
    if (mode === 'modified' && questions.every(q => !q.underlinedWord)) {
      setQuestions(defaultModifiedQuestions);
    } else if (mode === 'traditional' && questions === defaultModifiedQuestions) {
      setQuestions(defaultTraditionalQuestions);
    }
  };

  const handleEnterPreview = () => {
    setViewMode('preview');
    setActivePageIndex(0);
    setActiveQuestionIndex(0);
    setUserSelections({});
    setUserReplacements({});
    setValidationResult(null);
    setAttemptsRemaining(retries);
  };

  // Authoring: Add / Remove / Modify Questions
  const handleAddQuestion = () => {
    const newQ: TrueFalseQuestionItem = {
      id: `tf_q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      statement: `${questions.length + 1}. Enter your statement prompt here:`,
      isTrue: true,
      underlinedWord: '',
      replacementAnswer: '',
      acceptableAliases: [],
      explanation: '',
    };
    setQuestions(prev => [...prev, newQ]);
  };

  const handleRemoveQuestion = (id: string) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  // Bulk Statements Modal State
  const [bulkModal, setBulkModal] = useState<{ isOpen: boolean; rawText: string; mode: 'replace' | 'append' } | null>(null);

  const handleStatementPaste = (qId: string, qIndex: number, e: ClipboardEvent<HTMLInputElement>) => {
    const pasteText = e.clipboardData.getData('text');
    if (!pasteText) return;

    const isMultiLine = pasteText.includes('\n');
    const isNumbered = /^(?:(?:question|q|item)\s*\d+|\d+[\.\)\:\-]\s+)/i.test(pasteText.trim());

    if (isMultiLine || isNumbered) {
      const parsedList = parseTrueFalseQuestions(pasteText);
      if (parsedList.length === 0) return;

      e.preventDefault();

      if (parsedList.length === 1) {
        const single = parsedList[0];
        setQuestions(prev => prev.map(q => {
          if (q.id !== qId) return q;
          return {
            ...q,
            statement: single.statement,
            isTrue: single.isTrue,
            underlinedWord: single.underlinedWord || q.underlinedWord || '',
            replacementAnswer: single.replacementAnswer || q.replacementAnswer || '',
            acceptableAliases: single.acceptableAliases || q.acceptableAliases || [],
            explanation: single.explanation || q.explanation || '',
          };
        }));
      } else {
        const createdItems: TrueFalseQuestionItem[] = parsedList.map((pq, idx) => ({
          id: `tf_q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
          statement: pq.statement,
          isTrue: pq.isTrue,
          underlinedWord: pq.underlinedWord || '',
          replacementAnswer: pq.replacementAnswer || '',
          acceptableAliases: pq.acceptableAliases || [],
          explanation: pq.explanation || '',
        }));

        setQuestions(prev => {
          if (prev.length === 1 && (prev[0].statement.includes('Enter statement') || !prev[0].statement.trim())) {
            return createdItems;
          }
          const next = [...prev];
          next.splice(qIndex, 1, ...createdItems);
          return next;
        });
      }
    }
  };

  const handleApplyBulkQuestions = (rawText: string, mode: 'replace' | 'append') => {
    const parsedList = parseTrueFalseQuestions(rawText);
    if (parsedList.length === 0) return;

    const createdItems: TrueFalseQuestionItem[] = parsedList.map((pq, idx) => ({
      id: `tf_q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      statement: pq.statement,
      isTrue: pq.isTrue,
      underlinedWord: pq.underlinedWord || '',
      replacementAnswer: pq.replacementAnswer || '',
      acceptableAliases: pq.acceptableAliases || [],
      explanation: pq.explanation || '',
    }));

    if (mode === 'replace') {
      setQuestions(createdItems);
    } else {
      setQuestions(prev => [...prev, ...createdItems]);
    }
    setBulkModal(null);
  };

  const handleUpdateQuestion = (id: string, field: keyof TrueFalseQuestionItem, value: any) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleAddAlias = (questionId: string) => {
    const draft = (aliasDrafts[questionId] || '').trim();
    if (!draft) return;
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId) return q;
      const aliases = q.acceptableAliases || [];
      if (aliases.some(a => a.toLowerCase() === draft.toLowerCase())) return q;
      return { ...q, acceptableAliases: [...aliases, draft] };
    }));
    setAliasDrafts(prev => ({ ...prev, [questionId]: '' }));
  };

  const handleRemoveAlias = (questionId: string, aliasIndex: number) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId) return q;
      return { ...q, acceptableAliases: (q.acceptableAliases || []).filter((_, i) => i !== aliasIndex) };
    }));
  };

  // Helper to highlight underlined word in a statement string
  const renderStatementWithUnderline = (statement: string, underlinedWord?: string) => {
    if (!underlinedWord || !underlinedWord.trim()) {
      return <span>{statement}</span>;
    }

    const regex = new RegExp(`(${underlinedWord.trim()})`, 'gi');
    const parts = statement.split(regex);

    return (
      <span>
        {parts.map((part, i) => {
          if (part.toLowerCase() === underlinedWord.trim().toLowerCase()) {
            return (
              <span
                key={i}
                className="underline decoration-blue-500 decoration-2 font-bold bg-blue-50/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded"
              >
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  // Evaluation
  const normalize = (str: string) => (str || '').trim().toLowerCase();

  const handleCheckAllAnswers = () => {
    let earnedPoints = 0;
    let correctCount = 0;
    let mistakeCount = 0;
    const itemResults: Record<string, { isCorrect: boolean; feedback: string }> = {};

    questions.forEach(q => {
      const userChoice = userSelections[q.id];
      let isItemCorrect = false;
      let feedbackMsg = '';

      if (tfMode === 'traditional') {
        if (userChoice !== undefined && userChoice === q.isTrue) {
          isItemCorrect = true;
          feedbackMsg = `Correct! (${q.isTrue ? 'True' : 'False'})`;
        } else {
          isItemCorrect = false;
          feedbackMsg = `Incorrect. The statement is ${q.isTrue ? 'True' : 'False'}.`;
        }
      } else {
        // Modified True/False
        if (q.isTrue) {
          if (userChoice === true) {
            isItemCorrect = true;
            feedbackMsg = 'Correct! The statement is True.';
          } else {
            isItemCorrect = false;
            feedbackMsg = 'Incorrect. This statement is True.';
          }
        } else {
          // Statement is False -> Student must pick False AND provide replacement
          if (userChoice === false) {
            const userReplacement = normalize(userReplacements[q.id] || '');
            const expected = normalize(q.replacementAnswer || '');
            const aliases = (q.acceptableAliases || []).map(normalize);

            const isWordMatch = userReplacement !== '' && (userReplacement === expected || aliases.includes(userReplacement));

            if (isWordMatch) {
              isItemCorrect = true;
              feedbackMsg = `Correct! False — replacement word: "${q.replacementAnswer}".`;
            } else {
              isItemCorrect = false;
              feedbackMsg = `Incorrect replacement. Expected: "${q.replacementAnswer || 'Correct word'}".`;
            }
          } else {
            isItemCorrect = false;
            feedbackMsg = `Incorrect. The statement is False. Replacement: "${q.replacementAnswer || 'Correct word'}".`;
          }
        }
      }

      if (isItemCorrect) {
        correctCount += 1;
        earnedPoints += pointsPerCorrect;
      } else {
        mistakeCount += 1;
        if (pointsPerCorrect > 0 && deductionPerMistake > 0) {
          earnedPoints = Math.max(0, earnedPoints - deductionPerMistake);
        }
      }

      itemResults[q.id] = {
        isCorrect: isItemCorrect,
        feedback: feedbackMsg,
      };
    });

    const isGradedTest = pointsPerCorrect > 0;
    const finalScore = isGradedTest ? Math.max(0, earnedPoints) : 0;
    const isPassed = !isGradedTest || finalScore >= passingScore;

    setValidationResult({
      checked: true,
      score: finalScore,
      maxScore: totalMaxScore,
      correctCount,
      mistakeCount,
      isPassed,
      isFailed: isGradedTest && !isPassed,
      itemResults,
    });

    if (retries > 0 && attemptsRemaining > 0) {
      setAttemptsRemaining(prev => prev - 1);
    }

    scoreService.recordQuizScore({
      courseId: 'proj_sample_01',
      quizId: initialData?.id || 'quiz_tf_01',
      quizTitle: activityTitle || 'True or False Assessment',
      quizType: 'True or False',
      score: finalScore,
      maxScore: totalMaxScore,
      correctCount,
      mistakeCount,
      attempts: 1,
    });
  };

  const handleSaveToCourse = () => {
    const activity: QuizActivity = {
      id: initialData?.id || `quiz_tf_${Date.now()}`,
      name: activityTitle || 'True or False Activity',
      type: 'True or False',
      prompt: activityTitle,
      instructions,
      pointsPerCorrect,
      deductionPerMistake,
      retries,
      isGraded: pointsPerCorrect > 0,
      passingScore: pointsPerCorrect > 0 ? passingScore : undefined,
      data: {
        trueFalse: {
          mode: tfMode,
          displayPerPage: tfMode === 'traditional' ? displayPerPage : 1,
          questions,
        },
      },
      totalPoints: totalMaxScore,
      lastModified: Date.now(),
    };

    onSaveToCourse?.(activity);
    setSaveSuccessMessage('Activity saved to Course Editor!');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Traditional Pagination Slices
  const totalTraditionalPages = Math.ceil(questions.length / displayPerPage);
  const currentTraditionalSlice = questions.slice(activePageIndex * displayPerPage, (activePageIndex + 1) * displayPerPage);

  // Modified Current Question
  const currentModifiedQuestion = questions[activeQuestionIndex] || questions[0];

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-200 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <ToggleLeft size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Question Type
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                True or False ({tfMode === 'traditional' ? 'Traditional' : 'Modified True/False'})
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {activityTitle || 'Untitled True or False Assessment'}
            </h2>
          </div>
        </div>

        {/* View Toggle, Undo/Redo & Save */}
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
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
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
          {/* Format Mode Selector: Traditional vs Modified */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Select True/False Format
                </span>
                <p className="text-xs text-slate-500">
                  Choose between standard True/False evaluation or Modified True/False with replacement answer correction.
                </p>
              </div>

              {/* Mode Switcher Pill */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('traditional')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${tfMode === 'traditional'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                >
                  <CheckSquare size={14} />
                  <span>Traditional True/False</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchMode('modified')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${tfMode === 'modified'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                >
                  <Sparkles size={14} />
                  <span>Modified True/False</span>
                </button>
              </div>
            </div>

            {/* Assessment Meta Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Assessment Title
                </label>
                <input
                  type="text"
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="e.g. Fundamental Concepts True or False"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Student Instructions
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Choose True or False for each statement below."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Configuration Row: Pagination (for Traditional) and Add Question */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              {tfMode === 'traditional' ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
                    <Layers size={15} className="text-blue-600" />
                    <span>Display on Learner Preview:</span>
                  </span>

                  <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 gap-0.5">
                    <button
                      type="button"
                      onClick={() => setDisplayPerPage(1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${displayPerPage === 1 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                      1 Question / Page
                    </button>

                    <button
                      type="button"
                      onClick={() => setDisplayPerPage(5)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${displayPerPage === 5 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                      5 Questions / Page
                    </button>

                    <button
                      type="button"
                      onClick={() => setDisplayPerPage(10)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${displayPerPage === 10 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                      10 Questions / Page
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                  <span>Modified True/False presents 1 question per page for interactive word correction.</span>
                </div>
              )}

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {questions.length} Questions Configured
                </span>

                <button
                  type="button"
                  onClick={() => setBulkModal({ isOpen: true, rawText: '', mode: 'append' })}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="Paste multiple True/False questions"
                >
                  <ClipboardList size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>Bulk Paste</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            {/* Scoring & Rules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Award size={15} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Points per Question</span>
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
                  {pointsPerCorrect > 0 ? `Total: ${totalMaxScore} pts (${questions.length} items)` : '0 pts = Non-graded practice'}
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
                    max={totalMaxScore || 1}
                    disabled={pointsPerCorrect === 0}
                    value={pointsPerCorrect > 0 ? passingScore : ''}
                    onChange={(e) => setPassingScore(Math.max(1, Math.min(totalMaxScore, parseInt(e.target.value, 10) || 1)))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:bg-slate-100 disabled:dark:bg-slate-950 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
                    placeholder={pointsPerCorrect > 0 ? 'e.g. 4' : 'N/A (Non-graded)'}
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
                  {pointsPerCorrect > 0 ? 'Subtracted on incorrect evaluation' : 'No deductions on non-graded'}
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

          {/* Construction List of Questions */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Questions ({questions.length} total • {tfMode === 'traditional' ? 'Traditional' : 'Modified True/False'})
            </h4>

            {questions.map((q, qIndex) => (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4"
              >
                {/* Card Header & Truth Radio */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg shrink-0">
                    Question #{qIndex + 1}
                  </span>

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Correct Key:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuestion(q.id, 'isTrue', true)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${q.isTrue
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                      >
                        TRUE
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateQuestion(q.id, 'isTrue', false)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${!q.isTrue
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                      >
                        FALSE
                      </button>
                    </div>

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-lg cursor-pointer transition-colors ml-2"
                        title="Remove question"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Statement Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Statement Text
                    </label>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      💡 Paste numbered statements (1., 2., 3.) directly here
                    </span>
                  </div>
                  <input
                    type="text"
                    value={q.statement}
                    onChange={(e) => handleUpdateQuestion(q.id, 'statement', e.target.value)}
                    onPaste={(e) => handleStatementPaste(q.id, qIndex, e)}
                    placeholder="Enter the full statement text..."
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                  />
                </div>

                {/* Modified Mode Configuration */}
                {tfMode === 'modified' && (
                  <div className={`p-4 rounded-xl space-y-3.5 border ${
                    !q.isTrue 
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50' 
                      : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${!q.isTrue ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                        {q.isTrue ? 'Modified True Statement Configuration:' : 'Modified False Statement Configuration:'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {q.isTrue 
                          ? '(Specify which key word or phrase in the true statement to underline)' 
                          : '(Specify which word to underline and what the correct replacement word is)'}
                      </span>
                    </div>

                    <div className={`grid grid-cols-1 ${!q.isTrue ? 'md:grid-cols-2' : ''} gap-4`}>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Word in Statement to Underline
                        </label>
                        <input
                          type="text"
                          value={q.underlinedWord || ''}
                          onChange={(e) => handleUpdateQuestion(q.id, 'underlinedWord', e.target.value)}
                          placeholder={q.isTrue ? "e.g. photovoltaic" : "e.g. boilers"}
                          className={`w-full px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-hidden focus:ring-2 ${
                            !q.isTrue 
                              ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-500' 
                              : 'border-emerald-300 dark:border-emerald-800 focus:ring-emerald-500'
                          }`}
                        />
                      </div>

                      {!q.isTrue && (
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Correct Replacement Word (Canonical Answer)
                          </label>
                          <input
                            type="text"
                            value={q.replacementAnswer || ''}
                            onChange={(e) => handleUpdateQuestion(q.id, 'replacementAnswer', e.target.value)}
                            placeholder="e.g. penstocks"
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Statement Preview with Underline */}
                    {q.underlinedWord && (
                      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Student Preview (Underlined Statement):
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 font-medium">
                          {renderStatementWithUnderline(q.statement, q.underlinedWord)}
                        </p>
                      </div>
                    )}

                    {/* Acceptable Synonyms (Only for False statements that require replacement input) */}
                    {!q.isTrue && (
                      <div className="space-y-2 pt-1">
                        <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <Tag size={13} className="text-blue-500" />
                          <span>Acceptable Alternate Replacement Spellings / Aliases:</span>
                        </label>

                        <div className="flex flex-wrap items-center gap-2">
                          {(q.acceptableAliases || []).map((alias, aIdx) => (
                            <span key={aIdx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              <span>{alias}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveAlias(q.id, aIdx)}
                                className="text-slate-400 hover:text-rose-500 cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}

                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={aliasDrafts[q.id] || ''}
                              onChange={(e) => setAliasDrafts(prev => ({ ...prev, [q.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAlias(q.id))}
                              placeholder="Add synonym (Enter)..."
                              className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-hidden w-40"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddAlias(q.id)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Explanation (Shown during review / feedback, optional)
                  </label>
                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) => handleUpdateQuestion(q.id, 'explanation', e.target.value)}
                    placeholder="e.g. Explaining the factual validity of the statement... (Optional)"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. LEARNER PREVIEW */}
      {viewMode === 'preview' && (
        <div className="space-y-6">
          <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <ToggleLeft size={16} className="text-blue-600 dark:text-blue-400" />
                <span>{instructions}</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {tfMode === 'traditional'
                  ? `Showing ${displayPerPage} questions per page. Select True or False for each statement.`
                  : 'Modified True/False: Select True or False. If False, enter the replacement word for the underlined term.'}
              </p>
            </div>

            <div className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 shadow-2xs">
              {questions.length} Questions • {totalMaxScore} Total Points
            </div>
          </div>

          {/* ========================================================================= */}
          {/* A. TRADITIONAL LEARNER PREVIEW (1, 5, or 10 per page)                    */}
          {/* ========================================================================= */}
          {tfMode === 'traditional' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Stepper if multi-page */}
              {totalTraditionalPages > 1 && (
                <div className="flex items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalTraditionalPages }).map((_, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setActivePageIndex(pIdx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activePageIndex === pIdx
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                      >
                        Page {pIdx + 1}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs font-bold text-slate-500 px-2 shrink-0">
                    Page {activePageIndex + 1} of {totalTraditionalPages}
                  </span>
                </div>
              )}

              {/* Questions Slice */}
              <div className="space-y-4">
                {currentTraditionalSlice.map((q, localIdx) => {
                  const globalIdx = activePageIndex * displayPerPage + localIdx;
                  const userPick = userSelections[q.id];
                  const checked = validationResult?.checked;
                  const result = validationResult?.itemResults?.[q.id];

                  return (
                    <div
                      key={q.id}
                      className={`bg-white dark:bg-slate-900 border-2 rounded-2xl p-6 shadow-sm space-y-4 transition-all ${checked
                        ? result?.isCorrect
                          ? 'border-emerald-500/70 bg-emerald-50/40 dark:bg-emerald-950/30'
                          : 'border-rose-500/70 bg-rose-50/40 dark:bg-rose-950/30'
                        : 'border-slate-200 dark:border-slate-800'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            Question #{globalIdx + 1}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                            <MathRenderer text={q.statement} />
                          </h3>
                        </div>

                        {checked && (
                          result?.isCorrect
                            ? <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 shrink-0"><CheckCircle2 size={16} /> Correct</span>
                            : <span className="flex items-center gap-1 text-xs font-bold text-rose-600 shrink-0"><AlertCircle size={16} /> Incorrect</span>
                        )}
                      </div>

                      {/* True / False Buttons */}
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          disabled={checked}
                          onClick={() => setUserSelections(prev => ({ ...prev, [q.id]: true }))}
                          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer ${userPick === true
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-4 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                            }`}
                        >
                          TRUE
                        </button>

                        <button
                          type="button"
                          disabled={checked}
                          onClick={() => setUserSelections(prev => ({ ...prev, [q.id]: false }))}
                          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer ${userPick === false
                            ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-4 ring-rose-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-rose-400'
                            }`}
                        >
                          FALSE
                        </button>
                      </div>

                      {checked && (
                        <div className="text-xs space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <p className={`font-semibold ${result?.isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                            {result?.feedback}
                          </p>
                          {q.explanation && (
                            <p className="text-slate-500 dark:text-slate-400">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Prev / Next Page buttons */}
              {totalTraditionalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={activePageIndex === 0}
                    onClick={() => setActivePageIndex(prev => prev - 1)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 disabled:opacity-30 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <ChevronLeft size={15} />
                    <span>Previous Page</span>
                  </button>

                  <button
                    type="button"
                    disabled={activePageIndex === totalTraditionalPages - 1}
                    onClick={() => setActivePageIndex(prev => prev + 1)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 disabled:opacity-30 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <span>Next Page</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* B. MODIFIED LEARNER PREVIEW (Always 1 Question per Page)                  */}
          {/* ========================================================================= */}
          {tfMode === 'modified' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Stepper / Tabs for Questions */}
              <div className="flex items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                <div className="flex items-center gap-1.5">
                  {questions.map((q, idx) => {
                    const isAnswered = userSelections[q.id] !== undefined;
                    const isActive = activeQuestionIndex === idx;
                    const isChecked = validationResult?.checked;
                    const isCorrect = validationResult?.itemResults?.[q.id]?.isCorrect;

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setActiveQuestionIndex(idx)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${isChecked
                          ? isCorrect
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 text-white'
                          : isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isAnswered
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <span className="text-xs font-bold text-slate-500 px-2 shrink-0">
                  Question {activeQuestionIndex + 1} of {questions.length}
                </span>
              </div>

              {/* Single Modified Question Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-150">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Modified True/False Question #{activeQuestionIndex + 1}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                    {renderStatementWithUnderline(currentModifiedQuestion.statement, currentModifiedQuestion.underlinedWord)}
                  </h3>
                </div>

                {/* True / False Buttons */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    disabled={validationResult?.checked}
                    onClick={() => setUserSelections(prev => ({ ...prev, [currentModifiedQuestion.id]: true }))}
                    className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer ${userSelections[currentModifiedQuestion.id] === true
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-4 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                      }`}
                  >
                    TRUE
                  </button>

                  <button
                    type="button"
                    disabled={validationResult?.checked}
                    onClick={() => setUserSelections(prev => ({ ...prev, [currentModifiedQuestion.id]: false }))}
                    className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer ${userSelections[currentModifiedQuestion.id] === false
                      ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-4 ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-rose-400'
                      }`}
                  >
                    FALSE
                  </button>
                </div>

                {/* If student selected FALSE -> Immediate Replacement Word Box */}
                {userSelections[currentModifiedQuestion.id] === false && (
                  <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 rounded-xl space-y-2 animate-in fade-in zoom-in-95 duration-150">
                    <label className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                      <Type size={15} className="text-amber-600" />
                      <span>The statement is False. What word/phrase replaces the underlined word to make the statement true?</span>
                    </label>
                    <input
                      type="text"
                      disabled={validationResult?.checked}
                      value={userReplacements[currentModifiedQuestion.id] || ''}
                      onChange={(e) => setUserReplacements(prev => ({ ...prev, [currentModifiedQuestion.id]: e.target.value }))}
                      placeholder="Type correct replacement word here..."
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                {/* Explanation feedback on check */}
                {validationResult?.checked && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1">
                    <p className={`font-semibold ${validationResult.itemResults[currentModifiedQuestion.id]?.isCorrect
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-rose-700 dark:text-rose-300'
                      }`}>
                      {validationResult.itemResults[currentModifiedQuestion.id]?.feedback}
                    </p>
                    {currentModifiedQuestion.explanation && (
                      <p className="text-slate-500 dark:text-slate-400 font-normal">
                        {currentModifiedQuestion.explanation}
                      </p>
                    )}
                  </div>
                )}

                {/* Nav buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={activeQuestionIndex === 0}
                    onClick={() => setActiveQuestionIndex(prev => prev - 1)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 disabled:opacity-30 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <ChevronLeft size={15} />
                    <span>Previous Question</span>
                  </button>

                  <button
                    type="button"
                    disabled={activeQuestionIndex === questions.length - 1}
                    onClick={() => setActiveQuestionIndex(prev => prev + 1)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 disabled:opacity-30 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <span>Next Question</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Validation Footer */}
          <div className={`bg-white dark:bg-slate-900 border ${validationResult?.isFailed
            ? 'border-rose-300 ring-2 ring-rose-500/20'
            : validationResult?.isPassed && pointsPerCorrect > 0
              ? 'border-emerald-300 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800'
            } rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-3xl mx-auto`}>
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
                      {validationResult.correctCount} of {questions.length} correct answers
                      {pointsPerCorrect > 0 && ` • Passing requirement: ${passingScore} pts`}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {Object.keys(userSelections).length} of {questions.length} questions answered.
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
                  <span>Repeat Assessment</span>
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
                  onClick={handleCheckAllAnswers}
                  disabled={Object.keys(userSelections).length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Check Answers</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Questions Modal */}
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
                    Bulk Paste True or False Questions
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Paste numbered statements or lines. Each number or line will become its own question.
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
                  Paste Statements Text:
                </label>
                {bulkModal.rawText.trim() && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    Detected {parseTrueFalseQuestions(bulkModal.rawText).length} questions
                  </span>
                )}
              </div>
              <textarea
                rows={10}
                value={bulkModal.rawText}
                onChange={(e) => setBulkModal(prev => prev ? { ...prev, rawText: e.target.value } : null)}
                placeholder={`1. The Catholic Church held supreme religious and political authority during the Medieval period. - True\n2. Feudalism was solely a modern industrial economic system. - False\n3. The Black Death decimated millions of people across Europe in the 14th century. - True`}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden leading-relaxed"
                autoFocus
              />
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-blue-500" />
                  <span>Smart Formatting Support:</span>
                </div>
                <p>• Automatically parses question numbers (<code className="text-blue-600 dark:text-blue-400 font-mono">1.</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">1)</code>, bullets, or plain lines).</p>
                <p>• Automatically detects truth indicators like <code className="text-emerald-600 dark:text-emerald-400 font-mono">- True</code>, <code className="text-rose-600 dark:text-rose-400 font-mono">(False)</code>, <code className="text-emerald-600 dark:text-emerald-400 font-mono">- Tama</code>, <code className="text-rose-600 dark:text-rose-400 font-mono">(Mali)</code>.</p>
                <p>• For modified True/False, mark underlined words with <code className="text-blue-600 dark:text-blue-400 font-mono">_word_</code> or <code className="text-blue-600 dark:text-blue-400 font-mono">*word*</code> and replacement answers with <code className="text-blue-600 dark:text-blue-400 font-mono">-&gt; replacement</code>.</p>
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
                  disabled={!bulkModal.rawText.trim() || parseTrueFalseQuestions(bulkModal.rawText).length === 0}
                  onClick={() => handleApplyBulkQuestions(bulkModal.rawText, bulkModal.mode)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Import {parseTrueFalseQuestions(bulkModal.rawText).length} Questions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
