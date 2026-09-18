import { useState, useEffect, useRef, useMemo, useCallback, MouseEvent, ChangeEvent, DragEvent, PointerEvent } from 'react';
import { 
  MousePointerClick, MapPin, Eye, Edit3, Plus, Trash2, Check, X,
  Save, RotateCcw, Award, MinusCircle, AlertCircle, CheckCircle2,
  Sparkles, Layers, Image as ImageIcon, Map, Activity, HelpCircle,
  Maximize2, ZoomIn, Target, ChevronRight, Crosshair, Upload, Link,
  RefreshCw, FileImage, Download, Undo2, Redo2
} from 'lucide-react';
import { scoreService } from '../../services/scoreService';
import { HotspotTarget, QuizActivity } from '../../types/quiz';
import { downloadImageAsDataUrl } from '../../utils/imageUtils';
import { useQuizUndoRedo } from '../../hooks/useQuizUndoRedo';
import { QuizUndoRedoButtons } from './QuizUndoRedoButtons';

const defaultStarterImage = '';

const defaultStarterHotspots: HotspotTarget[] = [];

interface ClickAnImageProps {
  initialData?: QuizActivity | null;
  onBack?: () => void;
  onSaveToCourse?: (activity: QuizActivity) => void;
}

export default function ClickAnImage({ 
  initialData, 
  onBack, 
  onSaveToCourse 
}: ClickAnImageProps) {
  const [viewMode, setViewMode] = useState<'author' | 'preview'>('author');

  // Form Metadata
  const [prompt, setPrompt] = useState(
    initialData?.prompt || 'Click an Image Activity'
  );
  const [instructions, setInstructions] = useState(
    initialData?.instructions || 'Examine the image below and click directly on the requested location or target object.'
  );
  const [imageUrl, setImageUrl] = useState(
    initialData?.data?.clickAnImage?.imageUrl || defaultStarterImage
  );
  const [hotspots, setHotspots] = useState<HotspotTarget[]>(
    initialData?.data?.clickAnImage?.hotspots && initialData.data.clickAnImage.hotspots.length > 0
      ? initialData.data.clickAnImage.hotspots
      : defaultStarterHotspots
  );

  // Scoring & Retry Configuration
  const [pointsPerCorrect, setPointsPerCorrect] = useState<number>(initialData?.pointsPerCorrect ?? 2);
  const [deductionPerMistake, setDeductionPerMistake] = useState<number>(initialData?.deductionPerMistake ?? 1);
  const [retries, setRetries] = useState<number>(initialData?.retries ?? 2);
  const [isGraded, setIsGraded] = useState<boolean>(initialData?.isGraded ?? true);
  const [passingScore, setPassingScore] = useState<number>(() => {
    if (initialData?.passingScore !== undefined) return initialData.passingScore;
    const count = initialData?.data?.clickAnImage?.hotspots?.length || defaultStarterHotspots.length;
    return Math.max(1, Math.ceil(count * (initialData?.pointsPerCorrect ?? 2) * 0.7));
  });
  const [defaultRadius, setDefaultRadius] = useState<number>(6.5);

  // Undo & Redo History State
  const currentSnapshot = useMemo(() => ({
    prompt,
    instructions,
    imageUrl,
    hotspots,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
    isGraded,
    defaultRadius,
  }), [
    prompt,
    instructions,
    imageUrl,
    hotspots,
    pointsPerCorrect,
    passingScore,
    deductionPerMistake,
    retries,
    isGraded,
    defaultRadius,
  ]);

  const applySnapshot = useCallback((state: typeof currentSnapshot) => {
    if (state.prompt !== undefined) setPrompt(state.prompt);
    if (state.instructions !== undefined) setInstructions(state.instructions);
    if (state.imageUrl !== undefined) setImageUrl(state.imageUrl);
    if (state.hotspots !== undefined) setHotspots(state.hotspots);
    if (state.pointsPerCorrect !== undefined) setPointsPerCorrect(state.pointsPerCorrect);
    if (state.passingScore !== undefined) setPassingScore(state.passingScore);
    if (state.deductionPerMistake !== undefined) setDeductionPerMistake(state.deductionPerMistake);
    if (state.retries !== undefined) setRetries(state.retries);
    if (state.isGraded !== undefined) setIsGraded(state.isGraded);
    if (state.defaultRadius !== undefined) setDefaultRadius(state.defaultRadius);
  }, []);

  const { canUndo, canRedo, handleUndo, handleRedo } = useQuizUndoRedo(currentSnapshot, applySnapshot);

  // Authoring Selection State
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(
    hotspots[0]?.id || null
  );
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlErrorMessage, setUrlErrorMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isDraggingImageOver, setIsDraggingImageOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleFetchAndApplyUrl = async () => {
    const rawUrl = customUrlInput.trim();
    if (!rawUrl) return;

    setIsFetchingUrl(true);
    setUrlErrorMessage(null);

    try {
      // 1. Download and convert to base64 Data URL (or fallback to clean URL)
      const dataUrl = await downloadImageAsDataUrl(rawUrl);
      
      if (!dataUrl) {
        setUrlErrorMessage('Could not load image from this URL. Please verify the link.');
        return;
      }

      // 2. Test if browser can render it
      const img = new Image();
      const loadPromise = new Promise<boolean>((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      });
      img.src = dataUrl;

      const isValid = await loadPromise;

      if (!isValid) {
        // Fallback test with original URL directly
        const fallbackImg = new Image();
        const fallbackPromise = new Promise<boolean>((resolve) => {
          fallbackImg.onload = () => resolve(true);
          fallbackImg.onerror = () => resolve(false);
        });
        fallbackImg.src = rawUrl;
        const isFallbackValid = await fallbackPromise;

        if (isFallbackValid) {
          setImageUrl(rawUrl);
          setCustomUrlInput('');
          setIsUrlInputOpen(false);
          handleResetLearnerState();
          return;
        }

        setUrlErrorMessage('Failed to load image from URL. Please ensure the link ends in .jpg, .png, .webp or is a direct image.');
        return;
      }

      setImageUrl(dataUrl);
      setCustomUrlInput('');
      setIsUrlInputOpen(false);
      handleResetLearnerState();
    } catch (err: any) {
      console.error('Error fetching image from URL:', err);
      // If error occurs, still try setting raw URL if it is http/https
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        setImageUrl(rawUrl);
        setCustomUrlInput('');
        setIsUrlInputOpen(false);
        handleResetLearnerState();
      } else {
        setUrlErrorMessage('Error loading image. Please check the URL.');
      }
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Learner Preview Interactive State (Full Parity with Standalone Player)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [learnerPins, setLearnerPins] = useState<Record<string, { xPercent: number; yPercent: number }>>({});
  const [attemptsRemaining, setAttemptsRemaining] = useState(retries);
  const [evaluationResult, setEvaluationResult] = useState<{
    checked: boolean;
    isPassed: boolean;
    earnedScore: number;
    maxScore: number;
    correctCount: number;
    detailed: Record<string, { isCorrect: boolean; distancePercent: number; pointsAwarded: number; deductionApplied: number }>;
  } | null>(null);

  // Sync with initialData if updated from Course Organizer
  useEffect(() => {
    if (initialData) {
      setPrompt(initialData.prompt || 'Click an Image Activity');
      setInstructions(initialData.instructions || 'Examine the image below and click directly on the requested location or target object.');
      if (initialData.data?.clickAnImage) {
        setImageUrl(initialData.data.clickAnImage.imageUrl);
        setHotspots(initialData.data.clickAnImage.hotspots || []);
        if (initialData.data.clickAnImage.hotspots?.length > 0) {
          setActiveHotspotId(initialData.data.clickAnImage.hotspots[0].id);
        }
      }
      setPointsPerCorrect(initialData.pointsPerCorrect ?? 2);
      setDeductionPerMistake(initialData.deductionPerMistake ?? 1);
      setRetries(initialData.retries ?? 2);
      setIsGraded(initialData.isGraded ?? true);
      const count = initialData.data?.clickAnImage?.hotspots?.length || hotspots.length;
      setPassingScore(initialData.passingScore ?? Math.max(1, Math.ceil(count * (initialData.pointsPerCorrect ?? 2) * 0.7)));
    }
  }, [initialData]);

  const activeHotspot = hotspots.find(h => h.id === activeHotspotId) || hotspots[0];
  const targetHotspotForLearner = hotspots[currentQuestionIndex] || hotspots[0];

  // --- Authoring Handlers ---
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setImageUrl(result);
        handleResetLearnerState();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingImageOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setImageUrl(result);
          handleResetLearnerState();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [draggingHotspotId, setDraggingHotspotId] = useState<string | null>(null);

  // Authoring: Canvas click to place / move active hotspot
  const handleCanvasClickAuthor = (e: MouseEvent<HTMLDivElement>) => {
    if (draggingHotspotId) return;
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (clickY / rect.height) * 100));

    if (activeHotspotId) {
      setHotspots(prev => prev.map(h => 
        h.id === activeHotspotId 
          ? { ...h, xPercent: parseFloat(xPercent.toFixed(1)), yPercent: parseFloat(yPercent.toFixed(1)) }
          : h
      ));
    } else {
      const newHs: HotspotTarget = {
        id: `hs_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        label: `Target Point ${hotspots.length + 1}`,
        xPercent: parseFloat(xPercent.toFixed(1)),
        yPercent: parseFloat(yPercent.toFixed(1)),
        radiusPercent: defaultRadius,
        questionPrompt: `Click on the target area`,
        explanation: `Correct! You identified the target location accurately.`,
      };
      setHotspots(prev => [...prev, newHs]);
      setActiveHotspotId(newHs.id);
    }
  };

  const handlePointerDownHotspot = (e: PointerEvent, hsId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveHotspotId(hsId);
    setDraggingHotspotId(hsId);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMoveHotspot = (e: PointerEvent) => {
    if (!draggingHotspotId || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (clickY / rect.height) * 100));

    setHotspots(prev => prev.map(h => 
      h.id === draggingHotspotId 
        ? { ...h, xPercent: parseFloat(xPercent.toFixed(1)), yPercent: parseFloat(yPercent.toFixed(1)) }
        : h
    ));
  };

  const handlePointerUpHotspot = (e: PointerEvent) => {
    if (draggingHotspotId) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      setDraggingHotspotId(null);
    }
  };

  const handleAddNewHotspot = () => {
    const newHs: HotspotTarget = {
      id: `hs_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      label: `Hotspot Target ${hotspots.length + 1}`,
      xPercent: 50.0,
      yPercent: 50.0,
      radiusPercent: defaultRadius,
      questionPrompt: `Locate and click on Target ${hotspots.length + 1}`,
      explanation: `Correct identification of Target ${hotspots.length + 1}.`,
    };
    setHotspots(prev => [...prev, newHs]);
    setActiveHotspotId(newHs.id);
  };

  const handleDeleteHotspot = (id: string) => {
    const remaining = hotspots.filter(h => h.id !== id);
    setHotspots(remaining);
    if (activeHotspotId === id) {
      setActiveHotspotId(remaining[0]?.id || null);
    }
  };

  const handleUpdateActiveHotspot = (field: keyof HotspotTarget, value: any) => {
    if (!activeHotspotId) return;
    setHotspots(prev => prev.map(h => h.id === activeHotspotId ? { ...h, [field]: value } : h));
  };

  // --- Learner Preview Handlers ---
  const handleResetLearnerState = () => {
    setLearnerPins({});
    setEvaluationResult(null);
    setAttemptsRemaining(retries);
    setCurrentQuestionIndex(0);
  };

  const handleCanvasClickLearner = (e: MouseEvent<HTMLDivElement>) => {
    if (evaluationResult?.checked) return;
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (clickY / rect.height) * 100));

    const currentTarget = hotspots[currentQuestionIndex] || hotspots[0];
    if (!currentTarget) return;

    setLearnerPins(prev => ({
      ...prev,
      [currentTarget.id]: {
        xPercent: parseFloat(xPercent.toFixed(1)),
        yPercent: parseFloat(yPercent.toFixed(1)),
      }
    }));

    // Advance to next unpinned hotspot if available
    const nextUnpinnedIdx = hotspots.findIndex((h, idx) => idx !== currentQuestionIndex && !learnerPins[h.id] && h.id !== currentTarget.id);
    if (nextUnpinnedIdx !== -1) {
      setCurrentQuestionIndex(nextUnpinnedIdx);
    }
  };

  const handleRemoveLearnerPin = (hotspotId: string) => {
    if (evaluationResult?.checked) return;
    setLearnerPins(prev => {
      const next = { ...prev };
      delete next[hotspotId];
      return next;
    });
  };

  const handleClearAllLearnerPins = () => {
    if (evaluationResult?.checked) return;
    setLearnerPins({});
  };

  const handleCheckLearnerAssessment = () => {
    if (hotspots.length === 0 || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();

    let correctCount = 0;
    let mistakeCount = 0;
    let earnedPoints = 0;
    const detailed: Record<string, { isCorrect: boolean; distancePercent: number; pointsAwarded: number; deductionApplied: number }> = {};

    hotspots.forEach(hs => {
      const pin = learnerPins[hs.id];
      if (!pin) {
        mistakeCount += 1;
        detailed[hs.id] = {
          isCorrect: false,
          distancePercent: 100,
          pointsAwarded: 0,
          deductionApplied: deductionPerMistake,
        };
        return;
      }

      const targetXpx = (hs.xPercent / 100) * rect.width;
      const targetYpx = (hs.yPercent / 100) * rect.height;
      const pinXpx = (pin.xPercent / 100) * rect.width;
      const pinYpx = (pin.yPercent / 100) * rect.height;
      const radiusPx = ((hs.radiusPercent || 8) / 100) * rect.width;

      const dx = pinXpx - targetXpx;
      const dy = pinYpx - targetYpx;
      const distPx = Math.sqrt(dx * dx + dy * dy);
      const isCorrect = distPx <= radiusPx;
      const distPercent = (distPx / rect.width) * 100;

      if (isCorrect) {
        correctCount += 1;
        earnedPoints += pointsPerCorrect;
        detailed[hs.id] = {
          isCorrect: true,
          distancePercent: parseFloat(distPercent.toFixed(1)),
          pointsAwarded: pointsPerCorrect,
          deductionApplied: 0,
        };
      } else {
        mistakeCount += 1;
        detailed[hs.id] = {
          isCorrect: false,
          distancePercent: parseFloat(distPercent.toFixed(1)),
          pointsAwarded: 0,
          deductionApplied: deductionPerMistake,
        };
      }
    });

    const deductions = mistakeCount * deductionPerMistake;
    const finalScore = Math.max(0, earnedPoints - deductions);
    const maxScore = hotspots.length * pointsPerCorrect;
    const isPassed = !isGraded || finalScore >= passingScore;

    setEvaluationResult({
      checked: true,
      isPassed,
      earnedScore: finalScore,
      maxScore,
      correctCount,
      detailed,
    });

    if (!isPassed && retries > 0 && attemptsRemaining > 0) {
      setAttemptsRemaining(prev => prev - 1);
    }

    scoreService.recordQuizScore({
      courseId: 'proj_sample_01',
      quizId: initialData?.id || 'quiz_click_image_01',
      quizTitle: prompt || 'Click an Image Activity',
      quizType: 'Click an Image',
      score: finalScore,
      maxScore,
      correctCount,
      mistakeCount,
      attempts: retries > 0 ? (retries - attemptsRemaining + 1) : 1,
    });
  };

  const totalMaxScore = hotspots.length * pointsPerCorrect;

  // Save to Course Organizer
  const handleSaveToCourse = () => {
    const activity: QuizActivity = {
      id: initialData?.id || `quiz_img_${Date.now()}`,
      name: prompt || 'Click an Image Activity',
      type: 'Click an Image',
      prompt,
      instructions,
      pointsPerCorrect,
      deductionPerMistake,
      retries,
      isGraded,
      passingScore: isGraded ? passingScore : undefined,
      data: {
        clickAnImage: {
          imageUrl,
          imageTitle: prompt,
          imageTheme: 'map',
          hotspots,
        },
      },
      totalPoints: totalMaxScore,
      lastModified: Date.now(),
    };

    onSaveToCourse?.(activity);
    setSaveSuccessMessage('Click an Image activity saved to Course Editor! You can double-click this quiz in Course Editor to reload and update anytime.');
    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 4000);
  };

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-200 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
            <MousePointerClick size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Question Type
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Click an Image (Interactive Hotspot)
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {prompt || 'Untitled Hotspot Activity'}
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
              onClick={() => {
                setViewMode('preview');
                handleResetLearnerState();
              }}
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
            title="Save this activity directly to Course Editor (no disk file)"
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

      {/* Save Success Toast */}
      {saveSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{saveSuccessMessage}</span>
          </div>
          <button 
            onClick={() => setSaveSuccessMessage(null)} 
            className="text-emerald-600 hover:text-emerald-800 dark:hover:text-white cursor-pointer p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. AUTHORING MODE                                                         */}
      {/* ========================================================================= */}
      {viewMode === 'author' && (
        <div className="space-y-6">
          {/* Metadata & Title Configuration */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Activity Title & Prompt
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Map of Pearl River Delta / Identification of Human Heart Anatomy"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Learner Instructions
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Examine the diagram below and click directly on the requested location or target object."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Image Source & Upload Bar for Teachers */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <FileImage size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Activity Image Asset</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload your own diagram, map, body scan, or schematic for this question
                </p>
              </div>
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Upload size={14} />
                <span>Upload Custom Image</span>
              </button>

              <button
                onClick={() => setIsUrlInputOpen(!isUrlInputOpen)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                <Link size={14} />
                <span>Image URL</span>
              </button>
            </div>
          </div>

          {/* Optional URL input box */}
          {isUrlInputOpen && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customUrlInput}
                  onChange={(e) => {
                    setCustomUrlInput(e.target.value);
                    setUrlErrorMessage(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleFetchAndApplyUrl();
                    }
                  }}
                  placeholder="Paste direct image link (e.g. https://...)..."
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-hidden font-mono"
                />
                <button
                  type="button"
                  onClick={handleFetchAndApplyUrl}
                  disabled={!customUrlInput.trim() || isFetchingUrl}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer shadow-xs transition-all flex items-center gap-1.5 shrink-0"
                >
                  {isFetchingUrl ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Fetching...</span>
                    </>
                  ) : (
                    <>
                      <Download size={13} />
                      <span>Fetch & Download</span>
                    </>
                  )}
                </button>
              </div>

              {urlErrorMessage && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{urlErrorMessage}</span>
                </p>
              )}
            </div>
          )}

          {/* Activity Metadata & Scoring Rules */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Question Prompt */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Activity Title & Prompt
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Identify anatomical structures / geographical landmarks"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-hidden"
                />
              </div>

              {/* Instructions */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Learner Instructions
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Click on the requested organ or landmark on the diagram."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-hidden"
                />
              </div>
            </div>

            {/* Scoring & Retries Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {/* Score per correct click (0 for non-graded) */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Award size={15} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Score per correct target</span>
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
                  />
                  <span className="text-xs font-medium text-slate-500">pts</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {pointsPerCorrect > 0 ? `Total section value: ${totalMaxScore} pts` : '0 pts = Non-graded exploration'}
                </p>
              </div>

              {/* Passing Score (Automatically grayed out if non-graded) */}
              <div className={`space-y-1.5 p-3.5 rounded-xl border transition-all ${
                pointsPerCorrect > 0 
                  ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800' 
                  : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
              }`}>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Passing Score</span>
                  {pointsPerCorrect === 0 && (
                    <span className="text-[10px] font-medium text-slate-400">Grayed out</span>
                  )}
                </label>
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="number"
                    min="1"
                    max={totalMaxScore || 1}
                    disabled={pointsPerCorrect === 0}
                    value={pointsPerCorrect > 0 ? passingScore : ''}
                    onChange={(e) => setPassingScore(Math.max(1, Math.min(totalMaxScore, parseInt(e.target.value, 10) || 1)))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:bg-slate-100 disabled:dark:bg-slate-950 disabled:text-slate-400 disabled:cursor-not-allowed text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-hidden"
                    placeholder={pointsPerCorrect > 0 ? 'e.g. 5' : 'N/A (Non-graded)'}
                  />
                  <span className="text-xs font-medium text-slate-500">pts</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {pointsPerCorrect > 0 
                    ? `Fails if score < ${passingScore} pts (must repeat)` 
                    : 'Non-graded tests have no passing score.'}
                </p>
              </div>

              {/* Deduction per miss (Grayed out if non-graded) */}
              <div className={`space-y-1.5 p-3.5 rounded-xl border transition-all ${
                pointsPerCorrect > 0 
                  ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800' 
                  : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
              }`}>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <MinusCircle size={15} className="text-rose-600 dark:text-rose-400" />
                    <span>Deduction per miss</span>
                  </span>
                  {pointsPerCorrect === 0 && (
                    <span className="text-[10px] font-medium text-slate-400">Grayed out</span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    disabled={pointsPerCorrect === 0}
                    value={pointsPerCorrect > 0 ? deductionPerMistake : ''}
                    onChange={(e) => setDeductionPerMistake(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:bg-slate-100 disabled:dark:bg-slate-950 disabled:text-slate-400 disabled:cursor-not-allowed text-sm font-semibold focus:ring-2 focus:ring-rose-500 outline-hidden"
                    placeholder={pointsPerCorrect > 0 ? '0' : 'N/A (Non-graded)'}
                  />
                  <span className="text-xs font-medium text-slate-500">pts</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {pointsPerCorrect > 0 ? 'Points subtracted per mistake' : 'No deductions on non-graded activities'}
                </p>
              </div>

              {/* Retries */}
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
                  />
                  <span className="text-xs font-medium text-slate-500">retries</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{retries === 0 ? 'Unlimited retries' : `Max ${retries} attempts`}</p>
              </div>
            </div>
          </div>

          {/* Conditional Display: Canvas & Hotspot List ONLY shown if image is uploaded */}
          {!imageUrl || imageUrl.trim() === '' ? (
            <div 
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingImageOver(true);
              }}
              onDragLeave={() => setIsDraggingImageOver(false)}
              onDrop={handleImageDrop}
              onClick={() => {
                if (!isUrlInputOpen) {
                  fileInputRef.current?.click();
                }
              }}
              className={`w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center transition-all shadow-xs ${
                isDraggingImageOver
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 ring-4 ring-purple-400/30'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/40 hover:bg-slate-100/80 dark:hover:bg-slate-900/60'
              } ${!isUrlInputOpen ? 'cursor-pointer' : ''}`}
            >
              {isUrlInputOpen ? (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-lg p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-3.5 text-left animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                      <Link size={15} className="text-purple-600 dark:text-purple-400" />
                      <span>Enter Image Web URL</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setIsUrlInputOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      autoFocus
                      value={customUrlInput}
                      onChange={(e) => {
                        setCustomUrlInput(e.target.value);
                        setUrlErrorMessage(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleFetchAndApplyUrl();
                        }
                      }}
                      placeholder="https://example.com/diagram.png..."
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-purple-500 font-mono"
                    />
                    <button
                      type="button"
                      disabled={!customUrlInput.trim() || isFetchingUrl}
                      onClick={handleFetchAndApplyUrl}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {isFetchingUrl ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <Download size={13} />
                          <span>Load Image</span>
                        </>
                      )}
                    </button>
                  </div>

                  {urlErrorMessage && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{urlErrorMessage}</span>
                    </p>
                  )}

                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    The image will be fetched, downloaded, and converted into an offline-ready format.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 mb-3 shadow-xs">
                    <Upload size={32} />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Upload Canvas Image First</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
                    To configure interactive target hotspots, upload a diagram, anatomical scan, map, or schematic image onto the canvas.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload size={14} />
                      <span>Select Local Image</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsUrlInputOpen(true);
                      }}
                      className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Link size={14} />
                      <span>Enter Image URL</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Interactive Authoring Canvas & Hotspot Detail Panel */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Interactive Image Canvas with Drag & Drop */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crosshair size={16} className="text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Interactive Hotspot Canvas ({hotspots.length} Target Points)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setImageUrl('');
                        setHotspots([]);
                        setActiveHotspotId(null);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      title="Remove current canvas image"
                    >
                      <Trash2 size={12} />
                      <span>Change Image</span>
                    </button>
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-950/50 px-2.5 py-1 rounded-lg">
                      Click image to place target point
                    </span>
                  </div>
                </div>

                {/* Image Canvas */}
                <div className="flex justify-center w-full bg-slate-950/40 rounded-2xl p-2 border border-slate-200 dark:border-slate-800">
                  <div 
                    ref={imageContainerRef}
                    onClick={handleCanvasClickAuthor}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingImageOver(true);
                    }}
                    onDragLeave={() => setIsDraggingImageOver(false)}
                    onDrop={handleImageDrop}
                    className={`relative inline-block max-w-full rounded-xl overflow-hidden border-2 transition-all cursor-crosshair select-none shadow-md ${
                      isDraggingImageOver 
                        ? 'border-purple-500 ring-4 ring-purple-400/40 bg-purple-950/50' 
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <img
                      src={imageUrl}
                      alt="Hotspot target"
                      className="max-h-[55vh] max-w-full w-auto h-auto block pointer-events-none select-none"
                    />

                    {/* Grid Overlay for Precision Alignment */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                    {/* Drag over notice */}
                    {isDraggingImageOver && (
                      <div className="absolute inset-0 bg-purple-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 pointer-events-none">
                        <Upload size={36} className="animate-bounce mb-2" />
                        <p className="font-bold text-sm">Drop image here to load as activity background</p>
                      </div>
                    )}

                  {/* Perfect Circular Tolerance Rings */}
                  {hotspots.map((hs) => {
                    const isSelected = activeHotspotId === hs.id;
                    if (hs.radiusPercent <= 0) return null;
                    return (
                      <div
                        key={`ring_${hs.id}`}
                        style={{
                          left: `${hs.xPercent}%`,
                          top: `${hs.yPercent}%`,
                          width: `${hs.radiusPercent * 2}%`,
                          aspectRatio: '1 / 1',
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all pointer-events-none z-10 ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500/25 ring-4 ring-purple-400/30 animate-pulse'
                            : 'border-white/80 bg-white/10 hover:border-purple-400 hover:bg-purple-500/15'
                        }`}
                      />
                    );
                  })}

                  {/* Hotspot Target Center Markers (Exact Concentric Alignment with Drag and Drop) */}
                  {hotspots.map((hs, idx) => {
                    const isSelected = activeHotspotId === hs.id;
                    const isDragging = draggingHotspotId === hs.id;

                    return (
                      <div
                        key={hs.id}
                        style={{
                          left: `${hs.xPercent}%`,
                          top: `${hs.yPercent}%`,
                        }}
                        onPointerDown={(e) => handlePointerDownHotspot(e, hs.id)}
                        onPointerMove={handlePointerMoveHotspot}
                        onPointerUp={handlePointerUpHotspot}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveHotspotId(hs.id);
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 group/pin z-20 select-none w-8 h-8 touch-none ${
                          isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab hover:scale-105'
                        }`}
                        title={`Drag to reposition Target ${idx + 1}`}
                      >
                        {/* Pin Center Marker (32x32) */}
                        <div className={`w-full h-full rounded-full flex items-center justify-center shadow-xl transition-all scale-100 group-hover/pin:scale-110 ${
                          isSelected 
                            ? 'bg-purple-600 text-white ring-4 ring-white dark:ring-slate-900 shadow-purple-500/50' 
                            : 'bg-white text-slate-800 border-2 border-purple-600 shadow-md'
                        }`}>
                          <span className="text-xs font-black">{idx + 1}</span>
                        </div>

                        {/* Floating Label (Positioned absolutely so it does NOT distort marker center) */}
                        <div className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md pointer-events-none">
                          {hs.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

              {/* Right 1 Col: Hotspot Configuration Panel */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                    Target Hotspot List
                  </h4>
                  <button
                    onClick={handleAddNewHotspot}
                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Target</span>
                  </button>
                </div>

                {/* Hotspots List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {hotspots.map((hs, idx) => {
                    const isSelected = activeHotspotId === hs.id;

                    return (
                      <div
                        key={hs.id}
                        onClick={() => setActiveHotspotId(hs.id)}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 dark:border-purple-600 text-purple-950 dark:text-purple-100 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isSelected ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <span className="font-bold text-xs truncate block">{hs.label}</span>
                            <span className="text-[10px] text-slate-400">({hs.xPercent}%, {hs.yPercent}%) • ±{hs.radiusPercent}%</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHotspot(hs.id);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete hotspot"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {hotspots.length === 0 && (
                    <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      <p className="text-xs text-slate-400">Click anywhere on the image canvas to place your first target point.</p>
                    </div>
                  )}
                </div>

                {/* Selected Hotspot Edit Controls */}
                {activeHotspot && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Target size={14} className="text-purple-600 dark:text-purple-400" />
                        Edit Target Point
                      </span>
                      <span className="text-[10px] text-slate-400">Coordinates: {activeHotspot.xPercent}%, {activeHotspot.yPercent}%</span>
                    </div>

                    {/* Target Label */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Target Label</label>
                      <input
                        type="text"
                        value={activeHotspot.label}
                        onChange={(e) => handleUpdateActiveHotspot('label', e.target.value)}
                        placeholder="e.g. Mount Apo / Left Ventricle / Damaged IC"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-hidden font-medium"
                      />
                    </div>

                    {/* Question Prompt for this hotspot */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Prompt / Question for Learner</label>
                      <textarea
                        rows={2}
                        value={activeHotspot.questionPrompt || ''}
                        onChange={(e) => handleUpdateActiveHotspot('questionPrompt', e.target.value)}
                        placeholder="e.g. Click on the active stratovolcano / left ventricle chamber"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-hidden resize-none"
                      />
                    </div>

                    {/* Tolerance Radius Numeric Input & Range Slider (0-100) */}
                    <div className="space-y-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[11px]">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Tolerance Radius (0 – 100%)
                        </label>
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          {activeHotspot.radiusPercent}% radius
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={activeHotspot.radiusPercent}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                            handleUpdateActiveHotspot('radiusPercent', parseFloat(val.toFixed(1)));
                          }}
                          className="w-24 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-purple-500"
                          placeholder="0 - 100"
                        />
                        <span className="text-xs font-semibold text-slate-500">%</span>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.5"
                          value={activeHotspot.radiusPercent}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateActiveHotspot('radiusPercent', val);
                          }}
                          className="flex-1 accent-purple-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>0% (Pinpoint precision)</span>
                        <span>50%</span>
                        <span>100% (Full area)</span>
                      </div>
                    </div>

                    {/* Feedback Explanation */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Explanation on Correct Click</label>
                      <input
                        type="text"
                        value={activeHotspot.explanation || ''}
                        onChange={(e) => handleUpdateActiveHotspot('explanation', e.target.value)}
                        placeholder="e.g. Correct! This component shows the anomaly. (Optional)"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. LEARNER PREVIEW MODE                                                   */}
      {/* ========================================================================= */}
      {viewMode === 'preview' && (
        <div className="space-y-6">
          {!imageUrl || imageUrl.trim() === '' ? (
            <div className="p-12 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                <FileImage size={24} />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Canvas Image Uploaded</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Please switch back to Authoring mode and upload an image canvas before taking the learner preview.
              </p>
              <button
                onClick={() => setViewMode('author')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Go to Authoring
              </button>
            </div>
          ) : (
            <>
              {/* Question Banner */}
              <div className="p-5 bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl shadow-md space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/60 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider">
                      Click an Image Activity
                    </span>
                    <span className="text-xs text-purple-300">
                      • {hotspots.length} Target{hotspots.length === 1 ? '' : 's'} • Worth {totalMaxScore} pts total
                    </span>
                  </div>
                  {isGraded && (
                    <span className="text-xs font-bold text-amber-300 bg-black/30 px-3 py-1 rounded-lg">
                      Passing Requirement: {passingScore} pts
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-white">
                  {prompt || 'Click an Image Activity'}
                </h3>
                {instructions && (
                  <p className="text-xs text-purple-200/90 leading-relaxed">
                    {instructions}
                  </p>
                )}
              </div>

              {/* Target Selector & Interaction Header (Active when not evaluated) */}
              {!evaluationResult && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Target size={14} />
                      <span>Select Target to Pin ({currentQuestionIndex + 1} of {hotspots.length})</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {learnerPins[targetHotspotForLearner?.id] && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLearnerPin(targetHotspotForLearner.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <X size={13} />
                          <span>Remove Pin</span>
                        </button>
                      )}
                      {Object.keys(learnerPins).length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllLearnerPins}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Clear All ({Object.keys(learnerPins).length})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Target Selection Strip / Tabs */}
                  {hotspots.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      {hotspots.map((hs, idx) => {
                        const isSelected = idx === currentQuestionIndex;
                        const isPinned = !!learnerPins[hs.id];
                        return (
                          <button
                            key={hs.id}
                            type="button"
                            onClick={() => setCurrentQuestionIndex(idx)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-400/40'
                                : isPinned
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span>{idx + 1}. {hs.label}</span>
                            {isPinned && <Check size={13} className="text-emerald-500 dark:text-emerald-400" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Current Active Target Prompt */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      <span className="text-purple-600 dark:text-purple-400 mr-1.5">Prompt:</span>
                      {targetHotspotForLearner?.questionPrompt || `Locate and click on ${targetHotspotForLearner?.label}`}
                    </p>
                    <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                      {learnerPins[targetHotspotForLearner?.id] ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Check size={13} /> Pinned
                        </span>
                      ) : (
                        'Click image to place pin'
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Interactive Image Target Canvas */}
              <div className="flex justify-center w-full bg-slate-950/40 rounded-2xl p-2 border border-slate-200 dark:border-slate-800">
                <div 
                  ref={imageContainerRef}
                  onClick={handleCanvasClickLearner}
                  className="relative inline-block max-w-full rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-xl cursor-crosshair select-none"
                >
                  <img
                    src={imageUrl}
                    alt="Target challenge"
                    className="max-h-[55vh] max-w-full w-auto h-auto block pointer-events-none select-none"
                  />

                  {/* Pre-Evaluation: Placed Pins for all targets */}
                  {!evaluationResult && hotspots.map((hs, idx) => {
                    const pin = learnerPins[hs.id];
                    if (!pin) return null;
                    const isSelected = idx === currentQuestionIndex;

                    return (
                      <div
                        key={`pin_${hs.id}`}
                        style={{
                          left: `${pin.xPercent}%`,
                          top: `${pin.yPercent}%`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentQuestionIndex(idx);
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 select-none group/pin animate-in zoom-in-50 duration-150 ${
                          isSelected ? 'scale-110 ring-4 ring-purple-400/50 rounded-full' : 'hover:scale-105'
                        }`}
                      >
                        {/* Outer Ripple for Active Pin */}
                        {isSelected && (
                          <div className="absolute -inset-2 rounded-full border-2 border-purple-400 bg-purple-400/20 animate-ping pointer-events-none" />
                        )}

                        {/* Pin Marker (32x32) */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-2xl border-2 border-white text-white font-black text-xs transition-all ${
                          isSelected ? 'bg-purple-600 shadow-purple-500/50' : 'bg-slate-800 hover:bg-purple-600'
                        }`}>
                          <span>{idx + 1}</span>
                        </div>

                        {/* Floating Label with Inline Delete Action */}
                        <div className="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/85 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1.5">
                          <span>{hs.label}</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveLearnerPin(hs.id);
                            }}
                            className="text-rose-400 hover:text-rose-200 cursor-pointer font-black ml-0.5 p-0.5"
                            title="Remove pin"
                          >
                            ✕
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Post-Evaluation: Tolerance Rings & Result Markers */}
                  {evaluationResult && hotspots.map((hs, idx) => {
                    const pin = learnerPins[hs.id];
                    const res = evaluationResult.detailed[hs.id];
                    const isHit = res?.isCorrect || false;
                    const radius = hs.radiusPercent || 8;

                    return (
                      <div key={`eval_${hs.id}`}>
                        {/* True Target Concentric Tolerance Ring */}
                        <div
                          style={{
                            left: `${hs.xPercent}%`,
                            top: `${hs.yPercent}%`,
                            width: `${radius * 2}%`,
                            aspectRatio: '1 / 1',
                          }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 pointer-events-none z-10 animate-in fade-in duration-300 ${
                            isHit
                              ? 'border-emerald-400 bg-emerald-500/20 ring-4 ring-emerald-400/30'
                              : 'border-rose-400 bg-rose-500/15'
                          }`}
                        />

                        {/* True Target Center Marker & Label */}
                        <div
                          style={{
                            left: `${hs.xPercent}%`,
                            top: `${hs.yPercent}%`,
                          }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-15 select-none animate-in fade-in duration-300"
                        >
                          <div className={`w-3 h-3 rounded-full ring-4 shadow-lg ${isHit ? 'bg-emerald-400 ring-emerald-500/50' : 'bg-amber-400 ring-amber-500/50'}`} />
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/85 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                            Target {idx + 1}: {hs.label} (±{radius}%)
                          </div>
                        </div>

                        {/* Learner's Pin Result Badge */}
                        {pin && (
                          <div
                            style={{
                              left: `${pin.xPercent}%`,
                              top: `${pin.yPercent}%`,
                            }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-xl text-white font-black text-xs ${
                              isHit ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}>
                              {isHit ? '✓' : '✕'}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation & Controls Under Canvas */}
              {!evaluationResult && hotspots.length > 1 && (
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    ← Previous Target
                  </button>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Target {currentQuestionIndex + 1} of {hotspots.length} ({Object.keys(learnerPins).length}/{hotspots.length} pinned)
                  </span>
                  <button
                    type="button"
                    disabled={currentQuestionIndex === hotspots.length - 1}
                    onClick={() => setCurrentQuestionIndex(prev => Math.min(hotspots.length - 1, prev + 1))}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    Next Target →
                  </button>
                </div>
              )}

              {/* Evaluation Result Breakdown & Action Bar */}
              {evaluationResult ? (
                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl text-2xl flex items-center justify-center ${
                        evaluationResult.isPassed 
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                      }`}>
                        {evaluationResult.isPassed ? '✓' : '✕'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                            evaluationResult.isPassed 
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          }`}>
                            {evaluationResult.isPassed ? 'Assessment Passed' : 'Assessment Incomplete / Failed'}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">
                            Score: {evaluationResult.earnedScore} / {evaluationResult.maxScore} pts
                          </span>
                        </div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                          {evaluationResult.isPassed ? 'Congratulations! You accurately located the targets.' : 'Some targets were missed or unpinned.'}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleResetLearnerState}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw size={14} />
                        <span>Retake Activity</span>
                      </button>
                    </div>
                  </div>

                  {/* Detailed Target Performance Table */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Target Accuracy Breakdown
                    </h5>
                    <div className="space-y-1.5">
                      {hotspots.map((hs, idx) => {
                        const res = evaluationResult.detailed[hs.id];
                        const isHit = res?.isCorrect || false;
                        const hasPin = !!learnerPins[hs.id];

                        return (
                          <div
                            key={hs.id}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
                              isHit
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                                : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-white text-[11px] ${
                                isHit ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}>
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">
                                  {hs.label}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {hs.questionPrompt || `Locate and click on ${hs.label}`}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-black text-xs">
                                {isHit ? `✓ Hit (+${res.pointsAwarded} pts)` : hasPin ? `✕ Missed (${res.distancePercent}% off)` : '✕ Unpinned'}
                              </span>
                              {isHit && hs.explanation && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 italic mt-0.5">
                                  {hs.explanation}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Bottom Submit Action Bar (Pre-evaluation) */
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Crosshair size={15} className="text-purple-600 dark:text-purple-400" />
                      <span>{Object.keys(learnerPins).length} of {hotspots.length} targets currently pinned</span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Click anywhere on the image canvas above to pin each requested target before submitting.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleResetLearnerState}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw size={14} />
                      <span>Reset All</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCheckLearnerAssessment}
                      disabled={Object.keys(learnerPins).length === 0}
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 size={16} />
                      <span>Check & Submit Answers</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
