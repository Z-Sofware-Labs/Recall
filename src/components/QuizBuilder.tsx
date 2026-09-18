import { useState, useEffect, lazy, Suspense } from 'react';
import {
  Tags, MousePointerClick, GitCommit, ListOrdered, FileText,
  Type, ListChecks, CheckSquare, ArrowDownUp, CheckCircle,
  HelpCircle, Trash2, Award, RotateCcw, Hash, Layers, CheckCircle2,
  Edit, ArrowRight, Loader2, ChevronDown, Search, X
} from 'lucide-react';
import QuestionConfigModal, { QuestionConfig } from './QuestionConfigModal';
import { QuizActivity } from '../types/quiz';

// Lazy-load individual quiz components to ensure instant load time for Quiz Builder
const Categorization = lazy(() => import('./quiz/Categorization'));
const ClickAnImage = lazy(() => import('./quiz/ClickAnImage'));
const ConnectTheDots = lazy(() => import('./quiz/ConnectTheDots'));
const Enumeration = lazy(() => import('./quiz/Enumeration'));
const Essay = lazy(() => import('./quiz/Essay'));
const Identification = lazy(() => import('./quiz/Identification'));
const MultipleChoice = lazy(() => import('./quiz/MultipleChoice'));
const MultipleResponse = lazy(() => import('./quiz/MultipleResponse'));
const Sequencing = lazy(() => import('./quiz/Sequencing'));
const TrueFalse = lazy(() => import('./quiz/TrueFalse'));
const Numeric = lazy(() => import('./quiz/Numeric'));
const DropdownSelect = lazy(() => import('./quiz/DropdownSelect'));

export interface QuizQuestionBlock {
  id: string;
  type: string;
  questionCount: number;
  pointsPerQuestion: number;
  retries: number;
  totalPoints: number;
  isGraded?: boolean;
  passingScore?: number;
}

interface QuizBuilderProps {
  editingQuiz?: QuizActivity | null;
  onSaveQuiz?: (quiz: QuizActivity) => void;
  onNavigateToCourse?: () => void;
  onClearEditingQuiz?: () => void;
}

const questionTypes = [
  { name: 'Categorization', icon: Tags, description: 'Learners sort randomized items or terms into distinct predefined groups, categories, or columns.' },
  { name: 'Click an Image', icon: MousePointerClick, description: 'Interactive image hotspot challenge: learners click directly on diagram parts, maps, or anatomy regions.' },
  { name: 'Connect the Dots', icon: GitCommit, description: 'Interactive matching pairs: learners drag lines or connect related terms between left and right columns.' },
  { name: 'Dropdown Select', icon: ChevronDown, description: 'Inline drop-down selector: learners choose the correct term from a dropdown list to answer each item.' },
  { name: 'Enumeration', icon: ListOrdered, description: 'Direct term listing: learners input items with case-sensitivity, order tolerance, and synonym keys.' },
  { name: 'Essay', icon: FileText, description: 'Open-ended comprehensive response evaluated directly with manual teacher scoring.' },
  { name: 'Identification', icon: Type, description: 'Direct term identification with synonym support; supports direct entry of answers.' },
  { name: 'Multiple Choice', icon: ListChecks, description: 'Single best answer selection from randomized options with per-page question navigation.' },
  { name: 'Multiple Response', icon: CheckSquare, description: 'Multi-select checkboxes allowing multiple valid choices with partial credit.' },
  { name: 'Numeric', icon: Hash, description: 'Algebra, equation, fraction, and decimal challenge: evaluates equivalent mathematical expressions automatically.' },
  { name: 'Sequencing', icon: ArrowDownUp, description: 'Chronological or logical re-ordering via full-box drag-and-drop or stepper arrows.' },
  { name: 'True or False', icon: CheckCircle, description: 'Evaluate statements with Traditional or Modified (word replacement) True/False modes.' },
];

function DesignerLoadingFallback() {
  return (
    <div className="w-full min-h-[400px] flex flex-col items-center justify-center p-12 space-y-4 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse">
      <Loader2 size={32} className="text-blue-600 animate-spin" />
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
        Loading Question Designer...
      </span>
    </div>
  );
}

