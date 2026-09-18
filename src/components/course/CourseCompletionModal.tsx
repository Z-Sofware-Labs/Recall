import { useState } from 'react';
import ModalWindow from '../common/ModalWindow';
import { 
  Trophy, Award, CheckCircle2, XCircle, RotateCcw, ArrowRight, 
  Sparkles, BookOpen, AlertTriangle, ShieldCheck, Download, 
  Check, Calendar, Star, HelpCircle, Layers, Flame, Printer, X
} from 'lucide-react';
import { CourseScoreTally, QuizScoreRecord } from '../../services/scoreService';
import CertificateDiplomaView from '../certificate/CertificateDiplomaView';

interface CourseCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  courseId: string;
  scoreTally: CourseScoreTally;
  onRetakeCourse?: () => void;
  onReviewActivities?: () => void;
}

export default function CourseCompletionModal({
  isOpen,
  onClose,
  courseTitle,
  scoreTally,
  onRetakeCourse,
  onReviewActivities,
}: CourseCompletionModalProps) {
  const [passingThreshold, setPassingThreshold] = useState<number>(scoreTally.passingScoreThreshold || 70);
  const [studentName, setStudentName] = useState('Alexandria J. Mercer');
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);

  const totalEarned = scoreTally.totalEarned;
  const totalPossible = scoreTally.totalPossible;
  const overallPercentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
  const isPassed = overallPercentage >= passingThreshold;

  const certId = `REC-${new Date().getFullYear()}-${Math.abs((courseTitle || 'Course').length * 37 + (studentName || 'Student').length * 91).toString(16).toUpperCase().padStart(6, '0')}-CERT`;
  const issueDateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const distinctionRemark = overallPercentage >= 95 ? 'Passed with High Distinction' : overallPercentage >= 90 ? 'Passed with Distinction' : overallPercentage >= 80 ? 'Passed with Honors' : 'Successfully Completed';

  // Grade classification
  const getGradeRating = (pct: number) => {
    if (pct >= 90) return { label: 'High Distinction / Mastery', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800' };
    if (pct >= 80) return { label: 'Honors / Proficient', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' };
    if (pct >= 70) return { label: 'Passed / Satisfactory', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800' };
    return { label: 'Needs Improvement / Retake Required', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800' };
  };

  const rating = getGradeRating(overallPercentage);

  return (
    <>
      <ModalWindow
        isOpen={isOpen}
        onClose={onClose}
      title="Course Completion & Activity Grade Tally"
      maxWidth="max-w-3xl"
    >
      <div className="p-6 space-y-6">
        {/* Top Celebration Banner */}
        <div className={`relative overflow-hidden rounded-2xl p-6 border text-center space-y-3 ${
          isPassed 
            ? 'bg-gradient-to-b from-amber-500/10 via-emerald-500/5 to-transparent border-amber-200/80 dark:border-amber-900/60'
            : 'bg-gradient-to-b from-rose-500/10 via-slate-500/5 to-transparent border-rose-200/80 dark:border-rose-900/60'
        }`}>
          <div className="inline-flex items-center justify-center p-3.5 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700">
            {isPassed ? (
              <Trophy size={40} className="text-amber-500 animate-bounce" />
            ) : (
              <AlertTriangle size={40} className="text-rose-500" />
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {isPassed ? 'Course Successfully Completed!' : 'Course Assessment Completed'}
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {courseTitle || 'Interactive Lesson Module'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
              {isPassed 
                ? 'Congratulations! You have completed all course media and interactive formative checkpoints with a passing grade.'
                : 'You have completed the module activities. Your overall score is currently below the passing requirement.'}
            </p>
          </div>

          {/* Large Score Metric Card */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <div className="px-6 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Final Score Tally</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                {totalEarned} <span className="text-base font-semibold text-slate-400">/ {totalPossible} pts</span>
              </div>
            </div>

            <div className="px-6 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overall Grade</span>
              <div className={`text-3xl font-black ${isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} mt-0.5`}>
                {overallPercentage}%
              </div>
            </div>

            <div className="px-5 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
              <div className={`text-sm font-bold mt-1.5 flex items-center gap-1.5 ${rating.color}`}>
                {isPassed ? <ShieldCheck size={16} /> : <XCircle size={16} />}
                <span>{rating.label}</span>
              </div>
            </div>
          </div>

          {/* Certificate Claim Card */}
          <div className="mt-4 p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-950/40 rounded-2xl border-2 border-amber-400 dark:border-amber-600/80 shadow-md space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl shadow-xs shrink-0">
                <Award size={22} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Official Certificate of Completion
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Enter your full name to generate and preview your verifiable certificate.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-1">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Full Name on Certificate:
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Alexandria J. Mercer"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-700/80 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-hidden shadow-xs"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setIsCertificateModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black rounded-xl text-xs shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Award size={16} />
                  <span>View My Certificate</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Quiz Activity Breakdown Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Layers size={16} className="text-blue-500" />
              <span>Activity & Quiz Score Breakdown ({scoreTally.records.length})</span>
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Passing criteria: ≥{passingThreshold}%
            </span>
          </div>

          {scoreTally.records.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
              No interactive quiz scores recorded yet for this course.
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-4">Activity Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-center">Score</th>
                    <th className="py-2.5 px-3 text-center">Mistakes</th>
                    <th className="py-2.5 px-3 text-center">Attempts</th>
                    <th className="py-2.5 px-4 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {scoreTally.records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {r.quizTitle}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-md text-[10px] font-bold uppercase tracking-wider">
                          {r.quizType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                        {r.score} / {r.maxScore} pts ({r.percentage}%)
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500">
                        {r.mistakeCount > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">-{r.mistakeCount}</span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500">
                        {r.attempts || 1}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.passed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 size={13} /> Passed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                            <XCircle size={13} /> Needs Review
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Teacher Evaluation Policy Preview Note */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <Sparkles size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Teacher Policy & Course Governance:</span>
            <p className="mt-0.5">
              Course passing threshold is set to {passingThreshold}%. When enabled in Course Settings, learners scoring below the passing criteria are prompted to repeat required checkpoints before certificate issuance.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {onReviewActivities && (
              <button
                onClick={onReviewActivities}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Review Activity Answers
              </button>
            )}
            {onRetakeCourse && (
              <button
                onClick={onRetakeCourse}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Retake Assessment</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <span>Finish Course Review</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </ModalWindow>

    {/* Student Certificate Viewer Modal */}
    {isCertificateModalOpen && (
      <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in overflow-y-auto">
        <div className="w-full max-w-xl flex items-center justify-between pb-3 text-white shrink-0">
          <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
            <Award className="text-amber-400" size={20} />
            <span>Official Certificate of Completion</span>
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
              schoolName: 'Horizon Academy of Sciences & Technology',
              departmentName: 'Department of Academic Excellence & Certification',
              recipientName: studentName || 'Student Name',
              completionStatement: 'has successfully completed all required multimedia modules, interactive activities, and comprehensive evaluations for the course of',
              courseName: courseTitle || 'Course of Study',
              gradeLevel: 'Grade 12 — Senior STEM Honors Track',
              showScore: true,
              scoreEarned: totalEarned,
              scoreTotal: totalPossible,
              gradeRemark: distinctionRemark,
              issueDate: issueDateStr,
              certificateId: certId,
              teacherName: 'Dr. Elena Rostova',
              teacherTitle: 'Lead Course Instructor',
              includePrincipal: true,
              principalName: 'Prof. Marcus Vance, Ph.D.',
              principalTitle: 'School Principal & Academic Dean',
              selectedTemplateId: 'tpl_1_classic_gold',
              paperFormat: 'a4',
            }}
            paperFormat="a4"
            isPrintTarget={true}
          />
        </div>
      </div>
    )}
    </>
  );
}
