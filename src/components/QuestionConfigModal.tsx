import { useState, useEffect, FormEvent } from 'react';
import { Hash, Award, RotateCcw, Check, ShieldAlert, Ban } from 'lucide-react';
import ModalWindow from './common/ModalWindow';

export interface QuestionConfig {
  questionCount: number;
  pointsPerQuestion: number;
  retries: number;
  isGraded: boolean;
  passingScore?: number;
}

interface QuestionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionTypeName: string;
  onConfirm: (config: QuestionConfig) => void;
}

export default function QuestionConfigModal({
  isOpen,
  onClose,
  questionTypeName,
  onConfirm,
}: QuestionConfigModalProps) {
  const [questionCount, setQuestionCount] = useState<number>(1);
  const [pointsPerQuestion, setPointsPerQuestion] = useState<number>(1);
  const [retries, setRetries] = useState<number>(0);
  const [passingScore, setPassingScore] = useState<number>(1);

  const isGraded = pointsPerQuestion > 0;
  const totalPossiblePoints = (questionCount || 1) * (pointsPerQuestion || 0);

  useEffect(() => {
    if (isOpen) {
      setQuestionCount(1);
      setPointsPerQuestion(1);
      setRetries(0);
      setPassingScore(1);
    }
  }, [isOpen]);

  // Adjust passing score when question count or points change
  useEffect(() => {
    if (isGraded) {
      const calculatedPass = Math.max(1, Math.ceil(totalPossiblePoints * 0.7));
      setPassingScore(prev => (prev > totalPossiblePoints || prev <= 0) ? calculatedPass : prev);
    }
  }, [questionCount, pointsPerQuestion, isGraded, totalPossiblePoints]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const finalQuestionCount = Math.max(1, questionCount || 1);
    const finalPointsPerQuestion = Math.max(0, pointsPerQuestion ?? 0);
    const isGradedTest = finalPointsPerQuestion > 0;
    const maxScore = finalQuestionCount * finalPointsPerQuestion;

    onConfirm({
      questionCount: finalQuestionCount,
      pointsPerQuestion: finalPointsPerQuestion,
      retries: Math.max(0, retries || 0),
      isGraded: isGradedTest,
      passingScore: isGradedTest ? Math.min(maxScore, Math.max(1, passingScore || 1)) : undefined,
    });
  };

  return (
    <ModalWindow
      isOpen={isOpen}
      onClose={onClose}
      title={`Configure ${questionTypeName}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-base font-semibold text-slate-900 dark:text-white">
            Question Set Parameters
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define question count, scoring (put 0 for non-graded), and passing score criteria.
          </p>
        </div>

        {/* 1. How many questions? */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Hash size={15} className="text-blue-600 dark:text-blue-400" />
            <span>How many questions?</span>
          </label>
          <input
            type="number"
            min="1"
            max="100"
            required
            value={questionCount}
            onChange={(e) => setQuestionCount(parseInt(e.target.value, 10) || 1)}
            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-hidden font-medium text-sm transition-all"
            placeholder="e.g. 5"
          />
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Number of items to include in this section.
          </p>
        </div>

        {/* 2. How many points per question? (0 for non-graded) */}
        <div className="space-y-1.5">
          <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <Award size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span>Score for each correct answer (0 for non-graded)</span>
            </span>
            {!isGraded && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                Non-graded
              </span>
            )}
          </label>
          <input
            type="number"
            min="0"
            max="1000"
            required
            value={pointsPerQuestion}
            onChange={(e) => setPointsPerQuestion(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-hidden font-medium text-sm transition-all"
            placeholder="0"
          />
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {isGraded 
              ? `Graded section: ${pointsPerQuestion} pt/ea (Total max: ${totalPossiblePoints} pts)` 
              : 'Set to 0 for non-graded practice (no score/grade recorded).'}
          </p>
        </div>

        {/* 3. Passing Score (Automatically grayed out if non-graded) */}
        <div className={`space-y-1.5 p-3.5 rounded-xl border transition-all ${
          isGraded 
            ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800' 
            : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
        }`}>
          <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Passing Score (Required to pass)</span>
            {!isGraded && (
              <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                <Ban size={12} /> Grayed out
              </span>
            )}
          </label>
          <input
            type="number"
            min="1"
            max={totalPossiblePoints || 1}
            disabled={!isGraded}
            value={isGraded ? passingScore : ''}
            onChange={(e) => setPassingScore(parseInt(e.target.value, 10) || 1)}
            className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white disabled:bg-slate-100 disabled:dark:bg-slate-950 disabled:text-slate-400 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500 outline-hidden font-semibold text-sm transition-all"
            placeholder={isGraded ? 'e.g. 7' : 'N/A (Non-graded)'}
          />
          {isGraded ? (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1 pt-0.5">
              <ShieldAlert size={13} className="shrink-0 mt-0.5" />
              <span>A student fails if score is below {passingScore} pts. If the student fails, the test must be repeated.</span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
              Non-graded tests have no passing score to achieve.
            </p>
          )}
        </div>

        {/* 4. How many retries? */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <RotateCcw size={15} className="text-amber-600 dark:text-amber-400" />
            <span>How many retries (0 for unlimited)?</span>
          </label>
          <input
            type="number"
            min="0"
            max="50"
            required
            value={retries}
            onChange={(e) => setRetries(parseInt(e.target.value, 10) || 0)}
            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-hidden font-medium text-sm transition-all"
            placeholder="0"
          />
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Set to <span className="font-semibold text-slate-600 dark:text-slate-300">0</span> for unlimited retries, or specify a retry allowance.
          </p>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Check size={15} />
            <span>Create Questions</span>
          </button>
        </div>
      </form>
    </ModalWindow>
  );
}
