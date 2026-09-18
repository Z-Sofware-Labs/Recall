import { useState, useEffect, useMemo, useCallback, FormEvent } from 'react';
import {
  FileText, CheckCircle2, AlertCircle,
  RotateCcw, Eye, Edit3,
  Save, X, Check, BookOpen, Sparkles,
  MessageSquare, AlignLeft, Plus, Trash2, ListChecks,
  Undo2, Redo2
} from 'lucide-react';
import { scoreService } from '../../services/scoreService';
import { QuizActivity } from '../../types/quiz';
import { useQuizUndoRedo } from '../../hooks/useQuizUndoRedo';
import { QuizUndoRedoButtons } from './QuizUndoRedoButtons';

interface EssayProps {
  initialData?: QuizActivity | null;
  onBack?: () => void;
  onSaveToCourse?: (activity: QuizActivity) => void;
}

export default function Essay({ initialData, onBack, onSaveToCourse }: EssayProps) {
  const [viewMode, setViewMode] = useState<'author' | 'preview'>('author');
  const [prompt, setPrompt] = useState(
    initialData?.prompt || 'Essay Type Questions'
  );
  const [instructions, setInstructions] = useState(
    initialData?.instructions || 'Write a comprehensive essay discussing both the clean energy benefits and environmental trade-offs.'
  );

  // Word limits (0 = unlimited / no min)
  const [minWords, setMinWords] = useState<number>(initialData?.data?.essay?.minWords ?? 25);
  const [maxWords, setMaxWords] = useState<number>(initialData?.data?.essay?.maxWords ?? 0);

  // Reference Benchmark & Key Concepts (Formative evaluation reference)
  const [referenceAnswer, setReferenceAnswer] = useState<string>(
    initialData?.data?.essay?.referenceAnswer ||
    'Hydroelectric dams provide reliable zero-emission renewable energy, flood control, and water storage. However, they cause ecological disruption including altered fish migration pathways, displacement of local communities, upstream reservoir flooding, and downstream sediment deprivation.'
  );
  const [keyConcepts, setKeyConcepts] = useState<string[]>(
    initialData?.data?.essay?.keyConcepts || [
      'Renewable / Zero-emission electricity generation',
      'Ecosystem & aquatic migration disruption',
      'Reservoir creation vs displacement of communities',
      'Economic benefits vs long-term maintenance costs'
    ]
  );
  const [newConceptInput, setNewConceptInput] = useState<string>('');

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Learner Response State
  const [learnerEssay, setLearnerEssay] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [selfCheckedConcepts, setSelfCheckedConcepts] = useState<Record<number, boolean>>({});
  const [teacherComments, setTeacherComments] = useState<string>(
    initialData?.data?.essay?.teacherComments ?? ''
  );

  // Sync initialData
  useEffect(() => {
    if (initialData) {
      setPrompt(initialData.prompt || 'Essay Topic Prompt');
      setInstructions(initialData.instructions || 'Write a thoughtful essay response addressing the prompt.');
      if (initialData.data?.essay) {
        setMinWords(initialData.data.essay.minWords ?? 25);
        setMaxWords(initialData.data.essay.maxWords ?? 0);
        if (initialData.data.essay.referenceAnswer !== undefined) {
          setReferenceAnswer(initialData.data.essay.referenceAnswer);
        }
        if (initialData.data.essay.keyConcepts) {
          setKeyConcepts(initialData.data.essay.keyConcepts);
        }
        if (initialData.data.essay.teacherComments !== undefined) {
          setTeacherComments(initialData.data.essay.teacherComments);
        }
      }
    }
  }, [initialData]);

  // Undo & Redo History State
  const currentSnapshot = useMemo(() => ({
    prompt,
    instructions,
    minWords,
    maxWords,
    referenceAnswer,
    keyConcepts,
    teacherComments,
  }), [
    prompt,
    instructions,
    minWords,
    maxWords,
    referenceAnswer,
    keyConcepts,
    teacherComments,
  ]);

  const applySnapshot = useCallback((state: typeof currentSnapshot) => {
    if (state.prompt !== undefined) setPrompt(state.prompt);
    if (state.instructions !== undefined) setInstructions(state.instructions);
    if (state.minWords !== undefined) setMinWords(state.minWords);
    if (state.maxWords !== undefined) setMaxWords(state.maxWords);
    if (state.referenceAnswer !== undefined) setReferenceAnswer(state.referenceAnswer);
    if (state.keyConcepts !== undefined) setKeyConcepts(state.keyConcepts);
    if (state.teacherComments !== undefined) setTeacherComments(state.teacherComments);
  }, []);

  const { canUndo, canRedo, handleUndo, handleRedo } = useQuizUndoRedo(currentSnapshot, applySnapshot);

  // Calculate word count
  const wordCount = learnerEssay.trim() ? learnerEssay.trim().split(/\s+/).length : 0;
  const charCount = learnerEssay.length;
  const hasInput = learnerEssay.trim().length > 0;
  const meetsMinRequirement = minWords === 0 ? hasInput : wordCount >= minWords;
  const exceedsMaxRequirement = maxWords > 0 && wordCount > maxWords;
  const canSubmit = hasInput && meetsMinRequirement && !exceedsMaxRequirement;

  // Add a new key concept
  const handleAddConcept = () => {
    const trimmed = newConceptInput.trim();
    if (!trimmed) return;
    setKeyConcepts([...keyConcepts, trimmed]);
    setNewConceptInput('');
  };

  const handleRemoveConcept = (index: number) => {
    setKeyConcepts(keyConcepts.filter((_, i) => i !== index));
  };

  // Toggle self-reflection checkbox
  const handleToggleSelfCheck = (index: number) => {
    setSelfCheckedConcepts(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Learner: Handle submit essay
  const handleSubmitEssay = (e: FormEvent) => {
    e.preventDefault();
    if (!hasInput) {
      alert('Please enter your essay response before submitting.');
      return;
    }
    if (minWords > 0 && wordCount < minWords) {
      alert(`Essay requires at least ${minWords} words (currently ${wordCount} words).`);
      return;
    }
    if (maxWords > 0 && wordCount > maxWords) {
      alert(`Essay exceeds the maximum limit of ${maxWords} words (currently ${wordCount} words).`);
      return;
    }

    setIsSubmitted(true);

    // Record submission with 0 points (ungraded formative practice, no score inflation)
    scoreService.recordQuizScore({
      courseId: 'proj_sample_01',
      quizId: initialData?.id || 'quiz_essay_01',
      quizTitle: prompt || 'Essay Activity',
      quizType: 'Essay',
      score: 0,
      maxScore: 0,
      correctCount: 0,
      mistakeCount: 0,
      attempts: 1,
    });
  };

  const handleResetForRevision = () => {
    setIsSubmitted(false);
  };

  const handleSaveToCourse = () => {
    const activity: QuizActivity = {
      id: initialData?.id || `quiz_essay_${Date.now()}`,
      name: prompt || 'Essay Activity',
      type: 'Essay',
      prompt,
      instructions,
      pointsPerCorrect: 0,
      deductionPerMistake: 0,
      retries: 0,
      isGraded: false, // Purely ungraded / formative
      passingScore: undefined,
      data: {
        essay: {
          minWords,
          maxWords,
          referenceAnswer,
          keyConcepts,
          teacherComments,
        },
      },
      totalPoints: 0,
      lastModified: Date.now(),
    };

    onSaveToCourse?.(activity);
    setSaveSuccessMessage('Essay activity saved! (Ungraded formative response with model benchmark reference)');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-200 select-none">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <FileText size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Question Type
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Essay (Ungraded Formative Reflection)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {prompt || 'Untitled Essay Prompt'}
            </h2>
          </div>
        </div>

        {/* View Mode Switcher, Undo/Redo & Save Buttons */}
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
              onClick={() => {
                setViewMode('preview');
                setIsSubmitted(false);
              }}
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
            title="Save this essay activity directly to Course Editor"
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
          {/* Prompt & Instructions Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Essay Question / Topic Prompt
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Discuss the trade-offs of nuclear power generation"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Student Writing Instructions
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Write a comprehensive response analyzing ecological and economic considerations."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Word Limits & Ungraded Notice */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {/* 1. Min Word Count (0 for unlimited) */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <AlignLeft size={15} className="text-blue-600 dark:text-blue-400" />
                    <span>Minimum Input Required</span>
                  </span>
                  {minWords === 0 && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Non-empty
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    value={minWords}
                    onChange={(e) => setMinWords(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-hidden"
                    placeholder="0"
                  />
                  <span className="text-xs font-medium text-slate-500">words</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {minWords === 0 ? 'Any non-empty response' : `Requires at least ${minWords} words`}
                </p>
              </div>

              {/* 2. Max Word Limit (0 for unlimited) */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <AlignLeft size={15} className="text-purple-600 dark:text-purple-400" />
                    <span>Max Word Limit</span>
                  </span>
                  {maxWords === 0 && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Unlimited
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={maxWords}
                    onChange={(e) => setMaxWords(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-hidden"
                    placeholder="0"
                  />
                  <span className="text-xs font-medium text-slate-500">words</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {maxWords === 0 ? '0 = No maximum limit' : `Upper ceiling: ${maxWords} words`}
                </p>
              </div>

              {/* 3. Grading Policy (Purely 0 pts / Non-graded) */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Scoring Policy</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    0 Points
                  </span>
                </label>
                <div className="pt-1">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-800/60">
                    Ungraded Practice Only
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  No automated points awarded to prevent false score inflation.
                </p>
              </div>
            </div>
          </div>

          {/* Reference Benchmark & Key Concepts Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Model Benchmark & Reference Feedback Guide
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Shown to the student after submission for formative reflection and self-comparison.
                  </p>
                </div>
              </div>
            </div>

            {/* Model Reference Answer */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-500" />
                <span>Benchmark / Sample Response (Optional)</span>
              </label>
              <textarea
                rows={4}
                value={referenceAnswer}
                onChange={(e) => setReferenceAnswer(e.target.value)}
                placeholder="Enter sample model essay points or reference summary for student reflection..."
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            {/* Key Expected Concepts / Checklist */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ListChecks size={14} className="text-blue-500" />
                <span>Key Concepts & Themes for Self-Checklist</span>
              </label>

              <div className="space-y-2">
                {keyConcepts.map((concept, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                        {concept}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveConcept(index)}
                      className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove concept"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add concept input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newConceptInput}
                  onChange={(e) => setNewConceptInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddConcept();
                    }
                  }}
                  placeholder="Add a key concept or topic point (e.g. 'Photosynthesis chemical formula')..."
                  className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddConcept}
                  disabled={!newConceptInput.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0"
                >
                  <Plus size={14} />
                  <span>Add Concept</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. LEARNER PREVIEW & COMPLETION WORKSPACE                                 */}
      {/* ========================================================================= */}
      {viewMode === 'preview' && (
        <div className="space-y-6">
          {/* Header instructions for learner */}
          <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                <span>{instructions}</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Requirement: <span className="font-semibold text-slate-700 dark:text-slate-300">{minWords > 0 ? `Minimum ${minWords} words` : 'At least one sentence / non-empty response'}</span> • Maximum: <span className="font-semibold text-slate-700 dark:text-slate-300">{maxWords > 0 ? `${maxWords} words` : 'Unlimited'}</span> • Ungraded self-reflection.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs shrink-0">
              <span>Ungraded Practice</span>
            </div>
          </div>

          {/* Prompt Banner */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-2">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Essay Topic
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
              {prompt}
            </h3>
          </div>

          {/* Student Essay Response Workspace */}
          <form onSubmit={handleSubmitEssay} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Edit3 size={15} className="text-blue-600" />
                <span>Your Essay Response</span>
              </label>

              {/* Word & Character Counter */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold ${!hasInput
                      ? 'text-slate-400 dark:text-slate-500'
                      : wordCount < minWords && minWords > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : wordCount > maxWords && maxWords > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                    {wordCount} words
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    ({minWords > 0 ? `Min: ${minWords}` : 'Min: 1'} • {maxWords > 0 ? `Max: ${maxWords}` : 'Max: Unlimited'})
                  </span>
                </div>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {charCount} characters
                </span>
              </div>
            </div>

            <textarea
              rows={9}
              disabled={isSubmitted}
              value={learnerEssay}
              onChange={(e) => setLearnerEssay(e.target.value)}
              placeholder="Type your essay response here. Make sure to express your ideas thoroughly..."
              className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-hidden font-normal"
            />

            {/* Submission Helper Message & Submit Action */}
            {!isSubmitted && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  {!hasInput ? (
                    <span className="text-slate-400 flex items-center gap-1">
                      <AlertCircle size={14} /> Enter your response above to view benchmark notes.
                    </span>
                  ) : !meetsMinRequirement ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <AlertCircle size={14} /> Please write at least {minWords - wordCount} more word{minWords - wordCount === 1 ? '' : 's'} to meet the requirement.
                    </span>
                  ) : exceedsMaxRequirement ? (
                    <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                      <AlertCircle size={14} /> Please shorten by {wordCount - maxWords} words to stay within limit.
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 size={14} /> Ready to submit.
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                >
                  <Check size={16} />
                  <span>Submit Essay & View Benchmark</span>
                </button>
              </div>
            )}
          </form>

          {/* ========================================================================= */}
          {/* POST-SUBMISSION REFLECTION WORKSPACE                                      */}
          {/* ========================================================================= */}
          {isSubmitted && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-3 duration-300">
              {/* Submission Recorded Banner (No Points) */}
              <div className="p-5 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900/60 dark:to-blue-950/30 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        Essay Submitted for Self-Reflection
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        Ungraded Activity
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Your response has been recorded. Review the benchmark points below to self-assess your coverage.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleResetForRevision}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcw size={14} />
                  <span>Edit Response</span>
                </button>
              </div>

              {/* Benchmark Reference & Self-Reflection Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Model Benchmark Summary */}
                {referenceAnswer && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                      <Sparkles size={16} />
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Benchmark Reference Guide
                      </h5>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                      {referenceAnswer}
                    </p>
                  </div>
                )}

                {/* Key Concepts Self-Checklist */}
                {keyConcepts.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <ListChecks size={16} />
                        <h5 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Self-Reflection Checklist
                        </h5>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {Object.values(selfCheckedConcepts).filter(Boolean).length} of {keyConcepts.length} checked
                      </span>
                    </div>

                    <div className="space-y-2">
                      {keyConcepts.map((concept, index) => (
                        <div
                          key={index}
                          onClick={() => handleToggleSelfCheck(index)}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selfCheckedConcepts[index]
                              ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                            }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${selfCheckedConcepts[index]
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                            }`}>
                            {selfCheckedConcepts[index] && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span className={`text-xs select-none ${selfCheckedConcepts[index]
                              ? 'font-semibold text-slate-900 dark:text-white'
                              : 'text-slate-700 dark:text-slate-300'
                            }`}>
                            {concept}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Teacher / Coach Remarks */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-indigo-600" />
                  <span>Instructor Notes & Qualitative Feedback (Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={teacherComments}
                  onChange={(e) => setTeacherComments(e.target.value)}
                  placeholder="Add qualitative thoughts, feedback, or coaching advice..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