export default function QuizBuilder({
  editingQuiz,
  onSaveQuiz,
  onNavigateToCourse,
  onClearEditingQuiz
}: QuizBuilderProps) {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [pendingTypeInfo, setPendingTypeInfo] = useState<{ type: string; subtype?: string } | null>(null);
  const [questionBlocks, setQuestionBlocks] = useState<QuizQuestionBlock[]>([]);
  const [trueFalseMode, setTrueFalseMode] = useState<'traditional' | 'modified'>('traditional');
  const [quizSearchQuery, setQuizSearchQuery] = useState('');

  const [activeEditor, setActiveEditor] = useState<
    | 'Categorization'
    | 'Click an Image'
    | 'Connect the Dots'
    | 'Enumeration'
    | 'Essay'
    | 'Identification'
    | 'Multiple Choice'
    | 'Multiple Response'
    | 'Sequencing'
    | 'True or False'
    | 'Numeric'
    | 'Dropdown Select'
    | null
  >(
    (editingQuiz?.type as any) || null
  );

  useEffect(() => {
    if (editingQuiz?.type) {
      setActiveEditor(editingQuiz.type as any);
      if (editingQuiz.type === 'True or False' && editingQuiz.data?.trueFalse?.mode) {
        setTrueFalseMode(editingQuiz.data.trueFalse.mode);
      }
    }
  }, [editingQuiz]);

  const handleTypeClick = (typeName: string) => {
    if (typeName === 'Categorization') {
      setActiveEditor('Categorization');
      return;
    }
    if (typeName === 'Click an Image') {
      setActiveEditor('Click an Image');
      return;
    }
    if (typeName === 'Connect the Dots') {
      setActiveEditor('Connect the Dots');
      return;
    }
    if (typeName === 'Enumeration') {
      setActiveEditor('Enumeration');
      return;
    }
    if (typeName === 'Essay') {
      setActiveEditor('Essay');
      return;
    }
    if (typeName === 'Identification') {
      setActiveEditor('Identification');
      return;
    }
    if (typeName === 'Multiple Choice') {
      setActiveEditor('Multiple Choice');
      return;
    }
    if (typeName === 'Multiple Response') {
      setActiveEditor('Multiple Response');
      return;
    }
    if (typeName === 'Sequencing') {
      setActiveEditor('Sequencing');
      return;
    }
    if (typeName === 'True or False') {
      setActiveEditor('True or False');
      return;
    }
    if (typeName === 'Numeric') {
      setActiveEditor('Numeric');
      return;
    }
    if (typeName === 'Dropdown Select') {
      setActiveEditor('Dropdown Select');
      return;
    }

    setPendingTypeInfo({ type: typeName });
    setIsConfigModalOpen(true);
  };

  const handleConfigConfirm = (config: QuestionConfig) => {
    if (!pendingTypeInfo) return;

    const fullTypeName = pendingTypeInfo.subtype
      ? `${pendingTypeInfo.type} (${pendingTypeInfo.subtype})`
      : pendingTypeInfo.type;

    const newBlock: QuizQuestionBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: fullTypeName,
      questionCount: config.questionCount,
      pointsPerQuestion: config.pointsPerQuestion,
      retries: config.retries,
      totalPoints: config.questionCount * config.pointsPerQuestion,
      isGraded: config.isGraded,
      passingScore: config.passingScore,
    };

    setQuestionBlocks((prev) => [...prev, newBlock]);
    setIsConfigModalOpen(false);
    setPendingTypeInfo(null);
  };

  const handleDeleteBlock = (id: string) => {
    setQuestionBlocks((prev) => prev.filter((block) => block.id !== id));
  };

  const totalQuestions = questionBlocks.reduce((acc, curr) => acc + curr.questionCount, 0);
  const totalScore = questionBlocks.reduce((acc, curr) => acc + curr.totalPoints, 0);

  // Render Dedicated Designer when an editor is active with Suspense for instant transition
  if (activeEditor === 'Categorization') {
    return (
      <Suspense fallback={<DesignerLoadingFallback />}>
        <Categorization
          initialData={editingQuiz}
          onBack={() => {
            setActiveEditor(null);
            onClearEditingQuiz?.();
          }}
          onSaveToCourse={(activity) => {
            onSaveQuiz?.(activity);
          }}
        />
      </Suspense>
    );
  }

  if (activeEditor === 'Click an Image') {
    return (
      <Suspense fallback={<DesignerLoadingFallback />}>
        <ClickAnImage
          initialData={editingQuiz}
          onBack={() => {
            setActiveEditor(null);
            onClearEditingQuiz?.();
          }}
          onSaveToCourse={(activity) => {
            onSaveQuiz?.(activity);
          }}
        />
      </Suspense>
    );
  }

  if (activeEditor === 'Connect the Dots') {
    return (
      <Suspense fallback={<DesignerLoadingFallback />}>
        <ConnectTheDots
          initialData={editingQuiz}
          onBack={() => {
            setActiveEditor(null);
            onClearEditingQuiz?.();
          }}
          onSaveToCourse={(activity) => {
            onSaveQuiz?.(activity);
          }}
        />
      </Suspense>
    );
  }

  if (activeEditor === 'Enumeration') {
    return (
      <Suspense fallback={<DesignerLoadingFallback />}>
        <Enumeration
          initialData={editingQuiz}
          onBack={() => {
            setActiveEditor(null);
            onClearEditingQuiz?.();
          }}
          onSaveToCourse={(activity) => {
            onSaveQuiz?.(activity);
          }}
        />
      </Suspense>
    );
  }

  if (activeEditor === 'Essay') {
    return (
      <Suspense fallback={<DesignerLoadingFallback />}>
        <Essay
          initialData={editingQuiz}
          onBack={() => {
            setActiveEditor(null);
            onClearEditingQuiz?.();
          }}
          onSaveToCourse={(activity) => {
            onSaveQuiz?.(activity);
          }}
        />
      </Suspense>
    );
  }

  if (activeEditor === 'Identification') {
    return (
      <Suspense fallback={<DesignerLoadingFallback />}>
        <Identification
          initialData={editingQuiz}
          onBack={() => {
            setActiveEditor(null);
            onClearEditingQuiz?.();
          }}
          onSaveToCourse={(activity) => {
            onSaveQuiz?.(activity);
          }}
        />
      </Suspense>
    );
  }

  if (activeEditor === 'Multiple Choice') {
    return (
      <Suspense fallback={<DesignerLoadingFallback />}>
        <MultipleChoice
          initialData={editingQuiz}
          onBack={() => {
            setActiveEditor(null);
            onClearEditingQuiz?.();
          }}
          onSaveToCourse={(activity) => {
            onSaveQuiz?.(activity);
          }}
        />
      </Suspense>
    );
  }

  if (activeEditor === 'Multiple Response') {
    return (
      <Suspense fallback={<DesignerLoadingFallback />}>
        <MultipleResponse
          initialData={editingQuiz}
          onBack={() => {
            setActiveEditor(null);
            onClearEditingQuiz?.();
          }}
          onSaveToCourse={(activity) => {
            onSaveQuiz?.(activity);
          }}
        />
      </Suspense>
    );
  }

  if (activeEditor === 'Sequencing') {
    return (
      <Suspense fallback={<DesignerLoadingFallback />}>
        <Sequencing
          initialData={editingQuiz}
          onBack={() => {
            setActiveEditor(null);
            onClearEditingQuiz?.();
          }}
          onSaveToCourse={(activity) => {
            onSaveQuiz?.(activity);
          }}
        />
      </Suspense>
    );
  }

  if (activeEditor === 'True or False') {
    const initialTfData: QuizActivity = editingQuiz || {
      id: `quiz_tf_${Date.now()}`,
      name: 'True or False Assessment',
      type: 'True or False',
      prompt: 'True or False Assessment',
      instructions: 'Evaluate each statement and select whether it is True or False.',
      pointsPerCorrect: 2,
      deductionPerMistake: 0,
      retries: 2,
      totalPoints: 6,
      data: {
        trueFalse: {
          mode: trueFalseMode,
          displayPerPage: 1,
          questions: [],
        },
      },
    };

    return (
      <Suspense fallback={<DesignerLoadingFallback />}>
        <TrueFalse
          initialData={initialTfData}
          onBack={() => {
            setActiveEditor(null);
            onClearEditingQuiz?.();
          }}
          onSaveToCourse={(activity) => {
            onSaveQuiz?.(activity);
          }}
        />
      </Suspense>
    );
  }

  if (activeEditor === 'Numeric') {
    return (
      <Suspense fallback={<DesignerLoadingFallback />}>
        <Numeric
          initialData={editingQuiz}
          onBack={() => {
            setActiveEditor(null);
            onClearEditingQuiz?.();
          }}
          onSaveToCourse={(activity) => {
            onSaveQuiz?.(activity);
          }}
        />
      </Suspense>
    );
  }

  if (activeEditor === 'Dropdown Select') {
    return (
      <Suspense fallback={<DesignerLoadingFallback />}>
        <DropdownSelect
          initialData={editingQuiz}
          onBack={() => {
            setActiveEditor(null);
            onClearEditingQuiz?.();
          }}
          onSaveToCourse={(activity) => {
            onSaveQuiz?.(activity);
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 space-y-2.5 max-w-7xl animate-in fade-in duration-150">
      {/* Top Banner / Question Bank Summary */}
      {questionBlocks.length > 0 && (
        <section className="shrink-0 p-3 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-xl border border-blue-200 dark:border-blue-800 shadow-xs space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Assessment Structure
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">
                  {questionBlocks.length} Component Section{questionBlocks.length !== 1 ? 's' : ''}
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Course Assessment Blueprint
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-blue-200/60 dark:border-blue-800/60 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Total Items: <span className="font-bold text-blue-600 dark:text-blue-400">{totalQuestions}</span>
              </div>
              <div className="px-2.5 py-1 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-blue-200/60 dark:border-blue-800/60 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Total Score: <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalScore} pts</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {questionBlocks.map((block) => (
              <div
                key={block.id}
                className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shadow-2xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                    {block.type}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {block.questionCount} Questions • {block.totalPoints} pts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteBlock(block.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Remove block"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Area: Dynamic Responsive Scaling Grid */}
      <section className="flex-1 flex flex-col min-h-0 space-y-2">
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Choose Question Type to Design
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select any question type below to open its dedicated authoring canvas.
            </p>
          </div>

          {/* Search Input for Quiz Types */}
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={quizSearchQuery}
              onChange={(e) => setQuizSearchQuery(e.target.value)}
              placeholder="Search question types..."
              className="pl-7 pr-6 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 sm:w-56 shadow-2xs transition-all"
            />
            {quizSearchQuery && (
              <button
                type="button"
                onClick={() => setQuizSearchQuery('')}
                className="absolute right-1.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                title="Clear search"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* 
          Flexible responsive grid:
          - Automatically fills available vertical space when window is large.
          - Each box scales fluidly up to fill the 3 rows.
          - Enforces minimum width (minmax(210px, 1fr)) and minimum height (min-h-[96px]).
          - When window shrinks below the floor limit, automatically scrolls cleanly.
        */}
        <div className="flex-1 min-h-[320px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 auto-rows-fr gap-2.5 pb-2">
          {questionTypes
            .filter((q) => !quizSearchQuery || q.name.toLowerCase().includes(quizSearchQuery.toLowerCase()) || q.description.toLowerCase().includes(quizSearchQuery.toLowerCase()))
            .map((q) => {
            const Icon = q.icon;
            return (
              <div
                key={q.name}
                onClick={() => handleTypeClick(q.name)}
                className="group relative p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xs hover:shadow-md hover:border-blue-500/60 dark:hover:border-blue-500/60 transition-all duration-150 cursor-pointer flex flex-col justify-between min-h-[96px]"
              >
                <div className="min-h-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white group-hover:scale-105 transition-all duration-150 shrink-0">
                      <Icon size={16} />
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {q.name}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                    {q.description}
                  </p>
                </div>

                <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-medium shrink-0">
                  <span>Open Designer</span>
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Question Configuration Dialog Modal */}
      {pendingTypeInfo && (
        <QuestionConfigModal
          isOpen={isConfigModalOpen}
          questionTypeName={pendingTypeInfo.subtype ? `${pendingTypeInfo.type} (${pendingTypeInfo.subtype})` : pendingTypeInfo.type}
          onClose={() => {
            setIsConfigModalOpen(false);
            setPendingTypeInfo(null);
          }}
          onConfirm={handleConfigConfirm}
        />
      )}
    </div>
  );
}
