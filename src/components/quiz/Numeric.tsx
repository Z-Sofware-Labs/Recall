import React, { useState, useEffect, useMemo, useCallback, ChangeEvent } from 'react';
import {
  Hash, CheckCircle2, AlertCircle,
  RotateCcw, Eye, Edit3, Save, X, Check,
  Plus, Trash2, ChevronLeft, ChevronRight,
  Sparkles, Undo2, Redo2, HelpCircle, Award, MinusCircle, Layers,
  Image as ImageIcon, Maximize2
} from 'lucide-react';
import { scoreService } from '../../services/scoreService';
import { NumericQuestionItem, NumericActivityData, QuizActivity } from '../../types/quiz';
import { useQuizUndoRedo } from '../../hooks/useQuizUndoRedo';
import { QuizUndoRedoButtons } from './QuizUndoRedoButtons';
import { evaluateMathEquivalence, evaluateNumericAnswer } from '../../utils/mathEvaluator';
import { MathRenderer } from './MathRenderer';
import { downloadImageAsDataUrl } from '../../utils/imageUtils';

const defaultQuestions: NumericQuestionItem[] = [
  {
    id: 'num_q_1',
    questionPrompt: 'Solve for x: 2x - 3 = 5',
    correctAnswer: 'x = 4',
    alternativeAnswers: [],
    explanation: '',
  },
];

interface NumericProps {
  initialData?: QuizActivity | null;
  onBack?: () => void;
  onSaveToCourse?: (activity: QuizActivity) => void;
}

const MATH_SYMBOLS = [
  { label: '√x', value: 'sqrt(' },
  { label: 'x²', value: '^2' },
  { label: 'x^y', value: '^' },
  { label: 'π', value: 'π' },
  { label: 'θ', value: 'θ' },
  { label: 'α', value: 'α' },
  { label: 'β', value: 'β' },
  { label: 'γ', value: 'γ' },
  { label: '±', value: '±' },
  { label: '≠', value: '≠' },
  { label: '≈', value: '≈' },
  { label: '×', value: '*' },
  { label: '÷', value: '/' },
  { label: '(', value: '(' },
  { label: ')', value: ')' },
  { label: 'x', value: 'x' },
  { label: 'y', value: 'y' }
];

function MathGraphicalPreview({ text }: { text: string }) {
  if (!text.trim()) return null;

  return (
    <div className="p-2.5 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-3xs">
      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 shrink-0">Live Equation:</span>
      <div className="bg-white dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-150 dark:border-slate-850 flex items-center justify-center min-h-[38px] select-none text-slate-900 dark:text-white">
        <MathRenderer text={text} />
      </div>
    </div>
  );
}

