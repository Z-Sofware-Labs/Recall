import { useState, useEffect } from 'react';
import { 
  FolderOpen, Clock, FileUp, Save, CheckCircle2, AlertCircle, 
  Loader2, PlusCircle, FileText, HardDrive, Sparkles, FolderDown,
  Edit3, Check, X, XCircle, Trash2
} from 'lucide-react';
import { 
  ProjectData, 
  RecentProjectEntry, 
  getStoredRecentProjects, 
  clearStoredRecentProjects,
  removeStoredRecentProject,
  browseAndOpenProject, 
  loadProjectFromPath, 
  saveProject 
} from '../services/projectService';
import { MediaItem } from './MediaOrganizer';
import { QuizActivity } from '../types/quiz';
import { TimelineItem } from './CourseOrganizer';
import ConfirmDialog from './common/ConfirmDialog';

interface DashboardProps {
  currentProject: ProjectData | null;
  setCurrentProject: (project: ProjectData | null) => void;
  mediaItems: MediaItem[];
  setMediaItems: (items: MediaItem[]) => void;
  quizActivities?: QuizActivity[];
  setQuizActivities?: (quizzes: QuizActivity[]) => void;
  timeline?: TimelineItem[];
  setTimeline?: (timeline: TimelineItem[]) => void;
  onStartNewProject?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export default function Dashboard({
  currentProject,
  setCurrentProject,
  mediaItems,
  setMediaItems,
  quizActivities = [],
  setQuizActivities,
  timeline = [],
  setTimeline,
  onStartNewProject,
  onNavigateToTab,
}: DashboardProps) {
  const [recentProjects, setRecentProjects] = useState<RecentProjectEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isConfirmNewOpen, setIsConfirmNewOpen] = useState(false);
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  const [isConfirmClearRecentOpen, setIsConfirmClearRecentOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  useEffect(() => {
    setRecentProjects(getStoredRecentProjects());
  }, []);

  const handleClearRecentProjects = () => {
    clearStoredRecentProjects();
    setRecentProjects([]);
    showStatus('success', 'Recently opened projects history cleared.');
  };

  const handleRemoveSingleRecent = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    const updated = removeStoredRecentProject(id);
    setRecentProjects(updated);
    showStatus('success', `Removed "${title}" from recent history.`);
  };

  useEffect(() => {
    if (currentProject) {
      setEditedTitle(currentProject.title || '');
    }
  }, [currentProject]);

  const handleSaveEditedTitle = () => {
    if (!currentProject) return;
    const trimmed = editedTitle.trim();
    if (!trimmed) {
      setEditedTitle(currentProject.title || 'Untitled Project');
      setIsEditingTitle(false);
      return;
    }
    const updated: ProjectData = {
      ...currentProject,
      title: trimmed,
      lastModified: Date.now(),
    };
    setCurrentProject(updated);
    setIsEditingTitle(false);
    showStatus('success', `Renamed project to "${trimmed}".`);
  };

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // Open native file dialog to browse local project
  const handleBrowseProject = async () => {
    setStatusMessage(null);
    setIsLoading(true);
    try {
      const project = await browseAndOpenProject();
      if (project) {
        setCurrentProject(project);
        if (project.mediaItems && Array.isArray(project.mediaItems)) {
          setMediaItems(project.mediaItems);
        }
        if (project.quizActivities && Array.isArray(project.quizActivities) && setQuizActivities) {
          setQuizActivities(project.quizActivities);
        }
        if (project.timeline && Array.isArray(project.timeline) && setTimeline) {
          setTimeline(project.timeline);
        }
        setRecentProjects(getStoredRecentProjects());
        showStatus('success', `Opened project "${project.title || 'Untitled'}" successfully.`);
        // Directly navigate user to Course Organizer
        if (onNavigateToTab) {
          onNavigateToTab('Course Editor');
        }
      }
    } catch (err: any) {
      console.error('Error opening project:', err);
      showStatus('error', err?.message || 'Failed to open project file.');
    } finally {
      setIsLoading(false);
    }
  };

