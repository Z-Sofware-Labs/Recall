import { useState, useEffect, useMemo, useCallback, ChangeEvent, ClipboardEvent } from 'react';
import { 
  ListChecks, CheckCircle2, AlertCircle, 
  RotateCcw, Eye, Edit3, Award, MinusCircle,
  Save, X, Check, HelpCircle, ShieldAlert,
  Plus, Trash2, Shuffle, ChevronLeft, ChevronRight,
  Image as ImageIcon, Maximize2, ClipboardList, FileText, Sparkles,
  Undo2, Redo2
} from 'lucide-react';
import { scoreService } from '../../services/scoreService';
import { ChoiceOption, MultipleChoiceQuestionItem, MultipleChoiceActivityData, QuizActivity } from '../../types/quiz';
import { parseMultipleChoiceQuestions, parsePastedChoices, parsePastedList } from '../../utils/quizPasteParser';
import { downloadImageAsDataUrl } from '../../utils/imageUtils';
import { MathRenderer } from './MathRenderer';
import { useQuizUndoRedo } from '../../hooks/useQuizUndoRedo';
import { QuizUndoRedoButtons } from './QuizUndoRedoButtons';

const defaultQuestions: MultipleChoiceQuestionItem[] = [
  {
    id: 'mc_q_1',
    prompt: '1. Enter question prompt here',
    options: [
      { id: 'opt_1_1', text: 'Option A', isCorrect: true },
      { id: 'opt_1_2', text: 'Option B', isCorrect: false },
      { id: 'opt_1_3', text: 'Option C', isCorrect: false },
      { id: 'opt_1_4', text: 'Option D', isCorrect: false },
    ],
    explanation: '',
  },
];

interface MultipleChoiceProps {
  initialData?: QuizActivity | null;
  onBack?: () => void;
  onSaveToCourse?: (activity: QuizActivity) => void;
}

