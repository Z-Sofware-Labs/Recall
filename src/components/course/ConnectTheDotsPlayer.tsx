import { useState, useEffect, useRef, useCallback, PointerEvent as ReactPointerEvent } from 'react';
import { X } from 'lucide-react';
import { QuizActivity } from '../../types/quiz';

const pairColors = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4',
];

interface ConnectTheDotsPlayerProps {
  quiz: QuizActivity;
  onComplete: (result: { 
    score: number; 
    maxScore: number; 
    passed: boolean;
    detailedResults?: Array<{
      questionText: string;
      isCorrect: boolean;
      userAnswer: string;
      correctAnswer: string;
      explanation?: string;
    }>;
  }) => void;
  hasChecked?: boolean;
  onTriggerCheck?: (fn: () => void) => void;
  onConnectionCountChange?: (connected: number, total: number) => void;
}

function getDotCoords(
  el: HTMLElement | null | undefined,
  container: HTMLElement | null,
  side: 'left' | 'right'
): { x: number; y: number } | null {
  if (!el || !container) return null;
  const cr = container.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    x: side === 'left' ? r.right - cr.left : r.left - cr.left,
    y: r.top + r.height / 2 - cr.top,
  };
}

export default function ConnectTheDotsPlayer({
  quiz,
  onComplete,
  hasChecked = false,
  onTriggerCheck,
  onConnectionCountChange,
}: ConnectTheDotsPlayerProps) {
  const pairs = quiz.data?.connectTheDots?.pairs || [];
  const leftTitle = quiz.data?.connectTheDots?.leftTitle || 'Column A';
  const rightTitle = quiz.data?.connectTheDots?.rightTitle || 'Column B';
  const pointsPerCorrect = quiz.pointsPerCorrect || 1;
  const deductionPerMistake = quiz.deductionPerMistake || 0;
  const passingScore = quiz.passingScore ?? Math.ceil(pairs.length * pointsPerCorrect * 0.7);

  const [shuffledRight, setShuffledRight] = useState<Array<{ id: string; rightText: string }>>([]);
  const [userConnections, setUserConnections] = useState<Record<string, string>>({});
  const [activeSelectedLeftId, setActiveSelectedLeftId] = useState<string | null>(null);
  const [activeSelectedRightId, setActiveSelectedRightId] = useState<string | null>(null);
  const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<{
    checked: boolean; score: number; maxScore: number; isPassed: boolean;
  } | null>(null);
  const [activeLineDrag, setActiveLineDrag] = useState<{
    origin: 'left' | 'right'; originId: string;
    startX: number; startY: number; currentX: number; currentY: number; isMoved: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const leftItemRefs = useRef<Record<string, HTMLElement | null>>({});
  const rightItemRefs = useRef<Record<string, HTMLElement | null>>({});
  const [nodeCoords, setNodeCoords] = useState<{
    left: Record<string, { x: number; y: number }>;
    right: Record<string, { x: number; y: number }>;
  }>({ left: {}, right: {} });

  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const shuffled = [...pairs].map(p => ({ id: p.id, rightText: p.rightText })).sort(() => Math.random() - 0.5);
    setShuffledRight(shuffled);
    setUserConnections({});
    setValidationResults(null);
    setActiveSelectedLeftId(null);
    setActiveSelectedRightId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.id]);

  useEffect(() => {
    if (!hasChecked && validationResults?.checked) {
      setValidationResults(null);
      setUserConnections({});
      setActiveSelectedLeftId(null);
      setActiveSelectedRightId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasChecked]);

  const updateNodeCoords = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const left: Record<string, { x: number; y: number }> = {};
    const right: Record<string, { x: number; y: number }> = {};
    Object.entries(leftItemRefs.current).forEach(([id, el]) => {
      const c = getDotCoords(el as HTMLElement | null, container, 'left');
      if (c) left[id] = c;
    });
    Object.entries(rightItemRefs.current).forEach(([id, el]) => {
      const c = getDotCoords(el as HTMLElement | null, container, 'right');
      if (c) right[id] = c;
    });
    setNodeCoords({ left, right });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const t = setTimeout(updateNodeCoords, 60);
    const ro = new ResizeObserver(updateNodeCoords);
    ro.observe(container);
    window.addEventListener('resize', updateNodeCoords);
    window.addEventListener('scroll', updateNodeCoords, true);
    return () => {
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('resize', updateNodeCoords);
      window.removeEventListener('scroll', updateNodeCoords, true);
    };
  }, [updateNodeCoords, shuffledRight]);

  useEffect(() => {
    updateNodeCoords();
    onConnectionCountChange?.(Object.keys(userConnections).length, pairs.length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userConnections, pairs.length]);

  const connectPair = useCallback((leftId: string, rightId: string) => {
    setUserConnections(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (next[k] === rightId) delete next[k]; });
      next[leftId] = rightId;
      return next;
    });
    setActiveSelectedLeftId(null);
    setActiveSelectedRightId(null);
    setHoveredCandidateId(null);
  }, []);

  const handleRemoveConnection = (leftId: string) => {
    if (hasChecked || validationResults?.checked) return;
    setUserConnections(prev => { const n = { ...prev }; delete n[leftId]; return n; });
  };

  const handlePointerDownLeft = (e: ReactPointerEvent, leftId: string) => {
    if (hasChecked || validationResults?.checked || e.button !== 0 || !containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    const coord = getDotCoords(leftItemRefs.current[leftId], containerRef.current, 'left')
      ?? { x: e.clientX - cr.left, y: e.clientY - cr.top };
    setActiveLineDrag({ origin: 'left', originId: leftId, startX: coord.x, startY: coord.y, currentX: e.clientX - cr.left, currentY: e.clientY - cr.top, isMoved: false });
  };

  const handlePointerDownRight = (e: ReactPointerEvent, rightId: string) => {
    if (hasChecked || validationResults?.checked || e.button !== 0 || !containerRef.current) return;
    const cr = containerRef.current.getBoundingClientRect();
    const coord = getDotCoords(rightItemRefs.current[rightId], containerRef.current, 'right')
      ?? { x: e.clientX - cr.left, y: e.clientY - cr.top };
    setActiveLineDrag({ origin: 'right', originId: rightId, startX: coord.x, startY: coord.y, currentX: e.clientX - cr.left, currentY: e.clientY - cr.top, isMoved: false });
  };

  useEffect(() => {
    if (!activeLineDrag) return;
    const handleMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const cr = containerRef.current.getBoundingClientRect();
      const currentX = e.clientX - cr.left;
      const currentY = e.clientY - cr.top;
      const dist = Math.hypot(currentX - activeLineDrag.startX, currentY - activeLineDrag.startY);
      setActiveLineDrag(prev => prev ? { ...prev, currentX, currentY, isMoved: prev.isMoved || dist > 8 } : null);
      const target = document.elementFromPoint(e.clientX, e.clientY);
      setHoveredCandidateId(
        activeLineDrag.origin === 'left'
          ? target?.closest('[data-right-id]')?.getAttribute('data-right-id') || null
          : target?.closest('[data-left-id]')?.getAttribute('data-left-id') || null
      );
    };
    const handleUp = (e: PointerEvent) => {
      if (!activeLineDrag) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (activeLineDrag.isMoved) {
        if (activeLineDrag.origin === 'left') {
          const rightId = target?.closest('[data-right-id]')?.getAttribute('data-right-id');
          if (rightId) connectPair(activeLineDrag.originId, rightId);
        } else {
          const leftId = target?.closest('[data-left-id]')?.getAttribute('data-left-id');
          if (leftId) connectPair(leftId, activeLineDrag.originId);
        }
        setActiveSelectedLeftId(null);
        setActiveSelectedRightId(null);
      } else {
        if (activeLineDrag.origin === 'left') {
          if (activeSelectedRightId) { connectPair(activeLineDrag.originId, activeSelectedRightId); }
          else { setActiveSelectedLeftId(prev => prev === activeLineDrag.originId ? null : activeLineDrag.originId); }
        } else {
          if (activeSelectedLeftId) { connectPair(activeSelectedLeftId, activeLineDrag.originId); }
          else { setActiveSelectedRightId(prev => prev === activeLineDrag.originId ? null : activeLineDrag.originId); }
        }
      }
      setActiveLineDrag(null);
      setHoveredCandidateId(null);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [activeLineDrag, activeSelectedLeftId, activeSelectedRightId, connectPair]);

  const runEvaluation = useCallback(() => {
    let correct = 0; let mistakes = 0;
    const detailedResults: any[] = [];
    
    pairs.forEach(p => {
      const rightId = userConnections[p.id];
      const isCorrect = rightId === p.id;
      if (isCorrect) correct++; else mistakes++;

      const rightItem = shuffledRight.find(r => r.id === rightId);
      
      detailedResults.push({
        questionText: `Match left item: "${p.leftText}"`,
        isCorrect,
        userAnswer: rightItem ? rightItem.rightText : 'No connection',
        correctAnswer: p.rightText,
        explanation: p.explanation
      });
    });

    const isGraded = pointsPerCorrect > 0;
    const finalScore = Math.max(0, correct * pointsPerCorrect - (isGraded ? mistakes * deductionPerMistake : 0));
    const maxScore = pairs.length * pointsPerCorrect;
    const isPassed = !isGraded || finalScore >= passingScore;
    setValidationResults({ checked: true, score: finalScore, maxScore, isPassed });
    onCompleteRef.current({ score: finalScore, maxScore, passed: isPassed, detailedResults });
  }, [userConnections, pairs, pointsPerCorrect, deductionPerMistake, passingScore, shuffledRight]);

  useEffect(() => { onTriggerCheck?.(runEvaluation); }, [runEvaluation, onTriggerCheck]);

  const isChecked = hasChecked || !!validationResults?.checked;

  return (
    <div className="space-y-3">
      <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
        <p className="text-sm font-bold text-slate-900 dark:text-white">{quiz.prompt || 'Match each item on the left with its correct pair on the right.'}</p>
        {quiz.instructions && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{quiz.instructions}</p>}
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] text-slate-500 font-semibold">{Object.keys(userConnections).length} of {pairs.length} connected</span>
        {!isChecked && Object.keys(userConnections).length > 0 && (
          <button type="button" onClick={() => { setUserConnections({}); setActiveSelectedLeftId(null); setActiveSelectedRightId(null); }} className="text-[11px] text-slate-400 hover:text-rose-500 font-semibold transition-colors cursor-pointer">Clear all</button>
        )}
      </div>

      <div ref={containerRef} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 min-h-[280px] select-none touch-none cursor-default">
        <svg className="absolute inset-0 pointer-events-none z-10" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {Object.entries(userConnections).map(([leftId, rightId], idx) => {
            const lp = nodeCoords.left[leftId]; const rp = nodeCoords.right[rightId];
            if (!lp || !rp) return null;
            const correct = leftId === rightId;
            const color = isChecked ? (correct ? '#10b981' : '#f43f5e') : pairColors[idx % pairColors.length];
            const dx = rp.x - lp.x;
            const d = `M ${lp.x} ${lp.y} C ${lp.x + dx * 0.45} ${lp.y}, ${rp.x - dx * 0.45} ${rp.y}, ${rp.x} ${rp.y}`;
            return (
              <g key={`c_${leftId}_${rightId}`}>
                <path d={d} fill="none" stroke={color} strokeWidth="8" strokeOpacity="0.18" />
                <path d={d} fill="none" stroke={color} strokeWidth="3" strokeDasharray={isChecked && !correct ? '6 4' : 'none'} strokeLinecap="round" />
                <circle cx={(lp.x + rp.x) / 2} cy={(lp.y + rp.y) / 2} r="4" fill={color} stroke="white" strokeWidth="1.5" />
              </g>
            );
          })}
          {activeLineDrag && (() => {
            const isLeft = activeLineDrag.origin === 'left';
            const cx1 = activeLineDrag.startX + (activeLineDrag.currentX - activeLineDrag.startX) * (isLeft ? 0.5 : -0.5);
            const cx2 = activeLineDrag.currentX + (activeLineDrag.startX - activeLineDrag.currentX) * (isLeft ? -0.5 : 0.5);
            const d = `M ${activeLineDrag.startX} ${activeLineDrag.startY} C ${cx1} ${activeLineDrag.startY}, ${cx2} ${activeLineDrag.currentY}, ${activeLineDrag.currentX} ${activeLineDrag.currentY}`;
            return (
              <g>
                <path d={d} fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeOpacity="0.85" strokeDasharray="6 3" strokeLinecap="round" />
                <circle cx={activeLineDrag.currentX} cy={activeLineDrag.currentY} r="5" fill="#2563eb" stroke="white" strokeWidth="2" />
              </g>
            );
          })()}
        </svg>

        <div className="relative z-20 grid grid-cols-2 gap-2.5 sm:gap-6 md:gap-12">
          <div className="space-y-2 sm:space-y-3">
            <h4 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800">{leftTitle}</h4>
            {pairs.map((pair, idx) => {
              const connected = !!userConnections[pair.id];
              const selected = activeSelectedLeftId === pair.id;
              const candidateHover = hoveredCandidateId === pair.id && activeLineDrag?.origin === 'right';
              const correct = userConnections[pair.id] === pair.id;
              return (
                <div key={pair.id} data-left-id={pair.id}
                  ref={el => { leftItemRefs.current[pair.id] = el; }}
                  onPointerDown={e => handlePointerDownLeft(e, pair.id)}
                  className={`group relative p-2 sm:p-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-1.5 cursor-grab active:cursor-grabbing touch-none ${
                    selected || candidateHover ? 'border-blue-500 bg-blue-600 text-white shadow-lg ring-4 ring-blue-400/40'
                    : isChecked ? correct ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-rose-500 bg-rose-600 text-white'
                    : connected ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-slate-700 dark:border-slate-800 bg-slate-800 dark:bg-slate-950 text-white hover:border-blue-400 hover:shadow-md'
                  }`}>
                  <div className="flex items-center gap-1.5 min-w-0 pointer-events-none">
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-700 dark:bg-slate-800 text-slate-200 dark:text-slate-400 text-[9px] sm:text-[10px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                    <p className="text-[10px] sm:text-xs font-bold text-white truncate max-w-[80px] xs:max-w-[120px] sm:max-w-none">{pair.leftText}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {connected && !isChecked && (
                      <button type="button" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); handleRemoveConnection(pair.id); }} className="p-0.5 text-slate-300 hover:text-rose-400 cursor-pointer"><X size={11} /></button>
                    )}
                    <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center transition-all ${selected || connected || candidateHover ? 'bg-blue-400 border-white ring-2 ring-blue-300 scale-125' : 'bg-slate-600 dark:bg-slate-700 border-white dark:border-slate-900 group-hover:bg-blue-400 group-hover:scale-110'}`}>
                      <div className="w-1 h-1 rounded-full bg-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 sm:space-y-3">
            <h4 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800 text-right">{rightTitle}</h4>
            {shuffledRight.map(item => {
              const connectedLeftId = Object.entries(userConnections).find(([, rId]) => rId === item.id)?.[0];
              const connected = !!connectedLeftId;
              const selected = activeSelectedRightId === item.id;
              const candidateHover = hoveredCandidateId === item.id && activeLineDrag?.origin === 'left';
              const isActiveTarget = !isChecked && activeSelectedLeftId !== null && !connected;
              const correct = connected && connectedLeftId === item.id;
              return (
                <div key={item.id} data-right-id={item.id}
                  ref={el => { rightItemRefs.current[item.id] = el; }}
                  onPointerDown={e => handlePointerDownRight(e, item.id)}
                  className={`group relative p-2 sm:p-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-1.5 cursor-grab active:cursor-grabbing touch-none ${
                    selected || candidateHover ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/70 ring-4 ring-blue-400/40 shadow-lg'
                    : isChecked ? correct ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/30'
                    : connected ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-950/20'
                    : isActiveTarget ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 hover:shadow-md'
                  }`}>
                  <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${selected || connected || candidateHover ? 'bg-blue-600 border-white ring-2 ring-blue-500 scale-125' : 'bg-slate-200 dark:bg-slate-700 border-white dark:border-slate-900 group-hover:bg-blue-500 group-hover:scale-110'}`}>
                    <div className="w-1 h-1 rounded-full bg-white" />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0 pointer-events-none flex-1 justify-end">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-900 dark:text-white truncate max-w-[80px] xs:max-w-[120px] sm:max-w-none text-right">{item.rightText}</p>
                    {isChecked && correct && <span className="shrink-0 text-emerald-500 text-xs font-bold">+</span>}
                    {isChecked && !correct && connected && <span className="shrink-0 text-rose-500 text-xs font-bold">x</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!isChecked && (
        <p className="text-[10px] sm:text-[11px] text-slate-400 text-center">
          {activeSelectedLeftId ? 'Now click or drag to a match on the right'
           : activeSelectedRightId ? 'Now click or drag to a match on the left'
           : 'Click a left item, then its match — or drag directly across'}
        </p>
      )}
    </div>
  );
}
