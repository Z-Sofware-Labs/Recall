import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Menu, Sun, Moon } from 'lucide-react';
import Sidebar from './components/Sidebar';
import MediaOrganizer, { MediaItem } from './components/MediaOrganizer';
import CourseOrganizer, { TimelineItem } from './components/CourseOrganizer';
import Dashboard from './components/Dashboard';
import QuizBuilder from './components/QuizBuilder';
import CertificateBuilder from './components/CertificateBuilder';
import ExportSettings from './components/ExportSettings';
import SystemSettings from './components/SystemSettings';
import AboutDialog from './components/AboutDialog';
import UpdateModal from './components/common/UpdateModal';
import Help from './components/Help';
import { ProjectData, loadProjectFromPath, saveProject } from './services/projectService';
import { checkForAppUpdate, UpdateCheckResult } from './services/updateService';
import { QuizActivity } from './types/quiz';

const initialSampleMedia: MediaItem[] = [];

const initialSampleQuizzes: QuizActivity[] = [];

const initialProject: ProjectData = {
  id: `proj_${Date.now()}`,
  title: 'Untitled Course Project',
  description: '',
  createdAt: Date.now(),
  lastModified: Date.now(),
  mediaItems: [],
};

const initialSampleTimeline: TimelineItem[] = [];

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(initialSampleMedia);
  const [quizActivities, setQuizActivities] = useState<QuizActivity[]>(initialSampleQuizzes);
  const [timeline, setTimeline] = useState<TimelineItem[]>(initialSampleTimeline);
  const [editingQuiz, setEditingQuiz] = useState<QuizActivity | null>(null);
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);

  // Update Engine State
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      const result = await checkForAppUpdate();
      setUpdateInfo(result);
      setIsUpdateModalOpen(true);
    } catch (err: any) {
      console.warn('Check update error:', err);
      setUpdateInfo({
        available: false,
        error: err?.message || 'Failed to check for updates',
      });
      setIsUpdateModalOpen(true);
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleStartNewProject = () => {
    const newProject: ProjectData = {
      id: `proj_${Date.now()}`,
      title: 'New Interactive Lesson Module',
      description: '',
      createdAt: Date.now(),
      lastModified: Date.now(),
      mediaItems: [],
    };
    setCurrentProject(newProject);
    setMediaItems([]);
    setQuizActivities([]);
    setTimeline([]);
    setEditingQuiz(null);
  };

  // Guard active tab if project is closed
  useEffect(() => {
    const projectRequiredTabs = ['Media Organizer', 'Quiz Builder', 'Certificate Builder', 'Course Editor', 'Course Organizer'];
    if (!currentProject && projectRequiredTabs.includes(activeTab)) {
      setActiveTab('Dashboard');
    }
  }, [currentProject, activeTab]);

  // Check if Recall was launched with a .recall project file (e.g. double-clicked in File Explorer)
  useEffect(() => {
    async function checkStartupFile() {
      try {
        const startupPath = await invoke<string | null>('get_cli_startup_file');
        if (startupPath) {
          const loaded = await loadProjectFromPath(startupPath);
          if (loaded) {
            setCurrentProject(loaded);
            if (loaded.mediaItems) setMediaItems(loaded.mediaItems);
            if (loaded.quizActivities) setQuizActivities(loaded.quizActivities);
            if (loaded.timeline) setTimeline(loaded.timeline);
            setActiveTab('Course Editor');
          }
        }
      } catch (e) {
        console.warn('Failed to inspect startup file:', e);
      }
    }
    checkStartupFile();
  }, []);

  // Sync dark class on root document and persist
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Show window only when the React App has mounted and loaded the theme
  useEffect(() => {
    const showWindow = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        await win.show();
      } catch (e) {
        console.warn('Tauri window API not available (not running under Tauri):', e);
      }
    };
    showWindow();
  }, []);

  // Listen to OS / device theme preference changes (if user hasn't explicitly saved a preference)
  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('theme');
      if (!saved) {
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // Global contextmenu safeguard for WebView2 in desktop environment to prevent native menu freezes
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      );
      if (!isInput) {
        // Prevent default native context menu which causes WebView2 UI freezes
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => window.removeEventListener('contextmenu', handleGlobalContextMenu);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('theme', next ? 'dark' : 'light');
      } catch {}
      return next;
    });
  };

  const handleSaveQuiz = async (savedQuiz: QuizActivity) => {
    let updatedQuizzes: QuizActivity[] = [];
    setQuizActivities(prev => {
      const idx = prev.findIndex(q => q.id === savedQuiz.id);
      if (idx >= 0) {
        updatedQuizzes = [...prev];
        updatedQuizzes[idx] = savedQuiz;
      } else {
        updatedQuizzes = [...prev, savedQuiz];
      }
      return updatedQuizzes;
    });

    if (currentProject) {
      const projToSave: ProjectData = {
        ...currentProject,
        mediaItems,
        quizActivities: updatedQuizzes.length > 0 ? updatedQuizzes : [...quizActivities, savedQuiz],
        timeline,
        lastModified: Date.now(),
      };

      try {
        const result = await saveProject(projToSave, false);
        if (result && result.success && result.filePath) {
          setCurrentProject({
            ...projToSave,
            filePath: result.filePath
          });
          return;
        }
      } catch (e) {
        console.error('Failed to auto-save project:', e);
      }

      setCurrentProject(projToSave);
    }
  };

  const handleOpenQuizEditor = (quiz: QuizActivity) => {
    setEditingQuiz(quiz);
    setActiveTab('Quiz Builder');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <Dashboard 
            currentProject={currentProject} 
            setCurrentProject={setCurrentProject}
            mediaItems={mediaItems}
            setMediaItems={setMediaItems}
            quizActivities={quizActivities}
            setQuizActivities={setQuizActivities}
            timeline={timeline}
            setTimeline={setTimeline}
            onStartNewProject={handleStartNewProject}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        );
      case 'Media Organizer':
        return <MediaOrganizer mediaItems={mediaItems} setMediaItems={setMediaItems} />;
      case 'Course Editor':
      case 'Course Organizer':
        return (
          <CourseOrganizer 
            mediaItems={mediaItems} 
            setMediaItems={setMediaItems}
            quizActivities={quizActivities}
            setQuizActivities={setQuizActivities}
            timeline={timeline}
            setTimeline={setTimeline}
            onOpenQuizEditor={handleOpenQuizEditor}
            courseTitle={currentProject?.title}
            courseId={currentProject?.id}
            currentProject={currentProject}
            setCurrentProject={setCurrentProject}
            onNavigateToMedia={() => setActiveTab('Media Organizer')} 
            onNavigateToExport={() => setActiveTab('Export Settings')}
          />
        );
      case 'Quiz Builder':
        return (
          <QuizBuilder 
            editingQuiz={editingQuiz}
            onSaveQuiz={handleSaveQuiz}
            onClearEditingQuiz={() => setEditingQuiz(null)}
            onNavigateToCourse={() => setActiveTab('Course Editor')}
          />
        );
      case 'Certificate Builder':
        return (
          <CertificateBuilder 
            currentProject={currentProject} 
            onUpdateProject={setCurrentProject} 
          />
        );
      case 'Export Settings':
        return (
          <ExportSettings 
            currentProject={currentProject} 
            mediaItems={mediaItems} 
            quizActivities={quizActivities} 
            timeline={timeline} 
            isDarkMode={isDarkMode}
          />
        );
      case 'System Settings':
        return (
          <SystemSettings 
            isDarkMode={isDarkMode} 
            toggleTheme={toggleTheme} 
            onCheckForUpdates={handleCheckForUpdates}
            isCheckingUpdates={isCheckingUpdates}
          />
        );
      case 'Help':
        return <Help />;
      default:
        return (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center text-slate-500 dark:text-slate-400">
            <p>This is the {activeTab} view.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-white dark:bg-slate-950 transition-colors duration-300 overflow-hidden pb-2.5 sm:pb-3">
      {/* Mobile Top Navigation Header */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight leading-tight">Recall</span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{activeTab}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Sidebar (Desktop persistent, Mobile sliding drawer) */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        onOpenAbout={() => setIsAboutOpen(true)}
        hasActiveProject={!!currentProject}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main View Area */}
      <main className="flex-1 h-full p-3 sm:p-4 lg:p-6 overflow-y-auto flex flex-col min-w-0">
        <div className="flex-1 h-full flex flex-col min-h-0">
          {renderContent()}
        </div>
      </main>

      <AboutDialog 
        isOpen={isAboutOpen} 
        onClose={() => setIsAboutOpen(false)} 
        onCheckForUpdates={handleCheckForUpdates}
      />

      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        updateInfo={updateInfo}
        onCheckAgain={handleCheckForUpdates}
      />
    </div>
  );
}