export default function MultipleChoice({ initialData, onBack, onSaveToCourse }: MultipleChoiceProps) {
  const [viewMode, setViewMode] = useState<'author' | 'preview'>('author');
  const [activityTitle, setActivityTitle] = useState(
    initialData?.prompt || 'Multiple Choice Activity'
  );
  const [instructions, setInstructions] = useState(
    initialData?.instructions || 'Choose the best answer for each question provided.'
  );

  // Unlimited Questions
  const [questions, setQuestions] = useState<MultipleChoiceQuestionItem[]>(() => {
    if (initialData?.data?.multipleChoice?.questions && initialData.data.multipleChoice.questions.length > 0) {
      return initialData.data.multipleChoice.questions;
    }
    if (initialData?.data?.multipleChoice?.options) {
      return [
        {
          id: 'mc_q_1',
          prompt: initialData.prompt || 'Which primary technology component converts solar radiation directly into electrical power?',
          options: initialData.data.multipleChoice.options,
          explanation: initialData.data.multipleChoice.explanation || '',
        },
      ];
    }
    return defaultQuestions;
  });

  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(
    initialData?.data?.multipleChoice?.shuffleQuestions ?? false
  );
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(
    initialData?.data?.multipleChoice?.shuffleOptions ?? true
  );

  // Scoring & Retries
  const [pointsPerCorrect, setPointsPerCorrect] = useState<number>(initialData?.pointsPerCorrect ?? 2);
  const [deductionPerMistake, setDeductionPerMistake] = useState<number>(initialData?.deductionPerMistake ?? 0);
  const [retries, setRetries] = useState<number>(initialData?.retries ?? 2);

  const totalMaxScore = pointsPerCorrect * questions.length;
  const [passingScore, setPassingScore] = useState<number>(() => {
    if (initialData?.passingScore !== undefined) return initialData.passingScore;
    return Math.max(1, Math.ceil(totalMaxScore * 0.7));
  });

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Learner Preview State (Always One Question Per Page)
  const [previewQuestions, setPreviewQuestions] = useState<MultipleChoiceQuestionItem[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({}); // { [questionId]: optionId }
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(retries);
  const [zoomModalImage, setZoomModalImage] = useState<{ url: string; alt?: string; title?: string } | null>(null);
  const [validationResult, setValidationResult] = useState<{
    checked: boolean;
    score: number;
    maxScore: number;
    correctCount: number;
    mistakeCount: number;
    isPassed: boolean;
    isFailed: boolean;
    questionEvaluations: Record<string, { isCorrect: boolean; selectedOptionId?: string; correctOptionId: string }>;
  } | null>(null);

  useEffect(() => {
    if (initialData) {
      setActivityTitle(initialData.prompt || 'Renewable Energy Systems Multiple Choice Assessment');
      setInstructions(initialData.instructions || 'Choose the single best answer for each question provided.');
      if (initialData.data?.multipleChoice?.questions && initialData.data.multipleChoice.questions.length > 0) {
        setQuestions(initialData.data.multipleChoice.questions);
      }
      setShuffleQuestions(initialData.data?.multipleChoice?.shuffleQuestions ?? false);
      setShuffleOptions(initialData.data?.multipleChoice?.shuffleOptions ?? true);
      setPointsPerCorrect(initialData.pointsPerCorrect ?? 2);
      setDeductionPerMistake(initialData.deductionPerMistake ?? 0);
      setRetries(initialData.retries ?? 2);
      const calculatedMax = (initialData.pointsPerCorrect ?? 2) * (initialData.data?.multipleChoice?.questions?.length || defaultQuestions.length);
      setPassingScore(initialData.passingScore ?? Math.max(1, Math.ceil(calculatedMax * 0.7)));
    }
  }, [initialData]);

  // Undo & Redo History State
  const currentSnapshot = useMemo(() => ({
    activityTitle,
    instructions,
    questions,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
    shuffleOptions,
    shuffleQuestions,
  }), [
    activityTitle,
    instructions,
    questions,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
    shuffleOptions,
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
    if (state.shuffleOptions !== undefined) setShuffleOptions(state.shuffleOptions);
    if (state.shuffleQuestions !== undefined) setShuffleQuestions(state.shuffleQuestions);
  }, []);

  const { canUndo, canRedo, handleUndo, handleRedo } = useQuizUndoRedo(currentSnapshot, applySnapshot);

  const handleEnterPreview = () => {
    setViewMode('preview');
    setActiveQuestionIndex(0);
    setSelectedAnswers({});
    setValidationResult(null);
    setAttemptsRemaining(retries);

    let prepared = questions.map(q => {
      let opts = [...q.options];
      if (shuffleOptions) {
        opts = opts.sort(() => Math.random() - 0.5);
      }
      return { ...q, options: opts };
    });

    if (shuffleQuestions) {
      prepared = prepared.sort(() => Math.random() - 0.5);
    }
    setPreviewQuestions(prepared);
  };

  // Authoring: Add / Remove / Modify Questions
  const handleAddQuestion = () => {
    const newQ: MultipleChoiceQuestionItem = {
      id: `mc_q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      prompt: `${questions.length + 1}. Enter multiple choice question prompt here:`,
      options: [
        { id: `opt_${Date.now()}_1`, text: 'Correct Answer Option', isCorrect: true },
        { id: `opt_${Date.now()}_2`, text: 'Distractor Option B', isCorrect: false },
        { id: `opt_${Date.now()}_3`, text: 'Distractor Option C', isCorrect: false },
        { id: `opt_${Date.now()}_4`, text: 'Distractor Option D', isCorrect: false },
      ],
      explanation: '',
    };
    setQuestions(prev => [...prev, newQ]);
  };

  const handleRemoveQuestion = (qId: string) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter(q => q.id !== qId));
  };

  const handleUpdateQuestionPrompt = (qId: string, promptText: string) => {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, prompt: promptText } : q));
  };

  const handleUpdateQuestionImage = async (qId: string, imageUrl: string) => {
    const cleanUrl = imageUrl.trim();
    if (!cleanUrl) {
      setQuestions(prev => prev.map(q => q.id === qId ? { ...q, imageUrl: undefined } : q));
      return;
    }
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, imageUrl: cleanUrl } : q));
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      const dataUrl = await downloadImageAsDataUrl(cleanUrl);
      setQuestions(prev => prev.map(q => q.id === qId ? { ...q, imageUrl: dataUrl } : q));
    }
  };

  const handleUpdateOptionImage = async (qId: string, optId: string, imageUrl: string) => {
    const cleanUrl = imageUrl.trim();
    if (!cleanUrl) {
      setQuestions(prev => prev.map(q => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: q.options.map(o => o.id === optId ? { ...o, imageUrl: undefined } : o),
        };
      }));
      return;
    }
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      return {
        ...q,
        options: q.options.map(o => o.id === optId ? { ...o, imageUrl: cleanUrl } : o),
      };
    }));
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      const dataUrl = await downloadImageAsDataUrl(cleanUrl);
      setQuestions(prev => prev.map(q => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: q.options.map(o => o.id === optId ? { ...o, imageUrl: dataUrl } : o),
        };
      }));
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

  const handleUpdateQuestionExplanation = (qId: string, explanation: string) => {
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, explanation } : q));
  };

  // Options inside a question
  const handleAddOptionToQuestion = (qId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      if (q.options.length >= 8) return q;
      const newOpt: ChoiceOption = {
        id: `opt_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        text: `New Choice Option ${String.fromCharCode(65 + q.options.length)}`,
        isCorrect: false,
      };
      return { ...q, options: [...q.options, newOpt] };
    }));
  };

  const handleUpdateOptionText = (qId: string, optId: string, text: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      return {
        ...q,
        options: q.options.map(o => o.id === optId ? { ...o, text } : o),
      };
    }));
  };

  const handleSetCorrectOption = (qId: string, optId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      return {
        ...q,
        options: q.options.map(o => ({ ...o, isCorrect: o.id === optId })),
      };
    }));
  };

  // Paste Choices Modal State (Per-Question)
  const [pasteModal, setPasteModal] = useState<{ isOpen: boolean; questionId: string; rawText: string } | null>(null);
  
  // Bulk Questions Paste Modal State (Multiple Questions)
  const [bulkModal, setBulkModal] = useState<{ isOpen: boolean; rawText: string; mode: 'replace' | 'append' } | null>(null);

  const applyParsedChoicesToQuestion = (qId: string, parsed: ReturnType<typeof parsePastedChoices>, startIdx = 0) => {
    if (parsed.length === 0) return;

    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;

      const newOptions = [...q.options];
      let correctIdFromPaste: string | null = null;

      parsed.forEach((item, pIdx) => {
        const destIndex = (item.targetIndex !== undefined && item.letter)
          ? item.targetIndex
          : (startIdx + pIdx);

        if (destIndex < 8) {
          if (destIndex < newOptions.length) {
            newOptions[destIndex] = {
              ...newOptions[destIndex],
              text: item.text,
            };
            if (item.isCorrect) {
              correctIdFromPaste = newOptions[destIndex].id;
            }
          } else {
            while (newOptions.length <= destIndex && newOptions.length < 8) {
              const isTarget = newOptions.length === destIndex;
              const newId = `opt_${Date.now()}_${Math.random().toString(36).substring(2, 5)}_${newOptions.length}`;
              newOptions.push({
                id: newId,
                text: isTarget ? item.text : `Option ${String.fromCharCode(65 + newOptions.length)}`,
                isCorrect: false,
              });
              if (isTarget && item.isCorrect) {
                correctIdFromPaste = newId;
              }
            }
          }
        }
      });

      if (correctIdFromPaste) {
        return {
          ...q,
          options: newOptions.map(o => ({ ...o, isCorrect: o.id === correctIdFromPaste })),
        };
      }

      return { ...q, options: newOptions };
    }));
  };

  const handleOptionPaste = (qId: string, optIndex: number, e: ClipboardEvent<HTMLInputElement>) => {
    const pasteText = e.clipboardData.getData('text');
    if (!pasteText) return;

    const parsed = parsePastedChoices(pasteText);
    // If only 1 simple line without letter prefix, allow native input paste
    if (parsed.length <= 1 && !parsed[0]?.letter) {
      return;
    }

    e.preventDefault();
    applyParsedChoicesToQuestion(qId, parsed, optIndex);
  };

  const handlePromptPaste = (qId: string, qIndex: number, e: ClipboardEvent<HTMLInputElement>) => {
    const pasteText = e.clipboardData.getData('text');
    if (!pasteText) return;

    // Check if text has multiple questions OR options (A., B., C., D.)
    const hasOptions = /(?:^|\n|\s+)[\(\[]?[A-Ha-h][\)\]\:\.\-\t\s]\s+/i.test(pasteText);
    const hasMultiNumbered = /(?:^|\n)\s*(?:(?:question|q|item)\s*\d+|\d+[\.\)\:\-]\s+)/i.test(pasteText) && pasteText.includes('\n');

    if (hasOptions || hasMultiNumbered) {
      e.preventDefault();
      const parsedList = parseMultipleChoiceQuestions(pasteText);
      if (parsedList.length === 0) return;

      if (parsedList.length === 1) {
        // Update single question's prompt and options
        const single = parsedList[0];
        setQuestions(prev => prev.map(q => {
          if (q.id !== qId) return q;

          const updatedOptions = single.options.map((opt, oIdx) => ({
            id: q.options[oIdx]?.id || `opt_${Date.now()}_${oIdx}_${Math.random().toString(36).substring(2, 5)}`,
            text: opt.text,
            isCorrect: opt.isCorrect,
          }));

          return {
            ...q,
            prompt: single.prompt,
            options: updatedOptions.length >= 2 ? updatedOptions : q.options,
            explanation: single.explanation || q.explanation || '',
          };
        }));
      } else {
        // Multiple questions parsed!
        const createdItems: MultipleChoiceQuestionItem[] = parsedList.map((pq, idx) => ({
          id: `mc_q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
          prompt: pq.prompt,
          options: pq.options.map((opt, oIdx) => ({
            id: `opt_${Date.now()}_${idx}_${oIdx}`,
            text: opt.text,
            isCorrect: opt.isCorrect,
          })),
          explanation: pq.explanation || '',
        }));

        setQuestions(prev => {
          // If only 1 question exists and its prompt is empty/default, replace all
          if (prev.length === 1 && (prev[0].prompt.includes('Enter question') || !prev[0].prompt.trim())) {
            return createdItems;
          }
          // Otherwise, replace current question with 1st, and insert rest after it
          const next = [...prev];
          next.splice(qIndex, 1, ...createdItems);
          return next;
        });
      }
    }
  };

  const handleApplyBulkQuestions = (rawText: string, mode: 'replace' | 'append') => {
    const parsedList = parseMultipleChoiceQuestions(rawText);
    if (parsedList.length === 0) return;

    const createdItems: MultipleChoiceQuestionItem[] = parsedList.map((pq, idx) => ({
      id: `mc_q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      prompt: pq.prompt,
      options: pq.options.map((opt, oIdx) => ({
        id: `opt_${Date.now()}_${idx}_${oIdx}`,
        text: opt.text,
        isCorrect: opt.isCorrect,
      })),
      explanation: pq.explanation || '',
    }));

    if (mode === 'replace') {
      setQuestions(createdItems);
    } else {
      setQuestions(prev => [...prev, ...createdItems]);
    }
    setBulkModal(null);
  };

  const handleDeleteOptionFromQuestion = (qId: string, optId: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      if (q.options.length <= 2) return q;
      return {
        ...q,
        options: q.options.filter(o => o.id !== optId),
      };
    }));
  };

  // Evaluation
  const handleCheckAllAnswers = () => {
    let earnedPoints = 0;
    let correctCount = 0;
    let mistakeCount = 0;
    const questionEvaluations: Record<string, { isCorrect: boolean; selectedOptionId?: string; correctOptionId: string }> = {};

    const activeList = previewQuestions.length > 0 ? previewQuestions : questions;

    activeList.forEach(q => {
      const selectedOptId = selectedAnswers[q.id];
      const correctOpt = q.options.find(o => o.isCorrect);
      const isCorrect = !!(selectedOptId && correctOpt && selectedOptId === correctOpt.id);

      if (isCorrect) {
        correctCount += 1;
        earnedPoints += pointsPerCorrect;
      } else {
        mistakeCount += 1;
        if (pointsPerCorrect > 0 && deductionPerMistake > 0) {
          earnedPoints = Math.max(0, earnedPoints - deductionPerMistake);
        }
      }

      questionEvaluations[q.id] = {
        isCorrect,
        selectedOptionId: selectedOptId,
        correctOptionId: correctOpt?.id || '',
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
      questionEvaluations,
    });

    if (retries > 0 && attemptsRemaining > 0) {
      setAttemptsRemaining(prev => prev - 1);
    }

    scoreService.recordQuizScore({
      courseId: 'proj_sample_01',
      quizId: initialData?.id || 'quiz_mc_01',
      quizTitle: activityTitle || 'Multiple Choice Assessment',
      quizType: 'Multiple Choice',
      score: finalScore,
      maxScore: totalMaxScore,
      correctCount,
      mistakeCount,
      attempts: 1,
    });
  };

  const handleSaveToCourse = () => {
    const activity: QuizActivity = {
      id: initialData?.id || `quiz_mc_${Date.now()}`,
      name: activityTitle || 'Multiple Choice Activity',
      type: 'Multiple Choice',
      prompt: activityTitle,
      instructions,
      pointsPerCorrect,
      deductionPerMistake,
      retries,
      isGraded: pointsPerCorrect > 0,
      passingScore: pointsPerCorrect > 0 ? passingScore : undefined,
      data: {
        multipleChoice: {
          questions,
          displayMode: 'paginated',
          shuffleOptions,
          shuffleQuestions,
        },
      },
      totalPoints: totalMaxScore,
      lastModified: Date.now(),
    };

    onSaveToCourse?.(activity);
    setSaveSuccessMessage('Activity saved to Course Editor!');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  const currentActiveQuestion = questions[activeQuestionIndex] || questions[0];

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-200 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <ListChecks size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Question Type
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Multiple Choice ({questions.length} Questions)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {activityTitle || 'Untitled Multiple Choice Assessment'}
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'author'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Edit3 size={14} />
              <span>Authoring</span>
            </button>
            <button
              onClick={handleEnterPreview}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'preview'
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

      {/* 1. AUTHORING (Full Layout for Constructing Multiple Items) */}
      {viewMode === 'author' && (
        <div className="space-y-6">
          {/* Assessment Header & Instructions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Assessment Title / Subject
                </label>
                <input
                  type="text"
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="e.g. Solar Energy Multiple Choice Checkpoint"
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
                  placeholder="e.g. Choose the single best answer for each question."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Questions Counter & Add Button Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {questions.length} Multiple Choice Questions
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">Learners see 1 question per page</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkModal({ isOpen: true, rawText: '', mode: 'append' })}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="Paste full multiple choice questions with choices A, B, C, D"
                >
                  <ClipboardList size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>Bulk Paste Questions</span>
                </button>

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

              <div className={`space-y-1.5 p-3.5 rounded-xl border transition-all ${
                pointsPerCorrect > 0 
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

              <div className={`space-y-1.5 p-3.5 rounded-xl border transition-all ${
                pointsPerCorrect > 0 
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
                  {pointsPerCorrect > 0 ? 'Subtracted on wrong choice' : 'No deductions on non-graded'}
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

            {/* Randomization / Shuffle Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div 
                onClick={() => setShuffleQuestions(!shuffleQuestions)}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  shuffleQuestions 
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${shuffleQuestions ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                    <Shuffle size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold">Shuffle Questions Order</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Randomize the sequence of questions for each student
                    </p>
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                  shuffleQuestions ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>

              <div 
                onClick={() => setShuffleOptions(!shuffleOptions)}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  shuffleOptions 
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${shuffleOptions ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                    <Shuffle size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold">Shuffle Choices (A, B, C, D)</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Randomize option positions within each question
                    </p>
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                  shuffleOptions ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>
            </div>
          </div>

          {/* Construction Layout: List of All Questions */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Construct Questions ({questions.length} total)
            </h4>

            {questions.map((q, qIndex) => (
              <div 
                key={q.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg">
                    Question #{qIndex + 1}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPasteModal({ isOpen: true, questionId: q.id, rawText: '' })}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300 cursor-pointer px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                      title="Paste multiple choices (e.g. A) ... B) ... C) ... D) ...)"
                    >
                      <ClipboardList size={13} />
                      <span>Paste Choices</span>
                    </button>

                    <button
                      type="button"
                      disabled={q.options.length >= 8}
                      onClick={() => handleAddOptionToQuestion(q.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-40 cursor-pointer"
                    >
                      <Plus size={13} /> Add Choice
                    </button>

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

                {/* Prompt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Question Prompt
                    </label>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      💡 Paste full question + choices (A-D) directly here
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={q.prompt}
                      onChange={(e) => handleUpdateQuestionPrompt(q.id, e.target.value)}
                      onPaste={(e) => handlePromptPaste(q.id, qIndex, e)}
                      placeholder={`e.g. Which technology component converts solar radiation directly into electrical power?`}
                      className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
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

                {/* Options List for this Question */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Options & Distractors (Select radio button for the correct choice):
                    </label>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      💡 Paste multi-line text (e.g. A) ..., B) ...) directly into any box
                    </span>
                  </div>

                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => (
                      <div 
                        key={opt.id}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                          opt.isCorrect 
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' 
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`correct-option-${q.id}`}
                          checked={opt.isCorrect}
                          onChange={() => handleSetCorrectOption(q.id, opt.id)}
                          className="w-4 h-4 text-emerald-600 cursor-pointer accent-emerald-600 shrink-0"
                        />
                        <span className="w-5 text-center text-xs font-bold text-slate-500 shrink-0">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleUpdateOptionText(q.id, opt.id, e.target.value)}
                          onPaste={(e) => handleOptionPaste(q.id, optIdx, e)}
                          placeholder={`Option ${String.fromCharCode(65 + optIdx)} text (or paste choices list)`}
                          className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500"
                        />

                        {/* Choice Photo Upload Button on Right */}
                        {opt.imageUrl ? (
                          <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                            <div className="w-6 h-6 rounded overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                              <img 
                                src={opt.imageUrl} 
                                alt="" 
                                className="w-full h-full object-cover" 
                                onError={() => handleUpdateOptionImage(q.id, opt.id, '')}
                              />
                            </div>
                            <label className="text-slate-400 hover:text-blue-500 cursor-pointer" title="Change Photo">
                              <ImageIcon size={13} />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, (url) => handleUpdateOptionImage(q.id, opt.id, url))}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleUpdateOptionImage(q.id, opt.id, '')}
                              className="text-slate-400 hover:text-rose-500 cursor-pointer"
                              title="Remove Photo"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <label 
                            className="flex items-center gap-0.5 px-2 py-1.5 bg-white hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-950/50 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0"
                            title="Add Photo from computer"
                          >
                            <Plus size={13} />
                            <ImageIcon size={14} />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, (url) => handleUpdateOptionImage(q.id, opt.id, url))}
                              className="hidden"
                            />
                          </label>
                        )}

                        {q.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOptionFromQuestion(q.id, opt.id)}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer p-1 shrink-0"
                            title="Delete option"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Explanation (Shown during review / feedback)
                  </label>
                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) => handleUpdateQuestionExplanation(q.id, e.target.value)}
                    placeholder="e.g. Silicon cells utilize p-n junctions... (Optional)"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. LEARNER PREVIEW (Always 1 Question per Page) */}
      {viewMode === 'preview' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <ListChecks size={16} className="text-blue-600 dark:text-blue-400" />
                <span>{instructions}</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Each question (and its supporting diagrams or choice images) appears on its own dedicated page.
              </p>
            </div>

            <div className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 shadow-2xs">
              {questions.length} Questions • {totalMaxScore} Total Points
            </div>
          </div>

          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Stepper / Question Tabs */}
            {(() => {
              const activeList = previewQuestions.length > 0 ? previewQuestions : questions;
              return (
                <div className="flex items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                  <div className="flex items-center gap-1.5">
                    {activeList.map((q, idx) => {
                      const isAnswered = !!selectedAnswers[q.id];
                      const isActive = activeQuestionIndex === idx;
                      const isChecked = validationResult?.checked;
                      const isCorrect = validationResult?.questionEvaluations?.[q.id]?.isCorrect;

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setActiveQuestionIndex(idx)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                            isChecked
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
                    Question {activeQuestionIndex + 1} of {activeList.length}
                  </span>
                </div>
              );
            })()}

            {/* Single Question Card */}
            {(() => {
              const activeList = previewQuestions.length > 0 ? previewQuestions : questions;
              const currentActiveQuestion = activeList[activeQuestionIndex] || activeList[0];
              const hasChoiceImages = currentActiveQuestion.options.some(o => !!o.imageUrl);

              return (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-150">
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Question #{activeQuestionIndex + 1}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                      <MathRenderer text={currentActiveQuestion.prompt} />
                    </h3>
                  </div>

                  {/* Question Image Preview */}
                  {currentActiveQuestion.imageUrl && (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center max-h-[340px] group">
                      <img 
                        src={currentActiveQuestion.imageUrl} 
                        alt={currentActiveQuestion.prompt} 
                        className="w-full h-full max-h-[340px] object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setZoomModalImage({ url: currentActiveQuestion.imageUrl!, title: currentActiveQuestion.prompt })}
                        className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md flex items-center gap-1.5 text-xs font-semibold"
                        title="Zoom image"
                      >
                        <Maximize2 size={14} />
                        <span>Expand</span>
                      </button>
                    </div>
                  )}

                  {/* Choices list */}
                  <div className={hasChoiceImages ? "grid grid-cols-1 sm:grid-cols-2 gap-3.5" : "space-y-3"}>
                    {currentActiveQuestion.options.map((opt, oIdx) => {
                      const isSelected = selectedAnswers[currentActiveQuestion.id] === opt.id;
                      const isChecked = validationResult?.checked;
                      const isCorrect = opt.isCorrect;

                      return (
                        <div
                          key={opt.id}
                          onClick={() => !isChecked && setSelectedAnswers(prev => ({ ...prev, [currentActiveQuestion.id]: opt.id }))}
                          className={`p-3.5 sm:p-4 rounded-xl border-2 transition-all flex ${hasChoiceImages ? 'flex-col items-start gap-2.5' : 'items-center gap-3.5'} ${
                            isChecked
                              ? isCorrect
                                ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40'
                                : isSelected
                                ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40'
                                : 'border-slate-200 dark:border-slate-800 opacity-60'
                              : isSelected
                              ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 ring-4 ring-blue-400/30'
                              : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 cursor-pointer'
                          }`}
                        >
                          {/* Image Thumbnail for option if present */}
                          {opt.imageUrl && (
                            <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-800 flex items-center justify-center group/opt">
                              <img src={opt.imageUrl} alt={opt.text} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomModalImage({ url: opt.imageUrl!, title: opt.text });
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-lg text-[10px] cursor-pointer opacity-0 group-hover/opt:opacity-100 transition-opacity"
                              >
                                <Maximize2 size={12} />
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-3 w-full">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="text-sm font-medium text-slate-900 dark:text-white flex-1">
                              <MathRenderer text={opt.text} />
                            </span>
                            {isChecked && isCorrect && <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />}
                            {isChecked && isSelected && !isCorrect && <AlertCircle size={18} className="text-rose-600 shrink-0" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  {validationResult?.checked && currentActiveQuestion.explanation && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Explanation: </span>
                      {currentActiveQuestion.explanation}
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
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
              );
            })()}
          </div>

          {/* Validation Footer */}
          <div className={`bg-white dark:bg-slate-900 border ${
            validationResult?.isFailed
              ? 'border-rose-300 ring-2 ring-rose-500/20'
              : validationResult?.isPassed && pointsPerCorrect > 0
              ? 'border-emerald-300 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800'
          } rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-2xl mx-auto`}>
            <div>
              {validationResult ? (
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-full ${
                    validationResult.isFailed
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
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          validationResult.isFailed ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
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
                  {Object.keys(selectedAnswers).length} of {questions.length} questions answered.
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
                  disabled={Object.keys(selectedAnswers).length === 0}
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
                alt={zoomModalImage.alt || 'Zoomed View'} 
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Paste Choices List Modal */}
      {pasteModal && pasteModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setPasteModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Paste Choices List
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Letters (A, B, C, D...) will be mapped to the corresponding options automatically.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasteModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Paste choices text below:
              </label>
              <textarea
                rows={6}
                value={pasteModal.rawText}
                onChange={(e) => setPasteModal(prev => prev ? { ...prev, rawText: e.target.value } : null)}
                placeholder={`A) Boreal forest (Taiga)\nB) Temperate deciduous forest\nC) Tropical rainforest\nD) Mangrove forest`}
                className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden leading-relaxed"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 leading-normal">
                Format can be <code className="text-blue-600 dark:text-blue-400 font-semibold">A) Text</code>, <code className="text-blue-600 dark:text-blue-400 font-semibold">A. Text</code>, <code className="text-blue-600 dark:text-blue-400 font-semibold">1. Text</code>, or lines of text. Mark correct answer with an asterisk (e.g. <code className="text-emerald-600 dark:text-emerald-400 font-semibold">*A) Option</code>).
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPasteModal(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pasteModal.rawText.trim()}
                onClick={() => {
                  const parsed = parsePastedChoices(pasteModal.rawText);
                  applyParsedChoicesToQuestion(pasteModal.questionId, parsed, 0);
                  setPasteModal(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Apply Choices ({parsePastedChoices(pasteModal.rawText).length})
              </button>
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
                    Bulk Paste Multiple Choice Questions
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Paste one or multiple questions with numbered prompts and choices (A, B, C, D...).
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
                  Paste Questions & Options Text:
                </label>
                {bulkModal.rawText.trim() && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    Detected {parseMultipleChoiceQuestions(bulkModal.rawText).length} questions
                  </span>
                )}
              </div>
              <textarea
                rows={10}
                value={bulkModal.rawText}
                onChange={(e) => setBulkModal(prev => prev ? { ...prev, rawText: e.target.value } : null)}
                placeholder={`1. Which of the following was NOT a contributing factor to the fall of the Western Roman Empire?\nA. Severe economic crisis and heavy taxation\nB. Invasions by Germanic and barbarian tribes\nC. Rapid global industrialization and modern steam technology\nD. Political corruption and declining military discipline\n\n2. Why did many Roman citizens migrate from urban centers to rural manors at the start of the Middle Ages?\nA. To construct modern industrial factories\nB. To seek security and cultivate farmland under the protection of local lords\nC. To join transatlantic maritime expeditions\nD. To serve in parliamentary democracies`}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden leading-relaxed"
                autoFocus
              />
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-blue-500" />
                  <span>Smart Formatting Support:</span>
                </div>
                <p>• Automatically parses question numbers (<code className="text-blue-600 dark:text-blue-400 font-mono">1.</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">1)</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">Question 1:</code>) and options (<code className="text-blue-600 dark:text-blue-400 font-mono">A.</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">A)</code>, tabs, letters).</p>
                <p>• To specify correct answer directly in text, prefix option with an asterisk (<code className="text-emerald-600 dark:text-emerald-400 font-mono">*C. Option</code>) or add <code className="text-emerald-600 dark:text-emerald-400 font-mono">(Correct)</code> at the end.</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Mode:</label>
                <button
                  type="button"
                  onClick={() => setBulkModal(prev => prev ? { ...prev, mode: 'append' } : null)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                    bulkModal.mode === 'append'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Append
                </button>
                <button
                  type="button"
                  onClick={() => setBulkModal(prev => prev ? { ...prev, mode: 'replace' } : null)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-colors ${
                    bulkModal.mode === 'replace'
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
                  disabled={!bulkModal.rawText.trim() || parseMultipleChoiceQuestions(bulkModal.rawText).length === 0}
                  onClick={() => handleApplyBulkQuestions(bulkModal.rawText, bulkModal.mode)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Import {parseMultipleChoiceQuestions(bulkModal.rawText).length} Questions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
