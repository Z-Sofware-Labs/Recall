import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowDownUp, CheckCircle2, AlertCircle,
  RotateCcw, Eye, Edit3, Save, X, Check, HelpCircle,
  Sliders, Plus, Trash2, ChevronLeft, ChevronRight,
  Sparkles, Undo2, Redo2, MinusCircle, Award, Layers
} from 'lucide-react';
import { DropdownQuestionItem, DropdownOption, DropdownActivityData, QuizActivity } from '../../types/quiz';
import { useQuizUndoRedo } from '../../hooks/useQuizUndoRedo';
import { QuizUndoRedoButtons } from './QuizUndoRedoButtons';
import { parsePastedChoices } from '../../utils/quizPasteParser';

const defaultQuestions: DropdownQuestionItem[] = [
  {
    id: 'dd_q_1',
    prompt: 'React is a popular frontend JavaScript _________.',
    options: [
      { id: 'opt_1', text: 'Library', isCorrect: true },
      { id: 'opt_2', text: 'Database', isCorrect: false },
      { id: 'opt_3', text: 'Operating System', isCorrect: false },
    ],
    explanation: '',
  },
];

interface DropdownSelectProps {
  initialData?: QuizActivity | null;
  onBack?: () => void;
  onSaveToCourse?: (activity: QuizActivity) => void;
}

