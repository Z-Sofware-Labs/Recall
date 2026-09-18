import React, { useState, useEffect, useRef, MouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import ConnectTheDotsPlayer from './ConnectTheDotsPlayer';
import { 
  CheckCircle2, AlertCircle, RotateCcw, Award, Check, 
  HelpCircle, ArrowRight, Sparkles, ChevronLeft, ChevronRight,
  ListChecks, CheckSquare, Edit3, Type, ArrowDownUp, Layers,
  MousePointerClick, Play, Film, X, Maximize2, Tag, GripVertical
} from 'lucide-react';
import { 
  QuizActivity, 
  MultipleChoiceQuestionItem, 
  MultipleResponseQuestionItem, 
  TrueFalseQuestionItem, 
  IdentificationQuestionItem, 
  ChoiceOption,
  NumericQuestionItem,
  DropdownQuestionItem
} from '../../types/quiz';
import { MathRenderer } from '../quiz/MathRenderer';
import { evaluateMathEquivalence, evaluateNumericAnswer } from '../../utils/mathEvaluator';

interface InteractiveQuizPlayerProps {
  key?: React.Key;
  quiz: QuizActivity;
  onComplete?: (result: {
    quizId: string;
    score: number;
    maxScore: number;
    passed: boolean;
    correctCount: number;
    mistakeCount: number;
    exhausted?: boolean;
    detailedResults?: any[];
  }) => void;
  onRestartSection?: () => void;
  onRestartCourse?: () => void;
  sectionTitle?: string;
  isSectioned?: boolean;
  onContinueNext?: () => void;
  continueNextLabel?: string;
}

export function MathGraphicalPreview({ text }: { text: string }) {
  if (!text.trim()) return null;

  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-3xs">
      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-550">Live Preview:</span>
      <div className="bg-white dark:bg-slate-950 px-4 py-2 rounded-lg border border-slate-150 dark:border-slate-850 flex items-center justify-center min-h-[42px] select-none">
        <MathRenderer text={text} />
      </div>
    </div>
  );
}

const PLAYER_MATH_SYMBOLS = [
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
  { label: '≤', value: '<=' },
  { label: '≥', value: '>=' },
  { label: '×', value: '*' },
  { label: '÷', value: '/' },
  { label: '(', value: '(' },
  { label: ')', value: ')' },
  { label: 'x', value: 'x' },
  { label: 'y', value: 'y' },
  { label: 'z', value: 'z' }
];

