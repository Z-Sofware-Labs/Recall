import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X, ChevronLeft, ChevronRight, Presentation, Image as ImageIcon,
  Video, Award, CheckCircle2, AlertTriangle, Trophy,
  ShieldCheck, Check, Crown, RotateCcw, BookOpen,
  FileText, Edit3, ListChecks, AlertCircle, Printer, Sun, Moon
} from 'lucide-react';
import { TimelineItem, CourseSection, FinalAssessmentMilestone, AssessmentQuestionItem } from '../CourseOrganizer';
import { QuizActivity } from '../../types/quiz';
import { scoreService } from '../../services/scoreService';
import InteractiveQuizPlayer from './InteractiveQuizPlayer';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import CertificateDiplomaView, {
  CertificateFormData,
  generateUniqueVerificationCode,
} from '../certificate/CertificateDiplomaView';

export interface CoursePlayerEngineProps {
  timeline: TimelineItem[];
  courseTitle: string;
  currentProject?: any;
  quizActivities?: QuizActivity[];
  mode?: 'preview' | 'standalone';
  onClose?: () => void;
  isStandaloneWindow?: boolean;
}

export default function CoursePlayerEngine({
  timeline = [],
  courseTitle = 'Interactive Course',
  currentProject,
  quizActivities = [],
  mode = 'standalone',
  onClose,
  isStandaloneWindow = false,
}: CoursePlayerEngineProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [unlockedStepIndex, setUnlockedStepIndex] = useState(0);
  const [sectionResults, setSectionResults] = useState<Record<string, { passed: boolean; score: number; maxScore: number }>>({});

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      const initialPref = (window as any).__RECALL_INITIAL_THEME__;
      if (initialPref === 'dark') return true;
      if (initialPref === 'light') return false;
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    try {
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    } catch {}
  }, [isDarkMode]);

  // Essay Submissions Tracking (Mandatory for milestone completion)
  const [submittedEssays, setSubmittedEssays] = useState<Record<string, { text: string; submitted: boolean }>>({});
  const [essayDrafts, setEssayDrafts] = useState<Record<string, string>>({});

  // Section Failure Gate
  const [failedSectionGate, setFailedSectionGate] = useState<{
    section: CourseSection;
    sectionStartIndex: number;
    score: number;
    maxScore: number;
    percentage: number;
  } | null>(null);
  const [, setSectionAttempts] = useState<Record<string, number>>({});

  // Final Assessment Failure Gate
  const [failedFinalGate, setFailedFinalGate] = useState<{
    finalAssessment: FinalAssessmentMilestone;
    score: number;
    maxScore: number;
    percentage: number;
  } | null>(null);
  const [, setFinalAttempts] = useState<number>(0);

  // Active Review State when coming from Final Assessment
  const [reviewingSectionTitle, setReviewingSectionTitle] = useState<string | null>(null);

  // Course Completed State
  const [isCourseCompleted, setIsCourseCompleted] = useState(false);
  const [finalScorePct, setFinalScorePct] = useState<number>(0);
  const [finalAssessmentScore, setFinalAssessmentScore] = useState<number>(0);
  const [finalAssessmentMaxScore, setFinalAssessmentMaxScore] = useState<number>(0);

  // Student Certificate State on End Screen
  const [studentName, setStudentName] = useState('Alexandria J. Mercer');
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [certQrUrl, setCertQrUrl] = useState('');

  // Assessment Simulator State
  const [, setAssessmentSubmitted] = useState(false);
  const [, setAssessmentPassed] = useState(false);
  const [activeAssessmentDetailedResults, setActiveAssessmentDetailedResults] = useState<any[]>([]);

  // Non-essay Quiz Scores Tracking
  const [completedQuizScores, setCompletedQuizScores] = useState<Record<string, { score: number; maxScore: number; passed: boolean }>>({});

  const [isTakingSectionAssessment, setIsTakingSectionAssessment] = useState(false);
  const [isTakingFinalAssessment, setIsTakingFinalAssessment] = useState(false);

  // Multi-quiz queue state for section checkpoints
  const [sectionQuizQueue, setSectionQuizQueue] = useState<QuizActivity[]>([]);
  const [sectionQuizQueueIdx, setSectionQuizQueueIdx] = useState(0);
  const [sectionQueueAccum, setSectionQueueAccum] = useState({ score: 0, maxScore: 0 });
  const [sectionAssessmentCompletedState, setSectionAssessmentCompletedState] = useState<{
    passed: boolean;
    score: number;
    maxScore: number;
    percentage: number;
  } | null>(null);

  // Multi-quiz queue state for final assessment
  const [finalQuizQueue, setFinalQuizQueue] = useState<QuizActivity[]>([]);
  const [finalQuizQueueIdx, setFinalQuizQueueIdx] = useState(0);
  const [finalQueueAccum, setFinalQueueAccum] = useState({ score: 0, maxScore: 0 });
  const [finalAssessmentCompletedState, setFinalAssessmentCompletedState] = useState<{
    passed: boolean;
    score: number;
    maxScore: number;
    percentage: number;
  } | null>(null);

  // Normalize timeline items so that any quiz activity is guaranteed to have item.quiz resolved from pool
  const safeTimeline = (timeline || []).map((item) => {
    if (item.kind === 'quiz' && !item.quiz) {
      const qId = (item as any).quizId || item.timelineId;
      const found = quizActivities.find(q => q.id === qId) || 
                    currentProject?.quizActivities?.find((q: any) => q.id === qId);
      if (found) {
        return { ...item, quiz: found };
      }
    }
    return item;
  });
  const currentItem = safeTimeline[currentStepIndex] || safeTimeline[0] || ({} as TimelineItem);

  const handleQuizActivityComplete = (result: {
    quizId: string;
    score: number;
    maxScore: number;
    passed: boolean;
    correctCount: number;
    mistakeCount: number;
    exhausted?: boolean;
    detailedResults?: any[];
  }) => {
    setCompletedQuizScores(prev => ({
      ...prev,
      [result.quizId]: {
        score: result.score,
        maxScore: result.maxScore,
        passed: result.passed,
      }
    }));

    if (currentItem.kind === 'quiz' && currentItem.quiz) {
      try {
        scoreService.recordQuizScore({
          courseId: currentProject?.id || 'course_default',
          quizId: result.quizId,
          quizTitle: currentItem.quiz.name,
          quizType: currentItem.quiz.type,
          score: result.score,
          maxScore: result.maxScore,
          correctCount: result.correctCount,
          mistakeCount: result.mistakeCount,
          attempts: 1,
        });
      } catch (err) {
        // Fallback if scoreService is unavailable in standalone mode
      }
    }

    // If all retries were spent without passing, trigger the Failed Assessment flow
    if (result.exhausted) {
      const secInfo = getSectionForStep(currentStepIndex);
      if (secInfo) {
        setFailedSectionGate({
          section: secInfo.section,
          sectionStartIndex: secInfo.startIndex,
          score: result.score,
          maxScore: result.maxScore,
          percentage: 0,
        });
      } else {
        setFailedFinalGate({
          finalAssessment: {
            id: 'course_retry',
            title: 'Course Learning Materials',
            requiredPassingScorePct: 75,
          } as any,
          score: result.score,
          maxScore: result.maxScore,
          percentage: 0,
        });
      }
    }
  };

  const renderAssessmentDetailedResults = () => {
    if (activeAssessmentDetailedResults.length === 0) return null;
    return (
      <div className="mt-4 p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-left space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
          <ListChecks size={13} className="text-blue-500" />
          <span>Correction & Answer Key Review</span>
        </h4>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
          {activeAssessmentDetailedResults.map((res, index) => (
            <div key={index} className="text-[11px] p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold text-slate-200">{res.questionText}</p>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0 ${
                  res.isCorrect 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  {res.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                <div>
                  <span className="text-slate-400 font-medium">Your Answer: </span>
                  <span className={res.isCorrect ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {res.userAnswer || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Correct Answer: </span>
                  <span className="text-slate-200 font-semibold">{res.correctAnswer || '—'}</span>
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
    );
  };

  // Compute overall score tally and section breakdown
  const allSections = safeTimeline.filter(t => t.kind === 'section');
  const allQuizzes = safeTimeline.filter(t => t.kind === 'quiz');
  const finalMilestone = safeTimeline.find(t => t.kind === 'final_assessment');

  let totalPointsEarned = 0;
  let totalPointsPossible = 0;

  allQuizzes.forEach(item => {
    if (item.quiz) {
      const q = item.quiz;
      const defaultPts = q.totalPoints || q.pointsPerCorrect || (q.data?.sequencing?.steps?.length ? 10 : 10);
      const scoreInfo = completedQuizScores[q.id];
      const isEssay = q.type === 'Essay';
      const isSub = isEssay && submittedEssays[q.id]?.submitted;
      
      const max = scoreInfo?.maxScore ?? defaultPts;
      const earned = isEssay 
        ? (isSub ? max : 0) 
        : (scoreInfo ? scoreInfo.score : (isCourseCompleted ? max : 0));
        
      totalPointsEarned += earned;
      totalPointsPossible += max;
    }
  });

  allSections.forEach(item => {
    if (item.section) {
      const max = item.section.totalAssessmentPoints || 30;
      const res = sectionResults[item.section.id];
      const earned = res ? res.score : (isCourseCompleted ? max : Math.round(max * 0.9));
      totalPointsEarned += earned;
      totalPointsPossible += max;
    }
  });

  if (finalMilestone && finalMilestone.finalAssessment) {
    const max = finalMilestone.finalAssessment.totalAssessmentPoints || 50;
    const earned = finalScorePct > 0 ? Math.round((finalScorePct / 100) * max) : (isCourseCompleted ? max : Math.round(max * 0.85));
    totalPointsEarned += earned;
    totalPointsPossible += max;
  }

  const overallPct = totalPointsPossible > 0 ? Math.round((totalPointsEarned / totalPointsPossible) * 100) : 100;

  const certConfig = currentProject?.certificate || (() => {
    try {
      const saved = localStorage.getItem(`recall_certificate_${currentProject?.id || 'default'}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  })();

  const certId = certConfig.certificateId || generateUniqueVerificationCode();
  const issueDateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const distinctionRemark = overallPct >= 95 ? 'Passed with High Distinction' : overallPct >= 90 ? 'Passed with Distinction' : overallPct >= 80 ? 'Passed with Honors' : 'Successfully Completed';

  useEffect(() => {
    if (isCertificateModalOpen) {
      const cfgSchool = certConfig.schoolName || 'Horizon Academy of Sciences & Technology';
      const cfgDept = certConfig.departmentName || 'Department of Applied Engineering & Renewable Studies';
      const cfgCourse = certConfig.courseName || courseTitle || 'Course of Study';
      const cfgTrack = certConfig.gradeLevel !== undefined ? certConfig.gradeLevel : 'Grade 12 — Senior STEM Honors Track';
      const cfgShowScore = certConfig.showScore !== false;
      const cfgTeacher = certConfig.teacherName || 'Dr. Elena Rostova';
      const cfgTeacherTitle = certConfig.teacherTitle || 'Lead Course Instructor';
      const cfgIncludePrincipal = certConfig.includePrincipal !== false;
      const cfgPrincipal = certConfig.principalName || 'Prof. Marcus Vance, Ph.D.';
      const cfgPrincipalTitle = certConfig.principalTitle || 'School Principal & Academic Dean';

      const payload = `=== RECALL CERTIFICATE OF COMPLETION ===\nVERIFICATION CODE: ${certId}\nSTATUS: VERIFIED & AUTHENTIC (OFFLINE VALID)\n----------------------------------------\nRECIPIENT: ${studentName || 'Student'}\nCOURSE: ${cfgCourse}\nINSTITUTION: ${cfgSchool}${cfgDept ? ' - ' + cfgDept : ''}\n${cfgTrack ? 'TRACK/GRADE: ' + cfgTrack + '\n' : ''}${cfgShowScore ? `EVALUATION SCORE: ${totalPointsEarned}/${totalPointsPossible} (${overallPct}%) - ${distinctionRemark}\n` : ''}INSTRUCTOR: ${cfgTeacher} (${cfgTeacherTitle})\n${cfgIncludePrincipal ? `PRINCIPAL: ${cfgPrincipal} (${cfgPrincipalTitle})\n` : ''}ISSUE DATE: ${issueDateStr}\n----------------------------------------\nRecall™ Offline Credential Verification\n========================================`;
      QRCode.toDataURL(payload, { margin: 1, width: 160, errorCorrectionLevel: 'M', color: { dark: '#0f172a', light: '#ffffff' } })
        .then(url => setCertQrUrl(url))
        .catch(console.error);
    }
  }, [isCertificateModalOpen, certId, studentName, courseTitle, overallPct, totalPointsEarned, totalPointsPossible, certConfig, issueDateStr, distinctionRemark]);

  // Helper: Find start index of current section
  const getSectionStartIndex = (sectionIndex: number): number => {
    for (let i = sectionIndex - 1; i >= 0; i--) {
      if (timeline[i].kind === 'section') {
        return i + 1;
      }
    }
    return 0;
  };

  // Helper: Find enclosing section for any step in timeline
  const getSectionForStep = (stepIdx: number): { section: CourseSection; startIndex: number } | null => {
    for (let i = stepIdx; i < timeline.length; i++) {
      if (timeline[i].kind === 'section' && timeline[i].section) {
        return {
          section: timeline[i].section!,
          startIndex: getSectionStartIndex(i),
        };
      }
    }
    for (let i = stepIdx - 1; i >= 0; i--) {
      if (timeline[i].kind === 'section' && timeline[i].section) {
        return {
          section: timeline[i].section!,
          startIndex: i + 1,
        };
      }
    }
    return null;
  };

  // Helper: Extract all sections with their start index for review directory
  const sectionsList: { section: CourseSection; startIndex: number; index: number }[] = [];
  timeline.forEach((item, idx) => {
    if (item.kind === 'section' && item.section) {
      sectionsList.push({
        section: item.section,
        startIndex: getSectionStartIndex(idx),
        index: idx,
      });
    }
  });

  const finalAssessmentIndex = timeline.findIndex(t => t.kind === 'final_assessment');

  // Check if current step is an unsubmitted mandatory Essay
  const isCurrentItemEssay = currentItem.kind === 'quiz' && currentItem.quiz?.type === 'Essay';
  const currentQuizId = currentItem.kind === 'quiz' ? currentItem.quiz?.id || '' : '';
  const isCurrentEssaySubmitted = isCurrentItemEssay && !!submittedEssays[currentQuizId]?.submitted;
  const isCurrentEssayPending = isCurrentItemEssay && !isCurrentEssaySubmitted;
  const isCurrentQuizExhausted = currentItem.kind === 'quiz' && currentItem.quiz && (currentItem.quiz.retries || 0) > 0 && completedQuizScores[currentItem.quiz.id] && !completedQuizScores[currentItem.quiz.id].passed;

  // Helper: check unsubmitted essays in section
  const getUnsubmittedEssaysInSection = (sectionIndex: number) => {
    const startIdx = getSectionStartIndex(sectionIndex);
    return timeline
      .slice(startIdx, sectionIndex)
      .filter(item => item.kind === 'quiz' && item.quiz?.type === 'Essay' && !submittedEssays[item.quiz.id]?.submitted);
  };

  // Helper: check unsubmitted essays in whole course
  const unsubmittedEssaysInCourse = timeline
    .filter(item => item.kind === 'quiz' && item.quiz?.type === 'Essay' && !submittedEssays[item.quiz.id]?.submitted);

  const handleEssaySubmit = (quizId: string, minWords = 0, maxWords = 0) => {
    const text = essayDrafts[quizId] || '';
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    if (!text.trim()) {
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

    setSubmittedEssays(prev => ({
      ...prev,
      [quizId]: { text, submitted: true }
    }));

    if (currentItem.kind === 'quiz' && currentItem.quiz) {
      try {
        scoreService.recordQuizScore({
          courseId: currentProject?.id || 'course_default',
          quizId,
          quizTitle: currentItem.quiz.name || 'Essay Activity',
          quizType: 'Essay',
          score: 0,
          maxScore: 0,
          correctCount: 0,
          mistakeCount: 0,
          attempts: 1,
        });
      } catch (e) {}
    }
  };

  const handleNextStep = () => {
    if (isCurrentEssayPending) {
      alert('Please enter and submit your essay response to proceed.');
      return;
    }

    // If on section milestone landing screen and not passed/taking it yet, start it
    if (currentItem.kind === 'section' && currentItem.section && !sectionResults[currentItem.section.id]?.passed && !isTakingSectionAssessment) {
      const unsubmitted = getUnsubmittedEssaysInSection(currentStepIndex);
      if (unsubmitted.length > 0) {
        alert(`Please complete all ${unsubmitted.length} unsubmitted essay activities in this section first.`);
        return;
      }
      const queue = buildQuizQueue(currentItem.section.assessmentQuestions, getSectionStartIndex(currentStepIndex), currentStepIndex);
      setSectionQuizQueue(queue);
      setSectionQuizQueueIdx(0);
      setSectionQueueAccum({ score: 0, maxScore: 0 });
      setActiveAssessmentDetailedResults([]);
      setIsTakingSectionAssessment(true);
      return;
    }

    // If on final milestone landing screen and not taking it yet, start it
    if (currentItem.kind === 'final_assessment' && currentItem.finalAssessment && !isTakingFinalAssessment) {
      if (unsubmittedEssaysInCourse.length > 0) {
        alert(`Please complete all ${unsubmittedEssaysInCourse.length} unsubmitted essay activities in the course before attempting the Final Exam.`);
        return;
      }
      const queue = buildQuizQueue(currentItem.finalAssessment.assessmentQuestions, 0, timeline.length);
      setFinalQuizQueue(queue);
      setFinalQuizQueueIdx(0);
      setFinalQueueAccum({ score: 0, maxScore: 0 });
      setActiveAssessmentDetailedResults([]);
      setIsTakingFinalAssessment(true);
      return;
    }

    if (currentStepIndex < safeTimeline.length - 1) {
      const nextIdx = currentStepIndex + 1;
      // Check section lock
      if (nextIdx > unlockedStepIndex && currentItem.kind === 'section' && !sectionResults[currentItem.section?.id || '']?.passed) {
        return;
      }
      setCurrentStepIndex(nextIdx);
      if (nextIdx > unlockedStepIndex) {
        setUnlockedStepIndex(nextIdx);
      }
      setAssessmentSubmitted(false);
      setIsTakingSectionAssessment(false);
      setIsTakingFinalAssessment(false);
    } else if (currentStepIndex === safeTimeline.length - 1) {
      // Reached the end of the course timeline!
      setIsCourseCompleted(true);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setFailedSectionGate(null);
      setIsTakingSectionAssessment(false);
      setIsTakingFinalAssessment(false);
    }
  };

  const handleRestartSection = () => {
    let startIndex = 0;
    if (failedSectionGate) {
      startIndex = failedSectionGate.sectionStartIndex;
    } else {
      const secInfo = getSectionForStep(currentStepIndex);
      startIndex = secInfo ? secInfo.startIndex : getSectionStartIndex(currentStepIndex);
    }

    setFailedSectionGate(null);
    setFailedFinalGate(null);
    setIsTakingSectionAssessment(false);
    setIsTakingFinalAssessment(false);
    setSectionAssessmentCompletedState(null);
    setFinalAssessmentCompletedState(null);
    setActiveAssessmentDetailedResults([]);

    // Clear failed quiz scores for steps in this section so student gets fresh attempts
    setCompletedQuizScores(prev => {
      const updated = { ...prev };
      for (let i = startIndex; i < timeline.length; i++) {
        if (timeline[i].kind === 'section' && i > startIndex) break;
        if (timeline[i].kind === 'quiz' && timeline[i].quiz) {
          delete updated[timeline[i].quiz!.id];
        }
      }
      return updated;
    });

    // Clear section result for this section so it can be re-evaluated
    const currentSec = timeline[currentStepIndex]?.kind === 'section'
      ? timeline[currentStepIndex].section
      : getSectionForStep(currentStepIndex)?.section;
    if (currentSec) {
      setSectionResults(prev => {
        const next = { ...prev };
        delete next[currentSec.id];
        return next;
      });
    }

    setCurrentStepIndex(startIndex);
    setAssessmentSubmitted(false);
    setSectionQuizQueueIdx(0);
    setSectionQueueAccum({ score: 0, maxScore: 0 });
  };

  const handleRetakeCheckpoint = () => {
    if (currentItem.kind === 'section' && currentItem.section) {
      const queue = buildQuizQueue(currentItem.section.assessmentQuestions, getSectionStartIndex(currentStepIndex), currentStepIndex);
      setSectionQuizQueue(queue);
      setSectionQuizQueueIdx(0);
      setSectionQueueAccum({ score: 0, maxScore: 0 });
      setActiveAssessmentDetailedResults([]);
      setSectionAssessmentCompletedState(null);
      setFailedSectionGate(null);
      setIsTakingSectionAssessment(true);
    } else {
      handleRestartSection();
    }
  };

  const handleReviewSpecificSection = (startIndex: number, sectionTitle: string) => {
    setFailedFinalGate(null);
    setFailedSectionGate(null);
    setIsTakingSectionAssessment(false);
    setIsTakingFinalAssessment(false);
    setReviewingSectionTitle(sectionTitle);
    setSectionAssessmentCompletedState(null);
    setActiveAssessmentDetailedResults([]);

    // Clear scores for this section so the student can re-attempt review quizzes
    setCompletedQuizScores(prev => {
      const updated = { ...prev };
      for (let i = startIndex; i < timeline.length; i++) {
        if (timeline[i].kind === 'section' && i > startIndex) break;
        if (timeline[i].kind === 'quiz' && timeline[i].quiz) {
          delete updated[timeline[i].quiz!.id];
        }
      }
      return updated;
    });

    setCurrentStepIndex(startIndex);
    setAssessmentSubmitted(false);
  };

  const handleJumpBackToFinalAssessment = () => {
    if (finalAssessmentIndex !== -1) {
      setReviewingSectionTitle(null);
      setIsTakingSectionAssessment(false);
      setIsTakingFinalAssessment(false);
      setCurrentStepIndex(finalAssessmentIndex);
      setAssessmentSubmitted(false);
      setFailedFinalGate(null);
    }
  };

  const handleRestartEntireCourse = () => {
    setCurrentStepIndex(0);
    setUnlockedStepIndex(0);
    setSectionResults({});
    setSubmittedEssays({});
    setEssayDrafts({});
    setCompletedQuizScores({});
    setFailedSectionGate(null);
    setFailedFinalGate(null);
    setReviewingSectionTitle(null);
    setIsCourseCompleted(false);
    setAssessmentSubmitted(false);
    setIsTakingSectionAssessment(false);
    setIsTakingFinalAssessment(false);
    setSectionQuizQueueIdx(0);
    setSectionQueueAccum({ score: 0, maxScore: 0 });
    setSectionAssessmentCompletedState(null);
    setFinalQuizQueueIdx(0);
    setFinalQueueAccum({ score: 0, maxScore: 0 });
    setFinalAssessmentCompletedState(null);
    setActiveAssessmentDetailedResults([]);
  };

  const buildQuizQueue = (
    assessmentQuestions: AssessmentQuestionItem[] | undefined,
    sectionStartIdx: number,
    sectionEndIdx: number,
  ): QuizActivity[] => {
    if (assessmentQuestions && assessmentQuestions.length > 0) {
      const found = assessmentQuestions
        .map(aq =>
          quizActivities.find(q => q.id === aq.quizId) ??
          timeline.find(t => t.kind === 'quiz' && t.quiz?.id === aq.quizId)?.quiz
        )
        .filter((q): q is QuizActivity => Boolean(q));
      if (found.length > 0) return found;
    }
    const slice = timeline
      .slice(sectionStartIdx, sectionEndIdx)
      .filter(t => t.kind === 'quiz' && t.quiz)
      .map(t => t.quiz!);
    return slice;
  };

  const getCurrentSectionQuiz = (section: CourseSection): QuizActivity => {
    const q = sectionQuizQueue[sectionQuizQueueIdx];
    if (q) return q;
    return {
      id: `sec_quiz_${section.id}`,
      name: section.assessmentQuizTitle || `${section.title} Assessment`,
      type: 'Multiple Choice',
      prompt: `No quiz activities were linked to "${section.title}". Add quizzes to the section in the Filmstrip.`,
      instructions: 'No questions available.',
      pointsPerCorrect: 10,
      deductionPerMistake: 0,
      retries: 0,
      isGraded: true,
      passingScore: 0,
      totalPoints: 0,
      data: { multipleChoice: { displayMode: 'single_page', shuffleOptions: false, shuffleQuestions: false, questions: [] } },
    };
  };

  const getCurrentFinalQuiz = (finalAssess: FinalAssessmentMilestone): QuizActivity => {
    const q = finalQuizQueue[finalQuizQueueIdx];
    if (q) return q;
    return {
      id: `final_quiz_${finalAssess.id}`,
      name: finalAssess.title || 'Comprehensive Final Assessment',
      type: 'Multiple Choice',
      prompt: `Comprehensive Capstone Examination: Demonstrate overall course mastery across all learning units.`,
      instructions: `Achieve at least ${finalAssess.requiredPassingScorePct}% to graduate and receive your Certificate of Completion.`,
      pointsPerCorrect: 10,
      deductionPerMistake: 0,
      retries: 0,
      isGraded: true,
      passingScore: 0,
      totalPoints: 0,
      data: { multipleChoice: { displayMode: 'single_page', shuffleOptions: false, shuffleQuestions: false, questions: [] } },
    };
  };

  const handleRealSectionAssessmentComplete = (result: {
    quizId: string;
    score: number;
    maxScore: number;
    passed: boolean;
    correctCount: number;
    mistakeCount: number;
    detailedResults?: any[];
  }) => {
    const section = currentItem.section!;
    const newAccum = {
      score: sectionQueueAccum.score + result.score,
      maxScore: sectionQueueAccum.maxScore + result.maxScore,
    };
    setSectionQueueAccum(newAccum);

    if (sectionQuizQueueIdx + 1 < sectionQuizQueue.length) {
      return;
    }

    const totalMax = newAccum.maxScore > 0 ? newAccum.maxScore : (section.totalAssessmentPoints || 30);
    const totalScore = newAccum.score;
    const percentage = Math.round((totalScore / Math.max(1, totalMax)) * 100);
    const reqPct = section.requiredPassingScorePct || 75;
    const passed = percentage >= reqPct;

    setSectionResults(prev => ({
      ...prev,
      [section.id]: { passed, score: totalScore, maxScore: totalMax }
    }));
    setAssessmentSubmitted(true);
    setAssessmentPassed(passed);

    setSectionAssessmentCompletedState({
      passed,
      score: totalScore,
      maxScore: totalMax,
      percentage,
    });
  };

  const handleSectionContinue = () => {
    const section = currentItem.section!;
    if (sectionQuizQueueIdx + 1 < sectionQuizQueue.length) {
      setSectionQuizQueueIdx(prev => prev + 1);
      return;
    }

    if (sectionAssessmentCompletedState) {
      if (sectionAssessmentCompletedState.passed) {
        setFailedSectionGate(null);
        setIsTakingSectionAssessment(false);
        setSectionAssessmentCompletedState(null);
        const nextIdx = currentStepIndex + 1;
        if (nextIdx < timeline.length) {
          setCurrentStepIndex(nextIdx);
          if (nextIdx > unlockedStepIndex) {
            setUnlockedStepIndex(nextIdx);
          }
        }
      } else {
        setSectionAttempts(prev => ({
          ...prev,
          [section.id]: (prev[section.id] || 0) + 1
        }));
        setFailedSectionGate({
          section,
          sectionStartIndex: getSectionStartIndex(currentStepIndex),
          score: sectionAssessmentCompletedState.score,
          maxScore: sectionAssessmentCompletedState.maxScore,
          percentage: sectionAssessmentCompletedState.percentage,
        });
        setIsTakingSectionAssessment(false);
        setSectionAssessmentCompletedState(null);
      }
    }
  };

  const handleRealFinalAssessmentComplete = (result: {
    quizId: string;
    score: number;
    maxScore: number;
    passed: boolean;
    correctCount: number;
    mistakeCount: number;
    detailedResults?: any[];
  }) => {
    const finalAssess = currentItem.finalAssessment!;
    const newAccum = {
      score: finalQueueAccum.score + result.score,
      maxScore: finalQueueAccum.maxScore + result.maxScore,
    };
    setFinalQueueAccum(newAccum);

    if (finalQuizQueueIdx + 1 < finalQuizQueue.length) {
      return;
    }

    const totalMax = newAccum.maxScore > 0 ? newAccum.maxScore : (finalAssess.totalAssessmentPoints || 50);
    const totalScore = newAccum.score;
    const percentage = Math.round((totalScore / Math.max(1, totalMax)) * 100);
    const reqPct = finalAssess.requiredPassingScorePct || 80;
    const passed = percentage >= reqPct;

    setFinalScorePct(percentage);
    setFinalAssessmentScore(totalScore);
    setFinalAssessmentMaxScore(totalMax);
    setAssessmentSubmitted(true);
    setAssessmentPassed(passed);

    setFinalAssessmentCompletedState({
      passed,
      score: totalScore,
      maxScore: totalMax,
      percentage,
    });
  };

  const handleFinalContinue = () => {
    const finalAssess = currentItem.finalAssessment!;
    if (finalQuizQueueIdx + 1 < finalQuizQueue.length) {
      setFinalQuizQueueIdx(prev => prev + 1);
      return;
    }

    if (finalAssessmentCompletedState) {
      if (finalAssessmentCompletedState.passed) {
        setFailedFinalGate(null);
        setIsTakingFinalAssessment(false);
        setIsCourseCompleted(true);
        setFinalAssessmentCompletedState(null);
      } else {
        setFinalAttempts(prev => prev + 1);
        setFailedFinalGate({
          finalAssessment: finalAssess,
          score: finalAssessmentCompletedState.score,
          maxScore: finalAssessmentCompletedState.maxScore,
          percentage: finalAssessmentCompletedState.percentage,
        });
        setIsTakingFinalAssessment(false);
        setFinalAssessmentCompletedState(null);
      }
    }
  };

  if (!timeline || timeline.length === 0) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
        No course timeline elements found.
      </div>
    );
  }

  const containerClasses = isStandaloneWindow
    ? `${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} w-full h-screen flex flex-col overflow-hidden select-none font-sans transition-colors`
    : `${isDarkMode ? 'dark bg-slate-950 text-slate-100 border-slate-800' : 'bg-slate-50 text-slate-900 border-slate-200'} w-full max-w-5xl rounded-2xl shadow-2xl border flex flex-col h-[92vh] overflow-hidden select-none font-sans transition-colors`;

  return (
    <div className={containerClasses}>
      {/* Top Header matching Preview Mode Screenshot */}
      <div className={`flex items-center justify-between px-5 sm:px-6 py-3 border-b shrink-0 transition-colors ${
        isDarkMode ? 'border-slate-800/80 bg-slate-950' : 'border-slate-200 bg-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
            <Presentation size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${
                isDarkMode ? 'text-blue-400 bg-blue-950/80 border-blue-800/60' : 'text-blue-700 bg-blue-50 border-blue-200'
              }`}>
                {mode === 'preview' ? 'LEARNER PREVIEW MODE' : 'LEARNER MODE'}
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Step {currentStepIndex + 1} of {timeline.length}
              </span>
            </div>
            <h3 className={`text-sm sm:text-base font-bold truncate max-w-md sm:max-w-xl ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {courseTitle}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Light / Dark Mode Switcher */}
          <button
            type="button"
            onClick={() => setIsDarkMode(prev => !prev)}
            className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
              isDarkMode 
                ? 'text-slate-400 hover:text-white hover:bg-slate-800/80' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-blue-600" />}
          </button>

          {reviewingSectionTitle && (
            <button
              onClick={handleJumpBackToFinalAssessment}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer animate-pulse"
            >
              <Crown size={14} />
              <span>Return to Final Assessment</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800/80' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Close Course Player"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Floating Review Banner */}
      {reviewingSectionTitle && (
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white px-6 py-2 flex items-center justify-between text-xs font-bold shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={16} />
            <span>Reviewing: {reviewingSectionTitle} (Review slides & retake quiz, then return to Final Assessment)</span>
          </div>
          <button
            onClick={handleJumpBackToFinalAssessment}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-[11px] font-bold cursor-pointer transition-colors"
          >
            Retake Final Assessment ➔
          </button>
        </div>
      )}

      {/* Progress Timeline Bar */}
      <div className="w-full bg-slate-900 h-1.5 flex shrink-0 border-b border-slate-800/50">
        {timeline.map((item, idx) => {
          const isPassed = idx <= unlockedStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isSection = item.kind === 'section';
          const isFinal = item.kind === 'final_assessment';
          return (
            <div
              key={item.timelineId || idx}
              style={{ width: `${100 / timeline.length}%` }}
              className={`h-full border-r border-slate-900 transition-all ${
                isCurrent
                  ? 'bg-blue-500 ring-1 ring-blue-400'
                  : isFinal
                    ? 'bg-purple-600'
                    : isSection
                      ? 'bg-amber-500'
                      : isPassed
                        ? 'bg-emerald-500'
                        : 'bg-slate-800'
              }`}
              title={`Step ${idx + 1}: ${item.kind === 'final_assessment' ? item.finalAssessment?.title : item.kind === 'section' ? item.section?.title : item.kind === 'quiz' ? item.quiz?.name : item.media?.name}`}
            />
          );
        })}
      </div>

      {/* Main Content Stage with Vertical Auto-Scroll (Hidden when fitting) */}
      <div className={`flex-1 w-full min-h-0 flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto overflow-x-hidden custom-scrollbar relative transition-colors ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        {/* 1. COURSE COMPLETED / FINAL GRADUATION SCREEN */}
        {isCourseCompleted || currentItem.kind === 'completion_screen' ? (
          <div className={`w-full max-w-xl rounded-3xl border-2 p-5 sm:p-6 shadow-2xl text-center space-y-4 max-h-full overflow-y-auto custom-scrollbar my-auto animate-in zoom-in-95 transition-colors ${
            isDarkMode 
              ? 'bg-slate-900 border-emerald-500 text-white' 
              : 'bg-white border-emerald-500 text-slate-900'
          }`}>
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 text-slate-950 flex items-center justify-center mx-auto shadow-md shadow-amber-500/20">
              <Trophy size={28} />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                🎉 Course Completed & Passed!
              </span>
              <h3 className={`text-xl sm:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {currentItem.completionScreen?.title || "Congratulations on Finishing!"}
              </h3>
              <p className={`text-xs max-w-md mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {currentItem.completionScreen?.customMessage || 
                  `You have successfully completed all interactive modules and evaluations for "${courseTitle}".`}
              </p>
            </div>

            <div className={`p-3 rounded-2xl border text-xs flex items-center justify-around ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className={`block text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Overall Score
                </span>
                <span className="text-sm sm:text-base font-extrabold text-emerald-500">
                  {overallPct}% ({totalPointsEarned}/{totalPointsPossible} pts)
                </span>
              </div>
              <div className={`w-px h-6 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-300'}`} />
              <div>
                <span className={`block text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Distinction
                </span>
                <span className="text-sm sm:text-base font-extrabold text-amber-500">
                  {distinctionRemark}
                </span>
              </div>
              <div className={`w-px h-6 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-300'}`} />
              <div>
                <span className={`block text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Status
                </span>
                <span className="text-sm sm:text-base font-extrabold text-blue-500">
                  Verified & Eligible
                </span>
              </div>
            </div>

            {/* Recipient Name Input & View Certificate Claim */}
            <div className={`p-3.5 rounded-2xl border-2 shadow-md space-y-2.5 text-left ${
              isDarkMode 
                ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border-amber-600/80' 
                : 'bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-amber-400'
            }`}>
              <label className={`block text-[11px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                Recipient Full Name on Certificate:
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Alexandria J. Mercer"
                  className={`flex-1 px-3.5 py-2 border-2 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-hidden shadow-xs ${
                    isDarkMode 
                      ? 'bg-slate-950 border-amber-700/80 text-white' 
                      : 'bg-white border-amber-400 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setIsCertificateModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black rounded-xl text-xs shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Award size={15} />
                  <span>View Certificate 📜</span>
                </button>
              </div>
            </div>

            {renderAssessmentDetailedResults()}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleRestartEntireCourse}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isDarkMode 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <RotateCcw size={14} />
                <span>Restart Course</span>
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Award size={15} />
                  <span>Finish & Close</span>
                </button>
              )}
            </div>
          </div>
        ) : failedFinalGate ? (
          /* 2. FINAL ASSESSMENT FAILURE HUB */
          <div className="w-full max-w-2xl bg-slate-900 rounded-3xl border-2 border-purple-500 p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 overflow-y-auto max-h-full custom-scrollbar my-auto">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-purple-950/60 border-2 border-purple-800 flex items-center justify-center mx-auto text-purple-400">
                <Crown size={32} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-800">
                Final Assessment Milestone Required
              </span>
              <h3 className="text-xl font-black text-white">
                Final Assessment Score: {failedFinalGate.percentage}% ({failedFinalGate.score} / {failedFinalGate.maxScore} pts) (Required: {failedFinalGate.finalAssessment.requiredPassingScorePct}%)
              </h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                {sectionsList.length >= 1 ? (
                  <span>
                    To complete the course and earn your certificate, you must pass this Final Assessment. You can jump back to review any section's learning materials and checkpoint, or restart the entire course from the beginning.
                  </span>
                ) : (
                  <span>
                    To complete the course and earn your certificate, you must pass this Final Assessment. Because this course is a direct linear sequence without section breaks, you must restart the entire course from the beginning.
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={handleRestartEntireCourse}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Restart Entire Course From Beginning</span>
              </button>
            </div>
          </div>
        ) : failedSectionGate ? (
          /* 3. SECTION FAILURE GATE */
          <div className="w-full max-w-xl bg-slate-900 rounded-3xl border-2 border-rose-500 p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 my-auto">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-rose-950/60 border-2 border-rose-800 flex items-center justify-center mx-auto text-rose-400">
                <AlertTriangle size={32} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-950/80 px-3 py-1 rounded-full border border-rose-800">
                Section Mastery Requirement Not Met
              </span>
              <h3 className="text-xl font-black text-white">
                Score: {failedSectionGate.percentage}% ({failedSectionGate.score} / {failedSectionGate.maxScore} pts)
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                You scored <strong>{failedSectionGate.percentage}%</strong> on the <strong>{failedSectionGate.section.title}</strong> checkpoint. A minimum score of <strong>{failedSectionGate.section.requiredPassingScorePct}%</strong> is required to unlock the next section.
              </p>
            </div>

            {renderAssessmentDetailedResults()}

            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1 text-center">
              <span className="font-bold text-slate-300">Remedial Learning Path Active:</span>
              <p>Review the lessons in this section and retake the checkpoint assessment to advance.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleRetakeCheckpoint}
                className="w-full sm:flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Retake Checkpoint Assessment ➔</span>
              </button>
              <button
                type="button"
                onClick={handleRestartSection}
                className="w-full sm:flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700/80"
              >
                <BookOpen size={14} />
                <span>Review Section Lessons ➔</span>
              </button>
            </div>
          </div>
        ) : currentItem.kind === 'final_assessment' && currentItem.finalAssessment ? (
          /* 4. FINAL ASSESSMENT LANDING / ACTIVE VIEW */
          isTakingFinalAssessment ? (
            <div className="w-full my-auto flex flex-col items-center justify-center space-y-3">
              <div className="w-full max-w-3xl flex items-center justify-between px-2 text-xs font-bold text-purple-400">
                <span className="flex items-center gap-1.5">
                  <Crown size={15} />
                  <span>{currentItem.finalAssessment.title} — Capstone Exam</span>
                </span>
                <button
                  onClick={() => setIsTakingFinalAssessment(false)}
                  className="text-slate-400 hover:text-slate-200 font-semibold cursor-pointer underline"
                >
                  Back to Overview
                </button>
              </div>
              {finalQuizQueue.length > 1 && (
                <div className="w-full max-w-3xl text-xs text-purple-400 text-center font-semibold">
                  Exam Part {finalQuizQueueIdx + 1} of {finalQuizQueue.length}: {finalQuizQueue[finalQuizQueueIdx]?.name}
                </div>
              )}
              <div className="w-full max-w-3xl flex flex-col items-center justify-center">
                <InteractiveQuizPlayer
                  key={`final_quiz_${finalQuizQueueIdx}_${getCurrentFinalQuiz(currentItem.finalAssessment).id}`}
                  quiz={getCurrentFinalQuiz(currentItem.finalAssessment)}
                  onComplete={(res) => {
                    if (res.detailedResults) {
                      setActiveAssessmentDetailedResults(prev => [...prev, ...res.detailedResults]);
                    }
                    handleRealFinalAssessmentComplete(res);
                  }}
                  onRestartSection={handleRestartEntireCourse}
                  sectionTitle={currentItem.finalAssessment.title}
                  onContinueNext={handleFinalContinue}
                  continueNextLabel={
                    finalQuizQueueIdx + 1 < finalQuizQueue.length
                      ? `Continue to Exam Part ${finalQuizQueueIdx + 2} of ${finalQuizQueue.length} ➔`
                      : finalAssessmentCompletedState?.passed
                        ? 'Final Exam Passed! View Graduation Summary ➔'
                        : finalAssessmentCompletedState
                          ? 'View Exam Review Options ➔'
                          : 'Continue ➔'
                  }
                />
              </div>
            </div>
          ) : (
            <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-purple-800 p-6 sm:p-8 shadow-xl space-y-6 my-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-800 flex items-center justify-center text-purple-400">
                    <Crown size={26} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      Final Capstone Milestone
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {currentItem.finalAssessment.title}
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Required Grade:</span>
                  <span className="text-sm font-extrabold text-purple-400">
                    {currentItem.finalAssessment.requiredPassingScorePct}%
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                This comprehensive assessment verifies your mastery of all concepts in the course. Achieve at least {currentItem.finalAssessment.requiredPassingScorePct}% to graduate and earn your Certificate of Completion.
              </p>

              <button
                type="button"
                onClick={() => {
                  if (unsubmittedEssaysInCourse.length > 0) {
                    alert(`Please complete all ${unsubmittedEssaysInCourse.length} unsubmitted essay activities in the course before attempting the Final Exam.`);
                    return;
                  }
                  if (currentItem.kind === 'final_assessment' && currentItem.finalAssessment) {
                    const queue = buildQuizQueue(currentItem.finalAssessment.assessmentQuestions, 0, timeline.length);
                    setFinalQuizQueue(queue);
                    setFinalQuizQueueIdx(0);
                    setFinalQueueAccum({ score: 0, maxScore: 0 });
                  }
                  setActiveAssessmentDetailedResults([]);
                  setFinalAssessmentCompletedState(null);
                  setIsTakingFinalAssessment(true);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-purple-500/25 transition-all cursor-pointer flex items-center justify-center gap-2.5"
              >
                <Award size={18} />
                <span>Start Final Capstone Assessment ➔</span>
              </button>
            </div>
          )
        ) : currentItem.kind === 'section' && currentItem.section ? (
          /* 5. SECTION CHECKPOINT ASSESSMENT */
          isTakingSectionAssessment ? (
            <div className="w-full my-auto flex flex-col items-center justify-center space-y-3">
              <div className={`w-full max-w-3xl flex items-center justify-between px-2 text-xs font-bold ${
                isDarkMode ? 'text-amber-400' : 'text-amber-700'
              }`}>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={15} />
                  <span>{currentItem.section.title} — Checkpoint Assessment</span>
                </span>
                <button
                  onClick={() => setIsTakingSectionAssessment(false)}
                  className={`font-semibold cursor-pointer underline ${
                    isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Back to Section Overview
                </button>
              </div>
              {sectionQuizQueue.length > 1 && (
                <div className="w-full max-w-3xl text-xs text-amber-400 text-center font-semibold">
                  Quiz {sectionQuizQueueIdx + 1} of {sectionQuizQueue.length}: {sectionQuizQueue[sectionQuizQueueIdx]?.name}
                </div>
              )}
              <div className="w-full max-w-3xl flex flex-col items-center justify-center">
                <InteractiveQuizPlayer
                  key={`sec_quiz_${sectionQuizQueueIdx}_${getCurrentSectionQuiz(currentItem.section).id}`}
                  quiz={getCurrentSectionQuiz(currentItem.section)}
                  onComplete={(res) => {
                    if (res.detailedResults) {
                      setActiveAssessmentDetailedResults(prev => [...prev, ...res.detailedResults]);
                    }
                    handleRealSectionAssessmentComplete(res);
                  }}
                  onRestartSection={handleRestartSection}
                  sectionTitle={currentItem.section.title}
                  onContinueNext={handleSectionContinue}
                  continueNextLabel={
                    sectionQuizQueueIdx + 1 < sectionQuizQueue.length
                      ? `Continue to Quiz ${sectionQuizQueueIdx + 2} of ${sectionQuizQueue.length} ➔`
                      : sectionAssessmentCompletedState?.passed
                        ? 'Section Checkpoint Passed! Continue to Next Module ➔'
                        : sectionAssessmentCompletedState
                          ? `Checkpoint Score: ${sectionAssessmentCompletedState.percentage}% (Req: ${currentItem.section.requiredPassingScorePct || 75}%) — View Results ➔`
                          : 'Continue ➔'
                  }
                />
              </div>
            </div>
          ) : (
            <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-amber-800 p-6 sm:p-8 shadow-xl space-y-6 my-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800 flex items-center justify-center text-amber-400">
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Section Milestone Checkpoint
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {currentItem.section.title}
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Pass Requirement:</span>
                  <span className="text-sm font-extrabold text-amber-400">
                    {currentItem.section.requiredPassingScorePct}%
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Trophy size={14} className="text-amber-400" />
                    <span>{currentItem.section.assessmentQuizTitle || 'Section Mastery Assessment'}</span>
                  </h4>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                    Required Pass: {currentItem.section.requiredPassingScorePct}%
                  </span>
                </div>
                {sectionResults[currentItem.section.id]?.passed && (
                  <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/80 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span>Section Checkpoint Passed</span>
                    </span>
                    <span className="text-emerald-400 font-extrabold">
                      {sectionResults[currentItem.section.id]?.score} / {sectionResults[currentItem.section.id]?.maxScore} pts
                    </span>
                  </div>
                )}
              </div>

              {sectionResults[currentItem.section.id]?.passed ? (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full sm:flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Continue to Next Module ➔</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const queue = buildQuizQueue(currentItem.section.assessmentQuestions, getSectionStartIndex(currentStepIndex), currentStepIndex);
                      setSectionQuizQueue(queue);
                      setSectionQuizQueueIdx(0);
                      setSectionQueueAccum({ score: 0, maxScore: 0 });
                      setActiveAssessmentDetailedResults([]);
                      setSectionAssessmentCompletedState(null);
                      setIsTakingSectionAssessment(true);
                    }}
                    className="w-full sm:w-auto py-3.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={13} />
                    <span>Retake</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const unsubmitted = getUnsubmittedEssaysInSection(currentStepIndex);
                    if (unsubmitted.length > 0) {
                      alert(`Please complete all ${unsubmitted.length} unsubmitted essay activities in this section first.`);
                      return;
                    }
                    if (currentItem.kind === 'section' && currentItem.section) {
                      const queue = buildQuizQueue(currentItem.section.assessmentQuestions, getSectionStartIndex(currentStepIndex), currentStepIndex);
                      setSectionQuizQueue(queue);
                      setSectionQuizQueueIdx(0);
                      setSectionQueueAccum({ score: 0, maxScore: 0 });
                    }
                    setActiveAssessmentDetailedResults([]);
                    setSectionAssessmentCompletedState(null);
                    setIsTakingSectionAssessment(true);
                  }}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 rounded-2xl text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={18} />
                  <span>Start Section Checkpoint Assessment ➔</span>
                </button>
              )}
            </div>
          )
        ) : currentItem.kind === 'quiz' && currentItem.quiz ? (
          /* 6. QUIZ / ESSAY ACTIVITY */
          currentItem.quiz.type === 'Essay' ? (
            (() => {
              const quiz = currentItem.quiz;
              const essayData = quiz.data?.essay || {};
              const minW = essayData.minWords ?? 25;
              const maxW = essayData.maxWords ?? 0;
              const currentDraft = essayDrafts[quiz.id] ?? '';
              const wordCount = currentDraft.trim() ? currentDraft.trim().split(/\s+/).length : 0;
              const isSub = !!submittedEssays[quiz.id]?.submitted;
              const meetsMin = minW === 0 ? currentDraft.trim().length > 0 : wordCount >= minW;
              const exceedsMax = maxW > 0 && wordCount > maxW;
              const canSub = currentDraft.trim().length > 0 && meetsMin && !exceedsMax;

              return (
                <div className="w-full max-w-3xl bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-7 shadow-xl space-y-4 my-auto overflow-y-auto max-h-full custom-scrollbar">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-950/60 text-blue-400 rounded-xl">
                        <FileText size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950 px-2 py-0.5 rounded">
                            Mandatory Essay Activity
                          </span>
                          <span className="text-[11px] text-amber-400 font-semibold">
                            Required for Section Completion
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                          {quiz.name || 'Essay Prompt'}
                        </h3>
                      </div>
                    </div>

                    <div>
                      {isSub ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-800">
                          <CheckCircle2 size={14} />
                          <span>Submitted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-950/60 text-amber-300 font-bold text-[11px] rounded-lg border border-amber-800">
                          <AlertCircle size={13} />
                          <span>Required</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                      Prompt
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-slate-200">
                      {quiz.prompt || 'Please write a thoughtful essay on the prompt above.'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Edit3 size={14} className="text-blue-400" />
                        <span>Your Response</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${!currentDraft.trim() ? 'text-slate-500' : wordCount < minW && minW > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {wordCount} words
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ({minW > 0 ? `Min: ${minW}` : 'Min: 1'} • {maxW > 0 ? `Max: ${maxW}` : 'Unlimited'})
                        </span>
                      </div>
                    </div>

                    <textarea
                      rows={6}
                      disabled={isSub}
                      value={currentDraft}
                      onChange={(e) => setEssayDrafts(prev => ({ ...prev, [quiz.id]: e.target.value }))}
                      placeholder="Write your essay response here..."
                      className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white leading-relaxed focus:ring-2 focus:ring-blue-500 outline-hidden font-normal"
                    />

                    {!isSub ? (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-slate-400">
                          {!currentDraft.trim()
                            ? 'Enter essay response to continue.'
                            : !meetsMin
                              ? `Write ${minW - wordCount} more words to meet minimum.`
                              : 'Requirement met!'}
                        </span>

                        <button
                          type="button"
                          disabled={!canSub}
                          onClick={() => handleEssaySubmit(quiz.id, minW, maxW)}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Submit Essay
                        </button>
                      </div>
                    ) : (
                      /* Post-submission reflection workspace for standalone player & learner */
                      <div className="space-y-4 pt-3 border-t border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Activity Completed Banner */}
                        <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                <span>Activity Complete (Ungraded Formative Reflection)</span>
                              </div>
                              <p className="text-[11px] text-slate-300">
                                Your response is recorded. Use the model guide & self-reflection checklist below to self-evaluate.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSubmittedEssays(prev => ({ ...prev, [quiz.id]: { text: currentDraft, submitted: false } }))}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0"
                          >
                            <RotateCcw size={13} />
                            <span>Revise</span>
                          </button>
                        </div>

                        {/* Benchmark Guide & Self-Reflection Checklist */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {essayData.referenceAnswer && (
                            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                              <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                <BookOpen size={14} />
                                <span>Benchmark Reference Guide</span>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed bg-indigo-950/30 border border-indigo-900/40 p-3 rounded-lg max-h-48 overflow-y-auto custom-scrollbar">
                                {essayData.referenceAnswer}
                              </p>
                            </div>
                          )}

                          {essayData.keyConcepts && essayData.keyConcepts.length > 0 && (
                            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold uppercase tracking-wider">
                                  <ListChecks size={14} />
                                  <span>Self-Reflection Checklist</span>
                                </div>
                              </div>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                {essayData.keyConcepts.map((concept: string, cIdx: number) => {
                                  const checkKey = `${quiz.id}_concept_${cIdx}`;
                                  const isChecked = !!(submittedEssays[quiz.id] as any)?.[`c_${cIdx}`];
                                  return (
                                    <div
                                      key={checkKey}
                                      onClick={() => {
                                        setSubmittedEssays(prev => ({
                                          ...prev,
                                          [quiz.id]: {
                                            ...prev[quiz.id],
                                            [`c_${cIdx}`]: !isChecked
                                          }
                                        }));
                                      }}
                                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                                        isChecked
                                          ? 'bg-blue-950/40 border-blue-800 text-white'
                                          : 'bg-slate-900/70 border-slate-800 text-slate-300'
                                      }`}
                                    >
                                      <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                                        isChecked
                                          ? 'bg-blue-600 border-blue-600 text-white'
                                          : 'border-slate-600 bg-slate-800'
                                      }`}>
                                        {isChecked && <Check size={12} strokeWidth={3} />}
                                      </div>
                                      <span className="text-xs leading-snug">{concept}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Continue Button after essay submission */}
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={handleNextStep}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                          >
                            <span>
                              {currentStepIndex === safeTimeline.length - 1
                                ? 'Finish Course & View Certificate ➔'
                                : 'Continue to Next Step ➔'}
                            </span>
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="w-full my-auto flex flex-col items-center justify-center">
              <InteractiveQuizPlayer
                key={`quiz_${currentItem.quiz.id}`}
                quiz={currentItem.quiz}
                onComplete={handleQuizActivityComplete}
                onRestartSection={handleRestartSection}
                sectionTitle={getSectionForStep(currentStepIndex)?.section.title}
                onContinueNext={handleNextStep}
                continueNextLabel={
                  currentStepIndex === safeTimeline.length - 1
                    ? "Finish Course & View Certificate ➔"
                    : "Continue to Next Step ➔"
                }
              />
            </div>
          )
        ) : currentItem.media ? (
          /* 7. MEDIA SLIDE / PHOTO / VIDEO STAGE (MAXIMIZED & AUTO-SCALED) */
          <div className="w-full h-full flex flex-col items-center justify-center min-h-0 overflow-hidden relative">
            <div className="w-full h-full flex items-center justify-center p-1 sm:p-2 overflow-hidden">
              {currentItem.media.type === 'video' ? (
                <video
                  key={currentItem.media.id}
                  src={currentItem.media.url || (currentItem.media.filePath ? convertFileSrc(currentItem.media.filePath) : '')}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[calc(100vh-140px)] max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl border border-slate-800"
                  onError={async (e) => {
                    if (currentItem.media?.filePath) {
                      try {
                        const dataUrl = await invoke<string>('load_media_data_url', { filePath: currentItem.media.filePath });
                        (e.target as HTMLVideoElement).src = dataUrl;
                      } catch {
                        (e.target as HTMLVideoElement).src = convertFileSrc(currentItem.media.filePath);
                      }
                    }
                  }}
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    key={currentItem.media.id}
                    src={currentItem.media.url || (currentItem.media.filePath ? convertFileSrc(currentItem.media.filePath) : '')}
                    alt={currentItem.media.name}
                    className="max-h-[calc(100vh-140px)] max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl border border-slate-800/80 select-none"
                    onError={async (e) => {
                      if (currentItem.media?.filePath) {
                        try {
                          const dataUrl = await invoke<string>('load_media_data_url', { filePath: currentItem.media.filePath });
                          (e.target as HTMLImageElement).src = dataUrl;
                        } catch {
                          (e.target as HTMLImageElement).src = convertFileSrc(currentItem.media.filePath);
                        }
                      }
                    }}
                  />
                  {/* Subtle Floating Media Pill Label */}
                  <div className="absolute bottom-2 left-4 px-3 py-1 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-lg text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 shadow-lg">
                    {currentItem.media.type === 'slide' && <Presentation size={13} className="text-blue-400" />}
                    {currentItem.media.type === 'photo' && <ImageIcon size={13} className="text-emerald-400" />}
                    <span>{currentItem.media.name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom Navigation Controls */}
      <div className={`flex items-center justify-between px-5 sm:px-6 py-3.5 border-t shrink-0 transition-colors ${
        isDarkMode ? 'border-slate-800/80 bg-slate-950' : 'border-slate-200 bg-white'
      }`}>
        <button
          onClick={handlePrevStep}
          disabled={currentStepIndex === 0 || isCourseCompleted}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-30 cursor-pointer transition-colors border ${
            isDarkMode 
              ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
          }`}
        >
          <ChevronLeft size={16} />
          <span>Previous Step</span>
        </button>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Step {currentStepIndex + 1} of {timeline.length}
          </span>
        </div>

        <button
          onClick={handleNextStep}
          disabled={
            isCourseCompleted ||
            isCurrentEssayPending ||
            isCurrentQuizExhausted ||
            isTakingSectionAssessment ||
            isTakingFinalAssessment ||
            (currentItem.kind === 'quiz' && currentItem.quiz?.type !== 'Essay' && !completedQuizScores[currentItem.quiz.id])
          }
          className={`flex items-center gap-1.5 px-5 py-2 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all ${
            isCourseCompleted ||
            isCurrentEssayPending ||
            isCurrentQuizExhausted ||
            isTakingSectionAssessment ||
            isTakingFinalAssessment ||
            (currentItem.kind === 'quiz' && currentItem.quiz?.type !== 'Essay' && !completedQuizScores[currentItem.quiz.id])
              ? 'bg-slate-700 cursor-not-allowed opacity-50'
              : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
          }`}
        >
          <span>
            {isCurrentEssayPending 
              ? 'Submit Essay to Continue' 
              : isCurrentQuizExhausted 
                ? 'Section Review Required' 
                : (currentItem.kind === 'quiz' && currentItem.quiz?.type !== 'Essay' && !completedQuizScores[currentItem.quiz.id])
                  ? 'Complete Quiz to Continue'
                  : (currentItem.kind === 'section' && !sectionResults[currentItem.section.id]?.passed && !isTakingSectionAssessment)
                    ? 'Start Checkpoint Assessment ➔'
                    : (currentItem.kind === 'section' && sectionResults[currentItem.section.id]?.passed)
                      ? 'Continue to Next Module ➔'
                      : (currentItem.kind === 'final_assessment' && !isTakingFinalAssessment)
                        ? 'Start Final Capstone Assessment ➔'
                        : currentStepIndex === safeTimeline.length - 1
                          ? 'Finish Course & View Certificate ➔'
                          : 'Next Step'}
          </span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Student Certificate Viewer Modal */}
      {isCertificateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-2xl flex items-center justify-between pb-3 text-white shrink-0">
            <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
              <Award className="text-amber-400" size={20} />
              <span>Official Verified Certificate of Completion</span>
            </h3>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                title="Print or Save as PDF"
              >
                <Printer size={14} />
                <span>Print / Save PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCertificateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Unified Shared Certificate Diploma */}
          <div className="w-full flex items-center justify-center overflow-x-auto py-2">
            <CertificateDiplomaView
              data={{
                schoolName: certConfig?.schoolName || 'Horizon Academy of Sciences & Technology',
                departmentName: certConfig?.departmentName || 'Department of Applied Engineering & Renewable Studies',
                recipientName: studentName || 'Student Name',
                completionStatement: certConfig?.completionStatement || 'has successfully completed all required multimedia coursework, laboratory simulations, and master-level quiz evaluations for the course of',
                courseName: certConfig?.courseName || courseTitle || 'Course Name',
                gradeLevel: certConfig?.gradeLevel !== undefined ? certConfig.gradeLevel : 'Grade 12 — Senior STEM Honors Track',
                showScore: certConfig?.showScore !== false,
                scoreEarned: totalPointsEarned,
                scoreTotal: totalPointsPossible,
                gradeRemark: distinctionRemark,
                issueDate: issueDateStr,
                certificateId: certId,
                teacherName: certConfig?.teacherName || 'Dr. Elena Rostova',
                teacherTitle: certConfig?.teacherTitle || 'Lead Course Instructor',
                includePrincipal: certConfig?.includePrincipal !== false,
                principalName: certConfig?.principalName || 'Prof. Marcus Vance, Ph.D.',
                principalTitle: certConfig?.principalTitle || 'School Principal & Academic Dean',
                schoolLogoUrl: certConfig?.schoolLogoUrl,
                teacherSignatureUrl: certConfig?.teacherSignatureUrl,
                principalSignatureUrl: certConfig?.principalSignatureUrl,
                selectedTemplateId: certConfig?.selectedTemplateId || 'tpl_1_classic_gold',
                paperFormat: certConfig?.paperFormat || 'a4',
              }}
              paperFormat={certConfig?.paperFormat || 'a4'}
              isPrintTarget={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
