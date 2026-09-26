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
  {
    name: 'Multiple Choice',
    icon: ListChecks,
    description: 'Single best answer selection from randomized options with per-page question navigation.',
    accentColor: 'blue',
    glowGradient: 'from-blue-500/15 via-indigo-500/10 to-transparent',
    borderColor: 'group-hover:border-blue-500/60',
    titleHover: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
    textColor: 'text-blue-600 dark:text-blue-400',
    svgWatermark: (
      <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <circle cx="28" cy="25" r="9" strokeWidth="3" />
        <circle cx="28" cy="25" r="4.5" fill="currentColor" />
        <line x1="46" y1="25" x2="88" y2="25" strokeWidth="4" strokeLinecap="round" />
        <circle cx="28" cy="50" r="9" strokeWidth="3" />
        <line x1="46" y1="50" x2="82" y2="50" strokeWidth="4" strokeLinecap="round" />
        <circle cx="28" cy="75" r="9" strokeWidth="3" />
        <line x1="46" y1="75" x2="86" y2="75" strokeWidth="4" strokeLinecap="round" />
      </svg>
    )
  },
  {
    name: 'True or False',
    icon: CheckCircle,
    description: 'Evaluate statements with Traditional or Modified (word replacement) True/False modes.',
    accentColor: 'emerald',
    glowGradient: 'from-emerald-500/15 via-teal-500/10 to-transparent',
    borderColor: 'group-hover:border-emerald-500/60',
    titleHover: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    svgWatermark: (
      <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <circle cx="36" cy="48" r="22" strokeWidth="3" />
        <path d="M26 48l7 7 13-13" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="68" cy="48" r="18" strokeWidth="3" />
        <path d="M60 40l16 16M76 40l-16 16" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    name: 'Multiple Response',
    icon: CheckSquare,
    description: 'Multi-select checkboxes allowing multiple valid choices with partial credit.',
    accentColor: 'cyan',
    glowGradient: 'from-cyan-500/15 via-sky-500/10 to-transparent',
    borderColor: 'group-hover:border-cyan-500/60',
    titleHover: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    svgWatermark: (
      <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <rect x="20" y="20" width="22" height="22" rx="4" strokeWidth="3" />
        <path d="M25 31l4 4 9-9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="50" y1="31" x2="88" y2="31" strokeWidth="4" strokeLinecap="round" />
        <rect x="20" y="56" width="22" height="22" rx="4" strokeWidth="3" />
        <path d="M25 67l4 4 9-9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="50" y1="67" x2="84" y2="67" strokeWidth="4" strokeLinecap="round" />
      </svg>
    )
  },
  {
    name: 'Identification',
    icon: Type,
    description: 'Direct term identification with synonym support; supports direct entry of answers.',
    accentColor: 'violet',
    glowGradient: 'from-violet-500/15 via-purple-500/10 to-transparent',
    borderColor: 'group-hover:border-violet-500/60',
    titleHover: 'group-hover:text-violet-600 dark:group-hover:text-violet-400',
    textColor: 'text-violet-600 dark:text-violet-400',
    svgWatermark: (
      <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <rect x="18" y="32" width="64" height="36" rx="8" strokeWidth="3" />
        <line x1="28" y1="50" x2="52" y2="50" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="56" y1="42" x2="56" y2="58" strokeWidth="3" strokeLinecap="round" />
        <path d="M72 68l14 14" strokeWidth="4" strokeLinecap="round" />
        <circle cx="66" cy="62" r="10" strokeWidth="3" />
      </svg>
    )
  },
  {
    name: 'Enumeration',
    icon: ListOrdered,
    description: 'Direct term listing: learners input items with case-sensitivity, order tolerance, and synonym keys.',
    accentColor: 'amber',
    glowGradient: 'from-amber-500/15 via-orange-500/10 to-transparent',
    borderColor: 'group-hover:border-amber-500/60',
    titleHover: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
    textColor: 'text-amber-600 dark:text-amber-400',
    svgWatermark: (
      <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <rect x="20" y="16" width="16" height="16" rx="4" strokeWidth="2.5" />
        <text x="28" y="28" textAnchor="middle" fontSize="11" fontWeight="bold" fill="currentColor" stroke="none">1</text>
        <line x1="44" y1="24" x2="88" y2="24" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="20" y="42" width="16" height="16" rx="4" strokeWidth="2.5" />
        <text x="28" y="54" textAnchor="middle" fontSize="11" fontWeight="bold" fill="currentColor" stroke="none">2</text>
        <line x1="44" y1="50" x2="82" y2="50" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="20" y="68" width="16" height="16" rx="4" strokeWidth="2.5" />
        <text x="28" y="80" textAnchor="middle" fontSize="11" fontWeight="bold" fill="currentColor" stroke="none">3</text>
        <line x1="44" y1="76" x2="86" y2="76" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    name: 'Dropdown Select',
    icon: ChevronDown,
    description: 'Inline drop-down selector: learners choose the correct term from a dropdown list to answer each item.',
    accentColor: 'sky',
    glowGradient: 'from-sky-500/15 via-blue-500/10 to-transparent',
    borderColor: 'group-hover:border-sky-500/60',
    titleHover: 'group-hover:text-sky-600 dark:group-hover:text-sky-400',
    textColor: 'text-sky-600 dark:text-sky-400',
    svgWatermark: (
      <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <rect x="18" y="24" width="64" height="28" rx="6" strokeWidth="3" />
        <line x1="28" y1="38" x2="56" y2="38" strokeWidth="3" strokeLinecap="round" />
        <path d="M68 35l5 5 5-5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="24" y="58" width="58" height="28" rx="4" strokeWidth="2.5" strokeDasharray="3 3" />
        <line x1="32" y1="68" x2="62" y2="68" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32" y1="78" x2="52" y2="78" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    name: 'Sequencing',
    icon: ArrowDownUp,
    description: 'Chronological or logical re-ordering via full-box drag-and-drop or stepper arrows.',
    accentColor: 'indigo',
    glowGradient: 'from-indigo-500/15 via-purple-500/10 to-transparent',
    borderColor: 'group-hover:border-indigo-500/60',
    titleHover: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    svgWatermark: (
      <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <rect x="36" y="20" width="48" height="15" rx="4" strokeWidth="2.5" />
        <rect x="36" y="42" width="48" height="15" rx="4" strokeWidth="2.5" />
        <rect x="36" y="64" width="48" height="15" rx="4" strokeWidth="2.5" />
        <path d="M22 28v42" strokeWidth="3" strokeLinecap="round" />
        <path d="M17 34l5-6 5 6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 64l5 6 5-6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    name: 'Categorization',
    icon: Tags,
    description: 'Learners sort randomized items or terms into distinct predefined groups, categories, or columns.',
    accentColor: 'rose',
    glowGradient: 'from-rose-500/15 via-pink-500/10 to-transparent',
    borderColor: 'group-hover:border-rose-500/60',
    titleHover: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
    textColor: 'text-rose-600 dark:text-rose-400',
    svgWatermark: (
      <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <rect x="18" y="22" width="30" height="56" rx="6" strokeWidth="3" />
        <line x1="24" y1="34" x2="42" y2="34" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="24" y="42" width="18" height="10" rx="3" strokeWidth="2" />
        <rect x="24" y="58" width="18" height="10" rx="3" strokeWidth="2" />
        <rect x="54" y="22" width="30" height="56" rx="6" strokeWidth="3" />
        <line x1="60" y1="34" x2="78" y2="34" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="60" y="42" width="18" height="10" rx="3" strokeWidth="2" />
      </svg>
    )
  },
  {
    name: 'Connect the Dots',
    icon: GitCommit,
    description: 'Interactive matching pairs: learners drag lines or connect related terms between left and right columns.',
    accentColor: 'teal',
    glowGradient: 'from-teal-500/15 via-emerald-500/10 to-transparent',
    borderColor: 'group-hover:border-teal-500/60',
    titleHover: 'group-hover:text-teal-600 dark:group-hover:text-teal-400',
    textColor: 'text-teal-600 dark:text-teal-400',
    svgWatermark: (
      <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <circle cx="25" cy="30" r="7" strokeWidth="3" />
        <circle cx="25" cy="70" r="7" strokeWidth="3" />
        <circle cx="75" cy="30" r="7" strokeWidth="3" />
        <circle cx="75" cy="70" r="7" strokeWidth="3" />
        <path d="M32 30 C 50 30, 50 70, 68 70" strokeWidth="3" strokeLinecap="round" />
        <path d="M32 70 C 50 70, 50 30, 68 30" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 3" />
      </svg>
    )
  },
  {
    name: 'Click an Image',
    icon: MousePointerClick,
    description: 'Interactive image hotspot challenge: learners click directly on diagram parts, maps, or anatomy regions.',
    accentColor: 'amber',
    glowGradient: 'from-amber-500/15 via-yellow-500/10 to-transparent',
    borderColor: 'group-hover:border-amber-500/60',
    titleHover: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
    textColor: 'text-amber-600 dark:text-amber-400',
    svgWatermark: (
      <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <rect x="20" y="20" width="60" height="50" rx="6" strokeWidth="3" />
        <circle cx="36" cy="36" r="5" strokeWidth="2.5" />
        <path d="M26 62l18-18 12 12 12-14 8 8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="62" cy="54" r="14" strokeWidth="3" strokeDasharray="4 3" />
        <circle cx="62" cy="54" r="4" fill="currentColor" stroke="none" />
      </svg>
    )
  },
  {
    name: 'Numeric',
    icon: Hash,
    description: 'Algebra, equation, fraction, and decimal challenge: evaluates equivalent mathematical expressions automatically.',
    accentColor: 'orange',
    glowGradient: 'from-orange-500/15 via-amber-500/10 to-transparent',
    borderColor: 'group-hover:border-orange-500/60',
    titleHover: 'group-hover:text-orange-600 dark:group-hover:text-orange-400',
    textColor: 'text-orange-600 dark:text-orange-400',
    svgWatermark: (
      <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <text x="26" y="42" fontSize="24" fontWeight="bold" fill="currentColor" stroke="none">∑</text>
        <text x="56" y="42" fontSize="24" fontWeight="bold" fill="currentColor" stroke="none">π</text>
        <text x="24" y="78" fontSize="22" fontWeight="bold" fill="currentColor" stroke="none">√x</text>
        <text x="60" y="78" fontSize="24" fontWeight="bold" fill="currentColor" stroke="none">±</text>
      </svg>
    )
  },
  {
    name: 'Essay',
    icon: FileText,
    description: 'Open-ended comprehensive response evaluated directly with manual teacher scoring.',
    accentColor: 'slate',
    glowGradient: 'from-slate-500/15 via-indigo-500/10 to-transparent',
    borderColor: 'group-hover:border-indigo-500/60',
    titleHover: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    svgWatermark: (
      <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <path d="M26 20h36l18 18v42a6 6 0 01-6 6H26a6 6 0 01-6-6V26a6 6 0 016-6z" strokeWidth="3" />
        <path d="M62 20v18h18" strokeWidth="3" />
        <line x1="32" y1="42" x2="52" y2="42" strokeWidth="3" strokeLinecap="round" />
        <line x1="32" y1="56" x2="68" y2="56" strokeWidth="3" strokeLinecap="round" />
        <line x1="32" y1="70" x2="60" y2="70" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  },
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
                className={`group relative p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xs hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[96px] overflow-hidden ${q.borderColor || 'group-hover:border-blue-500/60'}`}
              >
                {/* Ambient Radial Hover Backlight Glow */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${q.glowGradient || 'from-blue-500/15 via-indigo-500/10 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                />

                {/* Faint Themed Vector Watermark Background */}
                <div
                  className={`absolute -right-3 -bottom-3 ${q.textColor || 'text-slate-400'} opacity-[0.06] dark:opacity-[0.09] group-hover:opacity-30 dark:group-hover:opacity-35 transition-all duration-300 group-hover:scale-110 group-hover:-translate-x-1 group-hover:-translate-y-1 pointer-events-none select-none`}
                  aria-hidden="true"
                >
                  {q.svgWatermark}
                </div>

                {/* Card Content */}
                <div className="relative z-10 min-h-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white group-hover:scale-105 transition-all duration-200 shrink-0 shadow-2xs">
                      <Icon size={16} />
                    </div>
                    <h4 className={`font-semibold text-slate-900 dark:text-white text-xs sm:text-sm ${q.titleHover || 'group-hover:text-blue-600 dark:group-hover:text-blue-400'} transition-colors truncate`}>
                      {q.name}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                    {q.description}
                  </p>
                </div>

                <div className="relative z-10 pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-medium shrink-0">
                  <span>Open Designer</span>
                  <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform duration-200" />
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