  // Open a specific recent project
  const handleOpenRecent = async (entry: RecentProjectEntry) => {
    if (!entry.filePath) {
      const fallbackProj: ProjectData = {
        id: entry.id,
        title: entry.title,
        createdAt: entry.timestamp,
        lastModified: Date.now(),
        mediaItems: mediaItems,
        quizActivities: quizActivities,
        timeline: timeline,
      };
      setCurrentProject(fallbackProj);
      showStatus('success', `Loaded "${entry.title}".`);
      if (onNavigateToTab) {
        onNavigateToTab('Course Editor');
      }
      return;
    }

    setIsLoading(true);
    try {
      const project = await loadProjectFromPath(entry.filePath);
      setCurrentProject(project);
      if (project.mediaItems && Array.isArray(project.mediaItems)) {
        setMediaItems(project.mediaItems);
      }
      if (project.quizActivities && Array.isArray(project.quizActivities) && setQuizActivities) {
        setQuizActivities(project.quizActivities);
      }
      if (project.timeline && Array.isArray(project.timeline) && setTimeline) {
        setTimeline(project.timeline);
      }
      setRecentProjects(getStoredRecentProjects());
      showStatus('success', `Loaded "${project.title}".`);
      // Directly navigate user to Course Organizer
      if (onNavigateToTab) {
        onNavigateToTab('Course Editor');
      }
    } catch (err: any) {
      console.error('Error loading recent project:', err);
      showStatus('error', `Could not load project: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Save active project (or create a file if unsaved)
  const handleSaveProject = async (forceSaveAs = false) => {
    if (!currentProject) {
      const newProj: ProjectData = {
        id: `proj_${Date.now()}`,
        title: 'New Recall Project',
        createdAt: Date.now(),
        lastModified: Date.now(),
        mediaItems: mediaItems,
        quizActivities: quizActivities,
        timeline: timeline,
      };
      return performSave(newProj, true);
    }

    const updatedProject: ProjectData = {
      ...currentProject,
      mediaItems: mediaItems,
      quizActivities: quizActivities,
      timeline: timeline,
      lastModified: Date.now(),
    };

    return performSave(updatedProject, forceSaveAs);
  };

  const performSave = async (project: ProjectData, forceSaveAs: boolean) => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const result = await saveProject(project, forceSaveAs);
      if (result && result.success) {
        const savedProject = {
          ...project,
          filePath: result.filePath,
          lastModified: Date.now(),
        };
        setCurrentProject(savedProject);
        setRecentProjects(getStoredRecentProjects());
        showStatus('success', `Project saved to ${result.filePath}`);
      }
    } catch (err: any) {
      console.error('Failed to save project:', err);
      showStatus('error', `Failed to save: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Start new project flow with confirmation check
  const handleStartNewProjectClick = () => {
    if (mediaItems.length > 0 || (currentProject && currentProject.mediaItems.length > 0)) {
      setIsConfirmNewOpen(true);
    } else {
      executeStartNewProject();
    }
  };

  const executeStartNewProject = () => {
    const newProject: ProjectData = {
      id: `proj_${Date.now()}`,
      title: 'New Interactive Lesson Module',
      description: 'Teacher Authoring Workspace: Import presentation slides, organize instructional media, configure categorization & quiz checkpoints, and build student completion certificates.',
      createdAt: Date.now(),
      lastModified: Date.now(),
      mediaItems: [],
    };
    setCurrentProject(newProject);
    setMediaItems([]);
    if (onStartNewProject) {
      onStartNewProject();
    }
    if (onNavigateToTab) {
      onNavigateToTab('Media Organizer');
    }
  };

  // Close active project flow
  const handleCloseProjectClick = () => {
    if (!currentProject) return;
    if (mediaItems.length > 0 || !currentProject.filePath) {
      setIsConfirmCloseOpen(true);
    } else {
      executeCloseProject();
    }
  };

  const executeCloseProject = () => {
    setCurrentProject(null);
    setMediaItems([]);
    if (setQuizActivities) {
      setQuizActivities([]);
    }
    if (setTimeline) {
      setTimeline([]);
    }
    showStatus('success', 'Project closed.');
  };

  return (
    <div className="space-y-8 w-full">
      {/* Toast / Status Notification */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all animate-in fade-in slide-in-from-top-2 ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* Active Project Card (When a project is open) with Right-Aligned Dynamic Action Buttons */}
      {currentProject && (
        <section className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 rounded-2xl border border-blue-200 dark:border-blue-800/60 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 w-full">
            {/* Project Details (Left) */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-blue-600 text-white rounded-full">
                  Active Project
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {mediaItems.length} media assets loaded
                </span>
              </div>
              {isEditingTitle ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEditedTitle();
                      if (e.key === 'Escape') {
                        setEditedTitle(currentProject.title || '');
                        setIsEditingTitle(false);
                      }
                    }}
                    autoFocus
                    placeholder="Enter project name..."
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-xs max-w-md w-full"
                  />
                  <button
                    type="button"
                    onClick={handleSaveEditedTitle}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer shadow-xs transition-colors"
                    title="Save Name"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditedTitle(currentProject.title || '');
                      setIsEditingTitle(false);
                    }}
                    className="p-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer shadow-xs transition-colors"
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/title">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                    <FileText className="text-blue-600 dark:text-blue-400 shrink-0" size={22} />
                    <span className="truncate">{currentProject.title || 'Untitled Project'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setEditedTitle(currentProject.title || '');
                      setIsEditingTitle(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer"
                    title="Edit project name"
                  >
                    <Edit3 size={15} />
                  </button>
                </div>
              )}
              {currentProject.filePath ? (
                <p className="text-xs text-slate-600 dark:text-slate-400 font-mono break-all flex items-center gap-1.5 pt-0.5">
                  <HardDrive size={14} className="text-slate-400 shrink-0" />
                  <span>{currentProject.filePath}</span>
                </p>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  • Unsaved project file (click Save Project to write to disk)
                </p>
              )}
            </div>

            {/* Action Buttons: Right-Aligned & Dynamically Responsive based on width */}
            <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2.5 sm:gap-3 shrink-0 ml-auto lg:ml-0 w-full lg:w-auto">
              <button
                onClick={() => handleSaveProject(false)}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all cursor-pointer grow sm:grow-0 whitespace-nowrap"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Save Project</span>
              </button>

              <button
                onClick={() => handleSaveProject(true)}
                disabled={isSaving}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs sm:text-sm transition-all cursor-pointer shadow-xs hover:shadow-md grow sm:grow-0 whitespace-nowrap"
              >
                <FolderDown size={15} />
                <span>Save As...</span>
              </button>

              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('Course Editor')}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs sm:text-sm transition-all cursor-pointer grow sm:grow-0 whitespace-nowrap"
                >
                  <Sparkles size={15} />
                  <span>Open in Editor</span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Load & Manage Projects */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Project Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Browse Local Projects */}
          <button
            onClick={handleBrowseProject}
            disabled={isLoading}
            className="flex items-start gap-4 p-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl shadow-xs text-left transition-all group cursor-pointer"
          >
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-105 transition-transform">
              {isLoading ? <Loader2 size={24} className="animate-spin" /> : <FileUp size={24} />}
            </div>
            <div>
              <span className="block font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Browse Local Projects
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Open an existing <span className="font-mono text-blue-600 dark:text-blue-400">.recall</span> or <span className="font-mono text-blue-600 dark:text-blue-400">.json</span> project from your disk.
              </p>
            </div>
          </button>

          {/* Create New Project */}
          <button
            onClick={handleStartNewProjectClick}
            className="flex items-start gap-4 p-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl shadow-xs text-left transition-all group cursor-pointer"
          >
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-105 transition-transform">
              <PlusCircle size={24} />
            </div>
            <div>
              <span className="block font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Start New Project
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Begin authoring a clean course timeline and interactive question bank.
              </p>
            </div>
          </button>

          {/* Close Active Project */}
          {currentProject && (
            <button
              onClick={handleCloseProjectClick}
              className="flex items-start gap-4 p-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-rose-500 dark:hover:border-rose-500 rounded-2xl shadow-xs text-left transition-all group cursor-pointer"
            >
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl group-hover:scale-105 transition-transform">
                <XCircle size={24} />
              </div>
              <div>
                <span className="block font-semibold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  Close Project
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Close the active project and return to an empty workspace.
                </p>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* Recently Opened Projects */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recently Opened Projects</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              {recentProjects.length}
            </span>
          </div>
          {recentProjects.length > 0 && (
            <button
              type="button"
              onClick={() => setIsConfirmClearRecentOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Clear all recently opened project history"
            >
              <Trash2 size={13} />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {recentProjects.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full">
              <Clock size={20} />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No recently opened projects</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Projects you open or save will appear here for quick access.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleOpenRecent(project)}
                className="relative p-4 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl transition-all bg-white dark:bg-slate-900 shadow-xs flex items-start gap-3.5 cursor-pointer group"
              >
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 rounded-lg transition-colors shrink-0">
                  <FolderOpen size={20} />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {project.title}
                  </h4>
                  {project.filePath && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate font-mono mt-0.5">
                      {project.filePath}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    <Clock size={12} />
                    <span>{project.lastOpened}</span>
                  </div>
                </div>

                {/* Remove single entry button */}
                <button
                  type="button"
                  onClick={(e) => handleRemoveSingleRecent(e, project.id, project.title)}
                  className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  title="Remove from history"
                  aria-label="Remove from recent history"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Confirmation Dialog for Discarding Unsaved Progress */}
      <ConfirmDialog
        isOpen={isConfirmNewOpen}
        onClose={() => setIsConfirmNewOpen(false)}
        onConfirm={executeStartNewProject}
        title="Start New Project"
        message="Starting a new project will clear all current media assets, slides, and any unsaved progress. Are you sure you want to proceed?"
        confirmLabel="OK"
        cancelLabel="Cancel"
        isDestructive={true}
      />

      {/* Confirmation Dialog for Closing Project */}
      <ConfirmDialog
        isOpen={isConfirmCloseOpen}
        onClose={() => setIsConfirmCloseOpen(false)}
        onConfirm={executeCloseProject}
        title="Close Active Project"
        message="Are you sure you want to close the active project? Any unsaved progress will be cleared."
        confirmLabel="Close Project"
        cancelLabel="Cancel"
        isDestructive={true}
      />

      {/* Confirmation Dialog for Clearing Recent Projects History */}
      <ConfirmDialog
        isOpen={isConfirmClearRecentOpen}
        onClose={() => setIsConfirmClearRecentOpen(false)}
        onConfirm={handleClearRecentProjects}
        title="Clear Recent Projects"
        message="Are you sure you want to clear your recently opened projects history? This will only remove them from the list and will not delete your project files on disk."
        confirmLabel="Clear History"
        cancelLabel="Cancel"
        isDestructive={true}
      />
    </div>
  );
}
