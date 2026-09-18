import { useState, useEffect } from 'react';
import { 
  Download, FileCode, CheckCircle2, 
  Globe, FolderArchive, Play, AlertCircle, 
  Award, Layers, Check, ExternalLink, HelpCircle
} from 'lucide-react';
import { ProjectData } from '../services/projectService';
import { MediaItem } from './MediaOrganizer';
import { QuizActivity } from '../types/quiz';
import { TimelineItem } from './CourseOrganizer';
import { exportCourseToSingleHtml, exportCourseToWebZip, openExportedFile } from '../services/exportService';

interface ExportSettingsProps {
  currentProject?: ProjectData | null;
  mediaItems?: MediaItem[];
  quizActivities?: QuizActivity[];
  timeline?: TimelineItem[];
  isDarkMode?: boolean;
}

export default function ExportSettings({
  currentProject,
  mediaItems = [],
  quizActivities = [],
  timeline = [],
  isDarkMode = true,
}: ExportSettingsProps) {
  const [exportType, setExportType] = useState<'single-html' | 'zip-package'>('single-html');
  const [playerTheme, setPlayerTheme] = useState<'dark' | 'light' | 'auto'>('auto');
  const [includeCertificate, setIncludeCertificate] = useState(true);
  const [allowFreeNavigation, setAllowFreeNavigation] = useState(true);
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ success: boolean; filePath: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Construct complete project snapshot for export
  const compiledProject: ProjectData = {
    id: currentProject?.id || `proj_${Date.now()}`,
    title: currentProject?.title || 'Interactive Course Project',
    description: currentProject?.description || '',
    createdAt: currentProject?.createdAt || Date.now(),
    lastModified: Date.now(),
    mediaItems: mediaItems || [],
    quizActivities: quizActivities || [],
    timeline: timeline || [],
    certificate: currentProject?.certificate || (() => {
      try {
        const saved = localStorage.getItem(`recall_certificate_${currentProject?.id || 'default'}`);
        if (saved) return JSON.parse(saved);
      } catch {}
      return undefined;
    })(),
  };

  const totalSteps = timeline.length || mediaItems.length;
  
  // Accurately count total quizzes:
  // - Standalone quiz steps in timeline (kind === 'quiz')
  // - Quizzes attached inside sections (item.section.assessmentQuestions)
  // - Quizzes attached inside final milestones (item.finalAssessment.assessmentQuestions)
  // Falls back to total quizActivities count if timeline has no quiz items
  const totalTimelineQuizzes = timeline.reduce((acc, item) => {
    if (item.kind === 'quiz') {
      return acc + 1;
    }
    if (item.kind === 'section' && item.section?.assessmentQuestions) {
      return acc + item.section.assessmentQuestions.length;
    }
    if (item.kind === 'final_assessment' && item.finalAssessment?.assessmentQuestions) {
      return acc + item.finalAssessment.assessmentQuestions.length;
    }
    return acc;
  }, 0);

  const quizSteps = timeline.length > 0 ? totalTimelineQuizzes : quizActivities.length;

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setExportResult(null);

    try {
      if (exportType === 'single-html') {
        const res = await exportCourseToSingleHtml(compiledProject, {
          theme: playerTheme,
          showCertificate: includeCertificate,
          allowFreeNavigation,
        });
        if (res) {
          setExportResult(res);
        }
      } else {
        const res = await exportCourseToWebZip(compiledProject, {
          theme: playerTheme,
          showCertificate: includeCertificate,
          allowFreeNavigation,
        });
        if (res) {
          setExportResult(res);
        }
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      setErrorMessage(err?.message || 'Export failed. Please check file permissions and try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenExported = async () => {
    if (exportResult?.filePath) {
      await openExportedFile(exportResult.filePath);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-8">
      {/* Format Selection: Self-Contained HTML vs Zip Package */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Self-Contained Single-File HTML */}
          <button 
            type="button"
            onClick={() => setExportType('single-html')}
            className={`p-6 rounded-3xl border flex flex-col items-start gap-4 transition-all cursor-pointer text-left relative overflow-hidden ${
              exportType === 'single-html' 
                ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 shadow-xl ring-2 ring-blue-500/30' 
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`p-3.5 rounded-2xl ${exportType === 'single-html' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                <Globe size={26} />
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Recommended • All-In-One
              </span>
            </div>

            <div>
              <span className="font-bold text-slate-900 dark:text-white text-base block">
                Self-Contained Single File (.html)
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                All lesson media, interactive quizzes, and offline QR certificates bundled into one single standalone file. Double-click to open in any web browser on Windows, macOS, Android, iOS, or Linux without internet access.
              </p>
            </div>

            <div className="mt-auto pt-2 flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span>Easy to share via USB drive, email, or cloud folder</span>
            </div>
          </button>

          {/* Option 2: Web Package Archive (.zip) */}
          <button 
            type="button"
            onClick={() => setExportType('zip-package')}
            className={`p-6 rounded-3xl border flex flex-col items-start gap-4 transition-all cursor-pointer text-left relative overflow-hidden ${
              exportType === 'zip-package' 
                ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 shadow-xl ring-2 ring-blue-500/30' 
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`p-3.5 rounded-2xl ${exportType === 'zip-package' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                <FolderArchive size={26} />
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                Server Deployment • Archive
              </span>
            </div>

            <div>
              <span className="font-bold text-slate-900 dark:text-white text-base block">
                Web Package Archive (.zip)
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Contains <code className="text-blue-500 font-mono">index.html</code>, structured course manifest JSON, and deployment guide. Ready to upload directly to school intranets, Apache/Nginx web servers, or cloud static hosting.
              </p>
            </div>

            <div className="mt-auto pt-2 flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <CheckCircle2 size={14} className="text-purple-500" />
              <span>Ready for web server extraction or LMS intranet hosting</span>
            </div>
          </button>
        </div>

      {/* Project Summary & Player Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Course Summary Card */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <Layers size={14} className="text-blue-600" />
            <span>Course Metadata</span>
          </h3>

          <div className="space-y-3">
            <div>
              <div className="text-[11px] text-slate-400">Course Title</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {compiledProject.title || 'Untitled Project'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400">Total Steps</div>
                <div className="text-base font-black text-blue-600 dark:text-blue-400">{totalSteps}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400">Quizzes</div>
                <div className="text-base font-black text-amber-500">{quizSteps}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-300 flex items-center gap-2">
              <Award size={16} className="text-amber-500 shrink-0" />
              <span>Offline QR Certificate Included</span>
            </div>
          </div>
        </div>

        {/* Player Options Card */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            Player & Experience Options
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Default Theme Mode</div>
                <div className="text-xs text-slate-500">Theme applied when learner first launches the course.</div>
              </div>
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPlayerTheme('auto')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${playerTheme === 'auto' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                >
                  Device Default
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerTheme('dark')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${playerTheme === 'dark' ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-sm' : 'text-slate-500'}`}
                >
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerTheme('light')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${playerTheme === 'light' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                >
                  Light
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Official Certificate of Completion</div>
                <div className="text-xs text-slate-500">Includes verifiable offline QR code and Print-to-PDF award screen.</div>
              </div>
              <input
                type="checkbox"
                checked={includeCertificate}
                onChange={(e) => setIncludeCertificate(e.target.checked)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Free Stepper Navigation</div>
                <div className="text-xs text-slate-500">Allow learners to freely navigate between unlocked modules.</div>
              </div>
              <input
                type="checkbox"
                checked={allowFreeNavigation}
                onChange={(e) => setAllowFreeNavigation(e.target.checked)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Export Result Success Banner */}
      {exportResult && (
        <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
              ✓
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-emerald-700 dark:text-emerald-300">Course Exported Successfully!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-md sm:max-w-lg mt-0.5">
                {exportResult.filePath}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenExported}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer shrink-0"
          >
            <Play size={14} />
            <span>Open & Test in Browser</span>
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start gap-2.5 whitespace-pre-line">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* Primary Export Action Button */}
      {totalSteps > 0 && currentProject ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500">
            Ready to package <strong className="text-slate-800 dark:text-slate-200">{totalSteps} modules</strong> into {exportType === 'single-html' ? 'a standalone offline HTML webpage' : 'a distributable web package ZIP archive'}.
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 active:scale-98 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all cursor-pointer"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Packaging Course Engine...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Export {exportType === 'single-html' ? 'Single-File Webpage (.html)' : 'Web Package (.zip)'}</span>
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