export default function DropdownSelect({ initialData, onBack, onSaveToCourse }: DropdownSelectProps) {
  const [viewMode, setViewMode] = useState<'author' | 'preview'>('author');

  // Title & Instructions
  const [activityTitle, setActivityTitle] = useState<string>(
    initialData?.prompt || 'Dropdown Selection'
  );
  const [instructions, setInstructions] = useState<string>(
    initialData?.instructions || 'Choose the correct term from the drop-down menu for each item below.'
  );

  // Unlimited Questions State
  const [questions, setQuestions] = useState<DropdownQuestionItem[]>(() => {
    if (initialData?.data?.dropdownSelect?.questions && initialData.data.dropdownSelect.questions.length > 0) {
      return initialData.data.dropdownSelect.questions;
    }
    return defaultQuestions;
  });

  // Display Mode & Shuffling
  const [displayPerPage, setDisplayPerPage] = useState<1 | 3 | 5>(() => {
    const val = initialData?.data?.dropdownSelect?.displayPerPage as any;
    return (val === 1 || val === 3 || val === 5) ? val : 1;
  });
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(
    initialData?.data?.dropdownSelect?.shuffleOptions ?? false
  );
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(
    initialData?.data?.dropdownSelect?.shuffleQuestions ?? false
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
    displayPerPage,
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
    if (state.displayPerPage !== undefined) setDisplayPerPage(state.displayPerPage);
    if (state.shuffleOptions !== undefined) setShuffleOptions(state.shuffleOptions);
    if (state.shuffleQuestions !== undefined) setShuffleQuestions(state.shuffleQuestions);
  }, []);

  const { canUndo, canRedo, handleUndo, handleRedo } = useQuizUndoRedo(currentSnapshot, applySnapshot);

  const updateQuestionsAndPush = useCallback((newQuestions: DropdownQuestionItem[]) => {
    setQuestions(newQuestions);
  }, []);

  // Question editing actions
  const handleAddQuestion = () => {
    const newQ: DropdownQuestionItem = {
      id: `dd_q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      prompt: `Identify the capital of _________.`,
      options: [
        { id: `opt_${Date.now()}_1`, text: 'Option A (Correct)', isCorrect: true },
        { id: `opt_${Date.now()}_2`, text: 'Option B', isCorrect: false },
      ],
      explanation: '',
    };
    updateQuestionsAndPush([...questions, newQ]);
  };

  const handleDeleteQuestion = (id: string) => {
    if (questions.length <= 1) {
      alert("At least one question is required.");
      return;
    }
    const next = questions.filter(q => q.id !== id);
    updateQuestionsAndPush(next);
  };

  const handleUpdatePrompt = (id: string, text: string) => {
    const next = questions.map(q => q.id === id ? { ...q, prompt: text } : q);
    updateQuestionsAndPush(next);
  };

  const handleUpdateExplanation = (id: string, text: string) => {
    const next = questions.map(q => q.id === id ? { ...q, explanation: text } : q);
    updateQuestionsAndPush(next);
  };

  const handleAddOption = (questionId: string) => {
    const next = questions.map(q => {
      if (q.id !== questionId) return q;
      const newOpt: DropdownOption = {
        id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        text: 'New Option',
        isCorrect: false
      };
      return { ...q, options: [...q.options, newOpt] };
    });
    updateQuestionsAndPush(next);
  };

  const handleDeleteOption = (questionId: string, optionId: string) => {
    const next = questions.map(q => {
      if (q.id !== questionId) return q;
      if (q.options.length <= 2) {
        alert("A dropdown menu must have at least 2 options.");
        return q;
      }
      const filtered = q.options.filter(o => o.id !== optionId);
      if (!filtered.some(o => o.isCorrect)) {
        filtered[0].isCorrect = true;
      }
      return { ...q, options: filtered };
    });
    updateQuestionsAndPush(next);
  };

  const handleUpdateOptionText = (questionId: string, optionId: string, text: string) => {
    const next = questions.map(q => {
      if (q.id !== questionId) return q;
      return {
        ...q,
        options: q.options.map(o => o.id === optionId ? { ...o, text } : o)
      };
    });
    updateQuestionsAndPush(next);
  };

  const applyParsedChoicesToQuestion = (questionId: string, parsed: ReturnType<typeof parsePastedChoices>, startIdx = 0) => {
    if (parsed.length === 0) return;

    const next = questions.map(q => {
      if (q.id !== questionId) return q;

      const newOptions = [...q.options];
      let correctIdFromPaste: string | null = null;

      parsed.forEach((item, pIdx) => {
        const destIndex = startIdx + pIdx;
        if (destIndex < newOptions.length) {
          newOptions[destIndex] = {
            ...newOptions[destIndex],
            text: item.text,
          };
          if (item.isCorrect) {
            correctIdFromPaste = newOptions[destIndex].id;
          }
        } else {
          const newId = `opt_${Date.now()}_${Math.random().toString(36).substring(2, 5)}_${newOptions.length}`;
          newOptions.push({
            id: newId,
            text: item.text,
            isCorrect: false
          });
          if (item.isCorrect) {
            correctIdFromPaste = newId;
          }
        }
      });

      if (correctIdFromPaste) {
        return {
          ...q,
          options: newOptions.map(o => ({ ...o, isCorrect: o.id === correctIdFromPaste }))
        };
      }

      return { ...q, options: newOptions };
    });

    updateQuestionsAndPush(next);
  };

  const handleOptionPaste = (questionId: string, optionIndex: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteText = e.clipboardData.getData('text');
    if (!pasteText) return;

    const parsed = parsePastedChoices(pasteText);
    if (parsed.length <= 1) {
      return;
    }

    e.preventDefault();
    applyParsedChoicesToQuestion(questionId, parsed, optionIndex);
  };

  const handleMarkCorrectOption = (questionId: string, optionId: string) => {
    const next = questions.map(q => {
      if (q.id !== questionId) return q;
      return {
        ...q,
        options: q.options.map(o => ({ ...o, isCorrect: o.id === optionId }))
      };
    });
    updateQuestionsAndPush(next);
  };

  // Bulk Import
  const [bulkModal, setBulkModal] = useState<{ isOpen: boolean; rawText: string }>({ isOpen: false, rawText: '' });

  const handleImportBulk = () => {
    const rawText = bulkModal.rawText.trim();
    if (!rawText) return;

    const parsed: DropdownQuestionItem[] = [];

    if (rawText.includes('**')) {
      const parts = rawText.split('**');
      const questionsPart = parts[0].trim();
      const commonChoicesPart = parts[1] ? parts[1].trim() : '';

      const qLines = questionsPart.split('\n').map(l => l.trim()).filter(Boolean);
      const choiceLines = commonChoicesPart.split('\n').map(l => l.trim()).filter(Boolean);

      const commonOptions: DropdownOption[] = choiceLines.map((line, rIdx) => {
        const isCorrect = line.startsWith('*');
        const cleanText = isCorrect ? line.substring(1).trim() : line;
        return {
          id: `opt_bulk_${Date.now()}_common_${rIdx}_${Math.random().toString(36).substring(2, 5)}`,
          text: cleanText,
          isCorrect
        };
      });

      qLines.forEach((qLine, bIdx) => {
        const promptText = qLine.replace(/^\d+[\.\)\:\-]\s+/, '').trim();
        if (promptText) {
          const options = commonOptions.map((opt, rIdx) => ({
            ...opt,
            id: `opt_bulk_${Date.now()}_${bIdx}_${rIdx}_${Math.random().toString(36).substring(2, 5)}`
          }));

          if (!options.some(o => o.isCorrect) && options.length > 0) {
            options[0].isCorrect = true;
          }

          parsed.push({
            id: `dd_bulk_${Date.now()}_${bIdx}_${Math.random().toString(36).substring(2, 5)}`,
            prompt: promptText,
            options,
            explanation: ''
          });
        }
      });
    } else {
      const blocks = rawText.split('\n\n').map(b => b.trim()).filter(Boolean);
      blocks.forEach((block, bIdx) => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length >= 2) {
          const promptText = lines[0];
          const rawOpts = lines.slice(1);
          const options: DropdownOption[] = rawOpts.map((ro, rIdx) => {
            const isCorrect = ro.startsWith('*');
            const cleanText = isCorrect ? ro.substring(1).trim() : ro;
            return {
              id: `opt_bulk_${Date.now()}_${bIdx}_${rIdx}`,
              text: cleanText,
              isCorrect
            };
          });

          if (!options.some(o => o.isCorrect) && options.length > 0) {
            options[0].isCorrect = true;
          }

          parsed.push({
            id: `dd_bulk_${Date.now()}_${bIdx}`,
            prompt: promptText,
            options,
            explanation: ''
          });
        }
      });
    }

    if (parsed.length > 0) {
      updateQuestionsAndPush([...questions, ...parsed]);
      setBulkModal({ isOpen: false, rawText: '' });
    }
  };

  // Learner preview state
  const [previewQuestions, setPreviewQuestions] = useState<DropdownQuestionItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(retries);
  const [validationResult, setValidationResult] = useState<{
    checked: boolean;
    score: number;
    maxScore: number;
    passed: boolean;
    detailedResults: { questionId: string; prompt: string; userAnsText: string; correctAnsText: string; isCorrect: boolean; explanation?: string }[];
  } | null>(null);

  const startPreviewMode = () => {
    let list = questions.map(q => {
      let opts = [...q.options].sort((a, b) => a.text.localeCompare(b.text));
      return { ...q, options: opts };
    });
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

  const pageSize = displayPerPage;
  const totalPages = Math.ceil(previewQuestions.length / pageSize);
  const activePageQuestions = useMemo(() => {
    const start = activePageIndex * pageSize;
    return previewQuestions.slice(start, start + pageSize);
  }, [previewQuestions, activePageIndex, pageSize]);

  const handleCheckAnswers = () => {
    let score = 0;
    const detailed = previewQuestions.map(q => {
      const selectedOptId = userAnswers[q.id];
      const selectedOpt = q.options.find(o => o.id === selectedOptId);
      const correctOpt = q.options.find(o => o.isCorrect);

      const isCorrect = selectedOpt ? selectedOpt.isCorrect : false;
      if (isCorrect) score += pointsPerCorrect;

      return {
        questionId: q.id,
        prompt: q.prompt,
        userAnsText: selectedOpt ? selectedOpt.text : '(No Selection)',
        correctAnsText: correctOpt ? correctOpt.text : '',
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
        id: initialData?.id || `quiz_dd_${Date.now()}`,
        name: activityTitle || 'Dropdown Select Challenge',
        type: 'Dropdown Select',
        prompt: activityTitle,
        instructions: instructions,
        pointsPerCorrect,
        deductionPerMistake,
        retries,
        passingScore,
        totalPoints: totalMaxScore,
        data: {
          dropdownSelect: {
            questions,
            displayPerPage,
            shuffleOptions,
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
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-200 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
            <ArrowDownUp size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 shrink-0">
                Question Type
              </span>
              <span className="text-xs text-slate-400 shrink-0">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Dropdown Select ({questions.length} Questions)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">
              {activityTitle || 'Untitled Dropdown Select Assessment'}
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
                  placeholder="e.g. Dropdown Selection Assessment (Optional)"
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
                  {pointsPerCorrect === 0 && <span className="text-[10px] font-medium text-slate-450">Grayed out</span>}
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
                    <MinusCircle size={15} className="text-rose-600 dark:text-rose-455" />
                    <span>Deduction per error</span>
                  </span>
                  {pointsPerCorrect === 0 && <span className="text-[10px] font-medium text-slate-450">Grayed out</span>}
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
                  {pointsPerCorrect > 0 ? 'Subtracted on wrong choice' : 'No deductions'}
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
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
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

          {/* Main Question Stack (Full Width) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Dropdown select items ({questions.length})
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
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 relative group"
                >
                  <div className="absolute top-4 right-4 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400">Item #{idx + 1}</span>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Question text */}
                  <div className="space-y-1.5 max-w-[85%]">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Question Prompt (use _________ to represent the dropdown blank)
                    </label>
                    <input
                      type="text"
                      value={q.prompt}
                      onChange={(e) => handleUpdatePrompt(q.id, e.target.value)}
                      placeholder="e.g. The capital of France is _________."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
                    />
                  </div>

                  {/* Options list */}
                  <div className="space-y-2.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Dropdown Choice Options (Minimum 2)
                    </label>

                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={opt.id} className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            checked={opt.isCorrect}
                            onChange={() => handleMarkCorrectOption(q.id, opt.id)}
                            className="rounded-full border-slate-300 text-blue-600 focus:ring-0 cursor-pointer shadow-3xs"
                          />
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => handleUpdateOptionText(q.id, opt.id, e.target.value)}
                            onPaste={(e) => handleOptionPaste(q.id, oIdx, e)}
                            placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-hidden focus:border-blue-500"
                          />
                          <button
                            onClick={() => handleDeleteOption(q.id, opt.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            <MinusCircle size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleAddOption(q.id)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-450 hover:underline flex items-center gap-1 mt-1 transition-colors cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Add Option</span>
                    </button>
                  </div>

                  {/* Explanation */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Explanation (Optional)
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => handleUpdateExplanation(q.id, e.target.value)}
                      placeholder="Why is the selected answer correct? (Optional)"
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
                <ArrowDownUp size={13} className="text-blue-500" />
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
                    <span>{q.prompt}</span>
                  </div>

                  <select
                    disabled={validationResult?.checked}
                    value={userAnswers[q.id] || ''}
                    onChange={(e) => setUserAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-blue-500 outline-hidden disabled:opacity-60 cursor-pointer shadow-3xs"
                  >
                    <option value="" disabled>-- Select correct answer option --</option>
                    {[...q.options].sort((a, b) => a.text.localeCompare(b.text)).map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.text}</option>
                    ))}
                  </select>

                  {validationResult?.checked && (() => {
                    const itemRes = validationResult.detailedResults.find(r => r.questionId === q.id);
                    if (!itemRes) return null;
                    return (
                      <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${itemRes.isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80 text-emerald-850 dark:text-emerald-400'
                          : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/80 text-rose-855 dark:text-rose-400'
                        }`}>
                        {itemRes.isCorrect ? <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" /> : <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />}
                        <div className="space-y-1">
                          <p className="font-bold">{itemRes.isCorrect ? 'Correct!' : 'Incorrect'}</p>
                          <p className="text-[11px] opacity-90">Correct answer: <span className="font-bold bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-800">{itemRes.correctAnsText}</span></p>
                          {q.explanation && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-1 font-sans">Explanation: {q.explanation}</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
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

          {/* Checks and retakes */}
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

      {/* Bulk Import Modal */}
      {bulkModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Bulk Import Dropdown Questions</h3>
              <p className="text-xs text-slate-400 mt-1">
                Paste your questions and solutions. Separate standard questions with a blank line. Prepend an asterisk (*) to the correct option.
                <br />
                <strong>Common choices mode:</strong> List your numbered questions, then a double asterisk (**) line, followed by choices that will be used for all of them.
              </p>
            </div>
            <textarea
              value={bulkModal.rawText}
              onChange={(e) => setBulkModal(prev => ({ ...prev, rawText: e.target.value }))}
              placeholder={`Standard format:
React is a JavaScript _________.
*Library
Framework
Database

Node.js runs on the _________ JavaScript engine.
SpiderMonkey
*V8
Chakra

Or common choices format:
1. Which of these fruits are in green and red?
2. This is a foul-smelling fruit common in Asia.
3. This is commonly yellow and long
4. Small fruits found on top of trees and mostly red.
**
Apple
Banana
Cherry
Durian`}
              rows={10}
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
