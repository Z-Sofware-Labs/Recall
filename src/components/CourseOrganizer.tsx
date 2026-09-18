import { useState, useEffect, useRef, Dispatch, SetStateAction, FormEvent, MouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  Presentation, Image as ImageIcon, Video, Plus, Trash2,
  ChevronLeft, ChevronRight, Eye, Play, Film, X, Layers, Clock,
  Trophy, Award, CheckCircle2, Sparkles, HelpCircle, Tags, Edit3, MousePointerClick,
  GripVertical, GripHorizontal, CheckSquare, MoveRight, GitCommit, ListOrdered, FileText,
  Type, ListChecks, ArrowDownUp, CheckCircle, ShieldCheck, Share2,
  Lock, Bookmark, Check, Crown, RotateCcw, BookOpen, GraduationCap,
  Undo2, Redo2, Save, Hash, Search, ChevronUp, ChevronDown, Maximize2
} from 'lucide-react';
import { MediaItem } from './MediaOrganizer';
import { scoreService, CourseScoreTally } from '../services/scoreService';
import CourseCompletionModal from './course/CourseCompletionModal';
import MediaLibraryContextMenu, { ContextMenuState, ContextMenuTarget } from './course/MediaLibraryContextMenu';
import CoursePlayerPreviewModal from './course/CoursePlayerPreviewModal';
import { QuizActivity } from '../types/quiz';
import { saveProject, ProjectData } from '../services/projectService';

export interface AssessmentQuestionItem {
  quizId: string;
  quizName: string;
  quizType: string;
  points: number;
  prompt?: string;
}

export interface CourseSection {
  id: string;
  title: string;
  description?: string;
  requiredPassingScorePct: number;
  assessmentQuizId?: string;
  assessmentQuizTitle?: string;
  assessmentQuestions?: AssessmentQuestionItem[];
  questionTypes?: string[];
  totalAssessmentPoints?: number;
}

export interface FinalAssessmentMilestone {
  id: string;
  title: string;
  requiredPassingScorePct: number;
  assessmentQuizId?: string;
  assessmentQuizTitle?: string;
  assessmentQuestions?: AssessmentQuestionItem[];
  questionTypes?: string[];
  totalAssessmentPoints?: number;
}

export interface CourseCompletionScreen {
  id: string;
  title: string;
  customMessage?: string;
  summaryMessage?: string;
  showPointsBreakdown?: boolean;
  showCertificateButton?: boolean;
  displayScoreTally?: boolean;
  allowCertificateDownload?: boolean;
}

export interface TimelineItem {
  timelineId: string;
  kind: 'media' | 'quiz' | 'section' | 'final_assessment' | 'completion_screen';
  media?: MediaItem;
  quiz?: QuizActivity;
  section?: CourseSection;
  finalAssessment?: FinalAssessmentMilestone;
  completionScreen?: CourseCompletionScreen;
  durationSeconds?: number;
  isLocked?: boolean;
}

export interface DragBatchItem {
  id?: string;
  type: 'media' | 'quiz';
  media?: MediaItem;
  quiz?: QuizActivity;
}

export interface PointerDragState {
  isDragging: boolean;
  type: 'timeline' | 'media' | 'quiz' | 'batch';
  title: string;
  itemType?: string;
  timelineIndex?: number;
  media?: MediaItem;
  quiz?: QuizActivity;
  batchItems?: DragBatchItem[];
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
  isStarted: boolean;
}

interface CourseOrganizerProps {
  mediaItems?: MediaItem[];
  setMediaItems?: Dispatch<SetStateAction<MediaItem[]>>;
  quizActivities?: QuizActivity[];
  setQuizActivities?: Dispatch<SetStateAction<QuizActivity[]>>;
  timeline?: TimelineItem[];
  setTimeline?: Dispatch<SetStateAction<TimelineItem[]>>;
  onOpenQuizEditor?: (quiz: QuizActivity) => void;
  onNavigateToMedia?: () => void;
  onNavigateToExport?: () => void;
  courseTitle?: string;
  courseId?: string;
  currentProject?: ProjectData | null;
  setCurrentProject?: Dispatch<SetStateAction<ProjectData | null>>;
}