function MathFormulaToolbar({
  isOpen,
  onClose,
  onInsert,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (value: string) => void;
}) {
  const [numVal, setNumVal] = useState('');
  const [denVal, setDenVal] = useState('');
  const [supBase, setSupBase] = useState('');
  const [supExp, setSupExp] = useState('');
  const [subBase, setSubBase] = useState('');
  const [subExp, setSubExp] = useState('');

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 sm:hidden animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 pb-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200 sm:animate-in sm:fade-in sm:slide-in-from-top-2 sm:duration-150 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[580px] sm:max-w-[calc(100vw-3rem)] sm:rounded-2xl sm:border sm:max-h-none sm:overflow-visible sm:origin-top-right sm:pb-4">
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 mb-2 sm:hidden" />

        {/* Title */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles size={13} className="text-blue-500" />
            Formula & Math Symbols Toolbar
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer rounded-md transition-colors"
          >
            <X size={14} />
          </button>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Math Symbols */}
        <div className="space-y-2">
          <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Math Symbols
          </span>
          <div className="grid grid-cols-5 gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            {MATH_SYMBOLS.map((sym) => (
              <button
                key={sym.label}
                type="button"
                onClick={() => onInsert(sym.value)}
                className="py-2 bg-white hover:bg-blue-600 dark:bg-slate-900 dark:hover:bg-blue-600 border border-slate-200 dark:border-slate-800 text-slate-800 hover:text-white dark:text-slate-200 dark:hover:text-white rounded-lg text-xs font-mono font-black transition-all cursor-pointer shadow-3xs"
              >
                {sym.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Fraction and Scripts */}
        <div className="space-y-3.5 md:border-l md:border-slate-100 md:dark:border-slate-800 md:pl-4">
          {/* Graphical Fraction Builder */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Fraction Builder
            </span>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col items-center gap-1 flex-1 max-w-[120px]">
                <input
                  type="text"
                  placeholder="Num"
                  value={numVal}
                  onChange={(e) => setNumVal(e.target.value)}
                  className="w-full text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                />
                <div className="w-full border-b border-slate-300 dark:border-slate-650" />
                <input
                  type="text"
                  placeholder="Den"
                  value={denVal}
                  onChange={(e) => setDenVal(e.target.value)}
                  className="w-full text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                />
              </div>

              <button
                type="button"
                disabled={!numVal.trim() || !denVal.trim()}
                onClick={() => {
                  onInsert(`(${numVal})/(${denVal})`);
                  setNumVal('');
                  setDenVal('');
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center"
              >
                Insert Fraction
              </button>
            </div>
          </div>

          {/* Script Builders Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Superscript */}
            <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Power (x^y)
              </span>
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Base"
                  value={supBase}
                  onChange={(e) => setSupBase(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                />
                <input
                  type="text"
                  placeholder="Power"
                  value={supExp}
                  onChange={(e) => setSupExp(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                />
              </div>
              <button
                type="button"
                disabled={!supBase.trim() || !supExp.trim()}
                onClick={() => {
                  onInsert(`${supBase}^(${supExp})`);
                  setSupBase('');
                  setSupExp('');
                }}
                className="w-full py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer"
              >
                Insert Power
              </button>
            </div>

            {/* Subscript */}
            <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Subscript (x_y)
              </span>
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Base"
                  value={subBase}
                  onChange={(e) => setSubBase(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                />
                <input
                  type="text"
                  placeholder="Sub"
                  value={subExp}
                  onChange={(e) => setSubExp(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                />
              </div>
              <button
                type="button"
                disabled={!subBase.trim() || !subExp.trim()}
                onClick={() => {
                  onInsert(`${subBase}_(${subExp})`);
                  setSubBase('');
                  setSubExp('');
                }}
                className="w-full py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer"
              >
                Insert Sub
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

export default function Numeric({ initialData, onBack, onSaveToCourse }: NumericProps) {
  const [viewMode, setViewMode] = useState<'author' | 'preview'>('author');

  // Title & Instructions
  const [activityTitle, setActivityTitle] = useState<string>(
    initialData?.prompt || 'Numerical Assessment'
  );
  const [instructions, setInstructions] = useState<string>(
    initialData?.instructions || 'Solve each mathematical problem below. Decimals, fractions, algebraic expressions, and equations are evaluated automatically.'
  );

  // Unlimited Questions State
  const [questions, setQuestions] = useState<NumericQuestionItem[]>(() => {
    if (initialData?.data?.numeric?.questions && initialData.data.numeric.questions.length > 0) {
      return initialData.data.numeric.questions;
    }
    return defaultQuestions;
  });

  // Display Per Page: 1 | 3 | 5
  const [displayPerPage, setDisplayPerPage] = useState<1 | 3 | 5>(() => {
    const val = initialData?.data?.numeric?.displayPerPage as any;
    return (val === 1 || val === 3 || val === 5) ? val : 1;
  });
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(
    initialData?.data?.numeric?.shuffleQuestions ?? false
  );

  // Scoring & Retries
  const [pointsPerCorrect, setPointsPerCorrect] = useState<number>(initialData?.pointsPerCorrect ?? 5);
  const [deductionPerMistake, setDeductionPerMistake] = useState<number>(initialData?.deductionPerMistake ?? 0);
  const [retries, setRetries] = useState<number>(initialData?.retries ?? 3);

  const totalMaxScore = pointsPerCorrect * questions.length;
  const [passingScore, setPassingScore] = useState<number>(() => {
    if (initialData?.passingScore !== undefined) return initialData.passingScore;
    return Math.max(1, Math.ceil(totalMaxScore * 0.7));
  });

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Math insertion target tracking
  const [focusedInputId, setFocusedInputId] = useState<string | null>(null);
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({});

  const handleInsertSymbol = (symbol: string) => {
    if (!focusedInputId) return;
    const inputEl = document.getElementById(focusedInputId) as HTMLInputElement | null;
    if (!inputEl) return;
    const start = inputEl.selectionStart ?? 0;
    const end = inputEl.selectionEnd ?? 0;
    const currentValue = inputEl.value;
    const newValue = currentValue.substring(0, start) + symbol + currentValue.substring(end);

    if (focusedInputId.startsWith('ans-input-')) {
      const qId = focusedInputId.replace('ans-input-', '');
      handleUpdateCorrectAnswer(qId, newValue);
    } else if (focusedInputId.startsWith('alt-input-')) {
      const qId = focusedInputId.replace('alt-input-', '');
      setAltDrafts(prev => ({ ...prev, [qId]: newValue }));
    } else if (focusedInputId.startsWith('prompt-input-')) {
      const qId = focusedInputId.replace('prompt-input-', '');
      handleUpdateQuestionPrompt(qId, newValue);
    } else if (focusedInputId.startsWith('preview-input-')) {
      const qId = focusedInputId.replace('preview-input-', '');
      setUserAnswers(prev => ({ ...prev, [qId]: newValue }));
    }

    setTimeout(() => {
      inputEl.focus();
      const nextPos = start + symbol.length;
      inputEl.setSelectionRange(nextPos, nextPos);
    }, 0);
  };

  // Undo & Redo History State
  const currentSnapshot = useMemo(() => ({
    activityTitle,
    instructions,
    questions,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
    displayPerPage,
    shuffleQuestions,
  }), [
    activityTitle,
    instructions,
    questions,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
    displayPerPage,
    shuffleQuestions,
  ]);

  const applySnapshot = useCallback((state: typeof currentSnapshot) => {
    if (state.activityTitle !== undefined) setActivityTitle(state.activityTitle);
    if (state.instructions !== undefined) setInstructions(state.instructions);
    if (state.questions !== undefined) setQuestions(state.questions);
    if (state.pointsPerCorrect !== undefined) setPointsPerCorrect(state.pointsPerCorrect);
    if (state.passingScore !== undefined) setPassingScore(state.passingScore);
    if (state.deductionPerMistake !== undefined) setDeductionPerMistake(state.deductionPerMistake);
    if (state.retries !== undefined) setRetries(state.retries);
    if (state.displayPerPage !== undefined) setDisplayPerPage(state.displayPerPage);
    if (state.shuffleQuestions !== undefined) setShuffleQuestions(state.shuffleQuestions);
  }, []);

  const { canUndo, canRedo, handleUndo, handleRedo } = useQuizUndoRedo(currentSnapshot, applySnapshot);

  const updateQuestionsAndPush = useCallback((newQuestions: NumericQuestionItem[]) => {
    setQuestions(newQuestions);
  }, []);

  // Question editing actions
  const handleAddQuestion = () => {
    const newQ: NumericQuestionItem = {
      id: `num_q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      questionPrompt: `Enter question prompt or equation here`,
      correctAnswer: '5',
      alternativeAnswers: [],
      explanation: '',
    };
    updateQuestionsAndPush([...questions, newQ]);
  };

  const handleUpdateQuestionPrompt = (id: string, text: string) => {
    const next = questions.map(q => q.id === id ? { ...q, questionPrompt: text } : q);
    updateQuestionsAndPush(next);
  };

  const handleUpdateCorrectAnswer = (id: string, text: string) => {
    const next = questions.map(q => q.id === id ? { ...q, correctAnswer: text } : q);
    updateQuestionsAndPush(next);
  };

  const handleAddAlternativeAnswer = (qId: string) => {
    const draft = (altDrafts[qId] || '').trim();
    if (!draft) return;
    const next = questions.map(q => {
      if (q.id !== qId) return q;
      const currentAlts = q.alternativeAnswers || (q as any).acceptableAliases || [];
      if (currentAlts.includes(draft)) return q;
      return {
        ...q,
        alternativeAnswers: [...currentAlts, draft],
        acceptableAliases: [...currentAlts, draft],
      };
    });
    updateQuestionsAndPush(next);
    setAltDrafts(prev => ({ ...prev, [qId]: '' }));
  };

  const handleRemoveAlternativeAnswer = (qId: string, index: number) => {
    const next = questions.map(q => {
      if (q.id !== qId) return q;
      const currentAlts = q.alternativeAnswers || (q as any).acceptableAliases || [];
      const updated = currentAlts.filter((_, i) => i !== index);
      return {
        ...q,
        alternativeAnswers: updated,
        acceptableAliases: updated,
      };
    });
    updateQuestionsAndPush(next);
  };

  const handleUpdateExplanation = (id: string, text: string) => {
    const next = questions.map(q => q.id === id ? { ...q, explanation: text } : q);
    updateQuestionsAndPush(next);
  };

  const handleUpdateQuestionImage = async (qId: string, imageUrl: string) => {
    const cleanUrl = imageUrl.trim();
    if (!cleanUrl) {
      const next = questions.map(q => q.id === qId ? { ...q, imageUrl: undefined } : q);
      updateQuestionsAndPush(next);
      return;
    }
    const next = questions.map(q => q.id === qId ? { ...q, imageUrl: cleanUrl } : q);
    updateQuestionsAndPush(next);
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      const dataUrl = await downloadImageAsDataUrl(cleanUrl);
      const updated = questions.map(q => q.id === qId ? { ...q, imageUrl: dataUrl } : q);
      updateQuestionsAndPush(updated);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, callback: (base64Url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const result = loadEvt.target?.result;
      if (typeof result === 'string') {
        callback(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteQuestion = (id: string) => {
    if (questions.length <= 1) {
      alert("At least one question is required.");
      return;
    }
    const next = questions.filter(q => q.id !== id);
    updateQuestionsAndPush(next);
  };

  // Bulk import support
  const [bulkModal, setBulkModal] = useState<{ isOpen: boolean; rawText: string }>({ isOpen: false, rawText: '' });

  const parsePastedNumericQuestions = (text: string): NumericQuestionItem[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: NumericQuestionItem[] = [];
    for (let i = 0; i < lines.length; i += 2) {
      const qText = lines[i];
      const ansLine = lines[i + 1] || '0';
      const parts = ansLine.split('|').map(p => p.trim()).filter(Boolean);
      const primary = parts[0] || '0';
      const alts = parts.slice(1);
      parsed.push({
        id: `num_bulk_${Date.now()}_${i}`,
        questionPrompt: qText,
        correctAnswer: primary,
        alternativeAnswers: alts,
        explanation: '',
      });
    }
    return parsed;
  };

  const handleImportBulk = () => {
    const parsed = parsePastedNumericQuestions(bulkModal.rawText);
    if (parsed.length > 0) {
      updateQuestionsAndPush([...questions, ...parsed]);
      setBulkModal({ isOpen: false, rawText: '' });
    }
  };

  // Learner preview state
  const [previewQuestions, setPreviewQuestions] = useState<NumericQuestionItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(retries);
  const [activeFormulaQId, setActiveFormulaQId] = useState<string | null>(null);
  const [activeFormulaInputId, setActiveFormulaInputId] = useState<string | null>(null);
  const [numVal, setNumVal] = useState<string>('');
  const [denVal, setDenVal] = useState<string>('');
  const [supBase, setSupBase] = useState<string>('');
  const [supExp, setSupExp] = useState<string>('');
  const [subBase, setSubBase] = useState<string>('');
  const [subExp, setSubExp] = useState<string>('');
  const [validationResult, setValidationResult] = useState<{
    checked: boolean;
    score: number;
    maxScore: number;
    passed: boolean;
    detailedResults: { questionId: string; prompt: string; userAns: string; correctAns: string; correctAnsText?: string; altAnswers?: string[]; isCorrect: boolean; explanation?: string }[];
  } | null>(null);

  // Zoom Modal state for images
  const [zoomModalImage, setZoomModalImage] = useState<{ url: string; title: string } | null>(null);

  const startPreviewMode = () => {
    let list = [...questions];
    if (shuffleQuestions) {
      list.sort(() => Math.random() - 0.5);
    }
    setPreviewQuestions(list);
    setUserAnswers({});
    setAttemptsRemaining(retries);
    setValidationResult(null);
    setActivePageIndex(0);
    setViewMode('preview');
  };

  // Paginated calculations
  const pageSize = displayPerPage;
  const totalPages = Math.ceil(previewQuestions.length / pageSize);
  const activePageQuestions = useMemo(() => {
    const start = activePageIndex * pageSize;
    return previewQuestions.slice(start, start + pageSize);
  }, [previewQuestions, activePageIndex, pageSize]);

  const handleCheckAnswers = () => {
    let score = 0;
    const detailed = previewQuestions.map(q => {
      const uAns = (userAnswers[q.id] || '').trim();
      const alts = q.alternativeAnswers || (q as any).acceptableAliases || [];
      const isCorrect = evaluateNumericAnswer(uAns, q.correctAnswer, alts, q.tolerance);
      if (isCorrect) score += pointsPerCorrect;

      const altDisplay = alts.length > 0 ? ` (or ${alts.join(', ')})` : '';

      return {
        questionId: q.id,
        prompt: q.questionPrompt,
        userAns: uAns || '(No Answer)',
        correctAns: q.correctAnswer,
        correctAnsText: q.correctAnswer + altDisplay,
        altAnswers: alts,
        isCorrect,
        explanation: q.explanation
      };
    });

    const passed = score >= passingScore;
    setValidationResult({
      checked: true,
      score,
      maxScore: totalMaxScore,
      passed,
      detailedResults: detailed
    });
    setAttemptsRemaining(prev => Math.max(0, prev - 1));
  };

  const handleRetake = () => {
    setValidationResult(null);
    setUserAnswers({});
    setActivePageIndex(0);
  };

  const handleSaveToCourse = () => {
    if (onSaveToCourse) {
      const currentQuizState: QuizActivity = {
        id: initialData?.id || `quiz_num_${Date.now()}`,
        name: activityTitle || 'Numeric Math Challenge',
        type: 'Numeric',
        prompt: activityTitle,
        instructions: instructions,
        pointsPerCorrect,
        deductionPerMistake,
        retries,
        passingScore,
        totalPoints: totalMaxScore,
        data: {
          numeric: {
            questions,
            displayPerPage,
            shuffleQuestions,
          }
        }
      };
      onSaveToCourse(currentQuizState);
      setSaveSuccessMessage('Activity saved to Course Editor!');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6 w-full pb-6 animate-in fade-in duration-200 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
            <Hash size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 shrink-0">
                Question Type
              </span>
              <span className="text-xs text-slate-400 shrink-0">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Numeric Math ({questions.length} Questions)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">
              {activityTitle || 'Untitled Numeric Math Assessment'}
            </h2>
          </div>
        </div>

        {/* Mode Toggle & Undo/Redo */}
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
              onClick={startPreviewMode}
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

      {/* 1. AUTHORING WORKSPACE */}
      {viewMode === 'author' && (
        <div className="space-y-6">
          {/* Title & Instructions Input */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Assessment Title Prompt (Optional)
                </label>
                <input
                  type="text"
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="e.g. Mathematics & Equations (Optional)"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Provide instructions for the assessment... (Optional)"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Settings & Parameters (Scoring, Display, Shuffling) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Scoring & Layout Settings
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  {pointsPerCorrect > 0 ? `Total: ${totalMaxScore} pts` : '0 pts = Non-graded practice'}
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
                    placeholder={pointsPerCorrect > 0 ? 'e.g. 4' : 'N/A'}
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
                    <MinusCircle size={15} className="text-rose-650 dark:text-rose-450" />
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
                    placeholder={pointsPerCorrect > 0 ? '0' : 'N/A'}
                  />
                  <span className="text-xs font-medium text-slate-500">pts</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {pointsPerCorrect > 0 ? 'Subtracted on wrong math solution' : 'No deductions'}
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
                <p className="text-[11px] text-slate-400 dark:text-slate-550 opacity-90">
                  {retries === 0 ? 'Unlimited retries' : `Max ${retries} attempts`}
                </p>
              </div>
            </div>

            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
                  <Layers size={15} className="text-blue-600" />
                  <span>Display on Learner Preview:</span>
                </span>

                <div className="flex flex-wrap items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setDisplayPerPage(1)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${displayPerPage === 1 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-650 dark:text-slate-400 hover:text-slate-900'
                      }`}
                  >
                    1 Question / Page
                  </button>

                  <button
                    type="button"
                    onClick={() => setDisplayPerPage(3)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${displayPerPage === 3 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-650 dark:text-slate-400 hover:text-slate-900'
                      }`}
                  >
                    3 Questions / Page
                  </button>

                  <button
                    type="button"
                    onClick={() => setDisplayPerPage(5)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${displayPerPage === 5 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-650 dark:text-slate-400 hover:text-slate-900'
                      }`}
                  >
                    5 Questions / Page
                  </button>
                </div>
              </div>

              <div className="flex flex-row items-center gap-3 shrink-0">
                <div
                  onClick={() => setShuffleQuestions(!shuffleQuestions)}
                  className={`p-2 px-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all shrink-0 ${shuffleQuestions
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                    }`}
                >
                  <Sparkles size={14} className={shuffleQuestions ? 'text-blue-600 dark:text-blue-455' : 'text-slate-450'} />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Shuffle Questions Order
                  </span>
                  <div className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${shuffleQuestions ? 'bg-blue-600 justify-end' : 'bg-slate-350 dark:bg-slate-700 justify-start'
                    }`}>
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Question Stack (Full Width, standard styling) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Math Question Items ({questions.length})
              </h3>
              <button
                onClick={() => setBulkModal({ isOpen: true, rawText: '' })}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles size={13} />
                <span>Bulk Import Questions</span>
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 relative group shadow-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg">
                      Question #{idx + 1}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Single Unified Formula Editor Button for Prompt, Primary Answer, and Alternative Answers */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            if (!focusedInputId || !focusedInputId.endsWith(q.id)) {
                              setFocusedInputId(`ans-input-${q.id}`);
                            }
                            setActiveFormulaQId(activeFormulaQId === q.id ? null : q.id);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-3xs border ${
                            activeFormulaQId === q.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          }`}
                          title="Insert Math Symbols, Fractions, Powers, or Subscripts into this question"
                        >
                          <Sparkles size={13} className={activeFormulaQId === q.id ? 'text-white' : 'text-blue-500'} />
                          <span>Insert Formula / Scripts</span>
                        </button>

                        <MathFormulaToolbar
                          isOpen={activeFormulaQId === q.id}
                          onClose={() => setActiveFormulaQId(null)}
                          onInsert={(val) => {
                            handleInsertSymbol(val);
                          }}
                        />
                      </div>

                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg cursor-pointer transition-colors"
                          title="Remove question"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Problem input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Question Prompt
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`prompt-input-${q.id}`}
                        type="text"
                        value={q.questionPrompt}
                        onFocus={() => setFocusedInputId(`prompt-input-${q.id}`)}
                        onChange={(e) => handleUpdateQuestionPrompt(q.id, e.target.value)}
                        placeholder="e.g. Solve for x: 3x - 1 = 8"
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-hidden focus:border-blue-500 font-medium"
                      />

                      {/* Question Photo Upload Button on Right */}
                      {q.imageUrl ? (
                        <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                            <img
                              src={q.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={() => handleUpdateQuestionImage(q.id, '')}
                            />
                          </div>
                          <label className="p-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer" title="Change Photo">
                            <ImageIcon size={16} />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, (url) => handleUpdateQuestionImage(q.id, url))}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuestionImage(q.id, '')}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="Remove Photo"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <label
                          className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/50 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors shrink-0 shadow-2xs"
                          title="Add Photo from computer"
                        >
                          <Plus size={14} />
                          <ImageIcon size={15} />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, (url) => handleUpdateQuestionImage(q.id, url))}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* 1. Primary Correct Answer Card */}
                  <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>Primary Correct Answer (Required)</span>
                      </label>
                    </div>

                    <input
                      id={`ans-input-${q.id}`}
                      type="text"
                      value={q.correctAnswer}
                      onFocus={() => setFocusedInputId(`ans-input-${q.id}`)}
                      onChange={(e) => handleUpdateCorrectAnswer(q.id, e.target.value)}
                      placeholder="e.g. x = 3, 3/4, y = 2x, sqrt(2), 5π"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 outline-hidden focus:border-blue-500 shadow-3xs"
                    />

                    {/* Word-style Math Formula Preview */}
                    <MathGraphicalPreview text={q.correctAnswer} />
                  </div>

                  {/* 2. Acceptable Alternative Answers Card */}
                  <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        <Plus size={14} className="text-blue-500" />
                        <span>Acceptable Alternative Answers (Optional)</span>
                      </label>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Equivalences are calculated automatically; specific alternate forms or representations can be added here
                      </span>
                    </div>

                    {/* Alternative Answer Badges with rendered equations */}
                    {(q.alternativeAnswers || (q as any).acceptableAliases || []).length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        {(q.alternativeAnswers || (q as any).acceptableAliases || []).map((alt: string, aIdx: number) => (
                          <span
                            key={aIdx}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl text-xs font-medium text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-3xs"
                          >
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400"><MathRenderer text={alt} /></span>
                            <span className="text-[10px] font-mono text-slate-400">({alt})</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAlternativeAnswer(q.id, aIdx)}
                              className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer transition-colors"
                              title="Remove alternative answer"
                            >
                              <X size={13} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Alternative Answer Input Draft + Add Button */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          id={`alt-input-${q.id}`}
                          type="text"
                          value={altDrafts[q.id] || ''}
                          onFocus={() => setFocusedInputId(`alt-input-${q.id}`)}
                          onChange={(e) => setAltDrafts(prev => ({ ...prev, [q.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddAlternativeAnswer(q.id);
                            }
                          }}
                          placeholder="Type alternative answer (e.g. 0.75, 3/4, x=4, 5π)..."
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white outline-hidden focus:border-blue-500 shadow-3xs"
                        />

                        <button
                          type="button"
                          onClick={() => handleAddAlternativeAnswer(q.id)}
                          disabled={!altDrafts[q.id]?.trim()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs shrink-0 flex items-center justify-center gap-1"
                        >
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      </div>

                      {/* Live Word-style Math Preview for Alternative Answer Draft if not empty */}
                      {altDrafts[q.id]?.trim() && (
                        <div className="pt-1">
                          <MathGraphicalPreview text={altDrafts[q.id]} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Explanation (Optional) Card */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Explanation / Solution Steps (Optional)
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => handleUpdateExplanation(q.id, e.target.value)}
                      placeholder="Why is this answer correct or steps to solve? (Optional)"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Standard Question Footer buttons */}
            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={handleAddQuestion}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer animate-in fade-in"
              >
                <Plus size={14} />
                <span>Add Question ({questions.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. LEARNER PREVIEW WORKSPACE */}
      {viewMode === 'preview' && (
        <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-md relative">
          <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold flex items-center gap-1">
                <Hash size={13} className="text-blue-500" />
                <span>{attemptsRemaining} retries left</span>
              </span>
              <span className="font-bold bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-800">
                Passing Score: {passingScore}/{totalMaxScore} pts
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{activityTitle}</h3>
            <p className="text-xs text-slate-550 dark:text-slate-400">{instructions}</p>
          </div>

          <div className="space-y-5">
            {activePageQuestions.map((q, pIdx) => {
              const globalIdx = activePageIndex * pageSize + pIdx;
              return (
                <div key={q.id} className="p-5 bg-slate-50/60 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-3">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-450 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[10px]">
                      {globalIdx + 1}
                    </span>
                    <span><MathRenderer text={q.questionPrompt} /></span>
                  </div>

                  {/* Question Image Preview in Learner View */}
                  {q.imageUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center max-h-[320px] group">
                      <img
                        src={q.imageUrl}
                        alt={q.questionPrompt}
                        className="w-full h-full max-h-[320px] object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setZoomModalImage({ url: q.imageUrl!, title: q.questionPrompt })}
                        className="absolute top-2.5 right-2.5 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-md"
                        title="Zoom image"
                      >
                        <Maximize2 size={13} />
                        <span>Expand</span>
                      </button>
                    </div>
                  )}

                  <input
                    id={`preview-input-${q.id}`}
                    type="text"
                    disabled={validationResult?.checked}
                    value={userAnswers[q.id] || ''}
                    onFocus={() => setFocusedInputId(`preview-input-${q.id}`)}
                    onChange={(e) => setUserAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Enter mathematical answer..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-blue-500 font-mono focus:ring-0 outline-hidden disabled:opacity-60"
                  />

                  {/* Word-style Math Preview in Learner Preview */}
                  <MathGraphicalPreview text={userAnswers[q.id] || ''} />

                  {/* Single formula helper button & Popover */}
                  {!validationResult?.checked && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setFocusedInputId(`preview-input-${q.id}`);
                          setActiveFormulaInputId(activeFormulaInputId === `preview-input-${q.id}` ? null : `preview-input-${q.id}`);
                          setNumVal('');
                          setDenVal('');
                          setSupBase('');
                          setSupExp('');
                          setSubBase('');
                          setSubExp('');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-xs"
                      >
                        <Sparkles size={13} className="text-blue-500" />
                        <span>Insert Symbol / Fraction / Scripts</span>
                      </button>

                      {activeFormulaInputId === `preview-input-${q.id}` && (
                        <>
                          {/* Mobile Backdrop Overlay */}
                          <div
                            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 sm:hidden animate-in fade-in duration-200"
                            onClick={() => setActiveFormulaInputId(null)}
                          />

                          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 pb-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200 sm:animate-in sm:fade-in sm:slide-in-from-top-1 sm:duration-150 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[600px] sm:max-w-[95vw] sm:rounded-2xl sm:border sm:max-h-none sm:overflow-visible sm:pb-4">
                            {/* Mobile drag handle */}
                            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 mb-2 sm:hidden" />

                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Sparkles size={13} className="text-blue-500" />
                                Formula Editor & Toolbar
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveFormulaInputId(null)}
                                className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left Column: Math Symbols */}
                              <div className="space-y-2">
                                <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                  Math Symbols
                                </span>
                                <div className="grid grid-cols-5 gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                                  {MATH_SYMBOLS.map((sym) => (
                                    <button
                                      key={sym.label}
                                      type="button"
                                      onClick={() => {
                                        setFocusedInputId(`preview-input-${q.id}`);
                                        handleInsertSymbol(sym.value);
                                      }}
                                      className="py-2 bg-white hover:bg-blue-600 dark:bg-slate-900 dark:hover:bg-blue-600 border border-slate-200 dark:border-slate-800 text-slate-800 hover:text-white dark:text-slate-200 dark:hover:text-white rounded-lg text-xs font-mono font-black transition-all cursor-pointer shadow-3xs"
                                    >
                                      {sym.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Right Column: Fraction and Scripts */}
                              <div className="space-y-4 md:border-l md:border-slate-100 md:dark:border-slate-800 md:pl-4">
                                {/* Graphical Fraction Builder */}
                                <div className="space-y-1.5">
                                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    Fraction Builder
                                  </span>
                                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[120px]">
                                      <input
                                        type="text"
                                        placeholder="Numerator"
                                        value={numVal}
                                        onChange={(e) => setNumVal(e.target.value)}
                                        className="w-full text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                                      />
                                      <div className="w-full border-b-2 border-slate-300 dark:border-slate-650" />
                                      <input
                                        type="text"
                                        placeholder="Denominator"
                                        value={denVal}
                                        onChange={(e) => setDenVal(e.target.value)}
                                        className="w-full text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      disabled={!numVal.trim() || !denVal.trim()}
                                      onClick={() => {
                                        setFocusedInputId(`preview-input-${q.id}`);
                                        handleInsertSymbol(`(${numVal})/(${denVal})`);
                                        setNumVal('');
                                        setDenVal('');
                                        setActiveFormulaInputId(null);
                                      }}
                                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center"
                                    >
                                      Insert Fraction
                                    </button>
                                  </div>
                                </div>

                                {/* Script Builders Grid */}
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  {/* Superscript */}
                                  <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                      Superscript (x^y)
                                    </span>
                                    <div className="space-y-1">
                                      <input
                                        type="text"
                                        placeholder="Base"
                                        value={supBase}
                                        onChange={(e) => setSupBase(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Power"
                                        value={supExp}
                                        onChange={(e) => setSupExp(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      disabled={!supBase.trim() || !supExp.trim()}
                                      onClick={() => {
                                        setFocusedInputId(`preview-input-${q.id}`);
                                        handleInsertSymbol(`${supBase}^(${supExp})`);
                                        setSupBase('');
                                        setSupExp('');
                                        setActiveFormulaInputId(null);
                                      }}
                                      className="w-full py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer"
                                    >
                                      Insert Power
                                    </button>
                                  </div>

                                  {/* Subscript */}
                                  <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                      Subscript (x_y)
                                    </span>
                                    <div className="space-y-1">
                                      <input
                                        type="text"
                                        placeholder="Base"
                                        value={subBase}
                                        onChange={(e) => setSubBase(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Sub"
                                        value={subExp}
                                        onChange={(e) => setSubExp(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      disabled={!subBase.trim() || !subExp.trim()}
                                      onClick={() => {
                                        setFocusedInputId(`preview-input-${q.id}`);
                                        handleInsertSymbol(`${subBase}_(${subExp})`);
                                        setSubBase('');
                                        setSubExp('');
                                        setActiveFormulaInputId(null);
                                      }}
                                      className="w-full py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer"
                                    >
                                      Insert Sub
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {validationResult?.checked && (() => {
                    const itemRes = validationResult.detailedResults.find(r => r.questionId === q.id);
                    if (!itemRes) return null;
                    return (
                      <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${itemRes.isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-400'
                        : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-400'
                        }`}>
                        {itemRes.isCorrect ? <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" /> : <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />}
                        <div className="space-y-1">
                          <p className="font-bold">{itemRes.isCorrect ? 'Correct!' : 'Incorrect'}</p>
                          <div className="text-[11px] opacity-90 flex flex-wrap items-center gap-1.5">
                            <span>Correct answer:</span>
                            <span className="font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                              <MathRenderer text={itemRes.correctAns} />
                            </span>
                            {itemRes.altAnswers && itemRes.altAnswers.length > 0 && (
                              <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                                (Also acceptable: {itemRes.altAnswers.join(', ')})
                              </span>
                            )}
                          </div>
                          {q.explanation && (
                            <p className="text-[10px] text-slate-555 dark:text-slate-400 italic mt-1 font-sans">Explanation: {q.explanation}</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Pagination Stepper */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 text-xs font-semibold text-slate-400">
              <button
                disabled={activePageIndex === 0}
                onClick={() => setActivePageIndex(p => Math.max(0, p - 1))}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 disabled:opacity-30 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={13} />
                <span>Prev Page</span>
              </button>
              <span>Page {activePageIndex + 1} of {totalPages}</span>
              <button
                disabled={activePageIndex === totalPages - 1}
                onClick={() => setActivePageIndex(p => Math.min(totalPages - 1, p + 1))}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 disabled:opacity-30 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                <span>Next Page</span>
                <ChevronRight size={13} />
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            {validationResult?.checked ? (
              <div className="flex items-center gap-3">
                <span className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full border ${validationResult.passed
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-rose-50 border-rose-300 text-rose-700'
                  }`}>
                  {validationResult.passed ? 'PASSED ✓' : 'FAILED ✗'} ({validationResult.score} / {validationResult.maxScore} pts)
                </span>
                {attemptsRemaining > 0 && (
                  <button
                    onClick={handleRetake}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Try Again ({attemptsRemaining} left)</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleCheckAnswers}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check size={14} />
                <span>Check Answers</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomModalImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setZoomModalImage(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl max-h-[90vh] overflow-hidden p-3 shadow-2xl flex flex-col items-center space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full px-2">
              <span className="text-xs font-semibold text-slate-300 truncate max-w-lg">
                {zoomModalImage.title || 'Image Preview'}
              </span>
              <button
                type="button"
                onClick={() => setZoomModalImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-auto max-h-[78vh] flex items-center justify-center rounded-xl bg-black">
              <img 
                src={zoomModalImage.url} 
                alt={zoomModalImage.title || 'Zoomed View'} 
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {bulkModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Bulk Import Mathematical Questions</h3>
              <p className="text-xs text-slate-400 mt-1">Paste your questions and solutions. Use alternating lines: first line is the prompt, second line is the correct answer key.</p>
            </div>
            <textarea
              value={bulkModal.rawText}
              onChange={(e) => setBulkModal(prev => ({ ...prev, rawText: e.target.value }))}
              placeholder="e.g.&#10;What is 1/2 + 1/4?&#10;3/4&#10;Solve for y in y - 2 = x:&#10;y = x + 2"
              rows={8}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs text-slate-700 dark:text-slate-300 font-mono outline-hidden focus:border-blue-500"
            />
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setBulkModal({ isOpen: false, rawText: '' })}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImportBulk}
                disabled={!bulkModal.rawText.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40"
              >
                Import Questions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
