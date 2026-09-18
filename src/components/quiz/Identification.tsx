import { useState, useEffect, useMemo, useCallback, ChangeEvent, ClipboardEvent } from 'react';
import { 
  Type, CheckCircle2, AlertCircle, 
  RotateCcw, Eye, Edit3, Award, MinusCircle,
  Save, X, Check, HelpCircle, ShieldAlert,
  Tag, Sliders, ToggleLeft, ToggleRight, Plus, Trash2,
  ChevronLeft, ChevronRight, Layers, LayoutList, FileText,
  Image as ImageIcon, Maximize2, Shuffle, ClipboardList, Sparkles,
  Undo2, Redo2
} from 'lucide-react';
import { scoreService } from '../../services/scoreService';
import { IdentificationQuestionItem, IdentificationActivityData, QuizActivity } from '../../types/quiz';
import { parseIdentificationQuestions } from '../../utils/quizPasteParser';
import { downloadImageAsDataUrl } from '../../utils/imageUtils';
import { useQuizUndoRedo } from '../../hooks/useQuizUndoRedo';
import { QuizUndoRedoButtons } from './QuizUndoRedoButtons';

const defaultQuestions: IdentificationQuestionItem[] = [
  {
    id: 'id_q_1',
    questionPrompt: '1. Enter question statement or identification prompt here',
    primaryAnswer: 'Answer',
    acceptableAliases: [],
    explanation: '',
  },
];

interface IdentificationProps {
  initialData?: QuizActivity | null;
  onBack?: () => void;
  onSaveToCourse?: (activity: QuizActivity) => void;
}