export default function CourseOrganizer({
  mediaItems: mediaItemsProp = [],
  setMediaItems: setMediaItemsProp,
  quizActivities: quizActivitiesProp = [],
  setQuizActivities: setQuizActivitiesProp,
  timeline: timelineProp,
  setTimeline: setTimelineProp,
  onOpenQuizEditor,
  onNavigateToMedia,
  onNavigateToExport,
  courseTitle = 'Untitled Course',
  courseId = 'course_1',
  currentProject,
  setCurrentProject,
}: CourseOrganizerProps) {
  // Local fallback if setter props are not provided
  const [internalMediaItems, setInternalMediaItems] = useState<MediaItem[]>(mediaItemsProp);
  const [internalQuizActivities, setInternalQuizActivities] = useState<QuizActivity[]>(quizActivitiesProp);

  const mediaItems = setMediaItemsProp ? mediaItemsProp : internalMediaItems;
  const setMediaItems = setMediaItemsProp || setInternalMediaItems;

  const quizActivities = setQuizActivitiesProp ? quizActivitiesProp : internalQuizActivities;
  const setQuizActivities = setQuizActivitiesProp || setInternalQuizActivities;

  useEffect(() => {
    setInternalMediaItems(mediaItemsProp);
  }, [mediaItemsProp]);

  useEffect(() => {
    setInternalQuizActivities(quizActivitiesProp);
  }, [quizActivitiesProp]);

  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isPlayerPreviewOpen, setIsPlayerPreviewOpen] = useState(false);
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Section Creator Modal Form State
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [selectedAssessmentQuizIds, setSelectedAssessmentQuizIds] = useState<string[]>([]);
  const [newSectionPassPct, setNewSectionPassPct] = useState(75);
  const [isCreatingFinalMilestone, setIsCreatingFinalMilestone] = useState(false);

  const [scoreTally, setScoreTally] = useState<CourseScoreTally>(() => {
    return scoreService.getCourseScoreTally(courseId);
  });

  const refreshScoreTally = () => {
    setScoreTally(scoreService.getCourseScoreTally(courseId));
  };

  useEffect(() => {
    refreshScoreTally();
  }, [courseId]);

  const [internalTimeline, setInternalTimeline] = useState<TimelineItem[]>([]);

  const timeline = timelineProp !== undefined ? timelineProp : internalTimeline;
  const setTimeline = setTimelineProp || setInternalTimeline;

  // Synchronize milestones in timeline with latest quiz activities when quizActivities changes
  useEffect(() => {
    let changed = false;
    const updatedTimeline = timeline.map(item => {
      if (item.kind === 'section' && item.section) {
        const questions = item.section.assessmentQuestions || [];
        let sectionQuestionsChanged = false;
        const resolvedQuestions = questions.map((qItem) => {
          const matchingQuiz = quizActivities.find(q => q.id === qItem.quizId);
          if (matchingQuiz) {
            const newPoints = matchingQuiz.type === 'Essay' ? 0 : (matchingQuiz.totalPoints || 10);
            if (qItem.quizName !== matchingQuiz.name || qItem.quizType !== matchingQuiz.type || qItem.points !== newPoints || qItem.prompt !== matchingQuiz.prompt) {
              sectionQuestionsChanged = true;
              return {
                ...qItem,
                quizName: matchingQuiz.name,
                quizType: matchingQuiz.type,
                points: newPoints,
                prompt: matchingQuiz.prompt,
              };
            }
          }
          return qItem;
        });

        const questionTypes = Array.from(new Set<string>(resolvedQuestions.map(q => q.quizType)));
        const totalPoints = resolvedQuestions.reduce((sum, q) => sum + q.points, 0);

        const oldTypes = item.section.questionTypes || [];
        const typesChanged = questionTypes.length !== oldTypes.length || questionTypes.some((t, i) => t !== oldTypes[i]);
        const pointsChanged = totalPoints !== item.section.totalAssessmentPoints;

        if (sectionQuestionsChanged || typesChanged || pointsChanged) {
          changed = true;
          return {
            ...item,
            section: {
              ...item.section,
              assessmentQuestions: resolvedQuestions,
              questionTypes,
              totalAssessmentPoints: totalPoints || 30,
            }
          };
        }
      } else if (item.kind === 'final_assessment' && item.finalAssessment) {
        const questions = item.finalAssessment.assessmentQuestions || [];
        let finalQuestionsChanged = false;
        const resolvedQuestions = questions.map((qItem) => {
          const matchingQuiz = quizActivities.find(q => q.id === qItem.quizId);
          if (matchingQuiz) {
            const newPoints = matchingQuiz.type === 'Essay' ? 0 : (matchingQuiz.totalPoints || 10);
            if (qItem.quizName !== matchingQuiz.name || qItem.quizType !== matchingQuiz.type || qItem.points !== newPoints || qItem.prompt !== matchingQuiz.prompt) {
              finalQuestionsChanged = true;
              return {
                ...qItem,
                quizName: matchingQuiz.name,
                quizType: matchingQuiz.type,
                points: newPoints,
                prompt: matchingQuiz.prompt,
              };
            }
          }
          return qItem;
        });

        const questionTypes = Array.from(new Set<string>(resolvedQuestions.map(q => q.quizType)));
        const totalPoints = resolvedQuestions.reduce((sum, q) => sum + q.points, 0);

        const oldTypes = item.finalAssessment.questionTypes || [];
        const typesChanged = questionTypes.length !== oldTypes.length || questionTypes.some((t, i) => t !== oldTypes[i]);
        const pointsChanged = totalPoints !== item.finalAssessment.totalAssessmentPoints;

        if (finalQuestionsChanged || typesChanged || pointsChanged) {
          changed = true;
          return {
            ...item,
            finalAssessment: {
              ...item.finalAssessment,
              assessmentQuestions: resolvedQuestions,
              questionTypes,
              totalAssessmentPoints: totalPoints || 50,
            }
          };
        }
      }
      return item;
    });

    if (changed) {
      setTimeline(updatedTimeline);
    }
  }, [quizActivities, timeline, setTimeline]);

  // Resizable split state between Media/Quiz Library (top) and Timeline (bottom)
  const [timelineHeight, setTimelineHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('recall_course_timeline_height');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 140 && parsed <= 800) {
          return parsed;
        }
      }
    } catch (e) {
      // Ignore localStorage read error
    }
    return 315;
  });

  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch (err) {
      // Ignore if pointer capture fails
    }

    setIsResizingSplit(true);

    const updateHeightFromPointer = (clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Distance from bottom of the CourseOrganizer container to the pointer
      // Subtracting 12px for padding/gap
      const desiredHeight = rect.bottom - clientY - 10;
      // Allow timeline to be between 140px and containerHeight - 160px (leaving space for library)
      const maxAvailableHeight = Math.max(200, rect.height - 180);
      const clampedHeight = Math.max(140, Math.min(maxAvailableHeight, Math.round(desiredHeight)));
      setTimelineHeight(clampedHeight);
    };

    updateHeightFromPointer(e.clientY);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      updateHeightFromPointer(moveEvent.clientY);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      setIsResizingSplit(false);
      try {
        target.releasePointerCapture(upEvent.pointerId);
      } catch (err) {
        // Ignore
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      setTimelineHeight((finalHeight) => {
        try {
          localStorage.setItem('recall_course_timeline_height', finalHeight.toString());
        } catch (err) {
          // Ignore write error
        }
        return finalHeight;
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Save active course project to disk
  const handleSaveCourse = async (forceSaveAs = false) => {
    setIsSaving(true);
    try {
      const projToSave: ProjectData = {
        ...(currentProject || {
          id: courseId || `proj_${Date.now()}`,
          title: courseTitle || 'Untitled Course Project',
          createdAt: Date.now(),
          lastModified: Date.now(),
        }),
        title: currentProject?.title || courseTitle || 'Untitled Course Project',
        mediaItems,
        quizActivities,
        timeline,
        lastModified: Date.now(),
      };

      const result = await saveProject(projToSave, forceSaveAs);
      if (result && result.success) {
        if (setCurrentProject) {
          setCurrentProject({
            ...projToSave,
            filePath: result.filePath,
          });
        }
        const fileName = result.filePath.split(/[\\/]/).pop() || result.filePath;
        showToast(`Course saved successfully! (${fileName})`);
      }
    } catch (err: any) {
      console.error('Failed to save course:', err);
      showToast(`Error saving course: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Undo & Redo History State for Course Sequence Timeline
  const undoStackRef = useRef<TimelineItem[][]>([]);
  const redoStackRef = useRef<TimelineItem[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Helper to commit state changes to timeline and record undo history
  const updateTimeline = (action: TimelineItem[] | ((prev: TimelineItem[]) => TimelineItem[])) => {
    setTimeline((current) => {
      let next = typeof action === 'function' ? action(current) : action;

      // Enforce: completion_screen must always be the very last element in the timeline
      const endScreenIdx = next.findIndex(t => t.kind === 'completion_screen');
      if (endScreenIdx !== -1 && endScreenIdx !== next.length - 1) {
        const endScreen = next[endScreenIdx];
        const rest = next.filter((_, idx) => idx !== endScreenIdx);
        next = [...rest, endScreen];
      }

      undoStackRef.current.push(current);
      if (undoStackRef.current.length > 50) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      return next;
    });
  };

  const handleUndo = () => {
    if (undoStackRef.current.length === 0) {
      showToast('Nothing to undo');
      return;
    }
    const previous = undoStackRef.current.pop()!;
    redoStackRef.current.push(timeline);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    setTimeline(previous);
    showToast('Undid timeline change');
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) {
      showToast('Nothing to redo');
      return;
    }
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(timeline);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    setTimeline(next);
    showToast('Redid timeline change');
  };

  // Keyboard shortcut listener: Ctrl+S for Save, Ctrl+Z / ⌘Z for Undo, Ctrl+Y / ⌘Shift+Z for Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );
      if (isInput) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSaveCourse(e.shiftKey);
      } else if (modifier && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (modifier && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProject, courseTitle, courseId, mediaItems, quizActivities, timeline]);

  const [activeFilter, setActiveFilter] = useState<'all' | 'slide' | 'photo' | 'video' | 'quiz'>('all');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    target: { type: 'background' },
  });

  // Rename modal state (for media library items)
  const [renamingItem, setRenamingItem] = useState<MediaItem | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Inline rename state for filmstrip milestone/section cards
  const [renamingMilestoneId, setRenamingMilestoneId] = useState<string | null>(null);
  const [milestoneRenameValue, setMilestoneRenameValue] = useState('');

  // Filmstrip right-click context menu (separate from the media library context menu)
  const [filmstripCtxMenu, setFilmstripCtxMenu] = useState<{
    isOpen: boolean; x: number; y: number; timelineId: string; idx: number; kind: string; title: string;
  } | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Multi-selection state for Library items (slides, photos, videos, quizzes)
  const [selectedLibraryItemIds, setSelectedLibraryItemIds] = useState<string[]>([]);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const toggleLibraryItemSelection = (id: string, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLibraryItemIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleMedia = mediaItems.filter(item => activeFilter === 'all' || item.type === activeFilter).map(m => m.id);
    const visibleQuizzes = (activeFilter === 'all' || activeFilter === 'quiz') ? quizActivities.map(q => q.id) : [];
    const allVisibleIds = [...visibleMedia, ...visibleQuizzes];

    if (selectedLibraryItemIds.length >= allVisibleIds.length && allVisibleIds.every(id => selectedLibraryItemIds.includes(id))) {
      setSelectedLibraryItemIds([]);
    } else {
      setSelectedLibraryItemIds(allVisibleIds);
    }
  };

  const handleClearSelection = () => {
    setSelectedLibraryItemIds([]);
  };

  const handleAddSelectedToTimeline = () => {
    if (selectedLibraryItemIds.length === 0) return;
    const newTimelineItems: TimelineItem[] = [];

    // Add selected media items in library order
    mediaItems.forEach(item => {
      if (selectedLibraryItemIds.includes(item.id)) {
        newTimelineItems.push({
          timelineId: `tl_m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${item.id}`,
          kind: 'media',
          media: item,
          durationSeconds: item.type === 'video' ? 60 : 15,
        });
      }
    });

    // Add selected quizzes in library order
    quizActivities.forEach(quiz => {
      if (selectedLibraryItemIds.includes(quiz.id)) {
        newTimelineItems.push({
          timelineId: `tl_q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${quiz.id}`,
          kind: 'quiz',
          quiz,
          durationSeconds: 120,
        });
      }
    });

    if (newTimelineItems.length > 0) {
      updateTimeline(prev => [...prev, ...newTimelineItems]);
      showToast(`Added ${newTimelineItems.length} selected item${newTimelineItems.length === 1 ? '' : 's'} to timeline`);
      setSelectedLibraryItemIds([]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedLibraryItemIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedLibraryItemIds.length} selected items from the library?`)) return;

    setMediaItems(prev => prev.filter(m => !selectedLibraryItemIds.includes(m.id)));
    setQuizActivities(prev => prev.filter(q => !selectedLibraryItemIds.includes(q.id)));
    updateTimeline(prev => prev.filter(t => {
      if (t.kind === 'media' && t.media && selectedLibraryItemIds.includes(t.media.id)) return false;
      if (t.kind === 'quiz' && t.quiz && selectedLibraryItemIds.includes(t.quiz.id)) return false;
      return true;
    }));
    showToast(`Removed ${selectedLibraryItemIds.length} items`);
    setSelectedLibraryItemIds([]);
  };

  // ---------------------------------------------------------------------------
  // Pointer-Based Drag and Drop
  // ---------------------------------------------------------------------------
  const [pointerDrag, setPointerDrag] = useState<PointerDragState | null>(null);
  const [pointerDropTargetIdx, setPointerDropTargetIdx] = useState<number | null>(null);
  const [isPointerOverTimeline, setIsPointerOverTimeline] = useState(false);
  const timelineTrackRef = useRef<HTMLDivElement | null>(null);

  const startPointerDragMedia = (e: ReactPointerEvent, item: MediaItem) => {
    if (e.button !== 0) return;

    // Check if dragging as part of a multi-selection batch
    if (selectedLibraryItemIds.includes(item.id) && selectedLibraryItemIds.length > 1) {
      const batchItems: DragBatchItem[] = [];
      mediaItems.forEach(m => {
        if (selectedLibraryItemIds.includes(m.id)) batchItems.push({ type: 'media', media: m });
      });
      quizActivities.forEach(q => {
        if (selectedLibraryItemIds.includes(q.id)) batchItems.push({ type: 'quiz', quiz: q });
      });

      setPointerDrag({
        isDragging: true,
        type: 'batch',
        title: `${batchItems.length} items (${item.name} + ${batchItems.length - 1} more)`,
        itemType: 'batch',
        batchItems,
        clientX: e.clientX,
        clientY: e.clientY,
        startX: e.clientX,
        startY: e.clientY,
        isStarted: false,
      });
      return;
    }

    setPointerDrag({
      isDragging: true,
      type: 'media',
      title: item.name,
      itemType: item.type,
      media: item,
      clientX: e.clientX,
      clientY: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      isStarted: false,
    });
  };

  const startPointerDragQuiz = (e: ReactPointerEvent, quiz: QuizActivity) => {
    if (e.button !== 0) return;

    // Check if dragging as part of a multi-selection batch
    if (selectedLibraryItemIds.includes(quiz.id) && selectedLibraryItemIds.length > 1) {
      const batchItems: DragBatchItem[] = [];
      mediaItems.forEach(m => {
        if (selectedLibraryItemIds.includes(m.id)) batchItems.push({ type: 'media', media: m });
      });
      quizActivities.forEach(q => {
        if (selectedLibraryItemIds.includes(q.id)) batchItems.push({ type: 'quiz', quiz: q });
      });

      setPointerDrag({
        isDragging: true,
        type: 'batch',
        title: `${batchItems.length} items (${quiz.name} + ${batchItems.length - 1} more)`,
        itemType: 'batch',
        batchItems,
        clientX: e.clientX,
        clientY: e.clientY,
        startX: e.clientX,
        startY: e.clientY,
        isStarted: false,
      });
      return;
    }

    setPointerDrag({
      isDragging: true,
      type: 'quiz',
      title: quiz.name,
      itemType: quiz.type,
      quiz,
      clientX: e.clientX,
      clientY: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      isStarted: false,
    });
  };

  const startPointerDragTimelineStep = (e: ReactPointerEvent, idx: number, item: TimelineItem) => {
    if (e.button !== 0) return;
    const title = item.kind === 'final_assessment'
      ? (item.finalAssessment?.title || 'Final Course Milestone')
      : item.kind === 'section'
        ? (item.section?.title || 'Section Checkpoint')
        : item.kind === 'quiz'
          ? (item.quiz?.name || 'Quiz')
          : (item.media?.name || 'Media');
    setPointerDrag({
      isDragging: true,
      type: 'timeline',
      title,
      itemType: item.kind,
      timelineIndex: idx,
      media: item.media,
      quiz: item.quiz,
      clientX: e.clientX,
      clientY: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      isStarted: false,
    });
  };

  useEffect(() => {
    if (!pointerDrag) return;

    const handlePointerMove = (e: globalThis.PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDrag.startX, e.clientY - pointerDrag.startY);
      const isStarted = pointerDrag.isStarted || dist > 5;

      setPointerDrag(prev => prev ? { ...prev, clientX: e.clientX, clientY: e.clientY, isStarted } : null);

      if (!timelineTrackRef.current) return;
      const trackRect = timelineTrackRef.current.getBoundingClientRect();
      const isOver = (
        e.clientX >= trackRect.left &&
        e.clientX <= trackRect.right &&
        e.clientY >= trackRect.top - 40 &&
        e.clientY <= trackRect.bottom + 40
      );

      setIsPointerOverTimeline(isOver);

      if (isOver) {
        const stepElements = Array.from(timelineTrackRef.current.querySelectorAll('[data-step-index]')) as HTMLElement[];
        if (stepElements.length === 0) {
          setPointerDropTargetIdx(0);
          return;
        }

        let targetIndex = stepElements.length;
        for (let i = 0; i < stepElements.length; i++) {
          const rect = stepElements[i].getBoundingClientRect();
          const midX = rect.left + rect.width / 2;
          if (e.clientX < midX) {
            targetIndex = i;
            break;
          }
        }
        setPointerDropTargetIdx(targetIndex);
      } else {
        setPointerDropTargetIdx(null);
      }
    };

    const handlePointerUp = () => {
      if (pointerDrag && pointerDrag.isStarted && isPointerOverTimeline && pointerDropTargetIdx !== null) {
        if (pointerDrag.type === 'timeline' && pointerDrag.timelineIndex !== undefined) {
          const fromIdx = pointerDrag.timelineIndex;
          let toIdx = pointerDropTargetIdx;
          if (fromIdx !== toIdx) {
            updateTimeline(prev => {
              const clone = [...prev];
              const [movedItem] = clone.splice(fromIdx, 1);
              if (fromIdx < toIdx) toIdx--;
              clone.splice(toIdx, 0, movedItem);
              return clone;
            });
            showToast(`Reordered step to position ${toIdx + 1}`);
          }
        } else if (pointerDrag.type === 'batch' && pointerDrag.batchItems) {
          const newTimelineItems: TimelineItem[] = pointerDrag.batchItems.map((b, bIdx) => {
            if (b.type === 'media' && b.media) {
              return {
                timelineId: `tl_m_${Date.now()}_${bIdx}_${Math.random().toString(36).substring(2, 6)}_${b.media.id}`,
                kind: 'media',
                media: b.media,
                durationSeconds: b.media.type === 'video' ? 60 : 15,
              };
            } else {
              return {
                timelineId: `tl_q_${Date.now()}_${bIdx}_${Math.random().toString(36).substring(2, 6)}_${b.quiz?.id || 'quiz'}`,
                kind: 'quiz',
                quiz: b.quiz,
                durationSeconds: 120,
              };
            }
          });

          updateTimeline(prev => {
            const clone = [...prev];
            clone.splice(pointerDropTargetIdx, 0, ...newTimelineItems);
            return clone;
          });

          showToast(`Inserted ${newTimelineItems.length} items at step ${pointerDropTargetIdx + 1}`);
          setSelectedLibraryItemIds([]);
        } else if (pointerDrag.type === 'media' && pointerDrag.media) {
          const newItem: TimelineItem = {
            timelineId: `tl_m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            kind: 'media',
            media: pointerDrag.media,
            durationSeconds: pointerDrag.media.type === 'video' ? 60 : 15,
          };
          updateTimeline(prev => {
            const clone = [...prev];
            clone.splice(pointerDropTargetIdx, 0, newItem);
            return clone;
          });
          showToast(`Added "${pointerDrag.media.name}" to timeline`);
        } else if (pointerDrag.type === 'quiz' && pointerDrag.quiz) {
          const newItem: TimelineItem = {
            timelineId: `tl_q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            kind: 'quiz',
            quiz: pointerDrag.quiz,
            durationSeconds: 120,
          };
          updateTimeline(prev => {
            const clone = [...prev];
            clone.splice(pointerDropTargetIdx, 0, newItem);
            return clone;
          });
          showToast(`Added quiz "${pointerDrag.quiz.name}" to timeline`);
        }
      }

      setPointerDrag(null);
      setIsPointerOverTimeline(false);
      setPointerDropTargetIdx(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [pointerDrag, isPointerOverTimeline, pointerDropTargetIdx]);

  // Adding items manually
  const addMediaToTimeline = (item: MediaItem) => {
    const newItem: TimelineItem = {
      timelineId: `tl_m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      kind: 'media',
      media: item,
      durationSeconds: item.type === 'video' ? 60 : 15,
    };
    updateTimeline(prev => [...prev, newItem]);
    showToast(`Added "${item.name}" to timeline`);
  };

  const addQuizToTimeline = (quiz: QuizActivity) => {
    const newItem: TimelineItem = {
      timelineId: `tl_q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      kind: 'quiz',
      quiz,
      durationSeconds: 120,
    };
    updateTimeline(prev => [...prev, newItem]);
    showToast(`Added quiz "${quiz.name}" to timeline`);
  };

  const handleAddCongratulationsScreen = () => {
    const existingEndScreen = timeline.find(t => t.kind === 'completion_screen');
    if (existingEndScreen) {
      showToast('Congratulations End of Course Screen is already in timeline');
      return;
    }
    const newItem: TimelineItem = {
      timelineId: `tl_end_${Date.now()}`,
      kind: 'completion_screen',
      completionScreen: {
        id: `cs_${Date.now()}`,
        title: 'Congratulations & Course Completion Summary',
        showPointsBreakdown: true,
        showCertificateButton: true,
        customMessage: 'Congratulations! You have completed all learning modules and checkpoints.',
      },
      durationSeconds: 30,
    };
    updateTimeline(prev => [...prev, newItem]);
    showToast('Added Congratulations End of Course Screen to timeline');
  };

  // Add Section Checkpoint or Final Milestone
  const handleOpenAddSectionModal = (isFinal = false) => {
    setIsCreatingFinalMilestone(isFinal);
    if (isFinal) {
      setNewSectionTitle('Final Course Milestone Assessment');
      setSelectedAssessmentQuizIds(quizActivities.slice(0, Math.min(3, quizActivities.length)).map(q => q.id));
      setNewSectionPassPct(80);
    } else {
      const secNum = timeline.filter(t => t.kind === 'section').length + 1;
      setNewSectionTitle(`Section ${secNum}: Module Assessment`);
      setSelectedAssessmentQuizIds(quizActivities.slice(0, Math.min(2, quizActivities.length)).map(q => q.id));
      setNewSectionPassPct(75);
    }
    setIsAddSectionModalOpen(true);
  };

  const handleToggleQuizSelection = (quizId: string) => {
    setSelectedAssessmentQuizIds(prev =>
      prev.includes(quizId)
        ? prev.filter(id => id !== quizId)
        : [...prev, quizId]
    );
  };

  const handleSaveAddSection = (e: FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;

    const selectedQuizzes = selectedAssessmentQuizIds.map((id) => quizActivities.find((q) => q.id === id)).filter((q): q is QuizActivity => Boolean(q));
    const attachedQuestions: AssessmentQuestionItem[] = selectedQuizzes.map((q) => ({
      quizId: q.id,
      quizName: q.name,
      quizType: q.type,
      points: q.type === 'Essay' ? 0 : (q.totalPoints || 10),
      prompt: q.prompt,
    }));
    const questionTypes: string[] = Array.from(new Set<string>(selectedQuizzes.map(q => q.type)));
    const totalPoints = attachedQuestions.reduce((sum, item) => sum + item.points, 0);

    if (isCreatingFinalMilestone) {
      const newFinal: FinalAssessmentMilestone = {
        id: `final_${Date.now()}`,
        title: newSectionTitle.trim(),
        requiredPassingScorePct: newSectionPassPct,
        assessmentQuizTitle: `${newSectionTitle.trim()} Battery`,
        assessmentQuestions: attachedQuestions,
        questionTypes,
        totalAssessmentPoints: totalPoints || 50,
      };
      const newItem: TimelineItem = {
        timelineId: `tl_final_${Date.now()}`,
        kind: 'final_assessment',
        finalAssessment: newFinal,
      };
      updateTimeline(prev => [...prev, newItem]);
      showToast(`Added Final Milestone Assessment "${newFinal.title}"`);
    } else {
      const newSection: CourseSection = {
        id: `sec_${Date.now()}`,
        title: newSectionTitle.trim(),
        requiredPassingScorePct: newSectionPassPct,
        assessmentQuizTitle: `${newSectionTitle.trim()} Evaluation`,
        assessmentQuestions: attachedQuestions,
        questionTypes,
        totalAssessmentPoints: totalPoints || 30,
      };
      const newItem: TimelineItem = {
        timelineId: `tl_sec_${Date.now()}`,
        kind: 'section',
        section: newSection,
      };
      updateTimeline(prev => [...prev, newItem]);
      showToast(`Added Section Checkpoint "${newSection.title}"`);
    }

    setIsAddSectionModalOpen(false);
  };

  const removeFromTimeline = (timelineId: string) => {
    updateTimeline(prev => prev.filter(item => item.timelineId !== timelineId));
  };

  const moveItem = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= timeline.length) return;
    updateTimeline(prev => {
      const newItems = [...prev];
      const [movedItem] = newItems.splice(index, 1);
      newItems.splice(targetIndex, 0, movedItem);
      return newItems;
    });
  };

  // Context Menu Handlers
  const handleItemContextMenu = (e: MouseEvent, item: MediaItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      target: { type: 'media', item },
    });
  };

  const handleQuizContextMenu = (e: MouseEvent, quiz: QuizActivity) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      target: { type: 'quiz', quiz },
    });
  };

  const handleBackgroundContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      target: { type: 'background' },
    });
  };

  const handleContextMenuAddToTimeline = (target: ContextMenuTarget) => {
    if (target.type === 'media') {
      addMediaToTimeline(target.item);
    } else if (target.type === 'quiz') {
      addQuizToTimeline(target.quiz);
    }
  };

  // ─── Filmstrip right-click ───────────────────────────────────────────────
  const handleFilmstripContextMenu = (e: MouseEvent, item: { timelineId: string; idx: number; kind: string; title: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setFilmstripCtxMenu({ isOpen: true, x: e.clientX, y: e.clientY, ...item });
  };

  const handleMilestoneRenameStart = (timelineId: string, currentTitle: string) => {
    setRenamingMilestoneId(timelineId);
    setMilestoneRenameValue(currentTitle);
    setFilmstripCtxMenu(null);
  };

  const handleMilestoneRenameCommit = () => {
    if (!renamingMilestoneId || !milestoneRenameValue.trim()) {
      setRenamingMilestoneId(null);
      return;
    }
    const title = milestoneRenameValue.trim();
    updateTimeline(prev => prev.map(t => {
      if (t.timelineId !== renamingMilestoneId) return t;
      if (t.kind === 'section' && t.section) return { ...t, section: { ...t.section, title } };
      if (t.kind === 'final_assessment' && t.finalAssessment) return { ...t, finalAssessment: { ...t.finalAssessment, title } };
      return t;
    }));
    showToast(`Renamed to "${title}"`);
    setRenamingMilestoneId(null);
  };

  const handleFilmstripCtxAction = (action: string) => {
    if (!filmstripCtxMenu) return;
    const { timelineId, idx } = filmstripCtxMenu;
    setFilmstripCtxMenu(null);
    if (action === 'rename') {
      const item = timeline.find(t => t.timelineId === timelineId);
      const title = item?.kind === 'section' ? (item.section?.title || '') : (item?.finalAssessment?.title || '');
      handleMilestoneRenameStart(timelineId, title);
    } else if (action === 'move-left') {
      moveItem(idx, 'left');
    } else if (action === 'move-right') {
      moveItem(idx, 'right');
    } else if (action === 'remove') {
      removeFromTimeline(timelineId);
    }
  };

  const handleRenameMedia = (item: MediaItem) => {
    setRenamingItem(item);
    setRenameValue(item.name);
  };

  const handleSaveRename = (e: FormEvent) => {
    e.preventDefault();
    if (!renamingItem || !renameValue.trim()) return;
    const updatedName = renameValue.trim();
    setMediaItems(prev => prev.map(m => m.id === renamingItem.id ? { ...m, name: updatedName } : m));
    updateTimeline(prev => prev.map(t => {
      if (t.kind === 'media' && t.media && t.media.id === renamingItem.id) {
        return { ...t, media: { ...t.media, name: updatedName } };
      }
      return t;
    }));
    showToast(`Renamed to "${updatedName}"`);
    setRenamingItem(null);
  };

  const handleDuplicateMedia = (item: MediaItem) => {
    const duplicated: MediaItem = {
      ...item,
      id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${item.name} (Copy)`,
    };
    setMediaItems(prev => [...prev, duplicated]);
    showToast(`Duplicated "${item.name}"`);
  };

  const handleCopyMediaLink = (item: MediaItem) => {
    navigator.clipboard.writeText(item.url);
    showToast('Asset link copied to clipboard');
  };

  const handleDeleteMedia = (item: MediaItem) => {
    setMediaItems(prev => prev.filter(m => m.id !== item.id));
    updateTimeline(prev => prev.filter(t => !(t.kind === 'media' && t.media?.id === item.id)));
    showToast(`Deleted "${item.name}"`);
  };

  const handleDuplicateQuiz = (quiz: QuizActivity) => {
    const duplicated: QuizActivity = {
      ...quiz,
      id: `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${quiz.name} (Copy)`,
    };
    setQuizActivities(prev => [...prev, duplicated]);
    showToast(`Duplicated quiz "${quiz.name}"`);
  };

  const handleDeleteQuiz = (quiz: QuizActivity) => {
    setQuizActivities(prev => prev.filter(q => q.id !== quiz.id));
    showToast(`Removed quiz "${quiz.name}"`);
  };

  const slideCount = mediaItems.filter(i => i.type === 'slide').length;
  const photoCount = mediaItems.filter(i => i.type === 'photo').length;
  const videoCount = mediaItems.filter(i => i.type === 'video').length;
  const quizCount = quizActivities.length;
  const sectionCount = timeline.filter(t => t.kind === 'section').length;
  const totalAssetsCount = mediaItems.length + quizActivities.length;

  return (
    <div ref={containerRef} className="flex flex-col gap-2.5 sm:gap-3 flex-1 h-full min-h-[560px] relative select-none">
      {/* Top Main Action Header (Dynamically distributed & right-aligned based on window width) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3 pb-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Interactive Curriculum Timeline
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">
              {timeline.length} Steps ({sectionCount} Sections)
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 truncate">
            {courseTitle}
          </h2>
        </div>

        {/* Action Buttons: Save, Preview Course and Export */}
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2.5 sm:gap-3 w-full lg:w-auto lg:ml-auto">
          {/* 1. Save Course Button */}
          <button
            onClick={() => handleSaveCourse(false)}
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer grow sm:grow-0"
            title="Save course project (Ctrl+S / Cmd+S)"
          >
            <Save size={15} className="shrink-0" />
            <span className="whitespace-nowrap">{isSaving ? 'Saving...' : 'Save'}</span>
          </button>

          {/* 2. Preview Course Button */}
          <button
            onClick={() => setIsPlayerPreviewOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer grow sm:grow-0"
            title="Preview full course in interactive learner mode with section assessment checkpoints"
          >
            <Eye size={15} className="shrink-0" />
            <span className="whitespace-nowrap">Preview Course</span>
          </button>

          {/* 3. Export Course Button */}
          <button
            onClick={onNavigateToExport}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer grow sm:grow-0"
            title="Navigate to export package and distribution settings"
          >
            <Share2 size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />
            <span className="whitespace-nowrap">Export</span>
          </button>
        </div>
      </div>

      {/* Top Section: Media Library */}
      <div
        onContextMenu={handleBackgroundContextMenu}
        className="flex-1 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Media & Quiz Library</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mediaItems.length} media assets, {quizActivities.length} quizzes • Drag items or click + to add directly into the Sequence Timeline
              </p>
            </div>
          </div>

          {/* Filter Bar & Search Input */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                placeholder="Search items..."
                className="pl-7 pr-6 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32 sm:w-40 transition-all"
              />
              {librarySearchQuery && (
                <button
                  type="button"
                  onClick={() => setLibrarySearchQuery('')}
                  className="absolute right-1.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                  title="Clear search"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Type Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${activeFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
              >
                All ({totalAssetsCount})
              </button>
              <button
                onClick={() => setActiveFilter('slide')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${activeFilter === 'slide'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
              >
                <Presentation size={12} /> Slides ({slideCount})
              </button>
              <button
                onClick={() => setActiveFilter('photo')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${activeFilter === 'photo'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
              >
                <ImageIcon size={12} /> Photos ({photoCount})
              </button>
              <button
                onClick={() => setActiveFilter('video')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${activeFilter === 'video'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
              >
                <Video size={12} /> Videos ({videoCount})
              </button>
              <button
                onClick={() => setActiveFilter('quiz')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${activeFilter === 'quiz'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
              >
                <Tags size={12} /> Quizzes ({quizCount})
              </button>
            </div>
          </div>
        </div>

        {/* Library Items Scroll Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Batch Selection Action Toolbar */}
          {selectedLibraryItemIds.length > 0 && (
            <div className="mb-3 p-2.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  {selectedLibraryItemIds.length} item{selectedLibraryItemIds.length === 1 ? '' : 's'} selected
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  Select All Visible
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold cursor-pointer"
                >
                  Deselect All
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddSelectedToTimeline}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus size={13} /> Add to Timeline
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all border border-rose-200 dark:border-rose-800"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          )}

          {totalAssetsCount === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl mb-3">
                <Layers size={32} />
              </div>
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                No items available in the course library.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Import slides or create quizzes in Quiz Builder to start designing your course.
              </p>
              {onNavigateToMedia && (
                <button
                  onClick={onNavigateToMedia}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Go to Media Organizer
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(175px,1fr))] gap-2.5 sm:gap-3 p-1">
              {/* Media Items */}
              {(activeFilter === 'all' || activeFilter === 'slide' || activeFilter === 'photo' || activeFilter === 'video') &&
                mediaItems
                  .filter(item => activeFilter === 'all' || item.type === activeFilter)
                  .filter(item => !librarySearchQuery || item.name.toLowerCase().includes(librarySearchQuery.toLowerCase()))
                  .map((item) => {
                    const isContextMenuActive =
                      contextMenu.isOpen &&
                      contextMenu.target.type === 'media' &&
                      contextMenu.target.item.id === item.id;
                    const isBeingDragged = pointerDrag?.isStarted && pointerDrag?.media?.id === item.id;
                    const isSelected = selectedLibraryItemIds.includes(item.id);
                    const usageCount = timeline.filter(t => t.kind === 'media' && t.media?.id === item.id).length;

                    return (
                      <div
                        key={item.id}
                        onPointerDown={(e) => startPointerDragMedia(e, item)}
                        onContextMenu={(e) => handleItemContextMenu(e, item)}
                        className={`group relative flex flex-col border rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950/50 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-xs cursor-grab active:cursor-grabbing touch-none ${isBeingDragged
                            ? 'opacity-40 scale-95 border-dashed border-blue-500'
                            : isSelected
                              ? 'border-blue-600 ring-2 ring-blue-500/40 shadow-md bg-blue-50/30 dark:bg-blue-950/30'
                              : isContextMenuActive
                                ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-md'
                                : 'border-slate-200 dark:border-slate-800'
                          }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center">
                          {item.type === 'video' ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-slate-900 pointer-events-none">
                              <video 
                                src={item.url} 
                                className="w-full h-full object-cover opacity-75" 
                                preload="metadata" 
                                muted 
                                playsInline 
                              />
                              <div className="absolute p-1.5 bg-purple-600/85 text-white rounded-full shadow-md flex items-center justify-center">
                                <Film size={13} />
                              </div>
                            </div>
                          ) : (
                            <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                          )}

                          {/* Type Badge */}
                          <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 bg-black/75 backdrop-blur-xs text-white px-1.5 py-0.5 rounded text-[9px] font-semibold">
                            {item.type === 'slide' && <Presentation size={9} className="text-blue-400" />}
                            {item.type === 'photo' && <ImageIcon size={9} className="text-emerald-400" />}
                            {item.type === 'video' && <Video size={9} className="text-purple-400" />}
                            <span className="capitalize">{item.type}</span>
                          </div>

                          {/* Usage Count Badge if used in timeline */}
                          {usageCount > 0 && (
                            <div
                              className="absolute bottom-1.5 left-1.5 z-10 bg-emerald-600/90 text-white px-1.5 py-0.5 rounded text-[9px] font-bold shadow-xs flex items-center gap-0.5"
                              title={`Used ${usageCount} time${usageCount !== 1 ? 's' : ''} in timeline`}
                            >
                              <Check size={9} strokeWidth={3} /> {usageCount}x
                            </div>
                          )}

                          {/* Top-Right Checkbox */}
                          <div
                            onClick={(e) => toggleLibraryItemSelection(item.id, e)}
                            className="absolute top-1.5 right-1.5 z-30 p-1 cursor-pointer"
                            title={isSelected ? 'Deselect item' : 'Select item'}
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                : 'bg-black/60 border-white/60 text-transparent hover:border-white'
                            }`}>
                              <Check size={11} strokeWidth={3} />
                            </div>
                          </div>

                          {/* Hover Overlay with Add Button */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2 pointer-events-none">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewMedia(item);
                              }}
                              className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg cursor-pointer transition-colors shadow-xs pointer-events-auto"
                              title="Preview item"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addMediaToTimeline(item);
                              }}
                              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer flex items-center gap-1 text-[11px] px-2.5 font-bold shadow-xs pointer-events-auto"
                              title="Add to Timeline"
                            >
                              <Plus size={13} /> Add
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between pointer-events-none">
                          <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate" title={item.name}>
                            {item.name}
                          </p>
                        </div>
                      </div>
                    );
                  })}

              {/* Quiz Activities */}
              {(activeFilter === 'all' || activeFilter === 'quiz') &&
                quizActivities
                  .filter(quiz => !librarySearchQuery || quiz.name.toLowerCase().includes(librarySearchQuery.toLowerCase()) || quiz.type.toLowerCase().includes(librarySearchQuery.toLowerCase()))
                  .map((quiz) => {
                  const isContextMenuActive =
                    contextMenu.isOpen &&
                    contextMenu.target.type === 'quiz' &&
                    contextMenu.target.quiz.id === quiz.id;
                  const isBeingDragged = pointerDrag?.isStarted && pointerDrag?.quiz?.id === quiz.id;
                  const isSelected = selectedLibraryItemIds.includes(quiz.id);
                  const usageCount = timeline.filter(t => t.kind === 'quiz' && t.quiz?.id === quiz.id).length;

                  return (
                    <div
                      key={quiz.id}
                      onPointerDown={(e) => startPointerDragQuiz(e, quiz)}
                      onContextMenu={(e) => handleQuizContextMenu(e, quiz)}
                      onDoubleClick={() => onOpenQuizEditor?.(quiz)}
                      className={`group relative flex flex-col border-2 rounded-xl overflow-hidden bg-gradient-to-b from-indigo-950/80 to-purple-950/80 transition-all shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing touch-none ${isBeingDragged
                          ? 'opacity-40 scale-95 border-dashed border-indigo-500'
                          : isSelected
                            ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-md'
                            : isContextMenuActive
                              ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-md'
                              : 'border-indigo-300/80 dark:border-indigo-800/80 hover:border-indigo-400'
                        }`}
                      title="Drag to timeline, click Add, or double-click to edit"
                    >
                      {/* Quiz Banner / Thumbnail */}
                      <div className="relative aspect-video bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-2 flex flex-col justify-between overflow-hidden">
                        {quiz.type === 'Click an Image' && quiz.data?.clickAnImage?.imageUrl && (
                          <img
                            src={quiz.data.clickAnImage.imageUrl}
                            alt="Quiz Preview"
                            className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity"
                          />
                        )}

                        {/* Top Header Tags */}
                        <div className="relative z-10 flex items-center justify-between">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/60 text-white border border-indigo-400/40 uppercase tracking-wider">
                            {quiz.type}
                          </span>
                          <div className="flex items-center gap-1">
                            {/* Checkbox */}
                            <div
                              onClick={(e) => toggleLibraryItemSelection(quiz.id, e)}
                              className="p-0.5 cursor-pointer"
                              title={isSelected ? 'Deselect quiz' : 'Select quiz'}
                            >
                              <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                  : 'bg-black/60 border-white/60 text-transparent hover:border-white'
                              }`}>
                                <Check size={11} strokeWidth={3} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Quiz Icon & Points */}
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="p-1.5 bg-indigo-600/80 text-white rounded-lg backdrop-blur-xs">
                            <Tags size={12} />
                          </div>
                          <div className="flex items-center gap-1">
                            {usageCount > 0 && (
                              <span className="text-[9px] font-bold bg-emerald-600/90 text-white px-1.5 py-0.5 rounded shadow-xs">
                                {usageCount}x
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-indigo-200 bg-black/40 px-1.5 py-0.5 rounded">
                              {quiz.totalPoints || 10} pts
                            </span>
                          </div>
                        </div>

                        {/* Hover Overlay with Action Buttons */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2 z-20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenQuizEditor?.(quiz);
                            }}
                            className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg cursor-pointer transition-colors shadow-xs"
                            title="Edit in Quiz Builder"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addQuizToTimeline(quiz);
                            }}
                            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer flex items-center gap-1 text-[11px] px-2.5 font-bold shadow-md ring-1 ring-white/20 transition-transform active:scale-95"
                            title="Add to Timeline"
                          >
                            <Plus size={13} /> Add
                          </button>
                        </div>
                      </div>

                      {/* Quiz Card Footer */}
                      <div className="p-2 border-t border-indigo-900/60 bg-indigo-950/90 pointer-events-none">
                        <p className="text-[11px] font-medium text-indigo-100 truncate" title={quiz.name}>
                          {quiz.name}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Draggable Vertical Split Resizer (Up / Down click and drag, Double click to reset) */}
      <div
        ref={resizerRef}
        onPointerDown={handleResizeStart}
        onDoubleClick={() => {
          const defaultHeight = 315;
          setTimelineHeight(defaultHeight);
          try {
            localStorage.setItem('recall_course_timeline_height', defaultHeight.toString());
          } catch (e) {
            // Ignore
          }
          showToast('Reset timeline height');
        }}
        className={`group relative flex items-center justify-center h-5 -my-1.5 cursor-row-resize touch-none select-none z-10 ${
          isResizingSplit ? 'cursor-row-resize' : ''
        }`}
        title="Click and drag up or down to resize. Double-click to reset (315px)."
      >
        <div
          className={`h-1 w-full rounded-full transition-all duration-150 ${
            isResizingSplit
              ? 'bg-blue-500 shadow-sm shadow-blue-500/50'
              : 'bg-slate-200 dark:bg-slate-800 group-hover:bg-blue-400 dark:group-hover:bg-blue-500'
          }`}
        />
        <div
          className={`absolute px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5 transition-all duration-150 border shadow-2xs ${
            isResizingSplit
              ? 'bg-blue-600 text-white border-blue-600 scale-105'
              : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 group-hover:text-blue-600 group-hover:border-blue-400'
          }`}
        >
          {/* Quick Collapse Timeline Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTimelineHeight(160);
              try {
                localStorage.setItem('recall_course_timeline_height', '160');
              } catch (err) {}
            }}
            className="hover:text-blue-600 p-0.5 rounded cursor-pointer"
            title="Minimize Timeline"
          >
            <ChevronDown size={12} />
          </button>

          <GripHorizontal size={12} />
          <span className="hidden sm:inline text-[9px] uppercase tracking-wider">Drag to resize</span>

          {/* Quick Expand Timeline Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTimelineHeight(500);
              try {
                localStorage.setItem('recall_course_timeline_height', '500');
              } catch (err) {}
            }}
            className="hover:text-blue-600 p-0.5 rounded cursor-pointer"
            title="Expand Timeline"
          >
            <ChevronUp size={12} />
          </button>
        </div>
      </div>

      {/* Bottom Section: Course Timeline */}
      <div
        style={{ height: `${timelineHeight}px` }}
        className={`shrink-0 border rounded-2xl bg-slate-50 dark:bg-slate-950 p-3 shadow-xs flex flex-col overflow-hidden ${
          isResizingSplit ? '' : 'transition-all'
        } ${isPointerOverTimeline
            ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20'
            : 'border-slate-200 dark:border-slate-800'
          }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="text-blue-600 dark:text-blue-400" size={17} />
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              Course Sequence Timeline ({timeline.length} {timeline.length === 1 ? 'step' : 'steps'})
            </h3>
            <span className="text-[10px] text-slate-400 font-normal ml-1">
              (Drag steps to reorder, or click + Add Section or + Final Milestone to insert checkpoints)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo / Redo Controls */}
            <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2 mr-1">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                title="Undo last timeline change (Ctrl+Z / ⌘Z)"
              >
                <Undo2 size={13} />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                title="Redo undone action (Ctrl+Y / ⌘Shift+Z)"
              >
                <Redo2 size={13} />
                <span>Redo</span>
              </button>
            </div>

            <button
              onClick={() => handleOpenAddSectionModal(false)}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              <ShieldCheck size={13} />
              <span>+ Add Section</span>
            </button>

            <button
              onClick={() => handleOpenAddSectionModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              title="Add Final Course Milestone Assessment"
            >
              <Crown size={13} />
              <span>+ Final Milestone</span>
            </button>

            <button
              onClick={handleAddCongratulationsScreen}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              title="Add Congratulations End Screen with Score Breakdown"
            >
              <Trophy size={13} />
              <span>+ End Screen</span>
            </button>

            {timeline.length > 0 && (
              <button
                onClick={() => updateTimeline([])}
                className="text-xs text-red-500 hover:text-red-700 hover:underline cursor-pointer px-2"
              >
                Clear Timeline
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Timeline Track */}
        <div
          ref={timelineTrackRef}
          onWheel={(e) => {
            if (timelineTrackRef.current && e.deltaY !== 0) {
              timelineTrackRef.current.scrollLeft += e.deltaY;
            }
          }}
          onContextMenu={(e) => {
            // Only open if not clicking on a specific card (cards stop propagation)
            e.preventDefault();
            setFilmstripCtxMenu({ isOpen: true, x: e.clientX, y: e.clientY, timelineId: '', idx: -1, kind: 'track', title: '' });
          }}
          className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden flex gap-3 items-center pt-1 pb-3.5 px-2 rounded-xl select-none"
        >
          {timeline.length === 0 ? (
            <div
              className={`w-full h-full flex flex-col items-center justify-center text-center py-6 border-2 border-dashed rounded-xl transition-all ${isPointerOverTimeline
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 ring-2 ring-blue-500/20'
                  : 'border-slate-300 dark:border-slate-800 text-slate-400'
                } text-xs`}
            >
              <p className="font-medium">No steps in timeline yet.</p>
              <p className="text-[11px] mt-1 opacity-80">
                Drag any media asset or quiz card from the library above, or click + Add Section / + Final Milestone to begin.
              </p>
            </div>
          ) : (
            <>
              {timeline.map((item, idx) => {
                const isSection = item.kind === 'section' && item.section;
                const isQuiz = item.kind === 'quiz' && item.quiz;
                const media = item.media;
                const isBeingDragged = pointerDrag?.isStarted && pointerDrag?.timelineIndex === idx;
                const isDropTargetHere = isPointerOverTimeline && pointerDropTargetIdx === idx;

                return (
                  <div key={item.timelineId} data-step-index={idx} className="flex items-center gap-3 shrink-0 h-full">
                    {/* Visual Insertion Indicator before this card */}
                    {isDropTargetHere && (
                      <div className="w-2.5 h-[180px] bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full shadow-lg shadow-blue-500/50 animate-pulse shrink-0" />
                    )}

                    {/* FINAL COURSE MILESTONE CARD */}
                    {item.kind === 'final_assessment' && item.finalAssessment ? (
                      <div
                        onPointerDown={(e) => startPointerDragTimelineStep(e, idx, item)}
                        onContextMenu={(e) => handleFilmstripContextMenu(e as unknown as MouseEvent, { timelineId: item.timelineId, idx, kind: 'final_assessment', title: item.finalAssessment.title })}
                        className={`group relative flex-shrink-0 w-48 h-[180px] bg-gradient-to-b from-purple-900/30 via-indigo-950/20 to-slate-950 border-2 border-purple-500 rounded-xl overflow-hidden flex flex-col justify-between cursor-grab active:cursor-grabbing transition-all select-none touch-none shadow-lg ring-2 ring-purple-500/20 ${isBeingDragged ? 'opacity-30 scale-95 border-dashed' : ''
                          }`}
                      >
                        {/* Final Header */}
                        <div className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between text-[10px] font-black shrink-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <Crown size={14} className="shrink-0 text-amber-300" />
                            <span className="truncate">Final Milestone</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMilestoneRenameStart(item.timelineId, item.finalAssessment.title); }}
                              className="p-0.5 text-purple-200 hover:text-white cursor-pointer"
                              title="Rename"
                            >
                              <Edit3 size={11} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveItem(idx, 'left'); }}
                              disabled={idx === 0}
                              className="p-0.5 text-purple-200 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Left"
                            >
                              <ChevronLeft size={12} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveItem(idx, 'right'); }}
                              disabled={idx === timeline.length - 1}
                              className="p-0.5 text-purple-200 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Right"
                            >
                              <ChevronRight size={12} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeFromTimeline(item.timelineId); }}
                              className="p-0.5 text-rose-300 hover:text-rose-100 cursor-pointer ml-0.5"
                              title="Remove Final Milestone"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Final Body */}
                        <div className="p-2.5 text-center space-y-1.5 my-auto">
                          <span className="text-[9px] uppercase font-black text-amber-400 tracking-wider">
                            Pass Requirement: {item.finalAssessment.requiredPassingScorePct}%
                          </span>
                          {renamingMilestoneId === item.timelineId ? (
                            <input
                              autoFocus
                              type="text"
                              value={milestoneRenameValue}
                              onChange={(e) => setMilestoneRenameValue(e.target.value)}
                              onBlur={handleMilestoneRenameCommit}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleMilestoneRenameCommit(); if (e.key === 'Escape') setRenamingMilestoneId(null); }}
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="w-full text-xs font-bold text-center bg-white/10 border border-purple-400 rounded px-1 py-0.5 outline-none text-white"
                            />
                          ) : (
                            <h4
                              className="text-xs font-bold text-white line-clamp-1 cursor-text"
                              title="Double-click to rename"
                              onDoubleClick={(e) => { e.stopPropagation(); handleMilestoneRenameStart(item.timelineId, item.finalAssessment.title); }}
                            >
                              {item.finalAssessment.title}
                            </h4>
                          )}

                          {/* Question Types Chips */}
                          {item.finalAssessment.questionTypes && item.finalAssessment.questionTypes.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-1 py-0.5">
                              {item.finalAssessment.questionTypes.slice(0, 3).map((t, tIdx) => (
                                <span key={tIdx} className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-purple-900/90 text-purple-200 border border-purple-700/60">
                                  {t}
                                </span>
                              ))}
                              {item.finalAssessment.questionTypes.length > 3 && (
                                <span className="px-1 py-0.5 rounded text-[8px] font-extrabold bg-purple-950 text-purple-300">
                                  +{item.finalAssessment.questionTypes.length - 3}
                                </span>
                              )}
                            </div>
                          ) : null}

                          <p className="text-[9px] text-purple-300 truncate" title={item.finalAssessment.assessmentQuizTitle}>
                            {item.finalAssessment.questionTypes?.length ? `${item.finalAssessment.questionTypes.length} Types • ${item.finalAssessment.totalAssessmentPoints || 50} pts` : (item.finalAssessment.assessmentQuizTitle || 'Multi-Type Exam')}
                          </p>
                        </div>

                        {/* Final Footer */}
                        <div className="px-2.5 py-1 bg-purple-950/80 border-t border-purple-500/40 text-[9px] font-bold text-amber-300 text-center flex items-center justify-center gap-1 shrink-0">
                          <Trophy size={11} />
                          <span>Course Completion Gate</span>
                        </div>
                      </div>
                    ) : isSection && item.section ? (
                      <div
                        onPointerDown={(e) => startPointerDragTimelineStep(e, idx, item)}
                        onContextMenu={(e) => handleFilmstripContextMenu(e as unknown as MouseEvent, { timelineId: item.timelineId, idx, kind: 'section', title: item.section.title })}
                        className={`group relative flex-shrink-0 w-48 h-[180px] bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-slate-900 border-2 border-amber-400 dark:border-amber-600 rounded-xl overflow-hidden flex flex-col justify-between cursor-grab active:cursor-grabbing transition-all select-none touch-none shadow-md ${isBeingDragged ? 'opacity-30 scale-95 border-dashed' : ''
                          }`}
                      >
                        {/* Section Header */}
                        <div className="px-2.5 py-1 bg-amber-500 text-slate-950 flex items-center justify-between text-[10px] font-extrabold shrink-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <ShieldCheck size={13} className="shrink-0" />
                            <span className="truncate">Section Milestone</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMilestoneRenameStart(item.timelineId, item.section.title); }}
                              className="p-0.5 text-slate-900 hover:text-white cursor-pointer"
                              title="Rename"
                            >
                              <Edit3 size={11} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveItem(idx, 'left');
                              }}
                              disabled={idx === 0}
                              className="p-0.5 text-slate-900 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Left"
                            >
                              <ChevronLeft size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveItem(idx, 'right');
                              }}
                              disabled={idx === timeline.length - 1}
                              className="p-0.5 text-slate-900 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Right"
                            >
                              <ChevronRight size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromTimeline(item.timelineId);
                              }}
                              className="p-0.5 text-rose-900 hover:text-rose-950 cursor-pointer ml-0.5"
                              title="Remove Section Checkpoint"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Section Body */}
                        <div className="p-2 text-center space-y-1 my-auto">
                          <span className="text-[9px] uppercase font-bold text-amber-500 dark:text-amber-400 tracking-wider">
                            Pass Requirement: {item.section.requiredPassingScorePct}%
                          </span>
                          {renamingMilestoneId === item.timelineId ? (
                            <input
                              autoFocus
                              type="text"
                              value={milestoneRenameValue}
                              onChange={(e) => setMilestoneRenameValue(e.target.value)}
                              onBlur={handleMilestoneRenameCommit}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleMilestoneRenameCommit(); if (e.key === 'Escape') setRenamingMilestoneId(null); }}
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="w-full text-xs font-bold text-center bg-white dark:bg-slate-800 border border-amber-400 rounded px-1 py-0.5 outline-none text-slate-900 dark:text-white"
                            />
                          ) : (
                            <h4
                              className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 cursor-text"
                              title="Double-click to rename"
                              onDoubleClick={(e) => { e.stopPropagation(); handleMilestoneRenameStart(item.timelineId, item.section.title); }}
                            >
                              {item.section.title}
                            </h4>
                          )}

                          {/* Question Types Chips */}
                          {item.section.questionTypes && item.section.questionTypes.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-1 py-0.5">
                              {item.section.questionTypes.slice(0, 2).map((t, tIdx) => (
                                <span key={tIdx} className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                  {t}
                                </span>
                              ))}
                              {item.section.questionTypes.length > 2 && (
                                <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-amber-900 text-amber-200">
                                  +{item.section.questionTypes.length - 2}
                                </span>
                              )}
                            </div>
                          ) : null}

                          <p className="text-[9px] text-slate-400 truncate" title={item.section.assessmentQuizTitle}>
                            {item.section.questionTypes?.length ? `${item.section.questionTypes.length} Types • ${item.section.totalAssessmentPoints || 30} pts` : (item.section.assessmentQuizTitle || 'Multi-Type Quiz')}
                          </p>
                        </div>

                        {/* Section Footer */}
                        <div className="px-2 py-0.5 bg-amber-500/20 border-t border-amber-500/30 text-[9px] font-semibold text-amber-600 dark:text-amber-300 text-center shrink-0">
                          🔒 Gate Blocker on Fail
                        </div>
                      </div>
                    ) : item.kind === 'completion_screen' ? (
                      /* CONGRATULATIONS / COMPLETION SCREEN CARD */
                      <div
                        onPointerDown={(e) => startPointerDragTimelineStep(e, idx, item)}
                        className={`group relative flex-shrink-0 w-44 h-[180px] bg-gradient-to-b from-amber-500/10 via-emerald-500/10 to-slate-900 border-2 ${
                          isBeingDragged
                            ? 'opacity-30 scale-95 border-dashed border-amber-400 shadow-none'
                            : 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20 shadow-md hover:shadow-lg'
                        } rounded-xl overflow-hidden flex flex-col justify-between cursor-grab active:cursor-grabbing select-none transition-all`}
                      >
                        {/* Header */}
                        <div className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 flex items-center justify-between text-[10px] font-extrabold shrink-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <Trophy size={13} className="shrink-0 text-slate-950" />
                            <span className="truncate">End Screen</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveItem(idx, 'left');
                              }}
                              disabled={idx === 0}
                              className="p-0.5 text-slate-950 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Left"
                            >
                              <ChevronLeft size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveItem(idx, 'right');
                              }}
                              disabled={idx === timeline.length - 1}
                              className="p-0.5 text-slate-950 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Right"
                            >
                              <ChevronRight size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromTimeline(item.timelineId);
                              }}
                              className="p-0.5 text-rose-950 hover:text-red-700 cursor-pointer ml-0.5"
                              title="Remove End Screen"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Body */}
                        <div className="p-2 text-center space-y-1 my-auto flex flex-col items-center">
                          <div className="p-1.5 bg-amber-500/20 text-amber-500 dark:text-amber-400 rounded-full mb-0.5">
                            <Award size={20} />
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                            {item.completionScreen?.title || 'Graduation Summary'}
                          </h4>
                          <span className="text-[9px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                            Points & Breakdown
                          </span>
                        </div>

                        {/* Footer */}
                        <div className="px-2 py-0.5 bg-amber-500/20 border-t border-amber-500/30 text-[9px] font-semibold text-amber-600 dark:text-amber-300 text-center shrink-0">
                          🎓 Congratulations Screen
                        </div>
                      </div>
                    ) : (
                      /* MEDIA OR QUIZ STEP CARD */
                      <div
                        onPointerDown={(e) => startPointerDragTimelineStep(e, idx, item)}
                        onDoubleClick={() => {
                          if (isQuiz && item.quiz) {
                            onOpenQuizEditor?.(item.quiz);
                          }
                        }}
                        className={`group relative flex-shrink-0 w-40 h-[180px] bg-white dark:bg-slate-900 border ${isBeingDragged
                            ? 'opacity-30 scale-95 border-dashed border-blue-400 shadow-none'
                            : isQuiz
                              ? 'border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-400/20 shadow-xs hover:shadow-md'
                              : 'border-slate-300 dark:border-slate-700 shadow-xs hover:shadow-md'
                          } rounded-xl overflow-hidden flex flex-col justify-between cursor-grab active:cursor-grabbing transition-all select-none touch-none`}
                        title="Drag to reorder steps, double-click quizzes to edit"
                      >
                        {/* Step Header */}
                        <div className={`px-2 py-0.5 ${isQuiz ? 'bg-indigo-50 dark:bg-indigo-950/60 border-b border-indigo-200 dark:border-indigo-900' : 'bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700'
                          } flex items-center justify-between text-[10px] shrink-0`}>
                          <div className="flex items-center gap-1 min-w-0">
                            <GripVertical size={12} className="text-slate-400 shrink-0 cursor-grab" />
                            <span className={`font-bold truncate ${isQuiz ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                              Step {idx + 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {isQuiz && (
                              <button
                                onClick={(e) => {
                                 e.stopPropagation();
                                  if (item.quiz) onOpenQuizEditor?.(item.quiz);
                                }}
                                className="p-0.5 text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-200 cursor-pointer"
                                title="Edit Quiz"
                              >
                                <Edit3 size={11} />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveItem(idx, 'left');
                              }}
                              disabled={idx === 0}
                              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Left"
                            >
                              <ChevronLeft size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveItem(idx, 'right');
                              }}
                              disabled={idx === timeline.length - 1}
                              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Right"
                            >
                              <ChevronRight size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromTimeline(item.timelineId);
                              }}
                              className="p-0.5 text-red-400 hover:text-red-600 cursor-pointer ml-0.5"
                              title="Remove Step"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Step Content Preview (Thumbnail image/video) */}
                        <div className="relative h-22 w-full bg-slate-900 overflow-hidden flex items-center justify-center shrink-0">
                          {isQuiz && item.quiz ? (
                            <div className="relative w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 p-1.5 flex flex-col justify-between overflow-hidden">
                              {item.quiz.type === 'Click an Image' && item.quiz.data?.clickAnImage?.imageUrl && (
                                <img
                                  src={item.quiz.data.clickAnImage.imageUrl}
                                  alt="Quiz thumbnail"
                                  className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity"
                                />
                              )}
                              <div className="relative z-10 flex items-center justify-between">
                                <span className="text-[8px] font-bold text-white bg-indigo-600 px-1 py-0.5 rounded">
                                  {item.quiz.type}
                                </span>
                                <span className="text-[8px] font-bold text-amber-300 bg-black/50 px-1 py-0.5 rounded">
                                  {item.quiz.totalPoints} pts
                                </span>
                              </div>
                              <p className="relative z-10 text-white text-[10px] font-bold text-center line-clamp-1 drop-shadow-xs">
                                {item.quiz.prompt || item.quiz.name}
                              </p>
                              <div className="relative z-10 text-[8px] text-center text-indigo-300">
                                2x click to edit
                              </div>
                            </div>
                          ) : media?.type === 'video' ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-slate-900 pointer-events-none">
                              <video 
                                src={media.url} 
                                className="w-full h-full object-cover opacity-75" 
                                preload="metadata" 
                                muted 
                                playsInline 
                              />
                              <div className="absolute p-1.5 bg-purple-600/85 text-white rounded-full shadow-md flex items-center justify-center">
                                <Film size={13} />
                              </div>
                            </div>
                          ) : media ? (
                            <img src={media.url} alt={media.name} className="w-full h-full object-cover" />
                          ) : null}

                          {/* Dimmed Overlay on Hover with Preview Action */}
                          <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-xs opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-all duration-150 p-2">
                            {isQuiz && item.quiz ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenQuizEditor?.(item.quiz!);
                                }}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer flex items-center gap-1 text-[11px] font-bold shadow-md ring-1 ring-white/20"
                              >
                                <Edit3 size={13} />
                                <span>Edit</span>
                              </button>
                            ) : media ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewMedia(media);
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer shadow-md ring-1 ring-white/20"
                                title="Preview"
                              >
                                <Eye size={15} />
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {/* Footer Name */}
                        <div className="p-1.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 shrink-0 pointer-events-none">
                          <p className="text-[10px] font-semibold text-slate-800 dark:text-slate-200 truncate" title={isQuiz ? item.quiz?.name : media?.name}>
                            {isQuiz ? item.quiz?.name : media?.name}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Visual Insertion Indicator at the very end */}
              {isPointerOverTimeline && pointerDropTargetIdx === timeline.length && (
                <div className="w-2.5 h-[180px] bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full shadow-lg shadow-blue-500/50 animate-pulse shrink-0" />
              )}

              {/* Dedicated End-of-Course Drop Zone / Empty Space */}
              <div
                data-step-index={timeline.length}
                className={`shrink-0 w-40 h-[180px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center p-2.5 transition-all select-none ${
                  isPointerOverTimeline && pointerDropTargetIdx === timeline.length
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/60 ring-2 ring-blue-500/30 text-blue-600 scale-102 shadow-md'
                    : 'border-slate-300 dark:border-slate-800 bg-slate-100/30 dark:bg-slate-900/20 hover:border-slate-400 dark:hover:border-slate-700 text-slate-400'
                }`}
              >
                <button
                  type="button"
                  onClick={handleAddCongratulationsScreen}
                  className="flex flex-col items-center p-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer w-full group mb-1"
                  title="Add Congratulations End Screen to Course"
                >
                  <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 group-hover:scale-110 transition-transform mb-1">
                    <Trophy size={15} />
                  </div>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    + Add End Screen
                  </span>
                  <span className="text-[9px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                    Points & Breakdown
                  </span>
                </button>

                <span className="text-[9px] text-slate-400">
                  or drop slides here
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Pointer Drag Preview Chip (Follows Cursor) */}
      {pointerDrag && pointerDrag.isStarted && (
        <div
          style={{
            left: `${pointerDrag.clientX}px`,
            top: `${pointerDrag.clientY}px`,
          }}
          className="fixed pointer-events-none z-100 -translate-x-1/2 -translate-y-1/2 px-4 py-2.5 bg-slate-900 text-white rounded-xl shadow-2xl border-2 border-blue-500 text-xs font-bold flex items-center gap-2.5 scale-105 opacity-95 rotate-1"
        >
          <GripVertical size={14} className="text-blue-400" />
          <span className="truncate max-w-[200px]">{pointerDrag.title}</span>
          <span className="text-[9px] bg-blue-600 px-1.5 py-0.5 rounded uppercase font-extrabold text-white">
            {pointerDrag.type === 'timeline'
              ? 'Move Step'
              : pointerDrag.type === 'batch'
                ? `Insert ${pointerDrag.batchItems?.length || ''} Items`
                : 'Add to Timeline'}
          </span>
        </div>
      )}

      {/* Context Menu */}
      <MediaLibraryContextMenu
        state={contextMenu}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
        onAddToTimeline={handleContextMenuAddToTimeline}
        onPreviewMedia={(item) => setPreviewMedia(item)}
        onRenameMedia={handleRenameMedia}
        onDuplicateMedia={handleDuplicateMedia}
        onCopyMediaLink={handleCopyMediaLink}
        onDeleteMedia={handleDeleteMedia}
        onEditQuiz={(quiz) => onOpenQuizEditor?.(quiz)}
        onDuplicateQuiz={handleDuplicateQuiz}
        onDeleteQuiz={handleDeleteQuiz}
        onNavigateToMedia={onNavigateToMedia}
        onFilterChange={(filter) => setActiveFilter(filter)}
      />

      {/* ─── Filmstrip Context Menu Popup ──────────────────────────────────────── */}
      {filmstripCtxMenu?.isOpen && (
        <>
          {/* Backdrop to close */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setFilmstripCtxMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setFilmstripCtxMenu(null); }}
          />
          <div
            className="fixed z-50 min-w-[160px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ left: filmstripCtxMenu.x, top: filmstripCtxMenu.y }}
          >
            {filmstripCtxMenu.kind === 'section' || filmstripCtxMenu.kind === 'final_assessment' ? (
              <>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                  onClick={() => handleFilmstripCtxAction('rename')}
                >
                  <Edit3 size={13} className="text-blue-500" />
                  Rename
                </button>
                <div className="border-t border-slate-100 dark:border-slate-800 my-0.5" />
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-40"
                  onClick={() => handleFilmstripCtxAction('move-left')}
                  disabled={filmstripCtxMenu.idx === 0}
                >
                  <ChevronLeft size={13} /> Move Left
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-40"
                  onClick={() => handleFilmstripCtxAction('move-right')}
                  disabled={filmstripCtxMenu.idx === timeline.length - 1}
                >
                  <ChevronRight size={13} /> Move Right
                </button>
                <div className="border-t border-slate-100 dark:border-slate-800 my-0.5" />
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 cursor-pointer"
                  onClick={() => handleFilmstripCtxAction('remove')}
                >
                  <Trash2 size={13} /> Remove
                </button>
              </>
            ) : (
              /* Right-click on filmstrip background */
              <>
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filmstrip</div>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                  onClick={() => { setFilmstripCtxMenu(null); handleOpenAddSectionModal(false); }}
                >
                  <ShieldCheck size={13} className="text-amber-500" /> Add Section Milestone
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                  onClick={() => { setFilmstripCtxMenu(null); handleOpenAddSectionModal(true); }}
                >
                  <Crown size={13} className="text-purple-500" /> Add Final Milestone
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Add Section Milestone Modal */}
      {isAddSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-150 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white">
                <div className={`p-2 rounded-xl ${isCreatingFinalMilestone ? 'bg-purple-500/10 text-purple-600' : 'bg-amber-500/10 text-amber-600'}`}>
                  {isCreatingFinalMilestone ? <Crown size={20} /> : <ShieldCheck size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {isCreatingFinalMilestone ? 'Add Final Course Milestone' : 'Add Section Checkpoint'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isCreatingFinalMilestone ? 'Course capstone required to graduate and finish' : 'Requires students to pass assessment to proceed'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddSectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Type Selector Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingFinalMilestone(false);
                  setNewSectionTitle(`Section ${timeline.filter(t => t.kind === 'section').length + 1}: Module Assessment`);
                  setNewSectionPassPct(75);
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${!isCreatingFinalMilestone
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
              >
                <ShieldCheck size={14} />
                <span>Section Checkpoint</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingFinalMilestone(true);
                  setNewSectionTitle('Final Course Milestone Assessment');
                  setNewSectionPassPct(80);
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${isCreatingFinalMilestone
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
              >
                <Crown size={14} />
                <span>Final Milestone</span>
              </button>
            </div>

            <form onSubmit={handleSaveAddSection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isCreatingFinalMilestone ? 'Final Assessment Milestone Title' : 'Section Milestone Title'}
                </label>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  required
                  placeholder={isCreatingFinalMilestone ? 'e.g. Final Comprehensive Milestone Exam' : 'e.g. Section 1: Solar Power Fundamentals'}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Questions & Question Types to Bundle ({selectedAssessmentQuizIds.length} selected)
                  </label>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                    Spans Multiple Types
                  </span>
                </div>

                {quizActivities.length > 0 ? (
                  <div className="max-h-44 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl">
                    {quizActivities.map((quiz) => {
                      const isChecked = selectedAssessmentQuizIds.includes(quiz.id);
                      return (
                        <label
                          key={quiz.id}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all cursor-pointer select-none ${isChecked
                              ? 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-slate-900 dark:text-white'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleQuizSelection(quiz.id)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 rounded-sm"
                            />
                            <div className="min-w-0">
                              <span className="font-bold truncate block">{quiz.name}</span>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {quiz.prompt || 'Interactive Question Activity'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-200">
                              {quiz.type}
                            </span>
                            <span className="text-[10px] font-bold text-amber-500">
                              {quiz.type === 'Essay' ? '0 pts (Required)' : `${quiz.totalPoints} pts`}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/60 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    No quizzes found. A default multi-type evaluation battery will be attached.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Required Passing Score Percentage</span>
                  <span className={`${isCreatingFinalMilestone ? 'text-purple-600' : 'text-amber-600'} font-extrabold`}>
                    {newSectionPassPct}%
                  </span>
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={newSectionPassPct}
                  onChange={(e) => setNewSectionPassPct(parseInt(e.target.value, 10))}
                  className={`w-full ${isCreatingFinalMilestone ? 'accent-purple-600' : 'accent-amber-500'} cursor-pointer`}
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>50% Minimum</span>
                  <span>75% Standard</span>
                  <span>100% Mastery</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 leading-relaxed">
                {isCreatingFinalMilestone ? (
                  <span>
                    🏆 <strong>Final Milestone Rule:</strong> Students must pass this final assessment to finish the course. If failed, they can review specific sections and retake section quizzes or restart the full course.
                  </span>
                ) : (
                  <span>
                    🛡️ <strong>Checkpoint Rule:</strong> If the student fails to meet {newSectionPassPct}%, course progression is blocked until this section is restarted and the assessment retaken and passed.
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSectionModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 ${isCreatingFinalMilestone
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-amber-500 hover:bg-amber-600'
                    } text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer`}
                >
                  {isCreatingFinalMilestone ? 'Insert Final Milestone' : 'Insert Section Checkpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Asset Modal */}
      {renamingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-base">Rename Asset</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Update display title for this {renamingItem.type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRenamingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRename}>
              <div className="mb-5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Asset Title
                </label>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Enter new name..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRenamingItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Save Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Preview Modal */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                {previewMedia.type === 'slide' && <Presentation size={18} className="text-blue-500" />}
                {previewMedia.type === 'photo' && <ImageIcon size={18} className="text-emerald-500" />}
                {previewMedia.type === 'video' && <Video size={18} className="text-purple-500" />}
                <span className="font-semibold text-slate-900 dark:text-white text-sm">
                  {previewMedia.name}
                </span>
              </div>
              <button
                onClick={() => setPreviewMedia(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              {previewMedia.type === 'video' ? (
                <video src={previewMedia.url} controls autoPlay className="w-full h-full object-contain" />
              ) : (
                <img src={previewMedia.url} alt={previewMedia.name} className="w-full h-full object-contain" />
              )}
            </div>

            <div className="p-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <span className="text-xs text-slate-500 capitalize">Type: {previewMedia.type}</span>
              <button
                onClick={() => {
                  addMediaToTimeline(previewMedia);
                  setPreviewMedia(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
              >
                <Plus size={14} /> Add to Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Course Learner Preview Modal */}
      <CoursePlayerPreviewModal
        isOpen={isPlayerPreviewOpen}
        onClose={() => setIsPlayerPreviewOpen(false)}
        timeline={timeline}
        courseTitle={courseTitle}
        currentProject={currentProject}
        quizActivities={quizActivities}
      />

      {/* Completion Modal */}
      <CourseCompletionModal
        isOpen={isCompletionModalOpen}
        onClose={() => setIsCompletionModalOpen(false)}
        courseTitle={courseTitle}
        courseId={courseId}
        scoreTally={scoreTally}
      />

      {/* Action Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