export default function InteractiveQuizPlayer({ 
  quiz, 
  onComplete, 
  onRestartSection, 
  onRestartCourse,
  sectionTitle,
  isSectioned,
  onContinueNext,
  continueNextLabel
}: InteractiveQuizPlayerProps) {
  const maxRetries = typeof quiz.retries === 'number' ? quiz.retries : 0;
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(maxRetries > 0 ? maxRetries : 0);

  // Common states
  const [hasChecked, setHasChecked] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string; earnedPoints: number; totalPossible: number } | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [zoomModalImage, setZoomModalImage] = useState<{ url: string; alt?: string; title?: string } | null>(null);

  // 1. Multiple Choice state (Multi-question support)
  const [mcQuestions, setMcQuestions] = useState<MultipleChoiceQuestionItem[]>([]);
  const [mcAnswers, setMcAnswers] = useState<Record<string, string>>({}); // questionId -> optionId

  // 2. Multiple Response state (Multi-question support)
  const [mrQuestions, setMrQuestions] = useState<MultipleResponseQuestionItem[]>([]);
  const [mrAnswers, setMrAnswers] = useState<Record<string, string[]>>({}); // questionId -> optionIds[]

  // 3. True or False state (Multi-question support)
  const [tfQuestions, setTfQuestions] = useState<TrueFalseQuestionItem[]>([]);
  const [tfAnswers, setTfAnswers] = useState<Record<string, boolean | null>>({}); // questionId -> isTrue
  const [tfReplacements, setTfReplacements] = useState<Record<string, string>>({}); // questionId -> replacement text

  // 4. Identification state (Multi-question support)
  const [idQuestions, setIdQuestions] = useState<IdentificationQuestionItem[]>([]);
  const [idAnswers, setIdAnswers] = useState<Record<string, string>>({}); // questionId -> text

  // 4.5 Numeric state
  const [numQuestions, setNumQuestions] = useState<NumericQuestionItem[]>([]);
  const [numAnswers, setNumAnswers] = useState<Record<string, string>>({}); // questionId -> answer text
  const [isFormulaMenuOpen, setIsFormulaMenuOpen] = useState(false);
  const [formulaNumVal, setFormulaNumVal] = useState('');
  const [formulaDenVal, setFormulaDenVal] = useState('');
  const [formulaSupBase, setFormulaSupBase] = useState('');
  const [formulaSupExp, setFormulaSupExp] = useState('');
  const [formulaSubBase, setFormulaSubBase] = useState('');
  const [formulaSubExp, setFormulaSubExp] = useState('');
  const formulaMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isFormulaMenuOpen) return;
    const handleClickOutside = (e: globalThis.MouseEvent | globalThis.TouchEvent) => {
      if (formulaMenuRef.current && !formulaMenuRef.current.contains(e.target as Node)) {
        setIsFormulaMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isFormulaMenuOpen]);

  useEffect(() => {
    setIsFormulaMenuOpen(false);
  }, [activeQuestionIndex, quiz.id]);

  const handleInsertMathToNumericInput = (symbol: string) => {
    if (!currentNumQuestion) return;
    const inputEl = document.getElementById(`player-num-input-${currentNumQuestion.id}`) as HTMLInputElement | null;
    const currentVal = numAnswers[currentNumQuestion.id] || '';
    let nextVal = currentVal + symbol;
    let nextPos = nextVal.length;

    if (inputEl) {
      const start = inputEl.selectionStart ?? currentVal.length;
      const end = inputEl.selectionEnd ?? currentVal.length;
      nextVal = currentVal.substring(0, start) + symbol + currentVal.substring(end);
      nextPos = start + symbol.length;
    }

    setNumAnswers(prev => ({ ...prev, [currentNumQuestion.id]: nextVal }));

    setTimeout(() => {
      if (inputEl) {
        inputEl.focus();
        inputEl.setSelectionRange(nextPos, nextPos);
      }
    }, 0);
  };

  // 4.6 Dropdown Select state
  const [ddQuestions, setDdQuestions] = useState<DropdownQuestionItem[]>([]);
  const [ddAnswers, setDdAnswers] = useState<Record<string, string>>({}); // questionId -> optionId

  // 5. Enumeration state
  const [enumerationAnswers, setEnumerationAnswers] = useState<string[]>([]);

  // 6. Sequencing state
  const [sequenceItems, setSequenceItems] = useState<{ id: string; text: string; correctOrder: number }[]>([]);
  const [seqDragIndex, setSeqDragIndex] = useState<number | null>(null);
  const [seqDropTargetIndex, setSeqDropTargetIndex] = useState<number | null>(null);
  const [seqDragItem, setSeqDragItem] = useState<{ id: string; text: string; correctOrder: number } | null>(null);
  const [seqPointerPos, setSeqPointerPos] = useState<{ x: number; y: number } | null>(null);
  const seqDragIndexRef = useRef<number | null>(null);
  const seqDropTargetIndexRef = useRef<number | null>(null);
  const isSeqDraggingRef = useRef(false);

  const handlePointerDownSeqDrag = (e: ReactPointerEvent, index: number) => {
    if (hasChecked) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, select')) return;

    e.preventDefault();
    isSeqDraggingRef.current = true;
    const item = sequenceItems[index];

    seqDragIndexRef.current = index;
    seqDropTargetIndexRef.current = index;
    setSeqDragIndex(index);
    setSeqDropTargetIndex(index);
    setSeqDragItem(item);
    setSeqPointerPos({ x: e.clientX, y: e.clientY });

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isSeqDraggingRef.current) return;
      setSeqPointerPos({ x: moveEvent.clientX, y: moveEvent.clientY });

      const allElements = Array.from(document.querySelectorAll('[data-preview-seq-index]'));
      let closestIdx: number | null = null;
      let minDistance = Infinity;

      for (const el of allElements) {
        const idxAttr = el.getAttribute('data-preview-seq-index');
        if (idxAttr === null) continue;
        const targetIdx = parseInt(idxAttr, 10);
        if (isNaN(targetIdx)) continue;

        const rect = el.getBoundingClientRect();
        const midY = (rect.top + rect.bottom) / 2;
        const dist = Math.abs(moveEvent.clientY - midY);

        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = targetIdx;
        }
      }

      if (closestIdx !== null) {
        seqDropTargetIndexRef.current = closestIdx;
        setSeqDropTargetIndex(closestIdx);
      }
    };

    const handlePointerUp = () => {
      isSeqDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      const fromIdx = seqDragIndexRef.current;
      const toIdx = seqDropTargetIndexRef.current;

      if (fromIdx !== null && toIdx !== null && fromIdx !== toIdx) {
        setSequenceItems((prev) => {
          const list = [...prev];
          const temp = list[fromIdx];
          list[fromIdx] = list[toIdx];
          list[toIdx] = temp;
          return list;
        });
      }

      seqDragIndexRef.current = null;
      seqDropTargetIndexRef.current = null;
      setSeqDragIndex(null);
      setSeqDropTargetIndex(null);
      setSeqDragItem(null);
      setSeqPointerPos(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // 7. Categorization state
  const [categorizedItems, setCategorizedItems] = useState<Record<string, string>>({}); // itemId -> categoryId
  const [selectedPoolItemId, setSelectedPoolItemId] = useState<string | null>(null);
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);
  const [activePointerDrag, setActivePointerDrag] = useState<{ itemId: string; itemText: string; clientX: number; clientY: number; originCatId?: string } | null>(null);

  // Pointer drag start handler for Categorization
  const handlePointerDownItem = (e: ReactPointerEvent, item: { id: string; text: string }, originCatId?: string) => {
    if (hasChecked) return;
    if ((e.target as HTMLElement).closest('button')) return;

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;

    setActivePointerDrag({
      itemId: item.id,
      itemText: item.text,
      clientX: startX,
      clientY: startY,
      originCatId,
    });

    const onPointerMove = (moveEvent: PointerEvent) => {
      setActivePointerDrag(prev => prev ? {
        ...prev,
        clientX: moveEvent.clientX,
        clientY: moveEvent.clientY,
      } : null);

      const elem = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const catBucket = elem?.closest('[data-category-bucket-id]');
      const poolZone = elem?.closest('[data-pool-zone="true"]');

      if (catBucket) {
        const catId = catBucket.getAttribute('data-category-bucket-id');
        setDragOverCatId(catId);
      } else if (poolZone) {
        setDragOverCatId('pool');
      } else {
        setDragOverCatId(null);
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      const elem = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      const catBucket = elem?.closest('[data-category-bucket-id]');
      const poolZone = elem?.closest('[data-pool-zone="true"]');

      if (catBucket) {
        const targetCatId = catBucket.getAttribute('data-category-bucket-id');
        if (targetCatId) {
          setCategorizedItems(prev => ({ ...prev, [item.id]: targetCatId }));
        }
      } else if (poolZone) {
        setCategorizedItems(prev => {
          const n = { ...prev };
          delete n[item.id];
          return n;
        });
      }

      setActivePointerDrag(null);
      setDragOverCatId(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // 8. Matching / Connect the dots — delegated to ConnectTheDotsPlayer
  const ctdTriggerRef = useRef<(() => void) | null>(null);
  const [ctdConnectedCount, setCtdConnectedCount] = useState(0);
  // Legacy state kept for reset handler compatibility
  const [matchingConnections] = useState<Record<string, string>>({});

  // 9. Click an Image — multi-hotspot question state
  // Map of hotspotId -> clicked coords for that question
  const [hotspotAnswers, setHotspotAnswers] = useState<Record<string, { xPct: number; yPct: number }>>({});
  const [activeHotspotIndex, setActiveHotspotIndex] = useState(0);
  // Legacy single coord kept for reset compatibility
  const [clickedCoords, setClickedCoords] = useState<{ xPct: number; yPct: number } | null>(null);

  // Detailed per-question evaluation breakdown (for review mode)
  const [questionResults, setQuestionResults] = useState<Record<string, {
    isCorrect: boolean;
    explanation?: string;
    correctDisplay?: string;
  }>>({});
  const [detailedResultsList, setDetailedResultsList] = useState<any[] | null>(null);


  // Reset and initialize states when quiz changes
  useEffect(() => {
    setHasChecked(false);
    setFeedback(null);
    setActiveQuestionIndex(0);
    setQuestionResults({});
    setDetailedResultsList(null);
    setAttemptsRemaining(maxRetries > 0 ? maxRetries : 0);

    // Setup Multiple Choice questions
    if (quiz.type === 'Multiple Choice') {
      let rawQuestions: MultipleChoiceQuestionItem[] = [];
      if (quiz.data?.multipleChoice?.questions && quiz.data.multipleChoice.questions.length > 0) {
        rawQuestions = quiz.data.multipleChoice.questions;
      } else if (quiz.data?.multipleChoice?.options) {
        rawQuestions = [{
          id: 'mc_q_1',
          prompt: quiz.prompt || 'Choose the correct option:',
          options: quiz.data.multipleChoice.options,
          explanation: quiz.data.multipleChoice.explanation || '',
        }];
      }

      let prepared = rawQuestions.map(q => {
        let opts = [...q.options];
        const shouldShuffleOpts = quiz.data?.multipleChoice?.shuffleOptions ?? true;
        if (shouldShuffleOpts) {
          opts = opts.sort(() => Math.random() - 0.5);
        }
        return { ...q, options: opts };
      });

      if (quiz.data?.multipleChoice?.shuffleQuestions && prepared.length > 1) {
        prepared = prepared.sort(() => Math.random() - 0.5);
      }

      setMcQuestions(prepared);
      setMcAnswers({});
    }

    // Setup Multiple Response questions
    if (quiz.type === 'Multiple Response') {
      let rawQuestions: MultipleResponseQuestionItem[] = [];
      if (quiz.data?.multipleResponse?.questions && quiz.data.multipleResponse.questions.length > 0) {
        rawQuestions = quiz.data.multipleResponse.questions;
      } else if (quiz.data?.multipleResponse?.options) {
        rawQuestions = [{
          id: 'mr_q_1',
          prompt: quiz.prompt || 'Select all that apply:',
          options: quiz.data.multipleResponse.options,
          explanation: quiz.data.multipleResponse.explanation || '',
        }];
      }
      setMrQuestions(rawQuestions);
      setMrAnswers({});
    }

    // Setup True or False questions
    if (quiz.type === 'True or False') {
      let rawQuestions: TrueFalseQuestionItem[] = [];
      if (quiz.data?.trueFalse?.questions && quiz.data.trueFalse.questions.length > 0) {
        rawQuestions = quiz.data.trueFalse.questions;
      } else {
        rawQuestions = [{
          id: 'tf_q_1',
          statement: quiz.data?.trueFalse?.statement || quiz.prompt || 'Evaluate the statement:',
          isTrue: quiz.data?.trueFalse?.correctAnswer ?? true,
          explanation: quiz.data?.trueFalse?.explanation || '',
        }];
      }
      setTfQuestions(rawQuestions);
      setTfAnswers({});
      setTfReplacements({});
    }

    // Setup Identification questions
    if (quiz.type === 'Identification') {
      let rawQuestions: IdentificationQuestionItem[] = [];
      if (quiz.data?.identification?.questions && quiz.data.identification.questions.length > 0) {
        rawQuestions = quiz.data.identification.questions;
      } else if (quiz.data?.identification?.primaryAnswer) {
        rawQuestions = [{
          id: 'id_q_1',
          questionPrompt: quiz.prompt || 'Identify the term:',
          primaryAnswer: quiz.data.identification.primaryAnswer,
          acceptableAliases: quiz.data.identification.acceptableAliases || [],
          explanation: quiz.data.identification.explanation || '',
        }];
      }

      let prepared = [...rawQuestions];
      if (quiz.data?.identification?.shuffleQuestions && prepared.length > 1) {
        prepared = prepared.sort(() => Math.random() - 0.5);
      }

      setIdQuestions(prepared);
      setIdAnswers({});
    }

    // Setup Numeric questions
    if (quiz.type === 'Numeric') {
      let rawQuestions: NumericQuestionItem[] = [];
      if (quiz.data?.numeric?.questions && quiz.data.numeric.questions.length > 0) {
        rawQuestions = quiz.data.numeric.questions;
      }
      let prepared = [...rawQuestions];
      if (quiz.data?.numeric?.shuffleQuestions && prepared.length > 1) {
        prepared = prepared.sort(() => Math.random() - 0.5);
      }
      setNumQuestions(prepared);
      setNumAnswers({});
    }

    // Setup Dropdown Select questions
    if (quiz.type === 'Dropdown Select') {
      let rawQuestions: DropdownQuestionItem[] = [];
      if (quiz.data?.dropdownSelect?.questions && quiz.data.dropdownSelect.questions.length > 0) {
        rawQuestions = quiz.data.dropdownSelect.questions;
      }
      let prepared = rawQuestions.map(q => {
        let opts = [...q.options].sort((a, b) => a.text.localeCompare(b.text));
        return { ...q, options: opts };
      });
      if (quiz.data?.dropdownSelect?.shuffleQuestions && prepared.length > 1) {
        prepared = prepared.sort(() => Math.random() - 0.5);
      }
      setDdQuestions(prepared);
      setDdAnswers({});
    }

    // Setup initial enumeration slots
    if (quiz.type === 'Enumeration') {
      const count = quiz.data?.enumeration?.itemCount || quiz.data?.enumeration?.items?.length || 3;
      setEnumerationAnswers(Array(count).fill(''));
    }

    // Setup initial sequencing items (shuffled)
    if (quiz.type === 'Sequencing' && quiz.data?.sequencing?.steps) {
      const steps = [...quiz.data.sequencing.steps];
      setSequenceItems([...steps].sort(() => Math.random() - 0.5));
    }

    setCategorizedItems({});
    setSelectedPoolItemId(null);
    setDragOverCatId(null);
    setCtdConnectedCount(0);
    setClickedCoords(null);
    setHotspotAnswers({});
    setActiveHotspotIndex(0);
  }, [quiz.id, maxRetries]);

  const pointsPerCorrect = quiz.pointsPerCorrect || 2;
  const deductionPerMistake = quiz.deductionPerMistake || 0;

  const finishOverallEvaluation = (
    isPassed: boolean, 
    earnedScore: number, 
    maxPossibleScore: number, 
    correctCount: number, 
    mistakeCount: number, 
    summaryMsg: string,
    detailedResults?: any[]
  ) => {
    const isExhausted = !isPassed && maxRetries > 0 && attemptsRemaining <= 1;
    const nextRemaining = maxRetries > 0 ? Math.max(0, attemptsRemaining - 1) : 0;

    if (maxRetries > 0) {
      setAttemptsRemaining(nextRemaining);
    }
    setHasChecked(true);
    if (detailedResults) {
      setDetailedResultsList(detailedResults);
    }

    let finalMsg = summaryMsg;
    if (!isPassed) {
      if (isExhausted) {
        finalMsg = `${summaryMsg} All ${maxRetries} attempt(s) spent. Assessment failed.`;
      } else if (maxRetries > 0) {
        finalMsg = `${summaryMsg} (${nextRemaining} attempt${nextRemaining === 1 ? '' : 's'} remaining).`;
      }
    }

    setFeedback({
      isCorrect: isPassed,
      message: finalMsg,
      earnedPoints: earnedScore,
      totalPossible: maxPossibleScore,
    });

    onComplete?.({
      quizId: quiz.id,
      score: earnedScore,
      maxScore: maxPossibleScore,
      passed: isPassed,
      correctCount,
      mistakeCount,
      exhausted: isExhausted,
      detailedResults,
    });
  };

  // 1. Multiple Choice Evaluation (Grades all questions in the test)
  const handleCheckMultipleChoice = () => {
    let earned = 0;
    let correctCount = 0;
    let mistakeCount = 0;
    const results: Record<string, { isCorrect: boolean; explanation?: string; correctDisplay?: string }> = {};
    const detailedResults: any[] = [];

    mcQuestions.forEach(q => {
      const selectedOptId = mcAnswers[q.id];
      const selectedOpt = q.options.find(o => o.id === selectedOptId);
      const correctOpt = q.options.find(o => o.isCorrect);
      const isCorrect = !!(selectedOptId && correctOpt && selectedOptId === correctOpt.id);

      if (isCorrect) {
        correctCount++;
        earned += pointsPerCorrect;
      } else {
        mistakeCount++;
        if (deductionPerMistake > 0) {
          earned = Math.max(0, earned - deductionPerMistake);
        }
      }

      results[q.id] = {
        isCorrect,
        explanation: q.explanation,
        correctDisplay: correctOpt?.text,
      };

      detailedResults.push({
        questionText: q.prompt,
        isCorrect,
        userAnswer: selectedOpt ? selectedOpt.text : 'No answer',
        correctAnswer: correctOpt ? correctOpt.text : 'N/A',
        explanation: q.explanation
      });
    });

    const totalPossible = mcQuestions.length * pointsPerCorrect;
    const passThreshold = quiz.passingScore !== undefined ? quiz.passingScore : Math.ceil(totalPossible * 0.7);
    const isPassed = !quiz.isGraded || earned >= passThreshold;

    setQuestionResults(results);
    finishOverallEvaluation(
      isPassed,
      earned,
      totalPossible,
      correctCount,
      mistakeCount,
      isPassed 
        ? `Passed! ${correctCount}/${mcQuestions.length} correct (${earned}/${totalPossible} pts).`
        : `Assessment incomplete or failed. ${correctCount}/${mcQuestions.length} correct.`,
      detailedResults
    );
  };

  // 2. Multiple Response Evaluation (Grades all questions)
  const handleCheckMultipleResponse = () => {
    let earned = 0;
    let correctCount = 0;
    let mistakeCount = 0;
    const results: Record<string, { isCorrect: boolean; explanation?: string; correctDisplay?: string }> = {};
    const detailedResults: any[] = [];

    mrQuestions.forEach(q => {
      const selectedIds = mrAnswers[q.id] || [];
      const selectedTexts = q.options.filter(o => selectedIds.includes(o.id)).map(o => o.text).join(', ');
      const correctTexts = q.options.filter(o => o.isCorrect).map(o => o.text).join(', ');
      const correctIds = q.options.filter(o => o.isCorrect).map(o => o.id);
      const isExactMatch = correctIds.length === selectedIds.length && correctIds.every(id => selectedIds.includes(id));

      if (isExactMatch) {
        correctCount++;
        earned += pointsPerCorrect;
      } else {
        mistakeCount++;
        if (deductionPerMistake > 0) {
          earned = Math.max(0, earned - deductionPerMistake);
        }
      }

      results[q.id] = {
        isCorrect: isExactMatch,
        explanation: q.explanation,
        correctDisplay: correctTexts,
      };

      detailedResults.push({
        questionText: q.prompt,
        isCorrect: isExactMatch,
        userAnswer: selectedTexts || 'No answer',
        correctAnswer: correctTexts || 'N/A',
        explanation: q.explanation
      });
    });

    const totalPossible = mrQuestions.length * pointsPerCorrect;
    const passThreshold = quiz.passingScore !== undefined ? quiz.passingScore : Math.ceil(totalPossible * 0.7);
    const isPassed = !quiz.isGraded || earned >= passThreshold;

    setQuestionResults(results);
    finishOverallEvaluation(
      isPassed,
      earned,
      totalPossible,
      correctCount,
      mistakeCount,
      isPassed 
        ? `Passed! ${correctCount}/${mrQuestions.length} items correct (+${earned} pts).`
        : `Assessment incomplete. ${correctCount}/${mrQuestions.length} items correct.`,
      detailedResults
    );
  };

  // 3. True or False Evaluation (Grades all questions)
  const handleCheckTrueFalse = () => {
    let earned = 0;
    let correctCount = 0;
    let mistakeCount = 0;
    const results: Record<string, { isCorrect: boolean; explanation?: string; correctDisplay?: string }> = {};
    const isModifiedMode = quiz.data?.trueFalse?.mode === 'modified';
    const detailedResults: any[] = [];

    tfQuestions.forEach(q => {
      const selectedVal = tfAnswers[q.id];
      let isCorrect = false;
      let userAnsText = selectedVal === undefined || selectedVal === null ? 'No answer' : selectedVal ? 'True' : 'False';
      let correctAnsText = q.isTrue ? 'True' : 'False';

      if (!isModifiedMode) {
        isCorrect = selectedVal === q.isTrue;
      } else {
        if (q.isTrue) {
          isCorrect = selectedVal === true;
        } else {
          const replacement = (tfReplacements[q.id] || '').trim().toLowerCase();
          const target = (q.replacementAnswer || '').trim().toLowerCase();
          const aliases = (q.acceptableAliases || []).map(a => a.trim().toLowerCase());
          const replacementMatches = replacement !== '' && (replacement === target || aliases.includes(replacement));
          isCorrect = selectedVal === false && replacementMatches;
          if (selectedVal === false) {
            userAnsText = `False (Replacement: "${tfReplacements[q.id] || ''}")`;
          }
          correctAnsText = `False (Replacement: "${q.replacementAnswer || ''}")`;
        }
      }

      if (isCorrect) {
        correctCount++;
        earned += pointsPerCorrect;
      } else {
        mistakeCount++;
        if (deductionPerMistake > 0) {
          earned = Math.max(0, earned - deductionPerMistake);
        }
      }

      results[q.id] = {
        isCorrect,
        explanation: q.explanation,
        correctDisplay: q.isTrue ? 'True' : (isModifiedMode && q.replacementAnswer ? `False (Replacement: "${q.replacementAnswer}")` : 'False'),
      };

      detailedResults.push({
        questionText: q.statement,
        isCorrect,
        userAnswer: userAnsText,
        correctAnswer: correctAnsText,
        explanation: q.explanation
      });
    });

    const totalPossible = tfQuestions.length * pointsPerCorrect;
    const passThreshold = quiz.passingScore !== undefined ? quiz.passingScore : Math.ceil(totalPossible * 0.7);
    const isPassed = !quiz.isGraded || earned >= passThreshold;

    setQuestionResults(results);
    finishOverallEvaluation(
      isPassed,
      earned,
      totalPossible,
      correctCount,
      mistakeCount,
      isPassed
        ? `Passed! ${correctCount}/${tfQuestions.length} statements evaluated correctly (+${earned} pts).`
        : `Assessment incomplete. ${correctCount}/${tfQuestions.length} statements correct.`,
      detailedResults
    );
  };

  // 4. Identification Evaluation (Grades all questions)
  const handleCheckIdentification = () => {
    let earned = 0;
    let correctCount = 0;
    let mistakeCount = 0;
    const results: Record<string, { isCorrect: boolean; explanation?: string; correctDisplay?: string }> = {};
    const isCaseSensitive = quiz.data?.identification?.caseSensitive ?? false;
    const detailedResults: any[] = [];

    idQuestions.forEach(q => {
      const input = isCaseSensitive ? (idAnswers[q.id] || '').trim() : (idAnswers[q.id] || '').trim().toLowerCase();
      const primary = isCaseSensitive ? q.primaryAnswer.trim() : q.primaryAnswer.trim().toLowerCase();
      const aliases = (q.acceptableAliases || []).map(a => isCaseSensitive ? a.trim() : a.trim().toLowerCase());

      const isMatch = input.length > 0 && (input === primary || aliases.includes(input));

      if (isMatch) {
        correctCount++;
        earned += pointsPerCorrect;
      } else {
        mistakeCount++;
        if (deductionPerMistake > 0) {
          earned = Math.max(0, earned - deductionPerMistake);
        }
      }

      results[q.id] = {
        isCorrect: isMatch,
        explanation: q.explanation,
        correctDisplay: q.primaryAnswer,
      };

      detailedResults.push({
        questionText: q.questionPrompt || 'Identify the term:',
        isCorrect: isMatch,
        userAnswer: idAnswers[q.id] || 'No answer',
        correctAnswer: q.primaryAnswer,
        explanation: q.explanation
      });
    });

    const totalPossible = idQuestions.length * pointsPerCorrect;
    const passThreshold = quiz.passingScore !== undefined ? quiz.passingScore : Math.ceil(totalPossible * 0.7);
    const isPassed = !quiz.isGraded || earned >= passThreshold;

    setQuestionResults(results);
    finishOverallEvaluation(
      isPassed,
      earned,
      totalPossible,
      correctCount,
      mistakeCount,
      isPassed 
        ? `Passed! ${correctCount}/${idQuestions.length} terms identified correctly (+${earned} pts).`
        : `Assessment incomplete. ${correctCount}/${idQuestions.length} terms correct.`,
      detailedResults
    );
  };

  // 4.5 Numeric Evaluation
  const handleCheckNumeric = () => {
    let earned = 0;
    let correctCount = 0;
    let mistakeCount = 0;
    const results: Record<string, { isCorrect: boolean; explanation?: string; correctDisplay?: string }> = {};
    const detailedResults: any[] = [];

    numQuestions.forEach(q => {
      const uAns = (numAnswers[q.id] || '').trim();
      const altAnswers = q.alternativeAnswers || (q as any).acceptableAliases || [];
      const isMatch = evaluateNumericAnswer(uAns, q.correctAnswer, altAnswers, q.tolerance);

      if (isMatch) {
        correctCount++;
        earned += pointsPerCorrect;
      } else {
        mistakeCount++;
        if (deductionPerMistake > 0) {
          earned = Math.max(0, earned - deductionPerMistake);
        }
      }

      const altDisplay = altAnswers.length > 0 ? ` (or ${altAnswers.join(', ')})` : '';

      results[q.id] = {
        isCorrect: isMatch,
        explanation: q.explanation,
        correctDisplay: q.correctAnswer + altDisplay,
      };

      detailedResults.push({
        questionText: q.questionPrompt,
        isCorrect: isMatch,
        userAnswer: uAns || '(No Answer)',
        correctAnswer: q.correctAnswer + altDisplay,
        explanation: q.explanation
      });
    });

    const totalPossible = numQuestions.length * pointsPerCorrect;
    const passThreshold = quiz.passingScore !== undefined ? quiz.passingScore : Math.ceil(totalPossible * 0.7);
    const isPassed = !quiz.isGraded || earned >= passThreshold;

    setQuestionResults(results);
    finishOverallEvaluation(
      isPassed,
      earned,
      totalPossible,
      correctCount,
      mistakeCount,
      isPassed 
        ? `Passed! ${correctCount}/${numQuestions.length} math problems solved correctly (+${earned} pts).`
        : `Assessment incomplete. ${correctCount}/${numQuestions.length} correct.`,
      detailedResults
    );
  };

  // 4.6 Dropdown Select Evaluation
  const handleCheckDropdownSelect = () => {
    let earned = 0;
    let correctCount = 0;
    let mistakeCount = 0;
    const results: Record<string, { isCorrect: boolean; explanation?: string; correctDisplay?: string }> = {};
    const detailedResults: any[] = [];

    ddQuestions.forEach(q => {
      const selectedOptId = ddAnswers[q.id];
      const selectedOpt = q.options.find(o => o.id === selectedOptId);
      const correctOpt = q.options.find(o => o.isCorrect);
      
      const isMatch = !!(selectedOptId && correctOpt && selectedOptId === correctOpt.id);

      if (isMatch) {
        correctCount++;
        earned += pointsPerCorrect;
      } else {
        mistakeCount++;
        if (deductionPerMistake > 0) {
          earned = Math.max(0, earned - deductionPerMistake);
        }
      }

      results[q.id] = {
        isCorrect: isMatch,
        explanation: q.explanation,
        correctDisplay: correctOpt?.text || '',
      };

      detailedResults.push({
        questionText: q.prompt,
        isCorrect: isMatch,
        userAnswer: selectedOpt ? selectedOpt.text : '(No Selection)',
        correctAnswer: correctOpt ? correctOpt.text : 'N/A',
        explanation: q.explanation
      });
    });

    const totalPossible = ddQuestions.length * pointsPerCorrect;
    const passThreshold = quiz.passingScore !== undefined ? quiz.passingScore : Math.ceil(totalPossible * 0.7);
    const isPassed = !quiz.isGraded || earned >= passThreshold;

    setQuestionResults(results);
    finishOverallEvaluation(
      isPassed,
      earned,
      totalPossible,
      correctCount,
      mistakeCount,
      isPassed 
        ? `Passed! ${correctCount}/${ddQuestions.length} dropdown selections answered correctly (+${earned} pts).`
        : `Assessment incomplete. ${correctCount}/${ddQuestions.length} correct.`,
      detailedResults
    );
  };

  // 5. Enumeration Evaluation
  const handleCheckEnumeration = () => {
    const items = quiz.data?.enumeration?.items || [];
    let correctMatches = 0;
    const detailedResults: any[] = [];

    items.forEach((item, index) => {
      const studentAns = enumerationAnswers[index] || '';
      const clean = studentAns.trim().toLowerCase();
      const matched = clean !== '' && items.some(k => {
        const p = k.primaryAnswer.trim().toLowerCase();
        const a = (k.acceptableAliases || []).map(alias => alias.trim().toLowerCase());
        return p === clean || a.includes(clean);
      });
      if (matched) correctMatches++;

      detailedResults.push({
        questionText: `List item #${index + 1}:`,
        isCorrect: matched,
        userAnswer: studentAns || 'No answer',
        correctAnswer: item.primaryAnswer,
        explanation: item.explanation
      });
    });

    const totalPoints = quiz.totalPoints || 5;
    const isPassed = correctMatches >= Math.ceil(items.length * 0.7);
    const earned = Math.round((correctMatches / Math.max(1, items.length)) * totalPoints);

    finishOverallEvaluation(
      isPassed,
      earned,
      totalPoints,
      correctMatches,
      items.length - correctMatches,
      `${correctMatches} of ${items.length} items identified correctly (+${earned} pts).`,
      detailedResults
    );
  };

  // 6. Sequencing Evaluation
  const handleMoveSequenceStep = (index: number, direction: 'up' | 'down') => {
    if (hasChecked) return;
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= sequenceItems.length) return;
    const updated = [...sequenceItems];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    setSequenceItems(updated);
  };

  const handleCheckSequencing = () => {
    let correctCount = 0;
    sequenceItems.forEach((step, idx) => {
      if (step.correctOrder === idx + 1) {
        correctCount += 1;
      }
    });

    const isCorrect = correctCount === sequenceItems.length;
    const totalPoints = quiz.totalPoints ?? (quiz.pointsPerCorrect ?? 5);
    const deduction = quiz.deductionPerMistake ?? 0;
    const mistakes = sequenceItems.length - correctCount;

    let earned = 0;
    if (isCorrect) {
      earned = totalPoints;
    } else if (deduction > 0) {
      earned = Math.max(0, totalPoints - (mistakes * deduction));
    } else {
      // Partial proportional scoring fallback if configured points > 1
      earned = Math.round((correctCount / Math.max(1, sequenceItems.length)) * totalPoints);
    }

    const orderedItems = [...sequenceItems].sort((a, b) => a.correctOrder - b.correctOrder);
    const detailedResults = [{
      questionText: quiz.prompt || 'Arrange the steps in the correct chronological order:',
      isCorrect,
      userAnswer: sequenceItems.map((s, i) => `${i + 1}. ${s.text}`).join(' | '),
      correctAnswer: orderedItems.map((s, i) => `${i + 1}. ${s.text}`).join(' | '),
      explanation: isCorrect ? 'All steps match their exact sequential order.' : `${correctCount}/${sequenceItems.length} items in correct order (${mistakes} misplaced).`
    }];

    finishOverallEvaluation(
      isCorrect,
      earned,
      totalPoints,
      correctCount,
      mistakes,
      isCorrect ? `Perfect sequence order! (+${earned} pts)` : `Sequence completed with ${mistakes} misplaced step(s). (+${earned}/${totalPoints} pts)`,
      detailedResults
    );
  };

  // 7. Click an Image Hotspot Evaluation
  const handleImageClick = (e: MouseEvent<HTMLDivElement>) => {
    if (hasChecked) return;
    const hotspots = quiz.data?.clickAnImage?.hotspots || [];
    if (hotspots.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = parseFloat((((e.clientX - rect.left) / rect.width) * 100).toFixed(1));
    const yPct = parseFloat((((e.clientY - rect.top) / rect.height) * 100).toFixed(1));
    const currentHotspot = hotspots[activeHotspotIndex] || hotspots[0];
    if (!currentHotspot) return;
    
    setHotspotAnswers(prev => ({ ...prev, [currentHotspot.id]: { xPct, yPct } }));
    setClickedCoords({ xPct, yPct }); // keep in sync for isAllAnswered check

    // Advance to next unpinned hotspot if available
    const nextUnpinnedIdx = hotspots.findIndex((h, idx) => idx !== activeHotspotIndex && !hotspotAnswers[h.id] && h.id !== currentHotspot.id);
    if (nextUnpinnedIdx !== -1) {
      setActiveHotspotIndex(nextUnpinnedIdx);
    }
  };

  const handleRemoveHotspotPin = (hotspotId: string) => {
    if (hasChecked) return;
    setHotspotAnswers(prev => {
      const next = { ...prev };
      delete next[hotspotId];
      return next;
    });
  };

  const handleClearAllHotspotPins = () => {
    if (hasChecked) return;
    setHotspotAnswers({});
  };

  const handleCheckHotspot = () => {
    const hotspots = quiz.data?.clickAnImage?.hotspots || [];
    if (hotspots.length === 0) return;
    const ptsPerCorrect = quiz.pointsPerCorrect || Math.round((quiz.totalPoints || 5) / Math.max(1, hotspots.length));
    const deductPer = quiz.deductionPerMistake || 0;
    let correct = 0;
    let mistakes = 0;
    const newResults: Record<string, { isCorrect: boolean; explanation?: string }> = {};
    const detailedResults: any[] = [];

    hotspots.forEach(h => {
      const ans = hotspotAnswers[h.id];
      let isHit = false;
      if (ans) {
        const radius = h.radiusPercent || 8;
        const dx = ans.xPct - h.xPercent;
        const dy = ans.yPct - h.yPercent;
        isHit = Math.sqrt(dx * dx + dy * dy) <= radius;
      }
      newResults[h.id] = { isCorrect: isHit, explanation: h.explanation };
      if (isHit) correct++; else mistakes++;

      detailedResults.push({
        questionText: h.questionPrompt || `Locate ${h.label} on the image`,
        isCorrect: isHit,
        userAnswer: ans ? `Clicked coordinates (${Math.round(ans.xPct)}%, ${Math.round(ans.yPct)}%)` : 'No answer',
        correctAnswer: `Target area: ${h.label}`,
        explanation: h.explanation
      });
    });

    setQuestionResults(prev => ({ ...prev, ...newResults }));
    const earned = Math.max(0, correct * ptsPerCorrect - mistakes * deductPer);
    const maxScore = hotspots.length * ptsPerCorrect;
    const passed = earned >= (quiz.passingScore ?? maxScore * 0.6);
    finishOverallEvaluation(
      passed,
      earned,
      maxScore,
      correct,
      mistakes,
      passed
        ? `${correct} of ${hotspots.length} targets found correctly! (+${earned} pts)`
        : `${correct} of ${hotspots.length} targets found correctly.`,
      detailedResults
    );
  };

  // 9. Categorization Evaluation
  const handleCheckCategorization = () => {
    const categories = quiz.data?.categories || [];
    if (categories.length === 0) return;
    let correct = 0;
    let mistakes = 0;
    let total = 0;
    const detailedResults: any[] = [];

    categories.forEach(cat => {
      (cat.items || []).forEach(item => {
        total++;
        const placedCatId = categorizedItems[item.id];
        const correctCat = categories.find(c => c.id === cat.id);
        const placedCat = categories.find(c => c.id === placedCatId);
        const isCorrect = placedCatId === cat.id;

        if (isCorrect) {
          correct++;
        } else {
          mistakes++;
        }

        detailedResults.push({
          questionText: `Categorize: "${item.text}"`,
          isCorrect,
          userAnswer: placedCat ? placedCat.name : 'Unplaced',
          correctAnswer: correctCat ? correctCat.name : 'N/A',
        });
      });
    });

    const ptsEach = pointsPerCorrect || Math.floor((quiz.totalPoints || 5) / Math.max(1, total));
    const earned = correct * ptsEach;
    const maxScore = total * ptsEach;
    const allCorrect = correct === total;
    finishOverallEvaluation(
      allCorrect,
      earned,
      maxScore,
      correct,
      mistakes,
      allCorrect
        ? `All ${total} items categorized correctly! (+${earned} pts)`
        : `${correct} of ${total} items categorized correctly.`,
      detailedResults
    );
  };

  const handleResetQuiz = () => {
    setHasChecked(false);
    setFeedback(null);
    setActiveQuestionIndex(0);
    setQuestionResults({});

    if (quiz.type === 'Multiple Choice') {
      let prepared = mcQuestions.map(q => {
        let opts = [...q.options];
        if (quiz.data?.multipleChoice?.shuffleOptions ?? true) {
          opts = opts.sort(() => Math.random() - 0.5);
        }
        return { ...q, options: opts };
      });
      if (quiz.data?.multipleChoice?.shuffleQuestions && prepared.length > 1) {
        prepared = prepared.sort(() => Math.random() - 0.5);
      }
      setMcQuestions(prepared);
      setMcAnswers({});
    }

    if (quiz.type === 'Identification') {
      let prepared = [...idQuestions];
      if (quiz.data?.identification?.shuffleQuestions && prepared.length > 1) {
        prepared = prepared.sort(() => Math.random() - 0.5);
      }
      setIdQuestions(prepared);
      setIdAnswers({});
    }

    if (quiz.type === 'Numeric') {
      let prepared = [...numQuestions];
      if (quiz.data?.numeric?.shuffleQuestions && prepared.length > 1) {
        prepared = prepared.sort(() => Math.random() - 0.5);
      }
      setNumQuestions(prepared);
      setNumAnswers({});
    }

    if (quiz.type === 'Dropdown Select') {
      let prepared = ddQuestions.map(q => {
        let opts = [...q.options].sort((a, b) => a.text.localeCompare(b.text));
        return { ...q, options: opts };
      });
      if (quiz.data?.dropdownSelect?.shuffleQuestions && prepared.length > 1) {
        prepared = prepared.sort(() => Math.random() - 0.5);
      }
      setDdQuestions(prepared);
      setDdAnswers({});
    }

    if (quiz.type === 'Multiple Response') {
      setMrAnswers({});
    }

    if (quiz.type === 'True or False') {
      setTfAnswers({});
      setTfReplacements({});
    }

    if (quiz.type === 'Sequencing' && quiz.data?.sequencing?.steps) {
      setSequenceItems([...quiz.data.sequencing.steps].sort(() => Math.random() - 0.5));
    }
    setClickedCoords(null);
    setCategorizedItems({});
    setSelectedPoolItemId(null);
    setDragOverCatId(null);
  };

  const isExhausted = hasChecked && !feedback?.isCorrect && maxRetries > 0 && attemptsRemaining === 0;

  // Active question counts for multi-item types
  const totalQuestionsCount = 
    quiz.type === 'Multiple Choice' ? mcQuestions.length :
    quiz.type === 'Multiple Response' ? mrQuestions.length :
    quiz.type === 'True or False' ? tfQuestions.length :
    quiz.type === 'Identification' ? idQuestions.length :
    quiz.type === 'Numeric' ? numQuestions.length :
    quiz.type === 'Dropdown Select' ? ddQuestions.length : 1;

  const currentMcQuestion = mcQuestions[activeQuestionIndex] || mcQuestions[0];
  const currentMrQuestion = mrQuestions[activeQuestionIndex] || mrQuestions[0];
  const currentTfQuestion = tfQuestions[activeQuestionIndex] || tfQuestions[0];
  const currentIdQuestion = idQuestions[activeQuestionIndex] || idQuestions[0];
  const currentNumQuestion = numQuestions[activeQuestionIndex] || numQuestions[0];
  const currentDdQuestion = ddQuestions[activeQuestionIndex] || ddQuestions[0];

  // Count how many questions have been answered so far
  const answeredQuestionsCount = 
    quiz.type === 'Multiple Choice' ? Object.keys(mcAnswers).length :
    quiz.type === 'Multiple Response' ? Object.keys(mrAnswers).filter(k => (mrAnswers[k] || []).length > 0).length :
    quiz.type === 'True or False' ? Object.keys(tfAnswers).filter(k => tfAnswers[k] !== null).length :
    quiz.type === 'Identification' ? Object.keys(idAnswers).filter(k => (idAnswers[k] || '').trim().length > 0).length :
    quiz.type === 'Numeric' ? Object.keys(numAnswers).filter(k => (numAnswers[k] || '').trim().length > 0).length :
    quiz.type === 'Dropdown Select' ? Object.keys(ddAnswers).length : 1;

  const isAllAnswered = answeredQuestionsCount >= totalQuestionsCount;

  return (
    <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                {quiz.type} Activity
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-[11px] text-slate-500">
                {totalQuestionsCount > 1 ? `${totalQuestionsCount} Questions Checkpoint` : 'Interactive Checkpoint'}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {quiz.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {maxRetries > 0 && (
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              attemptsRemaining === 0
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {attemptsRemaining === 0 ? '0 Retries Remaining' : `${attemptsRemaining} Allowed Retr${attemptsRemaining === 1 ? 'y' : 'ies'}`}
            </span>
          )}
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
            {quiz.totalPoints || (totalQuestionsCount * pointsPerCorrect)} pts
          </span>
        </div>
      </div>

      {/* Multi-Question Stepper Navigation Bar */}
      {totalQuestionsCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Question {activeQuestionIndex + 1} of {totalQuestionsCount}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-[11px] font-medium text-slate-500">
              {answeredQuestionsCount}/{totalQuestionsCount} Answered
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
            {Array.from({ length: totalQuestionsCount }).map((_, idx) => {
              const qId = 
                quiz.type === 'Multiple Choice' ? mcQuestions[idx]?.id :
                quiz.type === 'Multiple Response' ? mrQuestions[idx]?.id :
                quiz.type === 'True or False' ? tfQuestions[idx]?.id :
                quiz.type === 'Identification' ? idQuestions[idx]?.id : '';

              const isAnswered = 
                quiz.type === 'Multiple Choice' ? !!mcAnswers[qId] :
                quiz.type === 'Multiple Response' ? (mrAnswers[qId] || []).length > 0 :
                quiz.type === 'True or False' ? tfAnswers[qId] !== undefined && tfAnswers[qId] !== null :
                quiz.type === 'Identification' ? (idAnswers[qId] || '').trim().length > 0 : false;

              const isCurrent = idx === activeQuestionIndex;
              const result = qId ? questionResults[qId] : undefined;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveQuestionIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/40'
                      : hasChecked && result
                        ? result.isCorrect
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : isAnswered
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                  title={`Jump to Question ${idx + 1}`}
                >
                  {hasChecked && result ? (
                    result.isCorrect ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />
                  ) : (
                    idx + 1
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <button
              type="button"
              disabled={activeQuestionIndex === 0}
              onClick={() => setActiveQuestionIndex(prev => Math.max(0, prev - 1))}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer text-slate-600 dark:text-slate-300 transition-colors"
              title="Previous Question"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              disabled={activeQuestionIndex === totalQuestionsCount - 1}
              onClick={() => setActiveQuestionIndex(prev => Math.min(totalQuestionsCount - 1, prev + 1))}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer text-slate-600 dark:text-slate-300 transition-colors"
              title="Next Question"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Question / Activity Body */}
      {/* ========================================================================= */}
      {/* 1. MULTIPLE CHOICE */}
      {/* ========================================================================= */}
      {quiz.type === 'Multiple Choice' && (
        <div className="space-y-4">
          {/* Prompt always shown */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              <MathRenderer text={currentMcQuestion?.prompt || quiz.prompt || 'Choose the correct option:'} />
            </p>
            {quiz.instructions && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                {quiz.instructions}
              </p>
            )}
          </div>
          {!currentMcQuestion && (
            <p className="text-xs text-slate-400 text-center py-4">No questions configured for this quiz.</p>
          )}
          {currentMcQuestion && <>

          {currentMcQuestion.imageUrl && (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-64 flex items-center justify-center bg-slate-950/40">
              <img 
                src={currentMcQuestion.imageUrl} 
                alt={currentMcQuestion.imageAlt || 'Question Image'}
                className="max-h-64 object-contain"
              />
            </div>
          )}

          <div className="space-y-2.5">
            {currentMcQuestion.options.map((opt, idx) => {
              const selectedOptId = mcAnswers[currentMcQuestion.id];
              const isSelected = selectedOptId === opt.id;
              const isCorrectChoice = opt.isCorrect;

              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    if (hasChecked) return;
                    setMcAnswers(prev => ({ ...prev, [currentMcQuestion.id]: opt.id }));
                  }}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer select-none ${
                    hasChecked
                      ? isCorrectChoice
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100'
                        : isSelected
                          ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-100'
                          : 'opacity-50 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                      : isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-900 dark:text-white'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                    hasChecked
                      ? isCorrectChoice
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : isSelected
                          ? 'border-rose-500 bg-rose-500 text-white'
                          : 'border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                      : isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className={`text-xs font-medium flex-1 ${
                    hasChecked
                      ? isCorrectChoice
                        ? 'text-emerald-950 dark:text-emerald-100 font-semibold'
                        : isSelected
                          ? 'text-rose-950 dark:text-rose-100'
                          : 'text-slate-600 dark:text-slate-400'
                      : isSelected
                        ? 'text-blue-950 dark:text-blue-100 font-semibold'
                        : 'text-slate-900 dark:text-white'
                  }`}>
                    <MathRenderer text={opt.text} />
                  </span>
                </div>
              );
            })}
          </div>

          {hasChecked && currentMcQuestion.explanation && (
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
              <HelpCircle size={15} className="shrink-0 mt-0.5 text-blue-600" />
              <div>
                <span className="font-bold">Explanation: </span>
                <span>{currentMcQuestion.explanation}</span>
              </div>
            </div>
          )}
          </>
          }
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MULTIPLE RESPONSE */}
      {/* ========================================================================= */}
      {quiz.type === 'Multiple Response' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              <MathRenderer text={currentMrQuestion?.prompt || quiz.prompt || 'Select all that apply:'} />
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Select all correct options:</p>
          </div>
          {!currentMrQuestion && (
            <p className="text-xs text-slate-400 text-center py-4">No questions configured for this quiz.</p>
          )}
          {currentMrQuestion && <>

          <div className="space-y-2.5">
            {currentMrQuestion.options.map((opt) => {
              const selectedList = mrAnswers[currentMrQuestion.id] || [];
              const isSelected = selectedList.includes(opt.id);
              const isCorrectChoice = opt.isCorrect;

              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    if (hasChecked) return;
                    setMrAnswers(prev => {
                      const cur = prev[currentMrQuestion.id] || [];
                      const next = isSelected ? cur.filter(id => id !== opt.id) : [...cur, opt.id];
                      return { ...prev, [currentMrQuestion.id]: next };
                    });
                  }}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer select-none ${
                    hasChecked
                      ? isCorrectChoice
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100'
                        : isSelected
                          ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-100'
                          : 'opacity-50 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                      : isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-900 dark:text-white'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-bold shrink-0 ${
                    hasChecked
                      ? isCorrectChoice
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : isSelected
                          ? 'border-rose-500 bg-rose-500 text-white'
                          : 'border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                      : isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 dark:border-slate-700 text-transparent'
                  }`}>
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <span className={`text-xs font-medium flex-1 ${
                    hasChecked
                      ? isCorrectChoice
                        ? 'text-emerald-950 dark:text-emerald-100 font-semibold'
                        : isSelected
                          ? 'text-rose-950 dark:text-rose-100'
                          : 'text-slate-600 dark:text-slate-400'
                      : isSelected
                        ? 'text-blue-950 dark:text-blue-100 font-semibold'
                        : 'text-slate-900 dark:text-white'
                  }`}>
                    <MathRenderer text={opt.text} />
                  </span>
                </div>
              );
            })}
          </div>
          </>
          }
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TRUE OR FALSE */}
      {/* ========================================================================= */}
      {quiz.type === 'True or False' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
              <MathRenderer text={currentTfQuestion?.statement || quiz.prompt || 'Is the following statement True or False?'} />
            </p>
            {quiz.data?.trueFalse?.mode === 'modified' && currentTfQuestion?.underlinedWord && (
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Target Concept: <span className="underline font-bold">{currentTfQuestion.underlinedWord}</span>
              </p>
            )}
          </div>
          {!currentTfQuestion && (
            <p className="text-xs text-slate-400 text-center py-4">No questions configured for this quiz.</p>
          )}
          {currentTfQuestion && <>
          <div className="grid grid-cols-2 gap-3">
            {[true, false].map((val) => {
              const selectedVal = tfAnswers[currentTfQuestion.id];
              const isSelected = selectedVal === val;
              const isCorrectChoice = currentTfQuestion.isTrue === val;

              return (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => {
                    if (hasChecked) return;
                    setTfAnswers(prev => ({ ...prev, [currentTfQuestion.id]: val }));
                  }}
                  className={`p-4 rounded-xl border-2 font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    hasChecked
                      ? isCorrectChoice
                        ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-200 shadow-xs'
                        : isSelected
                          ? 'bg-rose-50 dark:bg-rose-950 border-rose-500 text-rose-700 dark:text-rose-200'
                          : 'opacity-40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                      : isSelected
                        ? val
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                          : 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-200 ring-2 ring-rose-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-900 dark:text-white'
                  }`}
                >
                  <span className={isSelected ? (val ? 'text-emerald-700 dark:text-emerald-200' : 'text-rose-700 dark:text-rose-200') : 'text-slate-900 dark:text-white'}>
                    {val ? 'TRUE' : 'FALSE'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Modified True or False: Replacement Answer input */}
          {quiz.data?.trueFalse?.mode === 'modified' && tfAnswers[currentTfQuestion.id] === false && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2 animate-in fade-in">
              <label className="block text-xs font-bold text-amber-900 dark:text-amber-200">
                Since the statement is False, enter the correct replacement word:
              </label>
              <input
                type="text"
                disabled={hasChecked}
                value={tfReplacements[currentTfQuestion.id] || ''}
                onChange={(e) => setTfReplacements(prev => ({ ...prev, [currentTfQuestion.id]: e.target.value }))}
                placeholder="Type the correct replacement term..."
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>
          )}
          </>
          }
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. IDENTIFICATION */}
      {/* ========================================================================= */}
      {quiz.type === 'Identification' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              <MathRenderer text={currentIdQuestion?.questionPrompt || quiz.prompt || 'Identify the term:'} />
            </p>
            {quiz.instructions && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                {quiz.instructions}
              </p>
            )}
          </div>
          {!currentIdQuestion && (
            <p className="text-xs text-slate-400 text-center py-4">No questions configured for this quiz.</p>
          )}
          {currentIdQuestion && <>
          {currentIdQuestion.imageUrl && (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-64 flex items-center justify-center bg-slate-950/40">
              <img 
                src={currentIdQuestion.imageUrl} 
                alt={currentIdQuestion.imageAlt || 'Identification visual prompt'}
                className="max-h-64 object-contain"
              />
            </div>
          )}

          <div className="space-y-2">
            <input
              type="text"
              disabled={hasChecked}
              value={idAnswers[currentIdQuestion.id] || ''}
              onChange={(e) => setIdAnswers(prev => ({ ...prev, [currentIdQuestion.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (hasChecked) return;
                  if (activeQuestionIndex < totalQuestionsCount - 1) {
                    setActiveQuestionIndex(prev => prev + 1);
                  } else {
                    if (isAllAnswered) {
                      handleCheckIdentification();
                    }
                  }
                }
              }}
              placeholder="Type your exact answer here..."
              className={`w-full px-4 py-3 bg-white dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white text-sm font-semibold outline-hidden transition-all ${
                hasChecked
                  ? questionResults[currentIdQuestion.id]?.isCorrect
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                    : 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500'
              }`}
            />

            {hasChecked && !questionResults[currentIdQuestion.id]?.isCorrect && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Expected Answer: &quot;{currentIdQuestion.primaryAnswer}&quot;
              </p>
            )}
          </div>
          </>
          }
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4.5 NUMERIC */}
      {/* ========================================================================= */}
      {quiz.type === 'Numeric' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              <MathRenderer text={currentNumQuestion?.questionPrompt || quiz.prompt || 'Solve mathematical question:'} />
            </p>
            {quiz.instructions && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                {quiz.instructions}
              </p>
            )}
          </div>
          {!currentNumQuestion && (
            <p className="text-xs text-slate-400 text-center py-4">No math questions configured.</p>
          )}
          {currentNumQuestion && <>
          {currentNumQuestion.imageUrl && (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-64 flex items-center justify-center bg-slate-950/40">
              <img 
                src={currentNumQuestion.imageUrl} 
                alt={currentNumQuestion.imageAlt || 'Numeric problem visual prompt'}
                className="max-h-64 object-contain"
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="relative" ref={formulaMenuRef}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <input
                    id={`player-num-input-${currentNumQuestion.id}`}
                    type="text"
                    disabled={hasChecked}
                    value={numAnswers[currentNumQuestion.id] || ''}
                    onChange={(e) => setNumAnswers(prev => ({ ...prev, [currentNumQuestion.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (hasChecked) return;
                        if (activeQuestionIndex < totalQuestionsCount - 1) {
                          setActiveQuestionIndex(prev => prev + 1);
                        } else {
                          if (isAllAnswered) {
                            handleCheckNumeric();
                          }
                        }
                      }
                    }}
                    placeholder="Enter your answer here."
                    className={`w-full px-4 py-3 bg-white dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white text-sm font-semibold font-mono outline-hidden transition-all ${
                      hasChecked
                        ? questionResults[currentNumQuestion.id]?.isCorrect
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                          : 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500'
                    }`}
                  />
                </div>

                {!hasChecked && (
                  <button
                    type="button"
                    onClick={() => setIsFormulaMenuOpen(prev => !prev)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border shadow-3xs ${
                      isFormulaMenuOpen
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                    title="Insert Formulas, Math Symbols, Fractions & Scripts"
                  >
                    <Sparkles size={15} className={isFormulaMenuOpen ? 'text-white' : 'text-blue-500'} />
                    <span>Insert Formula / Scripts</span>
                  </button>
                )}
              </div>

              {/* Formula & Scripts Tool Palette (Mobile Bottom Sheet / Desktop Popover) */}
              {isFormulaMenuOpen && !hasChecked && (
                <>
                  {/* Mobile Backdrop Overlay */}
                  <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 sm:hidden animate-in fade-in duration-200"
                    onClick={() => setIsFormulaMenuOpen(false)}
                  />

                  <div
                    ref={formulaMenuRef}
                    className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 pb-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200 sm:animate-in sm:fade-in sm:slide-in-from-bottom-2 sm:duration-150 sm:absolute sm:inset-auto sm:right-0 sm:bottom-full sm:mb-2 sm:w-[580px] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl sm:border sm:max-h-none sm:overflow-visible sm:origin-bottom-right sm:pb-4"
                  >
                    {/* Mobile drag handle bar */}
                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 mb-2 sm:hidden" />

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-blue-500" />
                        Formula & Math Scripts Toolbar
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsFormulaMenuOpen(false)}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Close toolbar"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column: Math Symbols */}
                      <div className="space-y-2">
                        <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Math Symbols & Variables
                        </span>
                        <div className="grid grid-cols-5 gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                          {PLAYER_MATH_SYMBOLS.map((sym) => (
                            <button
                              key={sym.label}
                              type="button"
                              onClick={() => handleInsertMathToNumericInput(sym.value)}
                              className="py-2.5 bg-white hover:bg-blue-600 dark:bg-slate-900 dark:hover:bg-blue-600 border border-slate-200 dark:border-slate-800 text-slate-800 hover:text-white dark:text-slate-200 dark:hover:text-white rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shadow-3xs active:scale-95 flex items-center justify-center min-h-[36px]"
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
                                value={formulaNumVal}
                                onChange={(e) => setFormulaNumVal(e.target.value)}
                                className="w-full text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                              />
                              <div className="w-full border-b border-slate-300 dark:border-slate-650" />
                              <input
                                type="text"
                                placeholder="Den"
                                value={formulaDenVal}
                                onChange={(e) => setFormulaDenVal(e.target.value)}
                                className="w-full text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                              />
                            </div>

                            <button
                              type="button"
                              disabled={!formulaNumVal.trim() || !formulaDenVal.trim()}
                              onClick={() => {
                                handleInsertMathToNumericInput(`(${formulaNumVal})/(${formulaDenVal})`);
                                setFormulaNumVal('');
                                setFormulaDenVal('');
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
                                value={formulaSupBase}
                                onChange={(e) => setFormulaSupBase(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                              />
                              <input
                                type="text"
                                placeholder="Power"
                                value={formulaSupExp}
                                onChange={(e) => setFormulaSupExp(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                              />
                            </div>
                            <button
                              type="button"
                              disabled={!formulaSupBase.trim() || !formulaSupExp.trim()}
                              onClick={() => {
                                handleInsertMathToNumericInput(`${formulaSupBase}^(${formulaSupExp})`);
                                setFormulaSupBase('');
                                setFormulaSupExp('');
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
                                value={formulaSubBase}
                                onChange={(e) => setFormulaSubBase(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                              />
                              <input
                                type="text"
                                placeholder="Sub"
                                value={formulaSubExp}
                                onChange={(e) => setFormulaSubExp(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-900 dark:text-white font-mono focus:border-blue-500 outline-hidden"
                              />
                            </div>
                            <button
                              type="button"
                              disabled={!formulaSubBase.trim() || !formulaSubExp.trim()}
                              onClick={() => {
                                handleInsertMathToNumericInput(`${formulaSubBase}_(${formulaSubExp})`);
                                setFormulaSubBase('');
                                setFormulaSubExp('');
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

            {/* Word-style Math Preview in Course Player */}
            <div className="mt-2">
              <MathGraphicalPreview text={numAnswers[currentNumQuestion.id] || ''} />
            </div>

            {hasChecked && !questionResults[currentNumQuestion.id]?.isCorrect && (
              <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 space-y-1">
                <p className="flex flex-wrap items-center gap-1.5">
                  <span>Expected Solution:</span>
                  <span className="font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                    <MathRenderer text={currentNumQuestion.correctAnswer} />
                  </span>
                  {(currentNumQuestion.alternativeAnswers || (currentNumQuestion as any).acceptableAliases)?.length > 0 && (
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      (Also acceptable: {(currentNumQuestion.alternativeAnswers || (currentNumQuestion as any).acceptableAliases).join(', ')})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
          </>
          }
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4.6 DROPDOWN SELECT */}
      {/* ========================================================================= */}
      {quiz.type === 'Dropdown Select' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              <MathRenderer text={currentDdQuestion?.prompt || quiz.prompt || 'Choose the correct answer:'} />
            </p>
            {quiz.instructions && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                {quiz.instructions}
              </p>
            )}
          </div>
          {!currentDdQuestion && (
            <p className="text-xs text-slate-400 text-center py-4">No dropdown questions configured.</p>
          )}
          {currentDdQuestion && <>
          <div className="space-y-2">
            <select
              disabled={hasChecked}
              value={ddAnswers[currentDdQuestion.id] || ''}
              onChange={(e) => setDdAnswers(prev => ({ ...prev, [currentDdQuestion.id]: e.target.value }))}
              className={`w-full px-4 py-3 bg-white dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white text-sm font-semibold outline-hidden transition-all ${
                hasChecked
                  ? questionResults[currentDdQuestion.id]?.isCorrect
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                    : 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500'
              }`}
            >
              <option value="" disabled>-- Select your answer --</option>
              {currentDdQuestion.options.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.text}</option>
              ))}
            </select>

            {hasChecked && !questionResults[currentDdQuestion.id]?.isCorrect && (
               <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Correct Selection: &quot;<span className="font-bold bg-white dark:bg-slate-900 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-800"><MathRenderer text={currentDdQuestion.options.find(o => o.isCorrect)?.text || ''} /></span>&quot;
              </p>
            )}
          </div>
          </>
          }
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ENUMERATION */}
      {/* ========================================================================= */}
      {quiz.type === 'Enumeration' && (
        <div className="space-y-3">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{quiz.prompt || 'List all required items:'}</p>
            {quiz.instructions && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{quiz.instructions}</p>}
          </div>
          <div className="space-y-2">
            {enumerationAnswers.map((ans, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  disabled={hasChecked}
                  value={ans}
                  onChange={(e) => {
                    const next = [...enumerationAnswers];
                    next[idx] = e.target.value;
                    setEnumerationAnswers(next);
                  }}
                  placeholder={`Item #${idx + 1}`}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SEQUENCING */}
      {/* ========================================================================= */}
      {quiz.type === 'Sequencing' && (
        <div className="space-y-3 select-none">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{quiz.prompt || 'Arrange the steps in the correct order:'}</p>
            {quiz.instructions && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{quiz.instructions}</p>}
          </div>
          <div className="space-y-2">
            {sequenceItems.map((step, idx) => {
              const isBeingDragged = seqDragIndex === idx;
              const isTarget = seqDropTargetIndex === idx && seqDragIndex !== null && seqDragIndex !== idx;

              return (
                <div
                  key={step.id}
                  data-preview-seq-index={idx}
                  onPointerDown={(e) => handlePointerDownSeqDrag(e, idx)}
                  className={`p-3.5 border rounded-xl flex items-center justify-between gap-3 shadow-2xs transition-all touch-none ${
                    !hasChecked ? 'cursor-grab active:cursor-grabbing' : ''
                  } ${
                    isTarget
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 ring-2 ring-blue-400/40 scale-[1.01]'
                      : isBeingDragged
                        ? 'opacity-30 border-dashed border-slate-400 bg-slate-100 dark:bg-slate-900'
                        : hasChecked
                          ? step.correctOrder === idx + 1
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                            : 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {!hasChecked && (
                      <div className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 shrink-0">
                        <GripVertical size={16} />
                      </div>
                    )}
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white break-words whitespace-normal leading-relaxed flex-1">
                      {step.text}
                    </span>
                  </div>
                  {!hasChecked ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSequenceStep(idx, 'up');
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer text-slate-500"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={idx === sequenceItems.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveSequenceStep(idx, 'down');
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer text-slate-500"
                        title="Move Down"
                      >
                        ▼
                      </button>
                    </div>
                  ) : step.correctOrder !== idx + 1 && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                      Correct: #{step.correctOrder}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. CLICK AN IMAGE — per-hotspot question mode */}
      {/* ========================================================================= */}
      {quiz.type === 'Click an Image' && (() => {
        const hotspots = quiz.data?.clickAnImage?.hotspots || [];
        const currentHotspot = hotspots[activeHotspotIndex];
        const totalHotspots = hotspots.length;
        const answeredCount = Object.keys(hotspotAnswers).length;
        const currentAnswer = currentHotspot ? hotspotAnswers[currentHotspot.id] : null;

        return (
          <div className="space-y-3">
            {/* Overall prompt / instructions */}
            {(quiz.prompt || quiz.instructions) && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                {quiz.prompt && <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{quiz.prompt}</p>}
                {quiz.instructions && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 italic">{quiz.instructions}</p>}
              </div>
            )}

            {/* Target Selector & Prompt Header */}
            {totalHotspots > 0 && currentHotspot && !hasChecked && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Select Target to Pin ({activeHotspotIndex + 1} of {totalHotspots})
                  </span>
                  <div className="flex items-center gap-1.5">
                    {currentAnswer && (
                      <button
                        type="button"
                        onClick={() => handleRemoveHotspotPin(currentHotspot.id)}
                        className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>✕ Remove Pin</span>
                      </button>
                    )}
                    {answeredCount > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllHotspotPins}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>Clear All ({answeredCount}) 🗑️</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Target Tabs Strip */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                  {hotspots.map((h, i) => {
                    const isSelected = i === activeHotspotIndex;
                    const isPinned = !!hotspotAnswers[h.id];
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setActiveHotspotIndex(i)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-400/40'
                            : isPinned
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{i + 1}. {h.label}</span>
                        {isPinned && <span className="text-[10px] text-emerald-500 dark:text-emerald-400">✓</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Current Hotspot Question Prompt */}
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    <span className="text-blue-600 dark:text-blue-400 mr-1">Target:</span>
                    {currentHotspot.questionPrompt || `Locate and click on ${currentHotspot.label}`}
                  </p>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                    {currentAnswer ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Pinned ✓</span> : 'Click image to pin'}
                  </span>
                </div>
              </div>
            )}

            {/* After submission: show per-hotspot result cards */}
            {hasChecked && totalHotspots > 0 && (
              <div className="space-y-1.5">
                {hotspots.map((h, i) => {
                  const res = questionResults[h.id];
                  return (
                    <div
                      key={h.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${
                        res?.isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        res?.isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}>{i + 1}</span>
                      <span className="flex-1">{h.questionPrompt || `Locate ${h.label}`}</span>
                      <span>{res?.isCorrect ? '✓' : hotspotAnswers[h.id] ? '✗ Missed' : '✗ Not answered'}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* No hotspots fallback */}
            {totalHotspots === 0 && (
              <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400 dark:text-slate-500 text-xs">
                No target hotspots configured for this question.
              </div>
            )}

            {/* Image Canvas */}
            {quiz.data?.clickAnImage?.imageUrl ? (
              <div className="space-y-2 select-none">
                <div className="flex justify-center w-full bg-slate-950/40 rounded-2xl p-2 border border-slate-200 dark:border-slate-800">
                  <div
                    onClick={hasChecked ? undefined : handleImageClick}
                    className={`relative inline-block max-w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 ${
                      hasChecked ? 'cursor-default' : 'cursor-crosshair'
                    } shadow-sm`}
                  >
                    <img
                      src={quiz.data.clickAnImage.imageUrl}
                      alt={quiz.prompt || 'Interactive Image'}
                      className="max-h-[48vh] max-w-full w-auto h-auto block select-none pointer-events-none"
                      draggable={false}
                    />

                    {/* Pre-evaluation: Placed pins for all targets */}
                    {!hasChecked && hotspots.map((h, i) => {
                      const ans = hotspotAnswers[h.id];
                      if (!ans) return null;
                      const isSelected = i === activeHotspotIndex;

                      return (
                        <div
                          key={h.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveHotspotIndex(i);
                          }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group/userpin"
                          style={{ left: `${ans.xPct}%`, top: `${ans.yPct}%` }}
                        >
                          <div className="relative flex items-center justify-center">
                            <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-all ${
                              isSelected ? 'bg-blue-600 ring-4 ring-blue-400/50 scale-110' : 'bg-slate-800 hover:bg-blue-600'
                            }`}>
                              <span className="text-[10px] font-black text-white">{i + 1}</span>
                            </div>
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                              <span>{h.label}</span>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveHotspotPin(h.id);
                                }}
                                className="text-rose-400 hover:text-rose-200 cursor-pointer font-black ml-0.5"
                                title="Remove pin"
                              >
                                ✕
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* After submission: show all hotspot zones + all answer pins */}
                    {hasChecked && hotspots.map((h, i) => {
                      const ans = hotspotAnswers[h.id];
                      const isHit = questionResults[h.id]?.isCorrect;
                      const radius = h.radiusPercent || 8;
                      return (
                        <div key={h.id}>
                          {/* Correct zone ring */}
                          <div
                            className={`absolute rounded-full border-2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center ${
                              isHit ? 'border-emerald-400 bg-emerald-400/20' : 'border-amber-400 bg-amber-400/15'
                            }`}
                            style={{ left: `${h.xPercent}%`, top: `${h.yPercent}%`, width: `${radius * 2}%`, aspectRatio: '1 / 1' }}
                          >
                            <span className="text-[8px] font-bold text-white bg-black/50 px-1 rounded whitespace-nowrap">{h.label}</span>
                          </div>
                          {/* Student's pin */}
                          {ans && (
                            <div
                              className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none flex items-center justify-center"
                              style={{ left: `${ans.xPct}%`, top: `${ans.yPct}%` }}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 border-white shadow flex items-center justify-center text-[9px] font-black text-white ${
                                isHit ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}>
                                {i + 1}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation between hotspot questions */}
                {!hasChecked && totalHotspots > 1 && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      disabled={activeHotspotIndex === 0}
                      onClick={() => setActiveHotspotIndex(i => Math.max(0, i - 1))}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      ← Prev Target
                    </button>
                    <span className="text-[11px] text-slate-400">
                      Target {activeHotspotIndex + 1} of {totalHotspots} ({answeredCount}/{totalHotspots} pinned)
                    </span>
                    <button
                      type="button"
                      disabled={activeHotspotIndex === totalHotspots - 1}
                      onClick={() => setActiveHotspotIndex(i => Math.min(totalHotspots - 1, i + 1))}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      Next Target →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400 dark:text-slate-500 text-xs">
                No image has been configured for this question.
              </div>
            )}
          </div>
        );
      })()}


      {/* ========================================================================= */}
      {/* 8. CONNECT THE DOTS (PAIR MATCHING) — ConnectTheDotsPlayer                */}
      {/* ========================================================================= */}
      {quiz.type === 'Connect the Dots' && (
        <ConnectTheDotsPlayer
          quiz={quiz}
          hasChecked={hasChecked}
          onTriggerCheck={(fn) => { ctdTriggerRef.current = fn; }}
          onConnectionCountChange={(connected) => setCtdConnectedCount(connected)}
          onComplete={(result) => {
            const pairs = quiz.data?.connectTheDots?.pairs || [];
            const correct = Math.round(result.score / Math.max(1, quiz.pointsPerCorrect || 1));
            const mistakes = pairs.length - correct;
            finishOverallEvaluation(
              result.passed,
              result.score,
              result.maxScore,
              correct,
              mistakes,
              result.passed
                ? `All ${pairs.length} pairs matched correctly! (+${result.score} pts)`
                : `${correct} of ${pairs.length} pairs matched correctly.`,
              result.detailedResults
            );
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 9. CATEGORIZATION                                                          */}
      {/* ========================================================================= */}
      {quiz.type === 'Categorization' && (() => {
        const categories = quiz.data?.categories || [];
        // All items across all categories (shuffled for the learner to sort)
        const allItems = categories.flatMap(cat => (cat.items || []).map(item => ({ ...item, correctCatId: cat.id })));
        const unplacedItems = allItems.filter(item => !categorizedItems[item.id]);

        const headerColors: Record<string, string> = {
          Emerald: 'text-emerald-600 dark:text-emerald-400',
          Amber: 'text-amber-600 dark:text-amber-400',
          Blue: 'text-blue-600 dark:text-blue-400',
          Purple: 'text-purple-600 dark:text-purple-400',
        };

        const borderColors: Record<string, string> = {
          Emerald: 'border-emerald-300 dark:border-emerald-800/80',
          Amber: 'border-amber-300 dark:border-amber-800/80',
          Blue: 'border-blue-300 dark:border-blue-800/80',
          Purple: 'border-purple-300 dark:border-purple-800/80',
        };

        return (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{quiz.prompt || 'Drag each item into the correct category or click to place:'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Drag items directly to target buckets below, or click an item and then click a bucket to sort it.
              </p>
            </div>

            {/* Items Pool (Drop zone to return items) */}
            <div
              data-pool-zone="true"
              onClick={() => {
                if (hasChecked || !selectedPoolItemId) return;
                setCategorizedItems(prev => {
                  const n = { ...prev };
                  delete n[selectedPoolItemId];
                  return n;
                });
                setSelectedPoolItemId(null);
              }}
              className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                dragOverCatId === 'pool'
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/60 shadow-lg ring-4 ring-blue-400/20'
                  : unplacedItems.length === 0
                  ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20'
                  : 'border-blue-200 dark:border-blue-800/60 bg-blue-50/20 dark:bg-blue-950/10'
              }`}
            >
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Unsorted Items Pool</span>
              <div className="flex flex-wrap gap-2">
                {unplacedItems.map(item => {
                  const isSelected = selectedPoolItemId === item.id;
                  const isBeingDragged = activePointerDrag?.itemId === item.id;
                  return (
                    <div
                      key={item.id}
                      onPointerDown={(e) => handlePointerDownItem(e, item)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasChecked) return;
                        setSelectedPoolItemId(prev => prev === item.id ? null : item.id);
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full select-none cursor-grab active:cursor-grabbing border shadow-xs transition-all flex items-center gap-1.5 ${
                        isBeingDragged ? 'opacity-30 scale-95 border-dashed border-blue-400' : ''
                      } ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-300 dark:ring-blue-900 scale-105'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white hover:border-blue-400'
                      }`}
                    >
                      <span className="opacity-40 text-[10px] select-none">☰</span>
                      {item.text}
                    </div>
                  );
                })}
                {unplacedItems.length === 0 && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium italic py-1">All items placed ✓</span>
                )}
              </div>
            </div>

            {/* Category bins */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 3)}, 1fr)` }}>
              {categories.map(cat => {
                const placedItems = allItems.filter(item => categorizedItems[item.id] === cat.id);
                const isDragOver = dragOverCatId === cat.id;

                return (
                  <div
                    key={cat.id}
                    data-category-bucket-id={cat.id}
                    onClick={() => {
                      if (hasChecked || !selectedPoolItemId) return;
                      setCategorizedItems(prev => ({ ...prev, [selectedPoolItemId]: cat.id }));
                      setSelectedPoolItemId(null);
                    }}
                    className={`border-2 rounded-xl p-3.5 space-y-3 min-h-[140px] flex flex-col justify-between transition-all ${
                      isDragOver
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/60 scale-[1.01] shadow-lg ring-4 ring-blue-400/20'
                        : selectedPoolItemId
                          ? 'border-blue-400/60 dark:border-blue-600/40 bg-blue-50/10 cursor-pointer animate-pulse'
                          : `border-dashed bg-white dark:bg-slate-900/60 ${borderColors[cat.color] || 'border-slate-200 dark:border-slate-800'}`
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                        <p className={`text-[11px] font-extrabold uppercase tracking-wider ${headerColors[cat.color] || 'text-slate-600 dark:text-slate-400'}`}>
                          {cat.name}
                        </p>
                        <span className="text-[10px] text-slate-400 font-bold">{placedItems.length} items</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 min-h-[50px] items-start content-start">
                        {placedItems.map(item => {
                          const isCorrect = hasChecked && item.correctCatId === cat.id;
                          const isWrong = hasChecked && item.correctCatId !== cat.id;
                          const isBeingDragged = activePointerDrag?.itemId === item.id;
                          return (
                            <div
                              key={item.id}
                              onPointerDown={(e) => handlePointerDownItem(e, item, cat.id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (hasChecked) return;
                                setCategorizedItems(prev => {
                                  const n = { ...prev };
                                  delete n[item.id];
                                  return n;
                                });
                              }}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border select-none cursor-grab active:cursor-grabbing transition-colors ${
                                isBeingDragged ? 'opacity-30 scale-95 border-dashed border-blue-400' : ''
                              } ${
                                isCorrect
                                  ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-400 text-emerald-900 dark:text-emerald-200'
                                  : isWrong
                                    ? 'bg-rose-100 dark:bg-rose-950 border-rose-400 text-rose-900 dark:text-rose-200'
                                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white hover:border-rose-400 hover:text-rose-600'
                              }`}
                              title={hasChecked ? undefined : "Drag back to pool or click to remove"}
                            >
                              {item.text}
                            </div>
                          );
                        })}
                        {placedItems.length === 0 && (
                          <span className="text-[10px] text-slate-400 italic py-3 mx-auto">
                            {isDragOver ? 'Drop here' : selectedPoolItemId ? 'Click to place selected' : 'Drag items here'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      {/* ========================================================================= */}
      {feedback && (
        <div className="space-y-3 w-full">
          <div className={`p-4 rounded-xl border animate-in fade-in space-y-1.5 ${
            feedback.isCorrect 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
          }`}>
            <div className="flex items-center gap-2 font-bold text-xs">
              {feedback.isCorrect ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{feedback.message}</span>
            </div>
          </div>

          {/* Answer Correction & Detailed Review Panel (Shown ONLY when passed or retries exhausted) */}
          {detailedResultsList && detailedResultsList.length > 0 && (feedback.isCorrect || isExhausted) && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-3 animate-in fade-in">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1.5 flex items-center gap-1.5">
                <ListChecks size={13} className="text-blue-500" />
                <span>Correction & Answer Key Review</span>
              </h4>
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {detailedResultsList.map((res, index) => (
                  <div key={index} className="text-xs p-3 bg-white dark:bg-slate-950 border border-slate-200/65 dark:border-slate-800/80 rounded-xl space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{res.questionText}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                        res.isCorrect 
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      }`}>
                        {res.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-slate-400 font-medium">Your Answer: </span>
                        <span className={res.isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                          {res.userAnswer}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Correct Answer: </span>
                        <span className="text-slate-700 dark:text-slate-200 font-semibold">{res.correctAnswer}</span>
                      </div>
                    </div>
                    {res.explanation && (
                      <p className="text-[10px] text-slate-500 mt-1 italic">
                        <span className="font-bold not-italic text-slate-400">Explanation: </span>{res.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Exhausted Attempts Blocker Banner */}
      {isExhausted && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-400 dark:border-rose-800 rounded-2xl text-xs space-y-3 animate-in zoom-in-95">
          <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
            <AlertCircle size={18} />
            <span>Assessment Failed — All Retries Exhausted</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {(isSectioned || sectionTitle)
              ? `You have exhausted all ${maxRetries} attempt(s) on this activity. In accordance with assessment policy, you can repeat this section only to review its lessons, or restart the entire course from the beginning.`
              : `You have exhausted all ${maxRetries} attempt(s) on this activity. You can repeat the entire module from the start to review and retake the assessment.`}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            {(isSectioned || sectionTitle) && onRestartSection && (
              <button
                type="button"
                onClick={onRestartSection}
                className="w-full sm:flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw size={14} />
                <span>Repeat {sectionTitle ? `"${sectionTitle}"` : 'This Section'} Only</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => (onRestartCourse || onRestartSection)?.()}
              className={`w-full sm:flex-1 py-2.5 text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all rounded-xl ${
                (isSectioned || sectionTitle)
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700'
                  : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white'
              }`}
            >
              <RotateCcw size={14} />
              <span>{(isSectioned || sectionTitle) ? 'Start from Beginning' : 'Repeat Entire Module from Start'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTROLLER ACTION BUTTONS */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {hasChecked && !feedback?.isCorrect && (maxRetries === 0 || attemptsRemaining > 0) && (
            <button
              type="button"
              onClick={handleResetQuiz}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Retry Activity {maxRetries > 0 ? `(${attemptsRemaining} left)` : ''}</span>
            </button>
          )}

          {/* Stepper Navigation Previous Button */}
          {totalQuestionsCount > 1 && activeQuestionIndex > 0 && (
            <button
              type="button"
              onClick={() => setActiveQuestionIndex(prev => Math.max(0, prev - 1))}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Previous Question</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* If multi-question and not yet on the last question during answering */}
          {!hasChecked && totalQuestionsCount > 1 && activeQuestionIndex < totalQuestionsCount - 1 && (
            <button
              type="button"
              onClick={() => setActiveQuestionIndex(prev => Math.min(totalQuestionsCount - 1, prev + 1))}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
            >
              <span>Next Question</span>
              <ArrowRight size={14} />
            </button>
          )}

          {/* If on the last question or single-question, show Submit / Check Answer */}
          {!hasChecked && (totalQuestionsCount <= 1 || activeQuestionIndex === totalQuestionsCount - 1) && (
            <button
              type="button"
              onClick={() => {
                if (quiz.type === 'Multiple Choice') handleCheckMultipleChoice();
                else if (quiz.type === 'Multiple Response') handleCheckMultipleResponse();
                else if (quiz.type === 'True or False') handleCheckTrueFalse();
                else if (quiz.type === 'Identification') handleCheckIdentification();
                else if (quiz.type === 'Numeric') handleCheckNumeric();
                else if (quiz.type === 'Dropdown Select') handleCheckDropdownSelect();
                else if (quiz.type === 'Enumeration') handleCheckEnumeration();
                else if (quiz.type === 'Sequencing') handleCheckSequencing();
                else if (quiz.type === 'Click an Image') handleCheckHotspot();
                else if (quiz.type === 'Connect the Dots') ctdTriggerRef.current?.();
                else if (quiz.type === 'Categorization') handleCheckCategorization();
                else {
                  finishOverallEvaluation(
                    true,
                    quiz.totalPoints || 5,
                    quiz.totalPoints || 5,
                    1,
                    0,
                    'Activity completed.'
                  );
                }
              }}
              disabled={
                (quiz.type === 'Multiple Choice' && !isAllAnswered) ||
                (quiz.type === 'Multiple Response' && !isAllAnswered) ||
                (quiz.type === 'True or False' && !isAllAnswered) ||
                (quiz.type === 'Identification' && !isAllAnswered) ||
                (quiz.type === 'Numeric' && !isAllAnswered) ||
                (quiz.type === 'Dropdown Select' && !isAllAnswered) ||
                (quiz.type === 'Click an Image' && Object.keys(hotspotAnswers).length === 0) ||
                (quiz.type === 'Connect the Dots' && ctdConnectedCount < (quiz.data?.connectTheDots?.pairs?.length || 1)) ||
                (quiz.type === 'Categorization' && Object.keys(categorizedItems).length < (quiz.data?.categories || []).flatMap((c: any) => c.items || []).length)
              }
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
            >
              <CheckCircle2 size={15} />
              <span>
                {totalQuestionsCount > 1 
                  ? isAllAnswered
                    ? 'Submit & Check Answers'
                    : `Submit (${answeredQuestionsCount}/${totalQuestionsCount} Answered)`
                  : 'Check Answer'}
              </span>
            </button>
          )}

          {/* If reviewed and has next questions in this quiz */}
          {hasChecked && totalQuestionsCount > 1 && activeQuestionIndex < totalQuestionsCount - 1 && (
            <button
              type="button"
              onClick={() => setActiveQuestionIndex(prev => Math.min(totalQuestionsCount - 1, prev + 1))}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              <span>Next Question</span>
              <ChevronRight size={14} />
            </button>
          )}

          {/* Continue / Next Step button ONLY after passing the activity */}
          {hasChecked && (totalQuestionsCount <= 1 || activeQuestionIndex === totalQuestionsCount - 1) && onContinueNext && (feedback?.isCorrect || !quiz.isGraded) && (
            <button
              type="button"
              onClick={onContinueNext}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all animate-in fade-in"
            >
              <span>{continueNextLabel || 'Continue ➔'}</span>
              <ChevronRight size={15} />
            </button>
          )}

          {/* If failed and retries exhausted, show restart options */}
          {hasChecked && !feedback?.isCorrect && maxRetries > 0 && attemptsRemaining === 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {(isSectioned || sectionTitle) && onRestartSection && (
                <button
                  type="button"
                  onClick={onRestartSection}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all animate-in fade-in"
                >
                  <RotateCcw size={14} />
                  <span>Repeat {sectionTitle ? `"${sectionTitle}"` : 'Section'} Only</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => (onRestartCourse || onRestartSection)?.()}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all animate-in fade-in ${
                  (isSectioned || sectionTitle)
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                <RotateCcw size={14} />
                <span>{(isSectioned || sectionTitle) ? 'Start from Beginning' : 'Repeat Entire Module from Start'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {activePointerDrag && (
        <div
          className="fixed pointer-events-none z-50 bg-blue-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${activePointerDrag.clientX}px`,
            top: `${activePointerDrag.clientY}px`,
          }}
        >
          <span className="opacity-40 text-[10px] select-none">☰</span>
          <span>{activePointerDrag.itemText}</span>
        </div>
      )}
      {seqDragItem && seqPointerPos && (
        <div
          className="fixed pointer-events-none z-50 p-3.5 bg-blue-600 text-white rounded-xl shadow-2xl border-2 border-white/80 flex items-center gap-2.5 w-80 max-w-sm transform -translate-x-1/2 -translate-y-1/2 opacity-95 scale-105"
          style={{ left: seqPointerPos.x, top: seqPointerPos.y }}
        >
          <GripVertical size={16} className="text-blue-200 shrink-0" />
          <span className="text-xs font-bold line-clamp-2">{seqDragItem.text}</span>
        </div>
      )}
    </div>
  );
}