export default function Identification({ initialData, onBack, onSaveToCourse }: IdentificationProps) {
  const [viewMode, setViewMode] = useState<'author' | 'preview'>('author');

  // Title & Instructions
  const [titlePrompt, setTitlePrompt] = useState<string>(
    initialData?.prompt || 'Renewable Energy Key Term Identification'
  );
  const [instructions, setInstructions] = useState<string>(
    initialData?.instructions || 'Type the precise technical term or concept to answer each item below.'
  );

  // Unlimited Questions State
  const [questions, setQuestions] = useState<IdentificationQuestionItem[]>(() => {
    if (initialData?.data?.identification?.questions && initialData.data.identification.questions.length > 0) {
      return initialData.data.identification.questions;
    }
    if (initialData?.data?.identification?.primaryAnswer) {
      return [
        {
          id: 'id_q_1',
          questionPrompt: initialData.prompt || '1. Enter term prompt:',
          primaryAnswer: initialData.data.identification.primaryAnswer,
          acceptableAliases: initialData.data.identification.acceptableAliases || [],
          explanation: initialData.data.identification.explanation || '',
        },
      ];
    }
    return defaultQuestions;
  });

  // Display Per Page: 1 | 5 | 10 | 'all'
  const [displayPerPage, setDisplayPerPage] = useState<1 | 5 | 10 | 'all'>(
    initialData?.data?.identification?.displayPerPage || 'all'
  );
  const [caseSensitive, setCaseSensitive] = useState<boolean>(
    initialData?.data?.identification?.caseSensitive ?? false
  );
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(
    initialData?.data?.identification?.shuffleQuestions ?? false
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

  // Per-question alias draft inputs for authoring
  const [aliasDrafts, setAliasDrafts] = useState<Record<string, string>>({});

  // Learner Interactive State
  const [previewQuestions, setPreviewQuestions] = useState<IdentificationQuestionItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
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
    itemResults: Record<string, { isCorrect: boolean; feedback: string }>;
  } | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitlePrompt(initialData.prompt || 'Renewable Energy Key Term Identification');
      setInstructions(initialData.instructions || 'Type the precise technical term or concept to answer each item below.');
      if (initialData.data?.identification?.questions && initialData.data.identification.questions.length > 0) {
        setQuestions(initialData.data.identification.questions);
      }
      if (initialData.data?.identification?.displayPerPage) {
        setDisplayPerPage(initialData.data.identification.displayPerPage);
      }
      setCaseSensitive(initialData.data?.identification?.caseSensitive ?? false);
      setShuffleQuestions(initialData.data?.identification?.shuffleQuestions ?? false);
      setPointsPerCorrect(initialData.pointsPerCorrect ?? 2);
      setDeductionPerMistake(initialData.deductionPerMistake ?? 0);
      setRetries(initialData.retries ?? 2);
      const calculatedMax = (initialData.pointsPerCorrect ?? 2) * (initialData.data?.identification?.questions?.length || defaultQuestions.length);
      setPassingScore(initialData.passingScore ?? Math.max(1, Math.ceil(calculatedMax * 0.7)));
    }
  }, [initialData]);

  // Undo & Redo History State
  const currentSnapshot = useMemo(() => ({
    titlePrompt,
    instructions,
    questions,
    displayPerPage,
    caseSensitive,
    shuffleQuestions,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
  }), [
    titlePrompt,
    instructions,
    questions,
    displayPerPage,
    caseSensitive,
    shuffleQuestions,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
  ]);

  const applySnapshot = useCallback((state: typeof currentSnapshot) => {
    if (state.titlePrompt !== undefined) setTitlePrompt(state.titlePrompt);
    if (state.instructions !== undefined) setInstructions(state.instructions);
    if (state.questions !== undefined) setQuestions(state.questions);
    if (state.displayPerPage !== undefined) setDisplayPerPage(state.displayPerPage);
    if (state.caseSensitive !== undefined) setCaseSensitive(state.caseSensitive);
    if (state.shuffleQuestions !== undefined) setShuffleQuestions(state.shuffleQuestions);
    if (state.pointsPerCorrect !== undefined) setPointsPerCorrect(state.pointsPerCorrect);
    if (state.passingScore !== undefined) setPassingScore(state.passingScore);
    if (state.deductionPerMistake !== undefined) setDeductionPerMistake(state.deductionPerMistake);
    if (state.retries !== undefined) setRetries(state.retries);
  }, []);

  const { canUndo, canRedo, handleUndo, handleRedo } = useQuizUndoRedo(currentSnapshot, applySnapshot);

  const handleEnterPreview = () => {
    setViewMode('preview');
    setActivePageIndex(0);
    setUserAnswers({});
    setValidationResult(null);
    setAttemptsRemaining(retries);

    let prepared = [...questions];
    if (shuffleQuestions) {
      prepared = prepared.sort(() => Math.random() - 0.5);
    }
    setPreviewQuestions(prepared);
  };

  // Authoring: Unlimited Add / Remove / Update questions
  const handleAddQuestion = () => {
    const newQ: IdentificationQuestionItem = {
      id: `id_q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      questionPrompt: `${questions.length + 1}. Enter your question prompt here:`,
      primaryAnswer: 'Primary Term',
      acceptableAliases: [],
      explanation: '',
    };
    setQuestions(prev => [...prev, newQ]);
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

  const handleRemoveQuestion = (id: string) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleUpdateQuestion = (id: string, field: keyof IdentificationQuestionItem, value: any) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  // Bulk Questions Paste Modal State
  const [bulkModal, setBulkModal] = useState<{ isOpen: boolean; rawText: string; mode: 'replace' | 'append' } | null>(null);

  const handlePromptPaste = (qId: string, qIndex: number, e: ClipboardEvent<HTMLInputElement>) => {
    const pasteText = e.clipboardData.getData('text');
    if (!pasteText) return;

    // Check if multiple lines or numbered list
    const isMultiLine = pasteText.includes('\n');
    const isNumbered = /^(?:(?:question|q|item)\s*\d+|\d+[\.\)\:\-]\s+)/i.test(pasteText.trim());

    if (isMultiLine || isNumbered) {
      const parsedList = parseIdentificationQuestions(pasteText);
      if (parsedList.length === 0) return;

      e.preventDefault();

      if (parsedList.length === 1) {
        const single = parsedList[0];
        setQuestions(prev => prev.map(q => {
          if (q.id !== qId) return q;
          return {
            ...q,
            questionPrompt: single.questionPrompt,
            ...(single.primaryAnswer ? { primaryAnswer: single.primaryAnswer } : {}),
            ...(single.acceptableAliases.length > 0 ? { acceptableAliases: single.acceptableAliases } : {}),
            explanation: single.explanation || q.explanation || '',
          };
        }));
      } else {
        const createdItems: IdentificationQuestionItem[] = parsedList.map((pq, idx) => ({
          id: `id_q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
          questionPrompt: pq.questionPrompt,
          primaryAnswer: pq.primaryAnswer || 'Answer',
          acceptableAliases: pq.acceptableAliases || [],
          explanation: pq.explanation || '',
        }));

        setQuestions(prev => {
          if (prev.length === 1 && (prev[0].questionPrompt.includes('Enter question') || !prev[0].questionPrompt.trim())) {
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
    const parsedList = parseIdentificationQuestions(rawText);
    if (parsedList.length === 0) return;

    const createdItems: IdentificationQuestionItem[] = parsedList.map((pq, idx) => ({
      id: `id_q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      questionPrompt: pq.questionPrompt,
      primaryAnswer: pq.primaryAnswer || 'Answer',
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

  const handleAddAlias = (questionId: string) => {
    const draft = (aliasDrafts[questionId] || '').trim();
    if (!draft) return;
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId) return q;
      if (q.acceptableAliases.some(a => a.toLowerCase() === draft.toLowerCase())) return q;
      return { ...q, acceptableAliases: [...q.acceptableAliases, draft] };
    }));
    setAliasDrafts(prev => ({ ...prev, [questionId]: '' }));
  };

  const handleRemoveAlias = (questionId: string, aliasIndex: number) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== questionId) return q;
      return { ...q, acceptableAliases: q.acceptableAliases.filter((_, i) => i !== aliasIndex) };
    }));
  };

  // Evaluation
  const normalize = (str: string) => {
    const trimmed = (str || '').trim();
    return caseSensitive ? trimmed : trimmed.toLowerCase();
  };

  const handleCheckAnswers = () => {
    let earnedPoints = 0;
    let correctCount = 0;
    let mistakeCount = 0;
    const itemResults: Record<string, { isCorrect: boolean; feedback: string }> = {};

    const activeList = previewQuestions.length > 0 ? previewQuestions : questions;

    activeList.forEach(q => {
      const input = normalize(userAnswers[q.id] || '');
      const primary = normalize(q.primaryAnswer);
      const isMatched = input !== '' && (input === primary || q.acceptableAliases.some(a => normalize(a) === input));

      if (isMatched) {
        correctCount += 1;
        earnedPoints += pointsPerCorrect;
        itemResults[q.id] = {
          isCorrect: true,
          feedback: `Correct! (${q.primaryAnswer})`,
        };
      } else {
        mistakeCount += 1;
        if (pointsPerCorrect > 0 && deductionPerMistake > 0) {
          earnedPoints = Math.max(0, earnedPoints - deductionPerMistake);
        }
        itemResults[q.id] = {
          isCorrect: false,
          feedback: `Incorrect. Expected: "${q.primaryAnswer}"`,
        };
      }
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
      quizId: initialData?.id || 'quiz_id_01',
      quizTitle: titlePrompt || 'Identification Activity',
      quizType: 'Identification',
      score: finalScore,
      maxScore: totalMaxScore,
      correctCount,
      mistakeCount,
      attempts: 1,
    });
  };

  const handleSaveToCourse = () => {
    const activity: QuizActivity = {
      id: initialData?.id || `quiz_id_${Date.now()}`,
      name: titlePrompt || 'Identification Activity',
      type: 'Identification',
      prompt: titlePrompt,
      instructions,
      pointsPerCorrect,
      deductionPerMistake,
      retries,
      isGraded: pointsPerCorrect > 0,
      passingScore: pointsPerCorrect > 0 ? passingScore : undefined,
      data: {
        identification: {
          questions,
          caseSensitive,
          displayPerPage,
          shuffleQuestions,
        },
      },
      totalPoints: totalMaxScore,
      lastModified: Date.now(),
    };

    onSaveToCourse?.(activity);
    setSaveSuccessMessage('Activity saved to Course Organizer!');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Pagination & Single Question Per Page Rule:
  // Any question with an attached image MUST appear as the only question on that page.
  // Other questions without images are grouped together according to displayPerPage.
  const pages: IdentificationQuestionItem[][] = [];
  let currentTextGroup: IdentificationQuestionItem[] = [];
  const targetGroupSize = displayPerPage === 'all' ? Infinity : displayPerPage;

  const activeQuestionsList = viewMode === 'preview' && previewQuestions.length > 0 ? previewQuestions : questions;

  for (const q of activeQuestionsList) {
    if (q.imageUrl && q.imageUrl.trim() !== '') {
      if (currentTextGroup.length > 0) {
        pages.push(currentTextGroup);
        currentTextGroup = [];
      }
      pages.push([q]);
    } else {
      currentTextGroup.push(q);
      if (currentTextGroup.length >= targetGroupSize) {
        pages.push(currentTextGroup);
        currentTextGroup = [];
      }
    }
  }
  if (currentTextGroup.length > 0) {
    pages.push(currentTextGroup);
  }

  const totalPages = Math.max(1, pages.length);
  const safePageIndex = Math.min(activePageIndex, totalPages - 1);
  const currentQuestionsSlice = pages[safePageIndex] || [];

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-200 select-none">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <Type size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Question Type
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Identification (Terminology Challenge)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {titlePrompt || 'Untitled Identification Activity'}
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'author'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
          {/* Activity Banner & Global Config */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Activity Title / Topic Prompt
                </label>
                <input
                  type="text"
                  value={titlePrompt}
                  onChange={(e) => setTitlePrompt(e.target.value)}
                  placeholder="e.g. Key Concept Term Identification"
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
                  placeholder="e.g. Type the term in the space provided."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Display per page & Case sensitivity / Actions */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              {/* Questions per Page Selector */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
                  <Layers size={15} className="text-blue-600" />
                  <span>Display on Learner Preview:</span>
                </span>

                <div className="flex flex-wrap items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setDisplayPerPage(1)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      displayPerPage === 1 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    1 Question / Page
                  </button>

                  <button
                    type="button"
                    onClick={() => setDisplayPerPage(5)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      displayPerPage === 5 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    5 Questions / Page
                  </button>

                  <button
                    type="button"
                    onClick={() => setDisplayPerPage(10)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      displayPerPage === 10 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    10 Questions / Page
                  </button>

                  <button
                    type="button"
                    onClick={() => setDisplayPerPage('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      displayPerPage === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    All on 1 Page
                  </button>
                </div>
              </div>

              {/* Case Sensitivity Toggle & Add Question side-by-side alongside */}
              <div className="flex flex-row items-center gap-3 shrink-0">
                <div 
                  onClick={() => setCaseSensitive(!caseSensitive)}
                  className={`p-2 px-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
                    caseSensitive 
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800' 
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Sliders size={14} className={caseSensitive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {caseSensitive ? 'Case-Sensitive' : 'Case-Insensitive'}
                  </span>
                  {caseSensitive ? <ToggleRight size={20} className="text-blue-600 ml-1" /> : <ToggleLeft size={20} className="text-slate-400 ml-1" />}
                </div>

                <button
                  type="button"
                  onClick={() => setBulkModal({ isOpen: true, rawText: '', mode: 'append' })}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
                  title="Paste multiple identification questions"
                >
                  <ClipboardList size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>Bulk Paste</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>Add Question ({questions.length})</span>
                </button>
              </div>
            </div>

            {/* Scoring Boxes */}
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
                  {pointsPerCorrect > 0 ? 'Subtracted on wrong entry' : 'No deductions on non-graded'}
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
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
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
                      Randomize the sequence of identification items for each student
                    </p>
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                  shuffleQuestions ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </div>
              </div>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Identification Questions ({questions.length} total)
            </h4>

            {questions.map((q, qIndex) => (
              <div 
                key={q.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 relative"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg">
                    Question #{qIndex + 1}
                  </span>

                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded-lg cursor-pointer transition-colors"
                      title="Remove question"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Prompt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Question Prompt / Statement
                    </label>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      💡 Paste numbered items (1., 2., 3.) directly here
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={q.questionPrompt}
                      onChange={(e) => handleUpdateQuestion(q.id, 'questionPrompt', e.target.value)}
                      onPaste={(e) => handlePromptPaste(q.id, qIndex, e)}
                      placeholder={`e.g. What device converts kinetic energy into electrical power?`}
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

                {/* Canonical Answer & Explanation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Primary Correct Answer (Canonical Term)
                    </label>
                    <input
                      type="text"
                      value={q.primaryAnswer}
                      onChange={(e) => handleUpdateQuestion(q.id, 'primaryAnswer', e.target.value)}
                      placeholder="e.g. Photovoltaic Cell"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Explanation / Context (Shown on Review)
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => handleUpdateQuestion(q.id, 'explanation', e.target.value)}
                      placeholder="e.g. Uses semiconductor materials to absorb light... (Optional)"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                </div>

                {/* Acceptable Synonyms / Aliases */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Tag size={13} className="text-blue-500" />
                    <span>Acceptable Alternate Spellings / Aliases</span>
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    {q.acceptableAliases.map((alias, aIdx) => (
                      <span key={aIdx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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
                        className="px-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-hidden w-44"
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
                <Type size={16} className="text-blue-600 dark:text-blue-400" />
                <span>{instructions}</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {totalPages <= 1
                  ? `Complete all ${questions.length} identification prompts below and click Check Answers.`
                  : `Questions with images are displayed on their own dedicated page. Page ${activePageIndex + 1} of ${totalPages}.`}
              </p>
            </div>

            <div className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 shadow-2xs">
              {questions.length} Items • {totalMaxScore} Total Points
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 max-w-3xl mx-auto">
            {/* Header & Stepper (if multi-page) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Identification Assessment
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {titlePrompt}
                </h3>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {Array.from({ length: totalPages }).map((_, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setActivePageIndex(pIdx)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activePageIndex === pIdx
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Page {pIdx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Questions for current page */}
            <div className="space-y-5">
              {currentQuestionsSlice.map((q, localIdx) => {
                const globalIndex = questions.findIndex(item => item.id === q.id);
                const checked = validationResult?.checked;
                const result = validationResult?.itemResults?.[q.id];

                return (
                  <div 
                    key={q.id}
                    className={`p-4 rounded-xl border-2 transition-all space-y-4 ${
                      checked
                        ? result?.isCorrect
                          ? 'border-emerald-500/70 bg-emerald-50/40 dark:bg-emerald-950/30'
                          : 'border-rose-500/70 bg-rose-50/40 dark:bg-rose-950/30'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {q.questionPrompt.startsWith(`${globalIndex + 1}.`) ? q.questionPrompt : `${globalIndex + 1}. ${q.questionPrompt}`}
                      </p>

                      {checked && (
                        result?.isCorrect 
                          ? <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 shrink-0"><CheckCircle2 size={16} /> Correct</span>
                          : <span className="flex items-center gap-1 text-xs font-bold text-rose-600 shrink-0"><AlertCircle size={16} /> Incorrect</span>
                      )}
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

                    <div className="space-y-1.5">
                      <input
                        type="text"
                        disabled={checked}
                        value={userAnswers[q.id] || ''}
                        onChange={(e) => setUserAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleCheckAnswers()}
                        placeholder="Type precise term here..."
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all outline-hidden ${
                          checked
                            ? result?.isCorrect
                              ? 'bg-white dark:bg-slate-900 border border-emerald-500 text-slate-900 dark:text-white'
                              : 'bg-white dark:bg-slate-900 border border-rose-500 text-slate-900 dark:text-white'
                            : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20'
                        }`}
                      />

                      {checked && (
                        <div className="text-xs space-y-0.5 pt-1">
                          <p className={`font-semibold ${result?.isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                            {result?.feedback}
                          </p>
                          {q.explanation && (
                            <p className="text-slate-500 dark:text-slate-400 font-normal">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls if Multi-page */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={activePageIndex === 0}
                  onClick={() => setActivePageIndex(prev => prev - 1)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 disabled:opacity-30 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <ChevronLeft size={15} />
                  <span>Previous Page</span>
                </button>

                <span className="text-xs font-bold text-slate-500">
                  Page {activePageIndex + 1} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={activePageIndex === totalPages - 1}
                  onClick={() => setActivePageIndex(prev => prev + 1)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 disabled:opacity-30 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <span>Next Page</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Validation Footer */}
          <div className={`bg-white dark:bg-slate-900 border ${
            validationResult?.isFailed
              ? 'border-rose-300 ring-2 ring-rose-500/20'
              : validationResult?.isPassed && pointsPerCorrect > 0
              ? 'border-emerald-300 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800'
          } rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-3xl mx-auto`}>
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
                  {Object.values(userAnswers).filter(Boolean).length} of {questions.length} answers provided.
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
                  <span>Repeat Activity</span>
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
                  onClick={handleCheckAnswers}
                  disabled={Object.values(userAnswers).filter(Boolean).length === 0}
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
                    Bulk Paste Identification Questions
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Paste numbered items or questions. Each line or number will become its own question.
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
                  Paste Identification Questions / Items:
                </label>
                {bulkModal.rawText.trim() && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    Detected {parseIdentificationQuestions(bulkModal.rawText).length} questions
                  </span>
                )}
              </div>
              <textarea
                rows={10}
                value={bulkModal.rawText}
                onChange={(e) => setBulkModal(prev => prev ? { ...prev, rawText: e.target.value } : null)}
                placeholder={`1. The deadly 14th-century pandemic that killed nearly half of Europe's population. - Black Death\n2. The spiritual leader of the Catholic Church and Bishop of Rome who held immense power.\n3. The political, economic, and social system where land ownership was the primary source of power and wealth. - Feudalism\n4. The agricultural laborer bound to the feudal estate under the lord of the manor. - Serf\n5. The central economic unit in manorialism comprising castles, arable land, and village cottages.`}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden leading-relaxed"
                autoFocus
              />
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-blue-500" />
                  <span>Smart Formatting Support:</span>
                </div>
                <p>• Automatically creates a separate question item for each numbered statement (<code className="text-blue-600 dark:text-blue-400 font-mono">1.</code>, <code className="text-blue-600 dark:text-blue-400 font-mono">1)</code>, bullets, or lines).</p>
                <p>• If answers are included in line (e.g. <code className="text-emerald-600 dark:text-emerald-400 font-mono">1. Statement - Black Death</code> or <code className="text-emerald-600 dark:text-emerald-400 font-mono">[Black Death]</code>), they will be automatically extracted into the answer key.</p>
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
                  disabled={!bulkModal.rawText.trim() || parseIdentificationQuestions(bulkModal.rawText).length === 0}
                  onClick={() => handleApplyBulkQuestions(bulkModal.rawText, bulkModal.mode)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Import {parseIdentificationQuestions(bulkModal.rawText).length} Questions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
